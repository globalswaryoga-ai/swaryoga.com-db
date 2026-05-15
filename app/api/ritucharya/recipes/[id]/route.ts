import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Recipe } from '@/lib/ritucharya/recipeSchema';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const recipe = await Recipe.findById(params.id);

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, recipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const data = await request.json();

    const recipe = await Recipe.findByIdAndUpdate(
      params.id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Recipe updated', recipe });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const recipe = await Recipe.findByIdAndDelete(params.id);

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
