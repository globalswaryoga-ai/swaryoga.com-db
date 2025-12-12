export interface CalendarData {
  date: string;
  day: string;
  paksh: 'Shukla Paksha' | 'Krishna Paksha';
  tithi: number;
  sunrise: string;
  nadi: 'Surya Nadi' | 'Chandra Nadi';
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface MonthlyCalendarData {
  date: string;
  day: string;
  paksh: 'Shukla Paksha' | 'Krishna Paksha';
  tithi: number;
  tithiName: string;
  sunrise: string;
  nadi: string;
}

export interface CalendarFormData {
  selectedDate: string;
  selectedCountry: string;
  selectedState: string;
  selectedCapital: string;
  latitude: number;
  longitude: number;
}

export interface DownloadFormData {
  startDate: string;
  endDate: string;
}

export interface LocationData {
  date: string;
  country: string;
  state: string;
  capitalCity: string;
  latitude: number;
  longitude: number;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
