'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Search, Sun, Loader, Download, CalendarDays, Eye } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { 
  calculateHinduCalendar,
  calculateCompletePanchang
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
  panchang?: any; // Comprehensive Panchang data
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
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [selectedCapital, setSelectedCapital] = useState<string>('Mumbai');
  const [latitude, setLatitude] = useState<number>(19.0760);
  const [longitude, setLongitude] = useState<number>(72.8777);
  const [timezoneSelect, setTimezoneSelect] = useState<string>('Mumbai (+05:30)'); // Timezone name
  const [showResults, setShowResults] = useState<boolean>(false);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Download form states
  const [showDownloadForm, setShowDownloadForm] = useState<boolean>(false);
  const [downloadStartDate, setDownloadStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
  
  // Tomorrow's Swar Yoga data
  const [tomorrowData, setTomorrowData] = useState<{
    date: string;
    tithi: number;
    dominant: 'Prakruti' | 'Purusha';
    sunriseTime: string;
    sleepSwitchTime: string;
  } | null>(null);

  const availableCountries = [...getCountryNames(), 'Other'];

  const updateCoordinates = (country: string, state: string, city: string) => {
    const coords = getCityCoordinates(country, state, city);
    if (coords) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      return;
    }

    setLatitude(0);
    setLongitude(0);
  };

  useEffect(() => {
    if (selectedCountry && selectedState && selectedCapital) {
      updateCoordinates(selectedCountry, selectedState, selectedCapital);
    }
  }, [selectedCountry, selectedState, selectedCapital]);

  // Set default end date to one month from start date
  useEffect(() => {
    if (downloadStartDate) {
      const startDate = new Date(downloadStartDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      setDownloadEndDate(endDate.toISOString().split('T')[0]);
    }
  }, [downloadStartDate]);

  // Handle country change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);

    // If "Other" is selected, show the custom location popup
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
    } else {
      setLatitude(0);
      setLongitude(0);
    }
  };

  // Handle custom location form submission
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
    
    // Format timezone string
    const sign = offset >= 0 ? '+' : '';
    const hours = Math.floor(Math.abs(offset));
    const minutes = (Math.abs(offset) % 1) * 60;
    const tzString = `Custom (${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})`;
    setTimezoneSelect(tzString);
    
    // Add custom timezone to TIMEZONE_DATA if not exists (for display purposes)
    setShowCustomLocationPopup(false);
  };

  // Handle state change
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);

    const cities = state ? getCitiesForState(selectedCountry, state) : [];
    const nextCity = cities[0] ?? '';
    setSelectedCapital(nextCity);

    if (state && nextCity) {
      updateCoordinates(selectedCountry, state, nextCity);
    } else {
      setLatitude(0);
      setLongitude(0);
    }
  };

  // Handle capital change
  const handleCapitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const capital = e.target.value;
    setSelectedCapital(capital);
    if (capital) {
      updateCoordinates(selectedCountry, selectedState, capital);
    }
  };

  // Generate monthly calendar data
  const generateMonthlyCalendarData = async (startDate: string, endDate: string, lat: number, lng: number): Promise<MonthlyCalendarData[]> => {
    const data: MonthlyCalendarData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const maxDate = new Date(start);
    maxDate.setMonth(maxDate.getMonth() + 1);
    const actualEndDate = end > maxDate ? maxDate : end;
    
    let currentDate = new Date(start);
    
    // Day energy mapping: Mon, Wed, Thu, Fri = Moon; Sun, Tue, Sat = Sun
    const moonDays = [1, 3, 4, 5]; // Monday, Wednesday, Thursday, Friday
    
    // Moon planets for nakshatra
    const moonPlanets = ['Chandra', 'Shukra', 'Budh', 'Guru', 'Ketu'];
    
    while (currentDate <= actualEndDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const hinduData = await calculateHinduCalendar(dateString, lat, lng);
      const panchang = calculateCompletePanchang(currentDate);
      
      const dayOfWeek = currentDate.getDay();
      const dayEnergy = moonDays.includes(dayOfWeek) ? '☽' as const : '☉' as const;
      const nakshatraEnergy = moonPlanets.includes(panchang.nakshatra.planet) ? '☽' as const : '☉' as const;
      
      // Tithi energy based on Paksha
      const normalizedTithi = ((hinduData.tithi - 1) % 15) + 1;
      const shuklaGroup1 = [1, 2, 3, 7, 8, 9, 13, 14, 15];
      const krishnaGroupMoon = [4, 5, 6, 10, 11, 12];
      let tithiEnergy: '☽' | '☉';
      if (hinduData.paksha === 'Shukla Paksha') {
        tithiEnergy = shuklaGroup1.includes(normalizedTithi) ? '☽' : '☉';
      } else {
        tithiEnergy = krishnaGroupMoon.includes(normalizedTithi) ? '☽' : '☉';
      }
      
      // Determine dominant energy (simplified: count Moon vs Sun)
      const moonCount = [dayEnergy, nakshatraEnergy, tithiEnergy].filter(e => e === '☽').length;
      const dominant = moonCount >= 2 ? 'Prakruti' as const : 'Purusha' as const;
      
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
        yoga: panchang.yoga.name,
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

  // Preview monthly calendar data
  const handlePreviewCalendar = async () => {
    if (!downloadStartDate || !downloadEndDate || !latitude || !longitude) {
      alert('Please fill in all required fields first');
      return;
    }
    
    const start = new Date(downloadStartDate);
    const end = new Date(downloadEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      alert('Date range cannot exceed one month (31 days)');
      return;
    }
    
    setDownloadLoading(true);
    
    try {
      const monthlyData = await generateMonthlyCalendarData(downloadStartDate, downloadEndDate, latitude, longitude);
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

  // Download monthly calendar as PDF
  const handleDownloadMonthlyCalendar = async () => {
    if (!downloadStartDate || !downloadEndDate || !latitude || !longitude) {
      alert('Please fill in all required fields first');
      return;
    }
    
    const start = new Date(downloadStartDate);
    const end = new Date(downloadEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      alert('Date range cannot exceed one month (31 days)');
      return;
    }
    
    setDownloadLoading(true);
    
    try {
      // Dynamic import of jspdf
      const { jsPDF } = await import('jspdf');
      
      const monthlyData = await generateMonthlyCalendarData(downloadStartDate, downloadEndDate, latitude, longitude);
      
      // Get month-year and ayana from first data point
      const monthYear = new Date(downloadStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const ayana = monthlyData[0]?.ayana || 'Uttarayana';
      
      // Create A4 PDF (210mm x 297mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const tableWidth = pageWidth - margin * 2;
      
      // === HEADER SECTION ===
      doc.setFillColor(70, 130, 180);
      doc.rect(0, 0, pageWidth, 28, 'F');
      
      // Border
      doc.setDrawColor(100, 149, 237);
      doc.setLineWidth(1);
      doc.rect(2, 2, pageWidth - 4, pageHeight - 4, 'S');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SWAR YOGA CALENDAR', pageWidth / 2, 10, { align: 'center' });
      
      // Month-Year and Ayana
      doc.setFontSize(14);
      doc.text(`${monthYear} | ${ayana}`, pageWidth / 2, 18, { align: 'center' });
      
      // Creator info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Created by Mohan Kalburgi - Upamnyu International Education | Web: swaryoga.com | WhatsApp: +91 9779006820', pageWidth / 2, 25, { align: 'center' });
      
      // Location info (small text)
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      const locationLine = `${selectedCapital}, ${selectedState}, ${selectedCountry} | Lat: ${latitude.toFixed(4)}° | Long: ${longitude.toFixed(4)}° | Timezone: ${timezoneSelect}`;
      doc.text(locationLine, pageWidth / 2, 30, { align: 'center' });
      
      // === SINGLE TABLE SORTED BY DATE ===
      // Sort data by date (1st to end of month)
      const sortedData = [...monthlyData].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Column positions: Date, Day, Yog, Nakshatra, Tithi, Tithi(M/S), Result
      const colX = [margin + 2, margin + 22, margin + 50, margin + 85, margin + 125, margin + 150, margin + 175];
      
      let currentY = 38;
      
      // Table Header
      doc.setFillColor(70, 130, 180); // Steel blue
      doc.rect(margin, currentY, tableWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', colX[0], currentY + 5.5);
      doc.text('Day', colX[1], currentY + 5.5);
      doc.text('Yog', colX[2], currentY + 5.5);
      doc.text('Nakshatra', colX[3], currentY + 5.5);
      doc.text('Tithi', colX[4], currentY + 5.5);
      doc.text('Tithi(M/S)', colX[5], currentY + 5.5);
      doc.text('Result', colX[6], currentY + 5.5);
      currentY += 9;
      
      // Data rows sorted by date
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      sortedData.forEach((row, idx) => {
        if (currentY > pageHeight - 45) return; // Leave space for footer
        
        // Determine if Shukla or Krishna Paksha
        const isShukla = row.paksha.includes('Shukla');
        
        // Check for bad yogas FIRST - these override paksha coloring
        const isBadYoga = row.yoga === 'Vaidhriti' || row.yoga === 'Vyatipat' || 
                          row.yoga.includes('Vaidhriti') || row.yoga.includes('Vyatipat');
        
        // Row background - RED for bad yogas, otherwise paksha-based
        if (isBadYoga) {
          // BAD YOGA - Light red background for entire row
          doc.setFillColor(255, 220, 220);
        } else if (isShukla) {
          // Shukla Paksha - light green tint
          doc.setFillColor(240, 255, 240);
        } else {
          // Krishna Paksha - light orange tint
          doc.setFillColor(255, 248, 245);
        }
        doc.rect(margin, currentY - 1, tableWidth, 6, 'F');
        
        // Paksha indicator bar on left (red bar for bad yoga)
        if (isBadYoga) {
          doc.setFillColor(200, 0, 0); // Red bar for bad yoga
        } else if (isShukla) {
          doc.setFillColor(0, 150, 0);
        } else {
          doc.setFillColor(200, 100, 50);
        }
        doc.rect(margin, currentY - 1, 1.5, 6, 'F');
        
        // Date format: "1 Feb"
        const dateObj = new Date(row.date);
        const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`;
        doc.setTextColor(50, 50, 50);
        doc.text(dateStr, colX[0], currentY + 3);
        
        // Day with M/S indicator
        const dayEnergySym = row.dayEnergy === '☽' ? 'M' : 'S';
        if (row.dayEnergy === '☽') {
          doc.setTextColor(0, 100, 0);
        } else {
          doc.setTextColor(180, 0, 0);
        }
        doc.text(`${row.dayShort} (${dayEnergySym})`, colX[1], currentY + 3);
        
        // Yoga - Red and bold for Vaidhriti and Vyatipat
        if (isBadYoga) {
          doc.setTextColor(200, 0, 0);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(50, 50, 50);
          doc.setFont('helvetica', 'normal');
        }
        doc.text(row.yoga.substring(0, 12), colX[2], currentY + 3);
        doc.setFont('helvetica', 'normal');
        
        // Nakshatra with M/S indicator
        const nakEnergySym = row.nakshatraEnergy === '☽' ? 'M' : 'S';
        if (row.nakshatraEnergy === '☽') {
          doc.setTextColor(0, 100, 0);
        } else {
          doc.setTextColor(180, 0, 0);
        }
        doc.text(`${row.nakshatra.substring(0, 10)} (${nakEnergySym})`, colX[3], currentY + 3);
        
        // Tithi as number with Paksha symbol
        const pakshaSymbol = isShukla ? '☽' : '☉';
        doc.setTextColor(50, 50, 50);
        doc.text(`${row.tithi} ${pakshaSymbol}`, colX[4], currentY + 3);
        
        // Tithi energy (M/S)
        const tithiEnergySym = row.tithiEnergy === '☽' ? 'Moon' : 'Sun';
        if (row.tithiEnergy === '☽') {
          doc.setTextColor(0, 100, 0);
        } else {
          doc.setTextColor(180, 0, 0);
        }
        doc.text(tithiEnergySym, colX[5], currentY + 3);
        
        // Dominant result
        if (row.dominant === 'Prakruti') {
          doc.setTextColor(0, 100, 0);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(180, 0, 0);
          doc.setFont('helvetica', 'bold');
        }
        doc.text(row.dominant, colX[6], currentY + 3);
        doc.setFont('helvetica', 'normal');
        
        currentY += 6;
      });
      
      // === LEGEND BAR ===
      currentY = Math.max(currentY + 4, pageHeight - 42);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, tableWidth, 8, 'F');
      doc.setFontSize(6);
      doc.setTextColor(50, 50, 50);
      doc.setFont('helvetica', 'bold');
      doc.text('Legend:', margin + 3, currentY + 5);
      doc.setFont('helvetica', 'normal');
      // Shukla indicator
      doc.setFillColor(0, 150, 0);
      doc.rect(margin + 18, currentY + 2, 4, 4, 'F');
      doc.text('Shukla', margin + 24, currentY + 5);
      // Krishna indicator
      doc.setFillColor(200, 100, 50);
      doc.rect(margin + 40, currentY + 2, 4, 4, 'F');
      doc.text('Krishna', margin + 46, currentY + 5);
      // Bad Yoga indicator
      doc.setFillColor(255, 220, 220);
      doc.rect(margin + 65, currentY + 2, 4, 4, 'F');
      doc.setFillColor(200, 0, 0);
      doc.rect(margin + 65, currentY + 2, 1, 4, 'F');
      doc.setTextColor(200, 0, 0);
      doc.text('Vyatipat/Vaidhriti (Avoid)', margin + 71, currentY + 5);
      // M/S Legend
      doc.setTextColor(0, 100, 0);
      doc.text('M = Moon', margin + 125, currentY + 5);
      doc.setTextColor(180, 0, 0);
      doc.text('S = Sun', margin + 150, currentY + 5);
      
      // === FOOTER WITH PRAKRUTI & PURUSHA NOTES ===
      doc.setFillColor(70, 130, 180);
      doc.rect(0, pageHeight - 32, pageWidth, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      
      // Prakruti explanation
      doc.text('PRAKRUTI (☽ Moon Energy):', margin, pageHeight - 27);
      doc.setFont('helvetica', 'normal');
      doc.text('Associated with Left Nostril (Ida Nadi). Best for: Learning, creativity, healing, meditation, spiritual practices.', margin, pageHeight - 23);
      doc.text('Moon-dominant days support receptive, calming, and nurturing activities. Ideal for starting new education, arts, and healing work.', margin, pageHeight - 19);
      
      // Purusha explanation
      doc.setFont('helvetica', 'bold');
      doc.text('PURUSHA (☉ Sun Energy):', margin, pageHeight - 13);
      doc.setFont('helvetica', 'normal');
      doc.text('Associated with Right Nostril (Pingala Nadi). Best for: Physical activity, business, travel, competitions, assertive actions.', margin, pageHeight - 9);
      doc.text('Sun-dominant days support active, dynamic, and outward-focused activities. Ideal for exercise, negotiations, and adventures.', margin, pageHeight - 5);
      
      // Save PDF
      doc.save(`Swar-Calendar-${monthYear.replace(' ', '-')}.pdf`);
      
      setShowDownloadForm(false);
    } catch (error) {
      console.error('Error generating monthly calendar:', error);
      alert('Error generating calendar. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedCountry || !selectedState || !selectedCapital || !latitude || !longitude || !timezoneSelect) return;
    
    // Get timezone offset from the selected timezone name
    const timezoneData = TIMEZONE_DATA.find(tz => tz.name === timezoneSelect);
    const timezone = timezoneData?.offset || 5.5;
    
    setLoading(true);
    setConnectionError(null);
    
    try {
      // First get basic calendar data
      const hinduData = await calculateHinduCalendar(selectedDate, latitude, longitude);
      
      if (!hinduData) {
        throw new Error('Failed to calculate Hindu calendar data');
      }
      
      // Calculate JavaScript-based Panchang data as primary source
      const dateObj = new Date(selectedDate);
      const jsPanchang = calculateCompletePanchang(dateObj);
      
      // Format the JS panchang data to match expected structure
      const formattedPanchang = {
        nakshatra: {
          name: jsPanchang.nakshatra.name,
          symbol: jsPanchang.nakshatra.symbol,
          symbolText: jsPanchang.nakshatra.planet, // Ruling planet for Swar Yoga
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
          element: jsPanchang.moonRashi.planet, // Ruling planet instead of element
          english: jsPanchang.moonRashi.english,
        },
        sunRashi: {
          name: jsPanchang.sunRashi.name,
          symbol: jsPanchang.sunRashi.symbol,
          element: jsPanchang.sunRashi.planet, // Ruling planet instead of element
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
        vyatipat: jsPanchang.yoga.name === 'Vyatipat',
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
      
      // Optionally try the API for more detailed data (but don't fail if it errors)
      let apiPanchang = null;
      try {
        const panchangResponse = await fetch('/api/panchang/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            latitude,
            longitude,
            timezone,
            locationName: `${selectedCapital}, ${selectedState}, ${selectedCountry}`,
          })
        });
        const panchangData = await panchangResponse.json();
        if (panchangData.data) {
          apiPanchang = panchangData.data;
        }
      } catch (apiError) {
        console.log('API panchang unavailable, using JS calculations');
      }
      
      setCalendarData({
        date: selectedDate,
        day: hinduData.day,
        paksha: hinduData.paksha,
        tithi: hinduData.tithi,
        tithiName: hinduData.tithiName,
        sunriseTime: apiPanchang?.sunrise || hinduData.sunriseTime12,
        nadi: hinduData.nadi,
        location: `${selectedCapital}, ${selectedState}, ${selectedCountry}`,
        timezone: timezoneSelect,
        coordinates: {
          latitude,
          longitude
        },
        // Use API data if available, otherwise use JS-calculated panchang
        panchang: apiPanchang || formattedPanchang
      });
      
      // Calculate tomorrow's data for sleep guidance
      const tomorrowDate = new Date(selectedDate);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowDateString = tomorrowDate.toISOString().split('T')[0];
      const tomorrowHinduData = await calculateHinduCalendar(tomorrowDateString, latitude, longitude);
      const tomorrowPanchang = calculateCompletePanchang(tomorrowDate);
      
      // Determine tomorrow's dominant energy
      const tomorrowDominant = tomorrowPanchang.swarYoga.dominant.includes('Moon') ? 'Prakruti' as const : 'Purusha' as const;
      
      // Calculate sleep switch time (sunrise - 3 hours)
      const sunriseTime = tomorrowHinduData.sunriseTime12 || '07:00 AM';
      const sunriseMatch = sunriseTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let sleepSwitchTime = '04:00 AM';
      if (sunriseMatch) {
        let hours = parseInt(sunriseMatch[1]);
        const minutes = parseInt(sunriseMatch[2]);
        const ampm = sunriseMatch[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        // Subtract 3 hours
        let switchHours = hours - 3;
        if (switchHours < 0) switchHours += 24;
        const switchAmPm = switchHours >= 12 ? 'AM' : 'AM';
        const displayHours = switchHours > 12 ? switchHours - 12 : (switchHours === 0 ? 12 : switchHours);
        sleepSwitchTime = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} AM`;
      }
      
      setTomorrowData({
        date: tomorrowDateString,
        tithi: tomorrowHinduData.tithi,
        dominant: tomorrowDominant,
        sunriseTime: sunriseTime,
        sleepSwitchTime: sleepSwitchTime
      });
      
      setShowResults(true);
    } catch (error) {
      console.error('Error calculating calendar data:', error);
      setConnectionError('Failed to calculate calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Navigation />
      
      {/* Custom Location Popup Modal */}
      {showCustomLocationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setShowCustomLocationPopup(false);
                setSelectedCountry('India');
                const states = getStatesForCountry('India');
                setSelectedState(states[0] || '');
                const cities = getCitiesForState('India', states[0] || '');
                setSelectedCapital(cities[0] || '');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Custom Location</h3>
              <p className="text-gray-600 mt-2">Enter your location coordinates manually</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name (Optional)
                </label>
                <input
                  type="text"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  placeholder="e.g., My City"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={customLatitude}
                    onChange={(e) => setCustomLatitude(e.target.value)}
                    placeholder="-90 to 90"
                    step="0.0001"
                    min="-90"
                    max="90"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">North (+) / South (-)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={customLongitude}
                    onChange={(e) => setCustomLongitude(e.target.value)}
                    placeholder="-180 to 180"
                    step="0.0001"
                    min="-180"
                    max="180"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">East (+) / West (-)</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone Offset (UTC) <span className="text-red-500">*</span>
                </label>
                <select
                  value={customTimezoneOffset}
                  onChange={(e) => setCustomTimezoneOffset(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="-12">UTC -12:00</option>
                  <option value="-11">UTC -11:00</option>
                  <option value="-10">UTC -10:00 (Hawaii)</option>
                  <option value="-9">UTC -09:00 (Alaska)</option>
                  <option value="-8">UTC -08:00 (Pacific Time)</option>
                  <option value="-7">UTC -07:00 (Mountain Time)</option>
                  <option value="-6">UTC -06:00 (Central Time)</option>
                  <option value="-5">UTC -05:00 (Eastern Time)</option>
                  <option value="-4">UTC -04:00 (Atlantic)</option>
                  <option value="-3.5">UTC -03:30 (Newfoundland)</option>
                  <option value="-3">UTC -03:00 (Brazil)</option>
                  <option value="-2">UTC -02:00</option>
                  <option value="-1">UTC -01:00</option>
                  <option value="0">UTC +00:00 (London/GMT)</option>
                  <option value="1">UTC +01:00 (Paris/Berlin)</option>
                  <option value="2">UTC +02:00 (Cairo/Johannesburg)</option>
                  <option value="3">UTC +03:00 (Moscow/Istanbul)</option>
                  <option value="3.5">UTC +03:30 (Tehran)</option>
                  <option value="4">UTC +04:00 (Dubai)</option>
                  <option value="4.5">UTC +04:30 (Kabul)</option>
                  <option value="5">UTC +05:00 (Pakistan)</option>
                  <option value="5.5">UTC +05:30 (India/Sri Lanka)</option>
                  <option value="5.75">UTC +05:45 (Nepal)</option>
                  <option value="6">UTC +06:00 (Bangladesh)</option>
                  <option value="6.5">UTC +06:30 (Myanmar)</option>
                  <option value="7">UTC +07:00 (Bangkok/Jakarta)</option>
                  <option value="8">UTC +08:00 (Singapore/China)</option>
                  <option value="9">UTC +09:00 (Japan/Korea)</option>
                  <option value="9.5">UTC +09:30 (Australia Central)</option>
                  <option value="10">UTC +10:00 (Australia East)</option>
                  <option value="11">UTC +11:00</option>
                  <option value="12">UTC +12:00 (New Zealand)</option>
                  <option value="13">UTC +13:00</option>
                  <option value="14">UTC +14:00</option>
                </select>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> You can find your coordinates by searching your location on Google Maps and copying the lat/lng from the URL.
                </p>
              </div>
              
              <button
                onClick={handleCustomLocationSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Set Location
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 space-y-8 min-h-screen">
        {/* Hero Section */}
        <section className="text-center py-20 bg-gradient-to-r from-swar-primary via-swar-accent to-swar-primary text-white rounded-3xl shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-swar-primary-light rounded-full mix-blend-multiply filter blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <Calendar className="w-20 h-20 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold mb-4">Swar Calendar</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover the ancient wisdom of Hindu astrology and astronomy. Calculate Paksh, Tithi, Nadi, and sunrise times with precise astronomical accuracy.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white border-opacity-30">
                <Sun className="w-5 h-5" />
                <span>Sunrise Calculations</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white border-opacity-30">
                <Calendar className="w-5 h-5" />
                <span>Lunar Phases</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white border-opacity-30">
                <MapPin className="w-5 h-5" />
                <span>Location Based</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white rounded-3xl">
          <div className="space-y-12">
            <h2 className="text-4xl font-bold text-center text-swar-text">
              Powerful Astrological Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Sunrise Calculations */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-orange-500">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Sun className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Sunrise Time</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Precise sunrise calculations based on your exact latitude and longitude coordinates.
                </p>
              </div>

              {/* Paksh & Tithi */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-blue-500">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Paksh & Tithi</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Accurate determination of Shukla/Krishna Paksh and detailed Tithi (lunar day) calculations.
                </p>
              </div>

              {/* Nadi Analysis */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-purple-500">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-purple-600 text-lg">☄️</div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Nadi Analysis</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Surya and Chandra Nadi calculations based on traditional Hindu astrology principles.
                </p>
              </div>

              {/* Location Based */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-green-500">
                <div className="w-12 h-12 bg-swar-primary-light rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-swar-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Global Coverage</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Calculations tailored to 100+ countries and thousands of cities worldwide.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center space-x-2 mb-6">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-swar-text">Location & Date Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-swar-text mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                />
              </div>
              
              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-swar-text mb-1">
                  Country
                </label>
                <select
                  id="country"
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                >
                  <option value="">Select Country</option>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-swar-text mb-1">
                  State/Region
                </label>
                {selectedCountry === 'Other' ? (
                  <input
                    type="text"
                    id="state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    placeholder="Enter your state/region"
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  />
                ) : (
                  <select
                    id="state"
                    value={selectedState}
                    onChange={handleStateChange}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    required
                    disabled={!selectedCountry}
                  >
                    <option value="">Select State/Region</option>
                    {selectedCountry && getStatesForCountry(selectedCountry).map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* Capital City */}
              <div>
                <label htmlFor="capital" className="block text-sm font-medium text-swar-text mb-1">
                  City
                </label>
                {selectedCountry === 'Other' ? (
                  <input
                    type="text"
                    id="capital"
                    value={selectedCapital}
                    onChange={(e) => setSelectedCapital(e.target.value)}
                    placeholder="Enter your city"
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  />
                ) : (
                  <select
                    id="capital"
                    value={selectedCapital}
                    onChange={handleCapitalChange}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    required
                    disabled={!selectedState}
                  >
                    <option value="">Select City</option>
                    {selectedState && getCitiesForState(selectedCountry, selectedState).map((capital) => (
                      <option key={capital} value={capital}>
                        {capital}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* Latitude */}
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-swar-text mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  id="latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  step="0.000001"
                  placeholder="e.g., 19.0760"
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                />
              </div>
              
              {/* Longitude */}
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-swar-text mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  id="longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  step="0.000001"
                  placeholder="e.g., 72.8777"
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                />
                <p className="text-xs text-swar-text-secondary mt-1">
                  Coordinates auto-fill from the selected city so sunrise time reflects the exact location.
                </p>
              </div>

              {/* Timezone */}
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-swar-text mb-1">
                  Timezone (Place + UTC) <span className="text-red-500">*</span>
                </label>
                <select
                  id="timezone"
                  value={timezoneSelect}
                  onChange={(e) => setTimezoneSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                >
                  <option value="">Select Your Timezone</option>
                  {TIMEZONE_DATA.map((tz) => (
                    <option key={tz.name} value={tz.name}>
                      {tz.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-swar-text-secondary mt-1">
                  Select your city/timezone (e.g., Mumbai +05:30, New York -05:00)
                </p>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !selectedDate || !selectedCountry || !latitude || !longitude || !timezoneSelect}
              className="w-full bg-swar-primary hover:bg-swar-primary text-white py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Calculate Hindu Calendar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {connectionError && (
          <div className="bg-red-50 border border-red-200 text-swar-primary px-4 py-3 rounded-lg">
            {connectionError}
          </div>
        )}

        {/* Results Section */}
        {showResults && calendarData && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                <Calendar className="w-6 h-6 text-swar-primary" />
                <span>Panchang Results</span>
              </h2>
              <button
                onClick={() => setShowDownloadForm(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Monthly Calendar</span>
              </button>
            </div>

            {/* Location & Basic Info Card */}
            <div className="bg-gradient-to-r from-swar-primary-light to-blue-50 rounded-lg border border-swar-border p-4 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <MapPin className="h-4 w-4 text-swar-primary" />
                    <h3 className="text-base font-semibold text-swar-text">{calendarData.location} • {calendarData.timezone}</h3>
                  </div>
                  <div className="text-xs text-swar-text-secondary">
                    <p>📅 {formatDate(calendarData.date)} | 🕐 {calendarData.day}</p>
                    <p>📍 Lat: {calendarData.coordinates.latitude.toFixed(4)}, Lng: {calendarData.coordinates.longitude.toFixed(4)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1.5 text-orange-600">
                    <Sun className="h-5 w-5" />
                    <div>
                      <div className="text-lg font-bold">{calendarData.sunriseTime}</div>
                      <div className="text-xs">Sunrise</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings Section */}
            {calendarData.panchang && (calendarData.panchang.vaidhriti || calendarData.panchang.vatiapat) && (
              <div className="mb-4 space-y-2">
                {calendarData.panchang.vaidhriti && (
                  <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <h4 className="font-bold text-red-800 text-sm">Vaidhriti Yoga - Avoid New Ventures</h4>
                        <p className="text-xs text-red-700 mt-0.5">This yoga is inauspicious for starting new work or business. Good for meditation, yoga, and introspection only.</p>
                      </div>
                    </div>
                  </div>
                )}
                {calendarData.panchang.vatiapat && (
                  <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">🚫</span>
                      <div>
                        <h4 className="font-bold text-red-800 text-sm">Vatiapat - Avoid Travel</h4>
                        <p className="text-xs text-red-700 mt-0.5">Kritika Nakshatra in Krishna Paksha is inauspicious for long journeys. Plan your travels carefully.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Day Quality Indicator */}
            {calendarData.panchang && (
              <div className={`mb-6 rounded-xl border-2 p-4 text-center ${
                calendarData.panchang.dayQuality === 'Auspicious' 
                  ? 'bg-green-50 border-green-500' 
                  : calendarData.panchang.dayQuality === 'Inauspicious'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}>
                <div className="text-3xl mb-1">
                  {calendarData.panchang.dayQuality === 'Auspicious' ? '✨' : calendarData.panchang.dayQuality === 'Inauspicious' ? '⚡' : '⚖️'}
                </div>
                <div className={`text-lg font-bold ${
                  calendarData.panchang.dayQuality === 'Auspicious' 
                    ? 'text-green-800' 
                    : calendarData.panchang.dayQuality === 'Inauspicious'
                    ? 'text-red-800'
                    : 'text-yellow-800'
                }`}>
                  Day is {calendarData.panchang.dayQuality}
                </div>
              </div>
            )}

            {/* Panchang Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {/* Tithi Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-3 hover:shadow-md transition-shadow">
                <div className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wider">Tithi</div>
                <div className="mb-2">
                  <div className="text-2xl font-bold text-purple-800">{calendarData.tithi}</div>
                  <div className="text-xs text-purple-600">{calendarData.tithiName}</div>
                </div>
                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                  {calendarData.paksha}
                </div>
              </div>

              {/* Yoga Card */}
              {calendarData.panchang?.yoga && (
                <div className={`rounded-lg border-2 p-3 hover:shadow-md transition-shadow ${
                  calendarData.panchang.yoga.effect === 'Auspicious'
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                    calendarData.panchang.yoga.effect === 'Auspicious' ? 'text-green-700' : 'text-red-700'
                  }`}>Yoga</div>
                  <div className="mb-2">
                    <div className={`text-2xl font-bold mb-0.5 ${
                      calendarData.panchang.yoga.effect === 'Auspicious' ? 'text-green-800' : 'text-red-800'
                    }`}>{calendarData.panchang.yoga.symbol}</div>
                    <div className={`text-xs font-medium ${
                      calendarData.panchang.yoga.effect === 'Auspicious' ? 'text-green-700' : 'text-red-700'
                    }`}>{calendarData.panchang.yoga.name}</div>
                    <div className={`text-xs mt-0.5 ${
                      calendarData.panchang.yoga.effect === 'Auspicious' ? 'text-green-600' : 'text-red-600'
                    }`}>{calendarData.panchang.yoga.effect}</div>
                  </div>
                </div>
              )}

              {/* Nakshatra Card */}
              {calendarData.panchang?.nakshatra && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">Nakshatra</div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-blue-800">{calendarData.panchang.nakshatra.symbol}</div>
                    <div className="text-xs font-medium text-blue-700">{calendarData.panchang.nakshatra.name}</div>
                    <div className="text-xs text-blue-600 mt-0.5">🔯 {calendarData.panchang.nakshatra.symbolText}</div>
                  </div>
                </div>
              )}

              {/* Karana Card */}
              {calendarData.panchang?.karana && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wider">Karana</div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-orange-800">{calendarData.panchang.karana.symbol}</div>
                    <div className="text-xs font-medium text-orange-700">{calendarData.panchang.karana.name}</div>
                  </div>
                </div>
              )}

              {/* Moon Rashi Card */}
              {calendarData.panchang?.moonRashi && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200 p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold text-pink-700 mb-2 uppercase tracking-wider">Moon Rashi</div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-pink-800">{calendarData.panchang.moonRashi.symbol}</div>
                    <div className="text-xs font-medium text-pink-700">{calendarData.panchang.moonRashi.name}</div>
                    <div className="text-xs text-pink-600 mt-0.5">🌙 {calendarData.panchang.moonRashi.element}</div>
                  </div>
                </div>
              )}

              {/* Sun Rashi Card */}
              {calendarData.panchang?.sunRashi && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold text-yellow-700 mb-2 uppercase tracking-wider">Sun Rashi</div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-yellow-800">{calendarData.panchang.sunRashi.symbol}</div>
                    <div className="text-xs font-medium text-yellow-700">{calendarData.panchang.sunRashi.name}</div>
                    <div className="text-xs text-yellow-600 mt-0.5">☀️ {calendarData.panchang.sunRashi.element}</div>
                  </div>
                </div>
              )}

              {/* Sun Nakshatra Card */}
              {calendarData.panchang?.sunNakshatra && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wider">Sun Nakshatra</div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-amber-800">{calendarData.panchang.sunNakshatra.symbol}</div>
                    <div className="text-xs font-medium text-amber-700">{calendarData.panchang.sunNakshatra.name}</div>
                    <div className="text-xs text-amber-600 mt-0.5">☀️ {calendarData.panchang.sunNakshatra.planet}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Swar Yoga Dominance Card */}
            {calendarData.panchang?.swarYoga && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">🔮 Today's Swar Yoga Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Side - 5 Factors */}
                  <div>
                    <h4 className="font-semibold text-indigo-700 mb-3">📊 Today's 5 Factors</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">1. Ayana</span>
                        <span className="font-medium">{calendarData.panchang.swarYoga.factors.ayana.value} → <span className={calendarData.panchang.swarYoga.factors.ayana.energy.includes('Moon') ? 'text-blue-600' : 'text-orange-600'}>{calendarData.panchang.swarYoga.factors.ayana.energy}</span></span>
                      </div>
                      <div className="flex justify-between items-center text-sm bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">2. Paksha</span>
                        <span className="font-medium">{calendarData.panchang.swarYoga.factors.paksha.value.replace(' Paksha', '')} → <span className={calendarData.panchang.swarYoga.factors.paksha.energy.includes('Moon') ? 'text-blue-600' : 'text-orange-600'}>{calendarData.panchang.swarYoga.factors.paksha.energy}</span></span>
                      </div>
                      <div className="flex justify-between items-center text-sm bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">3. Tithi</span>
                        <span className="font-medium">{calendarData.panchang.swarYoga.factors.tithi.value} → <span className={calendarData.panchang.swarYoga.factors.tithi.energy.includes('Moon') ? 'text-blue-600' : 'text-orange-600'}>{calendarData.panchang.swarYoga.factors.tithi.energy}</span></span>
                      </div>
                      <div className="flex justify-between items-center text-sm bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">4. Nakshatra</span>
                        <span className="font-medium">{calendarData.panchang.swarYoga.factors.nakshatra.value} ({calendarData.panchang.swarYoga.factors.nakshatra.planet}) → <span className={calendarData.panchang.swarYoga.factors.nakshatra.energy.includes('Moon') ? 'text-blue-600' : 'text-orange-600'}>{calendarData.panchang.swarYoga.factors.nakshatra.energy}</span></span>
                      </div>
                      <div className="flex justify-between items-center text-sm bg-white/50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">5. Day</span>
                        <span className="font-medium">{calendarData.panchang.swarYoga.factors.day.value} → <span className={calendarData.panchang.swarYoga.factors.day.energy.includes('Moon') ? 'text-blue-600' : 'text-orange-600'}>{calendarData.panchang.swarYoga.factors.day.energy}</span></span>
                      </div>
                    </div>
                    {/* Summary */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-600 font-medium">☽ Moon: {calendarData.panchang.swarYoga.moonCount}</span>
                        <span className="text-orange-600 font-medium">☉ Sun: {calendarData.panchang.swarYoga.sunCount}</span>
                      </div>
                      <div className="text-center mt-2">
                        <span className={`text-lg font-bold ${calendarData.panchang.swarYoga.dominant.includes('Moon') ? 'text-blue-700' : 'text-orange-700'}`}>
                          Dominant: {calendarData.panchang.swarYoga.dominant} ({calendarData.panchang.swarYoga.recommendation.type})
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Right Side - Recommendations */}
                  <div>
                    <h4 className="font-semibold text-green-700 mb-3">✅ Good For Today ({calendarData.panchang.swarYoga.recommendation.type})</h4>
                    <ul className="space-y-2 mb-4">
                      {calendarData.panchang.swarYoga.recommendation.bestFor.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="mr-2 text-green-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <h4 className="font-semibold text-red-700 mb-3">❌ Not Suitable For</h4>
                    <ul className="space-y-2">
                      {calendarData.panchang.swarYoga.recommendation.avoid.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="mr-2 text-red-500">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Tomorrow's Sleep Guidance Note */}
                {tomorrowData && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:shadow-lg hover:border-green-400 transition-all duration-300 cursor-default">
                    <h4 className="font-bold text-green-800 mb-3 flex items-center">
                      <span className="mr-2">🌙</span>
                      Tomorrow's Preparation - {new Date(tomorrowData.date).toLocaleDateString('en-GB')} | Tithi {tomorrowData.tithi} ({tomorrowData.dominant === 'Prakruti' ? '☽ Moon' : '☉ Sun'})
                    </h4>
                    
                    {tomorrowData.dominant === 'Prakruti' ? (
                      // Moon dominant tomorrow
                      <div className="text-green-800 space-y-2">
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">🛏️ Tonight's Sleep Position:</span> Sleep on your <strong>LEFT side</strong> the entire night.
                        </p>
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">🛋️ Use proper pillow</span> to maintain comfortable left-side position.
                        </p>
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">🌅 Result:</span> At sunrise ({tomorrowData.sunriseTime}), your <strong>☽ Moon Swar (Ida Nadi)</strong> will be automatically active.
                        </p>
                      </div>
                    ) : (
                      // Sun dominant tomorrow
                      <div className="text-green-800 space-y-2">
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">🛏️ Tonight's Sleep Position:</span> Sleep on your <strong>LEFT side</strong> until <strong>{tomorrowData.sleepSwitchTime}</strong> (sunrise {tomorrowData.sunriseTime} - 3 hours).
                        </p>
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">↪️ Then switch:</span> Sleep on your <strong>RIGHT side</strong> for the last 2.5-3 hours before sunrise.
                        </p>
                        <p className="text-sm leading-relaxed">
                          <span className="font-semibold">🌅 Result:</span> At sunrise ({tomorrowData.sunriseTime}), your <strong>☉ Sun Swar (Pingala Nadi)</strong> will be automatically active.
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-3 border-t border-green-200">
                      <p className="text-xs text-green-700 italic flex items-center">
                        <span className="mr-2">✨</span>
                        <strong>Note:</strong> Swar Yoga gives best results with consistent practice. Regularity is the key to success!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nadi Info (Legacy) */}
            <div className="mt-6 px-6 py-4 bg-swar-bg border-t border-swar-border rounded-lg">
              <div className="text-sm text-swar-text-secondary">
                <p className="flex items-center space-x-2"><span className="font-medium">Nadi Energy:</span> <span>{calendarData.nadi.symbol}</span> <span>{calendarData.nadi.name}</span> ({calendarData.nadi.type === 'Sun' ? 'Sun Energy ☀️' : 'Moon Energy 🌙'})</p>
                <p className="mt-2 text-xs">In {calendarData.paksha}, Tithi {calendarData.tithi} corresponds to {calendarData.nadi.name} energy</p>
              </div>
            </div>
          </div>
        )}

        {/* Download Form Modal */}
        {showDownloadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                  <span>Download Monthly Calendar</span>
                </h3>
                <button
                  onClick={() => setShowDownloadForm(false)}
                  className="text-swar-text-secondary hover:text-swar-text-secondary text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={downloadStartDate}
                    onChange={(e) => setDownloadStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">
                    End Date (Max 1 Month)
                  </label>
                  <input
                    type="date"
                    value={downloadEndDate}
                    onChange={(e) => setDownloadEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Download Features:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Separate sections for Shukla Paksha and Krishna Paksha</li>
                    <li>• Same table format as today's results</li>
                    <li>• Complete Nadi calculation logic included</li>
                    <li>• A4 PDF format for printing</li>
                    <li>• Maximum one month period allowed</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDownloadForm(false)}
                    className="px-4 py-2 border border-swar-border text-swar-text rounded-lg hover:bg-swar-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreviewCalendar}
                    disabled={downloadLoading || !downloadStartDate || !downloadEndDate}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadMonthlyCalendar}
                    disabled={downloadLoading || !downloadStartDate || !downloadEndDate}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Preview Modal */}
        {showPreview && previewData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-swar-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-swar-border bg-gradient-to-r from-blue-500 to-purple-600">
                <h3 className="text-xl font-bold text-white">
                  Calendar Preview: {new Date(downloadStartDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="overflow-auto flex-1 p-4">
                {/* Krishna Paksha Table - TOP */}
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-red-700 mb-2 flex items-center">
                    <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                    KRISHNA PAKSHA (Waning Moon) ☉
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-red-100">
                          <th className="border border-red-300 px-2 py-2 text-left">Tithi</th>
                          <th className="border border-red-300 px-2 py-2 text-left">Date</th>
                          <th className="border border-red-300 px-2 py-2 text-left">Day (M/S)</th>
                          <th className="border border-red-300 px-2 py-2 text-left">Nakshatra (M/S)</th>
                          <th className="border border-red-300 px-2 py-2 text-left">Yoga</th>
                          <th className="border border-red-300 px-2 py-2 text-center">Tithi (M/S)</th>
                          <th className="border border-red-300 px-2 py-2 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.filter(d => d.paksha === 'Krishna Paksha').map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                            <td className="border border-red-200 px-2 py-1 font-medium">{row.tithi}</td>
                            <td className="border border-red-200 px-2 py-1">{new Date(row.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                            <td className={`border border-red-200 px-2 py-1 font-medium ${row.dayEnergy === '☽' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.dayShort} ({row.dayEnergy === '☽' ? 'M' : 'S'})
                            </td>
                            <td className={`border border-red-200 px-2 py-1 font-medium ${row.nakshatraEnergy === '☽' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.nakshatra} ({row.nakshatraEnergy === '☽' ? 'M' : 'S'})
                            </td>
                            <td className={`border border-red-200 px-2 py-1 font-medium ${(row.yoga === 'Vaidhriti' || row.yoga === 'Vyatipat') ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                              {row.yoga}
                            </td>
                            <td className={`border border-red-200 px-2 py-1 text-center font-bold ${row.tithiEnergy === '☽' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.tithiEnergy === '☽' ? 'Moon' : 'Sun'}
                            </td>
                            <td className={`border border-red-200 px-2 py-1 text-center font-bold ${row.dominant === 'Prakruti' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.dominant}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Shukla Paksha Table - BOTTOM */}
                <div>
                  <h4 className="text-lg font-bold text-green-700 mb-2 flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    SHUKLA PAKSHA (Waxing Moon) ☽
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="border border-green-300 px-2 py-2 text-left">Tithi</th>
                          <th className="border border-green-300 px-2 py-2 text-left">Date</th>
                          <th className="border border-green-300 px-2 py-2 text-left">Day (M/S)</th>
                          <th className="border border-green-300 px-2 py-2 text-left">Nakshatra (M/S)</th>
                          <th className="border border-green-300 px-2 py-2 text-left">Yoga</th>
                          <th className="border border-green-300 px-2 py-2 text-center">Tithi (M/S)</th>
                          <th className="border border-green-300 px-2 py-2 text-center">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.filter(d => d.paksha === 'Shukla Paksha').map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-green-50' : 'bg-white'}>
                            <td className="border border-green-200 px-2 py-1 font-medium">{row.tithi}</td>
                            <td className="border border-green-200 px-2 py-1">{new Date(row.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</td>
                            <td className={`border border-green-200 px-2 py-1 font-medium ${row.dayEnergy === '☽' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.dayShort} ({row.dayEnergy === '☽' ? 'M' : 'S'})
                            </td>
                            <td className={`border border-green-200 px-2 py-1 font-medium ${row.nakshatraEnergy === '☽' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.nakshatra} ({row.nakshatraEnergy === '☽' ? 'M' : 'S'})
                            </td>
                            <td className={`border border-green-200 px-2 py-1 font-medium ${(row.yoga === 'Vaidhriti' || row.yoga === 'Vyatipat') ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                              {row.yoga}
                            </td>
                            <td className={`border border-green-200 px-2 py-1 text-center font-bold ${row.tithiEnergy === '☽' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.tithiEnergy === '☽' ? 'Moon' : 'Sun'}
                            </td>
                            <td className={`border border-green-200 px-2 py-1 text-center font-bold ${row.dominant === 'Prakruti' ? 'text-green-700' : 'text-red-600'}`}>
                              {row.dominant}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Preview Footer Actions */}
              <div className="flex justify-end space-x-3 p-4 border-t border-swar-border bg-gray-50">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-swar-border text-swar-text rounded-lg hover:bg-swar-bg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleDownloadMonthlyCalendar();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center text-xs text-swar-text-secondary">
          <p>Calculations based on authentic Hindu Panchang and astronomical methods</p>
          <p>Powered by Swar Yoga Science</p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SwarCalendar;
