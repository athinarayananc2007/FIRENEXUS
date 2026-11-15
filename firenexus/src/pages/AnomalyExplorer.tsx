import { useState, useMemo, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import AnomalyList from '../components/anomaly/AnomalyList';
import AnomalyTimeline from '../components/anomaly/AnomalyTimeline';
import AnomalyMap from '../components/anomaly/AnomalyMap';
import BaselineChart from '../components/anomaly/BaselineChart';
import { MOCK_OBSERVATIONS, computeAnomalies } from '../data/mock/fireData';
import { anomalyService } from '../services/api';
import type { AnomalyRecord } from '../types';
import { AlertCircle } from 'lucide-react';

export default function AnomalyExplorer() {
  const [liveAnomalies, setLiveAnomalies] = useState<AnomalyRecord[] | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // Safely query read-only detected anomalies endpoint
    anomalyService
      .getAnomalies({ limit: 50 }, controller.signal)
      .then((result) => {
        if (result && Array.isArray(result.anomalies)) {
          const mapped: AnomalyRecord[] = result.anomalies.map((a) => ({
            id: String(a.id),
            region: a.observation?.region || a.observation?.country || 'Detected Region',
            date: (typeof a.created_at === 'string' && a.created_at.includes('T'))
              ? a.created_at.split('T')[0]
              : (typeof a.created_at === 'string' ? a.created_at : '2024-08-15'),
            score: Math.min(1.0, Math.max(0.1, Number((Math.abs(a.score) / 5.0).toFixed(2)))),
            baseline: Number((a.expected_value ?? 20.0).toFixed(1)),
            observed: Number((a.observed_value ?? 45.0).toFixed(1)),
            description: a.description || `${a.anomaly_type} detected with ${a.severity} severity`,
          }));
          setLiveAnomalies(mapped);
          setIsLive(true);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && err.errorCode !== 'REQUEST_ABORTED') {
          console.info('Backend anomalies endpoint offline, falling back to simulated baseline detection.');
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const fallbackAnomalies = useMemo(() => {
    return computeAnomalies(MOCK_OBSERVATIONS);
  }, []);

  const anomalies = liveAnomalies && liveAnomalies.length > 0 ? liveAnomalies : fallbackAnomalies;

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);

  const activeSelectedAnomaly = selectedAnomaly || (anomalies.length > 0 ? anomalies[0] : null);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
              Anomaly Detection Explorer
            </h1>
            <span className="demo-badge">Algorithm Demo</span>
            {isLive ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                ● Live API
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                ● Simulated Baseline
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-text-secondary max-w-3xl">
            Exploratory anomaly detection pipeline measuring fire frequency deviations relative to
            historical baselines.
          </p>
        </div>

        {/* Scientific Disclaimer Alert Box */}
        <div className="glass border-warning/30 bg-warning/5 rounded-xl p-4 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary space-y-1">
            <p className="font-semibold text-warning">
              Scientific Notice & Methodology Limitation
            </p>
            <p>
              Simulated anomaly scores shown here are algorithmic demonstrations and do NOT represent
              verified operational fire forecasts or official NASA anomaly assessments. Historical
              baselines are simulated for proof of concept.
            </p>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <AnomalyList
              anomalies={anomalies}
              selectedAnomaly={activeSelectedAnomaly}
              onSelect={setSelectedAnomaly}
            />
          </div>

          <div className="lg:col-span-7 space-y-6">
            <BaselineChart anomaly={activeSelectedAnomaly} />
            <AnomalyTimeline anomalies={anomalies} />
          </div>
        </div>

        {/* Geographic Projection */}
        <AnomalyMap
          anomalies={anomalies}
          selectedAnomaly={activeSelectedAnomaly}
          onSelect={setSelectedAnomaly}
        />
      </div>
    </AppLayout>
  );
}

