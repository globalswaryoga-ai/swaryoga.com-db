// Interactive Buttons Experimental Patch (2024+ workarounds)
// WhatsApp deprecated buttons for unofficial APIs in 2022
// These are experimental formats that MAY work on some WhatsApp versions

// Add this endpoint to server-baileys.js before the final app.listen()

app.post("/send-interactive", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, body, buttons, footer, imageUrl, method } = req.body;
  if (!to || !buttons || buttons.length === 0) {
    return res.status(400).json({ success: false, error: "Missing recipient or buttons" });
  }

  const jid = to.includes("@") ? to : to + "@s.whatsapp.net";
  const validButtons = buttons.slice(0, 3).filter(b => b);
  const bodyContent = body || "Please select an option";
  const footerContent = footer || "Swar Yoga";

  // If specific method requested, try only that
  if (method) {
    try {
      const result = await trySingleMethod(method, jid, bodyContent, footerContent, validButtons, imageUrl);
      if (result?.key?.id) {
        return res.json({ success: true, id: result.key.id, method });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message, method });
    }
  }

  // Try all methods in sequence
  const methods = [
    { name: "native_flow_viewonce", fn: tryNativeFlowViewOnce },
    { name: "direct_interactive", fn: tryDirectInteractive },
    { name: "legacy_buttons", fn: tryLegacyButtons },
    { name: "template_message", fn: tryTemplateMessage }
  ];

  for (const { name, fn } of methods) {
    try {
      console.log(`🔵 Trying ${name}...`);
      const result = await fn(jid, bodyContent, footerContent, validButtons, imageUrl);
      if (result?.key?.id) {
        console.log(`✅ ${name} succeeded!`);
        return res.json({ success: true, id: result.key.id, method: name });
      }
    } catch (err) {
      console.log(`⚠️ ${name} failed:`, err.message);
    }
  }

  // Final fallback: numbered text
  console.log("📝 All methods failed, sending text fallback...");
  const btnText = validButtons.map((b, i) => {
    const text = typeof b === "string" ? b : (b.text || b);
    return `${i + 1}️⃣ *${text}*`;
  }).join("\n");
  
  const fullText = `${bodyContent}\n\n${btnText}\n\n_${footerContent}_`;
  
  try {
    const result = imageUrl 
      ? await sock.sendMessage(jid, { image: { url: imageUrl }, caption: fullText })
      : await sock.sendMessage(jid, { text: fullText });
    
    return res.json({ 
      success: true, 
      id: result?.key?.id, 
      method: "text_fallback",
      warning: "WhatsApp deprecated interactive buttons for unofficial APIs (Baileys/whatsapp-web.js) in 2022. Sent as text."
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper functions for each button format

async function tryNativeFlowViewOnce(jid, body, footer, buttons, imageUrl) {
  const nativeButtons = buttons.map((btn, idx) => ({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: typeof btn === "string" ? btn : (btn.text || btn),
      id: `btn_${idx}`
    })
  }));

  return await sock.sendMessage(jid, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: imageUrl ? { hasMediaAttachment: true, imageMessage: { url: imageUrl } } : undefined,
          body: { text: body },
          footer: { text: footer },
          nativeFlowMessage: {
            buttons: nativeButtons,
            messageParamsJson: ""
          }
        }
      }
    }
  });
}

async function tryDirectInteractive(jid, body, footer, buttons, imageUrl) {
  const nativeButtons = buttons.map((btn, idx) => ({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: typeof btn === "string" ? btn : (btn.text || btn),
      id: `btn_${idx}`
    })
  }));

  return await sock.sendMessage(jid, {
    interactiveMessage: {
      body: { text: body },
      footer: { text: footer },
      nativeFlowMessage: {
        buttons: nativeButtons,
        messageParamsJson: ""
      }
    }
  });
}

async function tryLegacyButtons(jid, body, footer, buttons, imageUrl) {
  const buttonRows = buttons.map((btn, idx) => ({
    buttonId: `btn_${idx}`,
    buttonText: { displayText: typeof btn === "string" ? btn : (btn.text || btn) },
    type: 1
  }));

  if (imageUrl) {
    return await sock.sendMessage(jid, {
      image: { url: imageUrl },
      caption: body,
      footer: footer,
      buttons: buttonRows,
      headerType: 4
    });
  }
  
  return await sock.sendMessage(jid, {
    text: body,
    footer: footer,
    buttons: buttonRows,
    headerType: 1
  });
}

async function tryTemplateMessage(jid, body, footer, buttons, imageUrl) {
  const templateButtons = buttons.map((btn, idx) => ({
    index: idx + 1,
    quickReplyButton: {
      displayText: typeof btn === "string" ? btn : (btn.text || btn),
      id: `btn_${idx}`
    }
  }));

  return await sock.sendMessage(jid, {
    templateMessage: {
      hydratedTemplate: {
        hydratedContentText: body,
        hydratedFooterText: footer,
        hydratedButtons: templateButtons
      }
    }
  });
}

async function trySingleMethod(method, jid, body, footer, buttons, imageUrl) {
  switch (method) {
    case "native_flow_viewonce": return await tryNativeFlowViewOnce(jid, body, footer, buttons, imageUrl);
    case "direct_interactive": return await tryDirectInteractive(jid, body, footer, buttons, imageUrl);
    case "legacy_buttons": return await tryLegacyButtons(jid, body, footer, buttons, imageUrl);
    case "template_message": return await tryTemplateMessage(jid, body, footer, buttons, imageUrl);
    default: throw new Error(`Unknown method: ${method}`);
  }
}
