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
  }
];
