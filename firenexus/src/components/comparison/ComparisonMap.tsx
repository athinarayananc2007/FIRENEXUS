import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Map as MapIcon, Globe2, Eye, EyeOff, Crosshair, Zap,
  Layers,
} from 'lucide-react';
import type { FireObservation, MatchedFirePair } from '../../types';
import { BASEMAP_CONFIG } from '../../constants/mapConfig';

interface ComparisonMapProps {
  observations: FireObservation[];
  matchedPairs: MatchedFirePair[];
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

export default function ComparisonMap({
  observations,
  matchedPairs,
}: ComparisonMapProps) {
  const navigate = useNavigate();
  const [showModis, setShowModis] = useState(true);
  const [showViirs, setShowViirs] = useState(true);
  const [showMatchedOnly, setShowMatchedOnly] = useState(false);
  const [sizeByFrp, setSizeByFrp] = useState(true);
  const [activeRegion, setActiveRegion] = useState<[number, number]>([15, 10]);
  const [activeZoom, setActiveZoom] = useState<number>(2);

  // Set of IDs that have candidate matches
  const matchedModisMap = useMemo(() => {
    const map = new Map<string, MatchedFirePair>();
    matchedPairs.forEach((p) => map.set(p.modis.id, p));
    return map;
  }, [matchedPairs]);

  const matchedViirsMap = useMemo(() => {
    const map = new Map<string, MatchedFirePair>();
    matchedPairs.forEach((p) => map.set(p.viirs.id, p));
    return map;
  }, [matchedPairs]);

  // Display markers based on layer toggles
  const displayMarkers = useMemo(() => {
    let list = observations;
    if (showMatchedOnly) {
      list = list.filter(
        (o) => matchedModisMap.has(o.id) || matchedViirsMap.has(o.id),
      );
    }
    if (!showModis) {
      list = list.filter((o) => o.satellite !== 'MODIS');
    }
    if (!showViirs) {
      list = list.filter((o) => o.satellite !== 'VIIRS');
    }
    return list.slice(0, 1200);
  }, [observations, showModis, showViirs, showMatchedOnly, matchedModisMap, matchedViirsMap]);

  const handleOpenInGlobe = (obs: FireObservation) => {
    navigate('/explorer', {
      state: { targetLocation: { lat: obs.latitude, lon: obs.longitude, name: `${obs.region}, ${obs.country}` } },
    });
  };

  return (
    <section className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <MapIcon className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Geographical Comparison Map
            </h2>
            <span className="demo-badge text-[10px]">Dual Layer Cartography</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Cross-sensor geographic overlay: MODIS-only, VIIRS-only, and candidate matched detection pairs
          </p>
        </div>

        {/* Visibility Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowModis(!showModis)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showModis
                ? 'border-fire/40 bg-fire/15 text-fire shadow-sm'
                : 'border-border/60 text-text-muted hover:text-text-secondary'
            }`}
          >
            {showModis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            MODIS Layer
          </button>

          <button
            onClick={() => setShowViirs(!showViirs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showViirs
                ? 'border-cyan/40 bg-cyan/15 text-cyan shadow-sm'
                : 'border-border/60 text-text-muted hover:text-text-secondary'
            }`}
          >
            {showViirs ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            VIIRS Layer
          </button>

          <button
            onClick={() => setShowMatchedOnly(!showMatchedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showMatchedOnly
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-sm'
                : 'border-border/60 text-text-muted hover:text-text-secondary'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Matched Pairs Only ({matchedPairs.length})
          </button>

          <button
            onClick={() => setSizeByFrp(!sizeByFrp)}
            className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 ${
              sizeByFrp ? 'text-amber-400 border-amber-500/40' : ''
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{sizeByFrp ? 'FRP Scaled' : 'Fixed Scale'}</span>
          </button>
        </div>
      </div>

      {/* Focus Region Pills */}
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

      {/* Map Canvas */}
      <div className="glass border border-border/80 rounded-2xl overflow-hidden shadow-2xl relative">
        <MapContainer
          center={activeRegion}
          zoom={activeZoom}
          scrollWheelZoom={true}
          style={{ height: '540px', width: '100%', background: '#070B18' }}
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
            const matchedPair = isModis
              ? matchedModisMap.get(obs.id)
              : matchedViirsMap.get(obs.id);
            const isMatched = !!matchedPair;

            let radius = isMatched ? 4.5 : 3;
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
                  color: isMatched ? '#c084fc' : color,
                  fillColor: color,
                  fillOpacity: isMatched ? 0.9 : 0.75,
                  weight: isMatched ? 2 : 1,
                }}
              >
                <Popup className="firenexus-popup">
                  <div className="p-3 bg-midnight text-text-primary rounded-xl border border-border text-xs min-w-[240px]">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 mb-2">
                      <span className="font-mono font-bold text-cyan">{obs.id}</span>
                      <div className="flex items-center gap-1.5">
                        {isMatched && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                            Candidate Match
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isModis
                              ? 'bg-fire/20 text-fire border border-fire/30'
                              : 'bg-cyan/20 text-cyan border border-cyan/30'
                          }`}
                        >
                          {obs.satellite}
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1 text-text-secondary text-[11px] mb-3">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Location:</span>
                        <span className="font-medium text-text-primary truncate max-w-[140px]">
                          {obs.region}, {obs.country}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Coordinates:</span>
                        <span className="font-mono text-text-primary">
                          {obs.latitude.toFixed(4)}°, {obs.longitude.toFixed(4)}°
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Overpass Time:</span>
                        <span className="font-mono text-text-primary">
                          {obs.date || 'Unknown date'} {obs.time ? `${obs.time} UTC` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">Radiative Power:</span>
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

                      {/* Paired counterpart metadata if matched */}
                      {matchedPair && (
                        <div className="mt-2 pt-2 border-t border-border/60 bg-purple-500/10 p-2 rounded-lg text-[10px] space-y-0.5">
                          <div className="flex justify-between font-semibold text-purple-300">
                            <span>Paired Counterpart:</span>
                            <span className="font-mono">
                              {isModis ? matchedPair.viirs.id : matchedPair.modis.id} (
                              {isModis ? 'VIIRS' : 'MODIS'})
                            </span>
                          </div>
                          <div className="flex justify-between text-text-muted">
                            <span>Spatial Separation:</span>
                            <span className="font-mono text-text-primary">
                              {matchedPair.distanceKm} km
                            </span>
                          </div>
                          <div className="flex justify-between text-text-muted">
                            <span>Time Difference:</span>
                            <span className="font-mono text-text-primary">
                              {matchedPair.timeDiffMinutes} min
                            </span>
                          </div>
                          <div className="flex justify-between text-text-muted">
                            <span>FRP Difference:</span>
                            <span className="font-mono text-amber-300">
                              {matchedPair.frpDiff > 0 ? '+' : ''}
                              {matchedPair.frpDiff} MW
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action */}
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

        {/* Map Legend */}
        <div className="absolute bottom-4 right-4 z-[400] glass border border-border/80 rounded-xl p-3 shadow-xl backdrop-blur-md max-w-xs text-xs space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-text-primary">
            <Layers className="w-3.5 h-3.5 text-cyan" />
            <span>Map Layers Legend</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-fire" />
              <span className="text-text-secondary">MODIS Observation (1 km)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan" />
              <span className="text-text-secondary">VIIRS Observation (375 m)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-purple-400 bg-transparent" />
              <span className="text-purple-300 font-semibold">Candidate Co-Incident Match</span>
            </div>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="absolute top-4 left-4 z-[400] glass border border-border/80 rounded-lg px-2.5 py-1 text-xs text-text-secondary font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Displaying {displayMarkers.length.toLocaleString()} points</span>
        </div>
      </div>
    </section>
  );
}