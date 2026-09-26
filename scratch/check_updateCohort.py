with open('lib/workshopBunnyRepository.ts', 'r') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'export async function updateCohort' in line:
        for j in range(i, i+30):
            print(lines[j])
        break
