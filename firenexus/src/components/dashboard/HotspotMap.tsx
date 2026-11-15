import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Globe2, Layers, ExternalLink, Zap,
  Crosshair, Radio, Satellite,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import { BASEMAP_CONFIG } from '../../constants/mapConfig';

interface HotspotMapProps {
  observations: FireObservation[];
}

const REGION_BOUNDS: { name: string; center: [number, number]; zoom: number }[] = [
  { name: 'World View', center: [15, 10], zoom: 2 },
  { name: 'South America', center: [-15, -58], zoom: 3 },
  { name: 'Africa', center: [2, 22], zoom: 3 },
  { name: 'North America', center: [44, -98], zoom: 3 },
  { name: 'Southeast Asia', center: [5, 115], zoom: 4 },
  { name: 'Europe', center: [48, 16], zoom: 4 },
  { name: 'Australia', center: [-25, 134], zoom: 4 },
];

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.setView(center, zoom, { animate: true });
  return null;
}

export default function HotspotMap({ observations }: HotspotMapProps) {
  const navigate = useNavigate();
  const [sizeByFrp, setSizeByFrp] = useState(true);
  const [selectedSensor, setSelectedSensor] = useState<'ALL' | 'MODIS' | 'VIIRS'>('ALL');
  const [activeRegion, setActiveRegion] = useState<[number, number]>([15, 10]);
  const [activeZoom, setActiveZoom] = useState<number>(2);

  // Filter observations based on local sensor toggle and cap at 1200 for 60fps Leaflet performance
  const displayMarkers = useMemo(() => {
    let list = observations;
    if (selectedSensor !== 'ALL') {
      list = list.filter((o) => o.satellite === selectedSensor);
    }
    return list.slice(0, 1200);
  }, [observations, selectedSensor]);

  const modisCount = useMemo(
    () => observations.filter((o) => o.satellite === 'MODIS').length,
    [observations],
  );
  const viirsCount = useMemo(
    () => observations.filter((o) => o.satellite === 'VIIRS').length,
    [observations],
  );

  const handleOpenInGlobe = (obs?: FireObservation) => {
    if (obs) {
      navigate('/explorer', {
        state: { targetLocation: { lat: obs.latitude, lon: obs.longitude, name: `${obs.region}, ${obs.country}` } },
      });
    } else {
      navigate('/explorer');
    }
  };

  return (
    <section className="space-y-3">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan/15 border border-cyan/30 text-cyan">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                Global Fire Distribution
              </h2>
              <span className="demo-badge text-[10px]">Geospatial Telemetry</span>
            </div>
            <p className="text-xs text-text-secondary">
              Synchronized spatial footprint across high-risk biomes
            </p>
          </div>
        </div>

        {/* Global Controls & Globe Explorer Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Sensor Filter Buttons */}
          <div className="glass border border-border/80 rounded-xl p-1 flex items-center gap-1 text-xs">
            <button
              onClick={() => setSelectedSensor('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedSensor === 'ALL'
                  ? 'bg-surface-light text-text-primary font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All ({observations.length})
            </button>
            <button
              onClick={() => setSelectedSensor('MODIS')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                selectedSensor === 'MODIS'
                  ? 'bg-fire/20 text-fire border border-fire/40 font-bold shadow-sm'
                  : 'text-text-muted hover:text-fire'
              }`}
            >
              <Satellite className="w-3 h-3" />
              MODIS ({modisCount})
            </button>
            <button
              onClick={() => setSelectedSensor('VIIRS')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                selectedSensor === 'VIIRS'
                  ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                  : 'text-text-muted hover:text-cyan'
              }`}
            >
              <Radio className="w-3 h-3" />
              VIIRS ({viirsCount})
            </button>
          </div>

          {/* Size by FRP toggle */}
          <button
            onClick={() => setSizeByFrp((p) => !p)}
            className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 ${
              sizeByFrp ? 'border-amber-500/40 text-amber-400' : ''
            }`}
            title="Toggle sizing marker radius by Fire Radiative Power (MW)"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{sizeByFrp ? 'FRP Scaled' : 'Uniform Scale'}</span>
          </button>

          {/* Direct CTA to 3D Earth Explorer */}
          <button
            onClick={() => handleOpenInGlobe()}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-lg shadow-cyan-dim"
            title="Launch interactive 3D WebGL Earth globe"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Launch 3D Explorer</span>
          </button>
        </div>
      </div>

      {/* Regional Quick Navigation Pill Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <span className="text-text-muted text-[11px] font-mono mr-1 shrink-0 flex items-center gap-1">
          <Crosshair className="w-3 h-3 text-cyan" /> Focus:
        </span>
        {REGION_BOUNDS.map((reg) => (
          <button
            key={reg.name}
            onClick={() => {
              setActiveRegion(reg.center);
              setActiveZoom(reg.zoom);
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-light/60 hover:bg-surface-light border border-border/80 text-text-secondary hover:text-text-primary whitespace-nowrap transition-all"
          >
            {reg.name}
          </button>
        ))}
      </div>

      {/* Main Map Container */}
      <div className="glass border border-border/80 rounded-2xl overflow-hidden shadow-2xl relative">
        <MapContainer
          center={activeRegion}
          zoom={activeZoom}
          scrollWheelZoom={true}
          style={{ height: '520px', width: '100%', background: '#070B18' }}
          className="z-10"
        >
          <MapController center={activeRegion} zoom={activeZoom} />
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

          {displayMarkers.map((obs) => {
            const isModis = obs.satellite === 'MODIS';
            let radius = 3;
            if (sizeByFrp) {
              if (obs.frp >= 100) radius = 7.5;
              else if (obs.frp >= 50) radius = 5.5;
              else if (obs.frp >= 20) radius = 4;
              else radius = 2.5;
            }

            const color = isModis ? '#FF713E' : '#00E5B0';

            return (
              <CircleMarker
                key={obs.id}
                center={[obs.latitude, obs.longitude]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isModis ? 0.75 : 0.85,
                  weight: 1,
                }}
              >
                <Popup className="firenexus-popup">
                  <div className="p-3 bg-midnight text-text-primary rounded-xl border border-border text-xs min-w-[220px]">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2">
                      <span className="font-mono font-bold text-cyan">{obs.id}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isModis
                            ? 'bg-fire/20 text-fire border border-fire/30'
                            : 'bg-cyan/20 text-cyan border border-cyan/30'
                        }`}
                      >
                        {obs.satellite}
                      </span>
                    </div>

                    {/* Metadata Rows */}
                    <div className="space-y-1 text-text-secondary text-[11px] mb-3">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Location:</span>
                        <span className="font-medium text-text-primary truncate max-w-[130px]">
                          {obs.region}, {obs.country}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Coordinates:</span>
                        <span className="font-mono text-text-primary">
                          {obs.latitude.toFixed(2)}°, {obs.longitude.toFixed(2)}°
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Date & Time:</span>
                        <span className="font-mono text-text-primary">
                          {obs.date || 'Unknown date'} {obs.time ? `${obs.time} UTC` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">FRP Intensity:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {obs.frp} MW
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Confidence:</span>
                        <span
                          className={`font-semibold capitalize ${
                            obs.confidence === 'high'
                              ? 'text-emerald-400'
                              : obs.confidence === 'nominal'
                                ? 'text-warning'
                                : 'text-rose-400'
                          }`}
                        >
                          {obs.confidence}
                        </span>
                      </div>
                    </div>

                    {/* Action Button: Navigate to Earth Explorer */}
                    <button
                      onClick={() => handleOpenInGlobe(obs)}
                      className="w-full py-1.5 px-2 rounded-lg bg-cyan/15 hover:bg-cyan/25 border border-cyan/40 text-cyan font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Globe2 className="w-3.5 h-3.5" />
                      <span>Open in 3D Earth Explorer</span>
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Floating Sensor & FRP Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-[400] glass border border-border/80 rounded-xl p-3 shadow-xl backdrop-blur-md max-w-xs text-xs">
          <div className="flex items-center gap-1.5 font-bold text-text-primary mb-2">
            <Layers className="w-3.5 h-3.5 text-cyan" />
            <span>Map Telemetry Legend</span>
          </div>

          <div className="space-y-2">
            {/* Sensor Color Dots */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-fire shadow-sm shadow-fire/40" />
                <span className="text-text-secondary text-[11px]">MODIS (1 km)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan shadow-sm shadow-cyan/40" />
                <span className="text-text-secondary text-[11px]">VIIRS (375 m)</span>
              </div>
            </div>

            {/* FRP Size Scale */}
            {sizeByFrp && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
                  <span>&lt;20 MW</span>
                  <span>50 MW</span>
                  <span>&gt;100 MW</span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400/80" />
                  <span className="w-5 h-5 rounded-full bg-amber-400" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Marker Count Badge */}
        <div className="absolute top-4 left-4 z-[400] glass border border-border/80 rounded-lg px-2.5 py-1 text-xs text-text-secondary font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Showing {displayMarkers.length.toLocaleString()} points</span>
        </div>
      </div>
    </section>
  );
}