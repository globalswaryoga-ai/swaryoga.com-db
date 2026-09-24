# Zoom recording uploader schedule

The uploader must run on the bridge/worker server, not on Vercel, because it streams large Zoom files to YouTube and Bunny Storage.

## Daily schedule

The supplied `zoom-recording-uploader.cron` runs at:

- 2:00 AM IST
- 11:00 AM IST
- 2:00 PM IST
- 10:00 PM IST

Each run looks back two days by default, waits at least 10 minutes after the meeting, and retries recordings that Zoom still reports as processing.

## Install

1. Copy this repository to `/opt/swaryoga.com-db` on the worker server, or change the path in the cron file.
2. Ensure `.env.zoom-uploader` is present in the repository root with the Zoom, Google, MongoDB, encryption, and Bunny variables.
3. Ensure `/usr/bin/node` matches the Node installation on the worker server; update the cron path if necessary.
4. Install the cron entry from the repository root:

```sh
crontab deploy/zoom-recording-uploader/zoom-recording-uploader.cron
```

The cron job logs to `/var/log/swaryoga-zoom-recording-uploader.log`.

## Zoom cleanup rule

The uploader moves a meeting's Zoom cloud recording to Zoom Trash only after every selected Speaker/Gallery view has successfully been uploaded to both YouTube and Bunny Storage. If either destination fails, the recording remains in Zoom and is retried on the next run. Zoom Trash remains recoverable according to Zoom's retention policy.
