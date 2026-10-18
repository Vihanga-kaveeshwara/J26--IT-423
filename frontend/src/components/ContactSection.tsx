import { useEffect, useRef, useState } from 'react';
import { Mail, MapPin, Send, GraduationCap } from 'lucide-react';

export function ContactSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="relative py-24 lg:py-32 bg-gradient-to-b from-forest-900 to-forest-950 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="text-center mb-16 animate-on-scroll"
          ref={(el) => {
            if (!el) return;
            const io = new IntersectionObserver(
              ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); io.disconnect(); } },
              { threshold: 0.2 }
            );
            io.observe(el);
          }}
        >
          <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Get in Touch
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Contact the{' '}
            <span className="gradient-text-green">Research Team</span>
          </h2>
          <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">
            Interested in our research or platform? Reach out and we will be happy to connect.
          </p>
        </div>

        {/* Two column */}
        <div ref={ref} className="animate-on-scroll grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Info cards */}
          <div className="space-y-5">
            {[
              {
                icon: <GraduationCap className="w-5 h-5" />,
                label: 'Research Project',
                value: 'AI-Based Decision Support System for Sri Lankan Tea Export Operations',
                sub: 'Final-Year IT Research Project — 2025/2026',
              },
              {
                icon: <MapPin className="w-5 h-5" />,
                label: 'Institution',
                value: 'Sri Lanka Institute of Information Technology (SLIIT)',
                sub: 'Faculty of Computing, Department of Information Technology',
              },
              {
                icon: <Mail className="w-5 h-5" />,
                label: 'Project Group',
                value: 'Group J26 – IT 423',
                sub: 'Undergraduate Research Project',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex gap-4 p-5 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/7 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-0.5">{item.label}</p>
                  <p className="text-white text-sm font-medium leading-snug">{item.value}</p>
                  <p className="text-white/50 text-xs mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <div className="rounded-3xl bg-white/4 border border-white/8 p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <Send className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-white font-display font-semibold text-xl mb-2">Message Sent!</h3>
                <p className="text-white/60 text-sm">
                  Thank you for reaching out. The research team will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-white/60 text-xs font-semibold tracking-wider uppercase mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/12 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs font-semibold tracking-wider uppercase mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/12 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-semibold tracking-wider uppercase mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Research inquiry, collaboration…"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/12 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-semibold tracking-wider uppercase mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us about your interest in the project…"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/12 text-white placeholder-white/30 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full shimmer-hover inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-700 text-white font-semibold text-sm shadow-forest hover:shadow-glow-green hover:from-emerald-500 hover:to-forest-600 active:scale-95 transition-all duration-300"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
