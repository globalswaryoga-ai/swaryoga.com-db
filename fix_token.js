const fs = require('fs');
let code = fs.readFileSync('app/api/admin/canva/meta-ai/route.ts', 'utf-8');

// 1. Remove early token check
const earlyTokenCheck = `    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Canva' }, { status: 401 });
    }`;

code = code.replace(earlyTokenCheck, `    const cookieStore = await cookies();
    const accessToken = cookieStore.get('canva_access_token')?.value;`);


// 2. Add it before the Canva API call
const autofillCheck = `    if (templateId) {
      const dataToFill = {`;
      
const newAutofillCheck = `    if (templateId) {
      if (!accessToken) {
        return NextResponse.json({ error: 'Not authenticated with Canva. Please connect Canva first to use Template IDs.' }, { status: 401 });
      }
      
      const dataToFill = {`;

code = code.replace(autofillCheck, newAutofillCheck);
fs.writeFileSync('app/api/admin/canva/meta-ai/route.ts', code);
