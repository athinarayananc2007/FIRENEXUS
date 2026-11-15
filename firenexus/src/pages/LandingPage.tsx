import LandingNav from '../components/landing/LandingNav';
import HeroSection from '../components/landing/HeroSection';
import PlatformOverview from '../components/landing/PlatformOverview';
import HowItWorks from '../components/landing/HowItWorks';
import SatelliteTechnology from '../components/landing/SatelliteTechnology';
import AnalyticsPreview from '../components/landing/AnalyticsPreview';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent relative selection:bg-cyan/30 selection:text-white">
      <LandingNav />
      <HeroSection />
      <PlatformOverview />
      <HowItWorks />
      <SatelliteTechnology />
      <AnalyticsPreview />
      <FinalCTA />
      <Footer />
    </div>
  );
}
