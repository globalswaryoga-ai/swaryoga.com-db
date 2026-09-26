import re

with open('app/api/admin/enquiries/route.ts', 'r') as f:
    content = f.read()

# 1. Remove mongoose imports
content = re.sub(r"import mongoose from 'mongoose';\n", "", content)
content = re.sub(r"import \{ connectDB \} from '@/lib/db';\n", "", content)
content = re.sub(r"import \{ getLead \} from '@/lib/schemas/enterpriseSchemas';\n", "", content)

# 2. Replace GET logic
get_logic_old = r"""    // ── Primary source: MongoDB Leads labelled as enquiry ──.*?    \} catch \(mongoErr\) \{.*?(?=\n\n    // ── BunnyDB source)"""
get_logic_new = """    // ── Primary source: Bunny Leads labelled as enquiry ──
    let mongoEnquiries: any[] = [];
    try {
      const { listBunnyLeads } = await import('@/lib/bunnyLeadsRepository');
      // For SuperAdmins fetching all enquiries, we pass null for visibleUserIds/viewerUserId
      // If we needed to restrict by user, we'd pass decoded.userId
      const bunnyLeads = await listBunnyLeads({ 
        visibleUserIds: null, 
        viewerUserId: 'system',
        label: 'enquiry',
        limit: 2000,
        skip: 0
      });
      
      mongoEnquiries = bunnyLeads.map((l: any) => {
        const meta = l.metadata?.lastEnquiry || l.metadata || {};
        const payment = l.metadata?.payment;
        return {
          id: l.leadNumber || String(l._id),
          leadId: String(l._id),
          leadNumber: l.leadNumber,
          workshopId: meta.workshopId || '',
          workshopName: meta.workshopName || l.workshopName || 'Enquiry',
          name: l.name || 'Unknown',
          mobile: l.phoneNumber || '',
          email: l.email || meta.email || '',
          gender: meta.gender || '',
          city: meta.city || '',
          country: meta.country || '',
          mode: meta.mode || '',
          language: meta.language || '',
          month: meta.month || '',
          submittedAt: (meta.submittedAt || l.createdAt || new Date()).toString(),
          status: ['registered', 'enrolled', 'completed', 'customer'].includes(l.status) ? 'registered'
            : l.status === 'contacted' ? 'contacted'
            : 'new',
          notes: l.notes || '',
          labels: l.labels || [],
          timeSlot: meta.timeSlot || null,
          dynamicAnswers: meta.dynamicAnswers || {},
          payment: payment
            ? {
                status: payment.status || ((l.labels || []).includes('paid') ? 'paid' : 'pending'),
                amount: payment.amount,
                currency: payment.currency || 'INR',
                paidAt: payment.paidAt || null,
              }
            : null,
        };
      });
      if (workshopId) {
        mongoEnquiries = mongoEnquiries.filter(e => e.workshopId === workshopId);
      }
    } catch (bunnyErr) {
      console.error('[enquiries GET] Bunny read failed:', bunnyErr);
    }"""
content = re.sub(get_logic_old, get_logic_new, content, flags=re.DOTALL)

# 3. Replace POST logic
post_logic_old = r"""    // Also create/update CRM Lead so enquiries appear under Leads for unknown users.*?    \} catch \(leadError\) \{.*?console\.error\('❌ CRM lead creation from admin enquiry failed:', leadError\);\n    \}"""
post_logic_new = """    // Also create/update CRM Lead so enquiries appear under Leads for unknown users
    let leadNumber: string | null = null;
    try {
      const { getBunnyLeadByPhone, saveBunnyLead } = await import('@/lib/bunnyLeadsRepository');
      const cleanedPhone = normalizePhone(body.mobile);
      const cleanedName = String(body.name || '').trim();

      if (cleanedPhone) {
        const existingLead = await getBunnyLeadByPhone(cleanedPhone);

        if (existingLead) {
          // Update existing lead with enquiry info
          if (!existingLead.leadNumber) {
            const { leadNumber: num } = await allocateNextLeadNumber('system');
            existingLead.leadNumber = num;
          }
          if (cleanedName && !existingLead.name) existingLead.name = cleanedName;
          existingLead.labels = Array.from(new Set([
            ...(existingLead.labels || []),
            'enquiry',
            'admin-form',
            body.workshopName || 'general',
          ]));
          existingLead.metadata = {
            ...(existingLead.metadata || {}),
            lastEnquiry: {
              workshopId: body.workshopId,
              workshopName: body.workshopName,
              gender: body.gender,
              city: body.country || body.city || '',
              submittedAt: new Date(),
              dynamicAnswers: body.dynamicAnswers || {},
            },
          };
          await saveBunnyLead(existingLead, existingLead._id);
          try { await addLeadToMainBroadcastList(existingLead); } catch(e) {}
          leadNumber = existingLead.leadNumber;
        } else {
          // Create new lead for unknown user
          const { leadNumber: allocatedLeadNumber } = await allocateNextLeadNumber('system');
          const newLead = await saveBunnyLead({
            leadNumber: allocatedLeadNumber,
            name: cleanedName || 'Unknown User',
            phoneNumber: cleanedPhone,
            status: 'lead',
            source: 'website',
            workshopName: body.workshopName || 'Enquiry Form',
            labels: ['enquiry', 'admin-form', body.workshopName || 'general'],
            createdByUserId: 'system',
            assignedToUserId: 'system',
            createdAt: new Date().toISOString(),
            metadata: {
              formType: 'admin-enquiry',
              workshopId: body.workshopId,
              workshopName: body.workshopName,
              gender: body.gender,
              city: body.city,
              submittedAt: new Date(),
              dynamicAnswers: body.dynamicAnswers || {},
            },
          });
          try { await addLeadToMainBroadcastList(newLead); } catch(e) {}
          leadNumber = allocatedLeadNumber;
          console.log(`✅ New CRM lead created from admin enquiry: ${allocatedLeadNumber}`);
        }
      }
    } catch (leadError) {
      // Non-fatal: enquiry should still succeed even if CRM write fails
      console.error('❌ CRM lead creation from admin enquiry failed:', leadError);
    }"""
content = re.sub(post_logic_old, post_logic_new, content, flags=re.DOTALL)

# 4. Replace PATCH logic
patch_logic_old = r"""    // ── Primary: update the MongoDB Lead this enquiry was sourced from ──.*?    \} catch \(mongoErr\) \{.*?console\.error\('\[enquiries PATCH\] Mongo update failed, falling back to JSON:', mongoErr\);\n    \}"""
patch_logic_new = """    // ── Primary: update the Bunny Lead this enquiry was sourced from ──
    try {
      const { getBunnyLeadById, listBunnyLeads, saveBunnyLead } = await import('@/lib/bunnyLeadsRepository');
      
      let lead = null;
      // Try by ID first if it looks like a document ID
      if (enquiryId && enquiryId.length > 10) {
          lead = await getBunnyLeadById(enquiryId);
      }
      // Fallback to searching by leadNumber
      if (!lead) {
          const leads = await listBunnyLeads({ visibleUserIds: null, viewerUserId: 'system', skip: 0, limit: 100 });
          lead = leads.find((l: any) => l.leadNumber === enquiryId || String(l._id) === enquiryId);
      }

      if (lead) {
        if (body.status) lead.status = ENQUIRY_TO_LEAD_STATUS[body.status] || body.status;
        if (body.name !== undefined) lead.name = String(body.name).trim();
        if (body.mobile !== undefined) lead.phoneNumber = normalizePhone(body.mobile) || String(body.mobile).trim();
        if (body.notes !== undefined) lead.notes = body.notes;
        
        if (body.email !== undefined) lead.email = String(body.email).trim();
        
        // Handle metadata updates
        if (!lead.metadata) lead.metadata = {};
        if (body.gender !== undefined) lead.metadata.gender = body.gender;
        if (body.city !== undefined) lead.metadata.city = body.city;
        
        // Dynamic answers (everything else not explicitly checked)
        const standardKeys = ['status', 'name', 'mobile', 'notes', 'email', 'gender', 'city', 'id'];
        const dynamicUpdates = Object.keys(body).filter(k => !standardKeys.includes(k));
        
        if (dynamicUpdates.length > 0) {
          if (!lead.metadata.dynamicAnswers) lead.metadata.dynamicAnswers = {};
          dynamicUpdates.forEach(k => {
            lead.metadata.dynamicAnswers[k] = body[k];
          });
        }
        
        await saveBunnyLead(lead, lead._id);
        return NextResponse.json(
          { message: 'Enquiry updated successfully', data: { id: enquiryId, name: lead.name, mobile: lead.phoneNumber, status: body.status } },
          { status: 200 }
        );
      }
    } catch (bunnyErr) {
      console.error('[enquiries PATCH] Bunny update failed, falling back to JSON:', bunnyErr);
    }"""
content = re.sub(patch_logic_old, patch_logic_new, content, flags=re.DOTALL)

with open('app/api/admin/enquiries/route.ts', 'w') as f:
    f.write(content)
