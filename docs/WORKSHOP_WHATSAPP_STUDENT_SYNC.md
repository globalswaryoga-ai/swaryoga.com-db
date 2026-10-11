# Workshop WhatsApp student sync

Workshop Management uses the saved group link and the **workshop owner's isolated
QR WhatsApp session**. Add Students > WhatsApp Group > Sync runs immediately.
Auto-Sync stores its On/Off choice in Bunny and runs every 15 minutes through
`/api/cron/workshop-whatsapp-students`, including while the browser is closed.
Production requires a configured `CRON_SECRET` and a connected owner QR session.

The bridge does not expose `/groups`. Discovery uses `/chats`, checks actual
`/group-invite/:jid` codes and caches only the verified link+group JID. Invitation
code discovery requires the owner to be a group admin. Alternatively save the
exact `123...@g.us` group JID. Discovery is bounded to 60 candidate groups and
90 seconds; failure is visible and retried, never treated as a successful import.

Resolved WhatsApp phone numbers are normalized and matched against accessible
permanent CRM leads, including alternate contact phones. Missing student name,
email, city, state and country are filled from that lead, preserving existing
populated fields, metadata and manually removed enrollments. Students without a
CRM match remain phone-only until a later sync can enrich them. Unresolved LIDs
are counted explicitly and are never fabricated into phone numbers.

New enrollments use deterministic cohort+phone IDs, batched insert-if-absent writes
and canonical phone JIDs. Existing student updates use version checks; concurrent
manual edits produce a retry error rather than being overwritten. No CRM leads,
attendance, group members or WhatsApp messages are deleted or sent by this worker.

The latest automatic sync error is shown in the WhatsApp Group tab. Source group
membership is additive: leaving a group does not automatically delete enrollment.
