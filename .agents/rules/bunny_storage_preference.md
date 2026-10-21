---
description: Instructs the agent to always use Bunny Storage instead of MongoDB for CRM data.
---

# Bunny Storage Priority

When working on the CRM system, Leads, Workshop Batches, or Data storage in this workspace (`swaryoga.com-db`), **ALWAYS prioritize using Bunny Storage** instead of MongoDB.

- All CRM batch data, leads, forms, and workshop configurations are saved as JSON files in **Bunny Storage** (`lib/workshopBunnyRepository.ts` or similar repository patterns).
- Do not assume MongoDB is the primary database for these specific features.
- If the user asks about data persistence, syncing, or saving for CRM features, remind yourself that it is connecting directly to the live Bunny edge storage, meaning local changes instantly reflect in the cloud database.
