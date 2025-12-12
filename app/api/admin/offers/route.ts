import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Offer } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Create a new offer (POST)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a Bearer token (JWT from user login with admin email)
    let isValidAdmin = false;
    
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      // Allow if it's a JWT token with admin@swaryoga.com email
      if (payload && payload.email === 'admin@swaryoga.com') {
        isValidAdmin = true;
      }
    }

    // Also allow admin panel tokens (admin_xxxxx format)
    if (!isValidAdmin && authHeader.startsWith('admin_')) {
      isValidAdmin = true;
    }

    if (!isValidAdmin) {
      return NextResponse.json({ error: 'Only admin can create offers' }, { status: 403 });
    }

    const {
      title,
      description,
      discountPercentage,
      offerCode,
      validFrom,
      validUntil,
      targetUsers,
      selectedUserEmails,
    } = await request.json();

    // Validate required fields
    if (!title || !description || discountPercentage === undefined || !offerCode || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if offer code already exists
    const existingOffer = await Offer.findOne({ offerCode });
    if (existingOffer) {
      return NextResponse.json(
        { error: 'Offer code already exists' },
        { status: 400 }
      );
    }

    // Validate dates
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);
    if (fromDate >= untilDate) {
      return NextResponse.json(
        { error: 'Valid until date must be after valid from date' },
        { status: 400 }
      );
    }

    // Validate discount percentage
    if (discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json(
        { error: 'Discount percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Create new offer
    const newOffer = new Offer({
      title,
      description,
      discountPercentage,
      offerCode: offerCode.toUpperCase(),
      validFrom: fromDate,
      validUntil: untilDate,
      targetUsers: targetUsers || 'all',
      selectedUserEmails: selectedUserEmails || [],
      isActive: true,
      createdBy: 'admin@swaryoga.com', // Always admin email
    });

    await newOffer.save();

    return NextResponse.json(
      {
        message: 'Offer created successfully',
        data: newOffer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}

// Get all offers (GET)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a Bearer token (JWT from user login with admin email)
    let isValidAdmin = false;
    
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      // Allow if it's a JWT token with admin@swaryoga.com email
      if (payload && payload.email === 'admin@swaryoga.com') {
        isValidAdmin = true;
      }
    }

    // Also allow admin panel tokens (admin_xxxxx format)
    if (!isValidAdmin && authHeader.startsWith('admin_')) {
      isValidAdmin = true;
    }

    if (!isValidAdmin) {
      return NextResponse.json({ error: 'Only admin can view offers' }, { status: 403 });
    }

    // Get all offers sorted by creation date
    const offers = await Offer.find({}).sort({ createdAt: -1 });

    return NextResponse.json(offers, { status: 200 });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// Update an offer (PUT)
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a Bearer token (JWT from user login with admin email)
    let isValidAdmin = false;
    
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      // Allow if it's a JWT token with admin@swaryoga.com email
      if (payload && payload.email === 'admin@swaryoga.com') {
        isValidAdmin = true;
      }
    }

    // Also allow admin panel tokens (admin_xxxxx format)
    if (!isValidAdmin && authHeader.startsWith('admin_')) {
      isValidAdmin = true;
    }

    if (!isValidAdmin) {
      return NextResponse.json({ error: 'Only admin can update offers' }, { status: 403 });
    }

    const { offerId, ...updateData } = await request.json();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Check if offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Validate dates if provided
    if (updateData.validFrom || updateData.validUntil) {
      const fromDate = new Date(updateData.validFrom || offer.validFrom);
      const untilDate = new Date(updateData.validUntil || offer.validUntil);
      if (fromDate >= untilDate) {
        return NextResponse.json(
          { error: 'Valid until date must be after valid from date' },
          { status: 400 }
        );
      }
    }

    // Update offer
    const updatedOffer = await Offer.findByIdAndUpdate(offerId, updateData, { new: true });

    return NextResponse.json(
      {
        message: 'Offer updated successfully',
        data: updatedOffer,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    );
  }
}

// Delete an offer (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Verify admin token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a Bearer token (JWT from user login with admin email)
    let isValidAdmin = false;
    
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      // Allow if it's a JWT token with admin@swaryoga.com email
      if (payload && payload.email === 'admin@swaryoga.com') {
        isValidAdmin = true;
      }
    }

    // Also allow admin panel tokens (admin_xxxxx format)
    if (!isValidAdmin && authHeader.startsWith('admin_')) {
      isValidAdmin = true;
    }

    if (!isValidAdmin) {
      return NextResponse.json({ error: 'Only admin can delete offers' }, { status: 403 });
    }

    const { offerId } = await request.json();

    if (!offerId) {
      return NextResponse.json(
        { error: 'Offer ID is required' },
        { status: 400 }
      );
    }

    // Check if offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Delete offer
    await Offer.findByIdAndDelete(offerId);

    return NextResponse.json(
      { message: 'Offer deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    );
  }
}
