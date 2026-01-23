/**
 * Investment Landing Page
 * Choose between Swar Sakshi (proprietorship) or Upamanyu (Pvt. Ltd.)
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ENTITIES, ENTITY_NAMES, ENTITY_DESCRIPTIONS, BUTTON_STYLES } from '@/lib/investment-constants';
import { InvestmentCard } from '@/components/investment/InvestmentCard';
import { InvestmentButton } from '@/components/investment/InvestmentButton';

export default function InvestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Investment Path</h1>
          <p className="text-xl text-gray-600">
            Select which opportunity aligns with your financial goals
          </p>
        </div>

        {/* Investment Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Swar Sakshi Card */}
          <InvestmentCard
            title={ENTITY_NAMES[ENTITIES.SWAR_SAKSHI]}
            className="transform hover:scale-105"
          >
            <div className="space-y-4">
              <p className="text-gray-600">{ENTITY_DESCRIPTIONS[ENTITIES.SWAR_SAKSHI]}</p>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Key Features:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Flexible interest rates
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Simple or compound interest options
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Investment Agreement Certificate
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Direct investment in proprietorship
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <Link href="/invest/swar-sakshi">
                  <InvestmentButton variant="green" size="lg">
                    Start Investment 🚀
                  </InvestmentButton>
                </Link>
              </div>
            </div>
          </InvestmentCard>

          {/* Upamanyu Card */}
          <InvestmentCard
            title={ENTITY_NAMES[ENTITIES.UPAMANYU]}
            className="transform hover:scale-105"
          >
            <div className="space-y-4">
              <p className="text-gray-600">{ENTITY_DESCRIPTIONS[ENTITIES.UPAMANYU]}</p>

              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Key Features:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Equity and Preference shares
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Guaranteed 12% dividend (Preference)
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Share Certificate with company seal
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Capital appreciation potential (Equity)
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <Link href="/invest/upamanyu">
                  <InvestmentButton variant="orange" size="lg">
                    Start Investment 🚀
                  </InvestmentButton>
                </Link>
              </div>
            </div>
          </InvestmentCard>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: 1,
                title: 'Fill Form',
                description: 'Provide your investment details and preferences',
              },
              {
                step: 2,
                title: 'KYC Upload',
                description: 'Submit your Aadhar, PAN, and bank details',
              },
              {
                step: 3,
                title: 'Approval & Payment',
                description: 'Wait for admin approval and complete payment',
              },
              {
                step: 4,
                title: 'Certificate',
                description: 'Receive your investment certificate digitally',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="
                  w-12 h-12 rounded-full bg-blue-600 text-white
                  flex items-center justify-center font-bold text-lg
                  mx-auto mb-4
                "
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                q: 'What is the minimum investment amount?',
                a: 'Minimum investment is ₹10,000 for both entities.',
              },
              {
                q: 'How long does the approval process take?',
                a: 'Typically 3-5 business days after KYC verification.',
              },
              {
                q: 'Can I withdraw my investment early?',
                a: 'Early withdrawal is allowed with a 10% penalty on returns.',
              },
              {
                q: 'How will I receive my certificate?',
                a: 'Digital certificates are issued via email and accessible in your dashboard.',
              },
            ].map((item, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-4">
                <p className="font-semibold text-gray-800 mb-2">Q: {item.q}</p>
                <p className="text-gray-600 ml-4">A: {item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
