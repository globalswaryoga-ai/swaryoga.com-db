/**
 * BunnyDB repository for EnquiryForms and FormQuestions.
 * Uses @libsql/client (libSQL/SQLite) via lib/bunnyDatabase.ts.
 * Tables are created automatically on first use (idempotent).
 */

import { bunnyExecute, bunnyBatch } from './bunnyDatabase';
import { nanoid } from 'nanoid';

// ─── Table initialisation ─────────────────────────────────────────────────────

let tablesReady = false;

export async function ensureFormTables() {
  if (tablesReady) return;

  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS enquiry_forms (
        form_id           TEXT PRIMARY KEY,
        workshop_name     TEXT NOT NULL,
        workshop_date     TEXT DEFAULT '',
        workshop_end_date TEXT DEFAULT '',
        workshop_time     TEXT DEFAULT '',
        duration          TEXT DEFAULT '',
        holidays          TEXT DEFAULT '',
        workshop_mode     TEXT DEFAULT 'online',
        workshop_id       TEXT DEFAULT '',
        description       TEXT DEFAULT '',
        workshop_image    TEXT DEFAULT '',
        price             REAL DEFAULT 0,
        currency          TEXT DEFAULT 'INR',
        fee_options       TEXT DEFAULT '[]',
        group_link        TEXT DEFAULT '',
        time_slots        TEXT DEFAULT '[]',
        is_active         INTEGER DEFAULT 1,
        created_by        TEXT DEFAULT 'admin',
        submission_count  INTEGER DEFAULT 0,
        created_at        TEXT DEFAULT (datetime('now')),
        updated_at        TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS form_questions (
        id             TEXT PRIMARY KEY,
        field_key      TEXT NOT NULL,
        form_id        TEXT NOT NULL,
        question_type  TEXT NOT NULL DEFAULT 'text',
        label_en       TEXT NOT NULL DEFAULT '',
        label_hi       TEXT DEFAULT '',
        label_mr       TEXT DEFAULT '',
        placeholder_en TEXT DEFAULT '',
        options        TEXT DEFAULT '[]',
        image_url      TEXT DEFAULT '',
        qr_code_url    TEXT DEFAULT '',
        link_url       TEXT DEFAULT '',
        link_label     TEXT DEFAULT '',
        payment_config TEXT DEFAULT 'null',
        required       INTEGER DEFAULT 0,
        sort_order     INTEGER DEFAULT 0,
        is_active      INTEGER DEFAULT 1,
        created_at     TEXT DEFAULT (datetime('now')),
        updated_at     TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_fq_form_id ON form_questions(form_id)`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS form_submissions (
        id              TEXT PRIMARY KEY,
        form_id         TEXT NOT NULL,
        name            TEXT DEFAULT '',
        mobile          TEXT DEFAULT '',
        email           TEXT DEFAULT '',
        gender          TEXT DEFAULT '',
        city            TEXT DEFAULT '',
        answers         TEXT DEFAULT '{}',
        payment_status  TEXT DEFAULT 'pending',
        amount          REAL DEFAULT 0,
        currency        TEXT DEFAULT 'INR',
        created_at      TEXT DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_fs_form_id ON form_submissions(form_id)`,
      args: [],
    },
  ]);

  try {
    await bunnyExecute('ALTER TABLE enquiry_forms ADD COLUMN url_image TEXT DEFAULT ""');
  } catch (e) {
    // Column might already exist
  }

  tablesReady = true;
}

// ─── Row converters ───────────────────────────────────────────────────────────

function rowToForm(row: Record<string, any>) {
  return {
    formId:           row.form_id,
    workshopName:     row.workshop_name,
    workshopDate:     row.workshop_date     ?? '',
    workshopEndDate:  row.workshop_end_date ?? '',
    workshopTime:     row.workshop_time     ?? '',
    duration:         row.duration          ?? '',
    holidays:         row.holidays          ?? '',
    workshopMode:     row.workshop_mode     ?? 'online',
    workshopId:       row.workshop_id       ?? '',
    description:      row.description       ?? '',
    workshopImage:    row.workshop_image    ?? '',
    urlImage:         row.url_image         ?? '',
    price:            Number(row.price      ?? 0),
    currency:         row.currency          ?? 'INR',
    feeOptions:       safeJson(row.fee_options, []),
    groupLink:        row.group_link        ?? '',
    timeSlots:        safeJson(row.time_slots, []),
    isActive:         row.is_active === 1 || row.is_active === true,
    submissionCount:  Number(row.submission_count ?? 0),
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

function rowToQuestion(row: Record<string, any>) {
  return {
    _id:          row.id,
    fieldKey:     row.field_key,
    formId:       row.form_id,
    questionType: row.question_type,
    label:        { en: row.label_en ?? '', hi: row.label_hi ?? '', mr: row.label_mr ?? '' },
    placeholder:  { en: row.placeholder_en ?? '' },
    options:      safeJson(row.options, []),
    imageUrl:     row.image_url   ?? '',
    qrCodeUrl:    row.qr_code_url ?? '',
    linkUrl:      row.link_url    ?? '',
    linkLabel:    row.link_label  ?? '',
    paymentConfig: safeJson(row.payment_config, null),
    required:     row.required === 1 || row.required === true,
    order:        Number(row.sort_order ?? 0),
    isActive:     row.is_active === 1 || row.is_active === true,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function safeJson(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function sanitizeFeeOptions(raw: unknown): { label: string; price: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f: any) => ({ label: String(f?.label || '').trim(), price: Math.max(0, Number(f?.price) || 0) }))
    .filter(f => f.label || f.price > 0);
}

function sanitizeTimeSlots(raw: unknown): { label: string; groupLink: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: any) => ({ label: String(t?.label || '').trim(), groupLink: String(t?.groupLink || '').trim() }))
    .filter(t => t.label || t.groupLink);
}

// ─── EnquiryForm CRUD ─────────────────────────────────────────────────────────

export async function listForms() {
  await ensureFormTables();
  const res = await bunnyExecute(`SELECT * FROM enquiry_forms ORDER BY created_at DESC`);
  return (res.rows as any[]).map(rowToForm);
}

export async function getFormById(formId: string) {
  await ensureFormTables();
  const res = await bunnyExecute({ sql: `SELECT * FROM enquiry_forms WHERE form_id = ?`, args: [formId] });
  return res.rows[0] ? rowToForm(res.rows[0] as any) : null;
}

export async function createForm(body: any) {
  await ensureFormTables();

  const customSlug = (body.newFormId || body.formId)?.trim()?.replace(/[^a-zA-Z0-9_-]/g, '');
  let formId = customSlug || nanoid(8);
  if (customSlug) {
    const exists = await getFormById(customSlug);
    if (exists) {
      throw new Error(`Custom URL slug "${customSlug}" is already taken. Please choose another.`);
    }
  }

  const sanitizedFeeOptions = sanitizeFeeOptions(body.feeOptions);
  const sanitizedTimeSlots  = sanitizeTimeSlots(body.timeSlots);
  const legacyPrice = sanitizedFeeOptions.length
    ? Math.min(...sanitizedFeeOptions.map(f => f.price))
    : Math.max(0, Number(body.price) || 0);

  await bunnyExecute({
    sql: `INSERT INTO enquiry_forms
      (form_id, workshop_name, workshop_date, workshop_end_date, workshop_time,
       duration, holidays, workshop_mode, workshop_id, description, workshop_image, url_image,
       price, currency, fee_options, group_link, time_slots, is_active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    args: [
      formId,
      body.workshopName?.trim()  ?? '',
      body.workshopDate?.trim()  ?? '',
      body.workshopEndDate?.trim() ?? '',
      body.workshopTime?.trim()  ?? '',
      body.duration?.trim()      ?? '',
      body.holidays?.trim()      ?? '',
      body.workshopMode          ?? 'online',
      body.workshopId?.trim()    ?? '',
      body.description?.trim()   ?? '',
      body.workshopImage?.trim() ?? '',
      body.urlImage?.trim()      ?? '',
      legacyPrice,
      (body.currency?.trim() ?? 'INR').toUpperCase(),
      JSON.stringify(sanitizedFeeOptions),
      body.groupLink?.trim()     ?? '',
      JSON.stringify(sanitizedTimeSlots),
    ],
  });

  return getFormById(formId);
}

export async function updateForm(formId: string, body: any) {
  await ensureFormTables();
  const current = await getFormById(formId);
  if (!current) return null;

  const sanitizedFeeOptions = body.feeOptions !== undefined ? sanitizeFeeOptions(body.feeOptions) : current.feeOptions;
  const sanitizedTimeSlots  = body.timeSlots  !== undefined ? sanitizeTimeSlots(body.timeSlots)   : current.timeSlots;
  const legacyPrice = sanitizedFeeOptions.length
    ? Math.min(...sanitizedFeeOptions.map((f: any) => f.price))
    : (body.price !== undefined ? Math.max(0, Number(body.price) || 0) : current.price);

  let targetFormId = formId;

  // Handle Custom URL Slug / ID Rename
  if (body.newFormId && body.newFormId.trim() !== '' && body.newFormId !== formId) {
    const newId = body.newFormId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const exists = await getFormById(newId);
    if (exists) {
      throw new Error('That custom URL slug is already taken. Please choose another one.');
    }
    
    // Update the ID in both tables
    await bunnyExecute({
      sql: `UPDATE enquiry_forms SET form_id = ? WHERE form_id = ?`,
      args: [newId, formId],
    });
    await bunnyExecute({
      sql: `UPDATE form_questions SET form_id = ? WHERE form_id = ?`,
      args: [newId, formId],
    });
    
    targetFormId = newId;
  }

  await bunnyExecute({
    sql: `UPDATE enquiry_forms SET
      workshop_name     = ?,
      workshop_date     = ?,
      workshop_end_date = ?,
      workshop_time     = ?,
      duration          = ?,
      holidays          = ?,
      workshop_mode     = ?,
      workshop_id       = ?,
      description       = ?,
      workshop_image    = ?,
      url_image         = ?,
      price             = ?,
      currency          = ?,
      fee_options       = ?,
      group_link        = ?,
      time_slots        = ?,
      is_active         = ?,
      updated_at        = datetime('now')
    WHERE form_id = ?`,
    args: [
      body.workshopName   ?? current.workshopName,
      body.workshopDate   ?? current.workshopDate,
      body.workshopEndDate ?? current.workshopEndDate,
      body.workshopTime   ?? current.workshopTime,
      body.duration       ?? current.duration,
      body.holidays       ?? current.holidays,
      body.workshopMode   ?? current.workshopMode,
      body.workshopId     ?? current.workshopId,
      body.description    ?? current.description,
      body.workshopImage  ?? current.workshopImage,
      body.urlImage       ?? current.urlImage,
      legacyPrice,
      body.currency       ?? current.currency,
      JSON.stringify(sanitizedFeeOptions),
      body.groupLink      ?? current.groupLink,
      JSON.stringify(sanitizedTimeSlots),
      body.isActive !== undefined ? (body.isActive ? 1 : 0) : (current.isActive ? 1 : 0),
      targetFormId,
    ],
  });

  return getFormById(targetFormId);
}

export async function deactivateForm(formId: string) {
  await ensureFormTables();
  await bunnyExecute({
    sql: `UPDATE enquiry_forms SET is_active = 0, updated_at = datetime('now') WHERE form_id = ?`,
    args: [formId],
  });
}

export async function deleteForm(formId: string) {
  await ensureFormTables();
  await bunnyExecute({
    sql: `DELETE FROM enquiry_forms WHERE form_id = ?`,
    args: [formId],
  });
  await bunnyExecute({
    sql: `DELETE FROM form_questions WHERE form_id = ?`,
    args: [formId],
  });
}

// ─── FormQuestion CRUD ────────────────────────────────────────────────────────

export async function listQuestions(formId?: string) {
  await ensureFormTables();
  if (formId) {
    const res = await bunnyExecute({
      sql: `SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC, created_at ASC`,
      args: [formId],
    });
    return (res.rows as any[]).map(rowToQuestion);
  }
  const res = await bunnyExecute(`SELECT * FROM form_questions ORDER BY form_id, sort_order ASC`);
  return (res.rows as any[]).map(rowToQuestion);
}

export async function getQuestionByFieldKey(formId: string, fieldKey: string) {
  await ensureFormTables();
  const res = await bunnyExecute({
    sql: `SELECT * FROM form_questions WHERE form_id = ? AND field_key = ? LIMIT 1`,
    args: [formId, fieldKey],
  });
  return res.rows[0] ? rowToQuestion(res.rows[0] as any) : null;
}

export async function createQuestion(body: any) {
  await ensureFormTables();

  const id = nanoid(16);
  const sanitizedKey = (body.fieldKey ?? '').trim().replace(/[^a-zA-Z0-9_]/g, '');

  await bunnyExecute({
    sql: `INSERT INTO form_questions
      (id, field_key, form_id, question_type, label_en, label_hi, label_mr,
       placeholder_en, options, image_url, qr_code_url, link_url, link_label,
       payment_config, required, sort_order, is_active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    args: [
      id,
      sanitizedKey,
      body.formId        ?? '',
      body.questionType  ?? 'text',
      body.label?.en     ?? '',
      body.label?.hi     ?? '',
      body.label?.mr     ?? '',
      body.placeholder?.en ?? '',
      JSON.stringify(body.options ?? []),
      body.imageUrl      ?? '',
      body.qrCodeUrl     ?? '',
      body.linkUrl       ?? '',
      body.linkLabel     ?? '',
      JSON.stringify(body.paymentConfig ?? null),
      body.required ? 1 : 0,
      typeof body.order === 'number' ? body.order : 0,
    ],
  });

  const res = await bunnyExecute({ sql: `SELECT * FROM form_questions WHERE id = ?`, args: [id] });
  return res.rows[0] ? rowToQuestion(res.rows[0] as any) : null;
}

export async function updateQuestion(id: string, body: any) {
  await ensureFormTables();
  const res0 = await bunnyExecute({ sql: `SELECT * FROM form_questions WHERE id = ?`, args: [id] });
  const current = res0.rows[0] ? rowToQuestion(res0.rows[0] as any) : null;
  if (!current) return null;

  await bunnyExecute({
    sql: `UPDATE form_questions SET
      question_type  = ?,
      label_en       = ?,
      label_hi       = ?,
      label_mr       = ?,
      placeholder_en = ?,
      options        = ?,
      image_url      = ?,
      qr_code_url    = ?,
      link_url       = ?,
      link_label     = ?,
      payment_config = ?,
      required       = ?,
      sort_order     = ?,
      is_active      = ?,
      updated_at     = datetime('now')
    WHERE id = ?`,
    args: [
      body.questionType ?? current.questionType,
      body.label?.en    ?? current.label.en,
      body.label?.hi    ?? current.label.hi,
      body.label?.mr    ?? current.label.mr,
      body.placeholder?.en ?? current.placeholder?.en ?? '',
      JSON.stringify(body.options ?? current.options),
      body.imageUrl     ?? current.imageUrl,
      body.qrCodeUrl    ?? current.qrCodeUrl,
      body.linkUrl      ?? current.linkUrl,
      body.linkLabel    ?? current.linkLabel,
      JSON.stringify(body.paymentConfig ?? current.paymentConfig),
      body.required !== undefined ? (body.required ? 1 : 0) : (current.required ? 1 : 0),
      body.order        !== undefined ? body.order : current.order,
      body.isActive     !== undefined ? (body.isActive ? 1 : 0) : (current.isActive ? 1 : 0),
      id,
    ],
  });

  const res1 = await bunnyExecute({ sql: `SELECT * FROM form_questions WHERE id = ?`, args: [id] });
  return res1.rows[0] ? rowToQuestion(res1.rows[0] as any) : null;
}

// ─── FormSubmission CRUD ──────────────────────────────────────────────────────

function rowToSubmission(row: Record<string, any>) {
  return {
    id:            row.id,
    formId:        row.form_id,
    name:          row.name ?? '',
    mobile:        row.mobile ?? '',
    email:         row.email ?? '',
    gender:        row.gender ?? '',
    city:          row.city ?? '',
    answers:       safeJson(row.answers, {}),
    dynamicAnswers: safeJson(row.answers, {}),
    paymentStatus: row.payment_status ?? 'pending',
    amount:        Number(row.amount ?? 0),
    currency:      row.currency ?? 'INR',
    submittedAt:   row.created_at,
  };
}

export async function createSubmission(data: any) {
  await ensureFormTables();
  const id = 'sub_' + nanoid(10);
  await bunnyExecute({
    sql: `INSERT INTO form_submissions (id, form_id, name, mobile, email, gender, city, answers, payment_status, amount, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.formId,
      data.name || '',
      data.mobile || '',
      data.email || '',
      data.gender || '',
      data.city || '',
      JSON.stringify(data.answers || data.dynamicAnswers || {}),
      data.paymentStatus || 'pending',
      data.amount || 0,
      data.currency || 'INR',
    ],
  });
  
  // Increment submission count in enquiry_forms table
  await bunnyExecute({
    sql: `UPDATE enquiry_forms SET submission_count = submission_count + 1 WHERE form_id = ?`,
    args: [data.formId],
  });
  
  return id;
}

export async function listSubmissions(formId?: string) {
  await ensureFormTables();
  if (formId) {
    const res = await bunnyExecute({
      sql: `SELECT * FROM form_submissions WHERE form_id = ? ORDER BY created_at DESC`,
      args: [formId],
    });
    return (res.rows as any[]).map(rowToSubmission);
  }
  const res = await bunnyExecute(`SELECT * FROM form_submissions ORDER BY created_at DESC`);
  return (res.rows as any[]).map(rowToSubmission);
}

export async function deleteSubmission(id: string) {
  await ensureFormTables();
  await bunnyExecute({
    sql: `DELETE FROM form_submissions WHERE id = ?`,
    args: [id],
  });
}

export async function deleteQuestion(id: string) {
  await ensureFormTables();
  await bunnyExecute({ sql: `DELETE FROM form_questions WHERE id = ?`, args: [id] });
}
