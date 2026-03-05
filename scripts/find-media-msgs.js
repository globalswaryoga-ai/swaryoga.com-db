const http = require("http");

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "localhost", port: 3333, path,
      headers: { "x-bridge-secret": "swar-bridge-secret-2024" }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject); req.end();
  });
}

(async () => {
  const { chats } = await get("/chats");
  console.log("Total chats:", chats.length);

  for (const chat of chats.slice(0, 20)) {
    try {
      const { messages } = await get("/messages/" + encodeURIComponent(chat.id));
      const mediaMsgs = messages.filter(m =>
        m.hasMedia || (m.body && ["[image]","[video]","[document]","[audio]"].includes(m.body))
      );
      if (mediaMsgs.length > 0) {
        console.log("\n=== Chat:", chat.id, chat.name, "===");
        mediaMsgs.forEach(m => {
          console.log(JSON.stringify({
            id: m.id, body: m.body, fromMe: m.fromMe,
            hasMedia: m.hasMedia, mediaUrl: m.mediaUrl,
            mediaMimetype: m.mediaMimetype
          }));
        });
      }
    } catch(e) { /* skip */ }
  }
})();
