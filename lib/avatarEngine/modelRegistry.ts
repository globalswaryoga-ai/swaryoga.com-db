import { bunnyExecute } from '@/lib/bunnyDatabase';

export interface AIModelRecord {
  id: string;
  name: string;
  version: string;
  license: string;
  commercial_permitted: number;
  function_category: string;
  gpu_min_vram_gb: number;
  disk_space_gb: number;
  download_url?: string;
  install_status: 'ready' | 'downloading' | 'failed' | 'not_installed';
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  config_json?: string;
  created_at: string;
  updated_at: string;
}

export async function getAllRegisteredModels(): Promise<AIModelRecord[]> {
  try {
    const res = await bunnyExecute('SELECT * FROM ai_models_registry_sql ORDER BY commercial_permitted DESC, function_category ASC');
    return (res.rows || []) as unknown as AIModelRecord[];
  } catch (error) {
    console.error('Error fetching registered models:', error);
    return [];
  }
}

export async function getModelsByCategory(category: string): Promise<AIModelRecord[]> {
  try {
    const res = await bunnyExecute({
      sql: 'SELECT * FROM ai_models_registry_sql WHERE function_category = ? AND commercial_permitted = 1',
      args: [category]
    });
    return (res.rows || []) as unknown as AIModelRecord[];
  } catch (error) {
    console.error(`Error fetching models for category ${category}:`, error);
    return [];
  }
}

export async function verifyModelHealth(modelId: string): Promise<{ isHealthy: boolean; model?: AIModelRecord }> {
  try {
    const res = await bunnyExecute({
      sql: 'SELECT * FROM ai_models_registry_sql WHERE id = ?',
      args: [modelId]
    });
    const model = (res.rows?.[0] as unknown as AIModelRecord) || null;
    if (!model) return { isHealthy: false };
    return {
      isHealthy: model.health_status === 'healthy' && model.commercial_permitted === 1,
      model
    };
  } catch (error) {
    return { isHealthy: false };
  }
}

