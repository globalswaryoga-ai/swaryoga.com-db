'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Sun, 
  Sunset,
  Moon,
  Clock, 
  Compass, 
  Sparkles, 
  Loader, 
  Download, 
  CalendarDays, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { 
  calculateHinduCalendar,
  calculateCompletePanchang,
  calculateDayYoga,
  calculateSunTimes,
  calculateAstroLogicDetails
} from '@/lib/calendarCalculations';
import { locationData } from '@/lib/locationData';

// Timezone data with place names and UTC offsets
const TIMEZONE_DATA = [
  { name: 'London (GMT)', offset: 0 },
  { name: 'Istanbul (+03:00)', offset: 3 },
  { name: 'Cairo (+02:00)', offset: 2 },
  { name: 'Dubai (+04:00)', offset: 4 },
  { name: 'New Delhi/Kolkata (+05:30)', offset: 5.5 },
  { name: 'Mumbai (+05:30)', offset: 5.5 },
  { name: 'Bangalore (+05:30)', offset: 5.5 },
  { name: 'Bangkok (+07:00)', offset: 7 },
  { name: 'Hong Kong (+08:00)', offset: 8 },
  { name: 'Singapore (+08:00)', offset: 8 },
  { name: 'Tokyo (+09:00)', offset: 9 },
  { name: 'Sydney (+10:00)', offset: 10 },
  { name: 'New York (-05:00)', offset: -5 },
  { name: 'Los Angeles (-08:00)', offset: -8 },
  { name: 'Toronto (-05:00)', offset: -5 },
  { name: 'Mexico City (-06:00)', offset: -6 },
  { name: 'São Paulo (-03:00)', offset: -3 },
  { name: 'Lagos (+01:00)', offset: 1 },
  { name: 'Johannesburg (+02:00)', offset: 2 },
  { name: 'Paris/Berlin (+01:00)', offset: 1 },
  { name: 'Moscow (+03:00)', offset: 3 },
  { name: 'Jakarta (+07:00)', offset: 7 },
  { name: 'Manila (+08:00)', offset: 8 },
];

interface CalendarData {
  date: string;
  day: string;
  paksha: 'Shukla Paksha' | 'Krishna Paksha';
  tithi: number;
  tithiName: string;
  sunriseTime: string;
  sunsetTime: string;
  sunsetTime12: string;
  solarNoon12: string;
  dayLength: string;
  brahmaMuhurta: string;
  brahmaMuhurta12: string;
  nadi: {
    type: 'Sun' | 'Moon';
    symbol: string;
    name: string;
  };
  location: string;
  timezone: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  astroLogic?: ReturnType<typeof calculateAstroLogicDetails>;
  panchang?: any;
}

interface MonthlyCalendarData {
  date: string;
  day: string;
  dayShort: string;
  paksha: 'Shukla Paksha' | 'Krishna Paksha';
  tithi: number;
  tithiName: string;
  sunriseTime: string;
  nadi: string;
  nakshatra: string;
  nakshatraPlanet: string;
  yoga: string;
  dayEnergy: '☽' | '☉';
  nakshatraEnergy: '☽' | '☉';
  tithiEnergy: '☽' | '☉';
  dominant: 'Prakruti' | 'Purusha';
  ayana: string;
}

const getCountryByName = (name: string) => locationData.find((country) => country.name === name);

const getCountryNames = () => locationData.map((country) => country.name).sort((a, b) => a.localeCompare(b));

const getStatesForCountry = (countryName: string): string[] => {
  const country = getCountryByName(countryName);
  return country ? country.states.map((state) => state.name).sort((a, b) => a.localeCompare(b)) : [];
};

const getCitiesForState = (countryName: string, stateName: string): string[] => {
  const country = getCountryByName(countryName);
  const state = country?.states.find((stateItem) => stateItem.name === stateName);
  return state ? state.cities.map((city) => city.name).sort((a, b) => a.localeCompare(b)) : [];
};

const getCityCoordinates = (
  countryName: string,
  stateName: string,
  cityName: string
): { latitude: number; longitude: number } | undefined => {
  const country = getCountryByName(countryName);
  const state = country?.states.find((stateItem) => stateItem.name === stateName);
  const city = state?.cities.find((cityItem) => cityItem.name === cityName);
  if (!city) return undefined;
  return { latitude: city.latitude, longitude: city.longitude };
};

const SwarCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [selectedCapital, setSelectedCapital] = useState<string>('Mumbai');
  const [latitude, setLatitude] = useState<number>(19.0760);
  const [longitude, setLongitude] = useState<number>(72.8777);
  const [timezoneSelect, setTimezoneSelect] = useState<string>('Mumbai (+05:30)');
  const [showResults, setShowResults] = useState<boolean>(true);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showManualCoordinates, setShowManualCoordinates] = useState<boolean>(false);
  const [showAstroDetails, setShowAstroDetails] = useState<boolean>(true);
  
  // Download form states
  const [showDownloadForm, setShowDownloadForm] = useState<boolean>(false);
  const [downloadStartDate, setDownloadStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [downloadEndDate, setDownloadEndDate] = useState<string>('');
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<MonthlyCalendarData[] | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  
  // Custom location popup states (for "Other" option)
  const [showCustomLocationPopup, setShowCustomLocationPopup] = useState<boolean>(false);
  const [customLocationName, setCustomLocationName] = useState<string>('');
  const [customLatitude, setCustomLatitude] = useState<string>('');
  const [customLongitude, setCustomLongitude] = useState<string>('');
  const [customTimezoneOffset, setCustomTimezoneOffset] = useState<string>('0');
  
  // Tomorrow's Swar Yoga data for sleep guidance
  const [tomorrowData, setTomorrowData] = useState<{
    date: string;
    tithi: number;
    dominant: 'Prakruti' | 'Purusha';
    sunriseTime: string;
    sleepSwitchTime: string;
  } | null>(null);

  const availableCountries = [...getCountryNames(), 'Other'];

  const getTimezoneOffset = useCallback((): number => {
    const tz = TIMEZONE_DATA.find((t) => t.name === timezoneSelect);
    return tz?.offset ?? 5.5;
  }, [timezoneSelect]);

  const updateCoordinates = (country: string, state: string, city: string) => {
    const coords = getCityCoordinates(country, state, city);
    if (coords) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      
      // Auto-select corresponding timezone if in India
      if (country === 'India') {
        setTimezoneSelect('Mumbai (+05:30)');
      }
    }
  };

  // Set download end date to 1 month after start date by default
  useEffect(() => {
    if (downloadStartDate) {
      const startDate = new Date(downloadStartDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      setDownloadEndDate(endDate.toISOString().split('T')[0]);
    }
  }, [downloadStartDate]);

  // Core calculation function
  const runCalculation = useCallback(async (
    targetDate: string,
    lat: number,
    lng: number,
    tzName: string
  ) => {
    if (!targetDate || !lat || !lng) return;
    
    const tzOffset = TIMEZONE_DATA.find(t => t.name === tzName)?.offset ?? 5.5;
    setLoading(true);
    setConnectionError(null);

    try {
      const hinduData = await calculateHinduCalendar(targetDate, lat, lng, tzOffset);
      if (!hinduData) {
        throw new Error('Failed to calculate Hindu calendar data');
      }

      const dateObj = new Date(targetDate + 'T00:00:00');
      const jsPanchang = calculateCompletePanchang(dateObj);
      const astroLogic = calculateAstroLogicDetails(dateObj, lat, lng, tzOffset);

      const formattedPanchang = {
        nakshatra: {
          name: jsPanchang.nakshatra.name,
          symbol: jsPanchang.nakshatra.symbol,
          symbolText: jsPanchang.nakshatra.planet,
          pada: jsPanchang.nakshatra.pada,
        },
        yoga: {
          name: jsPanchang.yoga.name,
          symbol: jsPanchang.yoga.symbol,
          effect: jsPanchang.yoga.effect.includes('Auspicious') ? 'Auspicious' : 'Inauspicious',
        },
        karana: {
          name: jsPanchang.karana.name,
          symbol: jsPanchang.karana.symbol,
        },
        moonRashi: {
          name: jsPanchang.moonRashi.name,
          symbol: jsPanchang.moonRashi.symbol,
          element: jsPanchang.moonRashi.planet,
          english: jsPanchang.moonRashi.english,
        },
        sunRashi: {
          name: jsPanchang.sunRashi.name,
          symbol: jsPanchang.sunRashi.symbol,
          element: jsPanchang.sunRashi.planet,
          english: jsPanchang.sunRashi.english,
        },
        sunNakshatra: {
          name: jsPanchang.sunNakshatra.name,
          symbol: jsPanchang.sunNakshatra.symbol,
          planet: jsPanchang.sunNakshatra.planet,
          pada: jsPanchang.sunNakshatra.pada,
        },
        dayQuality: jsPanchang.dayQuality,
        vaidhriti: jsPanchang.yoga.name === 'Vaidhriti',
        vatiapat: jsPanchang.yoga.name === 'Vyatipat',
        recommendations: {
          avoid: jsPanchang.dayQuality === 'Inauspicious' 
            ? ['Starting new ventures', 'Long journeys', 'Important decisions']
            : ['Avoid conflicts', 'Unnecessary risks'],
          goodFor: jsPanchang.dayQuality === 'Auspicious'
            ? ['New beginnings', 'Important meetings', 'Spiritual practices', 'Business deals']
            : ['Meditation', 'Yoga', 'Self-reflection', 'Completing pending work'],
        },
        swarYoga: jsPanchang.swarYoga,
        ayana: jsPanchang.ayana,
      };

      setCalendarData({
        date: targetDate,
        day: hinduData.day,
        paksha: hinduData.paksha,
        tithi: hinduData.tithi,
        tithiName: hinduData.tithiName,
        sunriseTime: hinduData.sunriseTime12,
        sunsetTime: hinduData.sunsetTime,
        sunsetTime12: hinduData.sunsetTime12,
        solarNoon12: hinduData.solarNoon12,
        dayLength: hinduData.dayLength,
        brahmaMuhurta: hinduData.brahmaMuhurta,
        brahmaMuhurta12: hinduData.brahmaMuhurta12,
        nadi: hinduData.nadi,
        location: `${selectedCapital || 'Selected Location'}, ${selectedState || ''}, ${selectedCountry || ''}`.replace(/^, |, $/g, ''),
        timezone: tzName,
        coordinates: {
          latitude: lat,
          longitude: lng
        },
        astroLogic,
        panchang: formattedPanchang
      });

      // Calculate tomorrow's data for Sleep Guidance
      const tomorrowDate = new Date(targetDate + 'T00:00:00');
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowDateString = tomorrowDate.toISOString().split('T')[0];
      const tomorrowHinduData = await calculateHinduCalendar(tomorrowDateString, lat, lng, tzOffset);
      const tomorrowPanchang = calculateCompletePanchang(tomorrowDate);

      const tomorrowDominant = tomorrowPanchang.swarYoga.dominant.includes('Moon') ? 'Prakruti' as const : 'Purusha' as const;
      const srTime = tomorrowHinduData.sunriseTime12 || '06:30 AM';
      const srMatch = srTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let sleepSwitch = '03:30 AM';
      if (srMatch) {
        let hrs = parseInt(srMatch[1], 10);
        const mins = parseInt(srMatch[2], 10);
        const ampm = srMatch[3].toUpperCase();
        if (ampm === 'PM' && hrs !== 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        let switchHrs = hrs - 3;
        if (switchHrs < 0) switchHrs += 24;
        const swAmPm = switchHrs >= 12 ? 'PM' : 'AM';
        const dispHrs = switchHrs % 12 || 12;
        sleepSwitch = `${dispHrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${swAmPm}`;
      }

      setTomorrowData({
        date: tomorrowDateString,
        tithi: tomorrowHinduData.tithi,
        dominant: tomorrowDominant,
        sunriseTime: srTime,
        sleepSwitchTime: sleepSwitch
      });

      setShowResults(true);
    } catch (err: any) {
      console.error('Error calculating calendar:', err);
      setConnectionError(err?.message || 'Calculation error. Please check parameters.');
    } finally {
      setLoading(false);
    }
  }, [selectedCapital, selectedCountry, selectedState]);

  // Initial calculation on page load
  useEffect(() => {
    runCalculation(selectedDate, latitude, longitude, timezoneSelect);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick Date Selectors
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    runCalculation(dateStr, latitude, longitude, timezoneSelect);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);

    if (country === 'Other') {
      setShowCustomLocationPopup(true);
      setSelectedState('');
      setSelectedCapital('');
      return;
    }

    const states = getStatesForCountry(country);
    const nextState = states[0] ?? '';
    setSelectedState(nextState);

    const cities = nextState ? getCitiesForState(country, nextState) : [];
    const nextCity = cities[0] ?? '';
    setSelectedCapital(nextCity);

    if (nextState && nextCity) {
      updateCoordinates(country, nextState, nextCity);
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);

    const cities = state ? getCitiesForState(selectedCountry, state) : [];
    const nextCity = cities[0] ?? '';
    setSelectedCapital(nextCity);

    if (state && nextCity) {
      updateCoordinates(selectedCountry, state, nextCity);
    }
  };

  const handleCapitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    setSelectedCapital(city);
    if (city) {
      updateCoordinates(selectedCountry, selectedState, city);
    }
  };

  const handleCustomLocationSubmit = () => {
    const lat = parseFloat(customLatitude);
    const lng = parseFloat(customLongitude);
    const offset = parseFloat(customTimezoneOffset);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Please enter a valid latitude between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert('Please enter a valid longitude between -180 and 180');
      return;
    }
    if (isNaN(offset) || offset < -12 || offset > 14) {
      alert('Please enter a valid timezone offset between -12 and +14');
      return;
    }
    
    setLatitude(lat);
    setLongitude(lng);
    setSelectedState(customLocationName || 'Custom Location');
    setSelectedCapital(customLocationName || 'Custom Location');
    
    const sign = offset >= 0 ? '+' : '';
    const hours = Math.floor(Math.abs(offset));
    const minutes = (Math.abs(offset) % 1) * 60;
    const tzString = `Custom (${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})`;
    setTimezoneSelect(tzString);
    setShowCustomLocationPopup(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCalculation(selectedDate, latitude, longitude, timezoneSelect);
  };

  // Generate monthly calendar data for PDF & Preview
  const generateMonthlyCalendarData = async (
    startDate: string,
    endDate: string,
    lat: number,
    lng: number,
    timezone: number
  ): Promise<MonthlyCalendarData[]> => {
    const data: MonthlyCalendarData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const maxDate = new Date(start);
    maxDate.setMonth(maxDate.getMonth() + 1);
    const actualEndDate = end > maxDate ? maxDate : end;
    
    let currentDate = new Date(start);
    const moonDays = [1, 3, 4, 5];
    const moonPlanets = ['Chandra', 'Shukra', 'Budh', 'Guru', 'Ketu'];
    
    while (currentDate <= actualEndDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const hinduData = await calculateHinduCalendar(dateString, lat, lng, timezone);
      const panchang = calculateCompletePanchang(currentDate);
      
      const dayOfWeek = currentDate.getDay();
      const dayEnergy = moonDays.includes(dayOfWeek) ? '☽' as const : '☉' as const;
      const nakshatraEnergy = moonPlanets.includes(panchang.nakshatra.planet) ? '☽' as const : '☉' as const;
      
      const normalizedTithi = ((hinduData.tithi - 1) % 15) + 1;
      const shuklaGroup1 = [1, 2, 3, 7, 8, 9, 13, 14, 15];
      const krishnaGroupMoon = [4, 5, 6, 10, 11, 12];
      let tithiEnergy: '☽' | '☉';
      if (hinduData.paksha === 'Shukla Paksha') {
        tithiEnergy = shuklaGroup1.includes(normalizedTithi) ? '☽' : '☉';
      } else {
        tithiEnergy = krishnaGroupMoon.includes(normalizedTithi) ? '☽' : '☉';
      }
      
      const dominant = panchang.swarYoga.dominant.includes('Moon') ? 'Prakruti' as const : 'Purusha' as const;
      const dayYoga = calculateDayYoga(currentDate, lat, lng);
      
      data.push({
        date: dateString,
        day: hinduData.day,
        dayShort: hinduData.day.substring(0, 3),
        paksha: hinduData.paksha,
        tithi: hinduData.tithi,
        tithiName: hinduData.tithiName,
        sunriseTime: hinduData.sunriseTime12,
        nadi: hinduData.nadi.name,
        nakshatra: panchang.nakshatra.name,
        nakshatraPlanet: panchang.nakshatra.planet,
        yoga: dayYoga,
        dayEnergy,
        nakshatraEnergy,
        tithiEnergy,
        dominant,
        ayana: panchang.ayana.name
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  };

  const handlePreviewCalendar = async () => {
    if (!downloadStartDate || !downloadEndDate || !latitude || !longitude) {
      alert('Please fill in all required fields first');
      return;
    }
    
    const start = new Date(downloadStartDate);
    const end = new Date(downloadEndDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      alert('Date range cannot exceed one month (31 days)');
      return;
    }
    
    setDownloadLoading(true);
    try {
      const monthlyData = await generateMonthlyCalendarData(downloadStartDate, downloadEndDate, latitude, longitude, getTimezoneOffset());
      setPreviewData(monthlyData);
      setShowPreview(true);
      setShowDownloadForm(false);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Error generating preview. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadMonthlyCalendar = async () => {
    if (!downloadStartDate || !downloadEndDate || !latitude || !longitude) {
      alert('Please fill in all required fields first');
      return;
    }
    
    const start = new Date(downloadStartDate);
    const end = new Date(downloadEndDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      alert('Date range cannot exceed one month (31 days)');
      return;
    }
    
    setDownloadLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const monthlyData = await generateMonthlyCalendarData(downloadStartDate, downloadEndDate, latitude, longitude, getTimezoneOffset());
      
      const monthYear = new Date(downloadStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const ayana = monthlyData[0]?.ayana || 'Uttarayana';
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const tableWidth = pageWidth - margin * 2;
      
      doc.setFillColor(70, 130, 180);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setDrawColor(100, 149, 237);
      doc.setLineWidth(1);
      doc.rect(2, 2, pageWidth - 4, pageHeight - 4, 'S');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SWAR YOGA CALENDAR', pageWidth / 2, 10, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(`${monthYear} | ${ayana}`, pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Created by Mohan Kalburgi - Upamnyu International Education | Web: swaryoga.com | WhatsApp: +91 9779006820', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      const locationLine = `${selectedCapital}, ${selectedState}, ${selectedCountry} | Lat: ${latitude.toFixed(4)}° | Long: ${longitude.toFixed(4)}° | Timezone: ${timezoneSelect}`;
      doc.text(locationLine, pageWidth / 2, 30, { align: 'center' });
      
      const sortedData = [...monthlyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const colX = [margin + 2, margin + 22, margin + 50, margin + 85, margin + 125, margin + 150, margin + 175];
      
      let currentY = 38;
      let lastPaksha = '';
      
      const drawTableHeader = (isShukla: boolean) => {
        const bgColor = isShukla ? [200, 230, 200] : [255, 200, 180];
        const textColor = isShukla ? [0, 100, 0] : [180, 0, 0];
        const headerBgColor = isShukla ? [230, 245, 230] : [255, 235, 230];
        const pakshaTitle = isShukla ? 'SHUKLA PAKSHA (Waxing Moon) ☽' : 'KRISHNA PAKSHA (Waning Moon) ☉';
        
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(margin, currentY, tableWidth, 7, 'F');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(pakshaTitle, pageWidth / 2, currentY + 5, { align: 'center' });
        currentY += 8;
        
        doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
        doc.rect(margin, currentY, tableWidth, 6, 'F');
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Date', colX[0], currentY + 4);
        doc.text('Day', colX[1], currentY + 4);
        doc.text('Yog', colX[2], currentY + 4);
        doc.text('Nakshatra', colX[3], currentY + 4);
        doc.text('Tithi', colX[4], currentY + 4);
        doc.text('Tithi(M/S)', colX[5], currentY + 4);
        doc.text('Result', colX[6], currentY + 4);
        currentY += 7;
      };
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      sortedData.forEach((row) => {
        if (currentY > pageHeight - 45) return;
        const isShukla = row.paksha.includes('Shukla');
        if (row.paksha !== lastPaksha) {
          lastPaksha = row.paksha;
          if (currentY > 50) currentY += 4;
          drawTableHeader(isShukla);
        }
        
        const isBadYoga = row.yoga === 'Vaidhriti' || row.yoga === 'Vyatipat' || 
                          row.yoga.includes('Vaidhriti') || row.yoga.includes('Vyatipat');
        
        if (isBadYoga) {
          doc.setFillColor(255, 220, 220);
        } else if (isShukla) {
          doc.setFillColor(240, 255, 240);
        } else {
          doc.setFillColor(255, 248, 245);
        }
        doc.rect(margin, currentY - 1, tableWidth, 6, 'F');
        
        if (isBadYoga) {
          doc.setFillColor(200, 0, 0);
        } else if (isShukla) {
          doc.setFillColor(0, 150, 0);
        } else {
          doc.setFillColor(200, 100, 50);
        }
        doc.rect(margin, currentY - 1, 1.5, 6, 'F');
        
        const dateObj = new Date(row.date);
        const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`;
        doc.setTextColor(50, 50, 50);
        doc.text(dateStr, colX[0], currentY + 3);
        
        const dayEnergySym = row.dayEnergy === '☽' ? 'M' : 'S';
        doc.setTextColor(row.dayEnergy === '☽' ? 0 : 180, row.dayEnergy === '☽' ? 100 : 0, 0);
        doc.text(`${row.dayShort} (${dayEnergySym})`, colX[1], currentY + 3);
        
        if (isBadYoga) {
          doc.setTextColor(200, 0, 0);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(50, 50, 50);
          doc.setFont('helvetica', 'normal');
        }
        doc.text(row.yoga.substring(0, 12), colX[2], currentY + 3);
        doc.setFont('helvetica', 'normal');
        
        const nakEnergySym = row.nakshatraEnergy === '☽' ? 'M' : 'S';
        doc.setTextColor(row.nakshatraEnergy === '☽' ? 0 : 180, row.nakshatraEnergy === '☽' ? 100 : 0, 0);
        doc.text(`${row.nakshatra.substring(0, 10)} (${nakEnergySym})`, colX[3], currentY + 3);
        
        doc.setTextColor(50, 50, 50);
        doc.text(`${row.tithi}`, colX[4], currentY + 3);
        
        const tithiEnergySym = row.tithiEnergy === '☽' ? 'Moon' : 'Sun';
        doc.setTextColor(row.tithiEnergy === '☽' ? 0 : 180, row.tithiEnergy === '☽' ? 100 : 0, 0);
        doc.text(tithiEnergySym, colX[5], currentY + 3);
        
        doc.setTextColor(row.dominant === 'Prakruti' ? 0 : 180, row.dominant === 'Prakruti' ? 100 : 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(row.dominant, colX[6], currentY + 3);
        doc.setFont('helvetica', 'normal');
        
        currentY += 6;
      });
      
      currentY = Math.max(currentY + 4, pageHeight - 42);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, tableWidth, 8, 'F');
      doc.setFontSize(6);
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.text('Legend:', margin + 3, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(0, 150, 0);
      doc.rect(margin + 18, currentY + 2, 4, 4, 'F');
      doc.text('Shukla', margin + 24, currentY + 5);
      doc.setFillColor(200, 100, 50);
      doc.rect(margin + 40, currentY + 2, 4, 4, 'F');
      doc.text('Krishna', margin + 46, currentY + 5);
      doc.setFillColor(255, 220, 220);
      doc.rect(margin + 65, currentY + 2, 4, 4, 'F');
      doc.setFillColor(200, 0, 0);
      doc.rect(margin + 65, currentY + 2, 1, 4, 'F');
      doc.setTextColor(200, 0, 0);
      doc.text('Vyatipat/Vaidhriti (Avoid)', margin + 71, currentY + 5);
      doc.setTextColor(0, 100, 0);
      doc.text('M = Moon', margin + 125, currentY + 5);
      doc.setTextColor(180, 0, 0);
      doc.text('S = Sun', margin + 150, currentY + 5);
      
      doc.setFillColor(70, 130, 180);
      doc.rect(0, pageHeight - 32, pageWidth, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('PRAKRUTI (☽ Moon Energy):', margin, pageHeight - 27);
      doc.setFont('helvetica', 'normal');
      doc.text('Associated with Left Nostril (Ida Nadi). Best for: Learning, creativity, healing, meditation, spiritual practices.', margin, pageHeight - 23);
      doc.text('Moon-dominant days support receptive, calming, and nurturing activities.', margin, pageHeight - 19);
      
      doc.setFont('helvetica', 'bold');
      doc.text('PURUSHA (☉ Sun Energy):', margin, pageHeight - 13);
      doc.setFont('helvetica', 'normal');
      doc.text('Associated with Right Nostril (Pingala Nadi). Best for: Physical activity, business, travel, assertive actions.', margin, pageHeight - 9);
      doc.text('Sun-dominant days support dynamic and outward-focused activities.', margin, pageHeight - 5);
      
      doc.save(`Swar-Calendar-${monthYear.replace(' ', '-')}.pdf`);
      setShowDownloadForm(false);
    } catch (error) {
      console.error('Error generating monthly calendar:', error);
      alert('Error generating calendar. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <Navigation />
      
      {/* Custom Location Modal */}
      {showCustomLocationPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowCustomLocationPopup(false);
                setSelectedCountry('India');
                const states = getStatesForCountry('India');
                setSelectedState(states[0] || '');
                const cities = getCitiesForState('India', states[0] || '');
                setSelectedCapital(cities[0] || '');
              }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
            
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Custom Geographic Coordinates</h3>
              <p className="text-xs text-gray-500 mt-1">Specify exact Latitude, Longitude &amp; Timezone</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Place Name (Optional)
                </label>
                <input
                  type="text"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="e.g., My Ashram, Sedona, Rishikesh"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={customLatitude}
                    onChange={(e) => setCustomLatitude(e.target.value)}
                    placeholder="e.g. 19.0760"
                    step="0.0001"
                    min="-90"
                    max="90"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">North (+) / South (-)</p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={customLongitude}
                    onChange={(e) => setCustomLongitude(e.target.value)}
                    placeholder="e.g. 72.8777"
                    step="0.0001"
                    min="-180"
                    max="180"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">East (+) / West (-)</p>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                  Timezone Offset (UTC) <span className="text-red-500">*</span>
                </label>
                <select
                  value={customTimezoneOffset}
                  onChange={(e) => setCustomTimezoneOffset(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="-8">UTC -08:00 (Pacific Time)</option>
                  <option value="-5">UTC -05:00 (Eastern Time)</option>
                  <option value="0">UTC +00:00 (London/GMT)</option>
                  <option value="1">UTC +01:00 (Paris/Berlin)</option>
                  <option value="2">UTC +02:00 (Cairo)</option>
                  <option value="3">UTC +03:00 (Istanbul/Moscow)</option>
                  <option value="4">UTC +04:00 (Dubai)</option>
                  <option value="5.5">UTC +05:30 (India IST)</option>
                  <option value="7">UTC +07:00 (Bangkok)</option>
                  <option value="8">UTC +08:00 (Singapore)</option>
                  <option value="9">UTC +09:00 (Tokyo)</option>
                  <option value="10">UTC +10:00 (Sydney)</option>
                </select>
              </div>
              
              <button
                onClick={handleCustomLocationSubmit}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-xl font-semibold shadow-md transition-all mt-2"
              >
                Apply Custom Coordinates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 bg-white">
        
        {/* Hero Section: Clean, Luminous White & Emerald Vedic Aesthetic */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F4FAF6] via-white to-[#FBF8F1] p-6 sm:p-10 shadow-sm border border-emerald-100">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-900 mb-2">
              Swar Yoga Calender
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Precision Vedic astronomical calculations computed at local Sunrise (Udaya Tithi) with NOAA solar ephemeris, Panchang elements, and Swar Shastra breath analysis.
            </p>
          </div>
        </div>

        {/* INPUT CARD: Steps 1 through 4 */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-gray-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm">
                  1-4
                </span>
                <h2 className="text-xl font-bold text-gray-900">Date, Country, Place &amp; Coordinates</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">Select date and geographical place to calculate solar position and Vedic timings</p>
            </div>

            {/* Quick Date Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 font-medium mr-1">Quick:</span>
              <button
                type="button"
                onClick={() => setQuickDate(-1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Tomorrow
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Step 1: Date */}
              <div className="space-y-1.5">
                <label htmlFor="calendar-date" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Step 1: Select Date 📅
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="calendar-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-3.5 pr-3 py-2.5 text-sm font-semibold text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                    required
                  />
                </div>
              </div>

              {/* Step 2: Country */}
              <div className="space-y-1.5">
                <label htmlFor="calendar-country" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Step 2: Country 🌍
                </label>
                <select
                  id="calendar-country"
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  className="w-full px-3.5 py-2.5 text-sm font-medium text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                  required
                >
                  <option value="">Select Country</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: State / Region */}
              <div className="space-y-1.5">
                <label htmlFor="calendar-state" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Step 3: State / Region 📍
                </label>
                {selectedCountry === 'Other' ? (
                  <input
                    type="text"
                    id="calendar-state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    placeholder="Enter state"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                  />
                ) : (
                  <select
                    id="calendar-state"
                    value={selectedState}
                    onChange={handleStateChange}
                    disabled={!selectedCountry}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50 disabled:opacity-50"
                    required
                  >
                    <option value="">Select State</option>
                    {selectedCountry && getStatesForCountry(selectedCountry).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 3b: City */}
              <div className="space-y-1.5">
                <label htmlFor="calendar-city" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Place / City 🏙️
                </label>
                {selectedCountry === 'Other' ? (
                  <input
                    type="text"
                    id="calendar-city"
                    value={selectedCapital}
                    onChange={(e) => setSelectedCapital(e.target.value)}
                    placeholder="Enter city"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                  />
                ) : (
                  <select
                    id="calendar-city"
                    value={selectedCapital}
                    onChange={handleCapitalChange}
                    disabled={!selectedState}
                    className="w-full px-3.5 py-2.5 text-sm font-medium text-gray-800 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50 disabled:opacity-50"
                    required
                  >
                    <option value="">Select City</option>
                    {selectedState && getCitiesForState(selectedCountry, selectedState).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Step 4: Latitude & Longitude & Timezone Display Badge */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                    <span>Step 4: Active Coordinates &amp; Timezone</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Live
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>Latitude: <strong className="font-mono text-emerald-700">{latitude.toFixed(4)}°</strong></span>
                    <span>•</span>
                    <span>Longitude: <strong className="font-mono text-emerald-700">{longitude.toFixed(4)}°</strong></span>
                    <span>•</span>
                    <span>Timezone: <strong className="text-emerald-700">{timezoneSelect}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualCoordinates(v => !v)}
                  className="px-3.5 py-1.5 rounded-xl border border-emerald-200/80 bg-white hover:bg-emerald-50/60 text-emerald-800 font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>{showManualCoordinates ? 'Close Override' : 'Edit Coordinates'}</span>
                  {showManualCoordinates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Manual Coordinate Override Drawer */}
            {showManualCoordinates && (
              <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Manual Coordinates Override</span>
                  <span className="text-[11px] text-gray-500">Fine-tune for your exact location / GPS</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Latitude (°)</label>
                    <input
                      type="number"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      step="0.0001"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Longitude (°)</label>
                    <input
                      type="number"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      step="0.0001"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Timezone</label>
                    <select
                      value={timezoneSelect}
                      onChange={(e) => setTimezoneSelect(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {TIMEZONE_DATA.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action Button: Fresh, Light Emerald styling */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Calculating Solar &amp; Panchang Ephemeris...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Recalculate Swar Yoga Calender</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadForm(true)}
                className="px-5 py-3.5 rounded-2xl border border-emerald-300 text-emerald-700 bg-emerald-50/40 hover:bg-emerald-50 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Swar Yoga Calender (PDF)</span>
              </button>
            </div>
          </form>
        </section>

        {/* Error notification if any */}
        {connectionError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-medium">{connectionError}</p>
          </div>
        )}

        {/* RESULTS SECTION: Steps 5 through 8 */}
        {showResults && calendarData && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Header Summary Strip: Clean, Light & Prestigious */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{calendarData.location}</span>
                  <span>•</span>
                  <span>{calendarData.timezone}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {calendarData.day}, {formatDate(calendarData.date)}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-2 flex flex-wrap items-center gap-2">
                  <span>Tithi:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 font-bold border border-purple-200">
                    {calendarData.tithiName} ({calendarData.tithi})
                  </span>
                  <span>•</span>
                  <span>Paksha:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    {calendarData.paksha}
                  </span>
                  <span>•</span>
                  <span>Ayana:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                    {calendarData.panchang?.ayana?.name || 'Uttarayana'}
                  </span>
                </p>
              </div>

              {/* Dominance Badge Preview: Light, Soft & Airy */}
              <div className="flex items-center gap-3 self-start md:self-auto">
                <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl px-5 py-3.5 text-center shadow-xs">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Active Nadi at Sunrise</div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-800 flex items-center justify-center gap-1.5 mt-0.5">
                    <span>{calendarData.nadi.symbol}</span>
                    <span>{calendarData.nadi.name}</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    {calendarData.nadi.type === 'Sun' ? 'Right Nostril (Pingala)' : 'Left Nostril (Ida)'}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 5: SUNRISE / SUNSET TIME & SOLAR TIMINGS CARD */}
            <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs shrink-0">
                    5
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Sun Rise / Set Times &amp; Solar Ephemeris</h3>
                    <p className="text-[11px] text-gray-500">Accurate NOAA solar calculation with 90.833° atmospheric refraction</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 shrink-0">
                  <Sun className="w-3 h-3" /> Udaya Kaal
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3.5">
                
                {/* Sunrise */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Sunrise (Udaya)</span>
                    <Sun className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="my-1">
                    <div className="text-lg sm:text-xl font-extrabold text-amber-900 leading-tight">{calendarData.sunriseTime}</div>
                    <div className="text-[10px] text-amber-700 font-medium">Hindu Day Start</div>
                  </div>
                  <span className="text-[9px] text-amber-800 font-semibold bg-amber-100/70 px-1.5 py-0.5 rounded-md w-fit">
                    Nadi begins here
                  </span>
                </div>

                {/* Sunset */}
                <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Sunset (Asta)</span>
                    <Sunset className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="my-1">
                    <div className="text-lg sm:text-xl font-extrabold text-orange-900 leading-tight">{calendarData.sunsetTime12}</div>
                    <div className="text-[10px] text-orange-700 font-medium">24h: {calendarData.sunsetTime}</div>
                  </div>
                  <span className="text-[9px] text-orange-800 font-semibold bg-orange-100/70 px-1.5 py-0.5 rounded-md w-fit">
                    Sayam Sandhya
                  </span>
                </div>

                {/* Day Length */}
                <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Day Length</span>
                    <Clock className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="my-1">
                    <div className="text-lg sm:text-xl font-extrabold text-sky-900 leading-tight">{calendarData.dayLength}</div>
                    <div className="text-[10px] text-sky-700 font-medium">Noon: {calendarData.solarNoon12}</div>
                  </div>
                  <span className="text-[9px] text-sky-800 font-semibold bg-sky-100/70 px-1.5 py-0.5 rounded-md w-fit">
                    Daylight Span
                  </span>
                </div>

                {/* Brahma Muhurta */}
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/70 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Brahma Muhurta</span>
                    <Moon className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="my-1">
                    <div className="text-lg sm:text-xl font-extrabold text-purple-900 leading-tight">{calendarData.brahmaMuhurta12}</div>
                    <div className="text-[10px] text-purple-700 font-medium">96m before sunrise</div>
                  </div>
                  <span className="text-[9px] text-purple-800 font-semibold bg-purple-100/70 px-1.5 py-0.5 rounded-md w-fit">
                    Sadhana Window
                  </span>
                </div>
              </div>

              {/* Sandhya Kaal Natural Swar Shift Explainer */}
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-[11px] text-amber-800 flex items-center gap-2 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div>
                  <strong>Swar Yoga Sandhya Science:</strong> Equilibrium triggers Sushumna Nadi at sunrise ({calendarData.sunriseTime}), solar noon ({calendarData.solarNoon12}), &amp; sunset ({calendarData.sunsetTime12}) for ~5-10m. Ideal for Dhyana &amp; Pranayama.
                </div>
              </div>
            </section>

            {/* STEP 6: COMPLETE VEDIC PANCHANG GRID (MOVED IMMEDIATELY AFTER SUNRISE) */}
            <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-purple-100/70">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-gray-100 gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs shrink-0">
                    6
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Vedic Panchang (Five Limbs of Time)</h3>
                    <p className="text-[11px] text-gray-500">Tithi, Nakshatra, Yoga, Karana, Var &amp; Planetary Rashis</p>
                  </div>
                </div>

                {/* Day Quality Indicator */}
                {calendarData.panchang?.dayQuality && (
                  <div className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 self-start sm:self-auto shrink-0 ${
                    calendarData.panchang.dayQuality === 'Auspicious'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : calendarData.panchang.dayQuality === 'Inauspicious'
                      ? 'bg-red-50 text-red-800 border-red-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    <span>{calendarData.panchang.dayQuality === 'Auspicious' ? '✨' : calendarData.panchang.dayQuality === 'Inauspicious' ? '⚡' : '⚖️'}</span>
                    <span>Day Quality: {calendarData.panchang.dayQuality}</span>
                  </div>
                )}
              </div>

              {/* Bad Yoga / Inauspicious Warnings */}
              {(calendarData.panchang?.vaidhriti || calendarData.panchang?.vatiapat) && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs">Special Astrological Alert: Avoid New Ventures</h4>
                    <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                      {calendarData.panchang.vaidhriti ? 'Vaidhriti Yoga is active today. Inauspicious for starting business or commercial investments. Ideal strictly for Japa, meditation, yoga, and inner retreat.' : ''}
                      {calendarData.panchang.vatiapat ? 'Vyatipat Yoga is present. Avoid long travels and initiating conflicts.' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* 6 Compact Small Cards Grid (Green & Lavender theme) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 mt-3.5">
                
                {/* 1. Tithi Card (Lavender) */}
                <div className="p-3 rounded-xl bg-[#F7F4FE] border border-[#E9D5FF] flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">1. Tithi (Phase)</span>
                    <span className="text-base">🌙</span>
                  </div>
                  <div className="my-1">
                    <div className="text-base sm:text-lg font-extrabold text-[#581C87] leading-tight truncate">
                      {calendarData.tithi} • {calendarData.tithiName}
                    </div>
                    <div className="text-[11px] font-semibold text-[#7E22CE] leading-tight mt-0.5">{calendarData.paksha}</div>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {calendarData.paksha === 'Shukla Paksha' ? 'Waxing bright fortnight' : 'Waning dark fortnight'}
                  </p>
                </div>

                {/* 2. Nakshatra Card (Emerald Green) */}
                {calendarData.panchang?.nakshatra && (
                  <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">2. Nakshatra</span>
                      <span className="text-base">{calendarData.panchang.nakshatra.symbol}</span>
                    </div>
                    <div className="my-1">
                      <div className="text-base sm:text-lg font-extrabold text-[#065F46] leading-tight truncate">
                        {calendarData.panchang.nakshatra.name}
                      </div>
                      <div className="text-[11px] font-semibold text-[#047857] leading-tight mt-0.5">
                        Pada: {calendarData.panchang.nakshatra.pada || 1} • Planet: <strong>{calendarData.panchang.nakshatra.symbolText}</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Lunar constellation governing prana</p>
                  </div>
                )}

                {/* 3. Yoga Card (Lavender) */}
                {calendarData.panchang?.yoga && (
                  <div className="p-3 rounded-xl bg-[#F7F4FE] border border-[#E9D5FF] flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">3. Yoga</span>
                      <span className="text-base">{calendarData.panchang.yoga.symbol}</span>
                    </div>
                    <div className="my-1">
                      <div className="text-base sm:text-lg font-extrabold text-[#581C87] leading-tight truncate">
                        {calendarData.panchang.yoga.name}
                      </div>
                      <div className={`text-[11px] font-semibold leading-tight mt-0.5 ${calendarData.panchang.yoga.effect === 'Auspicious' ? 'text-[#059669]' : 'text-rose-600'}`}>
                        {calendarData.panchang.yoga.effect}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Harmonic Sun-Moon angle</p>
                  </div>
                )}

                {/* 4. Karana Card (Emerald Green) */}
                {calendarData.panchang?.karana && (
                  <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">4. Karana</span>
                      <span className="text-base">{calendarData.panchang.karana.symbol}</span>
                    </div>
                    <div className="my-1">
                      <div className="text-base sm:text-lg font-extrabold text-[#065F46] leading-tight truncate">
                        {calendarData.panchang.karana.name}
                      </div>
                      <div className="text-[11px] font-semibold text-[#047857] leading-tight mt-0.5">Action execution period</div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Half-Tithi 6° elongation interval</p>
                  </div>
                )}

                {/* 5. Moon Rashi (Lavender) */}
                {calendarData.panchang?.moonRashi && (
                  <div className="p-3 rounded-xl bg-[#F7F4FE] border border-[#E9D5FF] flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED]">5. Moon Rashi</span>
                      <span className="text-base">{calendarData.panchang.moonRashi.symbol}</span>
                    </div>
                    <div className="my-1">
                      <div className="text-base sm:text-lg font-extrabold text-[#581C87] leading-tight truncate">
                        {calendarData.panchang.moonRashi.name}
                        {calendarData.panchang.moonRashi.english ? ` (${calendarData.panchang.moonRashi.english})` : ''}
                      </div>
                      <div className="text-[11px] font-semibold text-[#7E22CE] leading-tight mt-0.5">
                        Lord: <strong>{calendarData.panchang.moonRashi.element}</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Chandra emotional &amp; mind matrix</p>
                  </div>
                )}

                {/* 6. Sun Rashi & Ayana (Emerald Green) */}
                {calendarData.panchang?.sunRashi && (
                  <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col justify-between hover:shadow-xs transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">6. Sun Rashi</span>
                      <span className="text-base">{calendarData.panchang.sunRashi.symbol}</span>
                    </div>
                    <div className="my-1">
                      <div className="text-base sm:text-lg font-extrabold text-[#065F46] leading-tight truncate">
                        {calendarData.panchang.sunRashi.name}
                        {calendarData.panchang.sunRashi.english ? ` (${calendarData.panchang.sunRashi.english})` : ''}
                      </div>
                      <div className="text-[11px] font-semibold text-[#047857] leading-tight mt-0.5 truncate">
                        {calendarData.panchang.ayana?.name} ({calendarData.panchang.ayana?.symbol || '☀️'})
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Solar celestial transit position</p>
                  </div>
                )}
              </div>
            </section>

            {/* STEP 7: ASTRO LOGIC & CALCULATION CARD */}
            <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                    7
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Astro Logic &amp; Mathematical Calculations</h3>
                    <p className="text-[11px] text-gray-500">Transparent astronomical verification: Lahiri Ayanamsha, Perturbations &amp; Elongation</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAstroDetails(v => !v)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                >
                  <span>{showAstroDetails ? 'Hide Formulas' : 'Show Formulas'}</span>
                  {showAstroDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showAstroDetails && calendarData.astroLogic && (
                <div className="mt-4 space-y-4">
                  {/* Calculation Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                      <div className="text-gray-500 font-medium text-[11px]">Epoch / Days (J2000)</div>
                      <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">{calendarData.astroLogic.daysSinceJ2000} d</div>
                      <div className="text-[10px] text-gray-400">Mean time metric</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                      <div className="text-gray-500 font-medium text-[11px]">Lahiri Ayanamsha</div>
                      <div className="font-mono font-bold text-gray-800 text-sm mt-0.5">{calendarData.astroLogic.ayanamsha}</div>
                      <div className="text-[10px] text-gray-400">Chitrapaksha basis</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                      <div className="text-amber-800 font-medium text-[11px]">Sun Nirayana</div>
                      <div className="font-mono font-bold text-amber-800 text-sm mt-0.5">{calendarData.astroLogic.sunSiderealLong}</div>
                      <div className="text-[10px] text-amber-600">Trop: {calendarData.astroLogic.sunTropicalLong}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
                      <div className="text-indigo-800 font-medium text-[11px]">Moon Nirayana</div>
                      <div className="font-mono font-bold text-indigo-800 text-sm mt-0.5">{calendarData.astroLogic.moonSiderealLong}</div>
                      <div className="text-[10px] text-indigo-600">Meeus corrected</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                      <div className="text-purple-800 font-medium text-[11px]">Angular Elongation (D)</div>
                      <div className="font-mono font-bold text-purple-800 text-sm mt-0.5">{calendarData.astroLogic.elongation}</div>
                      <div className="text-[10px] text-purple-600">Moon - Sun mod 360°</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <div className="text-emerald-800 font-medium text-[11px]">Calculated Tithi</div>
                      <div className="font-mono font-bold text-emerald-800 text-sm mt-0.5 truncate">
                        #{calendarData.astroLogic.tithiIndex} ({calendarData.tithiName})
                      </div>
                      <div className="text-[10px] text-emerald-600">Raw: {calendarData.astroLogic.tithiRaw}</div>
                    </div>
                  </div>

                  {/* Tithi Progression Bar */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/70 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-indigo-800">Tithi Elapsed: {calendarData.astroLogic.tithiPassedPercent}% of {calendarData.tithiName}</span>
                      <span className="text-purple-800">{calendarData.astroLogic.tithiLeftPercent}% remaining</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner flex">
                      <div 
                        className="bg-gradient-to-r from-amber-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${calendarData.astroLogic.tithiPassedPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      <strong>Astro Rule:</strong> Each Tithi = 12° of Moon-Sun elongation. In Vedic astrology, the <strong>Udaya Tithi</strong> (Tithi active at local sunrise: {calendarData.sunriseTime}) defines the spiritual nature of the day.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* STEP 8: TITHI & SWAR YOGA DOMINANCE & SLEEP GUIDANCE */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-700 font-bold text-sm">
                  8
                </span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Swar Yoga Breath Dominance &amp; 5-Factor Analysis</h3>
                  <p className="text-xs text-gray-500">Matching Tithi, Paksha, Ayana, Weekday &amp; Nakshatra to the science of breath</p>
                </div>
              </div>

              {calendarData.panchang?.swarYoga && (
                <div className="mt-6 space-y-6">
                  
                  {/* Dominant Energy Hero Box: Light, Soft & Balanced */}
                  <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center md:justify-between gap-6 ${
                    calendarData.panchang.swarYoga.dominant.includes('Moon')
                      ? 'bg-blue-50/40 border-blue-200/70'
                      : 'bg-orange-50/40 border-orange-200/70'
                  }`}>
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Today's Overall Dominance
                      </div>
                      <div className={`text-2xl sm:text-3xl font-black flex items-center gap-2 ${
                        calendarData.panchang.swarYoga.dominant.includes('Moon') ? 'text-blue-900' : 'text-orange-900'
                      }`}>
                        <span>{calendarData.panchang.swarYoga.dominant}</span>
                        <span>({calendarData.panchang.swarYoga.recommendation.type} Energy)</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl">
                        {calendarData.panchang.swarYoga.dominant.includes('Moon')
                          ? 'Prakruti (Chandra / Cooling / Creative) energy dominates today. Nurtures creative expansion, mental clarity, artistic endeavors, and healing.'
                          : 'Purusha (Surya / Heating / Transformational) energy dominates today. Ideal for physical execution, decision making, breaking obstacles, and athletic exertion.'}
                      </p>
                    </div>

                    {/* Moon vs Sun Score Cards */}
                    <div className="flex items-center gap-3">
                      <div className="px-5 py-3 rounded-2xl bg-white shadow-2xs border border-blue-100 text-center">
                        <div className="text-xs font-semibold text-blue-600">☽ Moon Factors</div>
                        <div className="text-2xl font-black text-blue-900">{calendarData.panchang.swarYoga.moonCount} / 5</div>
                      </div>
                      <div className="px-5 py-3 rounded-2xl bg-white shadow-2xs border border-orange-100 text-center">
                        <div className="text-xs font-semibold text-orange-600">☉ Sun Factors</div>
                        <div className="text-2xl font-black text-orange-900">{calendarData.panchang.swarYoga.sunCount} / 5</div>
                      </div>
                    </div>
                  </div>

                  {/* 5-Factor Breakdown Cards */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                      The 5 Canonical Swar Shastra Factors
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {([
                        ['1. Ayana', calendarData.panchang.swarYoga.factors.ayana.value, calendarData.panchang.swarYoga.factors.ayana.energy],
                        ['2. Paksha', calendarData.panchang.swarYoga.factors.paksha.value.replace(' Paksha', ''), calendarData.panchang.swarYoga.factors.paksha.energy],
                        ['3. Tithi', `Tithi ${calendarData.panchang.swarYoga.factors.tithi.value}`, calendarData.panchang.swarYoga.factors.tithi.energy],
                        ['4. Weekday', calendarData.panchang.swarYoga.factors.day.value, calendarData.panchang.swarYoga.factors.day.energy],
                        ['5. Nakshatra', `${calendarData.panchang.swarYoga.factors.nakshatra.value} (${calendarData.panchang.swarYoga.factors.nakshatra.planet})`, calendarData.panchang.swarYoga.factors.nakshatra.energy],
                      ] as [string, string, string][]).map(([factorLabel, factorVal, factorEnergy]) => {
                        const isMoon = factorEnergy.includes('Moon');
                        return (
                          <div 
                            key={factorLabel}
                            className={`p-3.5 rounded-2xl border ${
                              isMoon ? 'bg-blue-50/40 border-blue-100' : 'bg-orange-50/40 border-orange-100'
                            }`}
                          >
                            <div className="text-[10px] font-bold uppercase text-gray-400">{factorLabel}</div>
                            <div className="text-sm font-bold text-gray-800 mt-1 truncate">{factorVal}</div>
                            <div className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${
                              isMoon ? 'text-blue-600' : 'text-orange-600'
                            }`}>
                              <span>{factorEnergy}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recommendations: Good For vs Avoid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Best Activities Today ({calendarData.panchang.swarYoga.recommendation.type})</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-emerald-900 font-medium">
                        {calendarData.panchang.swarYoga.recommendation.bestFor.map((act: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>Activities to Avoid Today</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-rose-900 font-medium">
                        {calendarData.panchang.swarYoga.recommendation.avoid.map((act: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tonight's Sleep Guidance Card: Light, Soft Pastels, Pure White */}
                  {tomorrowData && (
                    <div className="p-6 sm:p-8 rounded-3xl bg-white text-gray-800 shadow-sm border border-indigo-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-gray-100 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                            <Moon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg sm:text-xl text-gray-900 tracking-tight">
                              Tonight's Sleep Posture &amp; Tomorrow's Alignment
                            </h4>
                            <p className="text-xs sm:text-sm text-indigo-700 font-medium mt-0.5">
                              Prepares for tomorrow ({formatDate(tomorrowData.date)}) • Tithi {tomorrowData.tithi}
                            </p>
                          </div>
                        </div>
                        <span className="self-start sm:self-auto text-xs px-3.5 py-1.5 rounded-full bg-indigo-50/70 text-indigo-700 font-semibold border border-indigo-100">
                          🌙 Swar Sleep Protocol
                        </span>
                      </div>

                      <div className="mt-6 space-y-4">
                        {tomorrowData.dominant === 'Prakruti' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-100 flex flex-col justify-between">
                              <div>
                                <div className="text-3xl mb-2">🛏️</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-sky-800">Sleep Posture</div>
                                <div className="text-base font-bold text-gray-900 mt-1">
                                  Sleep on your LEFT side
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed mt-2.5">
                                Maintain left-side posture throughout the night to stabilize lunar pranic channels.
                              </p>
                            </div>
                            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col justify-between">
                              <div>
                                <div className="text-3xl mb-2">🛋️</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-purple-800">Spine &amp; Pillow Support</div>
                                <div className="text-base font-bold text-gray-900 mt-1">
                                  Support Head &amp; Neck
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed mt-2.5">
                                Use a supportive pillow to keep head and spine naturally aligned without nostril obstruction.
                              </p>
                            </div>
                            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
                              <div>
                                <div className="text-3xl mb-2">🌅</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Sunrise Activation</div>
                                <div className="text-base font-bold text-gray-900 mt-1">
                                  At {tomorrowData.sunriseTime} Sunrise
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed mt-2.5">
                                Your <strong className="text-gray-900 font-semibold">☽ Moon Swar (Ida / Left Nostril)</strong> will naturally awaken and flow!
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-100 flex flex-col justify-between">
                              <div>
                                <div className="text-3xl mb-2">🛏️</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-sky-800">Phase 1: Initial Sleep</div>
                                <div className="text-base font-bold text-gray-900 mt-1">
                                  Sleep on your LEFT side
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed mt-2.5">
                                Sleep on your <strong className="text-gray-900 font-semibold">LEFT side</strong> from bedtime until <strong className="text-gray-900 font-semibold">{tomorrowData.sleepSwitchTime}</strong> (~3 hours before sunrise).
                              </p>
                            </div>
                            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col justify-between">
                              <div>
                                <div className="text-3xl mb-2">🔄</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-purple-800">Phase 2: Switch Posture</div>
                                <div className="text-base font-bold text-gray-900 mt-1">
                                  Turn to RIGHT side
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed mt-2.5">
                                At <strong className="text-gray-900 font-semibold">{tomorrowData.sleepSwitchTime}</strong>, turn and sleep on your <strong className="text-gray-900 font-semibold">RIGHT side</strong> for the remaining 2.5–3 hours.
                              </p>
                            </div>
                            <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex flex-col justify-between">
                              <div>
                                <div className="text-3xl mb-2">🌅</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-amber-800">Sunrise Activation</div>
                                <div className="text-base font-bold text-gray-900 mt-1">
                                  At {tomorrowData.sunriseTime} Sunrise
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed mt-2.5">
                                Your <strong className="text-gray-900 font-semibold">☉ Sun Swar (Pingala / Right Nostril)</strong> will naturally activate at dawn!
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs sm:text-sm text-emerald-800 font-medium flex items-center gap-3">
                          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            Consistent Swar Yoga synchronization with lunar tithi harmonizes mental clarity, vitality, and cellular immunity.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </section>

          </div>
        )}

        {/* Download Modal */}
        {showDownloadForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-600" />
                  <span>Download Monthly Calendar</span>
                </h3>
                <button
                  onClick={() => setShowDownloadForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={downloadStartDate}
                    onChange={(e) => setDownloadStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    End Date (Max 31 Days)
                  </label>
                  <input
                    type="date"
                    value={downloadEndDate}
                    onChange={(e) => setDownloadEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold">PDF Format Includes:</div>
                  <div>• Shukla Paksha &amp; Krishna Paksha tables</div>
                  <div>• Daily Tithi, Nakshatra, Yoga, and Day Energy</div>
                  <div>• Prakruti / Purusha Dominance column</div>
                  <div>• High-resolution printable A4 format</div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handlePreviewCalendar}
                    disabled={downloadLoading}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Table</span>
                  </button>
                  <button
                    onClick={handleDownloadMonthlyCalendar}
                    disabled={downloadLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm shadow-sm"
                  >
                    {downloadLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
              <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <div>
                  <h3 className="text-lg font-bold">
                    Calendar Preview: {new Date(downloadStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-white/90">Computed for {selectedCapital}, {selectedCountry}</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1 text-white hover:text-gray-200 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-auto flex-1 p-5 space-y-6">
                
                {/* Krishna Paksha */}
                <div>
                  <h4 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>KRISHNA PAKSHA (Waning Moon) ☉</span>
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 text-red-900 border-b border-red-200">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Tithi</th>
                          <th className="py-2.5 px-3 text-left">Date</th>
                          <th className="py-2.5 px-3 text-left">Day</th>
                          <th className="py-2.5 px-3 text-left">Nakshatra</th>
                          <th className="py-2.5 px-3 text-left">Yoga</th>
                          <th className="py-2.5 px-3 text-center">Tithi (M/S)</th>
                          <th className="py-2.5 px-3 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewData.filter(d => d.paksha === 'Krishna Paksha').map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}>
                            <td className="py-2 px-3 font-bold">{row.tithi}</td>
                            <td className="py-2 px-3">{new Date(row.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                            <td className={`py-2 px-3 font-semibold ${row.dayEnergy === '☽' ? 'text-blue-700' : 'text-orange-700'}`}>
                              {row.dayShort} ({row.dayEnergy === '☽' ? 'M' : 'S'})
                            </td>
                            <td className="py-2 px-3">{row.nakshatra}</td>
                            <td className="py-2 px-3 font-medium">{row.yoga}</td>
                            <td className={`py-2 px-3 text-center font-bold ${row.tithiEnergy === '☽' ? 'text-blue-700' : 'text-orange-700'}`}>
                              {row.tithiEnergy === '☽' ? 'Moon' : 'Sun'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.dominant === 'Prakruti' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {row.dominant}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shukla Paksha */}
                <div>
                  <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>SHUKLA PAKSHA (Waxing Moon) ☽</span>
                  </h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                    <table className="w-full text-xs">
                      <thead className="bg-emerald-50 text-emerald-900 border-b border-emerald-200">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Tithi</th>
                          <th className="py-2.5 px-3 text-left">Date</th>
                          <th className="py-2.5 px-3 text-left">Day</th>
                          <th className="py-2.5 px-3 text-left">Nakshatra</th>
                          <th className="py-2.5 px-3 text-left">Yoga</th>
                          <th className="py-2.5 px-3 text-center">Tithi (M/S)</th>
                          <th className="py-2.5 px-3 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewData.filter(d => d.paksha === 'Shukla Paksha').map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}>
                            <td className="py-2 px-3 font-bold">{row.tithi}</td>
                            <td className="py-2 px-3">{new Date(row.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                            <td className={`py-2 px-3 font-semibold ${row.dayEnergy === '☽' ? 'text-blue-700' : 'text-orange-700'}`}>
                              {row.dayShort} ({row.dayEnergy === '☽' ? 'M' : 'S'})
                            </td>
                            <td className="py-2 px-3">{row.nakshatra}</td>
                            <td className="py-2 px-3 font-medium">{row.yoga}</td>
                            <td className={`py-2 px-3 text-center font-bold ${row.tithiEnergy === '☽' ? 'text-blue-700' : 'text-orange-700'}`}>
                              {row.tithiEnergy === '☽' ? 'Moon' : 'Sun'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                row.dominant === 'Prakruti' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {row.dominant}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleDownloadMonthlyCalendar();
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Document</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      
      <Footer />
    </div>
  );
};

export default SwarCalendar;
