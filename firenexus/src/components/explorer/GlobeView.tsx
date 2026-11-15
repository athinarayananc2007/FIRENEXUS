import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { FireObservation } from '../../types';

interface GlobeViewProps {
  observations: FireObservation[];
  selectedObservation: FireObservation | null;
  onSelectObservation: (obs: FireObservation) => void;
  autoRotate: boolean;
  onHoverCoordinates?: (lat: number | null, lon: number | null) => void;
  targetLocation?: { lat: number; lon: number } | null;
  sizeByFrp?: boolean;
  showAtmosphere?: boolean;
}

const GLOBE_RADIUS = 2.45;
const MARKER_ELEVATION = 0.005;

/** Convert geographic lat/lon (degrees) to 3D Cartesian coordinates matching equirectangular Earth texture */
function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

interface RotatingEarthWithMarkersProps {
  autoRotate: boolean;
  showAtmosphere: boolean;
  targetLocation?: { lat: number; lon: number } | null;
  observations: FireObservation[];
  selectedObservation: FireObservation | null;
  onSelectObservation: (obs: FireObservation) => void;
  sizeByFrp?: boolean;
}

function RotatingEarthWithMarkers({
  autoRotate,
  showAtmosphere,
  targetLocation,
  observations,
  selectedObservation,
  onSelectObservation,
  sizeByFrp = true,
}: RotatingEarthWithMarkersProps) {
  // SHARED ROTATING GROUP REF: Both the Earth Sphere and all Hotspot Markers are children of this group!
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Load NASA Blue Marble textures
  const { dayMap, normalMap, specularMap, cloudsMap, lightsMap } = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const day = loader.load('/textures/earth_day.jpg');
    day.colorSpace = THREE.SRGBColorSpace;
    const normal = loader.load('/textures/earth_normal.jpg');
    const specular = loader.load('/textures/earth_specular.jpg');
    const clouds = loader.load('/textures/earth_clouds.png');
    const lights = loader.load('/textures/earth_lights.png');
    lights.colorSpace = THREE.SRGBColorSpace;
    return { dayMap: day, normalMap: normal, specularMap: specular, cloudsMap: clouds, lightsMap: lights };
  }, []);

  // Performance cap for smooth 60 FPS globe interaction
  const displayObs = useMemo(() => observations.slice(0, 500), [observations]);

  // Rotational animation applied to the shared parent group
  useFrame((_, delta) => {
    if (autoRotate && earthGroupRef.current && !targetLocation) {
      earthGroupRef.current.rotation.y += delta * 0.04;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.055;
    }
  });

  // When a search location is selected, smoothly rotate the shared parent group to center it facing the camera (+Z)
  useEffect(() => {
    if (targetLocation && earthGroupRef.current) {
      const targetRadY = -(targetLocation.lon * Math.PI) / 180 - Math.PI / 2;
      earthGroupRef.current.rotation.y = targetRadY;
    }
  }, [targetLocation]);

  return (
    <group>
      {/* ── SHARED ROTATING PARENT THREE.GROUP ── */}
      {/* Both Earth sphere and markers rotate together in the exact same coordinate system */}
      <group ref={earthGroupRef}>
        {/* 1. High-Resolution Earth Body */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={dayMap}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(0.75, 0.75)}
            roughnessMap={specularMap}
            roughness={0.72}
            metalness={0.08}
            emissiveMap={lightsMap}
            emissive="#ffd27d"
            emissiveIntensity={0.28}
          />
        </mesh>

        {/* 2. Fluid Cloud Layer (Rotates with Earth plus slight atmospheric drift) */}
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[GLOBE_RADIUS * 1.008, 64, 64]} />
          <meshStandardMaterial
            map={cloudsMap}
            transparent={true}
            opacity={0.32}
            blending={THREE.NormalBlending}
            depthWrite={false}
          />
        </mesh>

        {/* 3. GEOGRAPHICALLY-ANCHORED FIRE HOTSPOTS */}
        {/* Positioned tightly on the Earth's surface and rotating in lockstep with the planet */}
        {displayObs.map((obs) => {
          const [x, y, z] = latLonToVector3(obs.latitude, obs.longitude, GLOBE_RADIUS + MARKER_ELEVATION);
          const isModis = obs.satellite === 'MODIS';
          const isSelected = selectedObservation?.id === obs.id;
          const isHovered = hoveredId === obs.id;

          // Distinct sensor colors: MODIS = Solar Orange (#ff713e), VIIRS = Electric Mint (#00e5b0)
          const baseColor = isModis ? '#ff713e' : '#00e5b0';
          const markerColor = isSelected ? '#ffffff' : isHovered ? '#ffeb3b' : baseColor;

          // Proportional sizing based on Fire Radiative Power (MW)
          let radius = 0.016;
          if (sizeByFrp) {
            if (obs.frp >= 120) radius = 0.034;
            else if (obs.frp >= 60) radius = 0.026;
            else if (obs.frp >= 30) radius = 0.020;
            else radius = 0.015;
          }
          if (isHovered || isSelected) radius *= 1.35;

          return (
            <group key={obs.id} position={[x, y, z]}>
              {/* Core Hotspot Marker */}
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectObservation(obs);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(obs.id);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredId(null);
                  document.body.style.cursor = 'auto';
                }}
              >
                <sphereGeometry args={[radius, 12, 12]} />
                <meshBasicMaterial color={markerColor} transparent opacity={0.96} />
              </mesh>

              {/* Selected Hotspot Target Halo */}
              {isSelected && (
                <mesh>
                  <sphereGeometry args={[radius * 2.5, 16, 16]} />
                  <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.65}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              )}

              {/* High FRP Radiative Surface Corona */}
              {obs.frp >= 80 && !isSelected && (
                <mesh>
                  <sphereGeometry args={[radius * 1.6, 8, 8]} />
                  <meshBasicMaterial
                    color={baseColor}
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* Atmospheric Rim Glow Shells (Stationary outer illumination) */}
      {showAtmosphere && (
        <>
          <mesh>
            <sphereGeometry args={[GLOBE_RADIUS * 1.035, 64, 64]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.11}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[GLOBE_RADIUS * 1.10, 48, 48]} />
            <meshBasicMaterial
              color="#00e5b0"
              transparent
              opacity={0.035}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function GlobeView({
  observations,
  selectedObservation,
  onSelectObservation,
  autoRotate,
  targetLocation,
  sizeByFrp = true,
  showAtmosphere = true,
}: GlobeViewProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div className="w-full h-full relative cursor-grab active:cursor-grabbing bg-transparent select-none touch-none">
      <Canvas
        camera={{ position: [0, 0.2, 6.6], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Soft balanced illumination for readable geography across all hemispheres */}
        <ambientLight intensity={0.85} color="#c8daf0" />
        <directionalLight position={[8, 4, 6]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-8, -3, -6]} intensity={0.4} color="#7dd3fc" />
        <Stars radius={100} depth={50} count={1600} factor={3.5} saturation={0} fade speed={0.8} />

        <RotatingEarthWithMarkers
          autoRotate={autoRotate}
          showAtmosphere={showAtmosphere}
          targetLocation={targetLocation}
          observations={observations}
          selectedObservation={selectedObservation}
          onSelectObservation={onSelectObservation}
          sizeByFrp={sizeByFrp}
        />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={3.5}
          maxDistance={11}
          rotateSpeed={0.65}
          zoomSpeed={0.8}
          enableDamping={true}
          dampingFactor={0.06}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
      </Canvas>
    </div>
  );
}
