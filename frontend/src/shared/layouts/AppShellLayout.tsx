import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  FileSpreadsheet,
  BarChart3,
  Sliders,
  History,
  Database,
  Layers,
  LogOut,
  Leaf,
  Bell,
  Menu,
  X,
  Shield,
  Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AppShellLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Optimization Workspace', to: '/m4/workspace', icon: Cpu },
    { label: 'Export Scenarios', to: '/m4/scenarios', icon: FileSpreadsheet },
    { label: 'Optimization Results', to: '/m4/results', icon: BarChart3 },
    { label: 'Sensitivity Analysis', to: '/m4/sensitivity', icon: Sliders },
    { label: 'Backtesting & Evaluation', to: '/m4/backtesting', icon: History },
    { label: 'Dataset Management', to: '/m4/datasets', icon: Database },
    { label: 'Model Management', to: '/m4/models', icon: Layers },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8F5ED]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col justify-between border-r border-[#E8F0E5] bg-[#123D2B] text-white lg:flex">
        <div>
          {/* Logo & Product Heading */}
          <div className="border-b border-[#286B45]/50 p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C6A15B] to-[#997939] shadow-md shadow-black/20">
                <Leaf className="h-6 w-6 text-[#123D2B]" />
              </div>
              <div>
                <h1 className="font-serif-ceylon text-lg font-bold tracking-wide text-[#F8F5ED]">
                  CEYLON INTELLIGENCE
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-[#C6A15B]">
                  M4 Optimization Engine
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 p-4">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#C6A15B]">
              Prescriptive Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-[#286B45] text-white shadow-sm border-l-4 border-[#C6A15B]'
                        : 'text-[#E8F0E5] hover:bg-[#1a4a34] hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#C6A15B]" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-[#286B45]/50 p-4">
          <div className="mb-3 rounded-xl bg-[#1a4a34] p-3">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3D8B62] font-semibold text-white">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="truncate text-xs font-semibold text-[#F8F5ED]">{user?.name}</div>
                <div className="flex items-center space-x-1 text-[11px] text-[#C6A15B]">
                  <Shield className="h-3 w-3" />
                  <span>{user?.role}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-2 rounded-xl border border-red-500/30 bg-red-950/20 py-2 text-xs font-medium text-red-200 transition hover:bg-red-900/40"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E8F0E5] bg-white/95 px-6 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-[#202922] hover:bg-[#F8F5ED] lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2 text-xs text-[#778278]">
                <span>Sri Lanka Tea Export DSS</span>
                <span>/</span>
                <span className="font-semibold text-[#123D2B]">M4 Prescriptive Engine</span>
              </div>
            </div>
          </div>

          {/* Right Status Indicators */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 rounded-full border border-[#E8F0E5] bg-[#F8F5ED] px-3 py-1 text-xs text-[#202922]">
              <span className="font-medium text-[#778278]">Dataset:</span>
              <span className="font-semibold text-[#286B45]">M4-DS-v1.0 (Active)</span>
            </div>

            <div className="flex items-center space-x-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
              <Activity className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              <span className="font-medium">PuLP MILP Solver Ready</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-full p-2 text-[#778278] hover:bg-[#F8F5ED]"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#C6A15B]" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-4 shadow-xl z-30">
                  <h4 className="text-xs font-bold text-[#123D2B]">System Notifications</h4>
                  <p className="mt-2 text-xs text-[#778278]">
                    Dataset M4-DS-v1.0 active with 5 export destinations and 3 Ceylon Tea grades.
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-[#E8F0E5] bg-[#123D2B] p-4 text-white lg:hidden">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 rounded-lg px-3 py-2 text-xs font-medium text-[#E8F0E5] hover:bg-[#286B45]"
                >
                  <item.icon className="h-4 w-4 text-[#C6A15B]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
