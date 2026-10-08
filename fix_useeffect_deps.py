import os

langs = ['english', 'hindi', 'marathi', 'kannada']
base_dir = 'app/admin/crm/new-registration'

for lang in langs:
    path = os.path.join(base_dir, lang, 'page.tsx')
    with open(path, 'r') as f:
        content = f.read()

    # The useEffect looks like this:
    # }, [selectedWorkshop, googleFormUrl, formSource, isLoaded]);
    # It resets the form when selectedWorkshop.formId !== googleFormUrl.
    # We want it to ONLY run when selectedWorkshop changes (specifically its ID).
    # Because if we run it when googleFormUrl changes (like when the user types in the input), it will instantly wipe the user's input.
    
    # We will just remove this entire useEffect because it's completely flawed and destructive.
    # Wait, the point of the useEffect is to clear the leads table if you click on a workshop that doesn't have a linked form, so it doesn't show the previous workshop's leads.
    # That is handled by: `setSelectedWorkshop` updating, which causes a re-render.
    
    # Let's replace the dependency array to only run on selectedWorkshop.id
    content = content.replace("}, [selectedWorkshop, googleFormUrl, formSource, isLoaded]);", "}, [selectedWorkshop?.id, isLoaded]);")

    with open(path, 'w') as f:
        f.write(content)

print("done")
