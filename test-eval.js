const evaluateLead = (lead, config, targetApprove, targetPending, targetReject) => {
    let mismatchCount = 0;
    let hardReject = false;
    let reasons = [];

    const answers = {};

    let finalStatus = targetApprove;
    let validFiltersCount = 0;

    (config.filters || []).forEach((filter) => {
        if (!filter.question) return; // Skip empty filters
        validFiltersCount++;
        
        const ans = answers[filter.question?.toLowerCase().replace(/\s+/g, ' ').trim()] || '';
        let matchedCategory = filter.fallbackCategory || filter.fallback || 'pending';
        
        if (filter.options) {
            for (const opt of filter.options) {
                if (opt.answer) {
                    const cleanAns = ans.replace(/_+$/, '').trim();
                    const cleanOpt = opt.answer.toLowerCase().trim();
                    const ansWords = cleanAns.split(/[\s,]+/);
                    let matched = cleanAns === cleanOpt || ansWords.includes(cleanOpt);
                    
                    if (!matched && cleanOpt.includes(' ')) {
                        matched = cleanAns.includes(cleanOpt);
                    }

                    if (matched) {
                        matchedCategory = opt.category;
                        break;
                    }
                }
            }
        }

        if (matchedCategory === 'rejected') {
            hardReject = true;
            reasons.push(`Failed on: ${filter.question}`);
        } else if (matchedCategory === 'pending') {
            mismatchCount++;
            reasons.push(`Pending on: ${filter.question}`);
            if (finalStatus !== targetReject) finalStatus = targetPending;
        }
    });

    const reasonStr = reasons.join(' | ');
    
    if (validFiltersCount === 0) return { status: targetPending, reason: 'No AI rules configured for this stage' };

    if (hardReject) return { status: targetReject, reason: reasonStr };
    if (config.maxMismatches && mismatchCount >= config.maxMismatches) {
        return { status: config.mismatchFallback === 'rejected' ? targetReject : targetPending, reason: reasonStr || 'Exceeded mismatches' };
    }
    
    return { status: finalStatus, reason: reasonStr || 'Approved by AI' };
};

const configEmpty = { filters: [] };
console.log(evaluateLead({}, configEmpty, 'stage_2_new', 'stage_1_pending', 'stage_1_rejected'));
