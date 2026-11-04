export type LibraryLanguageFilter = 'all' | 'mr' | 'hi' | 'en';

type LanguageSource = {
  language?: string | null;
};

type ModuleSource = LanguageSource & {
  moduleId: string;
};

export function filterKnowledgeSourcesByLanguage<T extends LanguageSource>(
  sources: T[],
  language: LibraryLanguageFilter,
): T[] {
  if (language === 'all') return sources;
  return sources.filter(source => source.language?.trim().toLowerCase() === language);
}

export function countKnowledgeSourcesByModule(
  sources: ModuleSource[],
  moduleId: string,
  language: LibraryLanguageFilter,
): number {
  return filterKnowledgeSourcesByLanguage(sources, language)
    .filter(source => source.moduleId === moduleId)
    .length;
}
