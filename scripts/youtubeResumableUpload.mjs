export async function ytUpload(access, srcUrl, size, title, desc, fetchImpl = fetch) {
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const init = await fetchImpl('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(size),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({ snippet: { title: title.slice(0, 99), description: desc, categoryId: '22' }, status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!init.ok) {
      lastError = `yt init ${init.status} ${await init.text()}`;
    } else {
      const loc = init.headers.get('location');
      if (!loc) lastError = 'no upload url';
      else {
        const src = await fetchImpl(srcUrl, { signal: AbortSignal.timeout(30 * 60 * 1000) });
        if (!src.ok) throw new Error('zoom dl ' + src.status);
        if (!src.body) throw new Error('zoom recording response has no video body');
        const put = await fetchImpl(loc, {
          method: 'PUT',
          headers: {
            'Content-Length': String(size),
            'Content-Range': `bytes 0-${size - 1}/${size}`,
            'Content-Type': 'video/mp4',
          },
          body: src.body,
          duplex: 'half',
          signal: AbortSignal.timeout(30 * 60 * 1000),
        });
        const responseText = await put.text();
        let j = {};
        try { j = responseText ? JSON.parse(responseText) : {}; } catch { j = {}; }
        if (put.ok && j.id) return j.id;
        lastError = `yt put ${put.status} ${responseText || JSON.stringify(j)}`;
      }
    }
    if (attempt < 3 && /\b(429|500|502|503|504)\b/.test(lastError)) {
      const delayMs = attempt * 15000;
      console.log(`YouTube transient upload error; retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/3)`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    break;
  }
  throw new Error(lastError || 'YouTube upload failed');
}
