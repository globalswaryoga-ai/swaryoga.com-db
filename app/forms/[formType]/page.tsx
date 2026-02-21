'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, CheckCircle, User, Mail, Phone, MapPin, Briefcase, Calendar, Lock, Globe, BookOpen, Users, Search, ChevronDown, Eye, EyeOff, UserCheck } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { workshopCatalog } from '@/lib/workshopsData';

type FormType = 'signup' | 'lead' | 'workshop' | 'sales' | 'inquiry';

interface FormConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string;
  fields: string[];
}

const FORM_CONFIGS: Record<FormType, FormConfig> = {
  signup: {
    title: 'Join Swar Yoga',
    subtitle: 'Create your account and start your wellness journey',
    icon: '🧘',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'gender', 'age', 'profession'],
  },
  lead: {
    title: 'Get Started',
    subtitle: 'Share your details and we\'ll contact you',
    icon: '📋',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'interest'],
  },
  workshop: {
    title: 'Workshop Registration',
    subtitle: 'Register for upcoming workshops',
    icon: '📚',
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'workshopName', 'workshopLanguage', 'workshopMode', 'batchPreference'],
  },
  sales: {
    title: 'Course Enrollment',
    subtitle: 'Enroll in our premium courses',
    icon: '🎯',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'courseName', 'paymentMode'],
  },
  inquiry: {
    title: 'General Inquiry',
    subtitle: 'Have questions? Reach out to us',
    icon: '❓',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-600',
    fields: ['name', 'email', 'phone', 'message'],
  },
};

// Auto-populated from workshopsData.ts
const WORKSHOPS = workshopCatalog.map(w => w.name);

const LANGUAGES = [
  { value: 'hindi', label: 'हिंदी (Hindi)' },
  { value: 'english', label: 'English' },
  { value: 'marathi', label: 'मराठी (Marathi)' },
];

// Comprehensive country phone codes with flags (200 countries)
const COUNTRY_PHONE_CODES: Record<string, { code: string; flag: string }> = {
  'Afghanistan': { code: '+93', flag: '🇦🇫' },
  'Albania': { code: '+355', flag: '🇦🇱' },
  'Algeria': { code: '+213', flag: '🇩🇿' },
  'Andorra': { code: '+376', flag: '🇦🇩' },
  'Angola': { code: '+244', flag: '🇦🇴' },
  'Antigua and Barbuda': { code: '+1268', flag: '🇦🇬' },
  'Argentina': { code: '+54', flag: '🇦🇷' },
  'Armenia': { code: '+374', flag: '🇦🇲' },
  'Australia': { code: '+61', flag: '🇦🇺' },
  'Austria': { code: '+43', flag: '🇦🇹' },
  'Azerbaijan': { code: '+994', flag: '🇦🇿' },
  'Bahamas': { code: '+1242', flag: '🇧🇸' },
  'Bahrain': { code: '+973', flag: '🇧🇭' },
  'Bangladesh': { code: '+880', flag: '🇧🇩' },
  'Barbados': { code: '+1246', flag: '🇧🇧' },
  'Belarus': { code: '+375', flag: '🇧🇾' },
  'Belgium': { code: '+32', flag: '🇧🇪' },
  'Belize': { code: '+501', flag: '🇧🇿' },
  'Benin': { code: '+229', flag: '🇧🇯' },
  'Bhutan': { code: '+975', flag: '🇧🇹' },
  'Bolivia': { code: '+591', flag: '🇧🇴' },
  'Bosnia and Herzegovina': { code: '+387', flag: '🇧🇦' },
  'Botswana': { code: '+267', flag: '🇧🇼' },
  'Brazil': { code: '+55', flag: '🇧🇷' },
  'Brunei': { code: '+673', flag: '🇧🇳' },
  'Bulgaria': { code: '+359', flag: '🇧🇬' },
  'Burkina Faso': { code: '+226', flag: '🇧🇫' },
  'Burundi': { code: '+257', flag: '🇧🇮' },
  'Cambodia': { code: '+855', flag: '🇰🇭' },
  'Cameroon': { code: '+237', flag: '🇨🇲' },
  'Canada': { code: '+1', flag: '🇨🇦' },
  'Cape Verde': { code: '+238', flag: '🇨🇻' },
  'Central African Republic': { code: '+236', flag: '🇨🇫' },
  'Chad': { code: '+235', flag: '🇹🇩' },
  'Chile': { code: '+56', flag: '🇨🇱' },
  'China': { code: '+86', flag: '🇨🇳' },
  'Colombia': { code: '+57', flag: '🇨🇴' },
  'Comoros': { code: '+269', flag: '🇰🇲' },
  'Congo': { code: '+242', flag: '🇨🇬' },
  'Costa Rica': { code: '+506', flag: '🇨🇷' },
  'Croatia': { code: '+385', flag: '🇭🇷' },
  'Cuba': { code: '+53', flag: '🇨🇺' },
  'Cyprus': { code: '+357', flag: '🇨🇾' },
  'Czech Republic': { code: '+420', flag: '🇨🇿' },
  'Denmark': { code: '+45', flag: '🇩🇰' },
  'Djibouti': { code: '+253', flag: '🇩🇯' },
  'Dominica': { code: '+1767', flag: '🇩🇲' },
  'Dominican Republic': { code: '+1809', flag: '🇩🇴' },
  'Ecuador': { code: '+593', flag: '🇪🇨' },
  'Egypt': { code: '+20', flag: '🇪🇬' },
  'El Salvador': { code: '+503', flag: '🇸🇻' },
  'Equatorial Guinea': { code: '+240', flag: '🇬🇶' },
  'Eritrea': { code: '+291', flag: '🇪🇷' },
  'Estonia': { code: '+372', flag: '🇪🇪' },
  'Eswatini': { code: '+268', flag: '🇸🇿' },
  'Ethiopia': { code: '+251', flag: '🇪🇹' },
  'Fiji': { code: '+679', flag: '🇫🇯' },
  'Finland': { code: '+358', flag: '🇫🇮' },
  'France': { code: '+33', flag: '🇫🇷' },
  'Gabon': { code: '+241', flag: '🇬🇦' },
  'Gambia': { code: '+220', flag: '🇬🇲' },
  'Georgia': { code: '+995', flag: '🇬🇪' },
  'Germany': { code: '+49', flag: '🇩🇪' },
  'Ghana': { code: '+233', flag: '🇬🇭' },
  'Greece': { code: '+30', flag: '🇬🇷' },
  'Grenada': { code: '+1473', flag: '🇬🇩' },
  'Guatemala': { code: '+502', flag: '🇬🇹' },
  'Guinea': { code: '+224', flag: '🇬🇳' },
  'Guinea-Bissau': { code: '+245', flag: '🇬🇼' },
  'Guyana': { code: '+592', flag: '🇬🇾' },
  'Haiti': { code: '+509', flag: '🇭🇹' },
  'Honduras': { code: '+504', flag: '🇭🇳' },
  'Hungary': { code: '+36', flag: '🇭🇺' },
  'Iceland': { code: '+354', flag: '🇮🇸' },
  'India': { code: '+91', flag: '🇮🇳' },
  'Indonesia': { code: '+62', flag: '🇮🇩' },
  'Iran': { code: '+98', flag: '🇮🇷' },
  'Iraq': { code: '+964', flag: '🇮🇶' },
  'Ireland': { code: '+353', flag: '🇮🇪' },
  'Israel': { code: '+972', flag: '🇮🇱' },
  'Italy': { code: '+39', flag: '🇮🇹' },
  'Ivory Coast': { code: '+225', flag: '🇨🇮' },
  'Jamaica': { code: '+1876', flag: '🇯🇲' },
  'Japan': { code: '+81', flag: '🇯🇵' },
  'Jordan': { code: '+962', flag: '🇯🇴' },
  'Kazakhstan': { code: '+7', flag: '🇰🇿' },
  'Kenya': { code: '+254', flag: '🇰🇪' },
  'Kiribati': { code: '+686', flag: '🇰🇮' },
  'Kosovo': { code: '+383', flag: '🇽🇰' },
  'Kuwait': { code: '+965', flag: '🇰🇼' },
  'Kyrgyzstan': { code: '+996', flag: '🇰🇬' },
  'Laos': { code: '+856', flag: '🇱🇦' },
  'Latvia': { code: '+371', flag: '🇱🇻' },
  'Lebanon': { code: '+961', flag: '🇱🇧' },
  'Lesotho': { code: '+266', flag: '🇱🇸' },
  'Liberia': { code: '+231', flag: '🇱🇷' },
  'Libya': { code: '+218', flag: '🇱🇾' },
  'Liechtenstein': { code: '+423', flag: '🇱🇮' },
  'Lithuania': { code: '+370', flag: '🇱🇹' },
  'Luxembourg': { code: '+352', flag: '🇱🇺' },
  'Madagascar': { code: '+261', flag: '🇲🇬' },
  'Malawi': { code: '+265', flag: '🇲🇼' },
  'Malaysia': { code: '+60', flag: '🇲🇾' },
  'Maldives': { code: '+960', flag: '🇲🇻' },
  'Mali': { code: '+223', flag: '🇲🇱' },
  'Malta': { code: '+356', flag: '🇲🇹' },
  'Marshall Islands': { code: '+692', flag: '🇲🇭' },
  'Mauritania': { code: '+222', flag: '🇲🇷' },
  'Mauritius': { code: '+230', flag: '🇲🇺' },
  'Mexico': { code: '+52', flag: '🇲🇽' },
  'Micronesia': { code: '+691', flag: '🇫🇲' },
  'Moldova': { code: '+373', flag: '🇲🇩' },
  'Monaco': { code: '+377', flag: '🇲🇨' },
  'Mongolia': { code: '+976', flag: '🇲🇳' },
  'Montenegro': { code: '+382', flag: '🇲🇪' },
  'Morocco': { code: '+212', flag: '🇲🇦' },
  'Mozambique': { code: '+258', flag: '🇲🇿' },
  'Myanmar': { code: '+95', flag: '🇲🇲' },
  'Namibia': { code: '+264', flag: '🇳🇦' },
  'Nauru': { code: '+674', flag: '🇳🇷' },
  'Nepal': { code: '+977', flag: '🇳🇵' },
  'Netherlands': { code: '+31', flag: '🇳🇱' },
  'New Zealand': { code: '+64', flag: '🇳🇿' },
  'Nicaragua': { code: '+505', flag: '🇳🇮' },
  'Niger': { code: '+227', flag: '🇳🇪' },
  'Nigeria': { code: '+234', flag: '🇳🇬' },
  'North Korea': { code: '+850', flag: '🇰🇵' },
  'North Macedonia': { code: '+389', flag: '🇲🇰' },
  'Norway': { code: '+47', flag: '🇳🇴' },
  'Oman': { code: '+968', flag: '🇴🇲' },
  'Pakistan': { code: '+92', flag: '🇵🇰' },
  'Palau': { code: '+680', flag: '🇵🇼' },
  'Palestine': { code: '+970', flag: '🇵🇸' },
  'Panama': { code: '+507', flag: '🇵🇦' },
  'Papua New Guinea': { code: '+675', flag: '🇵🇬' },
  'Paraguay': { code: '+595', flag: '🇵🇾' },
  'Peru': { code: '+51', flag: '🇵🇪' },
  'Philippines': { code: '+63', flag: '🇵🇭' },
  'Poland': { code: '+48', flag: '🇵🇱' },
  'Portugal': { code: '+351', flag: '🇵🇹' },
  'Qatar': { code: '+974', flag: '🇶🇦' },
  'Romania': { code: '+40', flag: '🇷🇴' },
  'Russia': { code: '+7', flag: '🇷🇺' },
  'Rwanda': { code: '+250', flag: '🇷🇼' },
  'Saint Kitts and Nevis': { code: '+1869', flag: '🇰🇳' },
  'Saint Lucia': { code: '+1758', flag: '🇱🇨' },
  'Saint Vincent and the Grenadines': { code: '+1784', flag: '🇻🇨' },
  'Samoa': { code: '+685', flag: '🇼🇸' },
  'San Marino': { code: '+378', flag: '🇸🇲' },
  'Sao Tome and Principe': { code: '+239', flag: '🇸🇹' },
  'Saudi Arabia': { code: '+966', flag: '🇸🇦' },
  'Senegal': { code: '+221', flag: '🇸🇳' },
  'Serbia': { code: '+381', flag: '🇷🇸' },
  'Seychelles': { code: '+248', flag: '🇸🇨' },
  'Sierra Leone': { code: '+232', flag: '🇸🇱' },
  'Singapore': { code: '+65', flag: '🇸🇬' },
  'Slovakia': { code: '+421', flag: '🇸🇰' },
  'Slovenia': { code: '+386', flag: '🇸🇮' },
  'Solomon Islands': { code: '+677', flag: '🇸🇧' },
  'Somalia': { code: '+252', flag: '🇸🇴' },
  'South Africa': { code: '+27', flag: '🇿🇦' },
  'South Korea': { code: '+82', flag: '🇰🇷' },
  'South Sudan': { code: '+211', flag: '🇸🇸' },
  'Spain': { code: '+34', flag: '🇪🇸' },
  'Sri Lanka': { code: '+94', flag: '🇱🇰' },
  'Sudan': { code: '+249', flag: '🇸🇩' },
  'Suriname': { code: '+597', flag: '🇸🇷' },
  'Sweden': { code: '+46', flag: '🇸🇪' },
  'Switzerland': { code: '+41', flag: '🇨🇭' },
  'Syria': { code: '+963', flag: '🇸🇾' },
  'Taiwan': { code: '+886', flag: '🇹🇼' },
  'Tajikistan': { code: '+992', flag: '🇹🇯' },
  'Tanzania': { code: '+255', flag: '🇹🇿' },
  'Thailand': { code: '+66', flag: '🇹🇭' },
  'Timor-Leste': { code: '+670', flag: '🇹🇱' },
  'Togo': { code: '+228', flag: '🇹🇬' },
  'Tonga': { code: '+676', flag: '🇹🇴' },
  'Trinidad and Tobago': { code: '+1868', flag: '🇹🇹' },
  'Tunisia': { code: '+216', flag: '🇹🇳' },
  'Turkey': { code: '+90', flag: '🇹🇷' },
  'Turkmenistan': { code: '+993', flag: '🇹🇲' },
  'Tuvalu': { code: '+688', flag: '🇹🇻' },
  'Uganda': { code: '+256', flag: '🇺🇬' },
  'Ukraine': { code: '+380', flag: '🇺🇦' },
  'United Arab Emirates': { code: '+971', flag: '🇦🇪' },
  'United Kingdom': { code: '+44', flag: '🇬🇧' },
  'United States': { code: '+1', flag: '🇺🇸' },
  'Uruguay': { code: '+598', flag: '🇺🇾' },
  'Uzbekistan': { code: '+998', flag: '🇺🇿' },
  'Vanuatu': { code: '+678', flag: '🇻🇺' },
  'Vatican City': { code: '+379', flag: '🇻🇦' },
  'Venezuela': { code: '+58', flag: '🇻🇪' },
  'Vietnam': { code: '+84', flag: '🇻🇳' },
  'Yemen': { code: '+967', flag: '🇾🇪' },
  'Zambia': { code: '+260', flag: '🇿🇲' },
  'Zimbabwe': { code: '+263', flag: '🇿🇼' },
  'Other': { code: '+', flag: '🌍' },
};

// All 196 countries (same as signup page)
const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Other'
];

// All states data (copied from signup page)
const STATES_DATA: Record<string, string[]> = {
  'India': ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kashmir and Jammu', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
  'United States': ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
  'Canada': ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'],
  'Australia': ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
  'United Kingdom': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  'Germany': ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'],
  'France': ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', "Provence-Alpes-Côte d'Azur"],
  'Italy': ['Abruzzo', 'Aosta Valley', 'Apulia', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont', 'Sardinia', 'Sicily', 'Trentino-South Tyrol', 'Tuscany', 'Umbria', 'Veneto'],
  'Spain': ['Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands', 'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Ceuta', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Melilla', 'Murcia', 'Navarre', 'Valencian Community'],
  'Japan': ['Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa', 'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'],
  'China': ['Beijing', 'Shanghai', 'Tianjin', 'Chongqing', 'Hebei', 'Shanxi', 'Liaoning', 'Jilin', 'Heilongjiang', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi', 'Shandong', 'Henan', 'Hubei', 'Hunan', 'Guangdong', 'Hainan', 'Sichuan', 'Guizhou', 'Yunnan', 'Shaanxi', 'Gansu', 'Qinghai', 'Taiwan', 'Guangxi', 'Inner Mongolia', 'Tibet', 'Ningxia', 'Xinjiang', 'Hong Kong', 'Macau'],
  'Brazil': ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'],
  'Mexico': ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico City', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'],
  'Nepal': ['Koshi Pradesh', 'Madhesh Pradesh', 'Bagmati Pradesh', 'Gandaki Pradesh', 'Lumbini Pradesh', 'Karnali Pradesh', 'Sudurpashchim Pradesh'],
  'United Arab Emirates': ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'],
  'Singapore': ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
  'South Africa': ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'],
  'Russia': ['Central Federal District', 'Northwestern Federal District', 'Southern Federal District', 'North Caucasian Federal District', 'Volga Federal District', 'Ural Federal District', 'Siberian Federal District', 'Far Eastern Federal District'],
  'Pakistan': ['Azad Kashmir', 'Balochistan', 'Gilgit-Baltistan', 'Islamabad Capital Territory', 'Khyber Pakhtunkhwa', 'Punjab', 'Sindh'],
  'Bangladesh': ['Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'],
  'Sri Lanka': ['Central Province', 'Eastern Province', 'North Central Province', 'Northern Province', 'North Western Province', 'Sabaragamuwa Province', 'Southern Province', 'Uva Province', 'Western Province'],
  'Indonesia': ['Aceh', 'Bali', 'Banten', 'Bengkulu', 'Central Java', 'Central Kalimantan', 'Central Sulawesi', 'East Java', 'East Kalimantan', 'East Nusa Tenggara', 'Gorontalo', 'Jakarta', 'Jambi', 'Lampung', 'Maluku', 'North Kalimantan', 'North Maluku', 'North Sulawesi', 'North Sumatra', 'Papua', 'Riau', 'Riau Islands', 'South Kalimantan', 'South Sulawesi', 'South Sumatra', 'Southeast Sulawesi', 'West Java', 'West Kalimantan', 'West Nusa Tenggara', 'West Papua', 'West Sulawesi', 'West Sumatra', 'Yogyakarta'],
  'Malaysia': ['Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'],
  'Thailand': ['Bangkok', 'Chiang Mai', 'Chiang Rai', 'Chonburi', 'Khon Kaen', 'Krabi', 'Nakhon Ratchasima', 'Nonthaburi', 'Pathum Thani', 'Phuket', 'Samut Prakan', 'Songkhla', 'Surat Thani', 'Udon Thani'],
  'Vietnam': ['An Giang', 'Ba Ria-Vung Tau', 'Bac Giang', 'Bac Kan', 'Bac Lieu', 'Bac Ninh', 'Ben Tre', 'Binh Dinh', 'Binh Duong', 'Binh Phuoc', 'Binh Thuan', 'Ca Mau', 'Can Tho', 'Cao Bang', 'Da Nang', 'Dak Lak', 'Dak Nong', 'Dien Bien', 'Dong Nai', 'Dong Thap', 'Gia Lai', 'Ha Giang', 'Ha Nam', 'Ha Noi', 'Ha Tinh', 'Hai Duong', 'Hai Phong', 'Hau Giang', 'Ho Chi Minh City', 'Hoa Binh', 'Hung Yen', 'Khanh Hoa', 'Kien Giang', 'Kon Tum', 'Lai Chau', 'Lam Dong', 'Lang Son', 'Lao Cai', 'Long An', 'Nam Dinh', 'Nghe An', 'Ninh Binh', 'Ninh Thuan', 'Phu Tho', 'Phu Yen', 'Quang Binh', 'Quang Nam', 'Quang Ngai', 'Quang Ninh', 'Quang Tri', 'Soc Trang', 'Son La', 'Tay Ninh', 'Thai Binh', 'Thai Nguyen', 'Thanh Hoa', 'Thua Thien Hue', 'Tien Giang', 'Tra Vinh', 'Tuyen Quang', 'Vinh Long', 'Vinh Phuc', 'Yen Bai'],
  'Philippines': ['Ilocos Region', 'Cagayan Valley', 'Central Luzon', 'CALABARZON', 'MIMAROPA', 'Bicol Region', 'Western Visayas', 'Central Visayas', 'Eastern Visayas', 'Zamboanga Peninsula', 'Northern Mindanao', 'Davao Region', 'SOCCSKSARGEN', 'Caraga', 'NCR (Metro Manila)', 'CAR', 'BARMM'],
  'South Korea': ['Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon', 'Ulsan', 'Sejong', 'Gyeonggi', 'Gangwon', 'North Chungcheong', 'South Chungcheong', 'North Jeolla', 'South Jeolla', 'North Gyeongsang', 'South Gyeongsang', 'Jeju'],
  'Netherlands': ['Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'North Brabant', 'North Holland', 'Overijssel', 'South Holland', 'Utrecht', 'Zeeland'],
  'Belgium': ['Brussels-Capital Region', 'Flemish Region', 'Walloon Region', 'Antwerp', 'East Flanders', 'Flemish Brabant', 'Hainaut', 'Liège', 'Limburg', 'Luxembourg', 'Namur', 'Walloon Brabant', 'West Flanders'],
  'Switzerland': ['Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt', 'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel', 'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau', 'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zürich'],
  'Austria': ['Burgenland', 'Carinthia', 'Lower Austria', 'Salzburg', 'Styria', 'Tyrol', 'Upper Austria', 'Vienna', 'Vorarlberg'],
  'Poland': ['Greater Poland', 'Kuyavian-Pomeranian', 'Lesser Poland', 'Łódź', 'Lower Silesian', 'Lublin', 'Lubusz', 'Masovian', 'Opole', 'Podkarpackie', 'Podlaskie', 'Pomeranian', 'Silesian', 'Świętokrzyskie', 'Warmian-Masurian', 'West Pomeranian'],
  'Turkey': ['Marmara Region', 'Central Anatolia Region', 'Aegean Region', 'Mediterranean Region', 'Black Sea Region', 'Eastern Anatolia Region', 'Southeastern Anatolia Region', 'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep'],
  'Egypt': ['Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef', 'Cairo', 'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr El Sheikh', 'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez'],
  'Saudi Arabia': ['Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk', 'Hail', 'Northern Borders', 'Jazan', 'Najran', 'Al-Bahah', 'Al-Jawf', 'Qassim'],
  'Iran': ['Tehran', 'Isfahan', 'Fars', 'Razavi Khorasan', 'East Azerbaijan', 'Khuzestan', 'Mazandaran', 'Kerman', 'Alborz', 'Gilan', 'West Azerbaijan', 'Sistan and Baluchestan', 'Hormozgan', 'Kurdistan', 'Hamadan', 'Lorestan', 'Kermanshah', 'Golestan', 'Markazi', 'Yazd', 'Ardabil', 'Bushehr', 'Zanjan', 'Qom', 'Qazvin', 'Chaharmahal and Bakhtiari', 'South Khorasan', 'North Khorasan', 'Semnan', 'Kohgiluyeh and Boyer-Ahmad', 'Ilam'],
  'Iraq': ['Baghdad', 'Basra', 'Nineveh', 'Erbil', 'Sulaymaniyah', 'Kirkuk', 'Dohuk', 'Anbar', 'Dhi Qar', 'Babylon', 'Diyala', 'Najaf', 'Karbala', 'Wasit', 'Maysan', 'Muthanna', 'Qadisiyyah', 'Saladin'],
  'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos', 'Kajiado', 'Nyeri', 'Meru', 'Kilifi', 'Uasin Gishu', 'Trans Nzoia', 'Kakamega', 'Bungoma', 'Kisii', 'Migori', 'Homa Bay', 'Siaya', 'Nandi'],
  'Nigeria': ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'],
  'Ghana': ['Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo', 'Bono East', 'Ahafo', 'Savannah', 'North East', 'Oti', 'Western North'],
  'Tanzania': ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar', 'Kilimanjaro', 'Tanga', 'Morogoro', 'Mbeya', 'Iringa', 'Tabora', 'Kagera', 'Mara', 'Shinyanga', 'Kigoma'],
  'Ethiopia': ['Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela', 'Harari', 'Oromia', 'Sidama', 'SNNPR', 'Somali', 'Tigray'],
  'Morocco': ['Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Tangier-Tétouan-Al Hoceima', 'Fès-Meknès', 'Marrakech-Safi', 'Souss-Massa', 'Béni Mellal-Khénifra', 'Drâa-Tafilalet', 'Oriental', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab'],
  'Argentina': ['Buenos Aires', 'Buenos Aires City', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'],
  'Colombia': ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'],
  'Chile': ['Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'],
  'Peru': ['Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali'],
  'Venezuela': ['Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Caracas D.C.', 'Cojedes', 'Delta Amacuro', 'Falcón', 'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Vargas', 'Yaracuy', 'Zulia'],
  'New Zealand': ['Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', "Hawke's Bay", 'Manawatū-Whanganui', 'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington', 'West Coast'],
  'Ireland': ['Carlow', 'Cavan', 'Clare', 'Cork', 'Donegal', 'Dublin', 'Galway', 'Kerry', 'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary', 'Waterford', 'Westmeath', 'Wexford', 'Wicklow'],
  'Portugal': ['Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisbon', 'Portalegre', 'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Azores', 'Madeira'],
  'Greece': ['Attica', 'Central Greece', 'Central Macedonia', 'Crete', 'Eastern Macedonia and Thrace', 'Epirus', 'Ionian Islands', 'North Aegean', 'Peloponnese', 'South Aegean', 'Thessaly', 'Western Greece', 'Western Macedonia'],
  'Sweden': ['Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland', 'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten', 'Örebro', 'Östergötland', 'Skåne', 'Södermanland', 'Stockholm', 'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland'],
  'Norway': ['Agder', 'Innlandet', 'Møre og Romsdal', 'Nordland', 'Oslo', 'Rogaland', 'Troms og Finnmark', 'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken'],
  'Denmark': ['Capital Region', 'Central Denmark Region', 'North Denmark Region', 'Region Zealand', 'Region of Southern Denmark'],
  'Finland': ['Uusimaa', 'Southwest Finland', 'Satakunta', 'Kanta-Häme', 'Pirkanmaa', 'Päijät-Häme', 'Kymenlaakso', 'South Karelia', 'South Savo', 'North Savo', 'North Karelia', 'Central Finland', 'South Ostrobothnia', 'Ostrobothnia', 'Central Ostrobothnia', 'North Ostrobothnia', 'Kainuu', 'Lapland', 'Åland'],
  'Czech Republic': ['Prague', 'Central Bohemian', 'South Bohemian', 'Plzeň', 'Karlovy Vary', 'Ústí nad Labem', 'Liberec', 'Hradec Králové', 'Pardubice', 'Vysočina', 'South Moravian', 'Olomouc', 'Zlín', 'Moravian-Silesian'],
  'Hungary': ['Budapest', 'Baranya', 'Bács-Kiskun', 'Békés', 'Borsod-Abaúj-Zemplén', 'Csongrád-Csanád', 'Fejér', 'Győr-Moson-Sopron', 'Hajdú-Bihar', 'Heves', 'Jász-Nagykun-Szolnok', 'Komárom-Esztergom', 'Nógrád', 'Pest', 'Somogy', 'Szabolcs-Szatmár-Bereg', 'Tolna', 'Vas', 'Veszprém', 'Zala'],
  'Romania': ['Bucharest', 'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brăila', 'Brașov', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'],
  'Ukraine': ['Kyiv', 'Cherkasy', 'Chernihiv', 'Chernivtsi', 'Dnipropetrovsk', 'Donetsk', 'Ivano-Frankivsk', 'Kharkiv', 'Kherson', 'Khmelnytskyi', 'Kirovohrad', 'Luhansk', 'Lviv', 'Mykolaiv', 'Odessa', 'Poltava', 'Rivne', 'Sumy', 'Ternopil', 'Vinnytsia', 'Volyn', 'Zakarpattia', 'Zaporizhzhia', 'Zhytomyr'],
  'Qatar': ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Al Shamal', 'Al Daayen', 'Umm Salal', 'Al Shahaniya'],
  'Kuwait': ['Al Asimah', 'Hawalli', 'Al Farwaniyah', 'Al Ahmadi', 'Mubarak Al-Kabeer', 'Al Jahra'],
  'Oman': ['Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah', 'Al Batinah North', 'Al Batinah South', 'Ash Sharqiyah South', 'Ash Sharqiyah North', 'Ad Dhahirah', 'Al Wusta'],
  'Bahrain': ['Capital Governorate', 'Muharraq Governorate', 'Northern Governorate', 'Southern Governorate'],
  'Jordan': ['Amman', 'Irbid', 'Zarqa', 'Balqa', 'Mafraq', 'Karak', 'Tafilah', 'Maan', 'Aqaba', 'Jerash', 'Ajloun', 'Madaba'],
  'Lebanon': ['Beirut', 'Mount Lebanon', 'North Lebanon', 'South Lebanon', 'Beqaa', 'Nabatieh', 'Akkar', 'Baalbek-Hermel'],
  'Myanmar': ['Ayeyarwady', 'Bago', 'Chin', 'Kachin', 'Kayah', 'Kayin', 'Magway', 'Mandalay', 'Mon', 'Naypyidaw', 'Rakhine', 'Sagaing', 'Shan', 'Tanintharyi', 'Yangon'],
  'Cambodia': ['Phnom Penh', 'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum'],
};

// Get states for a country (with "Other" option)
const getStatesList = (countryName: string): string[] => {
  const states = STATES_DATA[countryName] || [];
  return states.length > 0 ? [...states, 'Other'] : [];
};

// Suspense wrapper required for useSearchParams() in Next.js 14
export default function DynamicFormPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-purple-600" size={32} />
      </div>
    }>
      <DynamicFormPage />
    </Suspense>
  );
}

function DynamicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formType = (params.formType as FormType) || 'lead';
  
  // Get URL params for pre-filling
  const workshopParam = searchParams.get('workshop');
  const sourceParam = searchParams.get('source');
  const refParam = searchParams.get('ref');
  
  const config = FORM_CONFIGS[formType] || FORM_CONFIGS.lead;
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string; userId: string } | null>(null);
  
  // User ID lookup (optional - for existing users)
  const [userId, setUserId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [userFound, setUserFound] = useState(false);
  
  // Dynamic countries and states
  const [countries] = useState<string[]>(COUNTRIES);
  const [states, setStates] = useState<string[]>([]);
  const [customState, setCustomState] = useState('');
  const [useCustomState, setUseCustomState] = useState(false);
  const [showCountryCodeInput, setShowCountryCodeInput] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [interest, setInterest] = useState('');
  const [workshopName, setWorkshopName] = useState(workshopParam || '');
  const [workshopLanguage, setWorkshopLanguage] = useState('hindi');
  const [workshopMode, setWorkshopMode] = useState<'online' | 'offline'>('online');
  const [batchPreference, setBatchPreference] = useState('');
  const [courseName, setCourseName] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [message, setMessage] = useState('');
  
  // Password fields (for signup & workshop forms)
  const needsPassword = formType === 'signup' || formType === 'workshop';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Smart user detection (check if user already exists)
  const [existingUser, setExistingUser] = useState(false);
  const [existingUserInfo, setExistingUserInfo] = useState<{ name?: string; maskedEmail?: string } | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced check if user already exists (by email or phone)
  const checkUserExists = useCallback((emailVal: string, phoneVal: string) => {
    if (!needsPassword) return;
    
    // Clear previous timer
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    
    // Need at least email or phone with minimum length
    const hasEmail = emailVal && emailVal.includes('@') && emailVal.includes('.');
    const hasPhone = phoneVal && phoneVal.replace(/\D/g, '').length >= 10;
    
    if (!hasEmail && !hasPhone) {
      setExistingUser(false);
      setExistingUserInfo(null);
      return;
    }
    
    checkTimerRef.current = setTimeout(async () => {
      setCheckingUser(true);
      try {
        const res = await fetch('/api/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailVal || undefined,
            phone: phoneVal || undefined,
          }),
        });
        const data = await res.json();
        if (data.exists) {
          setExistingUser(true);
          setExistingUserInfo({ name: data.name, maskedEmail: data.maskedEmail });
        } else {
          setExistingUser(false);
          setExistingUserInfo(null);
        }
      } catch (_err) {
        // Silently fail — don't block form
      } finally {
        setCheckingUser(false);
      }
    }, 600);
  }, [needsPassword]);

  // Update states when country changes
  useEffect(() => {
    if (country && country !== 'Other') {
      const countryStates = getStatesList(country);
      setStates(countryStates);
      setUseCustomState(false);
      setCustomState('');
      // Reset state when country changes
      if (countryStates.length > 1) {
        setState('');
      } else {
        setState('');
        setUseCustomState(true);
      }
    } else {
      setStates([]);
      setUseCustomState(true);
      setState('');
    }
    
    // Update country code based on country
    const phoneData = COUNTRY_PHONE_CODES[country];
    if (phoneData) {
      setCountryCode(phoneData.code);
    }
  }, [country]);
  
  // Handle user ID lookup
  const handleUserLookup = useCallback(async () => {
    if (!userId || userId.trim().length < 3) return;
    
    setLookupLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/forms/user-lookup?userId=${encodeURIComponent(userId.trim())}`);
      const data = await response.json();
      
      if (data.found && data.user) {
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        setCountryCode(data.user.countryCode || '+91');
        setCountry(data.user.country || 'India');
        // State will be set after country effect runs
        setTimeout(() => {
          if (data.user.state) {
            const countryStates = getStatesList(data.user.country || 'India');
            if (countryStates.includes(data.user.state)) {
              setState(data.user.state);
            } else {
              setCustomState(data.user.state);
              setUseCustomState(true);
            }
          }
        }, 100);
        setGender(data.user.gender || '');
        setAge(data.user.age ? String(data.user.age) : '');
        setProfession(data.user.profession || '');
        setUserFound(true);
      } else {
        setUserFound(false);
        // Don't show error — just let them fill manually
      }
    } catch {
      setError('Failed to lookup user. Please fill manually.');
    } finally {
      setLookupLoading(false);
    }
  }, [userId]);
  
  // Get effective state value
  const getEffectiveState = () => {
    if (useCustomState || state === 'Other') {
      return customState;
    }
    return state;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Password validation for new users on signup/workshop forms
    if (needsPassword && !existingUser) {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
    }
    
    const effectiveState = getEffectiveState();
    
    try {
      const payload = {
        formType,
        source: sourceParam || 'form-link',
        ref: refParam,
        existingUserId: userFound ? userId : undefined,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        countryCode,
        country,
        state: effectiveState,
        ...(needsPassword && !existingUser && password ? { password } : {}),
        ...(config.fields.includes('gender') && { gender }),
        ...(config.fields.includes('age') && { age: parseInt(age) }),
        ...(config.fields.includes('profession') && { profession }),
        ...(config.fields.includes('interest') && { interest }),
        ...(config.fields.includes('workshopName') && { workshopName }),
        ...(config.fields.includes('workshopLanguage') && { workshopLanguage }),
        ...(config.fields.includes('workshopMode') && { workshopMode }),
        ...(config.fields.includes('batchPreference') && { batchPreference }),
        ...(config.fields.includes('courseName') && { courseName }),
        ...(config.fields.includes('paymentMode') && { paymentMode }),
        ...(config.fields.includes('message') && { message }),
      };
      
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      
      if (data.credentials) {
        setCredentials(data.credentials);
      }
      setSubmitted(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  if (submitted) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-2xl mx-auto px-4 py-16">
            <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100 text-center">
              <div className={`w-20 h-20 bg-${config.color}-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
                <CheckCircle className={`text-${config.color}-600`} size={40} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You! 🎉</h1>
              <p className="text-gray-600 mb-6">
                Your submission has been received. We'll contact you soon via WhatsApp and email.
              </p>
              
              {credentials && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6 text-left border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <Lock size={20} />
                    Your Login Credentials
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                      <span className="text-sm text-gray-600">User ID:</span>
                      <code className="font-mono font-bold text-emerald-700">{credentials.userId}</code>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                      <span className="text-sm text-gray-600">Email:</span>
                      <code className="font-mono font-bold text-emerald-700">{credentials.email}</code>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                      <span className="text-sm text-gray-600">Password:</span>
                      <code className="font-mono font-bold text-emerald-700 text-lg">{credentials.password}</code>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600 mt-4">
                    ⚠️ Save these credentials! They have been sent to your WhatsApp and email.
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signin"
                  className={`px-8 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg`}
                >
                  Login Now
                </Link>
                <Link
                  href="/community"
                  className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Explore Community
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <div className={`bg-gradient-to-br ${config.gradient} rounded-3xl p-8 sm:p-10 mb-8 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
              <span className="text-5xl mb-4 block">{config.icon}</span>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{config.title}</h1>
              <p className="text-white/90">{config.subtitle}</p>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* User ID Lookup - Only for workshop form */}
              {formType === 'workshop' && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <label className="block text-sm font-bold text-purple-700 mb-2">
                    <Search size={14} className="inline mr-2" />
                    Already Registered? Enter Your ID (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => {
                        setUserId(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                        setUserFound(false);
                      }}
                      placeholder="e.g. 518520"
                      className="flex-1 h-12 px-4 border border-purple-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <button
                      type="button"
                      onClick={handleUserLookup}
                      disabled={lookupLoading || !userId}
                      className="px-6 h-12 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {lookupLoading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                      Fetch
                    </button>
                  </div>
                  {userFound && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle size={12} /> User found! Form auto-filled.
                    </p>
                  )}
                  <p className="text-xs text-purple-600 mt-2">
                    💡 Enter your 6-digit Profile ID to auto-fill your details. Find it in your account or email.
                  </p>
                </div>
              )}
              
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <User size={14} className="inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Mail size={14} className="inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (needsPassword) checkUserExists(e.target.value, phone);
                  }}
                  placeholder="your.email@example.com"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                />
              </div>
              
              {/* Phone with Country Code */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Phone size={14} className="inline mr-2" />
                  WhatsApp Number *
                </label>
                <div className="flex gap-2">
                  {/* Editable Country Code with Flag */}
                  <div className="relative">
                    <div className="flex items-center h-12 border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <span className="text-xl pl-3">{COUNTRY_PHONE_CODES[country]?.flag || '🌍'}</span>
                      <input
                        type="text"
                        value={countryCode}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (!val.startsWith('+')) val = '+' + val.replace(/[^0-9]/g, '');
                          else val = '+' + val.slice(1).replace(/[^0-9]/g, '');
                          setCountryCode(val.slice(0, 6));
                        }}
                        className="w-20 h-full px-2 text-sm font-bold outline-none bg-transparent"
                        placeholder="+91"
                      />
                    </div>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setPhone(val);
                      if (needsPassword) checkUserExists(email, val);
                    }}
                    placeholder="9876543210"
                    className="flex-1 h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">📱 {COUNTRY_PHONE_CODES[country]?.flag} Country code auto-updates with country. You can edit it manually.</p>
              </div>
              
              {/* Country & State */}
              {config.fields.includes('country') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Globe size={14} className="inline mr-2" />
                      Country *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                      required
                    >
                      {countries.map(c => (
                        <option key={c} value={c}>
                          {COUNTRY_PHONE_CODES[c]?.flag || '🌍'} {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <MapPin size={14} className="inline mr-2" />
                      State/Province *
                    </label>
                    {states.length > 0 && !useCustomState ? (
                      <select
                        value={state}
                        onChange={(e) => {
                          if (e.target.value === 'Other') {
                            setUseCustomState(true);
                            setState('Other');
                          } else {
                            setState(e.target.value);
                          }
                        }}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      >
                        <option value="">Select State/Province</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={customState}
                          onChange={(e) => setCustomState(e.target.value)}
                          placeholder="Enter your state/province"
                          className="w-full h-12 px-4 pr-24 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                          required
                        />
                        {states.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomState(false);
                              setCustomState('');
                              setState('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-600 hover:underline bg-white px-2"
                          >
                            ↓ Show list
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Signup specific fields */}
              {formType === 'signup' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Gender *</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full h-12 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Calendar size={14} className="inline mr-1" />
                        Age *
                      </label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age"
                        min="13"
                        max="100"
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Briefcase size={14} className="inline mr-1" />
                        Profession *
                      </label>
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="Your work"
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Workshop specific fields */}
              {formType === 'workshop' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <BookOpen size={14} className="inline mr-2" />
                      Workshop Name *
                    </label>
                    <select
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                      required
                    >
                      <option value="">Select Workshop</option>
                      {WORKSHOPS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Language *</label>
                      <select
                        value={workshopLanguage}
                        onChange={(e) => setWorkshopLanguage(e.target.value)}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                        required
                      >
                        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Mode *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setWorkshopMode('online')}
                          className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all ${
                            workshopMode === 'online'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🌐 Online
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkshopMode('offline')}
                          className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all ${
                            workshopMode === 'offline'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🏢 Offline
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Users size={14} className="inline mr-2" />
                      Batch Preference (Optional)
                    </label>
                    <input
                      type="text"
                      value={batchPreference}
                      onChange={(e) => setBatchPreference(e.target.value)}
                      placeholder="e.g., Morning batch, Weekend batch, etc."
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </>
              )}
              
              {/* Lead specific - Interest */}
              {config.fields.includes('interest') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">What are you interested in?</label>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Select your interest</option>
                    <option value="yoga-workshop">Yoga Workshops</option>
                    <option value="meditation">Meditation</option>
                    <option value="fitness">Fitness Programs</option>
                    <option value="philosophy">Philosophy Classes</option>
                    <option value="counseling">Personal Counseling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              
              {/* Inquiry - Message */}
              {config.fields.includes('message') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    rows={4}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
                  />
                </div>
              )}
              
              {/* Already Registered Popup */}
              {needsPassword && existingUser && existingUserInfo && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <UserCheck className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-green-800">
                      Already Registered! 🎉
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {existingUserInfo.name ? `Welcome back, ${existingUserInfo.name}!` : 'Welcome back!'} 
                      {existingUserInfo.maskedEmail ? ` (${existingUserInfo.maskedEmail})` : ''} 
                      You already have an account — no need to create a password.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Checking user indicator */}
              {needsPassword && checkingUser && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader className="animate-spin" size={12} />
                  Checking if you&apos;re already registered...
                </div>
              )}
              
              {/* Password Fields (only for new users on signup/workshop) */}
              {needsPassword && !existingUser && (
                <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">
                    🔐 Create a password to access your account after registration
                  </p>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Lock size={14} className="inline mr-2" />
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full h-12 px-4 pr-12 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Lock size={14} className="inline mr-2" />
                      Confirm Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`w-full h-12 px-4 border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${
                        confirmPassword && confirmPassword !== password
                          ? 'border-red-300 bg-red-50'
                          : confirmPassword && confirmPassword === password
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200'
                      }`}
                      required
                      minLength={6}
                    />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword && confirmPassword === password && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={12} /> Passwords match
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className={`p-6 bg-gradient-to-r ${config.gradient} bg-opacity-5`}>
              <button
                type="submit"
                disabled={loading}
                className={`w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${config.gradient} hover:opacity-90`
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Submitting...
                  </>
                ) : (
                  <>
                    {needsPassword && !existingUser ? 'Register & Create Account' : 'Submit Registration'}
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-4">
                By submitting, you agree to receive updates via WhatsApp and email.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
