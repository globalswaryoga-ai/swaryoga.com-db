import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Recipe } from '@/lib/ritucharya/recipeSchema';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const published = searchParams.get('published') === 'true';

    let query: any = {};
    if (category) query.category = category;
    if (published) query.isPublished = true;

    const recipes = await Recipe.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, recipes });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const data = await request.json();

    const recipe = new Recipe({
      ...data,
      createdBy: data.userId || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await recipe.save();

    return NextResponse.json(
      { success: true, message: 'Recipe created successfully', recipe },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
