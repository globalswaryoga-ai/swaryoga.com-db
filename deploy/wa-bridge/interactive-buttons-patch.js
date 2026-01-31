// NEW: Interactive Buttons (nativeFlowMessage format - works in 2024+)
// Add this endpoint to server-baileys.js before the final app.listen()

app.post("/send-interactive", authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: "WhatsApp not connected" });
  
  const { to, body, buttons, footer, imageUrl } = req.body;
  if (!to || !buttons || buttons.length === 0) {
    return res.status(400).json({ success: false, error: "Missing recipient or buttons" });
  }

  try {
    const jid = to.includes("@") ? to : to + "@s.whatsapp.net";
    
    // Format buttons for nativeFlowMessage
    const nativeButtons = buttons.slice(0, 3).map((btn, idx) => ({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: typeof btn === "string" ? btn : btn.text || btn,
        id: "btn_" + idx
      })
    }));

    const interactiveMsg = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: imageUrl ? { 
              hasMediaAttachment: true,
              imageMessage: { url: imageUrl }
            } : { hasMediaAttachment: false },
            body: { text: body || "" },
            footer: { text: footer || "Swar Yoga" },
            nativeFlowMessage: {
              buttons: nativeButtons,
              messageParamsJson: ""
            }
          }
        }
      }
    };

    console.log("Sending interactive message to:", jid);
    const result = await sock.sendMessage(jid, interactiveMsg);
    console.log("Interactive message sent:", result?.key?.id);
    
    res.json({ success: true, id: result?.key?.id });
  } catch (err) {
    console.error("Interactive message error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
