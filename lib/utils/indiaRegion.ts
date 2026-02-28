/**
 * India Region Classification Utility
 * Splits India into North India and South India based on state.
 * Also provides state detection from phone area codes.
 */

// South Indian states and union territories
const SOUTH_INDIA_STATES = new Set([
  'Karnataka',
  'Kerala',
  'Tamil Nadu',
  'Telangana',
  'Andhra Pradesh',
  'Puducherry',
  'Lakshadweep',
  'Andaman and Nicobar Islands',
]);

// All Indian states for reference
const NORTH_INDIA_STATES = new Set([
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Rajasthan',
  'Bihar',
  'Gujarat',
  'Maharashtra',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Ladakh',
  'Delhi',
  'Odisha',
  'Assam',
  'Goa',
  'Tripura',
  'Meghalaya',
  'Manipur',
  'Nagaland',
  'Mizoram',
  'Arunachal Pradesh',
  'Sikkim',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
]);

/**
 * Determine region from state name
 */
export function getRegionFromState(state: string): 'South India' | 'North India' | '' {
  if (!state) return '';
  const trimmed = state.trim();
  // Case-insensitive match
  for (const s of SOUTH_INDIA_STATES) {
    if (s.toLowerCase() === trimmed.toLowerCase()) return 'South India';
  }
  for (const s of NORTH_INDIA_STATES) {
    if (s.toLowerCase() === trimmed.toLowerCase()) return 'North India';
  }
  return '';
}

/**
 * Guess state from Indian mobile number prefix (first 4 digits after 91)
 * This is approximate — mobile number portability means it's not 100% accurate.
 * Based on common telecom circle allocations.
 */
const PHONE_PREFIX_TO_STATE: Record<string, string> = {
  // Karnataka
  '9448': 'Karnataka', '9449': 'Karnataka', '9900': 'Karnataka', '9901': 'Karnataka',
  '9902': 'Karnataka', '9880': 'Karnataka', '9886': 'Karnataka', '9845': 'Karnataka',
  '9844': 'Karnataka', '9591': 'Karnataka', '8050': 'Karnataka', '8088': 'Karnataka',
  '8147': 'Karnataka', '8277': 'Karnataka', '8296': 'Karnataka', '8310': 'Karnataka',
  '7760': 'Karnataka', '7795': 'Karnataka', '7411': 'Karnataka', '7259': 'Karnataka',
  '6360': 'Karnataka', '6362': 'Karnataka', '6364': 'Karnataka',

  // Kerala
  '9446': 'Kerala', '9447': 'Kerala', '9495': 'Kerala', '9496': 'Kerala',
  '9497': 'Kerala', '9846': 'Kerala', '9847': 'Kerala', '9048': 'Kerala',
  '8086': 'Kerala', '8089': 'Kerala', '8113': 'Kerala', '8129': 'Kerala',
  '8138': 'Kerala', '8157': 'Kerala', '7510': 'Kerala', '7558': 'Kerala',
  '7593': 'Kerala', '7736': 'Kerala',

  // Tamil Nadu
  '9442': 'Tamil Nadu', '9443': 'Tamil Nadu', '9444': 'Tamil Nadu', '9445': 'Tamil Nadu',
  '9840': 'Tamil Nadu', '9841': 'Tamil Nadu', '9842': 'Tamil Nadu', '9843': 'Tamil Nadu',
  '9791': 'Tamil Nadu', '9790': 'Tamil Nadu', '8015': 'Tamil Nadu', '8056': 'Tamil Nadu',
  '8072': 'Tamil Nadu', '8148': 'Tamil Nadu', '8220': 'Tamil Nadu', '7373': 'Tamil Nadu',
  '7395': 'Tamil Nadu', '7397': 'Tamil Nadu', '7418': 'Tamil Nadu', '7448': 'Tamil Nadu',

  // Telangana + Andhra Pradesh
  '9440': 'Telangana', '9441': 'Telangana', '9848': 'Telangana', '9849': 'Telangana',
  '9866': 'Telangana', '9885': 'Telangana', '9908': 'Telangana', '9550': 'Andhra Pradesh',
  '9553': 'Andhra Pradesh', '8008': 'Telangana', '8019': 'Telangana',
  '7013': 'Telangana', '7075': 'Telangana', '7093': 'Telangana',

  // Maharashtra
  '9890': 'Maharashtra', '9823': 'Maharashtra', '9822': 'Maharashtra', '9821': 'Maharashtra',
  '9820': 'Maharashtra', '9819': 'Maharashtra', '9833': 'Maharashtra', '9869': 'Maharashtra',
  '9920': 'Maharashtra', '9930': 'Maharashtra', '8080': 'Maharashtra', '8082': 'Maharashtra',
  '7219': 'Maharashtra', '7276': 'Maharashtra', '7350': 'Maharashtra', '7387': 'Maharashtra',
  '7588': 'Maharashtra', '7620': 'Maharashtra',

  // Delhi
  '9810': 'Delhi', '9811': 'Delhi', '9818': 'Delhi', '9868': 'Delhi',
  '9871': 'Delhi', '9873': 'Delhi', '9891': 'Delhi', '9899': 'Delhi',
  '9953': 'Delhi', '9958': 'Delhi', '8010': 'Delhi', '8130': 'Delhi',
  '7042': 'Delhi', '7065': 'Delhi', '7210': 'Delhi', '7290': 'Delhi',

  // Uttar Pradesh
  '9415': 'Uttar Pradesh', '9450': 'Uttar Pradesh', '9451': 'Uttar Pradesh',
  '9452': 'Uttar Pradesh', '9453': 'Uttar Pradesh', '9454': 'Uttar Pradesh',
  '9455': 'Uttar Pradesh', '9456': 'Uttar Pradesh', '9838': 'Uttar Pradesh',
  '9839': 'Uttar Pradesh', '9935': 'Uttar Pradesh', '9936': 'Uttar Pradesh',
  '8004': 'Uttar Pradesh', '7275': 'Uttar Pradesh', '7376': 'Uttar Pradesh',
  '7388': 'Uttar Pradesh', '7607': 'Uttar Pradesh', '6307': 'Uttar Pradesh',

  // Gujarat
  '9825': 'Gujarat', '9824': 'Gujarat', '9879': 'Gujarat', '9898': 'Gujarat',
  '9427': 'Gujarat', '9428': 'Gujarat', '9429': 'Gujarat', '8140': 'Gujarat',
  '8141': 'Gujarat', '7043': 'Gujarat', '7383': 'Gujarat', '7573': 'Gujarat',

  // Rajasthan
  '9413': 'Rajasthan', '9414': 'Rajasthan', '9460': 'Rajasthan', '9461': 'Rajasthan',
  '9828': 'Rajasthan', '9829': 'Rajasthan', '9950': 'Rajasthan', '9951': 'Rajasthan',
  '8003': 'Rajasthan', '8005': 'Rajasthan', '8058': 'Rajasthan', '7014': 'Rajasthan',
  '7023': 'Rajasthan', '7073': 'Rajasthan', '7300': 'Rajasthan', '7340': 'Rajasthan',

  // Punjab
  '9814': 'Punjab', '9815': 'Punjab', '9463': 'Punjab', '9464': 'Punjab',
  '9465': 'Punjab', '9872': 'Punjab', '9876': 'Punjab', '9877': 'Punjab',
  '8054': 'Punjab', '8146': 'Punjab', '7087': 'Punjab', '7355': 'Punjab',
  '7508': 'Punjab', '7529': 'Punjab',

  // Haryana
  '9416': 'Haryana', '9466': 'Haryana', '9467': 'Haryana', '9812': 'Haryana',
  '9813': 'Haryana', '9896': 'Haryana', '9996': 'Haryana', '8053': 'Haryana',
  '8059': 'Haryana', '7015': 'Haryana', '7027': 'Haryana', '7056': 'Haryana',

  // Bihar
  '9430': 'Bihar', '9431': 'Bihar', '9470': 'Bihar', '9471': 'Bihar',
  '9472': 'Bihar', '9473': 'Bihar', '9835': 'Bihar', '9834': 'Bihar',
  '8051': 'Bihar', '8083': 'Bihar', '8084': 'Bihar', '7061': 'Bihar',
  '7250': 'Bihar', '7254': 'Bihar', '7488': 'Bihar', '7544': 'Bihar',

  // West Bengal
  '9830': 'West Bengal', '9831': 'West Bengal', '9832': 'West Bengal',
  '9836': 'West Bengal', '9874': 'West Bengal', '9875': 'West Bengal',
  '9433': 'West Bengal', '9434': 'West Bengal', '8013': 'West Bengal',
  '8017': 'West Bengal', '7044': 'West Bengal', '7076': 'West Bengal',
  '7278': 'West Bengal', '7439': 'West Bengal', '7501': 'West Bengal',

  // Madhya Pradesh
  '9425': 'Madhya Pradesh', '9424': 'Madhya Pradesh', '9826': 'Madhya Pradesh',
  '9827': 'Madhya Pradesh', '9893': 'Madhya Pradesh', '9907': 'Madhya Pradesh',
  '8085': 'Madhya Pradesh', '8103': 'Madhya Pradesh', '7049': 'Madhya Pradesh',
  '7089': 'Madhya Pradesh', '7354': 'Madhya Pradesh', '7415': 'Madhya Pradesh',

  // Odisha
  '9437': 'Odisha', '9438': 'Odisha', '9439': 'Odisha', '9853': 'Odisha',
  '9937': 'Odisha', '9938': 'Odisha', '8018': 'Odisha', '8093': 'Odisha',
  '7064': 'Odisha', '7077': 'Odisha', '7381': 'Odisha', '7504': 'Odisha',

  // Assam
  '9435': 'Assam', '9954': 'Assam', '9957': 'Assam', '9859': 'Assam',
  '9864': 'Assam', '8011': 'Assam', '8134': 'Assam', '7002': 'Assam',
  '7086': 'Assam', '7399': 'Assam', '7577': 'Assam', '6000': 'Assam',

  // Jharkhand
  '9431': 'Jharkhand', '9470': 'Jharkhand', '9835': 'Jharkhand',
  '7209': 'Jharkhand', '7488': 'Jharkhand', '7631': 'Jharkhand',

  // Goa
  '9422': 'Goa', '9823': 'Goa', '8380': 'Goa', '7083': 'Goa',

  // Uttarakhand
  '9410': 'Uttarakhand', '9411': 'Uttarakhand', '9412': 'Uttarakhand',
  '9897': 'Uttarakhand', '7017': 'Uttarakhand', '7055': 'Uttarakhand',
  '7088': 'Uttarakhand', '7302': 'Uttarakhand', '8006': 'Uttarakhand',

  // Himachal Pradesh
  '9418': 'Himachal Pradesh', '9459': 'Himachal Pradesh', '9816': 'Himachal Pradesh',
  '9817': 'Himachal Pradesh', '8091': 'Himachal Pradesh', '7018': 'Himachal Pradesh',
  '7307': 'Himachal Pradesh', '7590': 'Himachal Pradesh',

  // Chhattisgarh
  '9424': 'Chhattisgarh', '9425': 'Chhattisgarh', '9826': 'Chhattisgarh',
  '9827': 'Chhattisgarh', '7049': 'Chhattisgarh', '7587': 'Chhattisgarh',

  // J&K
  '9419': 'Jammu and Kashmir', '9469': 'Jammu and Kashmir', '9858': 'Jammu and Kashmir',
  '9906': 'Jammu and Kashmir', '7006': 'Jammu and Kashmir', '7298': 'Jammu and Kashmir',
};

/**
 * Attempt to guess state from Indian phone number.
 * Returns state name or empty string if unknown.
 */
export function guessStateFromPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  // Normalize to 91XXXXXXXXXX format
  let normalized = digits;
  if (digits.length === 10) normalized = '91' + digits;
  if (normalized.length < 12 || !normalized.startsWith('91')) return '';

  // Try 4-digit prefix after country code
  const prefix4 = normalized.substring(2, 6);
  if (PHONE_PREFIX_TO_STATE[prefix4]) return PHONE_PREFIX_TO_STATE[prefix4];

  return '';
}

/**
 * Auto-detect country from phone number prefix
 */
export function guessCountryFromPhone(phone: string): { country: string; countryCode: string } {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('91') || digits.length === 10) return { country: 'India', countryCode: 'IN' };
  if (digits.startsWith('1')) return { country: 'USA / Canada', countryCode: 'US' };
  if (digits.startsWith('44')) return { country: 'United Kingdom', countryCode: 'GB' };
  if (digits.startsWith('971')) return { country: 'UAE', countryCode: 'AE' };
  if (digits.startsWith('966')) return { country: 'Saudi Arabia', countryCode: 'SA' };
  if (digits.startsWith('65')) return { country: 'Singapore', countryCode: 'SG' };
  if (digits.startsWith('61')) return { country: 'Australia', countryCode: 'AU' };
  if (digits.startsWith('49')) return { country: 'Germany', countryCode: 'DE' };
  if (digits.startsWith('33')) return { country: 'France', countryCode: 'FR' };
  if (digits.startsWith('81')) return { country: 'Japan', countryCode: 'JP' };
  if (digits.startsWith('86')) return { country: 'China', countryCode: 'CN' };
  if (digits.startsWith('92')) return { country: 'Pakistan', countryCode: 'PK' };
  if (digits.startsWith('880')) return { country: 'Bangladesh', countryCode: 'BD' };
  if (digits.startsWith('977')) return { country: 'Nepal', countryCode: 'NP' };
  if (digits.startsWith('94')) return { country: 'Sri Lanka', countryCode: 'LK' };
  if (digits.startsWith('60')) return { country: 'Malaysia', countryCode: 'MY' };
  if (digits.startsWith('82')) return { country: 'South Korea', countryCode: 'KR' };
  if (digits.startsWith('39')) return { country: 'Italy', countryCode: 'IT' };
  if (digits.startsWith('34')) return { country: 'Spain', countryCode: 'ES' };
  if (digits.startsWith('7')) return { country: 'Russia', countryCode: 'RU' };
  if (digits.startsWith('55')) return { country: 'Brazil', countryCode: 'BR' };
  if (digits.startsWith('27')) return { country: 'South Africa', countryCode: 'ZA' };
  if (digits.startsWith('234')) return { country: 'Nigeria', countryCode: 'NG' };
  if (digits.startsWith('254')) return { country: 'Kenya', countryCode: 'KE' };
  if (digits.startsWith('968')) return { country: 'Oman', countryCode: 'OM' };
  if (digits.startsWith('974')) return { country: 'Qatar', countryCode: 'QA' };
  if (digits.startsWith('973')) return { country: 'Bahrain', countryCode: 'BH' };
  if (digits.startsWith('965')) return { country: 'Kuwait', countryCode: 'KW' };
  return { country: 'Other', countryCode: '' };
}

/**
 * Get all info for a lead from phone number (country, region, state)
 */
export function getGeoFromPhone(phone: string) {
  const { country, countryCode } = guessCountryFromPhone(phone);
  let state = '';
  let region = '';

  if (countryCode === 'IN') {
    state = guessStateFromPhone(phone);
    region = getRegionFromState(state);
  }

  return { country, countryCode, state, region };
}

// Language detection helper based on state
const STATE_TO_LANGUAGE: Record<string, { language: string; code: string }> = {
  'Karnataka': { language: 'Kannada', code: 'kn' },
  'Kerala': { language: 'Malayalam', code: 'ml' },
  'Tamil Nadu': { language: 'Tamil', code: 'ta' },
  'Telangana': { language: 'Telugu', code: 'te' },
  'Andhra Pradesh': { language: 'Telugu', code: 'te' },
  'Maharashtra': { language: 'Marathi', code: 'mr' },
  'Goa': { language: 'Konkani', code: 'kok' },
  'Gujarat': { language: 'Gujarati', code: 'gu' },
  'Rajasthan': { language: 'Hindi', code: 'hi' },
  'Uttar Pradesh': { language: 'Hindi', code: 'hi' },
  'Madhya Pradesh': { language: 'Hindi', code: 'hi' },
  'Bihar': { language: 'Hindi', code: 'hi' },
  'Jharkhand': { language: 'Hindi', code: 'hi' },
  'Chhattisgarh': { language: 'Hindi', code: 'hi' },
  'Uttarakhand': { language: 'Hindi', code: 'hi' },
  'Himachal Pradesh': { language: 'Hindi', code: 'hi' },
  'Haryana': { language: 'Hindi', code: 'hi' },
  'Delhi': { language: 'Hindi', code: 'hi' },
  'Punjab': { language: 'Punjabi', code: 'pa' },
  'West Bengal': { language: 'Bengali', code: 'bn' },
  'Odisha': { language: 'Odia', code: 'or' },
  'Assam': { language: 'Assamese', code: 'as' },
  'Jammu and Kashmir': { language: 'Urdu', code: 'ur' },
};

export function guessLanguageFromState(state: string): { language: string; languageCode: string } {
  if (!state) return { language: 'Hindi', languageCode: 'hi' };
  const entry = STATE_TO_LANGUAGE[state];
  return entry
    ? { language: entry.language, languageCode: entry.code }
    : { language: 'Hindi', languageCode: 'hi' };
}
