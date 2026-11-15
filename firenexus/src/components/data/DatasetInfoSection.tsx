import React, { useState } from 'react';
import {
  Flame,
  Zap,
  Info,
  Satellite,
  Clock,
  Compass,
  CloudRain,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export const DatasetInfoSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'provenance' | 'orbit' | 'confidence' | 'limitations'>(
    'provenance'
  );

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Scientific Data Provenance &amp; Remote Sensing Architecture
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Technical principles governing NASA FIRMS, MODIS &amp; VIIRS active fire observations,
              confidence algorithms, and sensing limitations.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-navy/80 rounded-xl border border-border/60 text-xs">
          <button
            onClick={() => setActiveTab('provenance')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'provenance'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Instruments &amp; FIRMS
          </button>
          <button
            onClick={() => setActiveTab('orbit')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'orbit'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Orbits &amp; Timestamps
          </button>
          <button
            onClick={() => setActiveTab('confidence')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'confidence'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Confidence Levels
          </button>
          <button
            onClick={() => setActiveTab('limitations')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'limitations'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Sensing Limitations
          </button>
        </div>
      </div>

      {/* TAB 1: Instruments & FIRMS Provenance */}
      {activeTab === 'provenance' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Comparison Cards: MODIS vs VIIRS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* MODIS Technical Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-navy/70 border border-fire/30 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-fire/20 text-fire border border-fire/40">
                      <Flame className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-fire">
                      MODIS (Moderate Resolution Imaging Spectroradiometer)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-fire/15 text-fire border border-fire/30">
                    1 km Nadir
                  </span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  Operating aboard NASA's flagship polar-orbiting <strong>Terra</strong> (launched Dec
                  1999) and <strong>Aqua</strong> (launched May 2002) spacecraft at an altitude of 705
                  km with sun-synchronous circular orbits.
                </p>

                <div className="space-y-1.5 text-xs font-mono text-text-secondary bg-midnight/60 p-3 rounded-lg border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Nominal Resolution:</span>
                    <strong className="text-text-primary">1,000 m (1.0 km at nadir)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Swath Width:</span>
                    <strong className="text-text-primary">2,330 km across-track</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Thermal Detection Bands:</span>
                    <strong className="text-text-primary">
                      B21/22 (3.96 &mu;m), B31 (11.0 &mu;m)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Scan Edge Distortion:</span>
                    <strong className="text-fire">4.8 km &times; 2.0 km (Bowtie elongation)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Historical Baseline:</span>
                    <strong className="text-text-primary">2000 &ndash; Present (24+ years)</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-text-secondary leading-relaxed pt-2 border-t border-border/40">
                <strong>Climatological Value:</strong> MODIS provides the longest uninterrupted
                calibrated active fire time series in existence, indispensable for decadal wildfire
                modeling and trend analysis.
              </div>
            </div>

            {/* VIIRS Technical Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-navy/70 border border-cyan/30 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan/20 text-cyan border border-cyan/40">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-cyan">
                      VIIRS (Visible Infrared Imaging Radiometer Suite)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30">
                    375 m Nadir
                  </span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  Operating aboard the joint NASA/NOAA <strong>Suomi-NPP</strong> and JPSS series (
                  <strong>NOAA-20 / NOAA-21</strong>) at 824 km altitude with advanced pixel
                  aggregation across scan edges.
                </p>

                <div className="space-y-1.5 text-xs font-mono text-text-secondary bg-midnight/60 p-3 rounded-lg border border-border/40">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Nominal Resolution:</span>
                    <strong className="text-cyan font-bold">375 m (I-bands at nadir)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Swath Width:</span>
                    <strong className="text-text-primary">3,000 km (Zero equatorial gaps)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Thermal Detection Bands:</span>
                    <strong className="text-text-primary">
                      I4 (3.74 &mu;m), I5 (11.45 &mu;m) + M13
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Scan Edge Distortion:</span>
                    <strong className="text-cyan">~0.8 km &times; 0.8 km (Onboard aggregated)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Historical Baseline:</span>
                    <strong className="text-text-primary">2012 &ndash; Present (12+ years)</strong>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-text-secondary leading-relaxed pt-2 border-t border-border/40">
                <strong>Sub-Pixel Sensitivity:</strong> With ~7.1x smaller footprint area than MODIS,
                VIIRS detects low-intensity prescribed burns and early-stage ignitions hours before
                coarser sensors.
              </div>
            </div>
          </div>

          {/* NASA FIRMS & LANCE Context */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-navy via-surface to-navy border border-border/70 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-cyan font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>NASA FIRMS (Fire Information for Resource Management System)</span>
            </div>
            <p className="text-text-secondary leading-relaxed">
              NASA FIRMS is part of the Earth Observing System Data and Information System (EOSDIS)
              and LANCE (Land, Atmosphere Near real-time Capability for EOS). FIRMS delivers NRT active
              fire data within 3 hours of satellite observation to empower global wildland managers,
              firefighters, air quality agencies, and climate researchers worldwide.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Orbits & Timestamps */}
      {activeTab === 'orbit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Terra Pass */}
            <div className="p-4 rounded-xl bg-navy/70 border border-fire/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fire flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> Terra (EOS AM-1)
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-fire/15 text-fire">
                  Descending
                </span>
              </div>
              <div className="text-text-secondary space-y-1 font-mono">
                <div>Equator Crossing: <strong>~10:30 AM (Day)</strong></div>
                <div>Night Crossing: <strong>~10:30 PM (Night)</strong></div>
                <div>Orbital Period: <strong>98.8 minutes</strong></div>
                <div>Inclination: <strong>98.2&deg; retrograde</strong></div>
              </div>
              <p className="text-[11px] text-text-muted pt-2 border-t border-border/40">
                Detects early diurnal fire ramp-up before midday peak heating.
              </p>
            </div>

            {/* Aqua Pass */}
            <div className="p-4 rounded-xl bg-navy/70 border border-fire/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fire flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" /> Aqua (EOS PM-1)
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-fire/15 text-fire">
                  Ascending
                </span>
              </div>
              <div className="text-text-secondary space-y-1 font-mono">
                <div>Equator Crossing: <strong>~1:30 PM (Day)</strong></div>
                <div>Night Crossing: <strong>~1:30 AM (Night)</strong></div>
                <div>Orbital Period: <strong>98.4 minutes</strong></div>
                <div>Inclination: <strong>98.2&deg; retrograde</strong></div>
              </div>
              <p className="text-[11px] text-text-muted pt-2 border-t border-border/40">
                Captures peak diurnal fire behavior and maximum convective plume development.
              </p>
            </div>

            {/* Suomi-NPP & NOAA-20 */}
            <div className="p-4 rounded-xl bg-navy/70 border border-cyan/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> S-NPP &amp; NOAA-20 / 21
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan">
                  Sun-Synchronous
                </span>
              </div>
              <div className="text-text-secondary space-y-1 font-mono">
                <div>Equator Crossing: <strong>~1:30 PM (Day)</strong></div>
                <div>Night Crossing: <strong>~1:30 AM (Night)</strong></div>
                <div>Altitude: <strong>824 km</strong></div>
                <div>Swath Width: <strong>3,000 km (Full coverage)</strong></div>
              </div>
              <p className="text-[11px] text-text-muted pt-2 border-t border-border/40">
                NOAA-20 trails S-NPP by ~50 minutes, providing interleaved multi-look thermal verification.
              </p>
            </div>
          </div>

          <div className="p-3 bg-navy/50 rounded-xl border border-border/60 text-xs text-text-secondary leading-relaxed">
            <strong>Time Standard:</strong> All satellite acquisition timestamps in the FIRENEXUS
            catalog are recorded in <strong>Coordinated Universal Time (UTC)</strong> to guarantee
            astronomical consistency regardless of local time zones and seasonal daylight saving shifts.
          </div>
        </div>
      )}

      {/* TAB 3: Confidence Levels */}
      {activeTab === 'confidence' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Low Confidence */}
            <div className="p-4 rounded-xl bg-navy/70 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Low Confidence
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                  0 &ndash; 30% / Low
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Potential thermal anomalies near algorithm detection thresholds. Frequently associated
                with weak smoldering, sun-glint off water bodies, desert rock heating, industrial flares,
                or partially cloud-obscured fires.
              </p>
              <div className="text-[10px] font-mono text-text-muted bg-midnight/60 p-2 rounded border border-border/40">
                Scientific Recommendation: Require corroboration with auxiliary weather or smoke data
                before active suppression dispatch.
              </div>
            </div>

            {/* Nominal Confidence */}
            <div className="p-4 rounded-xl bg-navy/70 border border-cyan/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Nominal Confidence
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan">
                  30 &ndash; 80% / Nominal
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Standard quality-assured fire detections that satisfy all contextual brightness
                temperature tests (&Delta;T4-11 &gt; threshold) under cloud-free conditions with no
                solar contamination.
              </p>
              <div className="text-[10px] font-mono text-text-muted bg-midnight/60 p-2 rounded border border-border/40">
                Scientific Recommendation: Reliable for operational regional fire tracking and routine
                burned area estimations.
              </div>
            </div>

            {/* High Confidence */}
            <div className="p-4 rounded-xl bg-navy/70 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> High Confidence
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                  80 &ndash; 100% / High
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed text-[11px]">
                Intense flaming conditions exhibiting elevated 4 &mu;m brightness temperatures (&gt;360 K)
                and massive Fire Radiative Power (FRP &gt; 50 MW). Virtually zero probability of false
                alarm.
              </p>
              <div className="text-[10px] font-mono text-text-muted bg-midnight/60 p-2 rounded border border-border/40">
                Scientific Recommendation: Priority triage targets representing active wildfire crowns
                or high-energy biomass combustion fronts.
              </div>
            </div>
          </div>

          <div className="p-3 bg-navy/50 rounded-xl border border-border/60 text-xs text-text-secondary leading-relaxed flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan shrink-0" />
            <span>
              <strong>Note on VIIRS Confidence:</strong> VIIRS I-band products classify detections into
              three categorical states ('low', 'nominal', 'high') rather than percentage scores, based on
              day/night background contextual statistics.
            </span>
          </div>
        </div>
      )}

      {/* TAB 4: Sensing Limitations */}
      {activeTab === 'limitations' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {/* Cloud & Rain Masking */}
            <div className="p-3.5 rounded-xl bg-navy/70 border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-cyan font-bold">
                <CloudRain className="w-4 h-4" /> Cloud &amp; Weather Masking
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Dense cumulus clouds, thunderstorm anvils, and heavy precipitation completely block
                mid-infrared radiant emissions from reaching satellite optical sensors. Fires burning
                under clouds remain invisible until skies clear.
              </p>
            </div>

            {/* Thick Smoke Attenuation */}
            <div className="p-3.5 rounded-xl bg-navy/70 border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-fire font-bold">
                <EyeOff className="w-4 h-4" /> Smoke Plume Scattering
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Extremely thick pyrocumulonimbus smoke columns attenuate 3.9 &mu;m infrared wavelengths,
                causing severe underestimation of true Fire Radiative Power (FRP) and occasionally
                triggering cloud-mask misclassifications.
              </p>
            </div>

            {/* Sub-Canopy & Peat Ground Fires */}
            <div className="p-3.5 rounded-xl bg-navy/70 border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Flame className="w-4 h-4" /> Sub-Canopy Burns
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Dense tropical rain forest canopies and boreal understory can shield low-intensity
                ground fires and peat smoldering from direct overhead detection, undercounting smoldering
                carbon releases.
              </p>
            </div>

            {/* Diurnal Temporal Gaps */}
            <div className="p-3.5 rounded-xl bg-navy/70 border border-border/60 space-y-2">
              <div className="flex items-center gap-2 text-text-primary font-bold">
                <Clock className="w-4 h-4" /> Diurnal Cycle Gaps
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Polar-orbiting spacecraft provide ~4 overpass snapshots per day. Short-duration fires
                ignited and extinguished between sensor passes (e.g. rapid agricultural burns) can escape
                satellite observation altogether.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Official NASA Attribution & Outbound Links */}
      <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-text-muted text-[11px]">
          <span>Data Attribution:</span>
          <span className="text-text-secondary">
            NASA EOSDIS / LANCE / FIRMS &bull; Earth Science Data and Information System
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <a
            href="https://firms.modaps.eosdis.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan hover:text-cyan-light hover:underline transition-colors"
          >
            <span>NASA FIRMS Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://earthdata.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan hover:text-cyan-light hover:underline transition-colors"
          >
            <span>NASA Earthdata</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.earthdata.nasa.gov/learn/find-data/near-real-time"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-cyan hover:text-cyan-light hover:underline transition-colors"
          >
            <span>LANCE NRT</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default DatasetInfoSection;
