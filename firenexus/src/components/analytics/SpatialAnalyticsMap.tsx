import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Globe,
  Flame,
  Zap,
  GitMerge,
  ExternalLink,
  Sliders,
  Crosshair,
} from 'lucide-react';
import type { FireObservation, MatchedFirePair } from '../../types';
import { BASEMAP_CONFIG } from '../../constants/mapConfig';

interface SpatialAnalyticsMapProps {
  observations: FireObservation[];
  matchedPairs: MatchedFirePair[];
}

const REGION_PRESETS: { name: string; center: [number, number]; zoom: number }[] = [
  { name: 'World View', center: [15, 10], zoom: 2 },
  { name: 'South America (Amazon/Cerrado)', center: [-14, -54], zoom: 4 },
  { name: 'Central & Southern Africa', center: [-5, 24], zoom: 4 },
  { name: 'North America (West/Boreal)', center: [48, -112], zoom: 4 },
  { name: 'Southeast Asia & Indonesia', center: [2, 114], zoom: 4 },
  { name: 'Australia & Savannas', center: [-24, 134], zoom: 4 },
  { name: 'Europe & Mediterranean', center: [44, 14], zoom: 4 },
];

function MapFlyController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom, { animate: true });
  return null;
}

export const SpatialAnalyticsMap: React.FC<SpatialAnalyticsMapProps> = ({
  observations,
  matchedPairs,
}) => {
  const navigate = useNavigate();
  const [showModis, setShowModis] = useState(true);
  const [showViirs, setShowViirs] = useState(true);
  const [showMatchedOnly, setShowMatchedOnly] = useState(false);
  const [sizeByFrp, setSizeByFrp] = useState(true);
  const [activeCenter, setActiveCenter] = useState<[number, number]>([15, 10]);
  const [activeZoom, setActiveZoom] = useState<number>(2);

  // Set of matched observation IDs
  const matchedSet = useMemo(() => {
    const set = new Set<string>();
    matchedPairs.forEach((p) => {
      set.add(p.modis.id);
      set.add(p.viirs.id);
    });
    return set;
  }, [matchedPairs]);

  // Filter observations for map rendering
  const visibleObservations = useMemo(() => {
    return observations.filter((obs) => {
      if (obs.satellite === 'MODIS' && !showModis) return false;
      if (obs.satellite === 'VIIRS' && !showViirs) return false;
      if (showMatchedOnly && !matchedSet.has(obs.id)) return false;
      return true;
    });
  }, [observations, showModis, showViirs, showMatchedOnly, matchedSet]);

  const handleRegionSelect = (preset: (typeof REGION_PRESETS)[0]) => {
    setActiveCenter(preset.center);
    setActiveZoom(preset.zoom);
  };

  const handleOpenInGlobe = (obs: FireObservation) => {
    navigate('/explorer', {
      state: {
        targetObservation: obs,
        lat: obs.latitude,
        lon: obs.longitude,
      },
    });
  };

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-4">
      {/* Map Header and Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Global Spatial Distribution &amp; Clustering Map
            </h2>
            <span className="demo-badge text-[10px]">Leaflet Dark Canvas</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Geospatial clustering of active thermal anomalies with FRP-scaled radiant apertures and
            cross-sensor coincident pairs.
          </p>
        </div>

        {/* Region Preset Selector */}
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={`${activeCenter[0]},${activeCenter[1]}`}
            onChange={(e) => {
              const found = REGION_PRESETS.find(
                (p) => `${p.center[0]},${p.center[1]}` === e.target.value
              );
              if (found) handleRegionSelect(found);
            }}
            className="bg-navy/80 text-text-primary text-xs rounded-lg border border-border/60 px-3 py-1.5 focus:border-cyan focus:outline-none"
          >
            {REGION_PRESETS.map((p) => (
              <option key={p.name} value={`${p.center[0]},${p.center[1]}`}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layer Toggles & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-navy/60 p-2.5 rounded-xl border border-border/50">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowModis((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              showModis
                ? 'bg-fire/20 text-fire border border-fire/40'
                : 'text-text-muted hover:text-text-secondary opacity-50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-fire" />
            <span>MODIS Layer</span>
          </button>

          <button
            onClick={() => setShowViirs((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              showViirs
                ? 'bg-cyan/20 text-cyan border border-cyan/40'
                : 'text-text-muted hover:text-text-secondary opacity-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan" />
            <span>VIIRS Layer</span>
          </button>

          <button
            onClick={() => setShowMatchedOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              showMatchedOnly
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-text-muted hover:text-text-secondary opacity-50'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>Matched Pairs Only</span>
          </button>

          <button
            onClick={() => setSizeByFrp((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              sizeByFrp
                ? 'bg-surface text-cyan border border-cyan/40'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Scale by FRP</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-text-muted">
          Rendering: <strong className="text-cyan">{visibleObservations.length}</strong> active
          anomaly markers
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="h-[480px] sm:h-[520px] w-full rounded-xl overflow-hidden border border-border/70 relative shadow-inner">
        <MapContainer
          center={activeCenter}
          zoom={activeZoom}
          className="h-full w-full bg-midnight"
          scrollWheelZoom={true}
        >
          <MapFlyController center={activeCenter} zoom={activeZoom} />

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
          {visibleObservations.map((obs) => {
            const isModis = obs.satellite === 'MODIS';
            const isMatched = matchedSet.has(obs.id);

            // Radius calculation: 3-10 px based on FRP
            const radius = sizeByFrp
              ? Math.max(3.5, Math.min(10, Math.sqrt(obs.frp) * 0.85))
              : 4.5;

            return (
              <CircleMarker
                key={obs.id}
                center={[obs.latitude, obs.longitude]}
                radius={radius}
                pathOptions={{
                  color: isMatched
                    ? '#00E5B0'
                    : isModis
                    ? '#FF713E'
                    : '#00E5B0',
                  fillColor: isModis ? '#FF713E' : '#00E5B0',
                  fillOpacity: isMatched ? 0.9 : 0.65,
                  weight: isMatched ? 2 : 1,
                }}
              >
                <Popup className="firenexus-popup">
                  <div className="p-3 bg-navy text-xs rounded-lg space-y-2 border border-border/70 text-text-primary font-sans max-w-[220px]">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1.5 font-mono">
                      <span className="font-bold text-cyan">{obs.id}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
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
                          {obs.latitude.toFixed(2)}°, {obs.longitude.toFixed(2)}°
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Date/Time:</span>
                        <span>
                          {obs.date || 'Unknown date'} {obs.time ? `${obs.time}z` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">FRP:</span>
                        <span className="font-bold text-amber-400">{obs.frp.toFixed(1)} MW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Confidence:</span>
                        <span className="uppercase text-text-primary">{obs.confidence}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Region:</span>
                        <span className="text-text-primary truncate max-w-[120px]">
                          {obs.country}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40">
                      <button
                        onClick={() => handleOpenInGlobe(obs)}
                        className="w-full py-1 px-2 rounded bg-cyan/20 hover:bg-cyan/30 text-cyan text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>Open in 3D Globe</span>
                        <ExternalLink className="w-3 h-3" />
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

export default SpatialAnalyticsMap;
