import { config } from 'dotenv';
config({ path: '.env.local' });
import { listCohorts, listStudents, bunnyExecute } from '../lib/workshopBunnyRepository';

function normalise(value: any) {
  return String(value || '').trim().toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function phoneKey(value: any) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

async function run() {
  const cohorts = await listCohorts();
  console.log(`Found ${cohorts.length} cohorts.`);
  
  let mergedGroups = 0;
  let deletedStudents = 0;

  for (const cohort of cohorts) {
    const students = await listStudents(cohort._id, false);
    console.log(`Cohort ${cohort.name}: ${students.length} students`);
    
    const groups: any[][] = [];
    const byPhone = new Map<string, any[]>();
    const byEmail = new Map<string, any[]>();
    const byName = new Map<string, any[]>();

    for (const s of students) {
      const p = phoneKey(s.phone) || phoneKey(s.whatsappNumber);
      if (p) {
        if (!byPhone.has(p)) byPhone.set(p, []);
        byPhone.get(p)!.push(s);
      }
      const e = normalise(s.email);
      if (e) {
        if (!byEmail.has(e)) byEmail.set(e, []);
        byEmail.get(e)!.push(s);
      }
      const n = normalise(s.name);
      if (n) {
        if (!byName.has(n)) byName.set(n, []);
        byName.get(n)!.push(s);
      }
    }

    const processedIds = new Set<string>();

    for (const s of students) {
      if (processedIds.has(s._id)) continue;
      
      const cluster = new Map<string, any>();
      const queue = [s];
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (cluster.has(current._id)) continue;
        
        cluster.set(current._id, current);
        processedIds.add(current._id);

        const p = phoneKey(current.phone) || phoneKey(current.whatsappNumber);
        if (p && byPhone.has(p)) {
          for (const match of byPhone.get(p)!) if (!cluster.has(match._id)) queue.push(match);
        }
        const e = normalise(current.email);
        if (e && byEmail.has(e)) {
          for (const match of byEmail.get(e)!) if (!cluster.has(match._id)) queue.push(match);
        }
        const n = normalise(current.name);
        if (n && !p && !e) {
            if (byName.has(n)) {
              for (const match of byName.get(n)!) {
                const matchP = phoneKey(match.phone) || phoneKey(match.whatsappNumber);
                if (p && matchP && p !== matchP) continue;
                if (!cluster.has(match._id)) queue.push(match);
              }
            }
        }
      }
      
      if (cluster.size > 1) {
        groups.push(Array.from(cluster.values()));
      }
    }

    console.log(`Found ${groups.length} duplicate groups in ${cohort.name}`);

    for (const group of groups) {
      try {
        group.sort((a, b) => {
          let scoreA = (a.source === 'manual' ? 100 : 0) + (a.phone ? 10 : 0) + (a.active ? 1 : 0);
          let scoreB = (b.source === 'manual' ? 100 : 0) + (b.phone ? 10 : 0) + (b.active ? 1 : 0);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

        const primary = group[0];
        const duplicates = group.slice(1);
        console.log(`Merging ${duplicates.length} duplicates into primary ${primary.name}`);

        for (const dup of duplicates) {
          const pAtt = await bunnyExecute({ sql: 'SELECT * FROM workshop_attendance_sql WHERE student_id = ?', args: [primary._id] });
          const dAtt = await bunnyExecute({ sql: 'SELECT * FROM workshop_attendance_sql WHERE student_id = ?', args: [dup._id] });
          
          for (const dr of dAtt.rows) {
            const pr = pAtt.rows.find(r => r.class_date === dr.class_date);
            if (pr) {
              const newDuration = (Number(pr.duration_seconds) || 0) + (Number(dr.duration_seconds) || 0);
              let newJoined = pr.joined_at;
              let newLeft = pr.left_at;
              if (dr.joined_at && (!newJoined || new Date(dr.joined_at) < new Date(newJoined))) newJoined = dr.joined_at;
              if (dr.left_at && (!newLeft || new Date(dr.left_at) > new Date(newLeft))) newLeft = dr.left_at;
              
              await bunnyExecute({
                sql: 'UPDATE workshop_attendance_sql SET duration_seconds = ?, joined_at = ?, left_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                args: [newDuration, newJoined, newLeft, pr.id]
              });
              await bunnyExecute({ sql: 'DELETE FROM workshop_attendance_sql WHERE id = ?', args: [dr.id] });
            } else {
              await bunnyExecute({ sql: 'UPDATE workshop_attendance_sql SET student_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [primary._id, dr.id] });
            }
          }

          // Also fill missing fields on primary from dup if possible
          const updates: string[] = [];
          const args: any[] = [];
          if (!primary.email && dup.email) { updates.push('email = ?'); args.push(dup.email); primary.email = dup.email; }
          if (!primary.phone && dup.phone) { updates.push('phone = ?'); args.push(dup.phone); primary.phone = dup.phone; }
          if (!primary.whatsapp_number && dup.whatsapp_number) { updates.push('whatsapp_number = ?'); args.push(dup.whatsapp_number); primary.whatsapp_number = dup.whatsapp_number; }
          
          if (updates.length > 0) {
            args.push(primary._id);
            await bunnyExecute({ sql: `UPDATE workshop_students_sql SET ${updates.join(', ')} WHERE id = ?`, args });
          }

          await bunnyExecute({ sql: 'DELETE FROM workshop_students_sql WHERE id = ?', args: [dup._id] });
          deletedStudents++;
        }
        mergedGroups++;
      } catch (err: any) {
        console.error(`Failed to merge group for ${group[0]?.name}:`, err.message);
      }
    }
  }

  console.log(`Merged ${mergedGroups} groups, deleted ${deletedStudents} students`);
}

run().catch(console.error);
