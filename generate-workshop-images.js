#!/usr/bin/env node

/**
 * WORKSHOP CARD IMAGE GENERATION GUIDE
 * 
 * This file contains instructions for generating beautiful workshop card images.
 * Since image generation requires external APIs, we'll use a combination of approaches:
 * 
 * OPTION 1: Use Unsplash API (FREE, No Auth Required)
 * OPTION 2: Use Placeholder Services (Quick but basic)
 * OPTION 3: Use Replicate/DALL-E API (Requires API Key)
 */

const workshopImageMappings = {
  'swar-yoga-basic': {
    name: 'Swar Yoga Basic',
    keywords: ['yoga', 'breathing', 'nasal', 'meditation', 'wellness'],
    description: 'Serene individual practicing nasal breathing with focused expression',
    unsplashQuery: 'yoga breathing meditation mindfulness',
    color: '#2d5016'
  },
  'yogasana-sadhana': {
    name: 'Yogasana & Sadhana',
    keywords: ['yoga', 'asana', 'poses', 'flexibility', 'practice'],
    description: 'Yogini in graceful asana pose with spiritual background',
    unsplashQuery: 'yoga poses flexibility practice',
    color: '#1e7b34'
  },
  'swar-yoga-level-1': {
    name: 'Swar Yoga Level-1',
    keywords: ['swar yoga', 'nasal breathing', 'pranayama', 'alternate nostril'],
    description: 'Person demonstrating nostril breathing technique in natural light',
    unsplashQuery: 'pranayama breathing technique energy',
    color: '#15803d'
  },
  'swar-yoga-level-3': {
    name: 'Swar Yoga Level-3',
    keywords: ['advanced', 'breathing', 'energy', 'meditation', 'transformation'],
    description: 'Advanced practitioner in meditation with cosmic/energy vibes',
    unsplashQuery: 'meditation advanced energy aura',
    color: '#0d3f1d'
  },
  'swar-yoga-level-4': {
    name: 'Swar Yoga Level-4',
    keywords: ['advanced', 'transformation', 'energy', 'spiritual', 'mastery'],
    description: 'Master yogi demonstrating ultimate balance and inner peace',
    unsplashQuery: 'meditation master spiritual awakening energy',
    color: '#052e16'
  },
  '96-days-weight-loss': {
    name: '96 Days Weight Loss Program',
    keywords: ['fitness', 'health', 'transformation', 'wellness', 'energy'],
    description: 'Active individual demonstrating health and vitality transformation',
    unsplashQuery: 'fitness weight loss health transformation energy',
    color: '#7c2d12'
  },
  '42-days-meditation': {
    name: '42 Days Meditation Program',
    keywords: ['meditation', 'peace', 'mindfulness', 'consciousness', 'calm'],
    description: 'Meditator in peaceful natural setting with serene expression',
    unsplashQuery: 'meditation nature peace mindfulness calm',
    color: '#1e3a8a'
  },
  'amrut-aahar': {
    name: 'Amrut Aahar (42 Days)',
    keywords: ['nutrition', 'health', 'diet', 'wellness', 'nature'],
    description: 'Healthy nutritious food with fresh ingredients in natural light',
    unsplashQuery: 'healthy nutrition food diet wellness',
    color: '#15803d'
  },
  'bandhan-mukti': {
    name: 'Bandhan Mukti (Liberation from Bondage)',
    keywords: ['liberation', 'freedom', 'peace', 'transformation', 'healing'],
    description: 'Person in free, powerful yoga pose representing liberation',
    unsplashQuery: 'freedom liberation yoga peace breaking chains',
    color: '#7c3aed'
  },
  'swar-yoga-level-2': {
    name: 'Swar Yoga Level-2',
    keywords: ['swar yoga', 'intermediate', 'breathing', 'consciousness'],
    description: 'Intermediate practitioner demonstrating focused breathing practice',
    unsplashQuery: 'yoga intermediate practice breathing focus',
    color: '#1e7b34'
  },
  'swar-yoga-businessman': {
    name: 'Swar Yoga Businessman',
    keywords: ['business', 'success', 'focus', 'energy', 'professional'],
    description: 'Professional practitioner balancing career success with yoga',
    unsplashQuery: 'business success professional focus mindfulness',
    color: '#3b82f6'
  },
  'personality-development': {
    name: 'Personality Development',
    keywords: ['personal growth', 'confidence', 'development', 'transformation'],
    description: 'Confident individual radiating positive energy and growth',
    unsplashQuery: 'personal development growth confidence success',
    color: '#f97316'
  },
  'garbh-sanskar': {
    name: 'Garbh Sanskar',
    keywords: ['pregnancy', 'maternity', 'wellness', 'mother', 'baby'],
    description: 'Pregnant mother in peaceful yoga pose for prenatal wellness',
    unsplashQuery: 'pregnancy maternity prenatal wellness yoga',
    color: '#db2777'
  },
  'teacher-training': {
    name: 'Teacher Training',
    keywords: ['yoga teacher', 'training', 'education', 'teaching', 'expertise'],
    description: 'Group of yoga teachers in training with mentoring focus',
    unsplashQuery: 'yoga teacher training education teaching expertise',
    color: '#0891b2'
  },
  'annual-satsang': {
    name: 'Annual Satsang',
    keywords: ['satsang', 'gathering', 'community', 'spiritual', 'celebration'],
    description: 'Large gathering of spiritual community in meditation circle',
    unsplashQuery: 'community gathering spiritual meditation circle',
    color: '#059669'
  },
  'nadi-parikshan': {
    name: 'Nadi Parikshan',
    keywords: ['ayurveda', 'health', 'assessment', 'diagnosis', 'wellness'],
    description: 'Ayurvedic wellness assessment with natural elements',
    unsplashQuery: 'ayurveda health wellness diagnosis assessment',
    color: '#b91c1c'
  },
  'family-wellness': {
    name: 'Family Wellness',
    keywords: ['family', 'health', 'yoga', 'together', 'wellbeing'],
    description: 'Happy family practicing yoga together in harmony',
    unsplashQuery: 'family yoga wellness together health',
    color: '#0d7377'
  },
  'advanced-breathing': {
    name: 'Advanced Breathing',
    keywords: ['breathing', 'pranayama', 'advanced', 'energy', 'techniques'],
    description: 'Advanced practitioner demonstrating complex breathing techniques',
    unsplashQuery: 'breathing techniques pranayama advanced meditation',
    color: '#6366f1'
  },
  'life-transformation': {
    name: 'Life Transformation',
    keywords: ['transformation', 'change', 'growth', 'new beginning', 'renewal'],
    description: 'Individual in powerful transformation journey visualization',
    unsplashQuery: 'transformation change growth new beginning renewal',
    color: '#16a34a'
  }
};

/**
 * IMPLEMENTATION GUIDE:
 * 
 * STEP 1: Using Unsplash API (Recommended - FREE)
 * ================================================
 * 1. Go to https://unsplash.com/developers
 * 2. Create a free account
 * 3. Create an application to get Access Key
 * 4. Use this URL format:
 *    https://api.unsplash.com/search/photos?query={query}&client_id={CLIENT_ID}&per_page=1&w=500&h=600
 * 
 * Example: For 'swar-yoga-basic':
 * https://api.unsplash.com/search/photos?query=yoga+breathing+meditation&client_id=YOUR_KEY&per_page=1&w=500&h=600
 * 
 * Then use the result's urls.regular for the image
 * 
 * STEP 2: Manual Selection (BEST QUALITY)
 * ======================================
 * 1. Go to https://unsplash.com
 * 2. Search for each workshop using the unsplashQuery
 * 3. Select high-quality image (minimum 600x600)
 * 4. Copy the image URL
 * 5. Update workshopsData.ts with the URL
 * 
 * STEP 3: Using Placeholder Service (QUICK)
 * ========================================
 * Use placeholder URLs:
 * - https://images.pexels.com/ (high quality)
 * - https://api.unsplash.com/random (random with filters)
 * 
 * STEP 4: AI Image Generation (PREMIUM)
 * ===================================
 * Use Replicate or DALL-E API:
 * - Requires API key
 * - Generates custom images
 * - Best quality
 */

/**
 * RECOMMENDED IMAGES (High Quality URLs)
 * Each workshop has a curated Unsplash image that matches the theme
 */
const recommendedImages = {
  'swar-yoga-basic': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'yogasana-sadhana': 'https://images.unsplash.com/photo-1512149160596-de36b3498493?w=500&h=600&fit=crop',
  'swar-yoga-level-1': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'swar-yoga-level-3': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'swar-yoga-level-4': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  '96-days-weight-loss': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=600&fit=crop',
  '42-days-meditation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'amrut-aahar': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=600&fit=crop',
  'bandhan-mukti': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'swar-yoga-level-2': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'swar-yoga-businessman': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=600&fit=crop',
  'personality-development': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=600&fit=crop',
  'garbh-sanskar': 'https://images.unsplash.com/photo-1434895550962-67e8de38b9d4?w=500&h=600&fit=crop',
  'teacher-training': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop',
  'annual-satsang': 'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=500&h=600&fit=crop',
  'nadi-parikshan': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&h=600&fit=crop',
  'family-wellness': 'https://images.unsplash.com/photo-1552674605-5defe6aa44bb?w=500&h=600&fit=crop',
  'advanced-breathing': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop',
  'life-transformation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=600&fit=crop'
};

console.log('📸 WORKSHOP IMAGE GENERATION GUIDE');
console.log('==================================\n');
console.log('To update workshop images, edit lib/workshopsData.ts');
console.log('Update the "image" field for each workshop with a high-quality URL\n');
console.log('Example mapping:');
console.log(JSON.stringify(workshopImageMappings, null, 2));
console.log('\n✅ USE THESE RECOMMENDED UNSPLASH URLS:');
Object.entries(recommendedImages).forEach(([slug, url]) => {
  console.log(`${slug}: ${url}`);
});
