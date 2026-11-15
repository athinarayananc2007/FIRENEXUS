import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import GlobalSpaceBackground from './components/layout/GlobalSpaceBackground';
import RouteErrorBoundary from './components/layout/RouteErrorBoundary';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EarthExplorer = lazy(() => import('./pages/EarthExplorer'));
const Comparison = lazy(() => import('./pages/Comparison'));
const FireCalendar = lazy(() => import('./pages/FireCalendar'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AnomalyExplorer = lazy(() => import('./pages/AnomalyExplorer'));
const DataExplorer = lazy(() => import('./pages/DataExplorer'));
const About = lazy(() => import('./pages/About'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center relative z-20">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary text-sm">Loading FIRENEXUS...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-midnight text-text-primary relative selection:bg-cyan/30 selection:text-white">
      {/* 1. Global Persistent Space Background & Interactive Floating Particle System */}
      <GlobalSpaceBackground showOrbitalRings={true} />

      {/* 2. Page Content & Application Routes with Route-Level Error Boundaries */}
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<RouteErrorBoundary routeName="Landing"><LandingPage /></RouteErrorBoundary>} />
          <Route path="/dashboard" element={<RouteErrorBoundary routeName="Dashboard"><Dashboard /></RouteErrorBoundary>} />
          <Route path="/explorer" element={<RouteErrorBoundary routeName="Earth Explorer"><EarthExplorer /></RouteErrorBoundary>} />
          <Route path="/comparison" element={<RouteErrorBoundary routeName="Comparison"><Comparison /></RouteErrorBoundary>} />
          <Route path="/calendar" element={<RouteErrorBoundary routeName="Fire Calendar"><FireCalendar /></RouteErrorBoundary>} />
          <Route path="/analytics" element={<RouteErrorBoundary routeName="Analytics"><Analytics /></RouteErrorBoundary>} />
          <Route path="/anomaly" element={<RouteErrorBoundary routeName="Anomaly Explorer"><AnomalyExplorer /></RouteErrorBoundary>} />
          <Route path="/data" element={<RouteErrorBoundary routeName="Data Explorer"><DataExplorer /></RouteErrorBoundary>} />
          <Route path="/about" element={<RouteErrorBoundary routeName="About"><About /></RouteErrorBoundary>} />
        </Routes>
      </Suspense>
    </div>
  );
}
