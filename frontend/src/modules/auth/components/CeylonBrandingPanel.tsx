import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Compass, ShieldCheck, TrendingUp } from 'lucide-react';

export const CeylonBrandingPanel: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#123D2B] via-[#1a4a34] to-[#286B45] p-10 text-white lg:min-h-screen">
      {/* Decorative background grid and misty circles */}
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="tea-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#C6A15B" strokeWidth="0.75" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tea-grid)" />
        </svg>
      </div>

      {/* Floating tea leaf particles animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#3D8B62]/30"
            style={{
              top: `${15 + i * 14}%`,
              left: `${10 + (i * 17) % 75}%`,
            }}
            animate={{
              y: [0, -25, 0],
              x: [0, 15, 0],
              rotate: [0, 25, 0],
            }}
            transition={{
              duration: 7 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Leaf size={28 + i * 6} />
          </motion.div>
        ))}
      </div>

      {/* Top Header & Brand */}
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center space-x-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#C6A15B] to-[#997939] shadow-lg shadow-black/20">
            <Leaf className="h-7 w-7 text-[#123D2B]" />
          </div>
          <div>
            <span className="font-serif-ceylon text-2xl font-bold tracking-wider text-[#F8F5ED]">
              CEYLON INTELLIGENCE
            </span>
            <div className="flex items-center space-x-2 text-xs font-medium uppercase tracking-widest text-[#C6A15B]">
              <span>M4 Prescriptive Engine</span>
              <span>•</span>
              <span>Export & Logistics</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Center Hero Content */}
      <div className="relative z-10 my-auto py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#C6A15B]/40 bg-[#123D2B]/60 px-3.5 py-1.5 text-xs font-medium text-[#C6A15B] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#C6A15B] animate-pulse" />
            <span>AI-Driven Sri Lankan Tea Export Support</span>
          </div>

          <h1 className="font-serif-ceylon text-4xl font-extrabold leading-tight text-[#F8F5ED] md:text-5xl lg:text-6xl">
            Transforming Tea <br />
            <span className="bg-gradient-to-r from-[#C6A15B] via-[#f3db9d] to-[#C6A15B] bg-clip-text text-transparent">
              Export Decisions.
            </span>
          </h1>

          <p className="max-w-xl font-sans-ceylon text-base leading-relaxed text-[#E8F0E5]/90 md:text-lg">
            Smarter Decisions. Optimized Exports. Greater Value for Ceylon Tea. Prescriptive mathematical optimization to minimize multi-tier freight, packaging, and supply-chain costs.
          </p>

          {/* Research feature highlights */}
          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="flex items-center space-x-2.5 rounded-lg border border-[#3D8B62]/40 bg-[#123D2B]/40 p-3 backdrop-blur-sm">
              <Compass className="h-5 w-5 text-[#C6A15B]" />
              <span className="text-[#E8F0E5]">Multi-Port Route Optimization</span>
            </div>
            <div className="flex items-center space-x-2.5 rounded-lg border border-[#3D8B62]/40 bg-[#123D2B]/40 p-3 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5 text-[#C6A15B]" />
              <span className="text-[#E8F0E5]">Deterministic MILP Engine</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-[#3D8B62]/30 pt-6 text-xs text-[#E8F0E5]/70">
        <span>AI-Based Decision Support System for Sri Lankan Tea Export Operations</span>
        <span className="flex items-center space-x-1 text-[#C6A15B]">
          <ShieldCheck className="h-4 w-4" />
          <span>Research Release v1.0</span>
        </span>
      </div>
    </div>
  );
};
