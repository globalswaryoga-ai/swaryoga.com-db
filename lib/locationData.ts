export type { LocationCity, LocationState, LocationCountry } from './expandedLocationData';
export { locationData } from './expandedLocationData';

import { locationData } from './expandedLocationData';

export function getCountryNames(): string[] {
  return locationData.map((country) => country.name).sort((a, b) => a.localeCompare(b));
}

export function getStateNames(countryName: string): string[] {
  const country = locationData.find((c) => c.name === countryName);
  return country ? country.states.map((s) => s.name).sort((a, b) => a.localeCompare(b)) : [];
}

export function getCityNames(countryName: string, stateName: string): string[] {
  const country = locationData.find((c) => c.name === countryName);
  const state = country?.states.find((s) => s.name === stateName);
  return state ? state.cities.map((c) => c.name).sort((a, b) => a.localeCompare(b)) : [];
}

export function getCityCoordinates(
  countryName: string,
  stateName: string,
  cityName: string
): { latitude: number; longitude: number } | undefined {
  const country = locationData.find((c) => c.name === countryName);
  const state = country?.states.find((s) => s.name === stateName);
  const city = state?.cities.find((c) => c.name === cityName);
  return city ? { latitude: city.latitude, longitude: city.longitude } : undefined;
}

export interface CityLookupOption {
  country: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
}

export function getCityLookupOptions(countryName?: string): CityLookupOption[] {
  return locationData
    .filter((country) => !countryName || country.name === countryName)
    .flatMap((country) =>
      country.states.flatMap((state) =>
        state.cities.map((city) => ({
          country: country.name,
          state: state.name,
          city: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        }))
      )
    )
    .sort((a, b) => `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`));
}

export function getIndiaCityLookupOptions(): CityLookupOption[] {
  return getCityLookupOptions('India');
}
