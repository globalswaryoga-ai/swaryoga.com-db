export interface LocationCity {
  name: string;
  latitude: number;
  longitude: number;
}

export interface LocationState {
  name: string;
  cities: LocationCity[];
}

export interface LocationCountry {
  name: string;
  states: LocationState[];
}

export const locationData: LocationCountry[] = [
  {
    name: 'Argentina',
    states: [
      {
        name: 'Buenos Aires',
        cities: [
          { name: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816 },
          { name: 'La Plata', latitude: -34.9214, longitude: -57.9544 },
          { name: 'Quilmes', latitude: -34.7301, longitude: -58.2561 },
          { name: 'Morón', latitude: -34.6476, longitude: -58.6258 }
        ]
      },
      {
        name: 'Córdoba',
        cities: [
          { name: 'Córdoba', latitude: -31.4201, longitude: -64.1888 },
          { name: 'Villa Carlos Paz', latitude: -31.424, longitude: -64.5009 },
          { name: 'Jesús María', latitude: -31.3891, longitude: -64.4008 }
        ]
      },
      {
        name: 'Santa Fe',
        cities: [
          { name: 'Rosario', latitude: -32.9368, longitude: -60.6553 },
          { name: 'Santa Fe', latitude: -31.6109, longitude: -60.6837 }
        ]
      },
      {
        name: 'Mendoza',
        cities: [
          { name: 'Mendoza', latitude: -32.8895, longitude: -68.8458 },
          { name: 'San Juan', latitude: -31.5375, longitude: -68.5186 }
        ]
      }
    ]
  },
  {
    name: 'Australia',
    states: [
      {
        name: 'New South Wales',
        cities: [
          { name: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
          { name: 'Newcastle', latitude: -32.9283, longitude: 151.7817 }
        ]
      },
      {
        name: 'Victoria',
        cities: [
          { name: 'Melbourne', latitude: -37.8136, longitude: 144.9631 },
          { name: 'Geelong', latitude: -38.1499, longitude: 144.3617 }
        ]
      },
      {
        name: 'Queensland',
        cities: [
          { name: 'Brisbane', latitude: -27.4698, longitude: 153.0251 },
          { name: 'Gold Coast', latitude: -28.0167, longitude: 153.4 }
        ]
      }
    ]
  },
  {
    name: 'Brazil',
    states: [
      {
        name: 'São Paulo',
        cities: [
          { name: 'São Paulo', latitude: -23.5505, longitude: -46.6333 },
          { name: 'Campinas', latitude: -22.9056, longitude: -47.0608 },
          { name: 'Santos', latitude: -23.9608, longitude: -46.3338 },
          { name: 'Ribeirão Preto', latitude: -21.1767, longitude: -47.8105 }
        ]
      },
      {
        name: 'Rio de Janeiro',
        cities: [
          { name: 'Rio de Janeiro', latitude: -22.9068, longitude: -43.1729 },
          { name: 'Niterói', latitude: -22.8833, longitude: -43.1 },
          { name: 'Duque de Caxias', latitude: -22.7859, longitude: -43.3089 }
        ]
      },
      {
        name: 'Minas Gerais',
        cities: [
          { name: 'Belo Horizonte', latitude: -19.9167, longitude: -43.9345 },
          { name: 'Uberlândia', latitude: -18.9142, longitude: -48.2756 },
          { name: 'Juiz de Fora', latitude: -21.7626, longitude: -43.3519 }
        ]
      },
      {
        name: 'Bahia',
        cities: [
          { name: 'Salvador', latitude: -12.9714, longitude: -38.5014 },
          { name: 'Feira de Santana', latitude: -12.2667, longitude: -38.9667 }
        ]
      },
      {
        name: 'Ceará',
        cities: [
          { name: 'Fortaleza', latitude: -3.7319, longitude: -38.5267 },
          { name: 'Caucaia', latitude: -3.7469, longitude: -38.6554 }
        ]
      }
    ]
  },
  {
    name: 'Canada',
    states: [
      {
        name: 'Ontario',
        cities: [
          { name: 'Toronto', latitude: 43.6532, longitude: -79.3832 },
          { name: 'Ottawa', latitude: 45.4215, longitude: -75.6972 },
          { name: 'Hamilton', latitude: 43.2557, longitude: -79.8711 },
          { name: 'London', latitude: 42.9849, longitude: -81.245 }
        ]
      },
      {
        name: 'British Columbia',
        cities: [
          { name: 'Vancouver', latitude: 49.2827, longitude: -123.1207 },
          { name: 'Victoria', latitude: 48.4284, longitude: -123.3656 },
          { name: 'Kelowna', latitude: 49.8879, longitude: -119.496 }
        ]
      },
      {
        name: 'Alberta',
        cities: [
          { name: 'Calgary', latitude: 51.0447, longitude: -114.0719 },
          { name: 'Edmonton', latitude: 53.5461, longitude: -113.4938 },
          { name: 'Red Deer', latitude: 52.2681, longitude: -113.8112 }
        ]
      },
      {
        name: 'Quebec',
        cities: [
          { name: 'Montreal', latitude: 45.5017, longitude: -73.5673 },
          { name: 'Quebec City', latitude: 46.8139, longitude: -71.2080 }
        ]
      },
      {
        name: 'Manitoba',
        cities: [
          { name: 'Winnipeg', latitude: 49.8951, longitude: -97.1384 }
        ]
      }
    ]
  },
  {
    name: 'Denmark',
    states: [
      {
        name: 'Capital Region',
        cities: [
          { name: 'Copenhagen', latitude: 55.6761, longitude: 12.5683 },
          { name: 'Roskilde', latitude: 55.6426, longitude: 12.0782 },
          { name: 'Lyngby', latitude: 55.7704, longitude: 12.5030 }
        ]
      },
      {
        name: 'Central Denmark',
        cities: [
          { name: 'Aarhus', latitude: 56.1629, longitude: 10.2039 },
          { name: 'Randers', latitude: 56.4707, longitude: 10.0419 },
          { name: 'Horsens', latitude: 55.8685, longitude: 9.8524 }
        ]
      },
      {
        name: 'North Denmark',
        cities: [
          { name: 'Aalborg', latitude: 57.0488, longitude: 9.9217 },
          { name: 'Hjørring', latitude: 57.4630, longitude: 9.9841 }
        ]
      },
      {
        name: 'Southern Denmark',
        cities: [
          { name: 'Odense', latitude: 55.4037, longitude: 10.3875 },
          { name: 'Esbjerg', latitude: 55.4670, longitude: 8.4517 }
        ]
      }
    ]
  },
  {
    name: 'Egypt',
    states: [
      {
        name: 'Cairo',
        cities: [
          { name: 'Cairo', latitude: 30.0444, longitude: 31.2357 },
          { name: 'Giza', latitude: 30.0131, longitude: 31.2089 },
          { name: 'Helwan', latitude: 29.8606, longitude: 31.3284 }
        ]
      },
      {
        name: 'Alexandria',
        cities: [
          { name: 'Alexandria', latitude: 31.2001, longitude: 29.9187 },
          { name: 'Abu Qir', latitude: 31.3184, longitude: 30.1819 }
        ]
      },
      {
        name: 'Giza',
        cities: [
          { name: 'Sheikh Zayed', latitude: 30.0071, longitude: 31.0055 },
          { name: '6th of October City', latitude: 29.9915, longitude: 31.0033 }
        ]
      },
      {
        name: 'Qalyubia',
        cities: [
          { name: 'Banha', latitude: 30.4662, longitude: 31.1871 },
          { name: 'Benha', latitude: 30.4662, longitude: 31.1871 }
        ]
      },
      {
        name: 'Red Sea',
        cities: [
          { name: 'Hurghada', latitude: 27.2577, longitude: 33.8132 },
          { name: 'Safaga', latitude: 26.7307, longitude: 33.9371 }
        ]
      }
    ]
  },
  {
    name: 'France',
    states: [
      {
        name: 'Île-de-France',
        cities: [
          { name: 'Paris', latitude: 48.8566, longitude: 2.3522 },
          { name: 'Versailles', latitude: 48.8048, longitude: 2.1303 },
          { name: 'Boulogne-Billancourt', latitude: 48.8355, longitude: 2.2399 }
        ]
      },
      {
        name: 'Provence-Alpes-Côte d\'Azur',
        cities: [
          { name: 'Marseille', latitude: 43.2965, longitude: 5.3698 },
          { name: 'Nice', latitude: 43.7102, longitude: 7.262 },
          { name: 'Cannes', latitude: 43.5528, longitude: 7.0176 }
        ]
      },
      {
        name: 'Auvergne-Rhône-Alpes',
        cities: [
          { name: 'Lyon', latitude: 45.764, longitude: 4.8357 },
          { name: 'Grenoble', latitude: 45.1885, longitude: 5.7245 },
          { name: 'Saint-Étienne', latitude: 45.4398, longitude: 4.3898 }
        ]
      },
      {
        name: 'Nouvelle-Aquitaine',
        cities: [
          { name: 'Bordeaux', latitude: 44.8378, longitude: -0.5792 },
          { name: 'Limoges', latitude: 45.8336, longitude: 1.2611 }
        ]
      },
      {
        name: 'Grand Est',
        cities: [
          { name: 'Strasbourg', latitude: 48.5734, longitude: 7.7521 },
          { name: 'Metz', latitude: 49.1193, longitude: 6.1757 }
        ]
      }
    ]
  },
  {
    name: 'Germany',
    states: [
      {
        name: 'Bavaria',
        cities: [
          { name: 'Munich', latitude: 48.1351, longitude: 11.582 },
          { name: 'Nuremberg', latitude: 49.4521, longitude: 11.0767 },
          { name: 'Augsburg', latitude: 48.3626, longitude: 10.8963 },
          { name: 'Regensburg', latitude: 48.9743, longitude: 12.1017 }
        ]
      },
      {
        name: 'North Rhine-Westphalia',
        cities: [
          { name: 'Cologne', latitude: 50.9375, longitude: 6.9603 },
          { name: 'Düsseldorf', latitude: 51.2277, longitude: 6.7735 },
          { name: 'Dortmund', latitude: 51.5136, longitude: 7.4653 },
          { name: 'Essen', latitude: 51.4556, longitude: 7.0116 }
        ]
      },
      {
        name: 'Berlin',
        cities: [
          { name: 'Berlin', latitude: 52.52, longitude: 13.405 },
          { name: 'Potsdam', latitude: 52.3906, longitude: 13.0645 }
        ]
      },
      {
        name: 'Hesse',
        cities: [
          { name: 'Frankfurt', latitude: 50.1109, longitude: 8.6821 },
          { name: 'Wiesbaden', latitude: 50.0829, longitude: 8.2429 }
        ]
      },
      {
        name: 'Baden-Württemberg',
        cities: [
          { name: 'Stuttgart', latitude: 48.7758, longitude: 9.1829 },
          { name: 'Mannheim', latitude: 49.4891, longitude: 8.4673 }
        ]
      }
    ]
  },
  {
    name: 'Hungary',
    states: [
      {
        name: 'Central Hungary',
        cities: [
          { name: 'Budapest', latitude: 47.4979, longitude: 19.0402 },
          { name: 'Óbuda', latitude: 47.5297, longitude: 19.0329 },
          { name: 'Pest', latitude: 47.4980, longitude: 19.0404 }
        ]
      },
      {
        name: 'Northern Great Plain',
        cities: [
          { name: 'Debrecen', latitude: 47.5316, longitude: 21.6273 },
          { name: 'Nyíregyháza', latitude: 47.9537, longitude: 21.7287 },
          { name: 'Miskolc', latitude: 48.0939, longitude: 20.7734 }
        ]
      },
      {
        name: 'Southern Great Plain',
        cities: [
          { name: 'Szeged', latitude: 46.253, longitude: 20.1414 },
          { name: 'Kecskemét', latitude: 46.8973, longitude: 19.6872 }
        ]
      },
      {
        name: 'Transdanubia',
        cities: [
          { name: 'Pécs', latitude: 46.0727, longitude: 18.2294 },
          { name: 'Győr', latitude: 47.6875, longitude: 17.6458 }
        ]
      }
    ]
  },
  {
    name: 'India',
    states: [
      {
        name: 'Maharashtra',
        cities: [
          { name: 'Mumbai', latitude: 19.076, longitude: 72.8777 },
          { name: 'Pune', latitude: 18.5204, longitude: 73.8567 },
          { name: 'Nagpur', latitude: 21.1458, longitude: 79.0882 },
          { name: 'Aurangabad', latitude: 19.8762, longitude: 75.3433 }
        ]
      },
      {
        name: 'Karnataka',
        cities: [
          { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 },
          { name: 'Mysuru', latitude: 12.2958, longitude: 76.6394 },
          { name: 'Mangalore', latitude: 12.9141, longitude: 74.856 },
          { name: 'Hubballi', latitude: 15.3647, longitude: 75.1240 }
        ]
      },
      {
        name: 'Delhi',
        cities: [
          { name: 'New Delhi', latitude: 28.6139, longitude: 77.209 },
          { name: 'Delhi', latitude: 28.7041, longitude: 77.1025 },
          { name: 'Gurugram', latitude: 28.4595, longitude: 77.0266 }
        ]
      },
      {
        name: 'Tamil Nadu',
        cities: [
          { name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
          { name: 'Coimbatore', latitude: 11.0168, longitude: 76.9558 },
          { name: 'Madurai', latitude: 9.9252, longitude: 78.1198 },
          { name: 'Tiruppur', latitude: 11.1085, longitude: 77.3410 }
        ]
      },
      {
        name: 'Uttar Pradesh',
        cities: [
          { name: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
          { name: 'Varanasi', latitude: 25.3176, longitude: 82.9739 },
          { name: 'Kanpur', latitude: 26.4499, longitude: 80.3319 },
          { name: 'Agra', latitude: 27.1767, longitude: 78.0081 }
        ]
      },
      {
        name: 'West Bengal',
        cities: [
          { name: 'Kolkata', latitude: 22.5726, longitude: 88.3639 },
          { name: 'Siliguri', latitude: 26.7271, longitude: 88.3953 },
          { name: 'Asansol', latitude: 23.685, longitude: 86.9645 }
        ]
      },
      {
        name: 'Rajasthan',
        cities: [
          { name: 'Jaipur', latitude: 26.9124, longitude: 75.7873 },
          { name: 'Udaipur', latitude: 24.5854, longitude: 73.7125 },
          { name: 'Jodhpur', latitude: 26.2389, longitude: 73.0243 }
        ]
      },
      {
        name: 'Gujarat',
        cities: [
          { name: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714 },
          { name: 'Surat', latitude: 21.1702, longitude: 72.8311 },
          { name: 'Vadodara', latitude: 22.3072, longitude: 73.1812 }
        ]
      },
      {
        name: 'Andhra Pradesh',
        cities: [
          { name: 'Amaravati', latitude: 16.5062, longitude: 80.648 },
          { name: 'Vijayawada', latitude: 16.5062, longitude: 80.648 },
          { name: 'Visakhapatnam', latitude: 17.6868, longitude: 83.2185 }
        ]
      },
      {
        name: 'Telangana',
        cities: [
          { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
          { name: 'Warangal', latitude: 17.9689, longitude: 79.5941 },
          { name: 'Nizamabad', latitude: 18.6728, longitude: 78.094 }
        ]
      },
      {
        name: 'Kerala',
        cities: [
          { name: 'Thiruvananthapuram', latitude: 8.5241, longitude: 76.9366 },
          { name: 'Kochi', latitude: 9.9312, longitude: 76.2673 },
          { name: 'Kozhikode', latitude: 11.2588, longitude: 75.7804 }
        ]
      },
      {
        name: 'Punjab',
        cities: [
          { name: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
          { name: 'Amritsar', latitude: 31.634, longitude: 74.8723 },
          { name: 'Ludhiana', latitude: 30.9, longitude: 75.8573 }
        ]
      }
    ]
  },
  {
    name: 'Japan',
    states: [
      {
        name: 'Tokyo',
        cities: [
          { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
          { name: 'Yokohama', latitude: 35.4437, longitude: 139.6380 },
          { name: 'Kawasaki', latitude: 35.5307, longitude: 139.7029 }
        ]
      },
      {
        name: 'Osaka',
        cities: [
          { name: 'Osaka', latitude: 34.6937, longitude: 135.5023 },
          { name: 'Kobe', latitude: 34.6901, longitude: 135.1955 },
          { name: 'Kyoto', latitude: 35.0116, longitude: 135.7681 }
        ]
      },
      {
        name: 'Aichi',
        cities: [
          { name: 'Nagoya', latitude: 35.1815, longitude: 136.9066 },
          { name: 'Toyota', latitude: 35.0828, longitude: 137.1552 }
        ]
      },
      {
        name: 'Fukuoka',
        cities: [
          { name: 'Fukuoka', latitude: 33.5904, longitude: 130.4017 },
          { name: 'Kitakyushu', latitude: 33.8837, longitude: 130.8755 }
        ]
      },
      {
        name: 'Hokkaido',
        cities: [
          { name: 'Sapporo', latitude: 43.0642, longitude: 141.3469 },
          { name: 'Asahikawa', latitude: 43.7709, longitude: 142.3643 }
        ]
      }
    ]
  },
  {
    name: 'Kenya',
    states: [
      {
        name: 'Nairobi County',
        cities: [
          { name: 'Nairobi', latitude: -1.2921, longitude: 36.8219 },
          { name: 'Kiambu', latitude: -1.1711, longitude: 36.8067 },
          { name: 'Machakos', latitude: -2.7149, longitude: 37.2632 }
        ]
      },
      {
        name: 'Mombasa County',
        cities: [
          { name: 'Mombasa', latitude: -4.0435, longitude: 39.6682 },
          { name: 'Diani', latitude: -4.3033, longitude: 39.5811 }
        ]
      },
      {
        name: 'Kisumu County',
        cities: [
          { name: 'Kisumu', latitude: -0.0917, longitude: 34.7678 },
          { name: 'Kericho', latitude: -0.3667, longitude: 35.2833 }
        ]
      },
      {
        name: 'Nakuru County',
        cities: [
          { name: 'Nakuru', latitude: -0.2833, longitude: 36.0667 },
          { name: 'Naivasha', latitude: -0.7167, longitude: 36.4333 }
        ]
      }
    ]
  },
  {
    name: 'Lebanon',
    states: [
      {
        name: 'Beirut',
        cities: [
          { name: 'Beirut', latitude: 33.8938, longitude: 35.5018 },
          { name: 'Byblos', latitude: 34.1241, longitude: 35.6426 },
          { name: 'Batroun', latitude: 34.2507, longitude: 35.6592 }
        ]
      },
      {
        name: 'North Governorate',
        cities: [
          { name: 'Tripoli', latitude: 34.4367, longitude: 35.8499 },
          { name: 'Akkar', latitude: 34.5667, longitude: 35.9333 }
        ]
      },
      {
        name: 'South Governorate',
        cities: [
          { name: 'Sidon', latitude: 33.5599, longitude: 35.3685 },
          { name: 'Tyre', latitude: 33.2732, longitude: 35.1988 }
        ]
      },
      {
        name: 'Bekaa',
        cities: [
          { name: 'Zahlé', latitude: 33.8528, longitude: 35.8999 },
          { name: 'Baalbek', latitude: 34.0052, longitude: 36.2036 }
        ]
      }
    ]
  },
  {
    name: 'Mexico',
    states: [
      {
        name: 'Mexico City',
        cities: [
          { name: 'Mexico City', latitude: 19.4326, longitude: -99.1332 },
          { name: 'Iztapalapa', latitude: 19.3538, longitude: -99.0603 }
        ]
      },
      {
        name: 'Jalisco',
        cities: [
          { name: 'Guadalajara', latitude: 20.6597, longitude: -103.3496 },
          { name: 'Zapopan', latitude: 20.7139, longitude: -103.3892 },
          { name: 'Tlaquepaque', latitude: 20.6141, longitude: -103.3141 }
        ]
      },
      {
        name: 'Nuevo León',
        cities: [
          { name: 'Monterrey', latitude: 25.6866, longitude: -100.3161 },
          { name: 'San Nicolás de los Garza', latitude: 25.7542, longitude: -100.3022 },
          { name: 'Guadalupe', latitude: 25.6747, longitude: -100.2622 }
        ]
      },
      {
        name: 'Puebla',
        cities: [
          { name: 'Puebla', latitude: 19.0504, longitude: -98.2367 },
          { name: 'Cholula', latitude: 19.0591, longitude: -98.3056 }
        ]
      },
      {
        name: 'Veracruz',
        cities: [
          { name: 'Veracruz', latitude: 19.1899, longitude: -96.1269 },
          { name: 'Xalapa', latitude: 19.5267, longitude: -96.7289 }
        ]
      }
    ]
  },
  {
    name: 'Netherlands',
    states: [
      {
        name: 'North Holland',
        cities: [
          { name: 'Amsterdam', latitude: 52.3676, longitude: 4.9041 },
          { name: 'Haarlem', latitude: 52.3798, longitude: 4.6309 },
          { name: 'Zaandam', latitude: 52.4384, longitude: 4.8141 }
        ]
      },
      {
        name: 'South Holland',
        cities: [
          { name: 'Rotterdam', latitude: 51.9244, longitude: 4.4777 },
          { name: 'The Hague', latitude: 52.0705, longitude: 4.3007 },
          { name: 'Dordrecht', latitude: 51.8134, longitude: 4.6405 }
        ]
      },
      {
        name: 'Utrecht',
        cities: [
          { name: 'Utrecht', latitude: 52.0907, longitude: 5.1214 },
          { name: 'Amersfoort', latitude: 52.1501, longitude: 5.3877 }
        ]
      },
      {
        name: 'Flevoland',
        cities: [
          { name: 'Lelystad', latitude: 52.5086, longitude: 5.4761 },
          { name: 'Almere', latitude: 52.3702, longitude: 5.1848 }
        ]
      }
    ]
  },
  // O - Oman
  {
    name: 'Oman',
    states: [
      {
        name: 'Muscat',
        cities: [
          { name: 'Muscat', latitude: 23.588, longitude: 58.3829 },
          { name: 'Ruwi', latitude: 23.6100, longitude: 58.5400 },
          { name: 'Seeb', latitude: 23.6233, longitude: 58.1603 }
        ]
      },
      {
        name: 'Dhofar',
        cities: [
          { name: 'Salalah', latitude: 17.0193, longitude: 54.0897 },
          { name: 'Qurayyat', latitude: 17.6822, longitude: 54.1242 }
        ]
      },
      {
        name: 'Ad Dakhiliyah',
        cities: [
          { name: 'Nizwa', latitude: 22.9342, longitude: 57.5272 },
          { name: 'Bahla', latitude: 22.9758, longitude: 57.2913 }
        ]
      },
      {
        name: 'Al Batinah',
        cities: [
          { name: 'Sohar', latitude: 24.3456, longitude: 56.6992 },
          { name: 'Saham', latitude: 24.4667, longitude: 56.8333 }
        ]
      }
    ]
  },

  // P - Portugal
  {
    name: 'Portugal',
    states: [
      {
        name: 'Lisbon',
        cities: [
          { name: 'Lisbon', latitude: 38.7223, longitude: -9.1393 },
          { name: 'Almada', latitude: 38.6867, longitude: -9.1561 },
          { name: 'Sintra', latitude: 38.8028, longitude: -9.3883 }
        ]
      },
      {
        name: 'Porto',
        cities: [
          { name: 'Porto', latitude: 41.1579, longitude: -8.6291 },
          { name: 'Vila Nova de Gaia', latitude: 41.1365, longitude: -8.6228 },
          { name: 'Maia', latitude: 41.2298, longitude: -8.6193 }
        ]
      },
      {
        name: 'Algarve',
        cities: [
          { name: 'Faro', latitude: 37.0194, longitude: -7.9304 },
          { name: 'Loulé', latitude: 37.1422, longitude: -8.0270 }
        ]
      },
      {
        name: 'Covilhã',
        cities: [
          { name: 'Covilhã', latitude: 40.2881, longitude: -7.5025 },
          { name: 'Guarda', latitude: 40.5386, longitude: -7.2699 }
        ]
      }
    ]
  },

  // Q - Qatar
  {
    name: 'Qatar',
    states: [
      {
        name: 'Doha',
        cities: [
          { name: 'Doha', latitude: 25.2854, longitude: 51.5310 },
          { name: 'Lusail', latitude: 25.2854, longitude: 51.5310 },
          { name: 'West Bay', latitude: 25.2854, longitude: 51.5310 }
        ]
      },
      {
        name: 'Al Rayyan',
        cities: [
          { name: 'Al Rayyan', latitude: 25.2854, longitude: 51.3926 },
          { name: 'Umm Salal', latitude: 25.3333, longitude: 51.5000 }
        ]
      },
      {
        name: 'Al Wakrah',
        cities: [
          { name: 'Al Wakrah', latitude: 25.1600, longitude: 51.6000 }
        ]
      },
      {
        name: 'Umm Bab',
        cities: [
          { name: 'Umm Bab', latitude: 25.2000, longitude: 50.8000 }
        ]
      }
    ]
  },

  // R - Russia
  {
    name: 'Russia',
    states: [
      {
        name: 'Moscow',
        cities: [
          { name: 'Moscow', latitude: 55.7558, longitude: 37.6173 },
          { name: 'Zelenograd', latitude: 55.9883, longitude: 37.1944 },
          { name: 'Krasnogorsk', latitude: 55.8244, longitude: 37.3244 }
        ]
      },
      {
        name: 'Saint Petersburg',
        cities: [
          { name: 'Saint Petersburg', latitude: 59.9311, longitude: 30.3609 },
          { name: 'Kronstadt', latitude: 59.9878, longitude: 29.7644 }
        ]
      },
      {
        name: 'Tatarstan',
        cities: [
          { name: 'Kazan', latitude: 55.7887, longitude: 49.1221 },
          { name: 'Naberezhnye Chelny', latitude: 55.7411, longitude: 52.4142 }
        ]
      },
      {
        name: 'Sverdlovsk',
        cities: [
          { name: 'Yekaterinburg', latitude: 56.8389, longitude: 60.6057 },
          { name: 'Nizhny Tagil', latitude: 57.9100, longitude: 59.9700 }
        ]
      },
      {
        name: 'Novosibirsk',
        cities: [
          { name: 'Novosibirsk', latitude: 55.0415, longitude: 82.9346 },
          { name: 'Berdsk', latitude: 54.7333, longitude: 83.1000 }
        ]
      }
    ]
  },

  // S - Spain
  {
    name: 'Spain',
    states: [
      {
        name: 'Madrid',
        cities: [
          { name: 'Madrid', latitude: 40.4168, longitude: -3.7038 },
          { name: 'Alcalá de Henares', latitude: 40.4844, longitude: -3.3581 },
          { name: 'Getafe', latitude: 40.3053, longitude: -3.7283 }
        ]
      },
      {
        name: 'Catalonia',
        cities: [
          { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734 },
          { name: 'Hospitalet de Llobregat', latitude: 41.3601, longitude: 2.1140 },
          { name: 'Terrassa', latitude: 41.5633, longitude: 2.0068 }
        ]
      },
      {
        name: 'Andalusia',
        cities: [
          { name: 'Seville', latitude: 37.3891, longitude: -5.9845 },
          { name: 'Málaga', latitude: 36.7213, longitude: -4.4214 },
          { name: 'Córdoba', latitude: 37.8882, longitude: -4.7663 }
        ]
      },
      {
        name: 'Valencia',
        cities: [
          { name: 'Valencia', latitude: 39.4699, longitude: -0.3763 },
          { name: 'Torrent', latitude: 39.4531, longitude: -0.4307 }
        ]
      },
      {
        name: 'Basque Country',
        cities: [
          { name: 'Bilbao', latitude: 43.2630, longitude: -2.9350 },
          { name: 'Vitoria-Gasteiz', latitude: 42.8465, longitude: -2.6734 }
        ]
      }
    ]
  },

  // T - Turkey
  {
    name: 'Turkey',
    states: [
      {
        name: 'Istanbul',
        cities: [
          { name: 'Istanbul', latitude: 41.0082, longitude: 28.9784 },
          { name: 'Çekmeköy', latitude: 41.0852, longitude: 29.1878 },
          { name: 'Esenyurt', latitude: 41.0185, longitude: 28.7293 }
        ]
      },
      {
        name: 'Ankara',
        cities: [
          { name: 'Ankara', latitude: 39.9334, longitude: 32.8597 },
          { name: 'Çankaya', latitude: 39.9246, longitude: 32.8574 }
        ]
      },
      {
        name: 'Izmir',
        cities: [
          { name: 'Izmir', latitude: 38.4237, longitude: 27.1428 },
          { name: 'Alsancak', latitude: 38.4351, longitude: 27.1428 },
          { name: 'Konak', latitude: 38.4195, longitude: 27.0990 }
        ]
      },
      {
        name: 'Antalya',
        cities: [
          { name: 'Antalya', latitude: 36.9071, longitude: 30.7138 },
          { name: 'Alanya', latitude: 36.5411, longitude: 32.0023 }
        ]
      },
      {
        name: 'Gaziantep',
        cities: [
          { name: 'Gaziantep', latitude: 37.0662, longitude: 37.3833 },
          { name: 'Kayseri', latitude: 38.7334, longitude: 35.4857 }
        ]
      }
    ]
  },

  // U - United Kingdom
  {
    name: 'United Kingdom',
    states: [
      {
        name: 'England',
        cities: [
          { name: 'London', latitude: 51.5074, longitude: -0.1278 },
          { name: 'Manchester', latitude: 53.4808, longitude: -2.2426 },
          { name: 'Birmingham', latitude: 52.4862, longitude: -1.8904 },
          { name: 'Leeds', latitude: 53.8008, longitude: -1.5491 }
        ]
      },
      {
        name: 'Scotland',
        cities: [
          { name: 'Edinburgh', latitude: 55.9533, longitude: -3.1883 },
          { name: 'Glasgow', latitude: 55.8642, longitude: -4.2518 },
          { name: 'Aberdeen', latitude: 57.1497, longitude: -2.0943 }
        ]
      },
      {
        name: 'Wales',
        cities: [
          { name: 'Cardiff', latitude: 51.4816, longitude: -3.1791 },
          { name: 'Swansea', latitude: 51.6214, longitude: -3.9436 },
          { name: 'Newport', latitude: 51.5880, longitude: -3.0094 }
        ]
      },
      {
        name: 'Northern Ireland',
        cities: [
          { name: 'Belfast', latitude: 54.5973, longitude: -5.9301 },
          { name: 'Derry', latitude: 54.9973, longitude: -7.1679 }
        ]
      }
    ]
  },

  // U - United States
  {
    name: 'United States',
    states: [
      {
        name: 'California',
        cities: [
          { name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437 },
          { name: 'San Francisco', latitude: 37.7749, longitude: -122.4194 },
          { name: 'San Diego', latitude: 32.7157, longitude: -117.1611 },
          { name: 'San Jose', latitude: 37.3382, longitude: -121.8863 }
        ]
      },
      {
        name: 'Texas',
        cities: [
          { name: 'Austin', latitude: 30.2672, longitude: -97.7431 },
          { name: 'Dallas', latitude: 32.7767, longitude: -96.797 },
          { name: 'Houston', latitude: 29.7604, longitude: -95.3698 },
          { name: 'San Antonio', latitude: 29.4241, longitude: -98.4936 }
        ]
      },
      {
        name: 'New York',
        cities: [
          { name: 'New York City', latitude: 40.7128, longitude: -74.006 },
          { name: 'Buffalo', latitude: 42.8864, longitude: -78.8784 },
          { name: 'Rochester', latitude: 43.1566, longitude: -77.6088 }
        ]
      },
      {
        name: 'Florida',
        cities: [
          { name: 'Miami', latitude: 25.7617, longitude: -80.1918 },
          { name: 'Orlando', latitude: 28.5383, longitude: -81.3792 },
          { name: 'Tampa', latitude: 27.9506, longitude: -82.4572 }
        ]
      },
      {
        name: 'Illinois',
        cities: [
          { name: 'Chicago', latitude: 41.8781, longitude: -87.6298 }
        ]
      }
    ]
  },

  // V - Vietnam
  {
    name: 'Vietnam',
    states: [
      {
        name: 'Hanoi',
        cities: [
          { name: 'Hanoi', latitude: 21.0278, longitude: 105.8342 },
          { name: 'Bac Giang', latitude: 21.2708, longitude: 106.1883 },
          { name: 'Hai Phong', latitude: 20.8449, longitude: 106.6881 }
        ]
      },
      {
        name: 'Ho Chi Minh City',
        cities: [
          { name: 'Ho Chi Minh City', latitude: 10.8231, longitude: 106.6297 },
          { name: 'Thu Duc', latitude: 10.8364, longitude: 106.7789 },
          { name: 'Bien Hoa', latitude: 10.9747, longitude: 106.8241 }
        ]
      },
      {
        name: 'Da Nang',
        cities: [
          { name: 'Da Nang', latitude: 16.0544, longitude: 108.2022 },
          { name: 'Hoi An', latitude: 15.8801, longitude: 108.3380 }
        ]
      },
      {
        name: 'Can Tho',
        cities: [
          { name: 'Can Tho', latitude: 10.0379, longitude: 105.7869 }
        ]
      },
      {
        name: 'Da Lat',
        cities: [
          { name: 'Da Lat', latitude: 11.9404, longitude: 108.4453 }
        ]
      }
    ]
  },

  // W - South Africa
  {
    name: 'South Africa',
    states: [
      {
        name: 'Gauteng',
        cities: [
          { name: 'Johannesburg', latitude: -26.2041, longitude: 28.0473 },
          { name: 'Pretoria', latitude: -25.7479, longitude: 28.2293 },
          { name: 'Ekurhuleni', latitude: -26.1500, longitude: 28.2000 }
        ]
      },
      {
        name: 'Western Cape',
        cities: [
          { name: 'Cape Town', latitude: -33.9249, longitude: 18.4241 },
          { name: 'Stellenbosch', latitude: -33.9356, longitude: 18.8632 },
          { name: 'Paarl', latitude: -33.7354, longitude: 18.9694 }
        ]
      },
      {
        name: 'KwaZulu-Natal',
        cities: [
          { name: 'Durban', latitude: -29.8587, longitude: 31.0218 },
          { name: 'Pietermaritzburg', latitude: -29.6100, longitude: 30.3898 }
        ]
      },
      {
        name: 'Limpopo',
        cities: [
          { name: 'Polokwane', latitude: -23.9012, longitude: 29.4186 },
          { name: 'Musina', latitude: -22.3867, longitude: 29.2633 }
        ]
      }
    ]
  },

  // X - Switzerland (placeholder for X)
  {
    name: 'Switzerland',
    states: [
      {
        name: 'Zurich',
        cities: [
          { name: 'Zurich', latitude: 47.3769, longitude: 8.5472 },
          { name: 'Winterthur', latitude: 47.5034, longitude: 8.7269 },
          { name: 'Uster', latitude: 47.3429, longitude: 8.6941 }
        ]
      },
      {
        name: 'Bern',
        cities: [
          { name: 'Bern', latitude: 46.9479, longitude: 7.4474 },
          { name: 'Thun', latitude: 46.7565, longitude: 7.6284 }
        ]
      },
      {
        name: 'Basel-Stadt',
        cities: [
          { name: 'Basel', latitude: 47.5596, longitude: 7.5886 },
          { name: 'Liestal', latitude: 47.4841, longitude: 7.7346 }
        ]
      },
      {
        name: 'Geneva',
        cities: [
          { name: 'Geneva', latitude: 46.2044, longitude: 6.1432 }
        ]
      },
      {
        name: 'Vaud',
        cities: [
          { name: 'Lausanne', latitude: 46.5197, longitude: 6.6323 },
          { name: 'Montreux', latitude: 46.4314, longitude: 6.9102 }
        ]
      }
    ]
  },

  // Y - Yemen
  {
    name: 'Yemen',
    states: [
      {
        name: 'Sana\'a',
        cities: [
          { name: 'Sana\'a', latitude: 15.3694, longitude: 44.191 },
          { name: 'Amran', latitude: 15.6605, longitude: 43.9378 },
          { name: 'Dhamar', latitude: 15.4500, longitude: 44.4000 }
        ]
      },
      {
        name: 'Aden',
        cities: [
          { name: 'Aden', latitude: 12.7855, longitude: 45.0187 },
          { name: 'Lahij', latitude: 13.0500, longitude: 45.2500 }
        ]
      },
      {
        name: 'Taiz',
        cities: [
          { name: 'Taiz', latitude: 13.5814, longitude: 44.0097 },
          { name: 'Ibb', latitude: 13.9667, longitude: 44.1833 }
        ]
      },
      {
        name: 'Hadramawt',
        cities: [
          { name: 'Mukalla', latitude: 14.5500, longitude: 49.1333 }
        ]
      }
    ]
  },

  // Z - Zimbabwe
  {
    name: 'Zimbabwe',
    states: [
      {
        name: 'Harare',
        cities: [
          { name: 'Harare', latitude: -17.8252, longitude: 31.0335 },
          { name: 'Chitungwiza', latitude: -17.9881, longitude: 31.0631 },
          { name: 'Epworth', latitude: -17.9333, longitude: 31.0500 }
        ]
      },
      {
        name: 'Bulawayo',
        cities: [
          { name: 'Bulawayo', latitude: -20.1322, longitude: 28.6265 }
        ]
      },
      {
        name: 'Mashonaland Central',
        cities: [
          { name: 'Bindura', latitude: -17.3022, longitude: 31.3214 },
          { name: 'Mvurwi', latitude: -17.6000, longitude: 31.0667 }
        ]
      },
      {
        name: 'Mashonaland East',
        cities: [
          { name: 'Marondera', latitude: -18.2167, longitude: 31.6000 },
          { name: 'Macheke', latitude: -18.1500, longitude: 31.8500 }
        ]
      },
      {
        name: 'Manicaland',
        cities: [
          { name: 'Mutare', latitude: -18.9672, longitude: 32.6669 },
          { name: 'Chipinge', latitude: -19.8167, longitude: 32.6333 }
        ]
      }
    ]
  },

  // Additional Countries - Nepal
  {
    name: 'Nepal',
    states: [
      {
        name: 'Bagmati Pradesh',
        cities: [
          { name: 'Kathmandu', latitude: 27.7172, longitude: 85.3240 },
          { name: 'Lalitpur', latitude: 27.6667, longitude: 85.3167 },
          { name: 'Bhaktapur', latitude: 27.6722, longitude: 85.4278 },
          { name: 'Hetauda', latitude: 27.4283, longitude: 85.0322 }
        ]
      },
      {
        name: 'Gandaki Pradesh',
        cities: [
          { name: 'Pokhara', latitude: 28.2096, longitude: 83.9856 },
          { name: 'Bharatpur', latitude: 27.6833, longitude: 84.4333 },
          { name: 'Gorkha', latitude: 28.0000, longitude: 84.6333 }
        ]
      },
      {
        name: 'Lumbini Pradesh',
        cities: [
          { name: 'Butwal', latitude: 27.7000, longitude: 83.4500 },
          { name: 'Siddharthanagar', latitude: 27.5047, longitude: 83.4514 },
          { name: 'Nepalgunj', latitude: 28.0500, longitude: 81.6167 }
        ]
      },
      {
        name: 'Koshi Pradesh',
        cities: [
          { name: 'Biratnagar', latitude: 26.4525, longitude: 87.2718 },
          { name: 'Dharan', latitude: 26.8122, longitude: 87.2836 },
          { name: 'Itahari', latitude: 26.6667, longitude: 87.2833 }
        ]
      },
      {
        name: 'Madhesh Pradesh',
        cities: [
          { name: 'Janakpur', latitude: 26.7288, longitude: 85.9263 },
          { name: 'Birgunj', latitude: 27.0167, longitude: 84.8667 },
          { name: 'Kalaiya', latitude: 27.0333, longitude: 85.0000 }
        ]
      },
      {
        name: 'Karnali Pradesh',
        cities: [
          { name: 'Birendranagar', latitude: 28.6000, longitude: 81.6333 },
          { name: 'Jumla', latitude: 29.2747, longitude: 82.1833 }
        ]
      },
      {
        name: 'Sudurpashchim Pradesh',
        cities: [
          { name: 'Dhangadhi', latitude: 28.6833, longitude: 80.6000 },
          { name: 'Mahendranagar', latitude: 28.9667, longitude: 80.1833 }
        ]
      }
    ]
  },

  // Pakistan
  {
    name: 'Pakistan',
    states: [
      {
        name: 'Punjab',
        cities: [
          { name: 'Lahore', latitude: 31.5497, longitude: 74.3436 },
          { name: 'Faisalabad', latitude: 31.4504, longitude: 73.1350 },
          { name: 'Rawalpindi', latitude: 33.5651, longitude: 73.0169 },
          { name: 'Multan', latitude: 30.1575, longitude: 71.5249 },
          { name: 'Gujranwala', latitude: 32.1617, longitude: 74.1883 }
        ]
      },
      {
        name: 'Sindh',
        cities: [
          { name: 'Karachi', latitude: 24.8607, longitude: 67.0011 },
          { name: 'Hyderabad', latitude: 25.3960, longitude: 68.3578 },
          { name: 'Sukkur', latitude: 27.7052, longitude: 68.8574 }
        ]
      },
      {
        name: 'Khyber Pakhtunkhwa',
        cities: [
          { name: 'Peshawar', latitude: 34.0151, longitude: 71.5249 },
          { name: 'Mardan', latitude: 34.1986, longitude: 72.0404 },
          { name: 'Abbottabad', latitude: 34.1463, longitude: 73.2117 }
        ]
      },
      {
        name: 'Balochistan',
        cities: [
          { name: 'Quetta', latitude: 30.1798, longitude: 66.9750 },
          { name: 'Gwadar', latitude: 25.1264, longitude: 62.3225 }
        ]
      },
      {
        name: 'Islamabad Capital Territory',
        cities: [
          { name: 'Islamabad', latitude: 33.6844, longitude: 73.0479 }
        ]
      }
    ]
  },

  // Bangladesh
  {
    name: 'Bangladesh',
    states: [
      {
        name: 'Dhaka Division',
        cities: [
          { name: 'Dhaka', latitude: 23.8103, longitude: 90.4125 },
          { name: 'Narayanganj', latitude: 23.6238, longitude: 90.5000 },
          { name: 'Gazipur', latitude: 23.9999, longitude: 90.4203 }
        ]
      },
      {
        name: 'Chattogram Division',
        cities: [
          { name: 'Chittagong', latitude: 22.3569, longitude: 91.7832 },
          { name: "Cox's Bazar", latitude: 21.4272, longitude: 92.0058 },
          { name: 'Comilla', latitude: 23.4607, longitude: 91.1809 }
        ]
      },
      {
        name: 'Rajshahi Division',
        cities: [
          { name: 'Rajshahi', latitude: 24.3636, longitude: 88.6241 },
          { name: 'Bogra', latitude: 24.8510, longitude: 89.3697 }
        ]
      },
      {
        name: 'Khulna Division',
        cities: [
          { name: 'Khulna', latitude: 22.8456, longitude: 89.5403 },
          { name: 'Jessore', latitude: 23.1667, longitude: 89.2167 }
        ]
      },
      {
        name: 'Sylhet Division',
        cities: [
          { name: 'Sylhet', latitude: 24.8949, longitude: 91.8687 }
        ]
      }
    ]
  },

  // Sri Lanka
  {
    name: 'Sri Lanka',
    states: [
      {
        name: 'Western Province',
        cities: [
          { name: 'Colombo', latitude: 6.9271, longitude: 79.8612 },
          { name: 'Sri Jayawardenepura Kotte', latitude: 6.9108, longitude: 79.8878 },
          { name: 'Negombo', latitude: 7.2083, longitude: 79.8358 }
        ]
      },
      {
        name: 'Central Province',
        cities: [
          { name: 'Kandy', latitude: 7.2906, longitude: 80.6337 },
          { name: 'Nuwara Eliya', latitude: 6.9497, longitude: 80.7891 }
        ]
      },
      {
        name: 'Southern Province',
        cities: [
          { name: 'Galle', latitude: 6.0535, longitude: 80.2210 },
          { name: 'Matara', latitude: 5.9549, longitude: 80.5550 }
        ]
      },
      {
        name: 'Northern Province',
        cities: [
          { name: 'Jaffna', latitude: 9.6615, longitude: 80.0255 }
        ]
      },
      {
        name: 'Eastern Province',
        cities: [
          { name: 'Trincomalee', latitude: 8.5874, longitude: 81.2152 },
          { name: 'Batticaloa', latitude: 7.7310, longitude: 81.6747 }
        ]
      }
    ]
  },

  // UAE
  {
    name: 'United Arab Emirates',
    states: [
      {
        name: 'Dubai',
        cities: [
          { name: 'Dubai', latitude: 25.2048, longitude: 55.2708 },
          { name: 'Jebel Ali', latitude: 24.9857, longitude: 55.0272 }
        ]
      },
      {
        name: 'Abu Dhabi',
        cities: [
          { name: 'Abu Dhabi', latitude: 24.4539, longitude: 54.3773 },
          { name: 'Al Ain', latitude: 24.1917, longitude: 55.7606 }
        ]
      },
      {
        name: 'Sharjah',
        cities: [
          { name: 'Sharjah', latitude: 25.3463, longitude: 55.4209 }
        ]
      },
      {
        name: 'Ajman',
        cities: [
          { name: 'Ajman', latitude: 25.4052, longitude: 55.5136 }
        ]
      },
      {
        name: 'Ras Al Khaimah',
        cities: [
          { name: 'Ras Al Khaimah', latitude: 25.7895, longitude: 55.9432 }
        ]
      },
      {
        name: 'Fujairah',
        cities: [
          { name: 'Fujairah', latitude: 25.1288, longitude: 56.3265 }
        ]
      }
    ]
  },

  // Saudi Arabia
  {
    name: 'Saudi Arabia',
    states: [
      {
        name: 'Riyadh Region',
        cities: [
          { name: 'Riyadh', latitude: 24.7136, longitude: 46.6753 },
          { name: 'Kharj', latitude: 24.1556, longitude: 47.3122 }
        ]
      },
      {
        name: 'Makkah Region',
        cities: [
          { name: 'Makkah', latitude: 21.3891, longitude: 39.8579 },
          { name: 'Jeddah', latitude: 21.4858, longitude: 39.1925 },
          { name: 'Taif', latitude: 21.2703, longitude: 40.4158 }
        ]
      },
      {
        name: 'Madinah Region',
        cities: [
          { name: 'Madinah', latitude: 24.5247, longitude: 39.5692 },
          { name: 'Yanbu', latitude: 24.0883, longitude: 38.0618 }
        ]
      },
      {
        name: 'Eastern Region',
        cities: [
          { name: 'Dammam', latitude: 26.4207, longitude: 50.0888 },
          { name: 'Dhahran', latitude: 26.2361, longitude: 50.0393 },
          { name: 'Khobar', latitude: 26.2172, longitude: 50.1971 }
        ]
      }
    ]
  },

  // Indonesia
  {
    name: 'Indonesia',
    states: [
      {
        name: 'Jakarta',
        cities: [
          { name: 'Jakarta', latitude: -6.2088, longitude: 106.8456 },
          { name: 'South Jakarta', latitude: -6.2615, longitude: 106.8106 }
        ]
      },
      {
        name: 'West Java',
        cities: [
          { name: 'Bandung', latitude: -6.9175, longitude: 107.6191 },
          { name: 'Bekasi', latitude: -6.2383, longitude: 106.9756 },
          { name: 'Bogor', latitude: -6.5971, longitude: 106.8060 }
        ]
      },
      {
        name: 'East Java',
        cities: [
          { name: 'Surabaya', latitude: -7.2575, longitude: 112.7521 },
          { name: 'Malang', latitude: -7.9666, longitude: 112.6326 }
        ]
      },
      {
        name: 'Central Java',
        cities: [
          { name: 'Semarang', latitude: -6.9666, longitude: 110.4196 },
          { name: 'Solo', latitude: -7.5755, longitude: 110.8243 }
        ]
      },
      {
        name: 'Bali',
        cities: [
          { name: 'Denpasar', latitude: -8.6500, longitude: 115.2167 },
          { name: 'Ubud', latitude: -8.5069, longitude: 115.2625 }
        ]
      },
      {
        name: 'North Sumatra',
        cities: [
          { name: 'Medan', latitude: 3.5952, longitude: 98.6722 }
        ]
      },
      {
        name: 'South Sulawesi',
        cities: [
          { name: 'Makassar', latitude: -5.1477, longitude: 119.4327 }
        ]
      }
    ]
  },

  // Malaysia
  {
    name: 'Malaysia',
    states: [
      {
        name: 'Kuala Lumpur',
        cities: [
          { name: 'Kuala Lumpur', latitude: 3.1390, longitude: 101.6869 }
        ]
      },
      {
        name: 'Selangor',
        cities: [
          { name: 'Shah Alam', latitude: 3.0738, longitude: 101.5183 },
          { name: 'Petaling Jaya', latitude: 3.1073, longitude: 101.6067 },
          { name: 'Subang Jaya', latitude: 3.0565, longitude: 101.5851 }
        ]
      },
      {
        name: 'Penang',
        cities: [
          { name: 'George Town', latitude: 5.4141, longitude: 100.3288 },
          { name: 'Butterworth', latitude: 5.3991, longitude: 100.3637 }
        ]
      },
      {
        name: 'Johor',
        cities: [
          { name: 'Johor Bahru', latitude: 1.4927, longitude: 103.7414 },
          { name: 'Iskandar Puteri', latitude: 1.4288, longitude: 103.6318 }
        ]
      },
      {
        name: 'Sabah',
        cities: [
          { name: 'Kota Kinabalu', latitude: 5.9804, longitude: 116.0735 }
        ]
      },
      {
        name: 'Sarawak',
        cities: [
          { name: 'Kuching', latitude: 1.5535, longitude: 110.3593 }
        ]
      }
    ]
  },

  // Thailand
  {
    name: 'Thailand',
    states: [
      {
        name: 'Bangkok',
        cities: [
          { name: 'Bangkok', latitude: 13.7563, longitude: 100.5018 }
        ]
      },
      {
        name: 'Chiang Mai',
        cities: [
          { name: 'Chiang Mai', latitude: 18.7883, longitude: 98.9853 },
          { name: 'Chiang Rai', latitude: 19.9105, longitude: 99.8406 }
        ]
      },
      {
        name: 'Phuket',
        cities: [
          { name: 'Phuket', latitude: 7.8804, longitude: 98.3923 }
        ]
      },
      {
        name: 'Surat Thani',
        cities: [
          { name: 'Surat Thani', latitude: 9.1382, longitude: 99.3219 },
          { name: 'Koh Samui', latitude: 9.5120, longitude: 100.0136 }
        ]
      },
      {
        name: 'Chonburi',
        cities: [
          { name: 'Pattaya', latitude: 12.9236, longitude: 100.8825 },
          { name: 'Chonburi', latitude: 13.3611, longitude: 100.9847 }
        ]
      }
    ]
  },

  // Philippines
  {
    name: 'Philippines',
    states: [
      {
        name: 'Metro Manila',
        cities: [
          { name: 'Manila', latitude: 14.5995, longitude: 120.9842 },
          { name: 'Quezon City', latitude: 14.6760, longitude: 121.0437 },
          { name: 'Makati', latitude: 14.5547, longitude: 121.0244 },
          { name: 'Taguig', latitude: 14.5176, longitude: 121.0509 }
        ]
      },
      {
        name: 'Cebu',
        cities: [
          { name: 'Cebu City', latitude: 10.3157, longitude: 123.8854 },
          { name: 'Mandaue', latitude: 10.3236, longitude: 123.9223 }
        ]
      },
      {
        name: 'Davao',
        cities: [
          { name: 'Davao City', latitude: 7.1907, longitude: 125.4553 }
        ]
      },
      {
        name: 'Calabarzon',
        cities: [
          { name: 'Calamba', latitude: 14.2117, longitude: 121.1653 },
          { name: 'Batangas City', latitude: 13.7565, longitude: 121.0583 }
        ]
      }
    ]
  },

  // Singapore
  {
    name: 'Singapore',
    states: [
      {
        name: 'Central Region',
        cities: [
          { name: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
          { name: 'Marina Bay', latitude: 1.2838, longitude: 103.8591 },
          { name: 'Orchard', latitude: 1.3048, longitude: 103.8318 }
        ]
      },
      {
        name: 'East Region',
        cities: [
          { name: 'Tampines', latitude: 1.3496, longitude: 103.9568 },
          { name: 'Changi', latitude: 1.3644, longitude: 103.9915 }
        ]
      },
      {
        name: 'West Region',
        cities: [
          { name: 'Jurong', latitude: 1.3329, longitude: 103.7436 }
        ]
      }
    ]
  },

  // China (Major Cities)
  {
    name: 'China',
    states: [
      {
        name: 'Beijing',
        cities: [
          { name: 'Beijing', latitude: 39.9042, longitude: 116.4074 }
        ]
      },
      {
        name: 'Shanghai',
        cities: [
          { name: 'Shanghai', latitude: 31.2304, longitude: 121.4737 }
        ]
      },
      {
        name: 'Guangdong',
        cities: [
          { name: 'Guangzhou', latitude: 23.1291, longitude: 113.2644 },
          { name: 'Shenzhen', latitude: 22.5431, longitude: 114.0579 },
          { name: 'Dongguan', latitude: 23.0207, longitude: 113.7518 }
        ]
      },
      {
        name: 'Sichuan',
        cities: [
          { name: 'Chengdu', latitude: 30.5728, longitude: 104.0668 }
        ]
      },
      {
        name: 'Zhejiang',
        cities: [
          { name: 'Hangzhou', latitude: 30.2741, longitude: 120.1551 }
        ]
      },
      {
        name: 'Jiangsu',
        cities: [
          { name: 'Nanjing', latitude: 32.0603, longitude: 118.7969 },
          { name: 'Suzhou', latitude: 31.2989, longitude: 120.5853 }
        ]
      },
      {
        name: 'Hong Kong',
        cities: [
          { name: 'Hong Kong', latitude: 22.3193, longitude: 114.1694 }
        ]
      }
    ]
  },

  // South Korea
  {
    name: 'South Korea',
    states: [
      {
        name: 'Seoul',
        cities: [
          { name: 'Seoul', latitude: 37.5665, longitude: 126.9780 }
        ]
      },
      {
        name: 'Gyeonggi',
        cities: [
          { name: 'Incheon', latitude: 37.4563, longitude: 126.7052 },
          { name: 'Suwon', latitude: 37.2636, longitude: 127.0286 },
          { name: 'Seongnam', latitude: 37.4386, longitude: 127.1378 }
        ]
      },
      {
        name: 'Busan',
        cities: [
          { name: 'Busan', latitude: 35.1796, longitude: 129.0756 }
        ]
      },
      {
        name: 'Daegu',
        cities: [
          { name: 'Daegu', latitude: 35.8714, longitude: 128.6014 }
        ]
      },
      {
        name: 'Jeju',
        cities: [
          { name: 'Jeju City', latitude: 33.4996, longitude: 126.5312 }
        ]
      }
    ]
  },

  // New Zealand
  {
    name: 'New Zealand',
    states: [
      {
        name: 'Auckland',
        cities: [
          { name: 'Auckland', latitude: -36.8485, longitude: 174.7633 },
          { name: 'Manukau', latitude: -36.9930, longitude: 174.8796 }
        ]
      },
      {
        name: 'Wellington',
        cities: [
          { name: 'Wellington', latitude: -41.2865, longitude: 174.7762 },
          { name: 'Lower Hutt', latitude: -41.2127, longitude: 174.8997 }
        ]
      },
      {
        name: 'Canterbury',
        cities: [
          { name: 'Christchurch', latitude: -43.5321, longitude: 172.6362 }
        ]
      },
      {
        name: 'Otago',
        cities: [
          { name: 'Dunedin', latitude: -45.8788, longitude: 170.5028 },
          { name: 'Queenstown', latitude: -45.0312, longitude: 168.6626 }
        ]
      }
    ]
  },

  // Ireland
  {
    name: 'Ireland',
    states: [
      {
        name: 'Leinster',
        cities: [
          { name: 'Dublin', latitude: 53.3498, longitude: -6.2603 },
          { name: 'Drogheda', latitude: 53.7189, longitude: -6.3472 }
        ]
      },
      {
        name: 'Munster',
        cities: [
          { name: 'Cork', latitude: 51.8985, longitude: -8.4756 },
          { name: 'Limerick', latitude: 52.6638, longitude: -8.6267 }
        ]
      },
      {
        name: 'Connacht',
        cities: [
          { name: 'Galway', latitude: 53.2707, longitude: -9.0568 }
        ]
      },
      {
        name: 'Ulster',
        cities: [
          { name: 'Donegal', latitude: 54.6539, longitude: -8.1107 }
        ]
      }
    ]
  },

  // Poland
  {
    name: 'Poland',
    states: [
      {
        name: 'Masovian',
        cities: [
          { name: 'Warsaw', latitude: 52.2297, longitude: 21.0122 }
        ]
      },
      {
        name: 'Lesser Poland',
        cities: [
          { name: 'Kraków', latitude: 50.0647, longitude: 19.9450 }
        ]
      },
      {
        name: 'Greater Poland',
        cities: [
          { name: 'Poznań', latitude: 52.4064, longitude: 16.9252 }
        ]
      },
      {
        name: 'Pomeranian',
        cities: [
          { name: 'Gdańsk', latitude: 54.3520, longitude: 18.6466 }
        ]
      },
      {
        name: 'Lower Silesian',
        cities: [
          { name: 'Wrocław', latitude: 51.1079, longitude: 17.0385 }
        ]
      }
    ]
  },

  // Nigeria
  {
    name: 'Nigeria',
    states: [
      {
        name: 'Lagos',
        cities: [
          { name: 'Lagos', latitude: 6.5244, longitude: 3.3792 },
          { name: 'Ikeja', latitude: 6.6018, longitude: 3.3515 }
        ]
      },
      {
        name: 'Federal Capital Territory',
        cities: [
          { name: 'Abuja', latitude: 9.0765, longitude: 7.3986 }
        ]
      },
      {
        name: 'Kano',
        cities: [
          { name: 'Kano', latitude: 12.0022, longitude: 8.5919 }
        ]
      },
      {
        name: 'Rivers',
        cities: [
          { name: 'Port Harcourt', latitude: 4.8156, longitude: 7.0498 }
        ]
      },
      {
        name: 'Oyo',
        cities: [
          { name: 'Ibadan', latitude: 7.3775, longitude: 3.9470 }
        ]
      }
    ]
  },

  // Ghana
  {
    name: 'Ghana',
    states: [
      {
        name: 'Greater Accra',
        cities: [
          { name: 'Accra', latitude: 5.6037, longitude: -0.1870 },
          { name: 'Tema', latitude: 5.6698, longitude: -0.0166 }
        ]
      },
      {
        name: 'Ashanti',
        cities: [
          { name: 'Kumasi', latitude: 6.6885, longitude: -1.6244 }
        ]
      },
      {
        name: 'Western',
        cities: [
          { name: 'Takoradi', latitude: 4.8845, longitude: -1.7554 }
        ]
      }
    ]
  },

  // Ethiopia
  {
    name: 'Ethiopia',
    states: [
      {
        name: 'Addis Ababa',
        cities: [
          { name: 'Addis Ababa', latitude: 9.0320, longitude: 38.7469 }
        ]
      },
      {
        name: 'Oromia',
        cities: [
          { name: 'Adama', latitude: 8.5400, longitude: 39.2700 },
          { name: 'Jimma', latitude: 7.6700, longitude: 36.8333 }
        ]
      },
      {
        name: 'Amhara',
        cities: [
          { name: 'Bahir Dar', latitude: 11.5900, longitude: 37.3900 },
          { name: 'Gondar', latitude: 12.6000, longitude: 37.4667 }
        ]
      }
    ]
  },

  // Morocco
  {
    name: 'Morocco',
    states: [
      {
        name: 'Casablanca-Settat',
        cities: [
          { name: 'Casablanca', latitude: 33.5731, longitude: -7.5898 }
        ]
      },
      {
        name: 'Rabat-Salé-Kénitra',
        cities: [
          { name: 'Rabat', latitude: 34.0132, longitude: -6.8326 },
          { name: 'Salé', latitude: 34.0531, longitude: -6.7985 }
        ]
      },
      {
        name: 'Fès-Meknès',
        cities: [
          { name: 'Fès', latitude: 34.0181, longitude: -5.0078 },
          { name: 'Meknès', latitude: 33.8731, longitude: -5.5407 }
        ]
      },
      {
        name: 'Marrakech-Safi',
        cities: [
          { name: 'Marrakech', latitude: 31.6295, longitude: -7.9811 }
        ]
      },
      {
        name: 'Tangier-Tétouan',
        cities: [
          { name: 'Tangier', latitude: 35.7595, longitude: -5.8340 }
        ]
      }
    ]
  },

  // Tanzania
  {
    name: 'Tanzania',
    states: [
      {
        name: 'Dar es Salaam',
        cities: [
          { name: 'Dar es Salaam', latitude: -6.7924, longitude: 39.2083 }
        ]
      },
      {
        name: 'Dodoma',
        cities: [
          { name: 'Dodoma', latitude: -6.1722, longitude: 35.7395 }
        ]
      },
      {
        name: 'Arusha',
        cities: [
          { name: 'Arusha', latitude: -3.3869, longitude: 36.6830 }
        ]
      },
      {
        name: 'Zanzibar',
        cities: [
          { name: 'Zanzibar City', latitude: -6.1622, longitude: 39.1921 }
        ]
      }
    ]
  },

  // Colombia
  {
    name: 'Colombia',
    states: [
      {
        name: 'Bogotá D.C.',
        cities: [
          { name: 'Bogotá', latitude: 4.7110, longitude: -74.0721 }
        ]
      },
      {
        name: 'Antioquia',
        cities: [
          { name: 'Medellín', latitude: 6.2442, longitude: -75.5812 }
        ]
      },
      {
        name: 'Valle del Cauca',
        cities: [
          { name: 'Cali', latitude: 3.4516, longitude: -76.5320 }
        ]
      },
      {
        name: 'Atlántico',
        cities: [
          { name: 'Barranquilla', latitude: 10.9639, longitude: -74.7964 }
        ]
      },
      {
        name: 'Bolívar',
        cities: [
          { name: 'Cartagena', latitude: 10.3910, longitude: -75.4794 }
        ]
      }
    ]
  },

  // Chile
  {
    name: 'Chile',
    states: [
      {
        name: 'Metropolitana de Santiago',
        cities: [
          { name: 'Santiago', latitude: -33.4489, longitude: -70.6693 }
        ]
      },
      {
        name: 'Valparaíso',
        cities: [
          { name: 'Valparaíso', latitude: -33.0472, longitude: -71.6127 },
          { name: 'Viña del Mar', latitude: -33.0153, longitude: -71.5500 }
        ]
      },
      {
        name: 'Biobío',
        cities: [
          { name: 'Concepción', latitude: -36.8282, longitude: -73.0514 }
        ]
      },
      {
        name: 'Antofagasta',
        cities: [
          { name: 'Antofagasta', latitude: -23.6509, longitude: -70.3975 }
        ]
      }
    ]
  },

  // Peru
  {
    name: 'Peru',
    states: [
      {
        name: 'Lima',
        cities: [
          { name: 'Lima', latitude: -12.0464, longitude: -77.0428 },
          { name: 'Callao', latitude: -12.0565, longitude: -77.1181 }
        ]
      },
      {
        name: 'Arequipa',
        cities: [
          { name: 'Arequipa', latitude: -16.4090, longitude: -71.5375 }
        ]
      },
      {
        name: 'Cusco',
        cities: [
          { name: 'Cusco', latitude: -13.5319, longitude: -71.9675 }
        ]
      },
      {
        name: 'La Libertad',
        cities: [
          { name: 'Trujillo', latitude: -8.1116, longitude: -79.0288 }
        ]
      }
    ]
  },

  // Austria
  {
    name: 'Austria',
    states: [
      {
        name: 'Vienna',
        cities: [
          { name: 'Vienna', latitude: 48.2082, longitude: 16.3738 }
        ]
      },
      {
        name: 'Salzburg',
        cities: [
          { name: 'Salzburg', latitude: 47.8095, longitude: 13.0550 }
        ]
      },
      {
        name: 'Tyrol',
        cities: [
          { name: 'Innsbruck', latitude: 47.2692, longitude: 11.4041 }
        ]
      },
      {
        name: 'Upper Austria',
        cities: [
          { name: 'Linz', latitude: 48.3069, longitude: 14.2858 }
        ]
      },
      {
        name: 'Styria',
        cities: [
          { name: 'Graz', latitude: 47.0707, longitude: 15.4395 }
        ]
      }
    ]
  },

  // Czech Republic
  {
    name: 'Czech Republic',
    states: [
      {
        name: 'Prague',
        cities: [
          { name: 'Prague', latitude: 50.0755, longitude: 14.4378 }
        ]
      },
      {
        name: 'South Moravian',
        cities: [
          { name: 'Brno', latitude: 49.1951, longitude: 16.6068 }
        ]
      },
      {
        name: 'Moravian-Silesian',
        cities: [
          { name: 'Ostrava', latitude: 49.8209, longitude: 18.2625 }
        ]
      }
    ]
  },

  // Greece
  {
    name: 'Greece',
    states: [
      {
        name: 'Attica',
        cities: [
          { name: 'Athens', latitude: 37.9838, longitude: 23.7275 },
          { name: 'Piraeus', latitude: 37.9475, longitude: 23.6415 }
        ]
      },
      {
        name: 'Central Macedonia',
        cities: [
          { name: 'Thessaloniki', latitude: 40.6401, longitude: 22.9444 }
        ]
      },
      {
        name: 'Crete',
        cities: [
          { name: 'Heraklion', latitude: 35.3387, longitude: 25.1442 }
        ]
      },
      {
        name: 'South Aegean',
        cities: [
          { name: 'Rhodes', latitude: 36.4349, longitude: 28.2176 }
        ]
      }
    ]
  },

  // Sweden
  {
    name: 'Sweden',
    states: [
      {
        name: 'Stockholm',
        cities: [
          { name: 'Stockholm', latitude: 59.3293, longitude: 18.0686 }
        ]
      },
      {
        name: 'Västra Götaland',
        cities: [
          { name: 'Gothenburg', latitude: 57.7089, longitude: 11.9746 }
        ]
      },
      {
        name: 'Skåne',
        cities: [
          { name: 'Malmö', latitude: 55.6049, longitude: 13.0038 }
        ]
      },
      {
        name: 'Uppsala',
        cities: [
          { name: 'Uppsala', latitude: 59.8586, longitude: 17.6389 }
        ]
      }
    ]
  },

  // Norway
  {
    name: 'Norway',
    states: [
      {
        name: 'Oslo',
        cities: [
          { name: 'Oslo', latitude: 59.9139, longitude: 10.7522 }
        ]
      },
      {
        name: 'Vestland',
        cities: [
          { name: 'Bergen', latitude: 60.3913, longitude: 5.3221 }
        ]
      },
      {
        name: 'Trøndelag',
        cities: [
          { name: 'Trondheim', latitude: 63.4305, longitude: 10.3951 }
        ]
      },
      {
        name: 'Rogaland',
        cities: [
          { name: 'Stavanger', latitude: 58.9700, longitude: 5.7331 }
        ]
      }
    ]
  },

  // Finland
  {
    name: 'Finland',
    states: [
      {
        name: 'Uusimaa',
        cities: [
          { name: 'Helsinki', latitude: 60.1699, longitude: 24.9384 },
          { name: 'Espoo', latitude: 60.2052, longitude: 24.6522 }
        ]
      },
      {
        name: 'Pirkanmaa',
        cities: [
          { name: 'Tampere', latitude: 61.4978, longitude: 23.7610 }
        ]
      },
      {
        name: 'Southwest Finland',
        cities: [
          { name: 'Turku', latitude: 60.4518, longitude: 22.2666 }
        ]
      },
      {
        name: 'North Ostrobothnia',
        cities: [
          { name: 'Oulu', latitude: 65.0121, longitude: 25.4651 }
        ]
      }
    ]
  },

  // Belgium
  {
    name: 'Belgium',
    states: [
      {
        name: 'Brussels-Capital Region',
        cities: [
          { name: 'Brussels', latitude: 50.8503, longitude: 4.3517 }
        ]
      },
      {
        name: 'Antwerp',
        cities: [
          { name: 'Antwerp', latitude: 51.2194, longitude: 4.4025 }
        ]
      },
      {
        name: 'East Flanders',
        cities: [
          { name: 'Ghent', latitude: 51.0543, longitude: 3.7174 }
        ]
      },
      {
        name: 'Liège',
        cities: [
          { name: 'Liège', latitude: 50.6292, longitude: 5.5797 }
        ]
      }
    ]
  },

  // Israel
  {
    name: 'Israel',
    states: [
      {
        name: 'Tel Aviv District',
        cities: [
          { name: 'Tel Aviv', latitude: 32.0853, longitude: 34.7818 }
        ]
      },
      {
        name: 'Jerusalem District',
        cities: [
          { name: 'Jerusalem', latitude: 31.7683, longitude: 35.2137 }
        ]
      },
      {
        name: 'Haifa District',
        cities: [
          { name: 'Haifa', latitude: 32.7940, longitude: 34.9896 }
        ]
      },
      {
        name: 'Central District',
        cities: [
          { name: 'Rishon LeZion', latitude: 31.9642, longitude: 34.8043 }
        ]
      }
    ]
  },

  // Ukraine
  {
    name: 'Ukraine',
    states: [
      {
        name: 'Kyiv',
        cities: [
          { name: 'Kyiv', latitude: 50.4501, longitude: 30.5234 }
        ]
      },
      {
        name: 'Kharkiv Oblast',
        cities: [
          { name: 'Kharkiv', latitude: 49.9935, longitude: 36.2304 }
        ]
      },
      {
        name: 'Odesa Oblast',
        cities: [
          { name: 'Odesa', latitude: 46.4825, longitude: 30.7233 }
        ]
      },
      {
        name: 'Lviv Oblast',
        cities: [
          { name: 'Lviv', latitude: 49.8397, longitude: 24.0297 }
        ]
      },
      {
        name: 'Dnipropetrovsk Oblast',
        cities: [
          { name: 'Dnipro', latitude: 48.4647, longitude: 35.0462 }
        ]
      }
    ]
  },

  // Romania
  {
    name: 'Romania',
    states: [
      {
        name: 'Bucharest',
        cities: [
          { name: 'Bucharest', latitude: 44.4268, longitude: 26.1025 }
        ]
      },
      {
        name: 'Cluj',
        cities: [
          { name: 'Cluj-Napoca', latitude: 46.7712, longitude: 23.6236 }
        ]
      },
      {
        name: 'Timiș',
        cities: [
          { name: 'Timișoara', latitude: 45.7489, longitude: 21.2087 }
        ]
      },
      {
        name: 'Constanța',
        cities: [
          { name: 'Constanța', latitude: 44.1598, longitude: 28.6348 }
        ]
      },
      {
        name: 'Iași',
        cities: [
          { name: 'Iași', latitude: 47.1585, longitude: 27.6014 }
        ]
      }
    ]
  },

  // Italy
  {
    name: 'Italy',
    states: [
      {
        name: 'Lazio',
        cities: [
          { name: 'Rome', latitude: 41.9028, longitude: 12.4964 },
          { name: 'Latina', latitude: 41.4676, longitude: 12.9037 }
        ]
      },
      {
        name: 'Lombardy',
        cities: [
          { name: 'Milan', latitude: 45.4642, longitude: 9.1900 },
          { name: 'Bergamo', latitude: 45.6983, longitude: 9.6773 },
          { name: 'Brescia', latitude: 45.5416, longitude: 10.2118 }
        ]
      },
      {
        name: 'Campania',
        cities: [
          { name: 'Naples', latitude: 40.8518, longitude: 14.2681 },
          { name: 'Salerno', latitude: 40.6824, longitude: 14.7681 }
        ]
      },
      {
        name: 'Veneto',
        cities: [
          { name: 'Venice', latitude: 45.4408, longitude: 12.3155 },
          { name: 'Verona', latitude: 45.4384, longitude: 10.9916 },
          { name: 'Padua', latitude: 45.4064, longitude: 11.8768 }
        ]
      },
      {
        name: 'Tuscany',
        cities: [
          { name: 'Florence', latitude: 43.7696, longitude: 11.2558 },
          { name: 'Pisa', latitude: 43.7228, longitude: 10.4017 },
          { name: 'Siena', latitude: 43.3188, longitude: 11.3308 }
        ]
      },
      {
        name: 'Piedmont',
        cities: [
          { name: 'Turin', latitude: 45.0703, longitude: 7.6869 }
        ]
      },
      {
        name: 'Emilia-Romagna',
        cities: [
          { name: 'Bologna', latitude: 44.4949, longitude: 11.3426 },
          { name: 'Modena', latitude: 44.6471, longitude: 10.9252 }
        ]
      },
      {
        name: 'Sicily',
        cities: [
          { name: 'Palermo', latitude: 38.1157, longitude: 13.3615 },
          { name: 'Catania', latitude: 37.5079, longitude: 15.0830 }
        ]
      },
      {
        name: 'Sardinia',
        cities: [
          { name: 'Cagliari', latitude: 39.2238, longitude: 9.1217 }
        ]
      }
    ]
  },

  // Afghanistan
  {
    name: 'Afghanistan',
    states: [
      {
        name: 'Kabul',
        cities: [
          { name: 'Kabul', latitude: 34.5553, longitude: 69.2075 }
        ]
      },
      {
        name: 'Herat',
        cities: [
          { name: 'Herat', latitude: 34.3482, longitude: 62.1997 }
        ]
      },
      {
        name: 'Kandahar',
        cities: [
          { name: 'Kandahar', latitude: 31.6133, longitude: 65.7101 }
        ]
      },
      {
        name: 'Mazar-i-Sharif',
        cities: [
          { name: 'Mazar-i-Sharif', latitude: 36.7069, longitude: 67.1147 }
        ]
      }
    ]
  },

  // Albania
  {
    name: 'Albania',
    states: [
      {
        name: 'Tirana County',
        cities: [
          { name: 'Tirana', latitude: 41.3275, longitude: 19.8187 }
        ]
      },
      {
        name: 'Durrës County',
        cities: [
          { name: 'Durrës', latitude: 41.3246, longitude: 19.4565 }
        ]
      }
    ]
  },

  // Algeria
  {
    name: 'Algeria',
    states: [
      {
        name: 'Algiers',
        cities: [
          { name: 'Algiers', latitude: 36.7538, longitude: 3.0588 }
        ]
      },
      {
        name: 'Oran',
        cities: [
          { name: 'Oran', latitude: 35.6969, longitude: -0.6331 }
        ]
      },
      {
        name: 'Constantine',
        cities: [
          { name: 'Constantine', latitude: 36.3650, longitude: 6.6147 }
        ]
      }
    ]
  },

  // Angola
  {
    name: 'Angola',
    states: [
      {
        name: 'Luanda',
        cities: [
          { name: 'Luanda', latitude: -8.8390, longitude: 13.2894 }
        ]
      },
      {
        name: 'Benguela',
        cities: [
          { name: 'Benguela', latitude: -12.5763, longitude: 13.4055 }
        ]
      }
    ]
  },

  // Azerbaijan
  {
    name: 'Azerbaijan',
    states: [
      {
        name: 'Baku',
        cities: [
          { name: 'Baku', latitude: 40.4093, longitude: 49.8671 }
        ]
      },
      {
        name: 'Ganja',
        cities: [
          { name: 'Ganja', latitude: 40.6828, longitude: 46.3606 }
        ]
      }
    ]
  },

  // Bahrain
  {
    name: 'Bahrain',
    states: [
      {
        name: 'Capital Governorate',
        cities: [
          { name: 'Manama', latitude: 26.2285, longitude: 50.5860 }
        ]
      },
      {
        name: 'Muharraq',
        cities: [
          { name: 'Muharraq', latitude: 26.2572, longitude: 50.6119 }
        ]
      }
    ]
  },

  // Belarus
  {
    name: 'Belarus',
    states: [
      {
        name: 'Minsk',
        cities: [
          { name: 'Minsk', latitude: 53.9006, longitude: 27.5590 }
        ]
      },
      {
        name: 'Gomel',
        cities: [
          { name: 'Gomel', latitude: 52.4345, longitude: 30.9754 }
        ]
      }
    ]
  },

  // Bolivia
  {
    name: 'Bolivia',
    states: [
      {
        name: 'La Paz',
        cities: [
          { name: 'La Paz', latitude: -16.4897, longitude: -68.1193 }
        ]
      },
      {
        name: 'Santa Cruz',
        cities: [
          { name: 'Santa Cruz de la Sierra', latitude: -17.7833, longitude: -63.1821 }
        ]
      },
      {
        name: 'Cochabamba',
        cities: [
          { name: 'Cochabamba', latitude: -17.3895, longitude: -66.1568 }
        ]
      }
    ]
  },

  // Bosnia and Herzegovina
  {
    name: 'Bosnia and Herzegovina',
    states: [
      {
        name: 'Sarajevo',
        cities: [
          { name: 'Sarajevo', latitude: 43.8563, longitude: 18.4131 }
        ]
      },
      {
        name: 'Banja Luka',
        cities: [
          { name: 'Banja Luka', latitude: 44.7722, longitude: 17.1910 }
        ]
      }
    ]
  },

  // Botswana
  {
    name: 'Botswana',
    states: [
      {
        name: 'South-East',
        cities: [
          { name: 'Gaborone', latitude: -24.6282, longitude: 25.9231 }
        ]
      },
      {
        name: 'North-East',
        cities: [
          { name: 'Francistown', latitude: -21.1661, longitude: 27.5066 }
        ]
      }
    ]
  },

  // Bulgaria
  {
    name: 'Bulgaria',
    states: [
      {
        name: 'Sofia City',
        cities: [
          { name: 'Sofia', latitude: 42.6977, longitude: 23.3219 }
        ]
      },
      {
        name: 'Plovdiv',
        cities: [
          { name: 'Plovdiv', latitude: 42.1354, longitude: 24.7453 }
        ]
      },
      {
        name: 'Varna',
        cities: [
          { name: 'Varna', latitude: 43.2141, longitude: 27.9147 }
        ]
      }
    ]
  },

  // Cambodia
  {
    name: 'Cambodia',
    states: [
      {
        name: 'Phnom Penh',
        cities: [
          { name: 'Phnom Penh', latitude: 11.5564, longitude: 104.9282 }
        ]
      },
      {
        name: 'Siem Reap',
        cities: [
          { name: 'Siem Reap', latitude: 13.3671, longitude: 103.8448 }
        ]
      },
      {
        name: 'Battambang',
        cities: [
          { name: 'Battambang', latitude: 13.0957, longitude: 103.2022 }
        ]
      }
    ]
  },

  // Cameroon
  {
    name: 'Cameroon',
    states: [
      {
        name: 'Centre',
        cities: [
          { name: 'Yaoundé', latitude: 3.8480, longitude: 11.5021 }
        ]
      },
      {
        name: 'Littoral',
        cities: [
          { name: 'Douala', latitude: 4.0511, longitude: 9.7679 }
        ]
      }
    ]
  },

  // Costa Rica
  {
    name: 'Costa Rica',
    states: [
      {
        name: 'San José',
        cities: [
          { name: 'San José', latitude: 9.9281, longitude: -84.0907 }
        ]
      },
      {
        name: 'Alajuela',
        cities: [
          { name: 'Alajuela', latitude: 10.0162, longitude: -84.2115 }
        ]
      }
    ]
  },

  // Croatia
  {
    name: 'Croatia',
    states: [
      {
        name: 'Zagreb',
        cities: [
          { name: 'Zagreb', latitude: 45.8150, longitude: 15.9819 }
        ]
      },
      {
        name: 'Split-Dalmatia',
        cities: [
          { name: 'Split', latitude: 43.5081, longitude: 16.4402 }
        ]
      },
      {
        name: 'Dubrovnik-Neretva',
        cities: [
          { name: 'Dubrovnik', latitude: 42.6507, longitude: 18.0944 }
        ]
      }
    ]
  },

  // Cuba
  {
    name: 'Cuba',
    states: [
      {
        name: 'Havana',
        cities: [
          { name: 'Havana', latitude: 23.1136, longitude: -82.3666 }
        ]
      },
      {
        name: 'Santiago de Cuba',
        cities: [
          { name: 'Santiago de Cuba', latitude: 20.0247, longitude: -75.8219 }
        ]
      }
    ]
  },

  // Cyprus
  {
    name: 'Cyprus',
    states: [
      {
        name: 'Nicosia',
        cities: [
          { name: 'Nicosia', latitude: 35.1856, longitude: 33.3823 }
        ]
      },
      {
        name: 'Limassol',
        cities: [
          { name: 'Limassol', latitude: 34.7071, longitude: 33.0226 }
        ]
      },
      {
        name: 'Larnaca',
        cities: [
          { name: 'Larnaca', latitude: 34.9003, longitude: 33.6232 }
        ]
      }
    ]
  },

  // Dominican Republic
  {
    name: 'Dominican Republic',
    states: [
      {
        name: 'Distrito Nacional',
        cities: [
          { name: 'Santo Domingo', latitude: 18.4861, longitude: -69.9312 }
        ]
      },
      {
        name: 'Santiago',
        cities: [
          { name: 'Santiago de los Caballeros', latitude: 19.4517, longitude: -70.6970 }
        ]
      }
    ]
  },

  // Ecuador
  {
    name: 'Ecuador',
    states: [
      {
        name: 'Pichincha',
        cities: [
          { name: 'Quito', latitude: -0.1807, longitude: -78.4678 }
        ]
      },
      {
        name: 'Guayas',
        cities: [
          { name: 'Guayaquil', latitude: -2.1894, longitude: -79.8891 }
        ]
      },
      {
        name: 'Azuay',
        cities: [
          { name: 'Cuenca', latitude: -2.9001, longitude: -79.0059 }
        ]
      }
    ]
  },

  // El Salvador
  {
    name: 'El Salvador',
    states: [
      {
        name: 'San Salvador',
        cities: [
          { name: 'San Salvador', latitude: 13.6929, longitude: -89.2182 }
        ]
      },
      {
        name: 'La Libertad',
        cities: [
          { name: 'Santa Tecla', latitude: 13.6769, longitude: -89.2797 }
        ]
      }
    ]
  },

  // Estonia
  {
    name: 'Estonia',
    states: [
      {
        name: 'Harju',
        cities: [
          { name: 'Tallinn', latitude: 59.4370, longitude: 24.7536 }
        ]
      },
      {
        name: 'Tartu',
        cities: [
          { name: 'Tartu', latitude: 58.3780, longitude: 26.7290 }
        ]
      }
    ]
  },

  // Fiji
  {
    name: 'Fiji',
    states: [
      {
        name: 'Central',
        cities: [
          { name: 'Suva', latitude: -18.1416, longitude: 178.4419 }
        ]
      },
      {
        name: 'Western',
        cities: [
          { name: 'Nadi', latitude: -17.7765, longitude: 177.4356 }
        ]
      }
    ]
  },

  // Georgia
  {
    name: 'Georgia',
    states: [
      {
        name: 'Tbilisi',
        cities: [
          { name: 'Tbilisi', latitude: 41.7151, longitude: 44.8271 }
        ]
      },
      {
        name: 'Adjara',
        cities: [
          { name: 'Batumi', latitude: 41.6168, longitude: 41.6367 }
        ]
      }
    ]
  },

  // Guatemala
  {
    name: 'Guatemala',
    states: [
      {
        name: 'Guatemala',
        cities: [
          { name: 'Guatemala City', latitude: 14.6349, longitude: -90.5069 }
        ]
      },
      {
        name: 'Quetzaltenango',
        cities: [
          { name: 'Quetzaltenango', latitude: 14.8347, longitude: -91.5181 }
        ]
      }
    ]
  },

  // Haiti
  {
    name: 'Haiti',
    states: [
      {
        name: 'Ouest',
        cities: [
          { name: 'Port-au-Prince', latitude: 18.5944, longitude: -72.3074 }
        ]
      },
      {
        name: 'Nord',
        cities: [
          { name: 'Cap-Haïtien', latitude: 19.7577, longitude: -72.2039 }
        ]
      }
    ]
  },

  // Honduras
  {
    name: 'Honduras',
    states: [
      {
        name: 'Francisco Morazán',
        cities: [
          { name: 'Tegucigalpa', latitude: 14.0723, longitude: -87.1921 }
        ]
      },
      {
        name: 'Cortés',
        cities: [
          { name: 'San Pedro Sula', latitude: 15.5000, longitude: -88.0333 }
        ]
      }
    ]
  },

  // Iceland
  {
    name: 'Iceland',
    states: [
      {
        name: 'Capital Region',
        cities: [
          { name: 'Reykjavik', latitude: 64.1466, longitude: -21.9426 }
        ]
      },
      {
        name: 'Southern Peninsula',
        cities: [
          { name: 'Keflavik', latitude: 64.0042, longitude: -22.5628 }
        ]
      }
    ]
  },

  // Iran
  {
    name: 'Iran',
    states: [
      {
        name: 'Tehran',
        cities: [
          { name: 'Tehran', latitude: 35.6892, longitude: 51.3890 }
        ]
      },
      {
        name: 'Isfahan',
        cities: [
          { name: 'Isfahan', latitude: 32.6546, longitude: 51.6680 }
        ]
      },
      {
        name: 'Fars',
        cities: [
          { name: 'Shiraz', latitude: 29.5918, longitude: 52.5837 }
        ]
      },
      {
        name: 'Razavi Khorasan',
        cities: [
          { name: 'Mashhad', latitude: 36.2605, longitude: 59.6168 }
        ]
      }
    ]
  },

  // Iraq
  {
    name: 'Iraq',
    states: [
      {
        name: 'Baghdad',
        cities: [
          { name: 'Baghdad', latitude: 33.3152, longitude: 44.3661 }
        ]
      },
      {
        name: 'Basra',
        cities: [
          { name: 'Basra', latitude: 30.5085, longitude: 47.7804 }
        ]
      },
      {
        name: 'Erbil',
        cities: [
          { name: 'Erbil', latitude: 36.1912, longitude: 44.0092 }
        ]
      }
    ]
  },

  // Jamaica
  {
    name: 'Jamaica',
    states: [
      {
        name: 'Kingston',
        cities: [
          { name: 'Kingston', latitude: 18.0179, longitude: -76.8099 }
        ]
      },
      {
        name: 'St. James',
        cities: [
          { name: 'Montego Bay', latitude: 18.4762, longitude: -77.8939 }
        ]
      }
    ]
  },

  // Jordan
  {
    name: 'Jordan',
    states: [
      {
        name: 'Amman',
        cities: [
          { name: 'Amman', latitude: 31.9454, longitude: 35.9284 }
        ]
      },
      {
        name: 'Aqaba',
        cities: [
          { name: 'Aqaba', latitude: 29.5267, longitude: 35.0078 }
        ]
      },
      {
        name: 'Zarqa',
        cities: [
          { name: 'Zarqa', latitude: 32.0728, longitude: 36.0880 }
        ]
      }
    ]
  },

  // Kazakhstan
  {
    name: 'Kazakhstan',
    states: [
      {
        name: 'Almaty',
        cities: [
          { name: 'Almaty', latitude: 43.2220, longitude: 76.8512 }
        ]
      },
      {
        name: 'Astana',
        cities: [
          { name: 'Astana', latitude: 51.1605, longitude: 71.4704 }
        ]
      },
      {
        name: 'Shymkent',
        cities: [
          { name: 'Shymkent', latitude: 42.3417, longitude: 69.5901 }
        ]
      }
    ]
  },

  // Kuwait
  {
    name: 'Kuwait',
    states: [
      {
        name: 'Al Asimah',
        cities: [
          { name: 'Kuwait City', latitude: 29.3759, longitude: 47.9774 }
        ]
      },
      {
        name: 'Hawalli',
        cities: [
          { name: 'Hawalli', latitude: 29.3328, longitude: 48.0286 }
        ]
      }
    ]
  },

  // Laos
  {
    name: 'Laos',
    states: [
      {
        name: 'Vientiane',
        cities: [
          { name: 'Vientiane', latitude: 17.9757, longitude: 102.6331 }
        ]
      },
      {
        name: 'Luang Prabang',
        cities: [
          { name: 'Luang Prabang', latitude: 19.8833, longitude: 102.1333 }
        ]
      }
    ]
  },

  // Latvia
  {
    name: 'Latvia',
    states: [
      {
        name: 'Riga',
        cities: [
          { name: 'Riga', latitude: 56.9496, longitude: 24.1052 }
        ]
      },
      {
        name: 'Daugavpils',
        cities: [
          { name: 'Daugavpils', latitude: 55.8749, longitude: 26.5356 }
        ]
      }
    ]
  },

  // Libya
  {
    name: 'Libya',
    states: [
      {
        name: 'Tripolitania',
        cities: [
          { name: 'Tripoli', latitude: 32.8872, longitude: 13.1913 }
        ]
      },
      {
        name: 'Cyrenaica',
        cities: [
          { name: 'Benghazi', latitude: 32.1165, longitude: 20.0686 }
        ]
      }
    ]
  },

  // Lithuania
  {
    name: 'Lithuania',
    states: [
      {
        name: 'Vilnius',
        cities: [
          { name: 'Vilnius', latitude: 54.6872, longitude: 25.2797 }
        ]
      },
      {
        name: 'Kaunas',
        cities: [
          { name: 'Kaunas', latitude: 54.8985, longitude: 23.9036 }
        ]
      }
    ]
  },

  // Luxembourg
  {
    name: 'Luxembourg',
    states: [
      {
        name: 'Luxembourg',
        cities: [
          { name: 'Luxembourg City', latitude: 49.6116, longitude: 6.1319 }
        ]
      }
    ]
  },

  // Madagascar
  {
    name: 'Madagascar',
    states: [
      {
        name: 'Analamanga',
        cities: [
          { name: 'Antananarivo', latitude: -18.8792, longitude: 47.5079 }
        ]
      },
      {
        name: 'Atsinanana',
        cities: [
          { name: 'Toamasina', latitude: -18.1492, longitude: 49.4023 }
        ]
      }
    ]
  },

  // Maldives
  {
    name: 'Maldives',
    states: [
      {
        name: 'Malé',
        cities: [
          { name: 'Malé', latitude: 4.1755, longitude: 73.5093 }
        ]
      },
      {
        name: 'South Ari Atoll',
        cities: [
          { name: 'Mahibadhoo', latitude: 3.7575, longitude: 72.9697 }
        ]
      }
    ]
  },

  // Malta
  {
    name: 'Malta',
    states: [
      {
        name: 'South Eastern',
        cities: [
          { name: 'Valletta', latitude: 35.8989, longitude: 14.5146 }
        ]
      },
      {
        name: 'Northern',
        cities: [
          { name: 'Sliema', latitude: 35.9114, longitude: 14.5031 }
        ]
      }
    ]
  },

  // Mauritius
  {
    name: 'Mauritius',
    states: [
      {
        name: 'Port Louis',
        cities: [
          { name: 'Port Louis', latitude: -20.1609, longitude: 57.5012 }
        ]
      },
      {
        name: 'Plaines Wilhems',
        cities: [
          { name: 'Quatre Bornes', latitude: -20.2650, longitude: 57.4797 }
        ]
      }
    ]
  },

  // Moldova
  {
    name: 'Moldova',
    states: [
      {
        name: 'Chișinău',
        cities: [
          { name: 'Chișinău', latitude: 47.0105, longitude: 28.8638 }
        ]
      },
      {
        name: 'Bălți',
        cities: [
          { name: 'Bălți', latitude: 47.7617, longitude: 27.9292 }
        ]
      }
    ]
  },

  // Mongolia
  {
    name: 'Mongolia',
    states: [
      {
        name: 'Ulaanbaatar',
        cities: [
          { name: 'Ulaanbaatar', latitude: 47.8864, longitude: 106.9057 }
        ]
      },
      {
        name: 'Darkhan-Uul',
        cities: [
          { name: 'Darkhan', latitude: 49.4647, longitude: 105.9550 }
        ]
      }
    ]
  },

  // Montenegro
  {
    name: 'Montenegro',
    states: [
      {
        name: 'Podgorica',
        cities: [
          { name: 'Podgorica', latitude: 42.4304, longitude: 19.2594 }
        ]
      },
      {
        name: 'Coastal',
        cities: [
          { name: 'Budva', latitude: 42.2899, longitude: 18.8421 }
        ]
      }
    ]
  },

  // Mozambique
  {
    name: 'Mozambique',
    states: [
      {
        name: 'Maputo',
        cities: [
          { name: 'Maputo', latitude: -25.9692, longitude: 32.5732 }
        ]
      },
      {
        name: 'Sofala',
        cities: [
          { name: 'Beira', latitude: -19.8436, longitude: 34.8389 }
        ]
      }
    ]
  },

  // Myanmar
  {
    name: 'Myanmar',
    states: [
      {
        name: 'Yangon',
        cities: [
          { name: 'Yangon', latitude: 16.8661, longitude: 96.1951 }
        ]
      },
      {
        name: 'Mandalay',
        cities: [
          { name: 'Mandalay', latitude: 21.9588, longitude: 96.0891 }
        ]
      },
      {
        name: 'Naypyidaw',
        cities: [
          { name: 'Naypyidaw', latitude: 19.7633, longitude: 96.0785 }
        ]
      }
    ]
  },

  // Namibia
  {
    name: 'Namibia',
    states: [
      {
        name: 'Khomas',
        cities: [
          { name: 'Windhoek', latitude: -22.5609, longitude: 17.0658 }
        ]
      },
      {
        name: 'Erongo',
        cities: [
          { name: 'Walvis Bay', latitude: -22.9576, longitude: 14.5053 }
        ]
      }
    ]
  },

  // Nicaragua
  {
    name: 'Nicaragua',
    states: [
      {
        name: 'Managua',
        cities: [
          { name: 'Managua', latitude: 12.1149, longitude: -86.2362 }
        ]
      },
      {
        name: 'León',
        cities: [
          { name: 'León', latitude: 12.4379, longitude: -86.8780 }
        ]
      }
    ]
  },

  // North Macedonia
  {
    name: 'North Macedonia',
    states: [
      {
        name: 'Skopje',
        cities: [
          { name: 'Skopje', latitude: 41.9973, longitude: 21.4280 }
        ]
      },
      {
        name: 'Southwestern',
        cities: [
          { name: 'Ohrid', latitude: 41.1231, longitude: 20.8016 }
        ]
      }
    ]
  },

  // Panama
  {
    name: 'Panama',
    states: [
      {
        name: 'Panamá',
        cities: [
          { name: 'Panama City', latitude: 8.9824, longitude: -79.5199 }
        ]
      },
      {
        name: 'Colón',
        cities: [
          { name: 'Colón', latitude: 9.3581, longitude: -79.9014 }
        ]
      }
    ]
  },

  // Paraguay
  {
    name: 'Paraguay',
    states: [
      {
        name: 'Asunción',
        cities: [
          { name: 'Asunción', latitude: -25.2637, longitude: -57.5759 }
        ]
      },
      {
        name: 'Central',
        cities: [
          { name: 'Ciudad del Este', latitude: -25.5096, longitude: -54.6386 }
        ]
      }
    ]
  },

  // Puerto Rico
  {
    name: 'Puerto Rico',
    states: [
      {
        name: 'San Juan',
        cities: [
          { name: 'San Juan', latitude: 18.4655, longitude: -66.1057 }
        ]
      },
      {
        name: 'Ponce',
        cities: [
          { name: 'Ponce', latitude: 18.0111, longitude: -66.6141 }
        ]
      }
    ]
  },

  // Rwanda
  {
    name: 'Rwanda',
    states: [
      {
        name: 'Kigali',
        cities: [
          { name: 'Kigali', latitude: -1.9403, longitude: 29.8739 }
        ]
      },
      {
        name: 'Eastern',
        cities: [
          { name: 'Rwamagana', latitude: -1.9494, longitude: 30.4347 }
        ]
      }
    ]
  },

  // Senegal
  {
    name: 'Senegal',
    states: [
      {
        name: 'Dakar',
        cities: [
          { name: 'Dakar', latitude: 14.6928, longitude: -17.4467 }
        ]
      },
      {
        name: 'Thiès',
        cities: [
          { name: 'Thiès', latitude: 14.7910, longitude: -16.9359 }
        ]
      }
    ]
  },

  // Serbia
  {
    name: 'Serbia',
    states: [
      {
        name: 'Belgrade',
        cities: [
          { name: 'Belgrade', latitude: 44.7866, longitude: 20.4489 }
        ]
      },
      {
        name: 'Vojvodina',
        cities: [
          { name: 'Novi Sad', latitude: 45.2671, longitude: 19.8335 }
        ]
      }
    ]
  },

  // Slovakia
  {
    name: 'Slovakia',
    states: [
      {
        name: 'Bratislava',
        cities: [
          { name: 'Bratislava', latitude: 48.1486, longitude: 17.1077 }
        ]
      },
      {
        name: 'Košice',
        cities: [
          { name: 'Košice', latitude: 48.7164, longitude: 21.2611 }
        ]
      }
    ]
  },

  // Slovenia
  {
    name: 'Slovenia',
    states: [
      {
        name: 'Central Slovenia',
        cities: [
          { name: 'Ljubljana', latitude: 46.0569, longitude: 14.5058 }
        ]
      },
      {
        name: 'Drava',
        cities: [
          { name: 'Maribor', latitude: 46.5547, longitude: 15.6459 }
        ]
      }
    ]
  },

  // Sudan
  {
    name: 'Sudan',
    states: [
      {
        name: 'Khartoum',
        cities: [
          { name: 'Khartoum', latitude: 15.5007, longitude: 32.5599 }
        ]
      },
      {
        name: 'Red Sea',
        cities: [
          { name: 'Port Sudan', latitude: 19.6158, longitude: 37.2164 }
        ]
      }
    ]
  },

  // Syria
  {
    name: 'Syria',
    states: [
      {
        name: 'Damascus',
        cities: [
          { name: 'Damascus', latitude: 33.5138, longitude: 36.2765 }
        ]
      },
      {
        name: 'Aleppo',
        cities: [
          { name: 'Aleppo', latitude: 36.2021, longitude: 37.1343 }
        ]
      }
    ]
  },

  // Taiwan
  {
    name: 'Taiwan',
    states: [
      {
        name: 'Taipei',
        cities: [
          { name: 'Taipei', latitude: 25.0330, longitude: 121.5654 }
        ]
      },
      {
        name: 'Kaohsiung',
        cities: [
          { name: 'Kaohsiung', latitude: 22.6273, longitude: 120.3014 }
        ]
      },
      {
        name: 'Taichung',
        cities: [
          { name: 'Taichung', latitude: 24.1477, longitude: 120.6736 }
        ]
      }
    ]
  },

  // Trinidad and Tobago
  {
    name: 'Trinidad and Tobago',
    states: [
      {
        name: 'Port of Spain',
        cities: [
          { name: 'Port of Spain', latitude: 10.6596, longitude: -61.5086 }
        ]
      },
      {
        name: 'San Fernando',
        cities: [
          { name: 'San Fernando', latitude: 10.2803, longitude: -61.4688 }
        ]
      }
    ]
  },

  // Tunisia
  {
    name: 'Tunisia',
    states: [
      {
        name: 'Tunis',
        cities: [
          { name: 'Tunis', latitude: 36.8065, longitude: 10.1815 }
        ]
      },
      {
        name: 'Sfax',
        cities: [
          { name: 'Sfax', latitude: 34.7398, longitude: 10.7600 }
        ]
      },
      {
        name: 'Sousse',
        cities: [
          { name: 'Sousse', latitude: 35.8288, longitude: 10.6405 }
        ]
      }
    ]
  },

  // Uganda
  {
    name: 'Uganda',
    states: [
      {
        name: 'Central',
        cities: [
          { name: 'Kampala', latitude: 0.3476, longitude: 32.5825 }
        ]
      },
      {
        name: 'Eastern',
        cities: [
          { name: 'Jinja', latitude: 0.4244, longitude: 33.2041 }
        ]
      }
    ]
  },

  // Uruguay
  {
    name: 'Uruguay',
    states: [
      {
        name: 'Montevideo',
        cities: [
          { name: 'Montevideo', latitude: -34.9011, longitude: -56.1645 }
        ]
      },
      {
        name: 'Maldonado',
        cities: [
          { name: 'Punta del Este', latitude: -34.9475, longitude: -54.9358 }
        ]
      }
    ]
  },

  // Uzbekistan
  {
    name: 'Uzbekistan',
    states: [
      {
        name: 'Tashkent',
        cities: [
          { name: 'Tashkent', latitude: 41.2995, longitude: 69.2401 }
        ]
      },
      {
        name: 'Samarkand',
        cities: [
          { name: 'Samarkand', latitude: 39.6542, longitude: 66.9597 }
        ]
      },
      {
        name: 'Bukhara',
        cities: [
          { name: 'Bukhara', latitude: 39.7747, longitude: 64.4286 }
        ]
      }
    ]
  },

  // Venezuela
  {
    name: 'Venezuela',
    states: [
      {
        name: 'Distrito Capital',
        cities: [
          { name: 'Caracas', latitude: 10.4806, longitude: -66.9036 }
        ]
      },
      {
        name: 'Zulia',
        cities: [
          { name: 'Maracaibo', latitude: 10.6666, longitude: -71.6124 }
        ]
      },
      {
        name: 'Carabobo',
        cities: [
          { name: 'Valencia', latitude: 10.1579, longitude: -67.9972 }
        ]
      }
    ]
  },

  // Zambia
  {
    name: 'Zambia',
    states: [
      {
        name: 'Lusaka',
        cities: [
          { name: 'Lusaka', latitude: -15.3875, longitude: 28.3228 }
        ]
      },
      {
        name: 'Copperbelt',
        cities: [
          { name: 'Kitwe', latitude: -12.8024, longitude: 28.2132 }
        ]
      },
      {
        name: 'Southern',
        cities: [
          { name: 'Livingstone', latitude: -17.8419, longitude: 25.8544 }
        ]
      }
    ]
  }
];
