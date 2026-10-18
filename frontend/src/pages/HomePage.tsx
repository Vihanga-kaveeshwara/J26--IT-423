import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { AboutSection } from '../components/AboutSection';
import { CapabilitiesSection } from '../components/FeaturesSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { BenefitsSection } from '../components/BenefitsSection';
import { CtaSection } from '../components/CtaSection';
import { ContactSection } from '../components/ContactSection';
import { Footer } from '../components/Footer';

export function HomePage() {
  return (
    <div className="min-h-screen bg-forest-950 text-white">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <CapabilitiesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <CtaSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
