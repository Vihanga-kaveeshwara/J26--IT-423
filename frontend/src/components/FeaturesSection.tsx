import { useEffect, useRef } from 'react';
import {
  TrendingUp,
  Factory,
  Brain,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface Feature {
  id: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  accent: string;
  badgeBg: string;
  iconBg: string;
}

const features: Feature[] = [
  {
    id: 'M1',
    icon: <TrendingUp className="w-7 h-7" strokeWidth={1.8} />,
    badge: 'Module 1',
    title: 'Tea Export Demand Forecasting',
    description:
      'Predict future tea export demand using historical market trends, seasonal patterns, economic indicators, and advanced machine learning models — enabling proactive planning.',
    accent: 'from-emerald-400 to-emerald-600',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    iconBg: 'from-emerald-500 to-emerald-700',
  },
  {
    id: 'M2',
    icon: <Factory className="w-7 h-7" strokeWidth={1.8} />,
    badge: 'Module 2',
    title: 'Refuse Tea Prediction & Supply Estimation',
    description:
      'Predict manufacturing-stage refuse tea percentages, identify the most influential production factors, and estimate available exportable tea supply with high accuracy.',
    accent: 'from-gold-400 to-gold-600',
    badgeBg: 'bg-gold-500/15 text-gold-300 border-gold-500/25',
    iconBg: 'from-gold-500 to-gold-700',
  },
  {
    id: 'M3',
    icon: <Brain className="w-7 h-7" strokeWidth={1.8} />,
    badge: 'Module 3',
    title: 'Explainable AI & Decision Support',
    description:
      'Deliver transparent AI explanations using SHAP and LIME, enable what-if scenario analysis, and provide actionable recommendations that decision-makers can trust and act upon.',
    accent: 'from-violet-400 to-violet-600',
    badgeBg: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    iconBg: 'from-violet-500 to-violet-700',
  },
  {
    id: 'M4',
    icon: <Truck className="w-7 h-7" strokeWidth={1.8} />,
    badge: 'Module 4',
    title: 'Export & Logistics Optimisation',
    description:
      'Optimise export planning and logistics decisions by integrating demand forecasts, available supply estimates, and operational constraints into a cohesive recommendation engine.',
    accent: 'from-sky-400 to-sky-600',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
    iconBg: 'from-sky-500 to-sky-700',
  },
];

function FeatureCard({ feature, delay }: { feature: Feature; delay: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className="animate-on-scroll group relative rounded-3xl bg-gradient-to-b from-forest-800/60 to-forest-900/80 border border-white/8 p-8 overflow-hidden
        hover:border-white/20 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/30
        transition-all duration-400 cursor-default shimmer-hover"
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Gradient corner accent */}
      <div
        className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl ${feature.accent} opacity-0 group-hover:opacity-8 rounded-full blur-2xl transition-opacity duration-500 -translate-y-10 translate-x-10`}
      />

      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}
      >
        {feature.icon}
      </div>

      {/* Badge */}
      <span
        className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border ${feature.badgeBg} mb-3`}
      >
        {feature.badge}
      </span>

      {/* Title */}
      <h3 className="font-display font-bold text-white text-xl leading-snug mb-3 group-hover:text-emerald-50 transition-colors">
        {feature.title}
      </h3>

      {/* Description */}
      <p className="text-white/60 text-sm leading-relaxed group-hover:text-white/75 transition-colors">
        {feature.description}
      </p>

      {/* Bottom link */}
      <div className="mt-6 flex items-center gap-1.5 text-emerald-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

export function CapabilitiesSection() {
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); io.disconnect(); } },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="features" className="relative py-24 lg:py-32 bg-gradient-to-b from-forest-900 to-forest-950 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headRef} className="text-center mb-16 animate-on-scroll">
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Core AI Capabilities
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Four Research Modules,{' '}
            <span className="gradient-text-green">One Unified Platform</span>
          </h2>
          <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">
            Each module targets a distinct challenge in the tea export pipeline, working together
            to deliver holistic intelligence.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.id} feature={f} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}
