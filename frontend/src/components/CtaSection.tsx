import { ArrowRight, Leaf } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Optional CTA background image
let ctaBg: string | undefined;
try {
  ctaBg = new URL('../assets/LS_B3_RomanticCeylon-Tea-adventures_1920x700.jpg', import.meta.url).href;
} catch {
  ctaBg = undefined;
}

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); io.disconnect(); } },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={
          ctaBg
            ? { backgroundImage: `url(${ctaBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {}
        }
      />
      <div className="absolute inset-0 bg-gradient-to-br from-forest-950/96 via-forest-900/90 to-emerald-950/92" />

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-40 h-40 border border-emerald-500/10 rounded-full" />
      <div className="absolute top-20 left-20 w-24 h-24 border border-gold-500/10 rounded-full" />
      <div className="absolute bottom-10 right-10 w-56 h-56 border border-emerald-500/8 rounded-full" />
      <div className="absolute bottom-24 right-24 w-32 h-32 border border-gold-500/8 rounded-full" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div ref={ref} className="animate-on-scroll">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-forest-700 shadow-forest mb-8 animate-float">
            <Leaf className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>

          {/* Heading */}
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Empowering the Future of{' '}
            <span className="gradient-text-gold">Ceylon Tea</span> Exports
          </h2>

          {/* Description */}
          <p className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Join a research-driven initiative dedicated to elevating Sri Lanka&apos;s tea export industry
            through intelligent, transparent, and actionable AI decision support.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              onClick={(e) => { e.preventDefault(); document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="group shimmer-hover inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-forest-700 text-white font-semibold text-base shadow-forest hover:shadow-glow-green hover:from-emerald-400 hover:to-forest-600 active:scale-95 transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a
              href="#features"
              onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/25 text-white font-semibold text-base bg-white/5 hover:bg-white/12 hover:border-white/40 active:scale-95 transition-all duration-300"
            >
              Explore Modules
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
