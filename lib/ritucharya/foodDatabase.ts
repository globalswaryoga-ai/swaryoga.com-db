export interface Food {
  nameEn: string;
  nameHi: string;
  primaryRasa: 'Sweet' | 'Sour' | 'Salty' | 'Pungent' | 'Bitter' | 'Astringent';
  primaryRasaHi: string;
  doshaImpact: {
    vata: 'increase' | 'decrease' | 'balance';
    pitta: 'increase' | 'decrease' | 'balance';
    kapha: 'increase' | 'decrease' | 'balance';
  };
  category: 'drink' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'herbal';
  benefits: string[];
  quantity?: string;
}

export const foodDatabase: Food[] = [
  // Gond Pani (Calcium Drink)
  {
    nameEn: 'Gond Pani',
    nameHi: 'गोंद पानी',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'drink',
    benefits: ['Calcium rich', 'Cooling', 'Nourishing']
  },

  // Herbal Drinks
  {
    nameEn: 'Tulsi Tea',
    nameHi: 'तुलसी चाय',
    primaryRasa: 'Bitter',
    primaryRasaHi: 'कड़वा',
    doshaImpact: { vata: 'increase', pitta: 'decrease', kapha: 'decrease' },
    category: 'herbal',
    benefits: ['Immunity', 'Digestion', 'Detox']
  },
  {
    nameEn: 'Ginger Honey Water',
    nameHi: 'अदरक शहद पानी',
    primaryRasa: 'Pungent',
    primaryRasaHi: 'तीव्र',
    doshaImpact: { vata: 'balance', pitta: 'increase', kapha: 'decrease' },
    category: 'herbal',
    benefits: ['Digestion', 'Warming', 'Anti-inflammatory']
  },
  {
    nameEn: 'Lemon Water',
    nameHi: 'नींबू पानी',
    primaryRasa: 'Sour',
    primaryRasaHi: 'खट्टा',
    doshaImpact: { vata: 'increase', pitta: 'increase', kapha: 'decrease' },
    category: 'herbal',
    benefits: ['Vitamin C', 'Digestive', 'Energizing']
  },
  {
    nameEn: 'Neem Water',
    nameHi: 'नीम पानी',
    primaryRasa: 'Bitter',
    primaryRasaHi: 'कड़वा',
    doshaImpact: { vata: 'increase', pitta: 'decrease', kapha: 'decrease' },
    category: 'herbal',
    benefits: ['Detox', 'Blood Purification', 'Immunity']
  },
  {
    nameEn: 'Warm Milk',
    nameHi: 'गर्म दूध',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'drink',
    benefits: ['Nourishing', 'Sleep', 'Calcium']
  },
  {
    nameEn: 'Sesame Water',
    nameHi: 'तिल का पानी',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'herbal',
    benefits: ['Warming', 'Strengthening', 'Calcium']
  },

  // Breakfast Foods
  {
    nameEn: 'Khichdi',
    nameHi: 'खिचड़ी',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'balance' },
    category: 'breakfast',
    benefits: ['Easy to digest', 'Nourishing', 'Balancing']
  },
  {
    nameEn: 'Oatmeal with Ghee',
    nameHi: 'दलिया घी के साथ',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'breakfast',
    benefits: ['Warming', 'Nourishing', 'Fiber']
  },
  {
    nameEn: 'Rice Porridge',
    nameHi: 'चावल का दलिया',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'balance' },
    category: 'breakfast',
    benefits: ['Digestible', 'Gentle', 'Nourishing']
  },
  {
    nameEn: 'Fruit Salad',
    nameHi: 'फल सलाद',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'balance', pitta: 'balance', kapha: 'increase' },
    category: 'breakfast',
    benefits: ['Vitamins', 'Fresh', 'Light']
  },
  {
    nameEn: 'Toast with Ghee',
    nameHi: 'टोस्ट घी के साथ',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'breakfast',
    benefits: ['Warming', 'Simple', 'Nourishing']
  },
  {
    nameEn: 'Moong Dal Porridge',
    nameHi: 'मूंग दाल का दलिया',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'decrease', kapha: 'balance' },
    category: 'breakfast',
    benefits: ['Protein', 'Easy digest', 'Cooling']
  },

  // Lunch Items
  {
    nameEn: 'Moong Dal Rice',
    nameHi: 'मूंग दाल चावल',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'decrease', kapha: 'balance' },
    category: 'lunch',
    benefits: ['Balanced', 'Nutritious', 'Easy to digest']
  },
  {
    nameEn: 'Vegetable Curry',
    nameHi: 'सब्जी करी',
    primaryRasa: 'Pungent',
    primaryRasaHi: 'तीव्र',
    doshaImpact: { vata: 'increase', pitta: 'increase', kapha: 'decrease' },
    category: 'lunch',
    benefits: ['Warming', 'Stimulating', 'Detoxifying']
  },
  {
    nameEn: 'Bitter Melon Curry',
    nameHi: 'करेला की सब्जी',
    primaryRasa: 'Bitter',
    primaryRasaHi: 'कड़वा',
    doshaImpact: { vata: 'increase', pitta: 'decrease', kapha: 'decrease' },
    category: 'lunch',
    benefits: ['Detox', 'Blood cleansing', 'Digestive']
  },
  {
    nameEn: 'Leafy Greens',
    nameHi: 'पत्ता गोभी',
    primaryRasa: 'Bitter',
    primaryRasaHi: 'कड़वा',
    doshaImpact: { vata: 'increase', pitta: 'decrease', kapha: 'decrease' },
    category: 'lunch',
    benefits: ['Vitamins', 'Minerals', 'Cleansing']
  },
  {
    nameEn: 'Lentil Soup',
    nameHi: 'दाल का सूप',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'decrease', kapha: 'balance' },
    category: 'lunch',
    benefits: ['Protein', 'Warming', 'Nourishing']
  },
  {
    nameEn: 'Ghee Rice',
    nameHi: 'घी चावल',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'lunch',
    benefits: ['Nourishing', 'Warming', 'Rich']
  },
  {
    nameEn: 'Steamed Vegetables',
    nameHi: 'उबली हुई सब्जियां',
    primaryRasa: 'Astringent',
    primaryRasaHi: 'कसैला',
    doshaImpact: { vata: 'increase', pitta: 'decrease', kapha: 'decrease' },
    category: 'lunch',
    benefits: ['Light', 'Digestible', 'Cleansing']
  },

  // Dinner Items
  {
    nameEn: 'Light Soup',
    nameHi: 'हल्का सूप',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'balance' },
    category: 'dinner',
    benefits: ['Light', 'Warming', 'Easy to digest']
  },
  {
    nameEn: 'Vegetable Khichdi',
    nameHi: 'सब्जी खिचड़ी',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'balance' },
    category: 'dinner',
    benefits: ['Light', 'Digestible', 'Sleep friendly']
  },
  {
    nameEn: 'Rice with Ghee',
    nameHi: 'घी चावल',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'increase' },
    category: 'dinner',
    benefits: ['Nourishing', 'Sleep', 'Warming']
  },
  {
    nameEn: 'Dal with Rice',
    nameHi: 'दाल चावल',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'decrease', kapha: 'balance' },
    category: 'dinner',
    benefits: ['Balanced', 'Protein', 'Easy digest']
  },
  {
    nameEn: 'Steamed Rice',
    nameHi: 'उबले चावल',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    doshaImpact: { vata: 'decrease', pitta: 'balance', kapha: 'balance' },
    category: 'dinner',
    benefits: ['Light', 'Simple', 'Sleep friendly']
  },
  {
    nameEn: 'Herbal Soup',
    nameHi: 'हर्बल सूप',
    primaryRasa: 'Bitter',
    primaryRasaHi: 'कड़वा',
    doshaImpact: { vata: 'increase', pitta: 'decrease', kapha: 'decrease' },
    category: 'dinner',
    benefits: ['Detox', 'Cleansing', 'Light']
  }
];

// Rasa types in Hindi and English
export const RASAS = {
  sweet: { en: 'Sweet', hi: 'मीठा' },
  sour: { en: 'Sour', hi: 'खट्टा' },
  salty: { en: 'Salty', hi: 'लवण' },
  pungent: { en: 'Pungent', hi: 'तीव्र' },
  bitter: { en: 'Bitter', hi: 'कड़वा' },
  astringent: { en: 'Astringent', hi: 'कसैला' }
};

export function searchFood(query: string): Food[] {
  const lowerQuery = query.toLowerCase();
  return foodDatabase.filter(
    food =>
      food.nameEn.toLowerCase().includes(lowerQuery) ||
      food.nameHi.includes(query)
  );
}

export function getFoodByName(name: string): Food | undefined {
  return foodDatabase.find(
    food =>
      food.nameEn.toLowerCase() === name.toLowerCase() ||
      food.nameHi === name
  );
}
