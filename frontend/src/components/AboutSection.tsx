import { useRef, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

// Import about image
let aboutImg: string | undefined;
try {
  aboutImg = new URL('../assets/9-Tea-Factory-Tour-1.jpg', import.meta.url).href;
} catch {
  aboutImg = undefined;
}

const highlights = [
  'Integrates four independent AI research modules',
  'Covers the full tea export value chain',
  'Transparent, explainable model outputs',
  "Designed specifically for Sri Lanka's tea industry",
  'Supports strategic and operational decision-making',
];

export function AboutSection() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    if (leftRef.current) observer.observe(leftRef.current);
    if (rightRef.current) observer.observe(rightRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="relative py-24 lg:py-32 bg-gradient-to-b from-forest-950 to-forest-900 overflow-hidden">
      {/* Background dot pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:32px_32px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className="text-center mb-16 animate-on-scroll"
          ref={(el) => {
            if (!el) return;
            const io = new IntersectionObserver(
              ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); io.disconnect(); } },
              { threshold: 0.2 }
            );
            io.observe(el);
          }}
        >
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            About the Platform
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Intelligent Decision Support for{' '}
            <span className="gradient-text-gold">Ceylon Tea</span>
          </h2>
          <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">
            A final-year research initiative bridging advanced AI with one of Sri Lanka&apos;s most vital export industries.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text side */}
          <div ref={leftRef} className="animate-on-scroll-left">
            <div className="space-y-5 text-white/75 text-base sm:text-lg leading-relaxed">
              <p>
                Sri Lanka&apos;s tea export sector is a cornerstone of the national economy, yet it remains
                susceptible to demand volatility, manufacturing inefficiencies, and complex logistical
                decisions. Our platform addresses these challenges head-on.
              </p>
              <p>
                By combining state-of-the-art machine learning with domain expertise, the system provides
                exporters, planners, and policymakers with{' '}
                <span className="text-emerald-300 font-medium">actionable, data-driven insights</span>{' '}
                — not just raw predictions. Every recommendation is backed by transparent AI explanations
                so stakeholders can understand and trust the outcomes.
              </p>
              <p>
                From predicting future export demand, to estimating manufacturing losses before they happen,
                to optimising logistics routes — this system covers the full export value chain.
              </p>
            </div>

            {/* Highlight list */}
            <ul className="mt-8 space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 text-emerald-400 shrink-0" />
                  <span className="text-white/80 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              {['Machine Learning', 'Explainable AI', 'Optimisation', 'Data Analytics'].map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/70 text-xs font-semibold tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Image side */}
          <div ref={rightRef} className="animate-on-scroll-right">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              {aboutImg ? (
                <img
                  src={aboutImg}
                  alt="Sri Lankan Tea Factory"
                  className="w-full h-[420px] lg:h-[500px] object-cover"
                />
              ) : (
                <div className="w-full h-[420px] lg:h-[500px] bg-gradient-to-br from-forest-800 to-emerald-900 flex items-center justify-center">
                  <p className="text-white/40 text-sm">Tea factory image</p>
                </div>
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/60 via-transparent to-transparent" />
              {/* Caption badge */}
              <div className="absolute bottom-5 left-5 right-5 glass-card rounded-2xl p-4">
                <p className="text-white font-semibold text-sm">Sri Lankan Tea Manufacturing</p>
                <p className="text-white/60 text-xs mt-0.5">
                  From raw leaf to global export — powered by AI intelligence
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
