# WA Bridge — zero-drift deployment (GitHub source-of-truth)

This is the **non-manual** workflow:

- Your Mac is where you make changes.
- GitHub (`globalswaryoga-ai/swaryoga.com-db`) is the source of truth.
- Your EC2 server never gets hand-edited code.
- EC2 only ever runs: **pull → rebuild → restart**.

## One-time setup on EC2 (manual once)

1) Clone repo (or keep existing clone):
- `REPO_DIR=/home/ubuntu/swaryoga/swaryoga.com-db`

2) Ensure your compose file points **build.context** to the repo copy:
- `context: /home/ubuntu/swaryoga/swaryoga.com-db/services/whatsapp-web`

3) Put `docker-compose.yml` in:
- `COMPOSE_DIR=/home/ubuntu/wa-bridge`

After that, you never edit code on EC2.

## Normal deploy (every time you push to GitHub)

On EC2:

```bash
cd /home/ubuntu/swaryoga/swaryoga.com-db
git status --porcelain=v1
# must be empty

cd /home/ubuntu/wa-bridge
bash /home/ubuntu/swaryoga/swaryoga.com-db/deploy/wa-bridge/deploy.sh \
  /home/ubuntu/swaryoga/swaryoga.com-db \
  /home/ubuntu/wa-bridge

bash /home/ubuntu/swaryoga/swaryoga.com-db/deploy/wa-bridge/verify.sh \
  /home/ubuntu/wa-bridge \
  wa-bridge
```

That’s it.

## Why this fixes the “manual work” feeling

Before, we were troubleshooting *drift* (EC2 was building old paths). The fix is:

- **No SSH edits** to `/app/qrServer.js` or random server folders.
- **No copying files**.
- You only run a single deploy script on EC2.

The only time you “touch” EC2 is to execute the deploy script (which is unavoidable: something has to start/restart containers).
