async function test() {
  const BRIDGE_URL = "http://52.91.198.23:3333";
  const BRIDGE_SECRET = "swar-bridge-secret-2024";
  
  const payload = {
    to: "1606351380725@lid",
    message: "Test from diagnostic script " + new Date().toISOString(),
    type: "text"
  };

  console.log("Sending to bridge...");
  const res = await fetch(`${BRIDGE_URL}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-secret": BRIDGE_SECRET
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

test();
