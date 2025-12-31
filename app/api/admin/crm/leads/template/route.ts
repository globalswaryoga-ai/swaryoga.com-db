import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET: Download sample Excel template for bulk lead import
 */
export async function GET(request: NextRequest) {
  try {
    // Create sample data with proper column headers
    const sampleData = [
      {
        'Name': 'Rajesh Kumar',
        'Email': 'rajesh@example.com',
        'Phone Number': '+91 98765 43210',
        'Status': 'lead',
        'Source': 'website',
        'Workshop/Program': 'Beginner Yoga',
      },
      {
        'Name': 'Priya Singh',
        'Email': 'priya@example.com',
        'Phone Number': '+91 87654 32109',
        'Status': 'prospect',
        'Source': 'referral',
        'Workshop/Program': 'Advanced Pranayama',
      },
      {
        'Name': 'Amit Patel',
        'Email': 'amit@example.com',
        'Phone Number': '+91 76543 21098',
        'Status': 'customer',
        'Source': 'social',
        'Workshop/Program': 'Meditation Intensive',
      },
      {
        'Name': 'Sneha Desai',
        'Email': 'sneha@example.com',
        'Phone Number': '+91 65432 10987',
        'Status': 'lead',
        'Source': 'event',
        'Workshop/Program': 'Yoga for Wellness',
      },
      {
        'Name': 'Vikram Sharma',
        'Email': 'vikram@example.com',
        'Phone Number': '+91 54321 09876',
        'Status': 'prospect',
        'Source': 'website',
        'Workshop/Program': 'Residential Retreat',
      },
    ];

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Leads');

    // Add another sheet with instructions
    const instructionData = [
      { Field: 'Name', Required: 'Yes', Description: 'Full name of the lead', Example: 'Rajesh Kumar' },
      { Field: 'Email', Required: 'Yes', Description: 'Email address', Example: 'rajesh@example.com' },
      { Field: 'Phone Number', Required: 'Yes', Description: 'Phone number with country code', Example: '+91 98765 43210' },
      { Field: 'Status', Required: 'No', Description: 'lead / prospect / customer / inactive', Example: 'lead' },
      { Field: 'Source', Required: 'No', Description: 'website / referral / social / event / import', Example: 'website' },
      { Field: 'Workshop/Program', Required: 'No', Description: 'Name of workshop or program', Example: 'Beginner Yoga' },
    ];

    const instructionSheet = XLSX.utils.json_to_sheet(instructionData);
    XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Instructions');

    // Convert to buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="leads_template.xlsx"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
