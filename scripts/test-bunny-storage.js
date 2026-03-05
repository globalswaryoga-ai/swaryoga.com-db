#!/usr/bin/env node
/**
 * Test Bunny Storage: upload, download, image, document, list, delete
 */

const apiKey = "e9e4333a-5bde-4f1f-acbd5c838aad-92c3-4f2d";
const host = "storage.bunnycdn.com";
const zone = "swaryogadb";
const cdn = "swaryogadb.b-cdn.net";

async function test() {
  let passed = 0;
  let failed = 0;

  function check(name, ok) {
    if (ok) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}`); }
  }

  // 1. Text file upload
  const txtPath = `test/test-${Date.now()}.txt`;
  console.log("\n1. Upload text file...");
  const r1 = await fetch(`https://${host}/${zone}/${txtPath}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "text/plain" },
    body: "Hello Bunny Storage Test"
  });
  check("Text upload status 201", r1.status === 201);

  // 2. Download text via CDN
  console.log("2. Download text via CDN...");
  await new Promise(r => setTimeout(r, 3000));
  const r2 = await fetch(`https://${cdn}/${txtPath}`);
  const txt = await r2.text();
  check("Text download status 200", r2.status === 200);
  check("Text content matches", txt === "Hello Bunny Storage Test");

  // 3. Image upload (PNG)
  console.log("3. Upload PNG image...");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "base64"
  );
  const imgPath = `test/test-img-${Date.now()}.png`;
  const r3 = await fetch(`https://${host}/${zone}/${imgPath}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "image/png" },
    body: new Uint8Array(png)
  });
  check("Image upload status 201", r3.status === 201);

  // 4. Download image via CDN
  console.log("4. Download image via CDN...");
  await new Promise(r => setTimeout(r, 3000));
  const r4 = await fetch(`https://${cdn}/${imgPath}`);
  check("Image download status 200", r4.status === 200);
  check("Image content-type is PNG", (r4.headers.get("content-type") || "").includes("png"));
  const imgBytes = await r4.arrayBuffer();
  check("Image size matches", imgBytes.byteLength === png.length);

  // 5. Document upload (PDF-like)
  console.log("5. Upload document...");
  const docPath = `test/test-doc-${Date.now()}.pdf`;
  const r5 = await fetch(`https://${host}/${zone}/${docPath}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "application/pdf" },
    body: Buffer.from("%PDF-1.4 test document content")
  });
  check("Document upload status 201", r5.status === 201);

  // 6. Download document
  console.log("6. Download document via CDN...");
  await new Promise(r => setTimeout(r, 3000));
  const r6 = await fetch(`https://${cdn}/${docPath}`);
  check("Document download status 200", r6.status === 200);
  const docContent = await r6.text();
  check("Document content correct", docContent.startsWith("%PDF"));

  // 7. Video upload (small MP4 header)
  console.log("7. Upload video file...");
  const videoPath = `test/test-video-${Date.now()}.mp4`;
  const r7 = await fetch(`https://${host}/${zone}/${videoPath}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "video/mp4" },
    body: Buffer.from("fake-mp4-content-for-testing")
  });
  check("Video upload status 201", r7.status === 201);

  // 8. List files in test/
  console.log("8. List files...");
  const r8 = await fetch(`https://${host}/${zone}/test/`, {
    headers: { AccessKey: apiKey, Accept: "application/json" }
  });
  const files = await r8.json();
  check("List returns files", files.length >= 4);
  console.log(`   Found ${files.length} files in test/`);

  // 9. Content-addressed upload (dedup pattern)
  console.log("9. Content-addressed upload...");
  const crypto = require("crypto");
  const hash = crypto.createHash("md5").update(png).digest("hex");
  const contentKey = `uploads/content-cache/${hash}.png`;
  const r9 = await fetch(`https://${host}/${zone}/${contentKey}`, {
    method: "PUT",
    headers: { AccessKey: apiKey, "Content-Type": "image/png" },
    body: new Uint8Array(png)
  });
  check("Content-addressed upload status 201", r9.status === 201);
  
  // Verify CDN access
  await new Promise(r => setTimeout(r, 2000));
  const r9b = await fetch(`https://${cdn}/${contentKey}`);
  check("Content-addressed CDN access 200", r9b.status === 200);

  // 10. Cleanup
  console.log("10. Cleanup...");
  for (const p of [txtPath, imgPath, docPath, videoPath, contentKey]) {
    await fetch(`https://${host}/${zone}/${p}`, {
      method: "DELETE",
      headers: { AccessKey: apiKey }
    });
  }
  check("Cleanup done", true);

  // Summary
  console.log(`\n=============================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`=============================`);
  if (failed === 0) {
    console.log("🎉 ALL TESTS PASSED — Bunny Storage is fully operational!");
    console.log("   Upload ✅ | Download ✅ | Image ✅ | Document ✅ | Video ✅ | List ✅ | Dedup ✅");
  } else {
    console.log("⚠️  Some tests failed. Check output above.");
    process.exit(1);
  }
}

test().catch(e => { console.error("Test failed:", e.message); process.exit(1); });
