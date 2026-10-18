import { ChevronDown, Sparkles } from 'lucide-react';

// Import hero image – user adds this to src/assets/
// Fallback to a dark forest-green gradient if image not present
let heroBg: string | undefined;
try {
  heroBg = new URL('../assets/Sri-Lankan-Tea-estate.jpg', import.meta.url).href;
} catch {
  heroBg = undefined;
}

export function HeroSection() {
  const scrollToAbout = () => {
    document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToFeatures = () => {
    document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={
        heroBg
          ? {
              backgroundImage: `url(${heroBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}
      }
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-forest-950/92 via-forest-900/85 to-emerald-950/80" />
      {/* Decorative radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold-500/6 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-8
            animate-fade-in-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          <Sparkles className="w-4 h-4 text-gold-400" />
          AI-Powered Tea Export Intelligence
        </div>

        {/* Heading */}
        <h1
          className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight mb-6
            animate-fade-in-up"
          style={{ animationDelay: '0.25s', animationFillMode: 'both' }}
        >
          Transforming{' '}
          <span className="gradient-text-gold">Sri Lankan Tea</span>{' '}
          Exports Through{' '}
          <span className="gradient-text-green">Artificial Intelligence</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed mb-12
            animate-fade-in-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
        >
          An integrated AI decision-support platform combining{' '}
          <span className="text-emerald-300 font-medium">demand forecasting</span>,{' '}
          <span className="text-emerald-300 font-medium">manufacturing loss prediction</span>,{' '}
          <span className="text-emerald-300 font-medium">explainable AI insights</span>, and{' '}
          <span className="text-emerald-300 font-medium">logistics optimisation</span>{' '}
          to empower Sri Lanka's tea export industry.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: '0.55s', animationFillMode: 'both' }}
        >
          <button
            onClick={scrollToFeatures}
            className="group shimmer-hover inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-forest-700 text-white font-semibold text-base shadow-forest hover:shadow-glow-green hover:from-emerald-400 hover:to-forest-600 active:scale-95 transition-all duration-300"
          >
            Explore Our Platform
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </button>
          <button
            onClick={scrollToAbout}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/25 text-white font-semibold text-base bg-white/5 hover:bg-white/12 hover:border-white/40 backdrop-blur-sm active:scale-95 transition-all duration-300"
          >
            Learn More
          </button>
        </div>

        {/* Stats row */}
        <div
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-fade-in-up"
          style={{ animationDelay: '0.7s', animationFillMode: 'both' }}
        >
          {[
            { value: '4', label: 'Research Modules' },
            { value: 'ML', label: 'Powered Models' },
            { value: 'XAI', label: 'Explainable AI' },
            { value: '360°', label: 'Decision Support' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl px-4 py-5 text-center hover:bg-white/10 transition-colors duration-200"
            >
              <p className="text-3xl font-display font-bold gradient-text-gold mb-1">
                {stat.value}
              </p>
              <p className="text-white/60 text-xs font-medium tracking-wider uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToAbout}
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors animate-float"
      >
        <span className="text-[10px] tracking-widest uppercase font-medium">Scroll</span>
        <ChevronDown className="w-5 h-5" />
      </button>
    </section>
  );
}
