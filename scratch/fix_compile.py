import re

with open('app/admin/crm/new-registration/page.tsx', 'r') as f:
    content = f.read()

# Fix isRejected and isRegistered usage in the buttons. They are defined inside the map function.
# Wait, I see error on 2271 and 2311 for `isRejected` and 2324 for `isRegistered`. 
# It seems my replacement from earlier might have changed their scope, or they were already out of scope?
# Let's inspect the code around 2271 to see the scope.
