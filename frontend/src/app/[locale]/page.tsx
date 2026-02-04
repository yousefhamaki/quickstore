'use client';

import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck, Zap, Globe, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-40 pb-20 md:pb-32 overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-shadow">
            <Sparkles className="w-4 h-4 inline mr-2" />
            {t('hero.badge')}
          </Badge>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-gray-900 mb-6 leading-[1.1]">
            {t('hero.title')}{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
              {t('hero.titleHighlight')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 md:mb-12 font-medium leading-relaxed">
            {t('hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <NavLink href="/auth/register">
              <Button
                size="lg"
                className="h-14 md:h-16 px-8 md:px-12 text-lg md:text-xl rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-2xl shadow-blue-300 hover:shadow-blue-400 font-bold transition-all duration-300 hover:scale-105"
              >
                {t('hero.ctaPrimary')} <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </NavLink>
            <Button
              variant="outline"
              size="lg"
              className="h-14 md:h-16 px-8 md:px-12 text-lg md:text-xl rounded-full font-bold border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 transition-all duration-300"
            >
              {t('hero.ctaSecondary')}
            </Button>
          </div>

          {/* Floating Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <FeaturePill icon={<Zap className="w-4 h-4" />} text="2-Minute Setup" color="yellow" />
            <FeaturePill icon={<ShieldCheck className="w-4 h-4" />} text="Secure Payments" color="green" />
            <FeaturePill icon={<Globe className="w-4 h-4" />} text="Custom Domains" color="blue" />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 md:py-20 border-y border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest mb-8 md:mb-12">
            {t('social.trusted')}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-500">
            <MerchantLogo name="CLOTHING CO" />
            <MerchantLogo name="TECH HUB" />
            <MerchantLogo name="VIBE STORE" />
            <MerchantLogo name="EGY SHOP" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 mb-4 md:mb-6">
              {t('features.title')}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 font-medium max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 mb-16">
            <FeatureCard
              icon={<Zap className="h-12 w-12" />}
              title={t('features.instantSetup.title')}
              description={t('features.instantSetup.description')}
              color="yellow"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-12 w-12" />}
              title={t('features.securePayments.title')}
              description={t('features.securePayments.description')}
              color="green"
            />
            <FeatureCard
              icon={<Globe className="h-12 w-12" />}
              title={t('features.customDomains.title')}
              description={t('features.customDomains.description')}
              color="blue"
            />
          </div>

          {/* Explore All Features Button */}
          <div className="text-center">
            <NavLink href="/features">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 md:px-10 font-bold border-2 border-gray-300 hover:border-purple-600 hover:bg-purple-50 hover:text-purple-700 transition-all duration-300"
              >
                {t('features.exploreAll')} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </NavLink>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6">
            Ready to Start Selling?
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-10 font-medium">
            Join hundreds of successful merchants in Egypt today.
          </p>
          <NavLink href="/auth/register">
            <Button
              size="lg"
              className="h-16 px-12 text-xl rounded-full bg-white text-blue-600 hover:bg-gray-100 shadow-2xl font-bold transition-all duration-300 hover:scale-105"
            >
              {tNav('getStarted')} <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </NavLink>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Feature Pill Component
function FeaturePill({ icon, text, color }: { icon: React.ReactNode; text: string; color: 'yellow' | 'green' | 'blue' }) {
  const colorClasses = {
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${colorClasses[color]} font-bold text-sm`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

// Merchant Logo Component
function MerchantLogo({ name }: { name: string }) {
  return (
    <div className="text-2xl md:text-3xl font-black italic text-gray-400 hover:text-gray-900 transition-colors duration-300 cursor-default">
      {name}
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
  color
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'yellow' | 'green' | 'blue';
}) {
  const colorClasses = {
    yellow: {
      iconBg: 'bg-yellow-50 group-hover:bg-yellow-100',
      iconText: 'text-yellow-500',
      border: 'hover:border-yellow-500',
      shadow: 'hover:shadow-yellow-100',
    },
    green: {
      iconBg: 'bg-green-50 group-hover:bg-green-100',
      iconText: 'text-green-500',
      border: 'hover:border-green-500',
      shadow: 'hover:shadow-green-100',
    },
    blue: {
      iconBg: 'bg-blue-50 group-hover:bg-blue-100',
      iconText: 'text-blue-500',
      border: 'hover:border-blue-500',
      shadow: 'hover:shadow-blue-100',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`group p-8 md:p-10 rounded-3xl bg-white border-2 border-gray-100 ${colors.border} hover:shadow-2xl ${colors.shadow} transition-all duration-300 hover:-translate-y-2`}>
      <div className={`mb-6 ${colors.iconBg} w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300`}>
        <div className={colors.iconText}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">
        {title}
      </h3>
      <p className="text-gray-600 font-medium leading-relaxed text-base md:text-lg">
        {description}
      </p>
    </div>
  );
}

