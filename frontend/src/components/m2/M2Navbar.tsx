import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Leaf, PlusCircle, History, ArrowLeft, Menu, X, Activity, CheckCircle2 } from 'lucide-react';

export function M2Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: 'New Prediction', href: '/batches/new', icon: PlusCircle },
    { label: 'Batch History', href: '/batches', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#EBE6DD] shadow-xs">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-18 py-3.5">
        {/* Brand & Breadcrumb */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#123E2A] flex items-center justify-center shadow-xs border border-[#C69A4B]/30 group-hover:bg-[#184832] transition-colors">
              <Leaf className="w-5 h-5 text-[#C69A4B]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[#14261C] font-display font-bold text-lg leading-tight tracking-wide">
                CeylonAI
              </p>
              <p className="text-[#133E2B] text-[10px] font-bold tracking-widest uppercase leading-tight">
                Refuse Tea Operations
              </p>
            </div>
          </Link>

          {/* Breadcrumb matching the executive dashboard */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-[#E2DDD5] text-xs text-[#706B62]">
            <span>Sri Lanka Tea Export DSS</span>
            <span className="text-[#A39B8F]">/</span>
            <span className="font-semibold text-[#182C23]">Operations Engine</span>
          </div>
        </div>

        {/* Desktop Nav & Status Pills */}
        <div className="hidden md:flex items-center gap-3">
          {/* Status Badges matching photo */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center bg-[#EFECE6] border border-[#DDD7CC] p-0.5 rounded-lg text-[11px] font-medium text-[#554C3F]">
              <span className="px-2 py-0.5 text-[#706B62]">USD ($)</span>
              <span className="px-2.5 py-0.5 bg-[#123E2A] text-white rounded-md font-semibold shadow-xs">
                LKR (Rs.)
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-[#EFECE6] border border-[#DDD7CC] text-[11px] font-medium text-[#554C3F]">
              Dataset: <span className="font-semibold text-[#14261C]">Ceylon-AI-v2.0</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EAF6ED] border border-[#CDE8D4] text-[11px] font-semibold text-[#165B34]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#165B34]" />
              <span>XGBoost v1 Ready</span>
            </div>
          </div>

          <div className="h-5 w-px bg-[#E2DDD5] mx-1" />

          {/* Module Navigation links */}
          <div className="flex items-center gap-1.5">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#123E2A] text-white shadow-xs'
                      : 'text-[#554C3F] hover:text-[#14261C] hover:bg-[#EFECE6]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}

            <Link
              to="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#706B62] hover:text-[#14261C] border border-[#DDD7CC] bg-white hover:bg-[#FAF8F5] transition-colors shadow-2xs ml-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-[#554C3F] hover:text-[#14261C] hover:bg-[#EFECE6]"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FAF8F5] border-t border-[#EBE6DD] px-4 py-4 space-y-2 shadow-lg">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-[#EBE6DD] text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-[#EAF6ED] border border-[#CDE8D4] text-[#165B34] font-semibold">
              ✓ XGBoost v1 Ready
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#EFECE6] border border-[#DDD7CC] text-[#554C3F]">
              LKR (Rs.)
            </span>
          </div>

          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive
                    ? 'bg-[#123E2A] text-white shadow-xs'
                    : 'text-[#554C3F] hover:text-[#14261C] hover:bg-[#EFECE6]'
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
            className="flex items-center gap-2 px-4 py-2 text-xs text-[#706B62] hover:text-[#14261C] pt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      )}
    </header>
  );
}
