import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Treatment } from '@/lib/models/resort';

const defaultTreatments = [
  {
    name: 'Massage Therapy',
    description: 'Traditional Ayurvedic massage with herbal oils to relieve stress and improve circulation',
    price: 1500,
    duration: 60,
    benefits: ['Stress relief', 'Improved circulation', 'Muscle relaxation', 'Better sleep'],
  },
  {
    name: 'Stambath (Steam Bath)',
    description: 'Therapeutic steam bath with herbal decoctions to open pores and detoxify',
    price: 800,
    duration: 30,
    benefits: ['Detoxification', 'Skin health', 'Joint relief', 'Improved circulation'],
  },
  {
    name: 'Mud Bath',
    description: 'Natural mud bath treatment to cool the body and treat skin conditions',
    price: 1000,
    duration: 45,
    benefits: ['Cooling effect', 'Skin healing', 'Detoxification', 'Joint relief'],
  },
  {
    name: 'Shirodhara',
    description: 'Continuous flow of warm oil on forehead for deep relaxation and mental clarity',
    price: 2000,
    duration: 60,
    benefits: ['Mental clarity', 'Stress relief', 'Better sleep', 'Headache relief'],
  },
  {
    name: 'Shank Prakshalana (Colon Cleanse)',
    description: 'Traditional cleansing technique to purify the digestive system',
    price: 1200,
    duration: 45,
    benefits: ['Digestive health', 'Detoxification', 'Energy boost', 'Gut healing'],
  },
  {
    name: 'Vaman (Therapeutic Vomiting)',
    description: 'Panchakarma therapy to eliminate toxins from the respiratory system',
    price: 1500,
    duration: 45,
    benefits: ['Respiratory health', 'Detoxification', 'Allergy relief', 'Toxin removal'],
  },
  {
    name: 'Neti (Nasal Cleanse)',
    description: 'Nasal cleansing technique with warm salt water solution',
    price: 500,
    duration: 20,
    benefits: ['Clear sinuses', 'Better breathing', 'Allergy relief', 'Mental clarity'],
  },
  {
    name: 'Kati Basti (Back Treatment)',
    description: 'Localized oil treatment for lower back pain and stiffness',
    price: 1000,
    duration: 45,
    benefits: ['Back pain relief', 'Improved flexibility', 'Better posture', 'Muscle strength'],
  },
  {
    name: 'Janu Basti (Knee Treatment)',
    description: 'Therapeutic treatment for knee joints and related issues',
    price: 1000,
    duration: 45,
    benefits: ['Knee pain relief', 'Joint mobility', 'Arthritis relief', 'Better movement'],
  },
  {
    name: 'Udar Basti (Abdominal Treatment)',
    description: 'Oil treatment for abdominal area to improve digestion and reduce inflammation',
    price: 1000,
    duration: 45,
    benefits: ['Digestive health', 'Abdominal strength', 'Inflammation relief', 'Better metabolism'],
  },
  {
    name: 'Netra Anjan (Eye Treatment)',
    description: 'Therapeutic eye treatment with herbal preparations',
    price: 800,
    duration: 30,
    benefits: ['Better vision', 'Eye strain relief', 'Eye health', 'Computer vision care'],
  },
  {
    name: 'Ear Cleaning & Oil',
    description: 'Gentle ear cleaning and herbal oil application for ear health',
    price: 600,
    duration: 30,
    benefits: ['Ear health', 'Improved hearing', 'Ear wax removal', 'Relaxation'],
  },
  {
    name: 'Foot Massage',
    description: 'Reflexology foot massage to stimulate pressure points throughout the body',
    price: 1200,
    duration: 45,
    benefits: ['Better circulation', 'Pain relief', 'Relaxation', 'Whole body healing'],
  },
  {
    name: 'Mehndi (Ladies Only)',
    description: 'Traditional henna application with medicinal benefits',
    price: 1500,
    duration: 90,
    benefits: ['Cooling effect', 'Beautiful design', 'Medicinal properties', 'Cultural experience'],
  },
  {
    name: 'Yogasana',
    description: 'Guided yoga posture sessions with individual attention',
    price: 700,
    duration: 60,
    benefits: ['Flexibility', 'Strength', 'Mental peace', 'Overall wellness'],
  },
  {
    name: 'Pranayama',
    description: 'Breathing exercises to control prana and improve mental focus',
    price: 700,
    duration: 45,
    benefits: ['Better breathing', 'Mental clarity', 'Stress relief', 'Emotional balance'],
  },
];

export async function GET() {
  try {
    await connectDB();

    // Check if treatments exist
    let treatments = await Treatment.find({});

    // If no treatments exist, seed them
    if (treatments.length === 0) {
      await Treatment.insertMany(defaultTreatments);
      treatments = await Treatment.find({});
    }

    return NextResponse.json(
      {
        success: true,
        data: treatments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch treatments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treatments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const treatment = new Treatment(body);
    await treatment.save();

    return NextResponse.json(
      {
        success: true,
        data: treatment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create treatment error:', error);
    return NextResponse.json(
      { error: 'Failed to create treatment' },
      { status: 500 }
    );
  }
}
