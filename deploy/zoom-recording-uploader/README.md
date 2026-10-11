# Zoom recording uploader schedule

The uploader must run on the bridge/worker server, not on Vercel, because it streams large Zoom files to YouTube and Bunny Storage.

## Daily schedule

The supplied `zoom-recording-uploader.cron` runs every three hours in IST.
An exclusive `flock` prevents overlapping cron uploads on the same worker host.

Each run looks back 30 days by default, follows all Zoom result pages, waits at least 10 minutes after the meeting ends, and retries recordings that Zoom still reports as processing. Both Speaker and Gallery must be ready. YouTube receives both views; Bunny Storage receives Speaker MP4 and MP3 audio. Historical Bunny Gallery links remain untouched.

## Install

1. Copy this repository to `/opt/swaryoga.com-db` on the worker server, or change the path in the cron file.
2. Ensure `.env.zoom-uploader` is present in the repository root with Zoom, Google, encryption, `BUNNY_DATABASE_URL`, `BUNNY_DATABASE_AUTH_TOKEN`, and Bunny Storage variables. No live MongoDB connection is used.
3. Ensure `/usr/bin/node` matches the Node installation on the worker server; update the cron path if necessary.
4. Install `ffmpeg` with MP3 encoding support and `flock` on the Linux worker. Set `FFMPEG_PATH` if needed. Allow local disk space for one recording during audio conversion; temporary files are removed after success or failure.
5. Merge the supplied entry into the worker's existing crontab; do not overwrite unrelated jobs:

```sh
crontab -e
```

The cron job logs to `/var/log/swaryoga-zoom-recording-uploader.log`.

## Zoom cleanup rule

The uploader moves a meeting's Zoom cloud recording to Zoom Trash only after YouTube Speaker/Gallery, Bunny Speaker/MP3, and durable workshop URL writes all succeed. Each successful destination is saved immediately and reused on retry. Failed SQL writes block cleanup. Zoom Trash remains recoverable according to Zoom's retention policy; permanent deletion is not used.

Only mapped workshop meeting IDs are processed. YouTube quota/OAuth restrictions and absent views are logged explicitly; they cannot be fixed by blindly retrying. Website deployment does not install this external worker or its cron: update and verify the worker host separately before certifying automatic uploads.

Mapping must identify exactly one cohort whose scheduled class dates include the recording date. Ambiguous mappings and a different Zoom UUID already occupying the same class date require manual reconciliation; the worker leaves those recordings untouched. Per-meeting failures do not stop later meetings from being attempted.

The website's recording-link sync and delivery worker never delete Zoom recordings. Only the external uploader owns cleanup after the four required destinations are saved.
