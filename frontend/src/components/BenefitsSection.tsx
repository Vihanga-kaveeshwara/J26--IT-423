import { useEffect, useRef } from 'react';
import {
  BarChart2,
  Cog,
  Eye,
  Layers,
  Route,
  Globe,
} from 'lucide-react';

const benefits = [
  {
    icon: <BarChart2 className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Data-Driven Export Planning',
    description:
      'Replace intuition-based decisions with quantitative, evidence-backed export strategies grounded in market realities.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    icon: <Cog className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Improved Manufacturing Efficiency',
    description:
      'Anticipate refuse tea yield before production, enabling proactive adjustments to maximise exportable supply.',
    color: 'text-gold-400',
    bg: 'bg-gold-500/10 border-gold-500/20',
  },
  {
    icon: <Eye className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Explainable AI Predictions',
    description:
      'Every prediction comes with transparent, human-readable explanations — building trust and regulatory confidence.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    icon: <Layers className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Better Resource Utilisation',
    description:
      'Align production volumes, workforce allocation, and procurement with accurate demand and supply forecasts.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    icon: <Route className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Optimised Logistics Decisions',
    description:
      'Identify the most cost-effective shipping routes, volumes, and timing windows for export operations.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    icon: <Globe className="w-6 h-6" strokeWidth={1.8} />,
    title: "Sri Lanka's Tea Industry Support",
    description:
      'Designed with local market context in mind, supporting the competitiveness of Ceylon Tea on the global stage.',
    color: 'text-forest-300',
    bg: 'bg-forest-600/20 border-forest-500/20',
  },
];

export function BenefitsSection() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items = gridRef.current?.querySelectorAll<HTMLElement>('.benefit-card');
    if (!items) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.1 }
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative py-24 lg:py-32 bg-gradient-to-b from-forest-950 to-forest-900 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
          <p className="text-gold-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Why Choose Our Platform
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Tangible Benefits for the{' '}
            <span className="gradient-text-gold">Entire Value Chain</span>
          </h2>
          <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">
            Our AI-powered platform delivers measurable improvements across planning, production, and logistics.
          </p>
        </div>

        {/* Benefits grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className={`benefit-card animate-on-scroll group p-7 rounded-2xl border ${b.bg} hover:bg-white/5 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 transition-all duration-300`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${b.bg} ${b.color} border group-hover:scale-110 transition-transform duration-300`}
              >
                {b.icon}
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{b.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
