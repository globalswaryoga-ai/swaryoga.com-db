import {
  countKnowledgeSourcesByModule,
  filterKnowledgeSourcesByLanguage,
} from '@/lib/mohanRag/libraryLanguageFilter';

const sources = [
  { id: 'english', moduleId: 'level1', language: 'en' },
  { id: 'marathi', moduleId: 'level1', language: 'mr' },
  { id: 'hindi', moduleId: 'level1', language: 'hi' },
  { id: 'unclassified', moduleId: 'level1', language: 'auto' },
  { id: 'other-module', moduleId: 'why', language: 'en' },
];

describe('Mohan RAG library language filter', () => {
  it('only shows sources with the selected language', () => {
    expect(filterKnowledgeSourcesByLanguage(sources, 'en').map(source => source.id))
      .toEqual(['english', 'other-module']);
    expect(filterKnowledgeSourcesByLanguage(sources, 'mr').map(source => source.id))
      .toEqual(['marathi']);
  });

  it('updates module overview counts for the selected language', () => {
    expect(countKnowledgeSourcesByModule(sources, 'level1', 'en')).toBe(1);
    expect(countKnowledgeSourcesByModule(sources, 'level1', 'hi')).toBe(1);
    expect(countKnowledgeSourcesByModule(sources, 'level1', 'all')).toBe(4);
  });

  it('does not include unclassified sources in a specific-language filter', () => {
    expect(filterKnowledgeSourcesByLanguage(sources, 'en'))
      .not.toContainEqual(expect.objectContaining({ id: 'unclassified' }));
  });
});
