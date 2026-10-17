import React from 'react';
import { CeylonBrandingPanel } from '../components/CeylonBrandingPanel';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <main className="min-h-screen bg-[#F8F5ED]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
        {/* Left Ceylon Branding Panel (7 cols on lg) */}
        <section className="lg:col-span-7">
          <CeylonBrandingPanel />
        </section>

        {/* Right Authentication Panel (5 cols on lg) */}
        <section className="flex items-center justify-center p-6 sm:p-12 lg:col-span-5 bg-[#F8F5ED]">
          <LoginForm />
        </section>
      </div>
    </main>
  );
};
export default LoginPage;
