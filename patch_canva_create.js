const fs = require('fs');
const file = 'app/api/admin/canva/meta-ai/route.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCanvaLogic = `    // 3. Send to Canva Autofill (only if templateId provided AND ad copy generated)
    let job = null;
    if (templateId && aiData) {
      if (!accessToken) {
        return NextResponse.json({
          aiText,
          imageUrl,
          generatedText: aiData,
          error: 'Not connected to Canva. Text and image generated successfully.'
        });
      }

      const dataToFill = {
        Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
        Subheading: { type: 'text', text: aiData.Subheading || "Don't miss out." },
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
      if (response.ok) {
        job = responseData.job;
      }
    }`;

const newCanvaLogic = `    // 3. Canva Integration (Autofill OR Create from Asset)
    let job = null;
    let designUrl = null;

    if (accessToken && (templateId || imageUrl)) {
      let assetId = null;
      if (imageUrl) {
         assetId = await uploadImageToCanva(imageUrl, accessToken);
      }

      if (templateId && aiData) {
        // Option A: Autofill template
        const dataToFill: any = {
          Headline: { type: 'text', text: aiData.Headline || 'Amazing Offer' },
          Subheading: { type: 'text', text: aiData.Subheading || "Don't miss out." },
          CTA: { type: 'text', text: aiData.CTA || 'Learn More' }
        };

        // If template has a predefined image replacement slot named 'Background' or 'Image'
        if (assetId) {
          dataToFill['Image'] = { type: 'image', asset_id: assetId };
          dataToFill['Background'] = { type: 'image', asset_id: assetId };
        }

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
        if (response.ok) {
          job = responseData.job;
        }
      } else if (assetId) {
        // Option B: Create a brand new design from the uploaded asset
        const presetName = aspectRatio === '9:16' ? 'instagram_story' : (aspectRatio === '16:9' ? 'youtube_thumbnail' : 'instagram_post');
        
        const response = await fetch('https://api.canva.com/rest/v1/designs', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${accessToken}\`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            design_type: { type: 'preset', name: presetName },
            title: 'AI Generated Ad',
            asset_id: assetId
          })
        });

        const responseData = await response.json();
        if (response.ok && responseData.design) {
          designUrl = responseData.design.url;
          aiText += \`\\n\\n✨ **[Click here to edit your design in Canva](\${designUrl})**\`;
        }
      }
    } else if (!accessToken && (templateId || imageUrl)) {
       // Just notify that it's not connected
       // The error will be passed to UI but generation succeeded
    }`;

code = code.replace(oldCanvaLogic, newCanvaLogic);

// Also update the final return JSON to include designUrl
code = code.replace(
  'return NextResponse.json({\n      aiText,\n      job,\n      imageUrl,\n      videoUrl,\n      generatedText: aiData,\n    });',
  'return NextResponse.json({\n      aiText,\n      job,\n      imageUrl,\n      videoUrl,\n      designUrl,\n      generatedText: aiData,\n    });'
);

fs.writeFileSync(file, code);
console.log("Replaced Canva logic");
