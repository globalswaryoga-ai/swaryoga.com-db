export interface MealSlot {
  time: string;
  timeHi: string;
  foodItems: {
    name: string;
    rasa: string;
    rasaHi: string;
  }[];
  notes?: string;
}

export interface DailyMealPlan {
  _id?: string;
  date: string; // YYYY-MM-DD
  location: {
    country: string;
    state: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  weather: {
    temp: number;
    tempMin: number;
    tempMax: number;
    humidity: number;
    climate: string;
    ritu: string;
    rituId: string;
  };
  dosha: {
    vata: number;
    pitta: number;
    kapha: number;
    primary: string;
  };
  meals: {
    gond_pani_4am?: MealSlot;
    herbal_drink_6am?: MealSlot;
    breakfast_830_930?: MealSlot;
    lunch_1130?: MealSlot;
    dinner_7pm?: MealSlot;
    before_sleep?: MealSlot;
  };
  rasaBreakdown: {
    sweet: number; // percentage
    sour: number;
    salty: number;
    pungent: number;
    bitter: number;
    astringent: number;
  };
  totalItems: number;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface DailyMealPlanInput {
  date: string;
  location: {
    country: string;
    state: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  weather: {
    temp: number;
    tempMin: number;
    tempMax: number;
    humidity: number;
    climate: string;
    ritu: string;
    rituId: string;
  };
  dosha: {
    vata: number;
    pitta: number;
    kapha: number;
    primary: string;
  };
  meals: {
    gond_pani_4am?: {
      foodNames: string[];
      notes?: string;
    };
    herbal_drink_6am?: {
      foodNames: string[];
      notes?: string;
    };
    breakfast_830_930?: {
      foodNames: string[];
      notes?: string;
    };
    lunch_1130?: {
      foodNames: string[];
      notes?: string;
    };
    dinner_7pm?: {
      foodNames: string[];
      notes?: string;
    };
    before_sleep?: {
      foodNames: string[];
      notes?: string;
    };
  };
}
