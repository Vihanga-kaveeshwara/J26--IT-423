/**
 * M1 Demand Forecasting Navigation Bar
 * frontend/src/components/m1/M1Navbar.tsx
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, TrendingUp, Activity, ArrowLeft, Menu, X, BarChart3 } from 'lucide-react';

export function M1Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: 'Demand Forecast', href: '/demand-forecast', icon: TrendingUp },
    { label: 'System Health', href: '/health', icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 bg-forest-900/95 backdrop-blur-md border-b border-white/10 shadow-xl shadow-black/20">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-18 py-3.5">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-forest-700 flex items-center justify-center shadow-forest group-hover:shadow-glow-green transition-shadow duration-300">
              <Leaf className="w-5 h-5 text-white" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-white font-display font-semibold text-lg leading-tight tracking-wide">
                CeylonAI
              </p>
              <p className="text-emerald-400 text-[10px] font-medium tracking-widest uppercase leading-tight">
                M1 Demand Intelligence
              </p>
            </div>
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="h-5 w-px bg-white/15 mx-2" />

          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-forest-950/98 border-t border-white/10 px-4 py-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      )}
    </header>
  );
}
