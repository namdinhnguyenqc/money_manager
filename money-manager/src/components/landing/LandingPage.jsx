import React, { useState, useEffect } from 'react';
import LandingHeader from './LandingHeader';
import HeroSection from './HeroSection';
import PainPointSection from './PainPointSection';
import FeatureSection from './FeatureSection';
import BenefitsSection from './BenefitsSection';
import HowItWorksSection from './HowItWorksSection';
import AppPreviewSection from './AppPreviewSection';
import PricingSection from './PricingSection';
import UseCaseSection from './UseCaseSection';
import FAQSection from './FAQSection';
import FinalCTASection from './FinalCTASection';
import LandingFooter from './LandingFooter';
import LoginModal from './LoginModal';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Update page title and meta for SEO
    document.title = 'TrọCare - Phần mềm quản lý nhà trọ miễn phí cho chủ trọ Việt Nam';
    
    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = 'TrọCare giúp chủ trọ quản lý phòng, khách thuê, hợp đồng, hóa đơn, điện nước, công nợ và thu chi dễ dàng. Miễn phí để bắt đầu, dùng tốt trên điện thoại và máy tính.';

    // Open Graph
    const ogTags = [
      { property: 'og:title', content: 'TrọCare - Phần mềm quản lý nhà trọ miễn phí cho chủ trọ Việt Nam' },
      { property: 'og:description', content: 'TrọCare giúp chủ trọ quản lý phòng, khách thuê, hóa đơn, điện nước, công nợ và thu chi dễ dàng.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'TrọCare - Phần mềm quản lý nhà trọ miễn phí' },
      { name: 'twitter:description', content: 'TrọCare giúp chủ trọ quản lý phòng, khách thuê, hóa đơn và thu chi dễ dàng. Miễn phí để bắt đầu.' },
    ];

    ogTags.forEach(({ property, name, content }) => {
      const attr = property ? 'property' : 'name';
      const val = property || name;
      let el = document.querySelector(`meta[${attr}="${val}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, val);
        document.head.appendChild(el);
      }
      el.content = content;
    });

    // JSON-LD Structured Data
    const existingScript = document.getElementById('trocare-jsonld');
    if (existingScript) existingScript.remove();
    const script = document.createElement('script');
    script.id = 'trocare-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "TrọCare",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web, Android, iOS",
      "description": "TrọCare là phần mềm quản lý nhà trọ miễn phí giúp chủ trọ quản lý phòng, khách thuê, hóa đơn, điện nước, công nợ và thu chi dễ dàng.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "VND"
      }
    });
    document.head.appendChild(script);

    return () => {
      // Reset title when leaving landing
      const jsonldScript = document.getElementById('trocare-jsonld');
      if (jsonldScript) jsonldScript.remove();
    };
  }, []);

  return (
    <div className="landing-page bg-[#F8FAFC] overflow-x-hidden">
      <LandingHeader onLogin={() => setShowLogin(true)} />
      <main>
        <HeroSection onStart={() => setShowLogin(true)} />
        <PainPointSection />
        <FeatureSection />
        <BenefitsSection />
        <HowItWorksSection />
        <AppPreviewSection />
        <PricingSection onStart={() => setShowLogin(true)} />
        <UseCaseSection />
        <FAQSection />
        <FinalCTASection onStart={() => setShowLogin(true)} />
      </main>
      <LandingFooter />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
