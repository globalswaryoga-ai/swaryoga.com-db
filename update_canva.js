const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// 1. Update languages
code = code.replace(
  "const [metaLanguagesList, setMetaLanguagesList] = useState<string[]>(['English', 'Marathi', 'Hindi']);",
  "const [metaLanguagesList, setMetaLanguagesList] = useState<string[]>(['English', 'Hindi', 'Marathi', 'Kannada']);"
);

// 2. Add handleEditLanguage
const addLangBlock = `  const handleAddLanguage = () => {`;
const editLangBlock = `  const handleEditLanguage = (oldLang: string) => {
    const newLang = prompt('Enter new language name:', oldLang);
    if (newLang && newLang.trim() && newLang.trim() !== oldLang) {
      const newLangs = metaLanguagesList.map(l => l === oldLang ? newLang.trim() : l);
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
      if (metaLanguage === oldLang) setMetaLanguage(newLang.trim());
    }
  };

  const handleAddLanguage = () => {`;
code = code.replace(addLangBlock, editLangBlock);

fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
