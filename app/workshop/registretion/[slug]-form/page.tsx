'use client';

import React, { useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import EnquiryFormModal from '@/components/EnquiryFormModal';
import { ArrowRight } from 'lucide-react';
import { findWorkshopBySlug } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

export default function WorkshopFormPage({ params }: { params: { slug: string } }) {
  const workshop = findWorkshopBySlug(params.slug);
  if (!workshop) notFound();

  const [open, setOpen] = useState(false);
  const month = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }, []);

  // Same tab Pay Now: we route to the existing registration flow.
  // This keeps PayU behavior consistent with the rest of the site.
  const payNowHref = useMemo(() => {
    const slug = encodeURIComponent(params.slug);
    return `/registration/online/hindi/${slug}`;
  }, [params.slug]);

  return (
    <>
      <Navigation />
      <main className="mt-16 sm:mt-20 bg-gray-50">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
            <div className="p-8 sm:p-12 bg-gradient-to-r from-green-700 to-green-600 text-white">
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">{workshop.name} – Form</h1>
              <p className="mt-3 text-white/90 text-sm sm:text-base max-w-2xl">
                Fill the form and get your Lead ID. You can pay after submitting.
              </p>
            </div>

            <div className="p-8 sm:p-12">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">What happens next</h2>
                  <ul className="mt-4 space-y-2 text-gray-700 text-sm">
                    <li>• Submit your details</li>
                    <li>• We create your Lead ID (6-digit)</li>
                    <li>• Pay Now to confirm (optional)</li>
                  </ul>
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
                    Form submits directly to CRM Leads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {open && (
        <EnquiryFormModal
          workshopId={params.slug}
          workshopName={workshop.name}
          month={month}
          mode="Online"
          language="Hindi"
          payNowHref={payNowHref}
          onClose={() => setOpen(false)}
        />
      )}

      <Footer />
    </>
  );
}
