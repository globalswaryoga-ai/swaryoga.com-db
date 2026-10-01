const fs = require('fs');
const filePath = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const anchor = "const [generatedDesignId, setGeneratedDesignId] = useState<string | null>(null);";

const stateCode = `
  const [metaPrompt, setMetaPrompt] = useState<string>('');
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [generatedAiText, setGeneratedAiText] = useState<any>(null);
  const [generatedAiImage, setGeneratedAiImage] = useState<string | null>(null);
  const [metaLanguagesList, setMetaLanguagesList] = useState<string[]>(['English', 'Marathi', 'Hindi']);
  const [metaLanguage, setMetaLanguage] = useState<string>('English');
  const [metaPlatformsList] = useState<string[]>(['FB', 'Insta', 'YouTube', '1:1', 'PDF']);
  const [metaPlatform, setMetaPlatform] = useState<string>('FB');
  const [metaTemplatesMap, setMetaTemplatesMap] = useState<Record<string, string>>({});
  const [savedMetaAds, setSavedMetaAds] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLangs = localStorage.getItem('meta_languages');
      if (storedLangs) setMetaLanguagesList(JSON.parse(storedLangs));
      
      const storedMap = localStorage.getItem('meta_templates_map');
      if (storedMap) setMetaTemplatesMap(JSON.parse(storedMap));
      
      const storedAds = localStorage.getItem('saved_meta_ads');
      if (storedAds) setSavedMetaAds(JSON.parse(storedAds));
    }
  }, []);

  const handleAddLanguage = () => {
    const lang = prompt('Enter new language name:');
    if (lang && lang.trim()) {
      const newLangs = [...metaLanguagesList, lang.trim()];
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
    }
  };

  const handleDeleteLanguage = (lang: string) => {
    if (confirm(\`Are you sure you want to delete \${lang}?\`)) {
      const newLangs = metaLanguagesList.filter(l => l !== lang);
      setMetaLanguagesList(newLangs);
      if (typeof window !== 'undefined') localStorage.setItem('meta_languages', JSON.stringify(newLangs));
      if (metaLanguage === lang) setMetaLanguage(newLangs[0] || '');
    }
  };

  const handleUpdateTemplate = (val: string) => {
    const newMap = { ...metaTemplatesMap, [metaPlatform]: val };
    setMetaTemplatesMap(newMap);
    if (typeof window !== 'undefined') localStorage.setItem('meta_templates_map', JSON.stringify(newMap));
  };
  
  const handleGenerateMetaAI = async () => {
    if (!metaPrompt.trim()) {
      alert('Please enter a description for the ad');
      return;
    }
    
    setIsGeneratingMeta(true);
    setGeneratedAiText(null);
    setGeneratedAiImage(null);
    setGeneratedDesignId(null);
    
    try {
      const targetTemplateId = metaTemplatesMap[metaPlatform];
      if (!targetTemplateId) {
        alert(\`Please enter a Canva Template ID for \${metaPlatform}\`);
        setIsGeneratingMeta(false);
        return;
      }
      const fullPrompt = \`Target Language: \${metaLanguage}\\nPlatform: \${metaPlatform}\\n\\n\${metaPrompt}\`;
      const res = await fetch('/api/admin/canva/meta-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, templateId: targetTemplateId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate content');
      
      setGeneratedAiText(data.content);
      
      if (data.canvaDesignId) {
          setGeneratedDesignId(data.canvaDesignId);
          // Auto-save the generated ad
          const newAd = {
            id: Date.now().toString(),
            prompt: metaPrompt,
            language: metaLanguage,
            platform: metaPlatform,
            text: data.content,
            imageUrl: data.imageUrl,
            designId: data.canvaDesignId,
            createdAt: new Date().toISOString()
          };
          const updatedAds = [newAd, ...savedMetaAds];
          setSavedMetaAds(updatedAds);
          if (typeof window !== 'undefined') localStorage.setItem('saved_meta_ads', JSON.stringify(updatedAds));
      }
      
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGeneratingMeta(false);
    }
  };
`;

content = content.replace(anchor, anchor + "\n" + stateCode);
fs.writeFileSync(filePath, content);
console.log("State and handlers added!");
