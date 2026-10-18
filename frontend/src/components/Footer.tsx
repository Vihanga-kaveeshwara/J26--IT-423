import { Leaf, GitBranch, ExternalLink } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
];

const modules = [
  { label: 'M1 – Demand Forecasting', href: '#features' },
  { label: 'M2 – Refuse Tea Prediction', href: '#features' },
  { label: 'M3 – Explainable AI', href: '#features' },
  { label: 'M4 – Logistics Optimisation', href: '#features' },
];

export function Footer() {
  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-forest-950 border-t border-white/6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-forest-700 flex items-center justify-center shadow-forest">
                <Leaf className="w-5 h-5 text-white" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-white font-display font-semibold text-lg leading-tight">CeylonAI</p>
                <p className="text-emerald-400 text-[10px] tracking-widest uppercase">Tea Export Intelligence</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              An AI-powered decision support platform for Sri Lanka&apos;s tea export industry — research-driven,
              explainable, and actionable.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="GitHub"
              >
                <GitBranch className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Research Paper"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-5">Navigation</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className="text-white/50 hover:text-emerald-400 text-sm transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Research modules */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-5">Research Modules</h4>
            <ul className="space-y-3">
              {modules.map((m) => (
                <li key={m.label}>
                  <button
                    onClick={() => scrollTo(m.href)}
                    className="text-white/50 hover:text-emerald-400 text-sm transition-colors text-left"
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Project info */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-5">Research Project</h4>
            <div className="space-y-3 text-sm text-white/50">
              <p>Group J26 – IT 423</p>
              <p>Final Year Research Project</p>
              <p>Sri Lanka Institute of Information Technology</p>
              <p>Faculty of Computing</p>
              <p>Academic Year 2025 / 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/6 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>
            © {new Date().getFullYear()} CeylonAI — AI-Based Decision Support for Sri Lankan Tea Exports.
            All rights reserved.
          </p>
          <p>Built with React · Tailwind CSS · Lucide Icons</p>
        </div>
      </div>
    </footer>
  );
}
