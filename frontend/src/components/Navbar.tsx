import { useState, useEffect } from 'react';
import { Menu, X, Leaf } from 'lucide-react';

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-forest-900/95 backdrop-blur-md shadow-xl shadow-black/20 border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-18 py-4">
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); handleNav('#home'); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-forest-700 flex items-center justify-center shadow-forest group-hover:shadow-glow-green transition-shadow duration-300">
            <Leaf className="w-5 h-5 text-white" strokeWidth={1.8} />
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-display font-semibold text-lg leading-tight tracking-wide">
              CeylonAI
            </p>
            <p className="text-emerald-400 text-[10px] font-medium tracking-widest uppercase leading-tight">
              Tea Export Intelligence
            </p>
          </div>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.label}>
              <button
                onClick={() => handleNav(link.href)}
                className="px-3.5 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/8 rounded-lg transition-all duration-200 relative group"
              >
                {link.label}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-gold-400 rounded-full group-hover:w-4/5 transition-all duration-300" />
              </button>
            </li>
          ))}
        </ul>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('#contact')}
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-700 text-white text-sm font-semibold shadow-forest hover:shadow-glow-green hover:from-emerald-500 hover:to-forest-600 active:scale-95 transition-all duration-200"
          >
            Get Started
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        } bg-forest-950/97 backdrop-blur-md border-t border-white/5`}
      >
        <ul className="px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <li key={link.label}>
              <button
                onClick={() => handleNav(link.href)}
                className="w-full text-left px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/8 text-sm font-medium transition-colors"
              >
                {link.label}
              </button>
            </li>
          ))}
          <li className="pt-2">
            <button
              onClick={() => handleNav('#contact')}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-700 text-white text-sm font-semibold transition-all hover:from-emerald-500 hover:to-forest-600"
            >
              Get Started
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
}
