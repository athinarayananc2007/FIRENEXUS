import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Globe,
  Crosshair,
  Maximize2,
  Minimize2,
  Eye,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import { getObservationDayNight } from '../../utils/dataExplorerUtils';
import { BASEMAP_CONFIG } from '../../constants/mapConfig';

interface GeospatialRecordMapProps {
  observations: FireObservation[];
  selectedObservation: FireObservation | null;
  onSelectObservation: (obs: FireObservation) => void;
  onOpenGlobe: (obs: FireObservation) => void;
}

const REGION_PRESETS = [
  { name: 'World View', center: [15, 10] as [number, number], zoom: 2 },
  { name: 'South America', center: [-14, -54] as [number, number], zoom: 4 },
  { name: 'Central Africa', center: [-2, 22] as [number, number], zoom: 4 },
  { name: 'North America', center: [44, -100] as [number, number], zoom: 4 },
  { name: 'Southeast Asia', center: [4, 114] as [number, number], zoom: 4 },
  { name: 'Australia', center: [-24, 134] as [number, number], zoom: 4 },
  { name: 'Europe', center: [48, 16] as [number, number], zoom: 4 },
];

function MapPanController({
  center,
  zoom,
  selectedObservation,
}: {
  center: [number, number];
  zoom: number;
  selectedObservation?: FireObservation | null;
}) {
  const map = useMap();
  React.useEffect(() => {
    if (selectedObservation) {
      map.setView([selectedObservation.latitude, selectedObservation.longitude], 6, { animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [map, center, zoom, selectedObservation]);
  return null;
}

export const GeospatialRecordMap: React.FC<GeospatialRecordMapProps> = ({
  observations,
  selectedObservation,
  onSelectObservation,
  onOpenGlobe,
}) => {
  const [activeCenter, setActiveCenter] = useState<[number, number]>([15, 10]);
  const [activeZoom, setActiveZoom] = useState<number>(2);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card p-4 sm:p-5 bg-surface/95 border-border/80 shadow-xl space-y-3">
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-text-primary">
              Geospatial Record Distribution View
            </h3>
            <p className="text-[11px] text-text-muted">
              Interactive satellite footprint map synchronized with data table selections
            </p>
          </div>
        </div>

        {/* Region selector & expand */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-navy/80 px-2.5 py-1 rounded-lg border border-border/60">
            <Crosshair className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={`${activeCenter[0]},${activeCenter[1]}`}
              onChange={(e) => {
                const found = REGION_PRESETS.find(
                  (p) => `${p.center[0]},${p.center[1]}` === e.target.value
                );
                if (found) {
                  setActiveCenter(found.center);
                  setActiveZoom(found.zoom);
                }
              }}
              className="bg-transparent font-medium text-text-primary text-[11px] focus:outline-none cursor-pointer"
            >
              {REGION_PRESETS.map((p) => (
                <option
                  key={p.name}
                  value={`${p.center[0]},${p.center[1]}`}
                  className="bg-surface"
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg bg-navy hover:bg-surface border border-border/60 text-text-muted hover:text-text-primary transition-colors"
            title={isExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        className={`w-full rounded-xl overflow-hidden border border-border/70 relative transition-all duration-300 ${
          isExpanded ? 'h-[580px]' : 'h-[360px]'
        }`}
      >
        <MapContainer
          center={activeCenter}
          zoom={activeZoom}
          className="h-full w-full bg-midnight"
          scrollWheelZoom={true}
        >
          <MapPanController
            center={activeCenter}
            zoom={activeZoom}
            selectedObservation={selectedObservation}
          />

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

          {/* Observation Markers */}
          {observations.map((obs) => {
            const isSelected = selectedObservation?.id === obs.id;
            const isModis = obs.satellite === 'MODIS';
            const radius = isSelected
              ? 8
              : Math.max(3.5, Math.min(8.5, Math.sqrt(obs.frp) * 0.75));

            return (
              <CircleMarker
                key={obs.id}
                center={[obs.latitude, obs.longitude]}
                radius={radius}
                pathOptions={{
                  color: isSelected ? '#ffffff' : isModis ? '#FF713E' : '#00E5B0',
                  fillColor: isModis ? '#FF713E' : '#00E5B0',
                  fillOpacity: isSelected ? 1 : 0.65,
                  weight: isSelected ? 2.5 : 1,
                }}
                eventHandlers={{
                  click: () => onSelectObservation(obs),
                }}
              >
                <Popup className="firenexus-popup">
                  <div className="p-3 bg-navy text-xs rounded-lg space-y-2 border border-border/70 text-text-primary font-sans max-w-[210px]">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1 font-mono">
                      <span className="font-bold text-cyan">{obs.id}</span>
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          isModis
                            ? 'bg-fire/20 text-fire border border-fire/40'
                            : 'bg-cyan/20 text-cyan border border-cyan/40'
                        }`}
                      >
                        {obs.satellite}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px] text-text-secondary">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Coords:</span>
                        <span>
                          {obs.latitude.toFixed(2)}&deg;, {obs.longitude.toFixed(2)}&deg;
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Acquired:</span>
                        <span>
                          {obs.date || 'Unknown'} {obs.time ? `${obs.time}z` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">FRP:</span>
                        <span className="font-bold text-amber-400">{obs.frp.toFixed(1)} MW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Solar:</span>
                        <span className="text-text-primary font-sans">
                          {getObservationDayNight(obs) === 'D' ? 'Daytime' : 'Nighttime'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Country:</span>
                        <span className="text-text-primary truncate max-w-[110px]">
                          {obs.country}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectObservation(obs)}
                        className="flex-1 py-1 px-2 rounded bg-cyan/20 hover:bg-cyan/30 text-cyan text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                      <button
                        onClick={() => onOpenGlobe(obs)}
                        className="py-1 px-2 rounded bg-navy hover:bg-surface text-text-muted hover:text-cyan border border-border/60 text-[10px] font-semibold transition-colors"
                        title="Open on 3D Globe"
                      >
                        <Globe className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default GeospatialRecordMap;
