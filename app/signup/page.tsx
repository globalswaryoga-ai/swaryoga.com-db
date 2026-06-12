'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { addCartItem, CartCurrency } from '@/lib/cart';
import { getCurrencyForLanguage } from '@/lib/paymentLinkHelper';
import { setSession } from '@/lib/sessionManager';

export const dynamic = 'force-dynamic';

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';
  const workshop = searchParams.get('workshop') || 'swar-yoga-basic';
  const mode = searchParams.get('mode') || 'online';
  const language = searchParams.get('language') || 'hindi';

  const currency = (getCurrencyForLanguage(language) as CartCurrency) || 'INR';

  const workshopDisplayName = workshop
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    country: '',
    state: '',
    gender: '',
    age: '',
    profession: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [useCustomState, setUseCustomState] = useState(false);
  const [customState, setCustomState] = useState('');

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const detectedCountry = data.country_name;

        if (detectedCountry) {
          setFormData(prev => ({ ...prev, country: detectedCountry }));

          const countryCodeMap: Record<string, string> = {
            'India': '+91',
            'United States': '+1',
            'United Kingdom': '+44',
            'Australia': '+61',
            'Nepal': '+977',
            'Singapore': '+65',
            'United Arab Emirates': '+971'
          };

          if (countryCodeMap[detectedCountry]) {
            setFormData(prev => ({ ...prev, countryCode: countryCodeMap[detectedCountry] }));
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('Could not detect location:', error);
        }
      }
    };

    detectCountry();
  }, []);

  const countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
    { code: '+977', country: 'Nepal' },
    { code: '+65', country: 'Singapore' },
    { code: '+971', country: 'UAE' },
  ];

  const indianStates = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
    'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kashmir and Jammu', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories',
    'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
  ];

  const australianStates = [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
  ];

  const italianRegions = [
    'Abruzzo', 'Aosta Valley', 'Apulia', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardy', 'Marche', 'Molise', 'Piedmont',
    'Sardinia', 'Sicily', 'Trentino-South Tyrol', 'Tuscany', 'Umbria', 'Veneto'
  ];

  const nepalProvinces = [
    'Koshi Pradesh', 'Madhesh Pradesh', 'Bagmati Pradesh', 'Gandaki Pradesh',
    'Lumbini Pradesh', 'Karnali Pradesh', 'Sudurpashchim Pradesh'
  ];

  const ukRegions = ['England', 'Scotland', 'Wales', 'Northern Ireland'];

  const uaeEmirates = [
    'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'
  ];

  const singaporeRegions = [
    'Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'
  ];

  const germanStates = [
    'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse',
    'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate',
    'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
  ];

  const franceRegions = [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire',
    'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine',
    'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
  ];

  const southAfricaProvinces = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ];

  const brazilStates = [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
    'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba',
    'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
    'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
  ];

  const mexicoStates = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Mexico City',
    'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
    'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
    'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  const japanPrefectures = [
    'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima',
    'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa',
    'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano',
    'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo',
    'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi',
    'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki',
    'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'
  ];

  const chinaProvinces = [
    'Beijing', 'Shanghai', 'Tianjin', 'Chongqing', 'Hebei', 'Shanxi', 'Liaoning', 'Jilin',
    'Heilongjiang', 'Jiangsu', 'Zhejiang', 'Anhui', 'Fujian', 'Jiangxi', 'Shandong',
    'Henan', 'Hubei', 'Hunan', 'Guangdong', 'Hainan', 'Sichuan', 'Guizhou', 'Yunnan',
    'Shaanxi', 'Gansu', 'Qinghai', 'Taiwan', 'Guangxi', 'Inner Mongolia', 'Tibet',
    'Ningxia', 'Xinjiang', 'Hong Kong', 'Macau'
  ];

  const spainCommunities = [
    'Andalusia', 'Aragon', 'Asturias', 'Balearic Islands', 'Basque Country', 'Canary Islands',
    'Cantabria', 'Castile and León', 'Castile-La Mancha', 'Catalonia', 'Ceuta', 'Extremadura',
    'Galicia', 'La Rioja', 'Madrid', 'Melilla', 'Murcia', 'Navarre', 'Valencian Community'
  ];

  const russiaDistricts = [
    'Central Federal District', 'Northwestern Federal District', 'Southern Federal District',
    'North Caucasian Federal District', 'Volga Federal District', 'Ural Federal District',
    'Siberian Federal District', 'Far Eastern Federal District'
  ];

  const pakistanProvinces = [
    'Azad Kashmir', 'Balochistan', 'Gilgit-Baltistan', 'Islamabad Capital Territory',
    'Khyber Pakhtunkhwa', 'Punjab', 'Sindh'
  ];

  const bangladeshDivisions = [
    'Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'
  ];

  const sriLankaProvinces = [
    'Central Province', 'Eastern Province', 'North Central Province', 'Northern Province',
    'North Western Province', 'Sabaragamuwa Province', 'Southern Province', 'Uva Province', 'Western Province'
  ];

  const indonesiaProvinces = [
    'Aceh', 'Bali', 'Banten', 'Bengkulu', 'Central Java', 'Central Kalimantan', 'Central Sulawesi',
    'East Java', 'East Kalimantan', 'East Nusa Tenggara', 'Gorontalo', 'Jakarta', 'Jambi', 'Lampung',
    'Maluku', 'North Kalimantan', 'North Maluku', 'North Sulawesi', 'North Sumatra', 'Papua',
    'Riau', 'Riau Islands', 'South Kalimantan', 'South Sulawesi', 'South Sumatra', 'Southeast Sulawesi',
    'West Java', 'West Kalimantan', 'West Nusa Tenggara', 'West Papua', 'West Sulawesi', 'West Sumatra', 'Yogyakarta'
  ];

  const malaysiaStates = [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
  ];

  const thailandProvinces = [
    'Bangkok', 'Chiang Mai', 'Chiang Rai', 'Chonburi', 'Khon Kaen', 'Krabi', 'Nakhon Ratchasima',
    'Nonthaburi', 'Pathum Thani', 'Phuket', 'Samut Prakan', 'Songkhla', 'Surat Thani', 'Udon Thani'
  ];

  const vietnamProvinces = [
    'An Giang', 'Ba Ria-Vung Tau', 'Bac Giang', 'Bac Kan', 'Bac Lieu', 'Bac Ninh', 'Ben Tre',
    'Binh Dinh', 'Binh Duong', 'Binh Phuoc', 'Binh Thuan', 'Ca Mau', 'Can Tho', 'Cao Bang',
    'Da Nang', 'Dak Lak', 'Dak Nong', 'Dien Bien', 'Dong Nai', 'Dong Thap', 'Gia Lai',
    'Ha Giang', 'Ha Nam', 'Ha Noi', 'Ha Tinh', 'Hai Duong', 'Hai Phong', 'Hau Giang',
    'Ho Chi Minh City', 'Hoa Binh', 'Hung Yen', 'Khanh Hoa', 'Kien Giang', 'Kon Tum',
    'Lai Chau', 'Lam Dong', 'Lang Son', 'Lao Cai', 'Long An', 'Nam Dinh', 'Nghe An',
    'Ninh Binh', 'Ninh Thuan', 'Phu Tho', 'Phu Yen', 'Quang Binh', 'Quang Nam', 'Quang Ngai',
    'Quang Ninh', 'Quang Tri', 'Soc Trang', 'Son La', 'Tay Ninh', 'Thai Binh', 'Thai Nguyen',
    'Thanh Hoa', 'Thua Thien Hue', 'Tien Giang', 'Tra Vinh', 'Tuyen Quang', 'Vinh Long', 'Vinh Phuc', 'Yen Bai'
  ];

  const philippinesRegions = [
    'Ilocos Region', 'Cagayan Valley', 'Central Luzon', 'CALABARZON', 'MIMAROPA', 'Bicol Region',
    'Western Visayas', 'Central Visayas', 'Eastern Visayas', 'Zamboanga Peninsula', 'Northern Mindanao',
    'Davao Region', 'SOCCSKSARGEN', 'Caraga', 'NCR (Metro Manila)', 'CAR', 'BARMM'
  ];

  const southKoreaProvinces = [
    'Seoul', 'Busan', 'Daegu', 'Incheon', 'Gwangju', 'Daejeon', 'Ulsan', 'Sejong',
    'Gyeonggi', 'Gangwon', 'North Chungcheong', 'South Chungcheong', 'North Jeolla',
    'South Jeolla', 'North Gyeongsang', 'South Gyeongsang', 'Jeju'
  ];

  const netherlandsProvinces = [
    'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg',
    'North Brabant', 'North Holland', 'Overijssel', 'South Holland', 'Utrecht', 'Zeeland'
  ];

  const belgiumRegions = [
    'Brussels-Capital Region', 'Flemish Region', 'Walloon Region',
    'Antwerp', 'East Flanders', 'Flemish Brabant', 'Hainaut', 'Liège',
    'Limburg', 'Luxembourg', 'Namur', 'Walloon Brabant', 'West Flanders'
  ];

  const switzerlandCantons = [
    'Aargau', 'Appenzell Ausserrhoden', 'Appenzell Innerrhoden', 'Basel-Landschaft', 'Basel-Stadt',
    'Bern', 'Fribourg', 'Geneva', 'Glarus', 'Graubünden', 'Jura', 'Lucerne', 'Neuchâtel',
    'Nidwalden', 'Obwalden', 'Schaffhausen', 'Schwyz', 'Solothurn', 'St. Gallen', 'Thurgau',
    'Ticino', 'Uri', 'Valais', 'Vaud', 'Zug', 'Zürich'
  ];

  const austriaStates = [
    'Burgenland', 'Carinthia', 'Lower Austria', 'Salzburg', 'Styria',
    'Tyrol', 'Upper Austria', 'Vienna', 'Vorarlberg'
  ];

  const polandVoivodeships = [
    'Greater Poland', 'Kuyavian-Pomeranian', 'Lesser Poland', 'Łódź', 'Lower Silesian',
    'Lublin', 'Lubusz', 'Masovian', 'Opole', 'Podkarpackie', 'Podlaskie', 'Pomeranian',
    'Silesian', 'Świętokrzyskie', 'Warmian-Masurian', 'West Pomeranian'
  ];

  const turkeyRegions = [
    'Marmara Region', 'Central Anatolia Region', 'Aegean Region', 'Mediterranean Region',
    'Black Sea Region', 'Eastern Anatolia Region', 'Southeastern Anatolia Region',
    'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep'
  ];

  const egyptGovernorates = [
    'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef', 'Cairo', 'Dakahlia', 'Damietta',
    'Faiyum', 'Gharbia', 'Giza', 'Ismailia', 'Kafr El Sheikh', 'Luxor', 'Matruh', 'Minya',
    'Monufia', 'New Valley', 'North Sinai', 'Port Said', 'Qalyubia', 'Qena', 'Red Sea',
    'Sharqia', 'Sohag', 'South Sinai', 'Suez'
  ];

  const saudiRegions = [
    'Riyadh', 'Makkah', 'Madinah', 'Eastern Province', 'Asir', 'Tabuk', 'Hail',
    'Northern Borders', 'Jazan', 'Najran', 'Al-Bahah', 'Al-Jawf', 'Qassim'
  ];

  const iranProvinces = [
    'Tehran', 'Isfahan', 'Fars', 'Razavi Khorasan', 'East Azerbaijan', 'Khuzestan',
    'Mazandaran', 'Kerman', 'Alborz', 'Gilan', 'West Azerbaijan', 'Sistan and Baluchestan',
    'Hormozgan', 'Kurdistan', 'Hamadan', 'Lorestan', 'Kermanshah', 'Golestan', 'Markazi',
    'Yazd', 'Ardabil', 'Bushehr', 'Zanjan', 'Qom', 'Qazvin', 'Chaharmahal and Bakhtiari',
    'South Khorasan', 'North Khorasan', 'Semnan', 'Kohgiluyeh and Boyer-Ahmad', 'Ilam'
  ];

  const iraqGovernorates = [
    'Baghdad', 'Basra', 'Nineveh', 'Erbil', 'Sulaymaniyah', 'Kirkuk', 'Dohuk',
    'Anbar', 'Dhi Qar', 'Babylon', 'Diyala', 'Najaf', 'Karbala', 'Wasit',
    'Maysan', 'Muthanna', 'Qadisiyyah', 'Saladin'
  ];

  const kenyaCounties = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kiambu', 'Machakos',
    'Kajiado', 'Nyeri', 'Meru', 'Kilifi', 'Uasin Gishu', 'Trans Nzoia', 'Kakamega',
    'Bungoma', 'Kisii', 'Migori', 'Homa Bay', 'Siaya', 'Nandi'
  ];

  const nigeriaStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
    'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
    'Taraba', 'Yobe', 'Zamfara'
  ];

  const ghanaRegions = [
    'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta', 'Northern',
    'Upper East', 'Upper West', 'Brong-Ahafo', 'Bono East', 'Ahafo', 'Savannah',
    'North East', 'Oti', 'Western North'
  ];

  const tanzaniaRegions = [
    'Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar', 'Kilimanjaro', 'Tanga',
    'Morogoro', 'Mbeya', 'Iringa', 'Tabora', 'Kagera', 'Mara', 'Shinyanga', 'Kigoma'
  ];

  const ethiopiaRegions = [
    'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambela',
    'Harari', 'Oromia', 'Sidama', 'SNNPR', 'Somali', 'Tigray'
  ];

  const moroccoRegions = [
    'Casablanca-Settat', 'Rabat-Salé-Kénitra', 'Tangier-Tétouan-Al Hoceima', 'Fès-Meknès',
    'Marrakech-Safi', 'Souss-Massa', 'Béni Mellal-Khénifra', 'Drâa-Tafilalet',
    'Oriental', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab'
  ];

  const argentinaProvinces = [
    'Buenos Aires', 'Buenos Aires City', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
    'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza',
    'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz',
    'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'
  ];

  const colombiaDepartments = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
    'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
    'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés', 'Santander',
    'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
  ];

  const chileRegions = [
    'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
    'Metropolitana de Santiago', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía',
    'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
  ];

  const peruRegions = [
    'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao',
    'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque',
    'Lima', 'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno',
    'San Martín', 'Tacna', 'Tumbes', 'Ucayali'
  ];

  const venezuelaStates = [
    'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo',
    'Caracas D.C.', 'Cojedes', 'Delta Amacuro', 'Falcón', 'Guárico', 'Lara', 'Mérida',
    'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
    'Vargas', 'Yaracuy', 'Zulia'
  ];

  const newZealandRegions = [
    'Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', "Hawke's Bay", 'Manawatū-Whanganui',
    'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman',
    'Waikato', 'Wellington', 'West Coast'
  ];

  const irelandCounties = [
    'Carlow', 'Cavan', 'Clare', 'Cork', 'Donegal', 'Dublin', 'Galway', 'Kerry',
    'Kildare', 'Kilkenny', 'Laois', 'Leitrim', 'Limerick', 'Longford', 'Louth',
    'Mayo', 'Meath', 'Monaghan', 'Offaly', 'Roscommon', 'Sligo', 'Tipperary',
    'Waterford', 'Westmeath', 'Wexford', 'Wicklow'
  ];

  const portugalDistricts = [
    'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora',
    'Faro', 'Guarda', 'Leiria', 'Lisbon', 'Portalegre', 'Porto', 'Santarém',
    'Setúbal', 'Viana do Castelo', 'Vila Real', 'Viseu', 'Azores', 'Madeira'
  ];

  const greeceRegions = [
    'Attica', 'Central Greece', 'Central Macedonia', 'Crete', 'Eastern Macedonia and Thrace',
    'Epirus', 'Ionian Islands', 'North Aegean', 'Peloponnese', 'South Aegean',
    'Thessaly', 'Western Greece', 'Western Macedonia'
  ];

  const swedenCounties = [
    'Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland', 'Jämtland', 'Jönköping',
    'Kalmar', 'Kronoberg', 'Norrbotten', 'Örebro', 'Östergötland', 'Skåne', 'Södermanland',
    'Stockholm', 'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland'
  ];

  const norwayCounties = [
    'Agder', 'Innlandet', 'Møre og Romsdal', 'Nordland', 'Oslo', 'Rogaland',
    'Troms og Finnmark', 'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken'
  ];

  const denmarkRegions = [
    'Capital Region', 'Central Denmark Region', 'North Denmark Region', 'Region Zealand', 'Region of Southern Denmark'
  ];

  const finlandRegions = [
    'Uusimaa', 'Southwest Finland', 'Satakunta', 'Kanta-Häme', 'Pirkanmaa', 'Päijät-Häme',
    'Kymenlaakso', 'South Karelia', 'South Savo', 'North Savo', 'North Karelia', 'Central Finland',
    'South Ostrobothnia', 'Ostrobothnia', 'Central Ostrobothnia', 'North Ostrobothnia', 'Kainuu', 'Lapland', 'Åland'
  ];

  const czechRegions = [
    'Prague', 'Central Bohemian', 'South Bohemian', 'Plzeň', 'Karlovy Vary', 'Ústí nad Labem',
    'Liberec', 'Hradec Králové', 'Pardubice', 'Vysočina', 'South Moravian', 'Olomouc', 'Zlín', 'Moravian-Silesian'
  ];

  const hungaryCounties = [
    'Budapest', 'Baranya', 'Bács-Kiskun', 'Békés', 'Borsod-Abaúj-Zemplén', 'Csongrád-Csanád',
    'Fejér', 'Győr-Moson-Sopron', 'Hajdú-Bihar', 'Heves', 'Jász-Nagykun-Szolnok', 'Komárom-Esztergom',
    'Nógrád', 'Pest', 'Somogy', 'Szabolcs-Szatmár-Bereg', 'Tolna', 'Vas', 'Veszprém', 'Zala'
  ];

  const romaniaCounties = [
    'Bucharest', 'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
    'Brăila', 'Brașov', 'Buzău', 'Călărași', 'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna',
    'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița',
    'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Sălaj',
    'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea'
  ];

  const ukraineOblasts = [
    'Kyiv', 'Cherkasy', 'Chernihiv', 'Chernivtsi', 'Dnipropetrovsk', 'Donetsk', 'Ivano-Frankivsk',
    'Kharkiv', 'Kherson', 'Khmelnytskyi', 'Kirovohrad', 'Luhansk', 'Lviv', 'Mykolaiv', 'Odessa',
    'Poltava', 'Rivne', 'Sumy', 'Ternopil', 'Vinnytsia', 'Volyn', 'Zakarpattia', 'Zaporizhzhia', 'Zhytomyr'
  ];

  const qatarMunicipalities = [
    'Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Al Shamal', 'Al Daayen', 'Umm Salal', 'Al Shahaniya'
  ];

  const kuwaitGovernorates = [
    'Al Asimah', 'Hawalli', 'Al Farwaniyah', 'Al Ahmadi', 'Mubarak Al-Kabeer', 'Al Jahra'
  ];

  const omanGovernorates = [
    'Muscat', 'Dhofar', 'Musandam', 'Al Buraimi', 'Ad Dakhiliyah', 'Al Batinah North',
    'Al Batinah South', 'Ash Sharqiyah South', 'Ash Sharqiyah North', 'Ad Dhahirah', 'Al Wusta'
  ];

  const bahrainGovernorates = [
    'Capital Governorate', 'Muharraq Governorate', 'Northern Governorate', 'Southern Governorate'
  ];

  const jordanGovernorates = [
    'Amman', 'Irbid', 'Zarqa', 'Balqa', 'Mafraq', 'Karak', 'Tafilah', 'Maan', 'Aqaba', 'Jerash', 'Ajloun', 'Madaba'
  ];

  const lebanonGovernorates = [
    'Beirut', 'Mount Lebanon', 'North Lebanon', 'South Lebanon', 'Beqaa', 'Nabatieh', 'Akkar', 'Baalbek-Hermel'
  ];

  const myanmarStates = [
    'Ayeyarwady', 'Bago', 'Chin', 'Kachin', 'Kayah', 'Kayin', 'Magway', 'Mandalay',
    'Mon', 'Naypyidaw', 'Rakhine', 'Sagaing', 'Shan', 'Tanintharyi', 'Yangon'
  ];

  const cambodiaProvinces = [
    'Phnom Penh', 'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang',
    'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratie',
    'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng',
    'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum'
  ];

  const getStatesList = (country: string): string[] => {
    const statesMap: Record<string, string[]> = {
      'India': indianStates, 'United States': usStates, 'Canada': canadianProvinces, 'Australia': australianStates,
      'Italy': italianRegions, 'Nepal': nepalProvinces, 'United Kingdom': ukRegions, 'United Arab Emirates': uaeEmirates,
      'Singapore': singaporeRegions, 'Germany': germanStates, 'France': franceRegions, 'South Africa': southAfricaProvinces,
      'Brazil': brazilStates, 'Mexico': mexicoStates, 'Japan': japanPrefectures, 'China': chinaProvinces, 'Spain': spainCommunities,
      'Russia': russiaDistricts, 'Pakistan': pakistanProvinces, 'Bangladesh': bangladeshDivisions, 'Sri Lanka': sriLankaProvinces,
      'Indonesia': indonesiaProvinces, 'Malaysia': malaysiaStates, 'Thailand': thailandProvinces, 'Vietnam': vietnamProvinces,
      'Philippines': philippinesRegions, 'South Korea': southKoreaProvinces, 'Netherlands': netherlandsProvinces, 'Belgium': belgiumRegions,
      'Switzerland': switzerlandCantons, 'Austria': austriaStates, 'Poland': polandVoivodeships, 'Turkey': turkeyRegions,
      'Egypt': egyptGovernorates, 'Saudi Arabia': saudiRegions, 'Iran': iranProvinces, 'Iraq': iraqGovernorates, 'Kenya': kenyaCounties,
      'Nigeria': nigeriaStates, 'Ghana': ghanaRegions, 'Tanzania': tanzaniaRegions, 'Ethiopia': ethiopiaRegions, 'Morocco': moroccoRegions,
      'Argentina': argentinaProvinces, 'Colombia': colombiaDepartments, 'Chile': chileRegions, 'Peru': peruRegions, 'Venezuela': venezuelaStates,
      'New Zealand': newZealandRegions, 'Ireland': irelandCounties, 'Portugal': portugalDistricts, 'Greece': greeceRegions, 'Sweden': swedenCounties,
      'Norway': norwayCounties, 'Denmark': denmarkRegions, 'Finland': finlandRegions, 'Czech Republic': czechRegions, 'Hungary': hungaryCounties,
      'Romania': romaniaCounties, 'Ukraine': ukraineOblasts, 'Qatar': qatarMunicipalities, 'Kuwait': kuwaitGovernorates, 'Oman': omanGovernorates,
      'Bahrain': bahrainGovernorates, 'Jordan': jordanGovernorates, 'Lebanon': lebanonGovernorates, 'Myanmar': myanmarStates, 'Cambodia': cambodiaProvinces,
    };
    return [...(statesMap[country] || []), 'Other'];
  };

  const countries = [
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.state) newErrors.state = 'State/Province is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.age) newErrors.age = 'Age is required';
    else if (parseInt(formData.age) < 13) newErrors.age = 'You must be at least 13 years old';
    if (!formData.profession.trim()) newErrors.profession = 'Profession is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters long';
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { setSubmitStatus('error'); return; }
    setIsSubmitting(true);
    setSubmitStatus(null);
    try {
      const requestPayload = {
        name: formData.name.trim(), email: formData.email.trim(), phone: formData.phone.trim(),
        countryCode: formData.countryCode || '+91', country: formData.country.trim(), state: formData.state.trim(),
        gender: formData.gender.trim(), age: formData.age.toString(), profession: formData.profession.trim(), password: formData.password,
      };
      const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload) });
      const raw = await response.json().catch(() => ({}));
      const responsePayload = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
      if (!response.ok) {
        const errorMessage = (responsePayload as any)?.error || (raw as any)?.error || 'Signup failed';
        console.error('❌ Signup error:', errorMessage);
        setErrors({ general: errorMessage });
        setSubmitStatus('error');
        throw new Error(errorMessage);
      }
      setSubmitStatus('success');
      const storedUser = {
        id: (responsePayload as any)?.user?.id || '',
        name: (responsePayload as any)?.user?.name || formData.name.trim(),
        email: (responsePayload as any)?.user?.email || formData.email.trim(),
        phone: (responsePayload as any)?.user?.phone || formData.phone.trim(),
        countryCode: (responsePayload as any)?.user?.countryCode || formData.countryCode || '+91'
      };
      const token: string | undefined = (responsePayload as any)?.token;
      if (token) { setSession({ token, user: storedUser }); }
      addCartItem({
        id: `${workshop}-${mode}-${language}`,
        name: `${workshopDisplayName} (${mode.charAt(0).toUpperCase() + mode.slice(1)} - ${language.charAt(0).toUpperCase() + language.slice(1)})`,
        price: currency === 'USD' ? 29 : 999, quantity: 1, currency, workshop, mode, language,
      });
      setShowSuccessPopup(true);
      setTimeout(() => { router.push('/'); }, 3000);
    } catch (err) {
      console.error('Sign-up error:', err);
      setErrors({ general: 'An error occurred. Please try again.' });
      setSubmitStatus('error');
    } finally { setIsSubmitting(false); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'country') { setFormData(prev => ({ ...prev, state: '' })); setUseCustomState(false); setCustomState(''); }
    if (errors[name]) { setErrors((prev) => ({ ...prev, [name]: '' })); }
    if (errors.general) { setErrors((prev) => ({ ...prev, general: '' })); }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 bg-gradient-to-br from-yoga-50 via-white to-yoga-50">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-yoga-100">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 sm:w-16 h-12 sm:h-16 bg-yoga-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">👤</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yoga-700 mb-2">Create Your Account</h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">Join Swar Yoga and start your transformation journey</p>
              {redirectPath && redirectPath !== '/' && (
                <div className="mt-3 text-xs sm:text-sm text-yoga-600 font-medium">
                  Sign up to continue to {redirectPath === 'account' ? 'your account' : redirectPath === 'cart' ? 'your cart' : redirectPath === 'checkout' ? 'checkout' : redirectPath}
                </div>
              )}
            </div>

            {submitStatus === 'success' && (
              <div className="mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3 text-xs sm:text-sm">
                <span className="text-green-600 text-lg sm:text-xl">✓</span>
                <span className="text-green-800 font-medium">Account created successfully! Redirecting...</span>
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-xs sm:text-sm">
                <span className="text-red-600 text-lg sm:text-xl">⚠</span>
                <span className="text-red-800 font-medium">{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Personal Information</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors text-sm ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      placeholder="Enter your full name" />
                    {errors.name && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors text-sm ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      placeholder="your@email.com" />
                    {errors.email && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="w-full sm:w-28 lg:w-32">
                      <select id="countryCode" name="countryCode" value={formData.countryCode} onChange={handleInputChange}
                        className="w-full px-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-xs sm:text-sm">
                        {countryCodes.map((item) => (<option key={item.code} value={item.code}>{item.code}</option>))}
                      </select>
                    </div>
                    <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange}
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm"
                      placeholder="Enter your phone number" />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="country" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <select id="country" name="country" value={formData.country} onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm">
                      <option value="">Select Country</option>
                      {countries.map((country) => (<option key={country} value={country}>{country}</option>))}
                    </select>
                    {errors.country && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.country}</p>}
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">State/Province {formData.country && '*'}</label>
                    {formData.country ? (
                      formData.country === 'Other' || useCustomState ? (
                        <div className="relative">
                          <input type="text" id="state" name="state" value={customState}
                            onChange={(e) => { setCustomState(e.target.value); setFormData(prev => ({ ...prev, state: e.target.value })); }}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-20 sm:pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm"
                            placeholder="Enter your state/province" />
                          {formData.country !== 'Other' && getStatesList(formData.country).length > 1 && (
                            <button type="button" onClick={() => { setUseCustomState(false); setCustomState(''); setFormData(prev => ({ ...prev, state: '' })); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-yoga-600 hover:underline bg-white px-2 whitespace-nowrap">↓ Show list</button>
                          )}
                        </div>
                      ) : (
                        <select id="state" name="state" value={formData.state}
                          onChange={(e) => { if (e.target.value === 'Other') { setUseCustomState(true); setFormData(prev => ({ ...prev, state: '' })); } else { handleInputChange(e); } }}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm">
                          <option value="">Select State/Province</option>
                          {getStatesList(formData.country).map((state) => (<option key={state} value={state}>{state}</option>))}
                        </select>
                      )
                    ) : (
                      <input type="text" id="state" name="state" value={formData.state} onChange={handleInputChange}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
                        placeholder="Select a country first" disabled />
                    )}
                    {errors.state && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.state}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="gender" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Gender *</label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm">
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    {errors.gender && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.gender}</p>}
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Age *</label>
                    <input type="number" id="age" name="age" value={formData.age} onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm"
                      placeholder="Your age" min="1" max="120" />
                    {errors.age && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.age}</p>}
                  </div>

                  <div>
                    <label htmlFor="profession" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Profession *</label>
                    <input type="text" id="profession" name="profession" value={formData.profession} onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm"
                      placeholder="Your profession" />
                    {errors.profession && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.profession}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Security</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleInputChange}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors text-sm ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                        placeholder="Create a password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                        {showPassword ? '👁️‍🗨️' : '👁️'}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange}
                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent transition-colors text-sm ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                        placeholder="Confirm your password" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                        {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-gray-200">
                <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer">
                  <input type="checkbox" name="agreeToTerms" checked={formData.agreeToTerms} onChange={handleInputChange}
                    className="mt-1 w-4 sm:w-5 h-4 sm:h-5 border-gray-300 rounded text-yoga-600 focus:ring-yoga-500 cursor-pointer flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    I agree to the <Link href="/terms" className="text-yoga-600 hover:text-yoga-700 font-medium">Terms and Conditions</Link> and
                    <Link href="/privacy" className="text-yoga-600 hover:text-yoga-700 font-medium"> Privacy Policy</Link>
                  </span>
                </label>
                {errors.agreeToTerms && <p className="text-xs sm:text-sm text-red-600">{errors.agreeToTerms}</p>}
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-bold hover:from-yoga-700 hover:to-yoga-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base">
                {isSubmitting ? (
                  <><div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-b-2 border-white"></div><span>Creating Account...</span></>
                ) : (
                  <><span>👤</span><span>Create Account</span></>
                )}
              </button>
            </form>

            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Already have an account? <Link href={`/signin${redirectPath && redirectPath !== '/' ? `?redirect=${redirectPath}` : ''}`} className="text-yoga-600 hover:text-yoga-700 font-bold">Sign in here</Link>
              </p>
            </div>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yoga-50 border border-yoga-200 rounded-lg text-center">
              <p className="text-xs sm:text-sm text-yoga-800">
                ✨ After creating your account, you can access your personal Life Planner to track your transformation journey.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
            <div className="mb-4 sm:mb-6 flex justify-center">
              <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-3xl sm:text-4xl">✅</span>
              </div>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2">Welcome to Swar Yoga!</h2>
            <p className="text-base sm:text-lg text-green-600 font-semibold mb-2">You are signed up well! 🎉</p>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">You're auto logged in and ready to begin your yoga journey.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-left">
              <p className="text-xs sm:text-sm text-gray-700"><span className="font-semibold">Name:</span> {formData.name}</p>
              <p className="text-xs sm:text-sm text-gray-700"><span className="font-semibold">Email:</span> {formData.email}</p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-gray-500 mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yoga-600"></div>
              <span>Redirecting to cart in 3 seconds...</span>
            </div>
            <button onClick={() => { setShowSuccessPopup(false); router.push('/cart'); }}
              className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 text-white py-2.5 sm:py-3 px-4 rounded-lg font-bold hover:from-yoga-700 hover:to-yoga-800 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base">
              Continue to Cart
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  );
}