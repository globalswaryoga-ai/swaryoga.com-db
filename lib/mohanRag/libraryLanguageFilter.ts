export type LibraryLanguageFilter = 'all' | string;

type LanguageSource = {
  language?: string | null;
};

type ModuleSource = LanguageSource & {
  moduleId: string;
};

export function filterKnowledgeSourcesByLanguage<T extends LanguageSource>(
  sources: T[],
  language: string,
): T[] {
  if (!language || language === 'all') return sources;
  const target = language.trim().toLowerCase();
  return sources.filter(source => {
    const sLang = source.language?.trim().toLowerCase();
    return sLang === target;
  });
}

export function countKnowledgeSourcesByModule(
  sources: ModuleSource[],
  moduleId: string,
  language: string,
): number {
  return filterKnowledgeSourcesByLanguage(sources, language)
    .filter(source => source.moduleId === moduleId)
    .length;
}
