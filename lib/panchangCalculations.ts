'use server';

/**
 * Panchang Calculations using @bidyashish/panchang
 * DISABLED - @bidyashish/panchang has been removed due to native module (swisseph) compilation issues
 * 
 * Use /api/calendar endpoint with calendarCalculations.ts instead for calendar data
 */

// All functions in this file are disabled
export const calculateTithiWithPanchang = async (
  _date: Date,
  _latitude: number,
  _longitude: number,
  _timezone: string
): Promise<any> => {
  throw new Error('Panchang calculations not available. Use /api/calendar endpoint instead.');
};

export const getPanchangaData = async (
  _date: Date,
  _latitude: number,
  _longitude: number,
  _timezone: string
): Promise<any> => {
  throw new Error('Panchang calculations not available. Use /api/calendar endpoint instead.');
};
