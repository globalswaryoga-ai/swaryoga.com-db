import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# Fix filteredLeads logic (around line 2115)
filtered_old = """                    let filteredLeads = leadsData.filter(lead => {
                      if (!crmLeadIds.includes(lead.id)) return false;
                      if (leadSubTab === 'new') return true;
                      if (leadSubTab === 'approved') return approvedLeadIds.includes(lead.id) || registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'pending') return pendingLeadIds.includes(lead.id) && !approvedLeadIds.includes(lead.id) && !registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'registered') return registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'student_kota') return studentKotaLeadIds.includes(lead.id);
                      return false;
                    });"""

filtered_new = """                    let filteredLeads = leadsData.filter(lead => {
                      if (!crmLeadIds.includes(lead.id)) return false;
                      if (leadSubTab === 'new') return true;
                      if (leadSubTab === 'approved') return approvedLeadIds.includes(lead.id) || registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'pending') return pendingLeadIds.includes(lead.id) && !approvedLeadIds.includes(lead.id) && !registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'pending2') return pending2LeadIds.includes(lead.id);
                      if (leadSubTab === 'registered') return registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'student_kota') return studentKotaLeadIds.includes(lead.id);
                      return false;
                    });"""
                    
content = content.replace(filtered_old, filtered_new)

# Fix sorting (around line 2133)
sort_old = """                      if (leadSubTab === 'new') {
                        const getStatus = (id: string) => registeredLeadIds.includes(id) ? 3 : approvedLeadIds.includes(id) ? 2 : pendingLeadIds.includes(id) ? 1 : 0;
                        return getStatus(a.id) - getStatus(b.id);
                      }"""
                      
sort_new = """                      if (leadSubTab === 'new') {
                        const getStatus = (id: string) => registeredLeadIds.includes(id) ? 4 : approvedLeadIds.includes(id) ? 3 : pending2LeadIds.includes(id) ? 2 : pendingLeadIds.includes(id) ? 1 : 0;
                        return getStatus(a.id) - getStatus(b.id);
                      }"""

content = content.replace(sort_old, sort_new)

# Fix bg colors (around line 2191)
colors_old = """                            filteredLeads.map((lead, i) => {
                              const isSelected = selectedRowIds.includes(lead.id);
                              const isApproved = approvedLeadIds.includes(lead.id);
                              const isPending = pendingLeadIds.includes(lead.id);
                              const isRegistered = registeredLeadIds.includes(lead.id);
                              const isRejected = rejectedLeadIds.includes(lead.id);
                              const isClosed = closedLeadIds.includes(lead.id);
                              
                              let baseBgClass = 'bg-white hover:bg-slate-50';
                              
                              if (leadSubTab === 'new') {
                                if (isRegistered || isApproved) baseBgClass = 'bg-emerald-50 hover:bg-emerald-100';
                                else if (isPending) baseBgClass = 'bg-fuchsia-50 hover:bg-fuchsia-100';
                              } else if (leadSubTab === 'approved') {
                                if (isRegistered) baseBgClass = 'bg-emerald-50 hover:bg-emerald-100';
                              } else if (leadSubTab === 'pending') {
                                if (isRejected) baseBgClass = 'bg-red-50 hover:bg-red-100';
                                else baseBgClass = 'bg-yellow-50 hover:bg-yellow-100';
                              } else if (leadSubTab === 'registered' || leadSubTab === 'student_kota') {
                                if (isClosed) baseBgClass = 'bg-emerald-50 hover:bg-emerald-100';
                                else if (registeredAiInsights[lead.id]) baseBgClass = 'bg-yellow-50 hover:bg-yellow-100';
                              }

                              if (isSelected) baseBgClass = 'bg-indigo-50 hover:bg-indigo-100';

                              let cellBgClass = 'bg-white group-hover:bg-slate-50';
                              if (leadSubTab === 'new') {
                                if (isRegistered || isApproved) cellBgClass = 'bg-emerald-50 group-hover:bg-emerald-100';
                                else if (isPending) cellBgClass = 'bg-fuchsia-50 group-hover:bg-fuchsia-100';
                              } else if (leadSubTab === 'approved') {
                                if (isRegistered) cellBgClass = 'bg-emerald-50 group-hover:bg-emerald-100';
                              } else if (leadSubTab === 'pending') {
                                if (isRejected) cellBgClass = 'bg-red-50 group-hover:bg-red-100';
                                else cellBgClass = 'bg-yellow-50 group-hover:bg-yellow-100';
                              } else if (leadSubTab === 'registered') {
                                if (isClosed) cellBgClass = 'bg-emerald-50 group-hover:bg-emerald-100';
                                else if (registeredAiInsights[lead.id]) cellBgClass = 'bg-yellow-50 group-hover:bg-yellow-100';
                              }
                              if (isSelected) cellBgClass = 'bg-indigo-50 group-hover:bg-indigo-100';"""

colors_new = """                            filteredLeads.map((lead, i) => {
                              const isSelected = selectedRowIds.includes(lead.id);
                              const isApproved = approvedLeadIds.includes(lead.id);
                              const isPending = pendingLeadIds.includes(lead.id);
                              const isPending2 = pending2LeadIds.includes(lead.id);
                              const isRegistered = registeredLeadIds.includes(lead.id);
                              const isRejected = rejectedLeadIds.includes(lead.id);
                              const isClosed = closedLeadIds.includes(lead.id);
                              
                              let baseBgClass = 'bg-white hover:bg-slate-50';
                              
                              if (leadSubTab === 'new') {
                                if (isRegistered || isApproved) baseBgClass = 'bg-emerald-50 hover:bg-emerald-100';
                                else if (isPending || isPending2) baseBgClass = 'bg-yellow-50 hover:bg-yellow-100';
                              } else if (leadSubTab === 'approved') {
                                if (isRegistered) baseBgClass = 'bg-emerald-50 hover:bg-emerald-100';
                                else if (isPending2) baseBgClass = 'bg-yellow-50 hover:bg-yellow-100';
                              } else if (leadSubTab === 'pending' || leadSubTab === 'pending2') {
                                if (isRejected) baseBgClass = 'bg-red-50 hover:bg-red-100';
                                else baseBgClass = 'bg-yellow-50 hover:bg-yellow-100';
                              } else if (leadSubTab === 'registered' || leadSubTab === 'student_kota') {
                                if (isClosed) baseBgClass = 'bg-emerald-50 hover:bg-emerald-100';
                                else if (registeredAiInsights[lead.id]) baseBgClass = 'bg-yellow-50 hover:bg-yellow-100';
                              }

                              if (isSelected) baseBgClass = 'bg-indigo-50 hover:bg-indigo-100';

                              let cellBgClass = 'bg-white group-hover:bg-slate-50';
                              if (leadSubTab === 'new') {
                                if (isRegistered || isApproved) cellBgClass = 'bg-emerald-50 group-hover:bg-emerald-100';
                                else if (isPending || isPending2) cellBgClass = 'bg-yellow-50 group-hover:bg-yellow-100';
                              } else if (leadSubTab === 'approved') {
                                if (isRegistered) cellBgClass = 'bg-emerald-50 group-hover:bg-emerald-100';
                                else if (isPending2) cellBgClass = 'bg-yellow-50 group-hover:bg-yellow-100';
                              } else if (leadSubTab === 'pending' || leadSubTab === 'pending2') {
                                if (isRejected) cellBgClass = 'bg-red-50 group-hover:bg-red-100';
                                else cellBgClass = 'bg-yellow-50 group-hover:bg-yellow-100';
                              } else if (leadSubTab === 'registered') {
                                if (isClosed) cellBgClass = 'bg-emerald-50 group-hover:bg-emerald-100';
                                else if (registeredAiInsights[lead.id]) cellBgClass = 'bg-yellow-50 group-hover:bg-yellow-100';
                              }
                              if (isSelected) cellBgClass = 'bg-indigo-50 group-hover:bg-indigo-100';"""

content = content.replace(colors_old, colors_new)

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
print("Updated bg colors and logic")
