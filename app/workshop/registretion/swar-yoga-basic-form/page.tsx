'use client';

import React, { useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import EnquiryFormModal from '@/components/EnquiryFormModal';
import { ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SwarYogaBasicFormPage() {
  const [open, setOpen] = useState(false);
  const month = useMemo(() => {
    // Show current month label, e.g. "Jan 2026"
    const d = new Date();
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, []);

  return (
    <>
      <Navigation />
      <main className="mt-16 sm:mt-20 bg-gray-50">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="p-8 sm:p-12 bg-gradient-to-r from-green-700 to-green-600 text-white">
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">Swar Yoga Basic Workshop – Registration Form</h1>
              <p className="mt-3 text-white/90 text-sm sm:text-base max-w-2xl">
                Fill the form to join the current batch or request details for the next batch. You can pay at the end.
              </p>
            </div>

            <div className="p-8 sm:p-12">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">What you’ll do here</h2>
                  <ul className="mt-4 space-y-2 text-gray-700 text-sm">
                    <li>• Select batch (current / next)</li>
                    <li>• Enter your details</li>
                    <li>• Confirm and pay (Pay Now)</li>
                  </ul>

                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="text-xs font-bold text-green-900 uppercase tracking-wider">Current batch</div>
                    <div className="mt-1 font-extrabold text-green-900">19–20 Jan 2026</div>
                    <div className="text-sm text-green-800">1.5 hours • Online • Fee ₹145</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 hover:bg-green-800 active:scale-[0.99] text-white font-black py-4 text-lg shadow-lg"
                  >
                    Fill the Form
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    Opens the same form used across workshop pages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {open && (
        <EnquiryFormModal
          workshopId="swar-yoga-basic"
          workshopName="Swar Yoga Basic Workshop"
          month={month}
          mode="Online"
          language="Hindi"
          onClose={() => setOpen(false)}
        />
      )}

      <Footer />
    </>
  );
}
