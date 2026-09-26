import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

ai2_old = """    const interval = setInterval(() => {
      // Find leads that are approved but not yet evaluated by this AI (not in registered and not already having an insight)
      const unevaluated = leadsData.filter(l => 
        approvedLeadIds.includes(l.id) && 
        !registeredLeadIds.includes(l.id) && 
        !approvalAiInsights[l.id]
      );
      
      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newRegistered: string[] = [];
        const newInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let reason = '';
          
          if (!lead.dynamicAnswers) {
            reason = 'No form data available.';
          } else {
            let hasValidEducation = false;
            let hasValidProfession = false;
            let hasValidAge = false;
            
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'degree', 'grad', 'post', 'phd', 'b.', 'm.'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
              }
              
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;
              }
              
              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age) && age >= 34 && age <= 60) {
                  hasValidAge = true;
                } else {
                  reason += `Age is ${aLower} (must be 34-60). `;
                }
              }
            });
            
            if (!hasValidEducation) reason += 'Education does not meet criteria. ';
            if (!hasValidProfession) reason += 'Profession does not meet criteria. ';
            if (reason === '' && (!hasValidAge)) reason += 'Age not specified or invalid. ';
          }
          
          if (reason === '') {
            newRegistered.push(lead.id);
          } else {
            newInsights[lead.id] = reason.trim();
          }
        });
        
        if (newRegistered.length > 0) {
          setRegisteredLeadIds(prev => [...prev, ...newRegistered]);
        }
        if (Object.keys(newInsights).length > 0) {
          setApprovalAiInsights(prev => ({ ...prev, ...newInsights }));
        }
      }
    }, 5000);"""

ai2_new = """    const interval = setInterval(() => {
      // Find leads that are approved but not yet in registered or pending-2
      const unevaluated = leadsData.filter(l => 
        approvedLeadIds.includes(l.id) && 
        !registeredLeadIds.includes(l.id) && 
        !pending2LeadIds.includes(l.id) &&
        !closedLeadIds.includes(l.id)
      );
      
      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newRegistered: string[] = [];
        const newPending2: string[] = [];
        const newInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let hasValidEducation = false;
          let hasValidProfession = false;
          let hasValidAge = false;
          let isAI3Reject = false;
          let reason = '';
          
          if (!lead.dynamicAnswers) {
            reason = 'No form data available.';
          } else {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              // AI-2 checks
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'hsc', 'degree', 'grad', 'post', 'phd', 'b.', 'm.', 'bca', 'mca', 'btech', 'mtech', 'ca', 'cs'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
                if (aLower.includes('student')) isAI3Reject = true; // AI-3 check
              }
              
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed', 'professional'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;
                
                const rejectProfKeywords = ['jobless', 'job less', 'no job', 'retired', 'student', 'housewife'];
                if (rejectProfKeywords.some(kw => aLower.includes(kw))) isAI3Reject = true; // AI-3 check
              }
              
              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age)) {
                  if (age >= 34 && age <= 64) hasValidAge = true;
                  if (age < 30 || age > 64) isAI3Reject = true; // AI-3 check
                }
              }
            });
            
            if (isAI3Reject) {
                reason = "AI-3 Rule: Jobless, student, retired, or age out of bounds (<30 or >64).";
            } else {
                if (!hasValidEducation) reason += 'Education does not meet 12th-PhD criteria. ';
                if (!hasValidProfession) reason += 'Profession is not job/business/self-employed. ';
                if (!hasValidAge) reason += 'Age is not between 34-64. ';
            }
          }
          
          if (reason === '') {
            newRegistered.push(lead.id);
          } else {
            newPending2.push(lead.id);
            newInsights[lead.id] = reason.trim();
          }
        });
        
        if (newRegistered.length > 0) setRegisteredLeadIds(prev => [...prev, ...newRegistered]);
        if (newPending2.length > 0) {
          setPending2LeadIds(prev => [...prev, ...newPending2]);
          setApprovalAiInsights(prev => ({ ...prev, ...newInsights }));
        }
      }
    }, 5000);"""

content = content.replace(ai2_old, ai2_new)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
print("Replaced AI-2")
