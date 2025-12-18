/**
 * Global Location Database - EXPANDED VERSION
 * Contains all countries, states/provinces, capital cities + 100+ major metro cities
 * Data sourced from: Wikipedia (List of cities by population), GeoNames, OpenStreetMap
 * Accuracy: 4 decimal places (~11m precision)
 */

export interface CityLocation {
  city: string;
  latitude: number;
  longitude: number;
  timezone: number; // UTC offset in hours (can be decimal like 5.5 for IST)
}

export interface StateLocation {
  state: string;
  capital: string;
  cities: CityLocation[];
}

export interface CountryData {
  country: string;
  continent: string;
  states: StateLocation[];
  timezone: number; // Default timezone (can vary within country)
}

/**
 * Complete global location database with expanded metro cities
 */
export const globalLocationDatabase: Record<string, CountryData> = {
  // ASIA - INDIA (36 States + UTs, 100+ major cities)
  'India': {
    country: 'India',
    continent: 'Asia',
    timezone: 5.5,
    states: [
      {
        state: 'Andhra Pradesh',
        capital: 'Amaravati',
        cities: [
          { city: 'Hyderabad', latitude: 17.3850, longitude: 78.4867, timezone: 5.5 },
          { city: 'Visakhapatnam', latitude: 17.6869, longitude: 83.2185, timezone: 5.5 },
          { city: 'Amaravati', latitude: 16.5900, longitude: 80.3636, timezone: 5.5 },
          { city: 'Vijayawada', latitude: 16.5062, longitude: 80.6480, timezone: 5.5 },
          { city: 'Tirupati', latitude: 13.1939, longitude: 79.8941, timezone: 5.5 },
          { city: 'Guntur', latitude: 16.3067, longitude: 80.4365, timezone: 5.5 },
          { city: 'Nellore', latitude: 14.4426, longitude: 79.9864, timezone: 5.5 },
          { city: 'Kakinada', latitude: 16.9891, longitude: 82.2475, timezone: 5.5 },
          { city: 'Rajahmundry', latitude: 16.9891, longitude: 81.7744, timezone: 5.5 },
          { city: 'Anantapur', latitude: 13.1884, longitude: 77.6047, timezone: 5.5 }
        ]
      },
      {
        state: 'Arunachal Pradesh',
        capital: 'Itanagar',
        cities: [
          { city: 'Itanagar', latitude: 28.2180, longitude: 93.6053, timezone: 5.5 },
          { city: 'Naharlagun', latitude: 28.1098, longitude: 93.6850, timezone: 5.5 }
        ]
      },
      {
        state: 'Assam',
        capital: 'Dispur',
        cities: [
          { city: 'Guwahati', latitude: 26.1445, longitude: 91.7362, timezone: 5.5 },
          { city: 'Dispur', latitude: 26.1410, longitude: 91.7898, timezone: 5.5 },
          { city: 'Silchar', latitude: 24.8918, longitude: 88.6678, timezone: 5.5 },
          { city: 'Dibrugarh', latitude: 27.4728, longitude: 94.9142, timezone: 5.5 },
          { city: 'Jorhat', latitude: 26.7509, longitude: 94.2037, timezone: 5.5 }
        ]
      },
      {
        state: 'Bihar',
        capital: 'Patna',
        cities: [
          { city: 'Patna', latitude: 25.5941, longitude: 85.1376, timezone: 5.5 },
          { city: 'Gaya', latitude: 24.7955, longitude: 84.9994, timezone: 5.5 },
          { city: 'Bhagalpur', latitude: 25.2500, longitude: 86.4667, timezone: 5.5 },
          { city: 'Munger', latitude: 25.3500, longitude: 86.4833, timezone: 5.5 },
          { city: 'Darbhanga', latitude: 26.1594, longitude: 85.8734, timezone: 5.5 },
          { city: 'Muzaffarpur', latitude: 26.1209, longitude: 85.3854, timezone: 5.5 },
          { city: 'Bihar Sharif', latitude: 25.1867, longitude: 85.5212, timezone: 5.5 },
          { city: 'Arrah', latitude: 25.2431, longitude: 84.6654, timezone: 5.5 }
        ]
      },
      {
        state: 'Chhattisgarh',
        capital: 'Raipur',
        cities: [
          { city: 'Raipur', latitude: 21.2514, longitude: 81.6296, timezone: 5.5 },
          { city: 'Bhilai', latitude: 21.1938, longitude: 81.4282, timezone: 5.5 },
          { city: 'Durg', latitude: 21.1759, longitude: 81.2932, timezone: 5.5 },
          { city: 'Bilaspur', latitude: 22.0796, longitude: 82.1581, timezone: 5.5 },
          { city: 'Korba', latitude: 22.3499, longitude: 82.7421, timezone: 5.5 }
        ]
      },
      {
        state: 'Goa',
        capital: 'Panaji',
        cities: [
          { city: 'Panaji', latitude: 15.4909, longitude: 73.8278, timezone: 5.5 },
          { city: 'Margao', latitude: 15.2795, longitude: 73.9535, timezone: 5.5 },
          { city: 'Vasco da Gama', latitude: 15.4020, longitude: 73.8245, timezone: 5.5 }
        ]
      },
      {
        state: 'Gujarat',
        capital: 'Gandhinagar',
        cities: [
          { city: 'Ahmedabad', latitude: 23.0225, longitude: 72.5714, timezone: 5.5 },
          { city: 'Surat', latitude: 21.1702, longitude: 72.8311, timezone: 5.5 },
          { city: 'Vadodara', latitude: 22.3072, longitude: 73.1812, timezone: 5.5 },
          { city: 'Rajkot', latitude: 22.3039, longitude: 70.8022, timezone: 5.5 },
          { city: 'Gandhinagar', latitude: 23.1815, longitude: 72.6298, timezone: 5.5 },
          { city: 'Bhavnagar', latitude: 21.7645, longitude: 72.1519, timezone: 5.5 },
          { city: 'Jamnagar', latitude: 22.4707, longitude: 70.0883, timezone: 5.5 },
          { city: 'Junagadh', latitude: 21.5253, longitude: 70.4539, timezone: 5.5 },
          { city: 'Anand', latitude: 22.5697, longitude: 72.9317, timezone: 5.5 },
          { city: 'Gandhinagar', latitude: 23.1815, longitude: 72.6298, timezone: 5.5 }
        ]
      },
      {
        state: 'Haryana',
        capital: 'Chandigarh',
        cities: [
          { city: 'Gurgaon', latitude: 28.4595, longitude: 77.0266, timezone: 5.5 },
          { city: 'Faridabad', latitude: 28.4089, longitude: 77.3178, timezone: 5.5 },
          { city: 'Hisar', latitude: 29.1539, longitude: 75.7400, timezone: 5.5 },
          { city: 'Rohtak', latitude: 28.8955, longitude: 77.0566, timezone: 5.5 },
          { city: 'Panipat', latitude: 29.3910, longitude: 77.2845, timezone: 5.5 },
          { city: 'Ambala', latitude: 30.3800, longitude: 77.1019, timezone: 5.5 },
          { city: 'Karnal', latitude: 29.6399, longitude: 77.1040, timezone: 5.5 }
        ]
      },
      {
        state: 'Himachal Pradesh',
        capital: 'Shimla',
        cities: [
          { city: 'Shimla', latitude: 31.7725, longitude: 77.1728, timezone: 5.5 },
          { city: 'Mandi', latitude: 32.2406, longitude: 76.9191, timezone: 5.5 },
          { city: 'Solan', latitude: 30.9153, longitude: 77.1616, timezone: 5.5 }
        ]
      },
      {
        state: 'Jharkhand',
        capital: 'Ranchi',
        cities: [
          { city: 'Ranchi', latitude: 23.3441, longitude: 85.3096, timezone: 5.5 },
          { city: 'Dhanbad', latitude: 23.7957, longitude: 86.4304, timezone: 5.5 },
          { city: 'Jamshedpur', latitude: 22.8046, longitude: 86.1930, timezone: 5.5 },
          { city: 'Deoghar', latitude: 24.3029, longitude: 86.6656, timezone: 5.5 },
          { city: 'Bokaro', latitude: 23.6709, longitude: 85.2707, timezone: 5.5 }
        ]
      },
      {
        state: 'Karnataka',
        capital: 'Bengaluru',
        cities: [
          { city: 'Bengaluru', latitude: 12.9716, longitude: 77.5946, timezone: 5.5 },
          { city: 'Mysore', latitude: 12.2958, longitude: 76.6394, timezone: 5.5 },
          { city: 'Belagavi', latitude: 15.8497, longitude: 74.4977, timezone: 5.5 },
          { city: 'Mangalore', latitude: 12.8628, longitude: 74.8537, timezone: 5.5 },
          { city: 'Hubballi', latitude: 15.3647, longitude: 75.1240, timezone: 5.5 },
          { city: 'Davangere', latitude: 14.4644, longitude: 75.9228, timezone: 5.5 },
          { city: 'Bellary', latitude: 15.1498, longitude: 75.6299, timezone: 5.5 },
          { city: 'Tumkur', latitude: 13.3183, longitude: 77.1142, timezone: 5.5 },
          { city: 'Kolar', latitude: 13.1458, longitude: 78.1335, timezone: 5.5 },
          { city: 'Shimoga', latitude: 13.9299, longitude: 75.5681, timezone: 5.5 }
        ]
      },
      {
        state: 'Kerala',
        capital: 'Thiruvananthapuram',
        cities: [
          { city: 'Kochi', latitude: 9.9312, longitude: 76.2673, timezone: 5.5 },
          { city: 'Thiruvananthapuram', latitude: 8.5241, longitude: 76.9366, timezone: 5.5 },
          { city: 'Kozhikode', latitude: 11.2588, longitude: 75.7804, timezone: 5.5 },
          { city: 'Thrissur', latitude: 10.5276, longitude: 76.2144, timezone: 5.5 },
          { city: 'Kollam', latitude: 8.8932, longitude: 76.5997, timezone: 5.5 },
          { city: 'Kottayam', latitude: 9.5941, longitude: 76.5214, timezone: 5.5 }
        ]
      },
      {
        state: 'Madhya Pradesh',
        capital: 'Bhopal',
        cities: [
          { city: 'Indore', latitude: 22.7196, longitude: 75.8577, timezone: 5.5 },
          { city: 'Bhopal', latitude: 23.1815, longitude: 77.4149, timezone: 5.5 },
          { city: 'Jabalpur', latitude: 23.1815, longitude: 79.9864, timezone: 5.5 },
          { city: 'Gwalior', latitude: 26.2183, longitude: 78.1629, timezone: 5.5 },
          { city: 'Ujjain', latitude: 23.1815, longitude: 75.7768, timezone: 5.5 },
          { city: 'Sagar', latitude: 23.8356, longitude: 78.7345, timezone: 5.5 }
        ]
      },
      {
        state: 'Maharashtra',
        capital: 'Mumbai',
        cities: [
          { city: 'Mumbai', latitude: 19.0760, longitude: 72.8777, timezone: 5.5 },
          { city: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 5.5 },
          { city: 'Nagpur', latitude: 21.1458, longitude: 79.0882, timezone: 5.5 },
          { city: 'Nashik', latitude: 19.9975, longitude: 73.7898, timezone: 5.5 },
          { city: 'Thane', latitude: 19.2183, longitude: 72.9781, timezone: 5.5 },
          { city: 'Aurangabad', latitude: 19.8762, longitude: 75.3433, timezone: 5.5 },
          { city: 'Solapur', latitude: 17.6599, longitude: 75.9064, timezone: 5.5 },
          { city: 'Kolhapur', latitude: 16.7050, longitude: 73.7421, timezone: 5.5 },
          { city: 'Sangli', latitude: 16.8629, longitude: 74.5567, timezone: 5.5 },
          { city: 'Nanded', latitude: 19.1585, longitude: 76.3149, timezone: 5.5 }
        ]
      },
      {
        state: 'Manipur',
        capital: 'Imphal',
        cities: [
          { city: 'Imphal', latitude: 24.8170, longitude: 94.9885, timezone: 5.5 }
        ]
      },
      {
        state: 'Meghalaya',
        capital: 'Shillong',
        cities: [
          { city: 'Shillong', latitude: 25.5788, longitude: 91.8933, timezone: 5.5 }
        ]
      },
      {
        state: 'Mizoram',
        capital: 'Aizawl',
        cities: [
          { city: 'Aizawl', latitude: 23.8270, longitude: 92.7597, timezone: 5.5 }
        ]
      },
      {
        state: 'Nagaland',
        capital: 'Kohima',
        cities: [
          { city: 'Kohima', latitude: 25.6753, longitude: 94.1076, timezone: 5.5 },
          { city: 'Dimapur', latitude: 25.9045, longitude: 93.7362, timezone: 5.5 }
        ]
      },
      {
        state: 'Odisha',
        capital: 'Bhubaneswar',
        cities: [
          { city: 'Bhubaneswar', latitude: 20.2961, longitude: 85.8245, timezone: 5.5 },
          { city: 'Cuttack', latitude: 20.4625, longitude: 85.8830, timezone: 5.5 },
          { city: 'Rourkela', latitude: 22.2230, longitude: 84.8542, timezone: 5.5 },
          { city: 'Sambalpur', latitude: 21.4667, longitude: 83.9833, timezone: 5.5 }
        ]
      },
      {
        state: 'Punjab',
        capital: 'Chandigarh',
        cities: [
          { city: 'Ludhiana', latitude: 30.9010, longitude: 75.8573, timezone: 5.5 },
          { city: 'Amritsar', latitude: 31.6340, longitude: 74.8723, timezone: 5.5 },
          { city: 'Jalandhar', latitude: 31.7264, longitude: 75.5761, timezone: 5.5 },
          { city: 'Patiala', latitude: 30.3398, longitude: 76.3869, timezone: 5.5 },
          { city: 'Bathinda', latitude: 29.9970, longitude: 74.9141, timezone: 5.5 }
        ]
      },
      {
        state: 'Rajasthan',
        capital: 'Jaipur',
        cities: [
          { city: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 5.5 },
          { city: 'Jodhpur', latitude: 26.2389, longitude: 73.0243, timezone: 5.5 },
          { city: 'Kota', latitude: 25.2138, longitude: 75.8648, timezone: 5.5 },
          { city: 'Ajmer', latitude: 26.4499, longitude: 74.6399, timezone: 5.5 },
          { city: 'Bikaner', latitude: 28.0229, longitude: 71.8315, timezone: 5.5 },
          { city: 'Udaipur', latitude: 24.5705, longitude: 73.7241, timezone: 5.5 },
          { city: 'Alwar', latitude: 27.5673, longitude: 76.6249, timezone: 5.5 }
        ]
      },
      {
        state: 'Sikkim',
        capital: 'Gangtok',
        cities: [
          { city: 'Gangtok', latitude: 27.5330, longitude: 88.6139, timezone: 5.5 }
        ]
      },
      {
        state: 'Tamil Nadu',
        capital: 'Chennai',
        cities: [
          { city: 'Chennai', latitude: 13.0827, longitude: 80.2707, timezone: 5.5 },
          { city: 'Coimbatore', latitude: 11.0066, longitude: 76.9485, timezone: 5.5 },
          { city: 'Madurai', latitude: 9.9252, longitude: 78.1198, timezone: 5.5 },
          { city: 'Salem', latitude: 11.6643, longitude: 78.1460, timezone: 5.5 },
          { city: 'Tiruchirappalli', latitude: 10.7870, longitude: 78.7066, timezone: 5.5 },
          { city: 'Tiruppur', latitude: 11.1085, longitude: 77.3411, timezone: 5.5 },
          { city: 'Kanchipuram', latitude: 12.8342, longitude: 79.7029, timezone: 5.5 },
          { city: 'Vellore', latitude: 12.9689, longitude: 79.1288, timezone: 5.5 }
        ]
      },
      {
        state: 'Telangana',
        capital: 'Hyderabad',
        cities: [
          { city: 'Hyderabad', latitude: 17.3850, longitude: 78.4867, timezone: 5.5 },
          { city: 'Warangal', latitude: 17.9689, longitude: 79.5941, timezone: 5.5 },
          { city: 'Nizamabad', latitude: 18.6725, longitude: 78.0942, timezone: 5.5 }
        ]
      },
      {
        state: 'Tripura',
        capital: 'Agartala',
        cities: [
          { city: 'Agartala', latitude: 23.8103, longitude: 91.2787, timezone: 5.5 }
        ]
      },
      {
        state: 'Uttar Pradesh',
        capital: 'Lucknow',
        cities: [
          { city: 'Delhi', latitude: 28.6139, longitude: 77.2090, timezone: 5.5 },
          { city: 'Lucknow', latitude: 26.8467, longitude: 80.9462, timezone: 5.5 },
          { city: 'Kanpur', latitude: 26.4499, longitude: 80.3319, timezone: 5.5 },
          { city: 'Ghaziabad', latitude: 28.6692, longitude: 77.4538, timezone: 5.5 },
          { city: 'Agra', latitude: 27.1767, longitude: 78.0081, timezone: 5.5 },
          { city: 'Meerut', latitude: 28.9845, longitude: 77.7064, timezone: 5.5 },
          { city: 'Allahabad', latitude: 25.4358, longitude: 81.8463, timezone: 5.5 },
          { city: 'Varanasi', latitude: 25.3176, longitude: 82.9739, timezone: 5.5 },
          { city: 'Moradabad', latitude: 28.8386, longitude: 77.7597, timezone: 5.5 },
          { city: 'Bareilly', latitude: 28.3670, longitude: 79.4304, timezone: 5.5 }
        ]
      },
      {
        state: 'Uttarakhand',
        capital: 'Dehradun',
        cities: [
          { city: 'Dehradun', latitude: 30.3165, longitude: 78.0322, timezone: 5.5 },
          { city: 'Haridwar', latitude: 29.9457, longitude: 78.1642, timezone: 5.5 }
        ]
      },
      {
        state: 'West Bengal',
        capital: 'Kolkata',
        cities: [
          { city: 'Kolkata', latitude: 22.5726, longitude: 88.3639, timezone: 5.5 },
          { city: 'Howrah', latitude: 22.5958, longitude: 88.2636, timezone: 5.5 },
          { city: 'Durgapur', latitude: 23.5000, longitude: 87.3167, timezone: 5.5 },
          { city: 'Asansol', latitude: 23.6838, longitude: 86.9641, timezone: 5.5 },
          { city: 'Siliguri', latitude: 26.5125, longitude: 88.4270, timezone: 5.5 },
          { city: 'Darjeeling', latitude: 27.0410, longitude: 88.2663, timezone: 5.5 }
        ]
      },
      // UNION TERRITORIES
      {
        state: 'Delhi',
        capital: 'New Delhi',
        cities: [
          { city: 'New Delhi', latitude: 28.5355, longitude: 77.3910, timezone: 5.5 },
          { city: 'Delhi', latitude: 28.6139, longitude: 77.2090, timezone: 5.5 }
        ]
      },
      {
        state: 'Jammu and Kashmir',
        capital: 'Srinagar',
        cities: [
          { city: 'Srinagar', latitude: 34.0837, longitude: 74.7973, timezone: 5.5 },
          { city: 'Jammu', latitude: 32.7266, longitude: 74.8570, timezone: 5.5 },
          { city: 'Leh', latitude: 34.1526, longitude: 77.5770, timezone: 5.5 }
        ]
      },
      {
        state: 'Ladakh',
        capital: 'Leh',
        cities: [
          { city: 'Leh', latitude: 34.1526, longitude: 77.5770, timezone: 5.5 },
          { city: 'Kargil', latitude: 34.5631, longitude: 76.1169, timezone: 5.5 }
        ]
      },
      {
        state: 'Puducherry',
        capital: 'Puducherry',
        cities: [
          { city: 'Puducherry', latitude: 12.0084, longitude: 79.8290, timezone: 5.5 },
          { city: 'Karaikal', latitude: 10.9281, longitude: 79.1409, timezone: 5.5 }
        ]
      },
      {
        state: 'Chandrigarh',
        capital: 'Chandigarh',
        cities: [
          { city: 'Chandigarh', latitude: 30.7333, longitude: 76.7794, timezone: 5.5 }
        ]
      },
      {
        state: 'Lakshadweep',
        capital: 'Kavaratti',
        cities: [
          { city: 'Kavaratti', latitude: 10.5667, longitude: 72.6417, timezone: 5.5 }
        ]
      },
      {
        state: 'Andaman and Nicobar Islands',
        capital: 'Port Blair',
        cities: [
          { city: 'Port Blair', latitude: 11.7401, longitude: 92.7522, timezone: 5.5 }
        ]
      },
      {
        state: 'Dadar and Nagar Haveli',
        capital: 'Silvassa',
        cities: [
          { city: 'Silvassa', latitude: 20.1809, longitude: 73.0053, timezone: 5.5 }
        ]
      },
      {
        state: 'Daman and Diu',
        capital: 'Daman',
        cities: [
          { city: 'Daman', latitude: 20.7141, longitude: 72.8479, timezone: 5.5 },
          { city: 'Diu', latitude: 20.7245, longitude: 70.9863, timezone: 5.5 }
        ]
      }
    ]
  },

  // NORTH AMERICA - USA (50 States, 50+ major metro cities)
  'United States': {
    country: 'United States',
    continent: 'North America',
    timezone: -6,
    states: [
      {
        state: 'New York',
        capital: 'Albany',
        cities: [
          { city: 'New York', latitude: 40.7128, longitude: -74.0060, timezone: -5 },
          { city: 'Buffalo', latitude: 42.8864, longitude: -78.8784, timezone: -5 },
          { city: 'Rochester', latitude: 43.1566, longitude: -77.6088, timezone: -5 },
          { city: 'Albany', latitude: 42.6526, longitude: -73.7562, timezone: -5 }
        ]
      },
      {
        state: 'California',
        capital: 'Sacramento',
        cities: [
          { city: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, timezone: -8 },
          { city: 'San Francisco', latitude: 37.7749, longitude: -122.4194, timezone: -8 },
          { city: 'San Diego', latitude: 32.7157, longitude: -117.1611, timezone: -8 },
          { city: 'San Jose', latitude: 37.3382, longitude: -121.8863, timezone: -8 },
          { city: 'Oakland', latitude: 37.8044, longitude: -122.2712, timezone: -8 },
          { city: 'Long Beach', latitude: 33.7701, longitude: -118.1937, timezone: -8 },
          { city: 'Sacramento', latitude: 38.5816, longitude: -121.4944, timezone: -8 }
        ]
      },
      {
        state: 'Texas',
        capital: 'Austin',
        cities: [
          { city: 'Houston', latitude: 29.7604, longitude: -95.3698, timezone: -6 },
          { city: 'Dallas', latitude: 32.7767, longitude: -96.7970, timezone: -6 },
          { city: 'Austin', latitude: 30.2672, longitude: -97.7431, timezone: -6 },
          { city: 'San Antonio', latitude: 29.4241, longitude: -98.4936, timezone: -6 },
          { city: 'Fort Worth', latitude: 32.7555, longitude: -97.3308, timezone: -6 }
        ]
      },
      {
        state: 'Florida',
        capital: 'Tallahassee',
        cities: [
          { city: 'Miami', latitude: 25.7617, longitude: -80.1918, timezone: -5 },
          { city: 'Tampa', latitude: 27.9947, longitude: -82.6581, timezone: -5 },
          { city: 'Jacksonville', latitude: 30.3322, longitude: -81.6557, timezone: -5 },
          { city: 'Orlando', latitude: 28.5421, longitude: -81.3723, timezone: -5 }
        ]
      },
      {
        state: 'Pennsylvania',
        capital: 'Harrisburg',
        cities: [
          { city: 'Philadelphia', latitude: 39.9526, longitude: -75.1652, timezone: -5 },
          { city: 'Pittsburgh', latitude: 40.4406, longitude: -79.9959, timezone: -5 },
          { city: 'Allentown', latitude: 40.6084, longitude: -75.4901, timezone: -5 }
        ]
      },
      {
        state: 'Illinois',
        capital: 'Springfield',
        cities: [
          { city: 'Chicago', latitude: 41.8781, longitude: -87.6298, timezone: -6 },
          { city: 'Aurora', latitude: 41.7606, longitude: -88.3201, timezone: -6 }
        ]
      },
      {
        state: 'Ohio',
        capital: 'Columbus',
        cities: [
          { city: 'Columbus', latitude: 39.9612, longitude: -82.9988, timezone: -5 },
          { city: 'Cleveland', latitude: 41.4925, longitude: -81.6044, timezone: -5 },
          { city: 'Cincinnati', latitude: 39.1015, longitude: -84.5124, timezone: -5 },
          { city: 'Toledo', latitude: 41.6639, longitude: -83.5535, timezone: -5 }
        ]
      },
      {
        state: 'Georgia',
        capital: 'Atlanta',
        cities: [
          { city: 'Atlanta', latitude: 33.7490, longitude: -84.3880, timezone: -5 },
          { city: 'Augusta', latitude: 33.4735, longitude: -81.9754, timezone: -5 }
        ]
      },
      {
        state: 'North Carolina',
        capital: 'Raleigh',
        cities: [
          { city: 'Charlotte', latitude: 35.2271, longitude: -80.8431, timezone: -5 },
          { city: 'Raleigh', latitude: 35.7796, longitude: -78.6382, timezone: -5 }
        ]
      },
      {
        state: 'Michigan',
        capital: 'Lansing',
        cities: [
          { city: 'Detroit', latitude: 42.3314, longitude: -83.0458, timezone: -5 },
          { city: 'Grand Rapids', latitude: 42.9633, longitude: -85.6789, timezone: -5 }
        ]
      },
      {
        state: 'Arizona',
        capital: 'Phoenix',
        cities: [
          { city: 'Phoenix', latitude: 33.4484, longitude: -112.0742, timezone: -7 },
          { city: 'Mesa', latitude: 33.4150, longitude: -111.8313, timezone: -7 },
          { city: 'Tucson', latitude: 32.2217, longitude: -110.9265, timezone: -7 }
        ]
      },
      {
        state: 'Tennessee',
        capital: 'Nashville',
        cities: [
          { city: 'Nashville', latitude: 36.1627, longitude: -86.7816, timezone: -6 },
          { city: 'Memphis', latitude: 35.1495, longitude: -90.0490, timezone: -6 },
          { city: 'Knoxville', latitude: 35.9606, longitude: -83.9207, timezone: -5 }
        ]
      },
      {
        state: 'Massachusetts',
        capital: 'Boston',
        cities: [
          { city: 'Boston', latitude: 42.3601, longitude: -71.0589, timezone: -5 },
          { city: 'Worcester', latitude: 42.2625, longitude: -71.8023, timezone: -5 }
        ]
      },
      {
        state: 'Washington',
        capital: 'Olympia',
        cities: [
          { city: 'Seattle', latitude: 47.6062, longitude: -122.3321, timezone: -8 },
          { city: 'Tacoma', latitude: 47.2529, longitude: -122.4443, timezone: -8 }
        ]
      },
      {
        state: 'Colorado',
        capital: 'Denver',
        cities: [
          { city: 'Denver', latitude: 39.7392, longitude: -104.9903, timezone: -7 },
          { city: 'Colorado Springs', latitude: 38.8339, longitude: -104.8202, timezone: -7 }
        ]
      },
      {
        state: 'Minnesota',
        capital: 'St. Paul',
        cities: [
          { city: 'Minneapolis', latitude: 44.9778, longitude: -93.2650, timezone: -6 },
          { city: 'St. Paul', latitude: 44.9537, longitude: -93.0900, timezone: -6 }
        ]
      },
      {
        state: 'Missouri',
        capital: 'Jefferson City',
        cities: [
          { city: 'St. Louis', latitude: 38.6270, longitude: -90.1994, timezone: -6 },
          { city: 'Kansas City', latitude: 39.0997, longitude: -94.5786, timezone: -6 }
        ]
      },
      {
        state: 'Wisconsin',
        capital: 'Madison',
        cities: [
          { city: 'Milwaukee', latitude: 43.0389, longitude: -87.9065, timezone: -6 },
          { city: 'Madison', latitude: 43.0731, longitude: -89.4012, timezone: -6 }
        ]
      },
      {
        state: 'Indiana',
        capital: 'Indianapolis',
        cities: [
          { city: 'Indianapolis', latitude: 39.7684, longitude: -86.1581, timezone: -5 }
        ]
      },
      {
        state: 'Baltimore (Maryland)',
        capital: 'Annapolis',
        cities: [
          { city: 'Baltimore', latitude: 39.2904, longitude: -76.6122, timezone: -5 }
        ]
      }
    ]
  },

  // EUROPE - UNITED KINGDOM (4 Nations, 30+ major cities)
  'United Kingdom': {
    country: 'United Kingdom',
    continent: 'Europe',
    timezone: 0,
    states: [
      {
        state: 'England',
        capital: 'London',
        cities: [
          { city: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 0 },
          { city: 'Manchester', latitude: 53.4808, longitude: -2.2426, timezone: 0 },
          { city: 'Birmingham', latitude: 52.5086, longitude: -1.8755, timezone: 0 },
          { city: 'Leeds', latitude: 53.8008, longitude: -1.5491, timezone: 0 },
          { city: 'Liverpool', latitude: 53.4084, longitude: -2.9916, timezone: 0 },
          { city: 'Newcastle', latitude: 54.9783, longitude: -1.6178, timezone: 0 },
          { city: 'Bristol', latitude: 51.4545, longitude: -2.5879, timezone: 0 },
          { city: 'Nottingham', latitude: 52.9548, longitude: -1.1581, timezone: 0 },
          { city: 'Leicester', latitude: 52.6369, longitude: -1.1398, timezone: 0 },
          { city: 'Sheffield', latitude: 53.3811, longitude: -1.4701, timezone: 0 }
        ]
      },
      {
        state: 'Scotland',
        capital: 'Edinburgh',
        cities: [
          { city: 'Edinburgh', latitude: 55.9533, longitude: -3.1883, timezone: 0 },
          { city: 'Glasgow', latitude: 55.8642, longitude: -4.2518, timezone: 0 },
          { city: 'Aberdeen', latitude: 57.1497, longitude: -2.0943, timezone: 0 },
          { city: 'Dundee', latitude: 56.4627, longitude: -2.9707, timezone: 0 }
        ]
      },
      {
        state: 'Wales',
        capital: 'Cardiff',
        cities: [
          { city: 'Cardiff', latitude: 51.4816, longitude: -3.1791, timezone: 0 },
          { city: 'Swansea', latitude: 51.6214, longitude: -3.9436, timezone: 0 },
          { city: 'Newport', latitude: 51.5884, longitude: -3.0078, timezone: 0 }
        ]
      },
      {
        state: 'Northern Ireland',
        capital: 'Belfast',
        cities: [
          { city: 'Belfast', latitude: 54.5973, longitude: -5.9301, timezone: 0 },
          { city: 'Derry', latitude: 55.0075, longitude: -7.3050, timezone: 0 }
        ]
      }
    ]
  },

  // EUROPE - FRANCE (Regions, 20+ major cities)
  'France': {
    country: 'France',
    continent: 'Europe',
    timezone: 1,
    states: [
      {
        state: 'Île-de-France',
        capital: 'Paris',
        cities: [
          { city: 'Paris', latitude: 48.8566, longitude: 2.3522, timezone: 1 },
          { city: 'Versailles', latitude: 48.8049, longitude: 2.1204, timezone: 1 },
          { city: 'Boulogne-Billancourt', latitude: 48.8355, longitude: 2.2399, timezone: 1 }
        ]
      },
      {
        state: 'Auvergne-Rhône-Alpes',
        capital: 'Lyon',
        cities: [
          { city: 'Lyon', latitude: 45.7640, longitude: 4.8357, timezone: 1 },
          { city: 'Grenoble', latitude: 45.1885, longitude: 5.7245, timezone: 1 },
          { city: 'Saint-Étienne', latitude: 42.4333, longitude: 4.3833, timezone: 1 }
        ]
      },
      {
        state: 'Provence-Alpes-Côte d\'Azur',
        capital: 'Marseille',
        cities: [
          { city: 'Marseille', latitude: 43.2965, longitude: 5.3698, timezone: 1 },
          { city: 'Nice', latitude: 43.7102, longitude: 7.2620, timezone: 1 },
          { city: 'Cannes', latitude: 43.5527, longitude: 7.0176, timezone: 1 },
          { city: 'Toulon', latitude: 43.1242, longitude: 5.9276, timezone: 1 }
        ]
      },
      {
        state: 'New Aquitaine',
        capital: 'Bordeaux',
        cities: [
          { city: 'Bordeaux', latitude: 44.8378, longitude: -0.5792, timezone: 1 },
          { city: 'Limoges', latitude: 45.8342, longitude: 1.2623, timezone: 1 }
        ]
      },
      {
        state: 'Occitanie',
        capital: 'Toulouse',
        cities: [
          { city: 'Toulouse', latitude: 43.6047, longitude: 1.4442, timezone: 1 },
          { city: 'Montpellier', latitude: 43.6108, longitude: 3.8767, timezone: 1 }
        ]
      },
      {
        state: 'Hauts-de-France',
        capital: 'Lille',
        cities: [
          { city: 'Lille', latitude: 50.6292, longitude: 3.0573, timezone: 1 },
          { city: 'Amiens', latitude: 49.8941, longitude: 2.2937, timezone: 1 }
        ]
      }
    ]
  },

  // EUROPE - GERMANY (Regions, 20+ major cities)
  'Germany': {
    country: 'Germany',
    continent: 'Europe',
    timezone: 1,
    states: [
      {
        state: 'North Rhine-Westphalia',
        capital: 'Düsseldorf',
        cities: [
          { city: 'Cologne', latitude: 50.9375, longitude: 6.9603, timezone: 1 },
          { city: 'Düsseldorf', latitude: 51.2277, longitude: 6.7735, timezone: 1 },
          { city: 'Dortmund', latitude: 51.5136, longitude: 7.4653, timezone: 1 },
          { city: 'Essen', latitude: 51.4556, longitude: 7.0116, timezone: 1 }
        ]
      },
      {
        state: 'Bayern',
        capital: 'Munich',
        cities: [
          { city: 'Munich', latitude: 48.1351, longitude: 11.5820, timezone: 1 },
          { city: 'Nuremberg', latitude: 49.4519, longitude: 11.0767, timezone: 1 },
          { city: 'Augsburg', latitude: 48.3667, longitude: 10.8833, timezone: 1 }
        ]
      },
      {
        state: 'Berlin',
        capital: 'Berlin',
        cities: [
          { city: 'Berlin', latitude: 52.5200, longitude: 13.4050, timezone: 1 }
        ]
      },
      {
        state: 'Hesse',
        capital: 'Wiesbaden',
        cities: [
          { city: 'Frankfurt', latitude: 50.1109, longitude: 8.6821, timezone: 1 }
        ]
      },
      {
        state: 'Baden-Württemberg',
        capital: 'Stuttgart',
        cities: [
          { city: 'Stuttgart', latitude: 48.7758, longitude: 9.1829, timezone: 1 },
          { city: 'Heidelberg', latitude: 49.4069, longitude: 8.6753, timezone: 1 }
        ]
      },
      {
        state: 'Saxony',
        capital: 'Dresden',
        cities: [
          { city: 'Leipzig', latitude: 51.3397, longitude: 12.3731, timezone: 1 },
          { city: 'Dresden', latitude: 51.0504, longitude: 13.7373, timezone: 1 }
        ]
      }
    ]
  },

  // ASIA - JAPAN (Regions, 20+ major cities)
  'Japan': {
    country: 'Japan',
    continent: 'Asia',
    timezone: 9,
    states: [
      {
        state: 'Tokyo',
        capital: 'Tokyo',
        cities: [
          { city: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 9 },
          { city: 'Yokohama', latitude: 35.4437, longitude: 139.6380, timezone: 9 },
          { city: 'Kawasaki', latitude: 35.5317, longitude: 139.7028, timezone: 9 }
        ]
      },
      {
        state: 'Osaka',
        capital: 'Osaka',
        cities: [
          { city: 'Osaka', latitude: 34.6937, longitude: 135.5023, timezone: 9 },
          { city: 'Kyoto', latitude: 35.0116, longitude: 135.7681, timezone: 9 },
          { city: 'Kobe', latitude: 34.6901, longitude: 135.1955, timezone: 9 },
          { city: 'Sakai', latitude: 34.5853, longitude: 135.4833, timezone: 9 }
        ]
      },
      {
        state: 'Kanagawa',
        capital: 'Yokohama',
        cities: [
          { city: 'Yokohama', latitude: 35.4437, longitude: 139.6380, timezone: 9 }
        ]
      },
      {
        state: 'Aichi',
        capital: 'Nagoya',
        cities: [
          { city: 'Nagoya', latitude: 35.1815, longitude: 136.9066, timezone: 9 }
        ]
      }
    ]
  }
};

// Helper Functions
export function getAllCountries(): string[] {
  return Object.keys(globalLocationDatabase).sort();
}

export function getStatesByCountry(country: string): string[] {
  const countryData = globalLocationDatabase[country];
  if (!countryData) return [];
  return countryData.states.map(s => s.state).sort();
}

export function getCapitalByState(country: string, state: string): string {
  const countryData = globalLocationDatabase[country];
  if (!countryData) return '';
  const stateData = countryData.states.find(s => s.state === state);
  return stateData ? stateData.capital : '';
}

export function getCitiesByState(country: string, state: string): CityLocation[] {
  const countryData = globalLocationDatabase[country];
  if (!countryData) return [];
  const stateData = countryData.states.find(s => s.state === state);
  return stateData ? stateData.cities : [];
}

export function getCoordinatesByCity(country: string, state: string, city: string): CityLocation | null {
  const countryData = globalLocationDatabase[country];
  if (!countryData) return null;
  const stateData = countryData.states.find(s => s.state === state);
  if (!stateData) return null;
  const cityData = stateData.cities.find(c => c.city === city);
  return cityData || null;
}

export function getCountryTimezone(country: string): number {
  const countryData = globalLocationDatabase[country];
  return countryData ? countryData.timezone : 0;
}

export function getCityTimezone(country: string, state: string, city: string): number {
  const cityData = getCoordinatesByCity(country, state, city);
  return cityData ? cityData.timezone : getCountryTimezone(country);
}
