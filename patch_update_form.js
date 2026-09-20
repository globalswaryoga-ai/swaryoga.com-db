const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/lib/bunny-forms-db.ts';
let content = fs.readFileSync(file, 'utf8');

const newUpdateForm = `export async function updateForm(formId: string, body: any) {
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
      sql: \`UPDATE enquiry_forms SET form_id = ? WHERE form_id = ?\`,
      args: [newId, formId],
    });
    await bunnyExecute({
      sql: \`UPDATE form_questions SET form_id = ? WHERE form_id = ?\`,
      args: [newId, formId],
    });
    
    targetFormId = newId;
  }

  await bunnyExecute({
    sql: \`UPDATE enquiry_forms SET
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
      price             = ?,
      currency          = ?,
      fee_options       = ?,
      group_link        = ?,
      time_slots        = ?,
      is_active         = ?,
      updated_at        = datetime('now')
    WHERE form_id = ?\`,
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
}`;

content = content.replace(
  /export async function updateForm\(formId: string, body: any\) \{[\s\S]*?return getFormById\(formId\);\n\}/m,
  newUpdateForm
);

fs.writeFileSync(file, content);
console.log('Patched updateForm');
