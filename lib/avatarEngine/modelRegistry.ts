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
  install_status: 'ready' | 'downloading' | 'failed' | 'not_installed' | 'unknown';
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unverified';
  config_json?: string;
  created_at: string;
  updated_at: string;
}

export async function getAllRegisteredModels(): Promise<AIModelRecord[]> {
  const res = await bunnyExecute('SELECT * FROM ai_models_registry_sql ORDER BY function_category ASC');
  return (res.rows || []) as unknown as AIModelRecord[];
}

export async function getModelsByCategory(category: string): Promise<AIModelRecord[]> {
  const res = await bunnyExecute({
    sql: 'SELECT * FROM ai_models_registry_sql WHERE function_category = ?',
    args: [category]
  });
  return (res.rows || []) as unknown as AIModelRecord[];
}

export async function verifyModelHealth(modelId: string): Promise<{ isHealthy: boolean; model?: AIModelRecord }> {
  const res = await bunnyExecute({
    sql: 'SELECT * FROM ai_models_registry_sql WHERE id = ?',
    args: [modelId]
  });
  const model = (res.rows?.[0] as unknown as AIModelRecord) || undefined;
  return { isHealthy: false, model };
}
