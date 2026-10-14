import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN
});

function findInAnswers(answers, keywords) {
  for (const [key, val] of Object.entries(answers)) {
    const k = key.toLowerCase();
    if (keywords.some(kw => k.includes(kw.toLowerCase()))) {
      const v = typeof val === 'object' && val !== null ? (val.answer || val.value || '') : String(val || '');
      if (v.trim()) return v.trim();
    }
  }
  return '';
}

const nameKeywords = ['full name', 'your name', 'name', 'pura naam', 'poora naam', 'नाव', 'नाम', 'naam', 'ಹೆಸರು', 'ಪೂರ್ಣ ಹೆಸರು'];
const emailKeywords = ['email', 'mail', 'ईमेल', 'ई-मेल', 'इमेल', 'ಇಮೇಲ್'];
const phoneKeywords = ['mobile', 'phone', 'whatsapp', 'contact', 'number', 'नंबर', 'नम्बर', 'क्रमांक', 'व्हाट्स', 'मोबाईल', 'मोबाइल', 'फोन', 'ಸಂಖ್ಯೆ', 'ದೂರವಾಣಿ', 'ವಾಟ್ಸಾಪ್'];

function getFormLanguage(formId) {
  if (formId === '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0' || formId === 'swar-yoga-english' || formId === '1UXrEIBXwmBGEG7uAT5spDeNam-kJ6j1vPTBldYTWM4g') return 'english';
  if (formId === '1x9gGYGX1U0C32M6i9i1XewJ6EwwELxaLQm68AEeuQXk' || formId === 'L1-hindi' || formId === '18zLNgVJJlb5n6VcUhz4IunzF-Spl-5kYFFjIU15yjBY') return 'hindi';
  if (formId === '1MmdQkKm7FTNwfA-MrfV8VVzt9n3PXSYTiuWozPGAZD8' || formId === '1nZz1ib6O2XxUfu_q7RJaBavs_4V_Nx3UiBnN8aNp9p0') return 'marathi';
  return 'english';
}

function getFormWorkshopName(formId) {
  if (formId === '18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0') return 'English Workshop';
  if (formId === 'swar-yoga-english') return 'Swar Yoga English';
  if (formId === '1x9gGYGX1U0C32M6i9i1XewJ6EwwELxaLQm68AEeuQXk') return 'Hindi Workshop';
  if (formId === '1MmdQkKm7FTNwfA-MrfV8VVzt9n3PXSYTiuWozPGAZD8') return 'Marathi Workshop';
  if (formId === '1nZz1ib6O2XxUfu_q7RJaBavs_4V_Nx3UiBnN8aNp9p0') return 'Marathi Offer';
  if (formId === '1UXrEIBXwmBGEG7uAT5spDeNam-kJ6j1vPTBldYTWM4g') return 'English Offer';
  if (formId === '18zLNgVJJlb5n6VcUhz4IunzF-Spl-5kYFFjIU15yjBY') return 'Hindi Offer';
  return 'Workshop';
}

async function runBatch(queries, chunkSize = 25) {
  for (let i = 0; i < queries.length; i += chunkSize) {
    const chunk = queries.slice(i, i + chunkSize);
    await client.batch(chunk, 'write');
    process.stdout.write(`.`);
  }
}

async function backfill() {
  console.log('[Fast Backfill] Starting fast backfill of form_submissions to leads_sql...');

  const subsRes = await client.execute(`SELECT * FROM form_submissions ORDER BY created_at ASC`);
  const subs = subsRes.rows;
  console.log(`[Fast Backfill] Total form submissions found: ${subs.length}`);

  const allLeadsRes = await client.execute(`SELECT document_id, lead_number, data_json FROM leads_sql`);
  const allLeadsMap = new Map();
  const phoneMap = new Map();
  const emailMap = new Map();
  let maxLeadNumber = 0;

  for (const r of allLeadsRes.rows) {
    let d = {};
    try {
      d = JSON.parse(r.data_json);
    } catch (_) {}
    const leadObj = { id: r.document_id, leadNumber: r.lead_number, ...d };
    allLeadsMap.set(r.document_id, leadObj);

    const num = parseInt(r.lead_number, 10);
    if (!isNaN(num) && num > maxLeadNumber) maxLeadNumber = num;

    const p = (d.phoneNumber || d.mobile || '').replace(/\D/g, '').slice(-10);
    if (p && p.length === 10 && !phoneMap.has(p)) phoneMap.set(p, r.document_id);

    const e = (d.email || '').trim().toLowerCase();
    if (e && !emailMap.has(e)) emailMap.set(e, r.document_id);
  }

  console.log(`[Fast Backfill] Loaded ${allLeadsMap.size} leads from leads_sql. Max lead number: ${maxLeadNumber}`);

  const insertLeadQueries = [];
  const updateLeadQueries = [];
  const updateSubQueries = [];

  let updatedExistingLeadCount = 0;
  let linkedPhoneCount = 0;
  let linkedEmailCount = 0;
  let createdNewLeadCount = 0;

  for (const s of subs) {
    let answers = {};
    try {
      answers = typeof s.answers === 'string' ? JSON.parse(s.answers) : (s.answers || {});
    } catch (_) {}

    const extractedName = s.name && !s.name.startsWith('Lead ') ? s.name : (findInAnswers(answers, nameKeywords) || s.name || 'Google Form Participant');
    const extractedEmail = s.email || findInAnswers(answers, emailKeywords) || '';
    const extractedPhone = s.mobile || findInAnswers(answers, phoneKeywords) || '';
    const cleanPhone = extractedPhone.replace(/\D/g, '').slice(-10);
    const cleanEmail = extractedEmail.trim().toLowerCase();

    const formLang = getFormLanguage(s.form_id);
    const workshopName = getFormWorkshopName(s.form_id);

    let targetLeadId = null;

    // 1. Existing valid lead_id
    if (s.lead_id && allLeadsMap.has(s.lead_id)) {
      targetLeadId = s.lead_id;
      updatedExistingLeadCount++;
    }
    // 2. Match by phone
    else if (cleanPhone && cleanPhone.length === 10 && phoneMap.has(cleanPhone)) {
      targetLeadId = phoneMap.get(cleanPhone);
      linkedPhoneCount++;
    }
    // 3. Match by email
    else if (cleanEmail && emailMap.has(cleanEmail)) {
      targetLeadId = emailMap.get(cleanEmail);
      linkedEmailCount++;
    }
    // 4. Create new lead
    else {
      maxLeadNumber++;
      targetLeadId = `lead_gform_${s.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const newPhone = cleanPhone && cleanPhone.length === 10 ? `91${cleanPhone}` : (extractedPhone || `9199990${String(s.id).slice(-5)}`);
      
      const newLeadData = {
        _id: targetLeadId,
        id: targetLeadId,
        leadNumber: String(maxLeadNumber),
        name: extractedName,
        phoneNumber: newPhone,
        mobile: newPhone,
        email: cleanEmail,
        source: 'google_forms',
        status: 'new_lead',
        workshopName,
        language: formLang,
        googleFormId: s.form_id,
        labels: ['Google Form Lead', 'form-submission', workshopName].filter(Boolean),
        dynamicAnswers: answers,
        _rawRecord: answers,
        metadata: {
          formType: 'google_forms',
          googleFormId: s.form_id,
          source: 'google_forms',
          lastGoogleFormSubmission: { formId: s.form_id, submittedAt: s.created_at }
        },
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      insertLeadQueries.push({
        sql: `INSERT INTO leads_sql (document_id, lead_key, owner_user_id, lead_number, data_json, created_at, updated_at)
              VALUES (?, ?, 'system', ?, ?, ?, ?)`,
        args: [
          targetLeadId,
          targetLeadId,
          String(maxLeadNumber),
          JSON.stringify(newLeadData),
          s.created_at || new Date().toISOString(),
          new Date().toISOString()
        ]
      });

      allLeadsMap.set(targetLeadId, newLeadData);
      if (cleanPhone && cleanPhone.length === 10) phoneMap.set(cleanPhone, targetLeadId);
      if (cleanEmail) emailMap.set(cleanEmail, targetLeadId);
      createdNewLeadCount++;
    }

    // Ensure lead document in leads_sql has googleFormId and correct labels/language
    const leadObj = allLeadsMap.get(targetLeadId);
    if (leadObj) {
      let changed = false;
      if (!leadObj.googleFormId || leadObj.googleFormId !== s.form_id) {
        leadObj.googleFormId = s.form_id;
        changed = true;
      }
      if (!leadObj.metadata) leadObj.metadata = {};
      if (!leadObj.metadata.googleFormId || leadObj.metadata.googleFormId !== s.form_id) {
        leadObj.metadata.googleFormId = s.form_id;
        changed = true;
      }
      if (!leadObj.language) {
        leadObj.language = formLang;
        changed = true;
      }
      const labels = Array.from(new Set([...(leadObj.labels || []), 'Google Form Lead', workshopName]));
      if (labels.length !== (leadObj.labels || []).length) {
        leadObj.labels = labels;
        changed = true;
      }

      if (changed) {
        leadObj.updatedAt = new Date().toISOString();
        updateLeadQueries.push({
          sql: `UPDATE leads_sql SET data_json = ?, updated_at = ? WHERE document_id = ?`,
          args: [JSON.stringify(leadObj), new Date().toISOString(), targetLeadId]
        });
      }
    }

    // Update form_submission fields and lead_id
    const needSubUpdate = s.lead_id !== targetLeadId || s.name !== extractedName || s.mobile !== extractedPhone || s.email !== extractedEmail;
    if (needSubUpdate) {
      updateSubQueries.push({
        sql: `UPDATE form_submissions SET lead_id = ?, name = ?, mobile = ?, email = ? WHERE id = ?`,
        args: [targetLeadId, extractedName, extractedPhone, extractedEmail, s.id]
      });
    }
  }

  console.log(`[Fast Backfill] Prepared ${insertLeadQueries.length} new leads, ${updateLeadQueries.length} lead updates, ${updateSubQueries.length} submission updates.`);

  if (insertLeadQueries.length > 0) {
    console.log('[Fast Backfill] Executing lead inserts in batches...');
    await runBatch(insertLeadQueries, 30);
    console.log('\n[Fast Backfill] Lead inserts done.');
  }

  if (updateLeadQueries.length > 0) {
    console.log('[Fast Backfill] Executing lead updates in batches...');
    await runBatch(updateLeadQueries, 30);
    console.log('\n[Fast Backfill] Lead updates done.');
  }

  if (updateSubQueries.length > 0) {
    console.log('[Fast Backfill] Executing submission updates in batches...');
    await runBatch(updateSubQueries, 30);
    console.log('\n[Fast Backfill] Submission updates done.');
  }

  console.log('\n[Fast Backfill] Finished all database batch updates!');
  console.log({
    totalProcessed: subs.length,
    updatedExistingLeadCount,
    linkedPhoneCount,
    linkedEmailCount,
    createdNewLeadCount
  });
}

backfill().catch(err => {
  console.error('[Fast Backfill Error]', err);
  process.exit(1);
});
