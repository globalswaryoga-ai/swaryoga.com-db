with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# 1. Inject moveColumn
moveColumnDef = """                    const moveColumn = (colId: string, direction: 'left' | 'right') => {
                      const idx = columnOrder.indexOf(colId);
                      if (direction === 'left' && idx > 0) {
                        const newOrder = [...columnOrder];
                        [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                        setColumnOrder(newOrder);
                      } else if (direction === 'right' && idx < columnOrder.length - 1) {
                        const newOrder = [...columnOrder];
                        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                        setColumnOrder(newOrder);
                      }
                    };

                    const handleColResize ="""

content = content.replace("                    const handleColResize =", moveColumnDef)

# 2. Replace activeColumns with columnOrder
content = content.replace("activeColumns.map", "columnOrder.map")
content = content.replace("activeColumns.length", "columnOrder.length")

with open('app/admin/crm/new-registration/page.tsx', 'w') as f:
    f.write(content)
