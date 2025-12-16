// Workshop data management

export interface Workshop {
  id: number;
  title: string;
  instructor: string;
  startDate: string;
  endDate: string;
  duration: string;
  startTime: string;
  endTime: string;
  priceINR: number;
  priceNPR: number;
  priceUSD: number;
  maxParticipants: number;
  enrolledCount: number;
  category: string;
  mode: string;
  language: string;
  level: string;
  location: string;
  image: string;
  youtubeId?: string;
  paymentLinkINR: string;
  paymentLinkNPR: string;
  paymentLinkUSD: string;
  prerequisites: string;
  learningOutcomes: string;
  includedItems: string;
  remarks?: string;
  isPublic: boolean;
  rating: number;
}

// API key for SwarAPI
const API_KEY = 'hRY7KgTKXTSqjNZMJjslP5A0a3ZwJTVJ4IrY2GFJ16ec2e21';

// Get workshops from localStorage or initialize
const getWorkshops = (): Workshop[] => {
  try {
    const workshops = localStorage.getItem('swaryoga_workshops');
    return workshops ? JSON.parse(workshops) : [];
  } catch (error) {
    console.error('Error getting workshops:', error);
    return [];
  }
};

// Save workshops to localStorage
const saveWorkshops = (workshops: Workshop[]) => {
  localStorage.setItem('swaryoga_workshops', JSON.stringify(workshops));
  
  // Trigger storage event for cross-tab sync
  localStorage.setItem('workshop_sync_trigger', Date.now().toString());
  
  // Broadcast to other tabs using BroadcastChannel if available
  try {
    const bc = new BroadcastChannel('workshop_updates');
    bc.postMessage({ type: 'WORKSHOP_UPDATE', timestamp: Date.now() });
    bc.close();
  } catch (error) {
    console.log('BroadcastChannel not supported, falling back to localStorage');
  }
};

// Generate sample workshops for demo
const generateSampleWorkshops = (): Workshop[] => {
  return [
    {
      id: 1,
      title: 'Basic Swar Yoga Master Class',
      instructor: 'Mohan Kalburgi',
      startDate: '2025-05-15',
      endDate: '2025-05-17',
      duration: '3 Days',
      startTime: '09:00',
      endTime: '17:00',
      priceINR: 5000,
      priceNPR: 8000,
      priceUSD: 60,
      maxParticipants: 50,
      enrolledCount: 12,
      category: 'Basic Swar Yoga Master Class',
      mode: 'Online',
      language: 'Hindi',
      level: 'Beginner',
      location: 'Zoom',
      image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=400',
      youtubeId: 'dQw4w9WgXcQ',
      paymentLinkINR: 'https://example.com/pay/inr',
      paymentLinkNPR: 'https://example.com/pay/npr',
      paymentLinkUSD: 'https://example.com/pay/usd',
      prerequisites: 'No prior experience required. Open to all levels.',
      learningOutcomes: 'Understand the basics of Swar Yoga, Learn proper breathing techniques, Develop a daily practice routine',
      includedItems: 'Course materials, Certificate of completion, 30-day access to recorded sessions',
      isPublic: true,
      rating: 4.8
    },
    {
      id: 2,
      title: '90 Days Weight Loss Program',
      instructor: 'Mohan Kalburgi',
      startDate: '2025-06-01',
      endDate: '2025-08-30',
      duration: '90 Days',
      startTime: '07:00',
      endTime: '08:00',
      priceINR: 15000,
      priceNPR: 24000,
      priceUSD: 180,
      maxParticipants: 30,
      enrolledCount: 8,
      category: '90 Days Weight Loss',
      mode: 'Hybrid',
      language: 'Hindi',
      level: 'All Levels',
      location: 'Delhi',
      image: 'https://images.pexels.com/photos/4056535/pexels-photo-4056535.jpeg?auto=compress&cs=tinysrgb&w=400',
      paymentLinkINR: 'https://example.com/pay/inr',
      paymentLinkNPR: 'https://example.com/pay/npr',
      paymentLinkUSD: 'https://example.com/pay/usd',
      prerequisites: 'Basic fitness level, No serious health conditions',
      learningOutcomes: 'Sustainable weight loss, Improved eating habits, Increased energy levels, Better understanding of nutrition',
      includedItems: 'Personalized diet plan, Weekly check-ins, Access to private support group, Recipe book',
      isPublic: true,
      rating: 4.9
    },
    {
      id: 3,
      title: 'Swar Yoga Teachers Training',
      instructor: 'Mohan Kalburgi',
      startDate: '2025-07-10',
      endDate: '2025-07-30',
      duration: '21 Days',
      startTime: '06:00',
      endTime: '18:00',
      priceINR: 50000,
      priceNPR: 80000,
      priceUSD: 600,
      maxParticipants: 20,
      enrolledCount: 5,
      category: 'Swar Yoga Teachers Training(Residential)',
      mode: 'Offline',
      language: 'English',
      level: 'Intermediate',
      location: 'Rishikesh',
      image: 'https://images.pexels.com/photos/8436589/pexels-photo-8436589.jpeg?auto=compress&cs=tinysrgb&w=400',
      youtubeId: 'dQw4w9WgXcQ',
      paymentLinkINR: 'https://example.com/pay/inr',
      paymentLinkNPR: 'https://example.com/pay/npr',
      paymentLinkUSD: 'https://example.com/pay/usd',
      prerequisites: 'Minimum 1 year of regular yoga practice, Basic understanding of yoga philosophy',
      learningOutcomes: 'Ability to teach Swar Yoga classes, Deep understanding of yogic breathing techniques, Knowledge of yoga philosophy and history',
      includedItems: 'Accommodation, Meals, Course materials, Certification, Post-training support',
      isPublic: true,
      rating: 4.7
    }
  ];
};

// Initialize workshop data if empty
const initializeWorkshopData = () => {
  const workshops = getWorkshops();
  if (workshops.length === 0) {
    const sampleWorkshops = generateSampleWorkshops();
    saveWorkshops(sampleWorkshops);
    return sampleWorkshops;
  }
  return workshops;
};

// Debug function to check workshop database state
export const debugWorkshopDatabase = () => {
  console.log('🔍 === WORKSHOP DATABASE DEBUG ===');
  console.log('📊 Current localStorage state:', localStorage.getItem('swaryoga_workshops'));
  
  const workshops = getWorkshops();
  console.log(`📋 Found ${workshops.length} workshops in database`);
  
  if (workshops.length === 0) {
    console.log('⚠️ No workshops found, will initialize with sample data');
  } else {
    console.log('✅ Workshop data exists');
  }
  
  console.log('🔍 === END DEBUG ===');
};

// Force refresh workshops from localStorage
export const forceRefreshWorkshops = () => {
  console.log('🔄 Forcing refresh of workshop data from localStorage');
  return initializeWorkshopData();
};

// Sync workshops across tabs
export const syncWorkshopsAcrossTabs = async () => {
  console.log('🔄 Syncing workshops across tabs');
  localStorage.setItem('workshop_sync_trigger', Date.now().toString());
  
  // Use BroadcastChannel API if available
  try {
    const bc = new BroadcastChannel('workshop_updates');
    bc.postMessage({ type: 'WORKSHOP_UPDATE', timestamp: Date.now() });
    bc.close();
  } catch (error) {
    console.log('BroadcastChannel not supported, falling back to localStorage');
  }
  
  return true;
};

// Setup BroadcastChannel listener
try {
  const bc = new BroadcastChannel('workshop_updates');
  bc.onmessage = (event) => {
    if (event.data.type === 'WORKSHOP_UPDATE') {
      console.log('Received workshop update from another tab:', event.data.timestamp);
      // Force refresh from localStorage
      forceRefreshWorkshops();
    }
  };
} catch (error) {
  console.log('BroadcastChannel not supported, using localStorage events only');
}

// Get API URL
const getAPIUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDev) {
    return 'http://localhost:4000/api';
  } else {
    return 'https://swar-yoga-latest-jma0xxixy-swar-yoga-projects.vercel.app/api';
  }
};

// Workshop API methods
export const workshopAPI = {
  // Get all workshops (for admin)
  getAllWorkshops: async (): Promise<Workshop[]> => {
    try {
      const response = await fetch(`${getAPIUrl()}/workshops`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.warn('API call failed, falling back to localStorage');
        const workshops = initializeWorkshopData();
        return workshops;
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.warn('Error fetching workshops from API:', error);
      return initializeWorkshopData();
    }
  },
  
  // Get public workshops (for public display)
  getPublicWorkshops: async (): Promise<Workshop[]> => {
    try {
      console.log('🔄 Fetching public workshops from API...');
      const response = await fetch(`${getAPIUrl()}/workshops?isPublic=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch public workshops, using fallback');
        const workshops = initializeWorkshopData();
        return workshops.filter(w => w.isPublic);
      }
      
      const data = await response.json();
      console.log('✅ Got public workshops:', data.data?.length);
      return data.data || [];
    } catch (error) {
      console.warn('Error fetching public workshops:', error);
      const workshops = initializeWorkshopData();
      return workshops.filter(w => w.isPublic);
    }
  },
  
  // Get workshop by ID
  getWorkshopById: async (id: number): Promise<Workshop | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const workshops = getWorkshops();
        const workshop = workshops.find(w => w.id === id) || null;
        resolve(workshop);
      }, 100);
    });
  },
  
  // Add a new workshop
  addWorkshop: async (workshopData: Omit<Workshop, 'id' | 'enrolledCount' | 'rating'>): Promise<Workshop> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const workshops = getWorkshops();
        
        const newWorkshop: Workshop = {
          ...workshopData,
          id: Date.now(),
          enrolledCount: 0,
          rating: 5.0
        };
        
        workshops.push(newWorkshop);
        saveWorkshops(workshops);
        
        // Immediately notify other tabs/windows
        syncWorkshopsAcrossTabs();
        
        resolve(newWorkshop);
      }, 100);
    });
  },
  
  // Update a workshop
  updateWorkshop: async (id: number, updates: Partial<Workshop>): Promise<Workshop> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const workshops = getWorkshops();
        const workshopIndex = workshops.findIndex(workshop => workshop.id === id);
        
        if (workshopIndex === -1) {
          reject(new Error('Workshop not found'));
          return;
        }
        
        workshops[workshopIndex] = { ...workshops[workshopIndex], ...updates };
        saveWorkshops(workshops);
        
        // Immediately notify other tabs/windows
        syncWorkshopsAcrossTabs();
        
        resolve(workshops[workshopIndex]);
      }, 100);
    });
  },
  
  // Delete a workshop
  deleteWorkshop: async (id: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const workshops = getWorkshops();
        const updatedWorkshops = workshops.filter(workshop => workshop.id !== id);
        saveWorkshops(updatedWorkshops);
        
        // Immediately notify other tabs/windows
        syncWorkshopsAcrossTabs();
        
        resolve();
      }, 100);
    });
  },
  
  // Toggle workshop visibility
  toggleWorkshopVisibility: async (id: number): Promise<Workshop> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const workshops = getWorkshops();
        const workshopIndex = workshops.findIndex(workshop => workshop.id === id);
        
        if (workshopIndex === -1) {
          reject(new Error('Workshop not found'));
          return;
        }
        
        workshops[workshopIndex].isPublic = !workshops[workshopIndex].isPublic;
        saveWorkshops(workshops);
        
        // Immediately notify other tabs/windows
        syncWorkshopsAcrossTabs();
        
        resolve(workshops[workshopIndex]);
      }, 100);
    });
  },
  
  // Get workshop stats
  getWorkshopStats: async (): Promise<{ totalWorkshops: number; publicWorkshops: number; totalEnrollments: number }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const workshops = getWorkshops();
        
        const stats = {
          totalWorkshops: workshops.length,
          publicWorkshops: workshops.filter(w => w.isPublic).length,
          totalEnrollments: workshops.reduce((sum, w) => sum + w.enrolledCount, 0)
        };
        
        resolve(stats);
      }, 100);
    });
  }
};