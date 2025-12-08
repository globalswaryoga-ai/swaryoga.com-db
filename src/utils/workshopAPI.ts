/**
 * Workshop API Client - Frontend
 * This module handles all API calls to the admin workshop endpoints
 */

const getAPIUrl = () => {
  // Check environment variable first
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Check if running in development or production
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isDev) {
    return 'http://localhost:4000/api'; // Local development - backend on port 4000
  } else {
    // Production - use latest Vercel backend (updated Dec 9, 2025)
    return 'https://swar-yoga-latest-jma0xxixy-swar-yoga-projects.vercel.app/api';
  }
};

const API_BASE_URL = `${getAPIUrl()}/admin/workshops`;

console.log(`🔗 Workshop API URL: ${API_BASE_URL}`);

export interface WorkshopBatch {
  id?: string;
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
  enrolledCount?: number;
  category: string;
  mode: string;
  language: string;
  level: string;
  location: string;
  image?: string;
  youtubeId?: string;
  paymentLinkINR?: string;
  paymentLinkNPR?: string;
  paymentLinkUSD?: string;
  whatsappGroupLink?: string;
  prerequisites?: string;
  learningOutcomes?: string;
  includedItems?: string;
  remarks?: string;
  isPublic: boolean;
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all workshops (admin view)
 */
export async function getAllWorkshops(): Promise<WorkshopBatch[]> {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workshops: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching all workshops:', error);
    throw error;
  }
}

/**
 * Get only public workshops (for public workshop page)
 */
export async function getPublicWorkshops(): Promise<WorkshopBatch[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch public workshops: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching public workshops:', error);
    throw error;
  }
}

/**
 * Get a single workshop by ID
 */
export async function getWorkshop(id: string): Promise<WorkshopBatch> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workshop: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error fetching workshop ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new workshop batch
 */
export async function createWorkshop(batch: Omit<WorkshopBatch, 'id' | 'created_at' | 'updated_at'>): Promise<WorkshopBatch> {
  try {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batch)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to create workshop: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error creating workshop:', error);
    throw error;
  }
}

/**
 * Update an existing workshop
 */
export async function updateWorkshop(
  id: string,
  updates: Partial<WorkshopBatch>
): Promise<WorkshopBatch> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update workshop: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error updating workshop ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a workshop
 */
export async function deleteWorkshop(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to delete workshop: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error deleting workshop ${id}:`, error);
    throw error;
  }
}

/**
 * Toggle workshop visibility (public/private)
 */
export async function toggleWorkshopVisibility(id: string): Promise<WorkshopBatch> {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to toggle visibility: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error toggling visibility for workshop ${id}:`, error);
    throw error;
  }
}

export default {
  getAllWorkshops,
  getPublicWorkshops,
  getWorkshop,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  toggleWorkshopVisibility
};
