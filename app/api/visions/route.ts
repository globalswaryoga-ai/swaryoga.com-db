// API endpoint to add sample visions
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || 'add-samples';

    if (action === 'add-samples') {
      const visions = [
        {
          id: `vision-${Date.now()}-1`,
          title: 'Health',
          description: 'Maintain optimal health through yoga, balanced diet, and regular exercise. Build a strong immune system and achieve perfect body weight.',
          category: 'Health',
          imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '06:00',
          place: 'Home / Yoga Studio',
          budget: 5000,
          priority: 'high',
          status: 'In Progress',
          milestones: [],
          goals: [],
          tasks: [],
          todos: [],
          words: [],
          reminders: [],
          progress: 30,
        },
        {
          id: `vision-${Date.now()}-2`,
          title: 'Wealth',
          description: 'Build sustainable income sources and achieve financial independence. Create multiple revenue streams through business and investments.',
          category: 'Wealth',
          imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '09:00',
          place: 'Office',
          budget: 50000,
          priority: 'high',
          status: 'In Progress',
          milestones: [],
          goals: [],
          tasks: [],
          todos: [],
          words: [],
          reminders: [],
          progress: 40,
        },
        {
          id: `vision-${Date.now()}-3`,
          title: 'My Home',
          description: 'Create a beautiful, peaceful home environment that reflects personal style and provides comfort for family. Smart home setup with modern amenities.',
          category: 'Life',
          imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '10:00',
          place: 'Home',
          budget: 100000,
          priority: 'high',
          status: 'In Progress',
          milestones: [],
          goals: [],
          tasks: [],
          todos: [],
          words: [],
          reminders: [],
          progress: 25,
        },
        {
          id: `vision-${Date.now()}-4`,
          title: 'Trip',
          description: 'Plan and execute memorable trips to spiritual places and adventure destinations. Experience diverse cultures and create lifelong memories.',
          category: 'Pleasure',
          imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '08:00',
          place: 'Various Destinations',
          budget: 200000,
          priority: 'medium',
          status: 'Pending',
          milestones: [],
          goals: [],
          tasks: [],
          todos: [],
          words: [],
          reminders: [],
          progress: 15,
        },
      ];

      return NextResponse.json({
        success: true,
        message: '4 visions added successfully',
        visions,
        total: 4,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Visions API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
