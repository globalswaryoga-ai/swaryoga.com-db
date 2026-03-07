'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface ScheduleData {
  id: string;
  workshopTitle: string;
  workshopSlug: string;
  startDate: string;
  endDate: string;
  batch: string;
  time: string;
  priceNPR: number;
  nepalQrCode: string;
}

function PayNepalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scheduleId = searchParams.get('scheduleId');
  const workshopSlug = searchParams.get('workshopSlug');

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!scheduleId || !workshopSlug) {
      setError('Missing schedule information');
      setLoading(false);
      return;
    }

    const fetchSchedule = async () => {
      try {
        const res = await fetch(`/api/workshops/schedules?slug=${workshopSlug}`);
        if (!res.ok) throw new Error('Failed to fetch schedule');
        const data = await res.json();
        
        const found = data.schedules?.find((s: ScheduleData) => s.id === scheduleId);
        if (!found) {
          setError('Schedule not found');
          return;
        }
        
        if (!found.nepalQrCode) {
          setError('Nepal payment is not available for this workshop');
          return;
        }
        
        setSchedule({
          ...found,
          workshopTitle: data.workshopTitle || workshopSlug,
        });
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to load payment details');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [scheduleId, workshopSlug]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const generateWhatsAppLink = () => {
    const message = encodeURIComponent(
      `Hi, I have paid NPR ${schedule?.priceNPR || ''} for the ${schedule?.workshopTitle || 'workshop'}.\n\n` +
      `Schedule: ${schedule?.batch} batch (${schedule?.time})\n` +
      `Dates: ${schedule ? formatDate(schedule.startDate) : ''} - ${schedule ? formatDate(schedule.endDate) : ''}\n\n` +
      `Name: ${name}\n` +
      `Phone: ${phone}\n\n` +
      `Please confirm my registration.`
    );
    return `https://wa.me/917979108108?text=${message}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <Link
            href="/workshops"
            className="mt-4 inline-block rounded-lg bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
          >
            Back to Workshops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white py-8">
      <div className="mx-auto max-w-md px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <Link href="/workshops" className="mb-4 inline-flex items-center text-sm text-purple-600 hover:text-purple-700">
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Workshops
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Nepal Payment</h1>
          <p className="mt-1 text-gray-600">Scan QR code to pay</p>
        </div>

        {/* Workshop Details Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900">{schedule?.workshopTitle}</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p><span className="font-medium">Batch:</span> {schedule?.batch}</p>
            <p><span className="font-medium">Time:</span> {schedule?.time}</p>
            <p><span className="font-medium">Dates:</span> {schedule ? formatDate(schedule.startDate) : ''} - {schedule ? formatDate(schedule.endDate) : ''}</p>
          </div>
          <div className="mt-4 rounded-lg bg-purple-50 p-3 text-center">
            <p className="text-sm text-purple-700">Amount to Pay</p>
            <p className="text-2xl font-bold text-purple-900">NPR {schedule?.priceNPR?.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-center text-lg font-semibold text-gray-900">Scan to Pay</h3>
          <div className="flex justify-center">
            {schedule?.nepalQrCode && (
              <img
                src={schedule.nepalQrCode}
                alt="Nepal Payment QR Code"
                className="h-64 w-64 rounded-lg border-2 border-gray-100"
              />
            )}
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            Scan this QR code using your eSewa, Khalti, or bank app to make the payment
          </p>
        </div>

        {/* Confirmation Form */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">After Payment</h3>
          <p className="mb-4 text-sm text-gray-600">
            Fill in your details and click the button below to send payment confirmation via WhatsApp
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-white transition ${
                name && phone 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'cursor-not-allowed bg-gray-400'
              }`}
              onClick={(e) => {
                if (!name || !phone) {
                  e.preventDefault();
                  alert('Please enter your name and phone number');
                }
              }}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Confirm Payment via WhatsApp
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-xl bg-purple-50 p-4">
          <h4 className="font-semibold text-purple-900">Instructions:</h4>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-purple-800">
            <li>Scan the QR code using your payment app</li>
            <li>Pay the exact amount shown above</li>
            <li>Fill in your name and phone number</li>
            <li>Click the WhatsApp button to send confirmation</li>
            <li>Our team will verify and confirm your registration</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function PayNepalPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment page...</p>
        </div>
      </div>
    }>
      <PayNepalContent />
    </Suspense>
  );
}
