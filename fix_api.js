const fs = require('fs');
let code = fs.readFileSync('app/api/admin/canva/meta-ai/route.ts', 'utf-8');

// 1. Remove required templateId check
code = code.replace(
  "if (!prompt || !templateId) {\\n      return NextResponse.json({ error: 'Missing prompt or templateId' }, { status: 400 });\\n    }",
  "if (!prompt) {\\n      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });\\n    }"
);

// 2. Conditionally skip Canva Autofill if no templateId
const oldCanvaBlock = `    // 3. Send Text to Canva Autofill
    const dataToFill = {
      Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
      Subheading: { type: 'text', text: aiData.Subheading || 'Don\\'t miss out on this.' },
      CTA: { type: 'text', text: aiData.CTA || 'Learn More' }
    };

    const response = await fetch('https://api.canva.com/rest/v1/autofills', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brand_template_id: templateId,
        title: \`AI Ad - \${aiData.Headline || 'Generated'}\`,
        data: dataToFill
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Canva Autofill Error:', responseData);
      return NextResponse.json({ error: responseData.message || 'Failed to autofill template' }, { status: response.status });
    }

    // Return the autofill job AND the generated image URL to the frontend
    return NextResponse.json({
      job: responseData.job,
      imageUrl: imageUrl,
      generatedText: aiData
    });`;
    
const newCanvaBlock = `    // 3. Send Text to Canva Autofill (Only if templateId exists)
    let job = null;
    if (templateId) {
      const dataToFill = {
        Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
        Subheading: { type: 'text', text: aiData.Subheading || 'Don\\'t miss out on this.' },
        CTA: { type: 'text', text: aiData.CTA || 'Learn More' }
      };

      const response = await fetch('https://api.canva.com/rest/v1/autofills', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${accessToken}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_template_id: templateId,
          title: \`AI Ad - \${aiData.Headline || 'Generated'}\`,
          data: dataToFill
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Canva Autofill Error:', responseData);
        return NextResponse.json({ error: responseData.message || 'Failed to autofill template' }, { status: response.status });
      }
      job = responseData.job;
    }

    // Return the autofill job (if any) AND the generated image URL to the frontend
    return NextResponse.json({
      job: job,
      imageUrl: imageUrl,
      generatedText: aiData
    });`;

code = code.replace(oldCanvaBlock, newCanvaBlock);
fs.writeFileSync('app/api/admin/canva/meta-ai/route.ts', code);
