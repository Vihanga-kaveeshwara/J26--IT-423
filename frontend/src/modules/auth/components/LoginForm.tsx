import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@ceylonintelligence.lk', pass: 'CeylonAdmin2026!', label: 'Admin' },
  { role: 'Export Manager', email: 'export.manager@ceylonintelligence.lk', pass: 'ExportMgr2026!', label: 'Export Mgr' },
  { role: 'Logistics Coordinator', email: 'logistics@ceylonintelligence.lk', pass: 'Logistics2026!', label: 'Logistics' },
  { role: 'Research Analyst', email: 'analyst@ceylonintelligence.lk', pass: 'Analyst2026!', label: 'Analyst' },
];

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('export.manager@ceylonintelligence.lk');
  const [password, setPassword] = useState('ExportMgr2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please provide both your registered email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Invalid credentials or server connection failed.'
          : 'Unable to connect to the authentication service.';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(account.pass);
    setErrorMessage(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full max-w-md rounded-2xl border border-[#E8F0E5] bg-white p-8 shadow-xl shadow-slate-200/50"
    >
      <div className="mb-6">
        <h2 className="font-serif-ceylon text-2xl font-bold text-[#123D2B]">
          Sign in to Ceylon Intelligence
        </h2>
        <p className="mt-1 text-sm text-[#778278]">
          Enter your authorized credentials to access the M4 Optimization Engine.
        </p>
      </div>

      {/* Quick Demo Role Selector */}
      <div className="mb-6 rounded-xl border border-[#C6A15B]/30 bg-[#F8F5ED] p-3">
        <div className="mb-2 flex items-center space-x-1.5 text-xs font-semibold text-[#123D2B]">
          <Sparkles className="h-3.5 w-3.5 text-[#C6A15B]" />
          <span>Quick Demo Roles (Local Development)</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => handleSelectDemo(acc)}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                email === acc.email
                  ? 'bg-[#286B45] text-white shadow-sm'
                  : 'bg-white text-[#202922] hover:bg-[#E8F0E5] border border-gray-200'
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#202922] mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#778278]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. export.manager@ceylonintelligence.lk"
              required
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#202922] transition focus:border-[#286B45] focus:outline-none focus:ring-2 focus:ring-[#286B45]/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#202922] mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#778278]" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-[#202922] transition focus:border-[#286B45] focus:outline-none focus:ring-2 focus:ring-[#286B45]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#778278] hover:text-[#202922]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center space-x-2 text-[#778278]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 text-[#286B45] focus:ring-[#286B45]"
            />
            <span>Remember session</span>
          </label>
          <span className="text-[#286B45] hover:underline cursor-pointer" title="Local Development: Use seed credentials provided above">
            Reset password?
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={isLoading}
          className="relative flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#123D2B] via-[#1e5239] to-[#286B45] py-3 text-sm font-semibold text-white shadow-md shadow-[#123D2B]/20 transition hover:opacity-95 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <span>Sign In to Engine</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-[#778278]">
        <span>Sri Lanka Tea Board Academic Research Platform</span>
      </div>
    </motion.div>
  );
};
