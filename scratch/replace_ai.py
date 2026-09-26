import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# Replace AI-1
ai1_old = """    const interval = setInterval(() => {
      const unapproved = leadsData.filter(l => crmLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !pendingLeadIds.includes(l.id));
      if (unapproved.length > 0) {
        const toProcess = unapproved.slice(0, 5);
        const toApprove: string[] = [];
        const toPending: string[] = [];
        const newPendingInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasOffer = false;
          
          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');
              
              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('offer') || qLower.includes('commitment')) && isPositive) hasOffer = true;
            });
          }
          
          if (has14Days && hasVideo && hasOffer) {
            toApprove.push(lead.id);
          } else {
            toPending.push(lead.id);
            let reason = '';
            if (!has14Days) reason += 'Missed 14 Days commitment. ';
            if (!hasVideo) reason += 'Missed Video On commitment. ';
            if (!hasOffer) reason += 'Missed Offer commitment. ';
            newPendingInsights[lead.id] = reason.trim() || 'Did not meet all conditions.';
          }
        });

        if (toApprove.length > 0) setApprovedLeadIds(prev => [...prev, ...toApprove]);
        if (toPending.length > 0) {
          setPendingLeadIds(prev => [...prev, ...toPending]);
          setPendingAiInsights(prev => ({ ...prev, ...newPendingInsights }));
        }
        
        toast.success(`🤖 AI Worker processed ${toProcess.length} forms: ${toApprove.length} Approved, ${toPending.length} Pending.`);
      }
    }, 10000); // Temporarily 10 seconds so the user can see it work!"""

ai1_new = """    const interval = setInterval(() => {
      const unapproved = leadsData.filter(l => crmLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !pendingLeadIds.includes(l.id) && !pending2LeadIds.includes(l.id));
      if (unapproved.length > 0) {
        const toProcess = unapproved.slice(0, 5);
        const toApprove: string[] = [];
        const toPending: string[] = [];
        const newPendingInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasDonation = false;
          
          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');
              
              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('donation') || qLower.includes('contribute')) && (isPositive || !isNaN(parseInt(aLower)))) hasDonation = true;
            });
          }
          
          if (has14Days && hasVideo && hasDonation) {
            toApprove.push(lead.id);
          } else {
            toPending.push(lead.id);
            let reason = '';
            if (!has14Days) reason += 'Missed 14 Days commitment. ';
            if (!hasVideo) reason += 'Missed Video On commitment. ';
            if (!hasDonation) reason += 'Missed Donation commitment. ';
            newPendingInsights[lead.id] = reason.trim() || 'Did not meet all AI-1 conditions.';
          }
        });

        if (toApprove.length > 0) setApprovedLeadIds(prev => [...prev, ...toApprove]);
        if (toPending.length > 0) {
          setPendingLeadIds(prev => [...prev, ...toPending]);
          setPendingAiInsights(prev => ({ ...prev, ...newPendingInsights }));
        }
        
        toast.success(`🤖 AI-1 processed ${toProcess.length} forms: ${toApprove.length} Approved, ${toPending.length} Pending-1.`);
      }
    }, 10000);"""

content = content.replace(ai1_old, ai1_new)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
print("Replaced AI-1")
