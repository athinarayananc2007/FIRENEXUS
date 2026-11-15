import { useState, useMemo } from 'react';
import {
  Globe2, Map, Search, Eye, EyeOff, RotateCcw,
  SlidersHorizontal, ChevronLeft, ChevronRight, X,
  Compass,
} from 'lucide-react';
import type { ConfidenceLevel } from '../../types';
import { SEARCH_LOCATIONS, parseCoordinates } from '../../data/mock/fireData';

interface ExplorerSidebarProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  viewMode: 'globe' | 'map';
  onViewModeChange: (mode: 'globe' | 'map') => void;
  showMODIS: boolean;
  showVIIRS: boolean;
  onToggleMODIS: () => void;
  onToggleVIIRS: () => void;
  confidenceFilter: ConfidenceLevel[];
  onToggleConfidence: (level: ConfidenceLevel) => void;
  minFrp: number;
  onMinFrpChange: (val: number) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  onSelectLocation: (loc: { lat: number; lon: number; name: string }) => void;
  counts: {
    total: number;
    modis: number;
    viirs: number;
    high: number;
    nominal: number;
    low: number;
  };
  layerSettings: {
    showHeatmap: boolean;
    sizeByFrp: boolean;
    showAtmosphere: boolean;
  };
  onToggleLayerSetting: (key: 'showHeatmap' | 'sizeByFrp' | 'showAtmosphere') => void;
}

const CONF_LEVELS: ConfidenceLevel[] = ['high', 'nominal', 'low'];

export default function ExplorerSidebar({
  isOpen,
  onToggleOpen,
  viewMode,
  onViewModeChange,
  showMODIS,
  showVIIRS,
  onToggleMODIS,
  onToggleVIIRS,
  confidenceFilter,
  onToggleConfidence,
  minFrp,
  onMinFrpChange,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  onSelectLocation,
  counts,
  layerSettings,
  onToggleLayerSetting,
}: ExplorerSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Search recommendations based on query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    // Check if coordinate input
    const coords = parseCoordinates(q);
    const results: { name: string; type: string; lat: number; lon: number }[] = [];
    if (coords) {
      results.push({
        name: `Coordinates: ${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`,
        type: 'coordinate',
        lat: coords.lat,
        lon: coords.lon,
      });
    }

    SEARCH_LOCATIONS.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.continent?.toLowerCase().includes(q),
    ).forEach((loc) => {
      results.push({
        name: loc.name,
        type: loc.type,
        lat: loc.lat,
        lon: loc.lon,
      });
    });

    return results.slice(0, 6);
  }, [searchQuery]);

  const handlePickLocation = (loc: { lat: number; lon: number; name: string }) => {
    onSelectLocation(loc);
    setSearchQuery('');
    setIsSearching(false);
  };

  return (
    <>
      {/* Floating Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={onToggleOpen}
          className="absolute top-4 left-4 z-30 glass p-2.5 rounded-xl border border-border/80 shadow-xl text-cyan hover:bg-surface-light flex items-center gap-2 text-xs font-semibold"
          title="Open Control Panel"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Explorer Controls</span>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </button>
      )}

      {/* Main Collapsible Glass Sidebar */}
      <div
        className={`absolute top-3 left-3 bottom-3 z-30 w-80 max-w-[calc(100vw-24px)] glass border border-border/80 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 backdrop-blur-xl ${
          isOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan" />
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Geospatial Explorer</h3>
          </div>
          <button
            onClick={onToggleOpen}
            className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Controls Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* View Mode Toggle: Globe / 2D Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label-text">Visualization Mode</span>
              <span className="text-[10px] text-text-muted font-mono uppercase">
                {viewMode === 'globe' ? '3D Spherical' : '2D Planar'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-navy/80 p-1 rounded-xl border border-border/60">
              <button
                onClick={() => onViewModeChange('globe')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'globe'
                    ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                3D Globe
              </button>
              <button
                onClick={() => onViewModeChange('map')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'map'
                    ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                2D Map
              </button>
            </div>
          </div>

          {/* Global Geographic Search */}
          <div className="relative">
            <span className="label-text block mb-1.5">Global Search</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearching(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, region, coords (e.g. Brazil)..."
                className="input-field pl-8 pr-7 py-1.5 text-xs rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {isSearching && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 glass rounded-xl border border-cyan/40 shadow-2xl p-1 space-y-0.5">
                {searchResults.map((res, i) => (
                  <button
                    key={`${res.name}-${i}`}
                    onClick={() => handlePickLocation(res)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-light flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-medium text-text-primary">{res.name}</span>
                    <span className="text-[10px] font-mono text-cyan capitalize px-1.5 py-0.5 rounded bg-cyan-dim">
                      {res.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Hotspot Stats Card */}
          <div className="bg-navy/70 border border-border/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-[11px] font-medium">Active Detections</span>
              <span className="demo-badge text-[9px]">Simulated Data</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-cyan">
                {counts.total.toLocaleString()}
              </span>
              <span className="text-xs text-text-muted">hotspots visible</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-fire" />
                <span className="text-text-muted">MODIS:</span>
                <span className="font-mono font-semibold text-text-primary">{counts.modis}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan" />
                <span className="text-text-muted">VIIRS:</span>
                <span className="font-mono font-semibold text-text-primary">{counts.viirs}</span>
              </div>
            </div>
          </div>

          {/* Satellite Instrument Layers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label-text">Instrument Layers</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (!showMODIS) onToggleMODIS();
                    if (!showVIIRS) onToggleVIIRS();
                  }}
                  className="text-[10px] text-cyan hover:underline"
                >
                  Show Both
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <button
                onClick={onToggleMODIS}
                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all ${
                  showMODIS
                    ? 'border-fire/50 bg-fire/10 text-text-primary'
                    : 'border-border/60 bg-navy/40 text-text-muted opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-fire" />
                  <span className="font-medium text-xs">MODIS (Aqua &amp; Terra)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold text-fire">{counts.modis}</span>
                  {showMODIS ? <Eye className="w-3.5 h-3.5 text-fire" /> : <EyeOff className="w-3.5 h-3.5" />}
                </div>
              </button>

              <button
                onClick={onToggleVIIRS}
                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all ${
                  showVIIRS
                    ? 'border-cyan/50 bg-cyan/10 text-text-primary'
                    : 'border-border/60 bg-navy/40 text-text-muted opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan" />
                  <span className="font-medium text-xs">VIIRS (Suomi &amp; NOAA-20)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold text-cyan">{counts.viirs}</span>
                  {showVIIRS ? <Eye className="w-3.5 h-3.5 text-cyan" /> : <EyeOff className="w-3.5 h-3.5" />}
                </div>
              </button>
            </div>
          </div>

          {/* Confidence Filter Multi-Select */}
          <div>
            <span className="label-text block mb-2">Detection Confidence</span>
            <div className="grid grid-cols-3 gap-1.5">
              {CONF_LEVELS.map((level) => {
                const isActive = confidenceFilter.includes(level);
                const count = level === 'high' ? counts.high : level === 'nominal' ? counts.nominal : counts.low;
                return (
                  <button
                    key={level}
                    onClick={() => onToggleConfidence(level)}
                    className={`px-2 py-1.5 rounded-xl border text-center transition-all ${
                      isActive
                        ? level === 'high'
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-semibold'
                          : level === 'nominal'
                            ? 'border-warning/50 bg-warning/15 text-warning font-semibold'
                            : 'border-danger/50 bg-danger/15 text-danger font-semibold'
                        : 'border-border/60 bg-navy/40 text-text-muted opacity-50'
                    }`}
                  >
                    <span className="capitalize block text-[11px]">{level}</span>
                    <span className="text-[10px] font-mono opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fire Radiative Power (FRP) Minimum Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="label-text">Min Fire Radiative Power</span>
              <span className="font-mono text-fire font-bold text-xs">{minFrp} MW</span>
            </div>
            <input
              type="range"
              min={0}
              max={250}
              step={5}
              value={minFrp}
              onChange={(e) => onMinFrpChange(Number(e.target.value))}
              className="w-full accent-fire h-1 bg-border rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-text-muted mt-1 font-mono">
              <span>0 MW</span>
              <span>100 MW</span>
              <span>250+ MW</span>
            </div>
          </div>

          {/* Layer Options & Visualization Toggles */}
          <div>
            <span className="label-text block mb-2">Display Enhancements</span>
            <div className="space-y-1.5">
              {viewMode === 'map' && (
                <label className="flex items-center justify-between p-2 rounded-xl bg-navy/40 border border-border/60 cursor-pointer">
                  <span className="text-text-secondary">Spatial Density Heatmap</span>
                  <input
                    type="checkbox"
                    checked={layerSettings.showHeatmap}
                    onChange={() => onToggleLayerSetting('showHeatmap')}
                    className="accent-cyan w-3.5 h-3.5 rounded"
                  />
                </label>
              )}
              {viewMode === 'globe' && (
                <label className="flex items-center justify-between p-2 rounded-xl bg-navy/40 border border-border/60 cursor-pointer">
                  <span className="text-text-secondary">Atmospheric Rim Glow</span>
                  <input
                    type="checkbox"
                    checked={layerSettings.showAtmosphere}
                    onChange={() => onToggleLayerSetting('showAtmosphere')}
                    className="accent-cyan w-3.5 h-3.5 rounded"
                  />
                </label>
              )}
              <label className="flex items-center justify-between p-2 rounded-xl bg-navy/40 border border-border/60 cursor-pointer">
                <span className="text-text-secondary">Scale Markers by FRP Magnitude</span>
                <input
                  type="checkbox"
                  checked={layerSettings.sizeByFrp}
                  onChange={() => onToggleLayerSetting('sizeByFrp')}
                  className="accent-cyan w-3.5 h-3.5 rounded"
                />
              </label>
            </div>
          </div>

          {/* Camera / Globe Tools */}
          {viewMode === 'globe' && (
            <div className="space-y-1.5 border-t border-border/40 pt-3">
              <button
                onClick={onToggleAutoRotate}
                className="flex items-center justify-between w-full p-2 rounded-xl border border-border/60 hover:bg-surface-light transition-colors text-text-secondary"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'text-cyan' : 'text-text-muted'}`} />
                  <span>Auto-Rotation</span>
                </div>
                <span className={`text-[10px] font-mono ${autoRotate ? 'text-cyan font-bold' : 'text-text-muted'}`}>
                  {autoRotate ? 'ON' : 'PAUSED'}
                </span>
              </button>
              <button
                onClick={onResetCamera}
                className="flex items-center justify-between w-full p-2 rounded-xl border border-border/60 hover:bg-surface-light transition-colors text-text-secondary"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                  <span>Reset Camera Framing</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted">Default</span>
              </button>
            </div>
          )}

          {/* Integrated Scientific Legend (No More Floating Box Overlap!) */}
          <div className="border-t border-border/40 pt-4 space-y-3">
            <span className="label-text block">Scientific Sensor Legend</span>
            
            {/* Sensor Dots */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-fire shrink-0" />
                <span className="text-text-primary">MODIS (1 km)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan shrink-0" />
                <span className="text-text-primary">VIIRS (375 m)</span>
              </div>
            </div>

            {/* FRP Scale */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-text-muted">
                <span>FRP Scale (MW):</span>
                <span className="text-fire font-mono font-semibold">10 → 250+ MW</span>
              </div>
              <div className="h-1.5 rounded-full bg-gradient-to-r from-cyan via-fire to-fire-bright" />
              <p className="text-[9px] text-text-muted leading-tight pt-0.5">
                *FRP measures instantaneous biomass radiant energy flux (MW), distinct from burn area or flame temperature.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
