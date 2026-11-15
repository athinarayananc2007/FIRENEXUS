import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { FireObservation } from '../../types';
import { BASEMAP_CONFIG } from '../../constants/mapConfig';

interface MapView2DProps {
  observations: FireObservation[];
  selectedObservation: FireObservation | null;
  onSelectObservation: (obs: FireObservation) => void;
  onHoverCoordinates?: (lat: number | null, lon: number | null) => void;
  targetLocation?: { lat: number; lon: number } | null;
  showHeatmap?: boolean;
  sizeByFrp?: boolean;
}

function MapController({
  targetLocation,
  onHoverCoordinates,
}: {
  targetLocation?: { lat: number; lon: number } | null;
  onHoverCoordinates?: (lat: number | null, lon: number | null) => void;
}) {
  const map = useMap();

  useMapEvents({
    mousemove(e) {
      if (onHoverCoordinates) {
        onHoverCoordinates(e.latlng.lat, e.latlng.lng);
      }
    },
    mouseout() {
      if (onHoverCoordinates) {
        onHoverCoordinates(null, null);
      }
    },
  });

  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lon], 5, {
        duration: 1.5,
      });
    }
  }, [targetLocation, map]);

  return null;
}

function computeMarkerRadius(frp: number, sizeByFrp: boolean): number {
  if (!sizeByFrp) return 4;
  if (frp >= 120) return 8;
  if (frp >= 60) return 6;
  if (frp >= 30) return 4.5;
  return 3;
}

export default function MapView2D({
  observations,
  selectedObservation,
  onSelectObservation,
  onHoverCoordinates,
  targetLocation,
  showHeatmap = false,
  sizeByFrp = true,
}: MapView2DProps) {
  const displayMarkers = useMemo(() => observations.slice(0, 1000), [observations]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[15, 10]}
        zoom={2.5}
        minZoom={2}
        maxZoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#070b18' }}
      >
        {/* Esri ArcGIS World Dark Gray Slate Basemap & Reference Overlays */}
        <TileLayer
          attribution={BASEMAP_CONFIG.attribution}
          url={BASEMAP_CONFIG.darkBaseUrl}
          maxNativeZoom={BASEMAP_CONFIG.maxNativeZoom}
          maxZoom={BASEMAP_CONFIG.maxZoom}
        />
        <TileLayer
          url={BASEMAP_CONFIG.darkReferenceUrl}
          maxNativeZoom={BASEMAP_CONFIG.maxNativeZoom}
          maxZoom={BASEMAP_CONFIG.maxZoom}
        />

        <MapController
          targetLocation={targetLocation}
          onHoverCoordinates={onHoverCoordinates}
        />

        {/* Heatmap Density Mode Layer */}
        {showHeatmap &&
          displayMarkers.map((obs) => (
            <CircleMarker
              key={`heat-${obs.id}`}
              center={[obs.latitude, obs.longitude]}
              radius={Math.min(28, (obs.frp / 10) + 12)}
              pathOptions={{
                color: 'transparent',
                fillColor: obs.frp >= 80 ? '#ef4444' : obs.satellite === 'MODIS' ? '#ff713e' : '#00e5b0',
                fillOpacity: 0.18,
                weight: 0,
              }}
            />
          ))}

        {/* Core Hotspot Markers */}
        {displayMarkers.map((obs) => {
          const isSelected = selectedObservation?.id === obs.id;
          const isModis = obs.satellite === 'MODIS';
          const baseColor = isModis ? '#ff713e' : '#00e5b0';
          const radius = computeMarkerRadius(obs.frp, sizeByFrp);

          return (
            <CircleMarker
              key={obs.id}
              center={[obs.latitude, obs.longitude]}
              radius={isSelected ? radius + 4 : radius}
              pathOptions={{
                color: isSelected ? '#ffffff' : baseColor,
                fillColor: isSelected ? '#ffffff' : baseColor,
                fillOpacity: isSelected ? 1 : obs.confidence === 'high' ? 0.9 : 0.65,
                weight: isSelected ? 3 : 1,
              }}
              eventHandlers={{
                click: () => onSelectObservation(obs),
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
