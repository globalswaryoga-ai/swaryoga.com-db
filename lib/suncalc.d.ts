// Type declarations for suncalc library
declare module 'suncalc' {
  interface MoonIllumination {
    fraction: number;
    phase: number;
    angle: number;
  }

  interface MoonPosition {
    azimuth: number;
    altitude: number;
    distance: number;
  }

  interface SunPosition {
    azimuth: number;
    altitude: number;
  }

  function getMoonIllumination(date: Date): MoonIllumination;
  function getMoonPosition(date: Date, latitude: number, longitude: number): MoonPosition;
  function getPosition(date: Date, latitude: number, longitude: number): SunPosition;
}
