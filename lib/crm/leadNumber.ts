import { bunnyExecute } from '@/lib/bunnyDatabase';

export async function allocateNextLeadNumber(userId: string) {
  // Try to find the max lead number for this user
  const result = await bunnyExecute({
    sql: 'SELECT data_json FROM leads_sql WHERE owner_user_id = ?',
    args: [userId]
  });
  
  let maxNumber = 0;
  for (const row of result.rows) {
    try {
      const data = JSON.parse(String(row.data_json));
      if (data.leadNumber) {
        const num = parseInt(data.leadNumber.replace(/^0+/, ''), 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    } catch (e) {
      // ignore parse error
    }
  }
  
  const nextNumber = maxNumber + 1;
  const leadNumber = nextNumber.toString().padStart(6, '0');
  
  return { leadNumber };
}
