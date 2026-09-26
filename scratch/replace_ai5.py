import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# Since we want to completely replace the previous AI-3 (isRegisteredAiWorkerActive) with AI-5.
# Let's use regex to find the block since it is very long and might have changed slightly.

match = re.search(r'useEffect\(\(\) => \{\n    if \(\!isRegisteredAiWorkerActive \|\| leadsData\.length === 0\) return;\n    \n    const interval = setInterval\(\(\) => \{.*?\n    return \(\) => clearInterval\(interval\);\n  \}, \[isRegisteredAiWorkerActive, leadsData, registeredLeadIds, closedLeadIds, registeredAiInsights\]\);', content, re.DOTALL)

if not match:
    print("Could not find AI-5 (old AI-3) block!")
else:
    old_ai3 = match.group(0)
    
    ai5_new = """useEffect(() => {
    if (!isRegisteredAiWorkerActive || leadsData.length === 0) return;
    
    const interval = setInterval(() => {
      // Find leads that are registered but not yet evaluated by this AI (not closed)
      const unevaluated = leadsData.filter(l => 
        registeredLeadIds.includes(l.id) && 
        !closedLeadIds.includes(l.id)
      );
      
      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newClosed: string[] = [];
        const newInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasDonation = false;
          let hasValidEducation = false;
          let hasValidProfession = false;
          let hasValidAge = false;
          let isAI3Reject = false;
          
          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              // AI-1 Checks
              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');
              
              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('donation') || qLower.includes('contribute')) && (isPositive || !isNaN(parseInt(aLower)))) hasDonation = true;
              
              // AI-2 Checks
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'hsc', 'degree', 'grad', 'post', 'phd', 'b.', 'm.', 'bca', 'mca', 'btech', 'mtech', 'ca', 'cs'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
                if (aLower.includes('student')) isAI3Reject = true;
              }
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed', 'professional'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;
                const rejectProfKeywords = ['jobless', 'job less', 'no job', 'retired', 'student', 'housewife'];
                if (rejectProfKeywords.some(kw => aLower.includes(kw))) isAI3Reject = true;
              }
              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age)) {
                  if (age >= 34 && age <= 64) hasValidAge = true;
                  if (age < 30 || age > 64) isAI3Reject = true;
                }
              }
            });
          }
          
          if (has14Days && hasVideo && hasDonation && hasValidEducation && hasValidProfession && hasValidAge && !isAI3Reject) {
            newClosed.push(lead.id);
          } else {
            newInsights[lead.id] = 'Failed AI-5 final combined verification.';
          }
        });
        
        if (newClosed.length > 0) setClosedLeadIds(prev => [...prev, ...newClosed]);
        if (Object.keys(newInsights).length > 0) setRegisteredAiInsights(prev => ({ ...prev, ...newInsights }));
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isRegisteredAiWorkerActive, leadsData, registeredLeadIds, closedLeadIds, registeredAiInsights]);"""

    content = content.replace(old_ai3, ai5_new)

    with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
        f.write(content)
    print("Replaced AI-5 (old AI-3)")
