with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

old_sort = """    // Sort logic to prioritize specific keywords
    const priority = (k: string) => {
      const lower = k.toLowerCase();
      if (lower.includes('workshop date') || lower.includes('workshop month') || lower.includes('which workshop')) return 1;
      if (lower.includes('14 day') || lower.includes('14-day') || lower.includes('ready to do')) return 2;
      if (lower.includes('video')) return 3;
      if (lower.includes('donation')) return 4;
      return 100;
    };
    
    allKeys.sort((a, b) => priority(a) - priority(b));
    return allKeys;
  }, [leadsData]);"""

new_sort = """    // Sort logic to prioritize MAPPED questions first
    const mappingValues = Object.values(selectedWorkshop?.googleFormMapping || {});
    
    const priority = (k: string) => {
      // 1. Exact match with a mapped question
      const mapIdx = mappingValues.findIndex(v => v === k);
      if (mapIdx !== -1) return mapIdx;
      
      // 2. Fallback to old keyword priority for unmapped but important questions
      const lower = k.toLowerCase();
      if (lower.includes('workshop date') || lower.includes('workshop month') || lower.includes('which workshop')) return 50;
      if (lower.includes('14 day') || lower.includes('14-day') || lower.includes('ready to do')) return 51;
      if (lower.includes('video')) return 52;
      if (lower.includes('donation')) return 53;
      
      return 100;
    };
    
    allKeys.sort((a, b) => priority(a) - priority(b));
    return allKeys;
  }, [leadsData, selectedWorkshop?.googleFormMapping]);"""

if old_sort in content:
    content = content.replace(old_sort, new_sort)
    print("Fixed sort.")
else:
    print("Could not find old sort.")

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
