// KP Ruling Planets: a point-in-time snapshot used to judge horary questions
// and as a live "right now" reference. Five components, computed for a
// given moment+place: day lord (weekday ruler), lagna sign/star/sub lord,
// Moon's sign/star/sub lord, and which planets are currently retrograde.
// Always a snapshot (capturedAt), never recomputed on read — a horary
// judgment must stay tied to the exact moment the question was asked.

import { computeChart } from './ephemeris';

// Index = JS getUTCDay() (0=Sunday) of the moment shifted into local time.
const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export interface RulingPlanetsSnapshot {
  capturedAt: string; // ISO
  dayLord: string;
  lagnaSign: string;
  lagnaSignLord: string;
  lagnaStarLord: string;
  lagnaSubLord: string;
  moonSign: string;
  moonSignLord: string;
  moonStarLord: string;
  moonSubLord: string;
  retrogradePlanets: string[];
}

export async function computeRulingPlanets(params: {
  at: Date;
  latitude: number;
  longitude: number;
  utcOffsetHours: number;
}): Promise<RulingPlanetsSnapshot> {
  const shifted = new Date(params.at.getTime() + params.utcOffsetHours * 3600000);

  const chart = await computeChart({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    utcOffsetHours: params.utcOffsetHours,
    latitude: params.latitude,
    longitude: params.longitude,
  });

  const moon = chart.planets.find((p) => p.planet === 'Moon');
  const dayLord = WEEKDAY_LORDS[shifted.getUTCDay()];
  const retrogradePlanets = chart.planets.filter((p) => p.retrograde).map((p) => p.planet);

  return {
    capturedAt: params.at.toISOString(),
    dayLord,
    lagnaSign: chart.ascendant.sign,
    lagnaSignLord: chart.ascendant.signLord,
    lagnaStarLord: chart.ascendant.starLord,
    lagnaSubLord: chart.ascendant.subLord,
    moonSign: moon?.sign || '',
    moonSignLord: moon?.signLord || '',
    moonStarLord: moon?.starLord || '',
    moonSubLord: moon?.subLord || '',
    retrogradePlanets,
  };
}
