import { useEffect, useRef } from 'react';
import {
  Database,
  Cpu,
  BarChart3,
  Lightbulb,
  Package,
  HandHelping,
} from 'lucide-react';

const steps = [
  {
    id: 1,
    icon: <Database className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Data Collection',
    description: 'Historical trade data, market prices, production records, and economic indicators are gathered and pre-processed.',
    color: 'from-emerald-500 to-emerald-700',
    connectorColor: 'from-emerald-500',
  },
  {
    id: 2,
    icon: <Cpu className="w-6 h-6" strokeWidth={1.8} />,
    title: 'AI Analysis',
    description: 'Machine learning models process multi-dimensional data, identifying patterns and relationships invisible to traditional methods.',
    color: 'from-sky-500 to-sky-700',
    connectorColor: 'from-sky-500',
  },
  {
    id: 3,
    icon: <BarChart3 className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Demand & Refuse Prediction',
    description: 'Quantitative forecasts of future export demand and manufacturing-stage refuse percentages are produced.',
    color: 'from-gold-500 to-gold-700',
    connectorColor: 'from-gold-500',
  },
  {
    id: 4,
    icon: <Lightbulb className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Explainable Insights',
    description: 'SHAP-based explanations reveal the factors driving each prediction, enabling stakeholders to understand the "why".',
    color: 'from-violet-500 to-violet-700',
    connectorColor: 'from-violet-500',
  },
  {
    id: 5,
    icon: <Package className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Export Optimisation',
    description: 'Supply estimates and demand forecasts are combined to optimise export quantities, target markets, and logistics routes.',
    color: 'from-rose-500 to-rose-700',
    connectorColor: 'from-rose-500',
  },
  {
    id: 6,
    icon: <HandHelping className="w-6 h-6" strokeWidth={1.8} />,
    title: 'Decision Support',
    description: 'Actionable recommendations and what-if analyses are presented to help exporters and policymakers make confident decisions.',
    color: 'from-forest-500 to-forest-700',
    connectorColor: 'from-forest-500',
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>('.workflow-step');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((item) => io.observe(item));
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      className="relative py-24 lg:py-32 bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 overflow-hidden"
      ref={sectionRef}
    >
      {/* Decorative glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="text-center mb-20 animate-on-scroll workflow-step"
        >
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            How It Works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            From Raw Data to{' '}
            <span className="gradient-text-green">Smart Decisions</span>
          </h2>
          <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">
            A seamless six-stage pipeline transforms tea industry data into reliable, explainable insights.
          </p>
        </div>

        {/* Desktop horizontal steps */}
        <div className="hidden lg:flex items-start gap-0 relative">
          {/* Connecting line */}
          <div className="absolute top-7 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />

          {steps.map((step, i) => (
            <div
              key={step.id}
              className="workflow-step animate-on-scroll flex-1 flex flex-col items-center text-center px-3 relative z-10"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Icon circle */}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-xl mb-5 hover:scale-110 transition-transform duration-300`}
              >
                {step.icon}
              </div>
              {/* Step number */}
              <span className="text-white/30 text-xs font-bold tracking-widest uppercase mb-2">
                Step {step.id}
              </span>
              {/* Title */}
              <h3 className="text-white font-semibold text-sm mb-2 leading-snug">{step.title}</h3>
              {/* Description */}
              <p className="text-white/50 text-xs leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile vertical steps */}
        <div className="lg:hidden space-y-0 relative">
          {/* Vertical connector */}
          <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {steps.map((step, i) => (
            <div
              key={step.id}
              className="workflow-step animate-on-scroll flex gap-5 items-start pb-8 relative"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg shrink-0 z-10`}
              >
                {step.icon}
              </div>
              {/* Content */}
              <div className="pt-1.5">
                <span className="text-white/30 text-[10px] font-bold tracking-widest uppercase">
                  Step {step.id}
                </span>
                <h3 className="text-white font-semibold text-base mt-0.5 mb-1.5">{step.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
