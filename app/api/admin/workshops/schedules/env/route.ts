// Schedules API - Reads/writes to .env.workshop file
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { WorkshopSchedule } from '@/lib/workshopDatabase';
import { isAdminAuthorized } from '@/lib/adminAuth';

const ENV_WORKSHOP_PATH = join(process.cwd(), '.env.workshop');

function readSchedulesFromFile(): WorkshopSchedule[] {
  try {
    const content = readFileSync(ENV_WORKSHOP_PATH, 'utf-8');
    const schedules: WorkshopSchedule[] = [];
    const lines = content.split('\n');

    let currentWorkshop = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        // Extract workshop ID from headers
        if (line.includes('SWAR YOGA BASIC')) currentWorkshop = 'swar-yoga-basic';
        else if (line.includes('SWAR YOGA LEVEL-1')) currentWorkshop = 'swar-yoga-level-1';
        else if (line.includes('SWAR YOGA YOUTH')) currentWorkshop = 'swar-yoga-youth';
        else if (line.includes('WEIGHT LOSS')) currentWorkshop = 'weight-loss';
        else if (line.includes('MEDITATION')) currentWorkshop = 'meditation';
        else if (line.includes('AMRUT AAHAR')) currentWorkshop = 'amrut-aahar';
        else if (line.includes('SWAR YOGA LEVEL-2')) currentWorkshop = 'swar-yoga-level-2';
        else if (line.includes('ASTAVAKRA')) currentWorkshop = 'astavakra';
        else if (line.includes('PRE PREGNANCY')) currentWorkshop = 'pre-pregnancy';
        else if (line.includes('SWAR YOGA CHILDREN')) currentWorkshop = 'swy-children';
        else if (line.includes('COMPLETE HEALTH')) currentWorkshop = 'complete-health';
        else if (line.includes('BUSINESS')) currentWorkshop = 'business-swy';
        else if (line.includes('CORPORATE')) currentWorkshop = 'corporate-swy';
        else if (line.includes('SELF AWARENESS')) currentWorkshop = 'self-awareness';
        else if (line.includes('HAPPY MARRIED')) currentWorkshop = 'happy-marriage';
        else if (line.includes('GURUKUL')) currentWorkshop = 'gurukul-training';
        else if (line.includes('TEACHER TRAINING') && !currentWorkshop.includes('gurukul')) currentWorkshop = 'swy-teacher';
        else if (line.includes('NATUROPATHY')) currentWorkshop = 'naturopathy';
        continue;
      }

      if (!line.trim() || !line.includes('=')) continue;

      const [key, value] = line.split('=');
      if (!key || !value) continue;

      const parts = value.split('|');
      if (parts.length < 8) continue;

      const [startDate, endDate, days, time, slots, closeDate, mode, location] = parts;

      schedules.push({
        id: key.trim(), // Use the env key as ID
        workshop_id: currentWorkshop,
        workshop_name: currentWorkshop.replace(/-/g, ' ').toUpperCase(),
        mode: mode.trim().toLowerCase() as any,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        days: days.trim(),
        time: time.trim(),
        slots: parseInt(slots) || 0,
        registration_close_date: closeDate.trim(),
        location: location.trim(),
      });
    }

    return schedules;
  } catch (err) {
    console.error('Error reading schedules file:', err);
    return [];
  }
}

function writeSchedulesToFile(schedules: WorkshopSchedule[]): string | null {
  try {
    const content = readFileSync(ENV_WORKSHOP_PATH, 'utf-8');
    const lines = content.split('\n');
    let result = content;

    // For each schedule, update or add the line
    for (const schedule of schedules) {
      const lineValue = `${schedule.start_date}|${schedule.end_date}|${schedule.days}|${schedule.time}|${schedule.slots}|${schedule.registration_close_date}|${schedule.mode}|${schedule.location}`;
      const newLine = `${schedule.id}=${lineValue}`;

      // Find existing line and replace, or add new
      const lineIndex = lines.findIndex(l => l.startsWith(schedule.id + '='));
      if (lineIndex >= 0) {
        lines[lineIndex] = newLine;
      } else {
        // Add near appropriate workshop section
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].includes(schedule.workshop_name.toUpperCase())) {
            lines.splice(i + 1, 0, newLine);
            break;
          }
        }
      }
    }

    result = lines.join('\n');
    writeFileSync(ENV_WORKSHOP_PATH, result, 'utf-8');
    return null;
  } catch (err) {
    return String(err);
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = readSchedulesFromFile();
    return NextResponse.json({ data: schedules });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = (await request.json()) as WorkshopSchedule;
    const schedules = readSchedulesFromFile();

    // Add new schedule
    schedules.push(schedule);

    const error = writeSchedulesToFile(schedules);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updates } = (await request.json()) as WorkshopSchedule & { id: string };
    const schedules = readSchedulesFromFile();

    // Find and update
    const index = schedules.findIndex(s => s.id === id);
    if (index < 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    schedules[index] = { ...schedules[index], ...updates };

    const error = writeSchedulesToFile(schedules);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data: schedules[index] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const schedules = readSchedulesFromFile().filter(s => s.id !== id);

    const error = writeSchedulesToFile(schedules);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
