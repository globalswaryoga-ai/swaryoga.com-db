import fs from 'fs';
const file = '/Users/mohankalburgi/swaryoga.com-db/app/api/webhooks/meta/leadgen/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Update imports
code = code.replace(
  "import { getLead } from '@/lib/schemas/enterpriseSchemas';",
  "import { getBunnyLeadByPhone, saveBunnyLead, getBunnyLeads } from '@/lib/bunnyLeadsRepository';"
);

// Update upsertLeadFromMeta
const oldUpsert = `    const existingLead = await Lead.findOne({ $or: orFilters });

    if (existingLead) {
      // Update existing lead with Meta metadata
      existingLead.metadata = existingLead.metadata || {};
      existingLead.metadata.metaLeadgenId = metaLeadgenId;
      existingLead.source = 'meta_leadgen';
      
      // Set workshop name if mapped and not already set
      if (workshopName && !existingLead.workshopName) {
        existingLead.workshopName = workshopName;
      }

      // Store form_id in metadata
      if (formId) existingLead.metadata.metaFormId = formId;

      // Add 'social media' label
      if (!existingLead.labels || !existingLead.labels.includes('social media')) {
        existingLead.labels = Array.from(new Set([...(existingLead.labels || []), 'social media']));
      }

      // Ensure leadNumber exists (legacy/older leads)
      if (!existingLead.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        existingLead.leadNumber = leadNumber;
      }

      await existingLead.save();
      console.log(\`Updated existing lead: \${existingLead._id}\`);
      return { success: true, leadId: existingLead._id, action: 'updated' };
    }

    // Create new lead
    const { leadNumber } = await allocateNextLeadNumber();
    const newLead = await Lead.create({
      leadNumber,
      phoneNumber: phone || undefined,
      email: email || undefined,
      name: name || 'Instagram Lead',
      status: 'lead',
      source: 'meta_leadgen',
      ...(workshopName ? { workshopName } : {}),
      labels: ['social media'],
      metadata: {
        metaLeadgenId,
        ...(formId ? { metaFormId: formId } : {}),
        rawFieldData: fieldData,
      },
    });`;

const newUpsert = `    let existingLead: any = null;
    if (phone) {
      existingLead = await getBunnyLeadByPhone(phone, null);
    }
    
    // If not found by phone, try by metaLeadgenId
    if (!existingLead) {
      const allLeadsData = await getBunnyLeads({ limit: 5000, selectAll: true, excludeSource: '' }, null);
      const allLeads = allLeadsData.leads || [];
      existingLead = allLeads.find((l: any) => l.metadata?.metaLeadgenId === metaLeadgenId);
    }
    // Note: Not doing email fallback for BunnyDB right now since getBunnyLeadByPhone is standard.

    if (existingLead) {
      const existingLabels = Array.isArray(existingLead.labels) ? existingLead.labels : [];
      const updatedLead = await saveBunnyLead({
        ...existingLead,
        source: existingLead.source || 'meta_leadgen',
        workshopName: (workshopName && !existingLead.workshopName) ? workshopName : existingLead.workshopName,
        metadata: {
          ...(existingLead.metadata || {}),
          metaLeadgenId,
          ...(formId ? { metaFormId: formId } : {}),
        },
        labels: Array.from(new Set([...existingLabels, 'social media']))
      }, existingLead._id || existingLead.id);
      
      console.log(\`Updated existing lead: \${existingLead._id || existingLead.id}\`);
      return { success: true, leadId: existingLead._id || existingLead.id, action: 'updated' };
    }

    // Create new lead
    const { leadNumber } = await allocateNextLeadNumber(null);
    const newLead = await saveBunnyLead({
      leadNumber,
      phoneNumber: phone || '',
      email: email || '',
      name: name || 'Instagram Lead',
      status: 'lead',
      source: 'meta_leadgen',
      ...(workshopName ? { workshopName } : {}),
      labels: ['social media'],
      metadata: {
        metaLeadgenId,
        ...(formId ? { metaFormId: formId } : {}),
        rawFieldData: fieldData,
      },
      createdByUserId: 'system',
      assignedToUserId: 'system',
    });`;

code = code.replace(oldUpsert, newUpsert);

code = code.replace("const Lead = getLead();", "// Removed MongoDB getLead()");
code = code.replace("const orFilters: Record<string, unknown>[] = [];", "// Removed MongoDB orFilters");
code = code.replace("if (phone) orFilters.push({ phoneNumber: phone });", "");
code = code.replace("if (email) orFilters.push({ email });", "");
code = code.replace("orFilters.push({ 'metadata.metaLeadgenId': metaLeadgenId });", "");
code = code.replace("import { connectDB } from '@/lib/db';", "");
code = code.replace("await connectDB();", "");

fs.writeFileSync(file, code);
