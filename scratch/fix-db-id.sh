#!/bin/bash
FILES=(
  "app/api/admin/crm/storage-usage/route.ts"
  "app/api/admin/social-media/accounts/[id]/route.ts"
  "app/api/admin/social-media/accounts/route.ts"
  "app/api/admin/social-media/analytics/sync/route.ts"
  "app/api/admin/social-media/posts/[id]/publish/route.ts"
  "app/api/admin/social-media/posts/route.ts"
  "lib/socialMediaConnect.ts"
)

for file in "${FILES[@]}"; do
  sed -i '' -e "s/SELECT id, document_json/SELECT document_id as id, document_json/g" "$file"
  sed -i '' -e "s/count(id)/count(document_id)/g" "$file"
  sed -i '' -e "s/WHERE id = ?/WHERE document_id = ?/g" "$file"
  sed -i '' -e "s/INSERT INTO mongo_documents (id,/INSERT INTO mongo_documents (document_id,/g" "$file"
done
