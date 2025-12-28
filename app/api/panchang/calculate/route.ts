import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Panchang Calculation API
 * Uses Python Skyfield library for accurate astronomical calculations
 * Calls panchang_service.py for precise ephemeris-based panchang data
 */

export async function POST(request: NextRequest) {
  try {
    const { date, latitude, longitude, timezone, locationName } = await request.json();

    if (!date || latitude === undefined || longitude === undefined || timezone === undefined) {
      return NextResponse.json(
        { error: 'date, latitude, longitude, and timezone are required' },
        { status: 400 }
      );
    }

    // Call Python service for panchang calculation
    const panchangData = await callPythonService({
      date,
      latitude,
      longitude,
      timezone,
    });

    if (!panchangData.success) {
      throw new Error(panchangData.error || 'Failed to calculate panchang');
    }

    // Determine day quality based on yoga and nakshatra
    let dayQuality: 'Auspicious' | 'Neutral' | 'Inauspicious' = 'Neutral';
    
    if (panchangData.yogaEffect === 'Inauspicious') {
      dayQuality = 'Inauspicious';
    } else if (panchangData.yogaEffect === 'Very Auspicious' || panchangData.yogaEffect === 'Auspicious') {
      dayQuality = 'Auspicious';
    }

    // Check for Vaidhriti and Vatiapat
    const isVaidhriti = panchangData.yoga === 'Vaidhriti';
    const isVatiapat = panchangData.nakshatra === 'Kritika' && panchangData.paksha === 'Krishna Paksha';

    if (isVaidhriti || isVatiapat) {
      dayQuality = 'Inauspicious';
    }

    // Generate recommendations
    const recommendations: { avoid: string[]; goodFor: string[] } = {
      avoid: [],
      goodFor: [],
    };

    if (isVaidhriti) {
      recommendations.avoid.push('Starting new ventures or projects');
      recommendations.avoid.push('Important business decisions');
      recommendations.goodFor.push('Meditation and yoga');
      recommendations.goodFor.push('Introspection and spiritual activities');
    } else if (isVatiapat) {
      recommendations.avoid.push('Long journeys and travel');
      recommendations.avoid.push('Important meetings');
      recommendations.goodFor.push('Routine activities');
    } else if (panchangData.yogaEffect === 'Very Auspicious') {
      recommendations.goodFor.push('New business ventures');
      recommendations.goodFor.push('Important ceremonies');
      recommendations.goodFor.push('Career advancement');
      recommendations.goodFor.push('Weddings');
    } else if (panchangData.yogaEffect === 'Auspicious') {
      recommendations.goodFor.push('Business activities');
      recommendations.goodFor.push('Travel and meetings');
      recommendations.goodFor.push('General tasks');
    } else {
      recommendations.avoid.push('Starting new projects');
      recommendations.goodFor.push('Routine and maintenance work');
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          date,
          location: locationName,
          coordinates: { latitude, longitude },
          timezone,
          sunrise: panchangData.sunrise,
          
          tithi: panchangData.tithi,
          tithiName: panchangData.tithiName,
          paksha: panchangData.paksha,
          
          nakshatra: {
            name: panchangData.nakshatra,
            symbol: '🌙',
          },
          
          yoga: {
            name: panchangData.yoga,
            symbol: '⭐',
            effect: panchangData.yogaEffect,
          },
          
          sunRashi: {
            name: panchangData.sunRashi,
            symbol: '☀️',
          },
          
          moonRashi: {
            name: panchangData.moonRashi,
            symbol: '🌙',
          },
          
          vaidhriti: isVaidhriti,
          vatiapat: isVatiapat,
          dayQuality,
          recommendations,
          
          // Raw astronomical data
          astronomical: {
            moonLongitude: panchangData.moonLongitude,
            sunLongitude: panchangData.sunLongitude,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Panchang calculation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate Panchang details' },
      { status: 500 }
    );
  }
}

/**
 * Call Python panchang service with timeout
 */
function callPythonService(data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Path to Python service
      const pythonScriptPath = path.join(process.cwd(), 'panchang_service.py');
      
      // Use venv Python for access to PyEphem library
      const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python3');
      
      // Spawn Python process
      const python = spawn(pythonPath, [pythonScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000, // 30 second timeout
      });

      let output = '';
      let errorOutput = '';
      let timedOut = false;

      // Set timeout
      const timeout = setTimeout(() => {
        timedOut = true;
        python.kill();
        reject(new Error('Python service timed out - calculation took too long'));
      }, 25000);

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });

      python.on('close', (code) => {
        clearTimeout(timeout);
        
        if (timedOut) return; // Already rejected
        
        if (code !== 0) {
          reject(new Error(`Python service error: ${errorOutput}`));
        } else {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${output}`));
          }
        }
      });

      // Send input to Python process
      python.stdin.write(JSON.stringify(data));
      python.stdin.end();
    } catch (error) {
      reject(error);
    }
  });
}
