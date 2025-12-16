import React from 'react';
import { Heart, Zap, Brain, Lightbulb } from 'lucide-react';

interface BenefitsData {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface BenefitsSectionProps {
  benefits: string[];
}

const benefitIcons = [Heart, Zap, Brain, Lightbulb];

export default function BenefitsSection({ benefits }: BenefitsSectionProps) {
  if (!benefits || benefits.length === 0) {
    return null;
  }

  const benefitsData: BenefitsData[] = benefits.slice(0, 4).map((benefit, idx) => ({
    icon: React.createElement(benefitIcons[idx % benefitIcons.length], {
      className: 'w-8 h-8 text-indigo-600'
    }),
    title: benefit.split(':')[0] || benefit,
    description: benefit.split(':')[1]?.trim() || ''
  }));

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">
          What You Will Experience
        </h2>
        <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Transform your practice with these profound experiential benefits
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefitsData.map((benefit, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
              style={{
                animation: `fadeIn 0.6s ease-out ${idx * 0.1}s both`
              }}
            >
              <div className="mb-4 flex justify-center">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  {benefit.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-3">
                {benefit.title}
              </h3>
              {benefit.description && (
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                  {benefit.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
