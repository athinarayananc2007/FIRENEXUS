import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { MOCK_OBSERVATIONS } from '../../data/mock/fireData';
import type { FireObservation, SatelliteInstrument } from '../../types';
import {
  Play, Pause, RotateCcw, X, MapPin, Zap, Clock, ShieldCheck, Thermometer,
  Database, Info, Copy, Check,
} from 'lucide-react';

const GLOBE_RADIUS = 2.0;
// Markers placed tightly on the surface (0.005 units above) to prevent floating
const MARKER_ELEVATION = 0.005;

/** Convert geographic lat/lon (degrees) to 3D coordinate on sphere surface */
function latLonToVec3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

interface EarthGroupProps {
  autoRotate: boolean;
  activeSensor: 'ALL' | SatelliteInstrument;
  onHoverObservation: (obs: FireObservation | null) => void;
  onSelectObservation: (obs: FireObservation) => void;
}

function RealisticEarth({
  autoRotate,
  activeSensor,
  onHoverObservation,
  onSelectObservation,
}: EarthGroupProps) {
  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Load high-resolution NASA Blue Marble textures locally
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

  // Filter observations based on selected sensor
  const activeObservations = useMemo(() => {
    const list = MOCK_OBSERVATIONS.slice(0, 120);
    if (activeSensor === 'ALL') return list;
    return list.filter((o) => o.satellite === activeSensor);
  }, [activeSensor]);

  // Rotational animation: Earth & independent fluid cloud motion
  useFrame((_, delta) => {
    if (autoRotate && earthRef.current) {
      earthRef.current.rotation.y += delta * 0.04;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.055;
    }
  });

  return (
    <group>
      {/* Primary Earth Group — rotates together with all attached fire hotspots */}
      <group ref={earthRef}>
        {/* Realistic Earth Body with balanced day/night lighting */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={dayMap}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(0.7, 0.7)}
            roughnessMap={specularMap}
            roughness={0.72}
            metalness={0.08}
            emissiveMap={lightsMap}
            emissive="#ffd27d"
            emissiveIntensity={0.28}
          />
        </mesh>

        {/* Subtle Low-Altitude Clouds Layer */}
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

        {/* Geographically-Anchored Fire Hotspots (Attached flush to Earth surface) */}
        {activeObservations.map((obs) => {
          const isModis = obs.satellite === 'MODIS';
          const isHighFrp = obs.frp >= 100;
          const isHovered = hoveredId === obs.id;
          const [x, y, z] = latLonToVec3(obs.latitude, obs.longitude, GLOBE_RADIUS + MARKER_ELEVATION);

          // Marker color encoding: MODIS = Solar Orange, VIIRS = Electric Mint / Satellite Cyan
          const markerColor = isHovered
            ? '#ffffff'
            : isModis
              ? isHighFrp
                ? '#ff3e00'
                : '#ff713e'
              : isHighFrp
                ? '#00e5b0'
                : '#00b8d9';

          // Scaled to sit as a surface beacon, embedded flush into the terrain
          const radius = isHovered ? 0.032 : isHighFrp ? 0.022 : 0.016;

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
                  onHoverObservation(obs);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredId(null);
                  onHoverObservation(null);
                  document.body.style.cursor = 'auto';
                }}
              >
                <sphereGeometry args={[radius, 12, 12]} />
                <meshBasicMaterial color={markerColor} transparent opacity={0.96} />
              </mesh>

              {/* High FRP Radiative Surface Halo */}
              {(isHighFrp || isHovered) && (
                <mesh>
                  <sphereGeometry args={[radius * 1.7, 8, 8]} />
                  <meshBasicMaterial
                    color={markerColor}
                    transparent
                    opacity={0.32}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* Atmospheric Rim Glow Shells (Refined for subtle, non-excessive glow) */}
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
          color="#00E5B0"
          transparent
          opacity={0.035}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export default function HeroGlobe() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeSensor, setActiveSensor] = useState<'ALL' | SatelliteInstrument>('ALL');
  const [hoveredObs, setHoveredObs] = useState<FireObservation | null>(null);
  const [selectedObs, setSelectedObs] = useState<FireObservation | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Compute dynamic counts for selected sensor filter
  const counts = useMemo(() => {
    const list = MOCK_OBSERVATIONS.slice(0, 120);
    const modis = list.filter((o) => o.satellite === 'MODIS').length;
    const viirs = list.filter((o) => o.satellite === 'VIIRS').length;
    return {
      ALL: list.length,
      MODIS: modis,
      VIIRS: viirs,
    };
  }, []);

  // Reliable camera reset handler
  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(0, 0.4, 5.2);
      controlsRef.current.update();
    }
  }, []);

  const handleCopyCoords = useCallback((lat: number, lon: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[440px] sm:min-h-[520px] lg:min-h-[600px] flex items-center justify-center select-none touch-none">
      {/* Subtle Rim Lighting Behind the 3D Globe */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[300px] sm:w-[420px] lg:w-[500px] aspect-square rounded-full bg-gradient-to-tr from-cyan/10 via-electric/5 to-fire/5 blur-3xl opacity-40" />
      </div>

      {/* Top Controls Overlay: Status Pill & Dynamic Filter Buttons */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="glass px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-auto border border-border/80 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
          <span className="text-[11px] font-mono font-medium text-text-primary">
            {activeSensor === 'ALL' && `${counts.ALL} Active Global Hotspots`}
            {activeSensor === 'MODIS' && `${counts.MODIS} Active MODIS Detections`}
            {activeSensor === 'VIIRS' && `${counts.VIIRS} Active VIIRS Detections`}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-semibold uppercase">
            Simulated
          </span>
        </div>

        {/* Sensor Filter Buttons with Live Count Badges */}
        <div className="glass p-1 rounded-lg flex items-center gap-1 pointer-events-auto border border-border/80 shadow-lg">
          {(['ALL', 'MODIS', 'VIIRS'] as const).map((sensor) => {
            const isSelected = activeSensor === sensor;
            return (
              <button
                key={sensor}
                onClick={() => setActiveSensor(sensor)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? sensor === 'MODIS'
                      ? 'bg-fire text-midnight font-bold shadow-sm'
                      : sensor === 'VIIRS'
                        ? 'bg-cyan text-midnight font-bold shadow-sm'
                        : 'bg-white/20 text-text-primary font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                }`}
              >
                <span>{sensor}</span>
                <span className={`text-[10px] font-mono opacity-80 ${isSelected ? 'text-midnight font-bold' : ''}`}>
                  ({counts[sensor]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive 3D Canvas with balanced lighting */}
      <Canvas
        camera={{ position: [0, 0.4, 5.2], fov: 45 }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        {/* Soft, balanced ambient light for readable continents and terrain */}
        <ambientLight intensity={0.8} color="#c8daf0" />
        {/* Directional sunlight with natural contrast */}
        <directionalLight position={[6, 3, 5]} intensity={1.5} color="#ffffff" />
        {/* Gentle atmospheric sky-blue fill light */}
        <directionalLight position={[-6, -2, -5]} intensity={0.4} color="#7dd3fc" />
        <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.8} />

        <RealisticEarth
          autoRotate={autoRotate}
          activeSensor={activeSensor}
          onHoverObservation={setHoveredObs}
          onSelectObservation={setSelectedObs}
        />

        <OrbitControls
          ref={controlsRef}
          enableZoom={true}
          enablePan={false}
          autoRotate={false}
          minDistance={3.2}
          maxDistance={8.5}
          rotateSpeed={0.65}
          zoomSpeed={0.8}
          enableDamping={true}
          dampingFactor={0.06}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
        />
      </Canvas>

      {/* Floating Hover Tooltip */}
      {hoveredObs && (
        <div className="absolute top-16 left-4 z-30 pointer-events-none glass px-3.5 py-2.5 rounded-xl border border-cyan/40 shadow-xl max-w-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-mono text-xs font-bold text-text-primary">{hoveredObs.id}</span>
            <span
              className={`badge text-[10px] ${
                hoveredObs.satellite === 'MODIS' ? 'badge-fire' : 'badge-cyan'
              }`}
            >
              {hoveredObs.satellite}
            </span>
          </div>
          <p className="text-xs text-text-secondary font-medium">
            {hoveredObs.region}, {hoveredObs.country}
          </p>
          <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] pt-1.5 border-t border-border/40">
            <span className="text-fire font-mono font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-fire" /> {hoveredObs.frp} MW
            </span>
            <span className="text-text-muted font-mono">
              {hoveredObs.latitude.toFixed(2)}°, {hoveredObs.longitude.toFixed(2)}°
            </span>
          </div>
        </div>
      )}

      {/* Bottom Sensor Legend Synchronized with Selected Filter */}
      <div className="absolute bottom-3 left-3 z-20 glass px-3.5 py-2 rounded-xl border border-border/80 shadow-lg hidden sm:flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center gap-3">
          {/* MODIS Legend Item */}
          <button
            onClick={() => setActiveSensor(activeSensor === 'MODIS' ? 'ALL' : 'MODIS')}
            className={`flex items-center gap-1.5 transition-opacity ${
              activeSensor === 'VIIRS' ? 'opacity-40 hover:opacity-75' : 'opacity-100'
            }`}
            title="Click to filter MODIS"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-fire shadow-sm shadow-fire/50" />
            <span className="text-text-primary font-medium">MODIS (1 km)</span>
            {activeSensor === 'VIIRS' && (
              <span className="text-[9px] text-text-muted">(Hidden)</span>
            )}
          </button>

          {/* VIIRS Legend Item */}
          <button
            onClick={() => setActiveSensor(activeSensor === 'VIIRS' ? 'ALL' : 'VIIRS')}
            className={`flex items-center gap-1.5 transition-opacity ${
              activeSensor === 'MODIS' ? 'opacity-40 hover:opacity-75' : 'opacity-100'
            }`}
            title="Click to filter VIIRS"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan shadow-sm shadow-cyan/50" />
            <span className="text-text-primary font-medium">VIIRS (375 m)</span>
            {activeSensor === 'MODIS' && (
              <span className="text-[9px] text-text-muted">(Hidden)</span>
            )}
          </button>
        </div>
        <span className="text-[10px] text-text-muted">
          Drag to rotate • Scroll to zoom • Click hotspot for telemetry
        </span>
      </div>

      {/* Bottom Right Controls: Auto-Rotate & Reset View */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`btn-ghost text-xs px-3 py-1.5 rounded-lg glass border border-border/80 shadow-lg flex items-center gap-1.5 ${
            autoRotate ? 'text-cyan border-cyan/30' : 'text-text-muted'
          }`}
          title={autoRotate ? 'Pause Rotation' : 'Resume Auto Rotation'}
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5 text-cyan" /> : <Play className="w-3.5 h-3.5 text-text-muted" />}
          <span className="hidden sm:inline font-mono text-[11px]">
            {autoRotate ? 'Rotating' : 'Paused'}
          </span>
        </button>

        <button
          onClick={handleResetCamera}
          className="btn-ghost text-xs p-2 rounded-lg glass border border-border/80 shadow-lg text-text-muted hover:text-text-primary"
          title="Reset Camera Framing"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Telemetry Information Panel (Modal) */}
      {selectedObs && (
        <div className="absolute inset-0 z-40 bg-midnight/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-6 rounded-2xl border border-cyan/40 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedObs(null)}
              className="absolute top-4 right-4 btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: ID, Satellite & Simulation Badge */}
            <div className="flex items-center justify-between pr-8">
              <div>
                <span className="font-mono text-lg font-extrabold text-cyan block">{selectedObs.id}</span>
                <span className="text-[11px] text-text-muted">Observation Telemetry Record</span>
              </div>
              <span
                className={`badge px-3 py-1 text-xs font-semibold ${
                  selectedObs.satellite === 'MODIS' ? 'badge-fire' : 'badge-cyan'
                }`}
              >
                {selectedObs.satellite} Instrument
              </span>
            </div>

            {/* Detailed Parameters Grid */}
            <div className="space-y-3 text-xs bg-navy/90 p-4 rounded-xl border border-border/80">
              {/* Region & Country */}
              <div className="flex items-start gap-2.5 text-text-primary">
                <MapPin className="w-4 h-4 text-fire shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">
                    {selectedObs.region}, {selectedObs.country}
                  </p>
                  <p className="text-[11px] text-text-muted font-mono mt-0.5 flex items-center gap-2">
                    <span>Lat: {selectedObs.latitude.toFixed(6)}°</span>
                    <span>Lon: {selectedObs.longitude.toFixed(6)}°</span>
                    <button
                      onClick={() => handleCopyCoords(selectedObs.latitude, selectedObs.longitude)}
                      className="hover:text-cyan text-text-muted transition-colors p-0.5"
                      title="Copy coordinates"
                    >
                      {copiedCoords ? <Check className="w-3 h-3 text-cyan" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </p>
                </div>
              </div>

              {/* Sensor Measurements */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 text-[11px]">
                <div className="bg-surface/60 p-2.5 rounded-lg border border-border/30">
                  <span className="text-text-muted flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-fire" /> Fire Radiative Power
                  </span>
                  <p className="font-mono font-bold text-fire text-base mt-1">
                    {selectedObs.frp} MW
                  </p>
                </div>

                <div className="bg-surface/60 p-2.5 rounded-lg border border-border/30">
                  <span className="text-text-muted flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-cyan" /> Brightness Temp
                  </span>
                  <p className="font-mono font-bold text-text-primary text-base mt-1">
                    {selectedObs.brightness} K
                  </p>
                </div>

                <div className="bg-surface/60 p-2.5 rounded-lg border border-border/30">
                  <span className="text-text-muted flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Detection Confidence
                  </span>
                  <p className="capitalize font-bold text-emerald-400 text-sm mt-1">
                    {selectedObs.confidence}
                  </p>
                </div>

                <div className="bg-surface/60 p-2.5 rounded-lg border border-border/30">
                  <span className="text-text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-text-muted" /> Observation Time (UTC)
                  </span>
                  <p className="font-mono font-semibold text-text-secondary text-xs mt-1">
                    {selectedObs.date} • {selectedObs.time}
                  </p>
                </div>
              </div>

              {/* Data Source & Scientific Protocol */}
              <div className="pt-2 border-t border-border/40 space-y-1.5 text-[10px]">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <Database className="w-3 h-3 text-electric shrink-0" />
                  <span>
                    <strong>Data Source:</strong> NASA FIRMS Demonstration Stream (MODIS / VIIRS Harmonization Prototype)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-warning/90">
                  <Info className="w-3 h-3 text-warning shrink-0" />
                  <span>
                    <strong>Simulation Status:</strong> Demonstration Mock Record — Not Verified Live Fire Incident
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-text-muted font-mono">
                Observation Record #{selectedObs.id}
              </span>
              <button
                onClick={() => setSelectedObs(null)}
                className="btn-primary text-xs py-2 px-5 font-semibold"
              >
                Close Telemetry Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
