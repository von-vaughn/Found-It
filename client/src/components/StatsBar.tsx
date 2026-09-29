import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, ShieldCheck, Building2 } from 'lucide-react';

export const StatsBar: React.FC = () => {
  const stats = [
    {
      icon: CheckCircle2,
      value: '24,850+',
      label: 'Items Successfully Reunited',
      accent: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Clock,
      value: '< 4.8 Hrs',
      label: 'Average First Match Time',
      accent: 'text-[#E5192D]',
      bg: 'bg-red-50',
    },
    {
      icon: Building2,
      value: '180+',
      label: 'Partner Campuses & Cities',
      accent: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: ShieldCheck,
      value: '99.4%',
      label: 'Verified Claims & Returns',
      accent: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <section className="relative z-20 -mt-8 sm:-mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.07)] border border-neutral-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`flex flex-col items-center text-center px-4 ${idx > 0 && idx % 2 === 0 ? 'pt-6 lg:pt-0' : ''}`}
              >
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.accent} flex items-center justify-center mb-3.5 shadow-sm`}>
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
