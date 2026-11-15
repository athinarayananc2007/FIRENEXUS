import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  Globe2,
  Flame,
  Zap,
  Download,
  Clock,
  MapPin,
  Activity,
  Thermometer,
  ShieldCheck,
  Sun,
  Moon,
  Compass,
  Sparkles,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import {
  formatCoordinates,
  getObservationInstrument,
  getObservationDayNight,
} from '../../utils/dataExplorerUtils';
import { haversineDistanceKm } from '../../data/mock/fireData';
import { BASEMAP_CONFIG } from '../../constants/mapConfig';

interface ObservationDetailDrawerProps {
  observation: FireObservation | null;
  allObservations: FireObservation[];
  onClose: () => void;
  onOpenGlobe: (obs: FireObservation) => void;
  onSelectRelatedObs: (obs: FireObservation) => void;
}

export const ObservationDetailDrawer: React.FC<ObservationDetailDrawerProps> = ({
  observation,
  allObservations,
  onClose,
  onOpenGlobe,
  onSelectRelatedObs,
}) => {
  // Find nearby related observations on the same date within 25 km
  const relatedObservations = useMemo(() => {
    if (!observation) return [];
    return allObservations
      .filter((o) => o.id !== observation.id && o.date && o.date === observation.date)
      .map((o) => ({
        obs: o,
        distanceKm: haversineDistanceKm(
          observation.latitude,
          observation.longitude,
          o.latitude,
          o.longitude
        ),
      }))
      .filter((item) => item.distanceKm <= 35)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }, [observation, allObservations]);

  if (!observation) return null;

  const isModis = observation.satellite === 'MODIS';
  const { latStr, lonStr, dmsStr } = formatCoordinates(
    observation.latitude,
    observation.longitude
  );
  const instrument = getObservationInstrument(observation);
  const dayNight = getObservationDayNight(observation);

  // Download metadata as JSON
  const handleDownloadJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(observation, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `observation_${observation.id}.json`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-midnight/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-surface/98 border-l border-cyan/40 shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                isModis
                  ? 'bg-fire/20 text-fire border border-fire/40'
                  : 'bg-cyan/20 text-cyan border border-cyan/40'
              }`}
            >
              {isModis ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-lg font-bold text-text-primary">
                  {observation.id}
                </h3>
                <span className="demo-badge text-[10px]">Simulated FIRMS Pixel</span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {instrument} &bull; {observation.date || 'Unknown date'} {observation.time ? `${observation.time} UTC` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenGlobe(observation)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 text-xs font-semibold transition-colors"
              title="Open observation in 3D Earth Globe view"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>3D Globe</span>
            </button>
            <button
              onClick={handleDownloadJson}
              className="p-1.5 rounded-lg bg-navy hover:bg-surface border border-border/60 text-text-muted hover:text-text-primary transition-colors"
              title="Download metadata as JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-navy hover:bg-surface border border-border/60 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Observation Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {/* Spatial Coordinates */}
          <div className="p-3 bg-navy/70 border border-border/60 rounded-xl space-y-1">
            <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan" /> Geographic Coordinates
            </div>
            <div className="font-mono font-bold text-text-primary text-xs">
              {latStr}, {lonStr}
            </div>
            <div className="text-[10px] text-text-muted truncate font-mono">{dmsStr}</div>
          </div>

          {/* Temporal Acquisition */}
          <div className="p-3 bg-navy/70 border border-border/60 rounded-xl space-y-1">
            <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan" /> Overpass Timestamp
            </div>
            <div className="font-mono font-bold text-text-primary text-xs">
              {observation.date || 'Unknown date'} {observation.time ? `${observation.time} UTC` : ''}
            </div>
            <div className="text-[10px] text-text-muted flex items-center gap-1">
              {dayNight === 'D' ? (
                <span className="flex items-center gap-0.5 text-amber-400">
                  <Sun className="w-2.5 h-2.5" /> Daytime Pass
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-cyan">
                  <Moon className="w-2.5 h-2.5" /> Nighttime Pass
                </span>
              )}
            </div>
          </div>

          {/* Sensor Instrument */}
          <div className="p-3 bg-navy/70 border border-border/60 rounded-xl space-y-1">
            <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan" /> Instrument Platform
            </div>
            <div className="font-semibold text-text-primary text-xs">{instrument}</div>
            <div className="text-[10px] text-text-muted">
              {isModis ? '1 km nominal nadir' : '375 m I-band nadir'}
            </div>
          </div>

          {/* Fire Radiative Power */}
          <div className="p-3 bg-navy/70 border border-amber-500/30 rounded-xl space-y-1">
            <div className="text-[10px] text-amber-400 uppercase font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3" /> Fire Radiative Power
            </div>
            <div className="font-mono font-extrabold text-amber-400 text-base">
              {observation.frp.toFixed(1)} <span className="text-xs font-normal">MW</span>
            </div>
            <div className="text-[10px] text-text-muted">Instantaneous radiant output</div>
          </div>

          {/* Brightness Temperature */}
          <div className="p-3 bg-navy/70 border border-border/60 rounded-xl space-y-1">
            <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-fire" /> Brightness Temp
            </div>
            <div className="font-mono font-extrabold text-text-primary text-base">
              {observation.brightness.toFixed(1)} <span className="text-xs font-normal">K</span>
            </div>
            <div className="text-[10px] text-text-muted">Channel radiance temperature</div>
          </div>

          {/* Algorithmic Confidence */}
          <div className="p-3 bg-navy/70 border border-emerald-500/30 rounded-xl space-y-1">
            <div className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Algorithmic Confidence
            </div>
            <div className="font-bold text-emerald-400 uppercase text-xs">
              {observation.confidence} Confidence
            </div>
            <div className="text-[10px] text-text-muted">Contextual threshold verified</div>
          </div>
        </div>

        {/* Embedded Mini Leaflet Map */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan" /> Geographic Location Centering
            </span>
            <span className="font-mono text-[11px]">
              {observation.region}, {observation.country} ({observation.continent})
            </span>
          </div>

          <div className="h-44 w-full rounded-xl overflow-hidden border border-border/70 relative">
            <MapContainer
              center={[observation.latitude, observation.longitude]}
              zoom={7}
              className="h-full w-full bg-midnight"
              zoomControl={false}
              dragging={true}
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
              <CircleMarker
                center={[observation.latitude, observation.longitude]}
                radius={8}
                pathOptions={{
                  color: isModis ? '#FF713E' : '#00E5B0',
                  fillColor: isModis ? '#FF713E' : '#00E5B0',
                  fillOpacity: 0.9,
                  weight: 2.5,
                }}
              />
            </MapContainer>
          </div>
        </div>

        {/* Related Coincident Observations */}
        {relatedObservations.length > 0 && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan" /> Co-Incident Detections Within &le;35 km
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                {relatedObservations.length} nearby candidate{relatedObservations.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {relatedObservations.map(({ obs, distanceKm }) => {
                const relIsModis = obs.satellite === 'MODIS';
                return (
                  <div
                    key={obs.id}
                    onClick={() => onSelectRelatedObs(obs)}
                    className="p-2.5 rounded-lg bg-navy/60 hover:bg-surface-light border border-border/50 hover:border-cyan/40 transition-colors cursor-pointer space-y-1 font-mono group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary text-[11px] group-hover:text-cyan">
                        {obs.id}
                      </span>
                      <span
                        className={`text-[9px] px-1 rounded font-bold ${
                          relIsModis ? 'text-fire bg-fire/15' : 'text-cyan bg-cyan/15'
                        }`}
                      >
                        {obs.satellite}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-muted flex justify-between">
                      <span>Distance:</span>
                      <strong className="text-text-secondary">{distanceKm.toFixed(1)} km</strong>
                    </div>
                    <div className="text-[10px] text-text-muted flex justify-between">
                      <span>FRP:</span>
                      <span className="text-amber-400 font-bold">{obs.frp.toFixed(1)} MW</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-text-muted text-[11px]">
            Data Schema: NASA FIRMS Standard Fire Format Version 6.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-navy hover:bg-surface text-text-secondary hover:text-text-primary border border-border/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObservationDetailDrawer;
