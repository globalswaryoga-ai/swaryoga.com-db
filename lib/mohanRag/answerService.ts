import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';
import { generateAIText } from '@/lib/ai/generateWithFallback';
import { isMohanRagModule, searchApprovedKnowledge, type MohanRagModule } from './knowledgeRepository';
import { EMOTION_LIBRARY, FACIAL_EXPRESSION_LIBRARY } from '@/lib/avatarEmotionParser';
import { 
  MARATHI_DAYS_DATA, 
  HINDI_MASTER_OVERVIEW, 
  ENGLISH_MASTER_OVERVIEW, 
  getLibraryCorpusText 
} from './masterLibraryCorpus';

export interface GroundedAnswer {
  sufficientContext: boolean;
  answer: string;
  citations: Array<{
    sourceId: string;
    title: string;
    moduleId: string;
    topic: string;
    sourceReference: string;
    chunkIndex: number;
  }>;
}

function modulesForAccess(moduleId: MohanRagModule): MohanRagModule[] {
  if (moduleId === 'level2') return ['level1', 'level2', 'aahar_shastra', 'general', 'why'];
  if (moduleId === 'level3') return ['level1', 'level2', 'level3', 'meditation_sadhana', 'aahar_shastra', 'general', 'why'];
  if (moduleId === 'aahar_shastra') return ['aahar_shastra', 'level1', 'general', 'weight_loss'];
  if (moduleId === 'weight_loss') return ['weight_loss', 'aahar_shastra', 'level1', 'general'];
  if (moduleId === 'children') return ['children', 'level1', 'general'];
  if (moduleId === 'youth') return ['youth', 'level1', 'general'];
  if (moduleId === 'garbh_sanskar') return ['garbh_sanskar', 'level1', 'general'];
  if (moduleId === 'meditation_sadhana') return ['meditation_sadhana', 'level1', 'level2', 'level3', 'general'];
  if (moduleId === 'research') return ['research', 'level1', 'level2', 'level3', 'aahar_shastra', 'general'];
  if (moduleId === 'general') return ['general', 'level1', 'level2', 'level3', 'aahar_shastra', 'why'];
  return ['level1', 'aahar_shastra', 'general', 'why'];
}

function expandSwarYogaQuery(query: string): string {
  const lower = query.toLowerCase();
  const terms: string[] = [];
  if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('food') || lower.includes('eat') || lower.includes('meal')) {
    terms.push('भोजन', 'जेवण', 'आहार', 'bhojan');
  }
  if (lower.includes('surya') || lower.includes('sun') || lower.includes('right')) {
    terms.push('सूर्य', 'उजवी', 'पिंगळा', 'पिंगला', 'pingala');
  }
  if (lower.includes('chandra') || lower.includes('moon') || lower.includes('left') || lower.includes('ida')) {
    terms.push('चंद्र', 'डावी', 'इडा', 'ida');
  }
  if (lower.includes('water') || lower.includes('drink') || lower.includes('therap')) {
    terms.push('पाणी', 'जल', 'pani', 'चिकित्सा');
  }
  if (lower.includes('gas') || lower.includes('sleep') || lower.includes('acidity') || lower.includes('digestion')) {
    terms.push('गॅस', 'झोप', 'पचन', 'जठराग्नी', 'jatharagni');
  }
  if (lower.includes('chakra') || lower.includes('om') || lower.includes('pranayama')) {
    terms.push('चक्र', 'प्राणायाम', 'ॐ');
  }
  if (lower.includes('potential') || lower.includes('history') || lower.includes('past')) {
    terms.push('क्षमता', 'इतिहास', 'potential', 'history');
  }
  if (lower.includes('mind') || lower.includes('letter') || lower.includes('dear mind')) {
    terms.push('मन', 'पत्र', 'my dear mind');
  }
  if (lower.includes('prakriti') || lower.includes('purush') || lower.includes('purusha')) {
    terms.push('प्रकृती', 'पुरुष', 'सांख्य');
  }
  if (lower.includes('guru') || lower.includes('ashtakam') || lower.includes('tatva')) {
    terms.push('गुरू', 'गुर्वष्टकम्', 'गुरुतत्व');
  }
  if (lower.includes('bhaj') || lower.includes('govindam')) {
    terms.push('भज', 'गोविंदम्', 'bhaja govindam');
  }
  if (lower.includes('shivoham') || lower.includes('shiva') || lower.includes('final class')) {
    terms.push('शिवोऽहम्', 'शिवोहम्', 'shivoham');
  }
  if (lower.includes('truth') || lower.includes('satya') || lower.includes('santosh') || lower.includes('daya') || lower.includes('kshama') || lower.includes('aarjav')) {
    terms.push('सत्य', 'संतोष', 'दया', 'क्षमा', 'आर्जव', 'समर्पण');
  }
  return `${query} ${terms.join(' ')}`.trim();
}

/**
 * Intelligent Multi-Day Curriculum Resolver
 * Finds every lecture day / curriculum section where Mohan Sir taught on the subject,
 * synthesizes all knowledge into a complete masterclass, and provides explicit origin attribution.
 */
function resolveCurriculumForTopic(query: string, language: string, moduleId: MohanRagModule) {
  const lower = query.toLowerCase();
  const excerpts: string[] = [];
  const citations: Array<{
    sourceId: string;
    title: string;
    moduleId: string;
    topic: string;
    sourceReference: string;
    chunkIndex: number;
  }> = [];
  const originLabels: string[] = [];

  // 1. WATER THERAPY & HYDRATION (Day 1 + Day 2)
  if (
    lower.includes('water') ||
    lower.includes('pani') ||
    lower.includes('जल') ||
    lower.includes('पाणी') ||
    lower.includes('therap') ||
    lower.includes('घोट') ||
    lower.includes('घूँट') ||
    lower.includes('drink') ||
    lower.includes('sip')
  ) {
    excerpts.push(`--- SYLLABUS DAY 1: MEAL & WATER RULES ---\n${MARATHI_DAYS_DATA.day1_bhojan}`);
    excerpts.push(`--- SYLLABUS DAY 2: WATER THERAPY, GAS & SLEEP ---\n${MARATHI_DAYS_DATA.day2_pani_gas}`);
    citations.push({
      sourceId: 'master-library-day1',
      title: 'Level 1 - Day 1: भोजन व पाणी नियम (Bhojan & Water Rules)',
      moduleId: 'level1',
      topic: 'Day 1: Bhojan & Water Rules (Surya Nadi & Chandra Nadi)',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 1)',
      chunkIndex: 0,
    });
    citations.push({
      sourceId: 'master-library-day2',
      title: 'Level 1 - Day 2: पाणी चिकित्सा, गॅस व झोप (Water Therapy Mastery)',
      moduleId: 'level1',
      topic: 'Day 2: Water Therapy, Gas & Sleep Cycles',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 2)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 1 (भोजन आणि पाणी नियम / Meal & Water Rules) and Day 2 (पाणी चिकित्सा, गॅस आणि झोप / Water Therapy, Gas & Sleep)');
  }

  // 2. FOOD, DIGESTION & AAHAR (Day 1 + Days 6 to 9)
  if (
    lower.includes('food') ||
    lower.includes('bhojan') ||
    lower.includes('meal') ||
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('aahar') ||
    lower.includes('आहार') ||
    lower.includes('भोजन') ||
    lower.includes('जेवण') ||
    lower.includes('pachan') ||
    lower.includes('jatharagni') ||
    lower.includes('जठराग्नी')
  ) {
    if (!excerpts.some(e => e.includes('DAY 1'))) excerpts.push(`--- SYLLABUS DAY 1: MEAL RULES ---\n${MARATHI_DAYS_DATA.day1_bhojan}`);
    excerpts.push(`--- SYLLABUS DAY 6: DIGESTION & 5 ELEMENTS ---\n${MARATHI_DAYS_DATA.day6_food1}`);
    excerpts.push(`--- SYLLABUS DAY 7-9: TAMAS, RAJAS & SATVIK AAHAR ---\n${MARATHI_DAYS_DATA.day7_tamas_rajas}\n${MARATHI_DAYS_DATA.day8_rajas_satvik}\n${MARATHI_DAYS_DATA.day9_satvik_tatva}`);
    citations.push({
      sourceId: 'master-library-food',
      title: 'Level 1 - Days 1 & 6–9: आहार शास्त्र, पंचतत्व आणि त्रिदोष पचनक्रिया',
      moduleId: 'level1',
      topic: 'Food, Digestion, Panch Tatva & Jatharagni',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Days 1, 6-9)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 1 (भोजन व नाडी नियम) and Days 6–9 (आहार शास्त्र, पंचतत्व आणि त्रिदोष पचनक्रिया)');
  }

  // 3. GAS, ACIDITY, INDIGESTION & SLEEP (Day 1 + Day 2)
  if (
    lower.includes('gas') ||
    lower.includes('acidity') ||
    lower.includes('गॅस') ||
    lower.includes('पित्त') ||
    lower.includes('acid') ||
    lower.includes('sleep') ||
    lower.includes('nidra') ||
    lower.includes('zhop') ||
    lower.includes('झोप') ||
    lower.includes('vamakukshi') ||
    lower.includes('कुशी')
  ) {
    if (!excerpts.some(e => e.includes('DAY 2'))) {
      excerpts.push(`--- SYLLABUS DAY 2: GAS & SLEEP ---\n${MARATHI_DAYS_DATA.day2_pani_gas}`);
      citations.push({
        sourceId: 'master-library-day2-gas',
        title: 'Level 1 - Day 2: गॅस निवारण, वामकुक्षी व झोपेचे नियम',
        moduleId: 'level1',
        topic: 'Gas Elimination, Left-Side Sleep (Vamakukshi) & Nocturnal Digestion',
        sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 2)',
        chunkIndex: 0,
      });
      originLabels.push('Swar Yoga Level-1: Day 2 (गॅस निवारण, वामकुक्षी डावी कूस व निद्रा विज्ञान)');
    }
  }

  // 4. OMKAR PRANAYAMA & CHAKRAS (Day 3)
  if (lower.includes('om') || lower.includes('omkar') || lower.includes('pranayama') || lower.includes('chakra') || lower.includes('चक्र') || lower.includes('प्राणायाम')) {
    excerpts.push(`--- SYLLABUS DAY 3: OMKAR & CHAKRAS ---\n${MARATHI_DAYS_DATA.day3_om_chakra}`);
    citations.push({
      sourceId: 'master-library-day3',
      title: 'Level 1 - Day 3: ॐ प्राणायाम आणि चक्र जागरण',
      moduleId: 'level1',
      topic: 'Om Pranayama, Sound Vibrations & 7 Chakras Balance',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 3)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 3 (ॐ प्राणायाम आणि चक्र जागरण)');
  }

  // 5. MEDITATION, SUSHUMNA & SANDHIKAAL (Day 4 + Day 10)
  if (lower.includes('meditation') || lower.includes('dhyan') || lower.includes('dhyana') || lower.includes('sushumna') || lower.includes('सुषुम्ना') || lower.includes('ध्यान') || lower.includes('sandhi') || lower.includes('संधिकाल')) {
    excerpts.push(`--- SYLLABUS DAY 4 & 10: MEDITATION & SUSHUMNA ---\n${MARATHI_DAYS_DATA.day4_meditation}\n${MARATHI_DAYS_DATA.day10_sushumna}`);
    citations.push({
      sourceId: 'master-library-day4-10',
      title: 'Level 1 - Day 4 & 10: ध्यान, सुषुम्ना नाडी व संधिकाल',
      moduleId: 'level1',
      topic: 'Meditation, Sushumna Flow & Sandhikaal Transition',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Days 4 & 10)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 4 (ध्यान व सुषुम्ना नाडी) आणि Day 10 (संधिकाल संधिकाल प्रतीक्षा)');
  }

  // 6. AJAPA-JAP SO-HUM (Day 5)
  if (lower.includes('ajapa') || lower.includes('so-hum') || lower.includes('so-ham') || lower.includes('sohum') || lower.includes('21600') || lower.includes('२१६००')) {
    excerpts.push(`--- SYLLABUS DAY 5: AJAPA-JAP ---\n${MARATHI_DAYS_DATA.day5_ajapa}`);
    citations.push({
      sourceId: 'master-library-day5',
      title: 'Level 1 - Day 5: अजपा-जप सो-हं साधना (21,600 Breaths)',
      moduleId: 'level1',
      topic: 'Ajapa-Jap So-Hum Inherent Mantra',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 5)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 5 (अजपा-जप सो-हं साधना व २१,६०० श्वास विज्ञान)');
  }

  // 7. PREVENTIVE SCIENCE & ORGAN HEALTH (Days 11 & 12)
  if (lower.includes('prevent') || lower.includes('organ') || lower.includes('teeth') || lower.includes('eye') || lower.includes('liver') || lower.includes('kidney') || lower.includes('अवयव') || lower.includes('डोळे') || lower.includes('दात')) {
    excerpts.push(`--- SYLLABUS DAYS 11-12: PREVENTIVE ORGAN HEALTH ---\n${MARATHI_DAYS_DATA.day11_prev1}\n${MARATHI_DAYS_DATA.day12_prev2}`);
    citations.push({
      sourceId: 'master-library-day11-12',
      title: 'Level 1 - Days 11 & 12: प्रतिबंधक विज्ञान - अवयव आरोग्य',
      moduleId: 'level1',
      topic: 'Preventive Organ Health (Eyes, Teeth, Liver, Kidneys, Heart)',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Days 11 & 12)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 11 आणि Day 12 (प्रतिबंधक विज्ञान - मानवी अवयव आरोग्य)');
  }

  // 8. MORNING SADHANA & EARTH TOUCH (Day 13)
  if (lower.includes('morning') || lower.includes('bhumi') || lower.includes('earth') || lower.includes('sparsh') || lower.includes('भूमी') || lower.includes('सकाळ') || lower.includes('tithi') || lower.includes('तिथी')) {
    excerpts.push(`--- SYLLABUS DAY 13: MORNING EARTH TOUCH & SADHANA ---\n${MARATHI_DAYS_DATA.day13_sadhana}`);
    citations.push({
      sourceId: 'master-library-day13',
      title: 'Level 1 - Day 13: प्रातःकालीन स्वर साधना व भूमी स्पर्श',
      moduleId: 'level1',
      topic: 'Morning Awakening, Swar Observation & Earth Touch (Bhumi Sparsh)',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 13)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 13 (प्रातःकालीन स्वर साधना, भूमी स्पर्श व दैनंदिन दिनचर्या)');
  }

  // 9. NADI SWITCHING - 5 METHODS (Days 14 & 15)
  if (lower.includes('switch') || lower.includes('change swar') || lower.includes('change breath') || lower.includes('स्वर बदलणे') || lower.includes('नाडी बदलणे') || lower.includes('badal')) {
    excerpts.push(`--- SYLLABUS DAYS 14-15: NADI SWITCHING TECHNIQUES ---\n${MARATHI_DAYS_DATA.day14_nadi_work}\n${MARATHI_DAYS_DATA.day15_nadi_change}`);
    citations.push({
      sourceId: 'master-library-day14-15',
      title: 'Level 1 - Days 14 & 15: नाडी कार्यप्रणाली व स्वर बदलण्याच्या ५ पद्धती',
      moduleId: 'level1',
      topic: 'Nadi Mechanics & 5 Practical Techniques to Switch Swara',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Days 14 & 15)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 14 आणि Day 15 (नाडी कार्यप्रणाली व इच्छेनुसार स्वर बदलण्याच्या ५ पद्धती)');
  }

  // 10. OVERCOMING HATRED & CHITTA SHUDDHI (Day 16)
  if (lower.includes('hatred') || lower.includes('forgiveness') || lower.includes('dwesh') || lower.includes('kshama') || lower.includes('द्वेष') || lower.includes('राग') || lower.includes('चित्तशुद्धी')) {
    excerpts.push(`--- SYLLABUS DAY 16: FREEDOM FROM HATRED & FORGIVENESS ---\n${MARATHI_DAYS_DATA.day16_dwesh}`);
    citations.push({
      sourceId: 'master-library-day16',
      title: 'Level 1 - Day 16: द्वेष मुक्ती, क्षमा व चित्तशुद्धी',
      moduleId: 'level1',
      topic: 'Freedom from Hatred, Forgiveness & Mental Purity',
      sourceReference: 'Approved Swar Yoga 16-Day Master Teaching Syllabus (Day 16)',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-1: Day 16 (द्वेष मुक्ती, क्षमा भाव व चित्तशुद्धी)');
  }

  // 11. LEVEL 2 TOPICS (Aham Brahmasmi)
  if (
    lower.includes('samyama') ||
    lower.includes('ripu') ||
    lower.includes('षड्रिपू') ||
    lower.includes('samruddhi') ||
    lower.includes('prosperity') ||
    lower.includes('photographer') ||
    lower.includes('creator') ||
    lower.includes('dwandwa') ||
    lower.includes('duality') ||
    lower.includes('uttejana') ||
    moduleId === 'level2'
  ) {
    originLabels.push('Swar Yoga Level-2: अहम् ब्रह्मास्मि (Aham Brahmasmi Master Syllabus)');
  }

  // 12. LEVEL 3 TOPICS (Ashtavakra Dhyan)
  if (
    lower.includes('potential') ||
    lower.includes('history') ||
    lower.includes('my dear mind') ||
    lower.includes('self letter') ||
    lower.includes('mind letter') ||
    lower.includes('पत्र') ||
    lower.includes('prakriti') ||
    lower.includes('purush') ||
    lower.includes('प्रकृती') ||
    lower.includes('पुरुष') ||
    lower.includes('guru ashtakam') ||
    lower.includes('guru tatva') ||
    lower.includes('गुर्वष्टक') ||
    lower.includes('गुरु अष्टक') ||
    lower.includes('bhaja govindam') ||
    lower.includes('govindam') ||
    lower.includes('भज गोविंद') ||
    lower.includes('shivoham') ||
    lower.includes('शिवोऽहम्') ||
    lower.includes('5 truth') ||
    lower.includes('five truth') ||
    lower.includes('५ सत्य') ||
    lower.includes('satya') ||
    lower.includes('santosh') ||
    lower.includes('daya') ||
    lower.includes('kshama') ||
    lower.includes('aarjav') ||
    lower.includes('आर्जव') ||
    lower.includes('ashtavakra') ||
    moduleId === 'level3'
  ) {
    excerpts.push(`--- SYLLABUS LEVEL-3: ASHTAVAKRA DHYAN ADVANCED CURRICULUM ---
1. History vs. Potential (इतिहास विरुद्ध आंतरिक क्षमता):
Mohan Sir asserts: Your past history (traumas, medical labels, conditioned mental limits) is merely a memory record. Your potential (आंतरिक दिव्य क्षमता) is infinite, living in the present breath. When breath is balanced in Sushumna, historical conditioning dissolves.

2. Self-Letter: "My Dear Mind" (माझ्या मनास पत्र - आत्म-संवाद):
A sacred dialogue of the silent observer (साक्षी आत्मा) speaking affectionately to the mind (मन). Teaching the mind not to fight thoughts or external turbulence, but to surrender and rest in breath awareness.

3. Prakriti & Purusha (प्रकृती आणि पुरुष - सांख्य दर्शन):
Prakriti is the 24 elemental cosmic dance of matter, thoughts, emotions, and bodily sensations. Purusha is the unmoving, pure, immortal conscious witness. The yogi abides as Purusha while honoring Prakriti.

4. Guru Ashtakam & Gurutatva (गुर्वष्टकम् - आदि शंकराचार्य):
"शरीरं सुरूपं तथा वा कलत्रं... मनश्चेन्न लग्नं गुरोरङ्घ्रिपद्मे ततः किं ततः किं ततः किं ततः किम्।"
All physical health, worldly knowledge, wealth, and status are meaningless if the heart has not bowed in reverence to the Guru Tatva.

5. Bhaja Govindam (भज गोविंदम्):
The profound message of dispassion (वैराग्य) and shedding delusions. Time is fleeting; seeking the eternal truth beyond worldly attachments.

6. The 5 Sacred Eternal Truths (५ परम सत्य):
- Satya (सत्य): Absolute truthfulness in thought, speech, and action.
- Santosha (संतोष): Deep inner contentment independent of external circumstances.
- Daya (दया): Boundless compassion for all living beings.
- Kshama (क्षमा): Total forgiveness that frees the heart from poison and grudges.
- Aarjava (आर्जव - नम्रता / श्रद्धा / समर्पण): Supreme humility, childlike simplicity, unshakable faith, and complete surrender.

7. Shivoham Shivoham (शिवोऽहम् शिवोऽहम् - The Grand Culmination / Final Class):
"चिदानन्दरूपः शिवोऽहम् शिवोऽहम्।"
I am not the physical body, I am not the intellect, I am not the five elements. I am pure bliss consciousness, one with Shiva.`);

    citations.push({
      sourceId: 'master-library-level3-core',
      title: 'Level 3: Ashtavakra Dhyan (अष्टावक्र ध्यान - History vs Potential, 5 Truths, Shivoham)',
      moduleId: 'level3',
      topic: 'Level 3 Advanced Masterclass (History vs Potential, Mind Letter, Guru Tatva, Shivoham)',
      sourceReference: 'Approved Swar Yoga Level-3 Ashtavakra Dhyan Master Teaching Curriculum',
      chunkIndex: 0,
    });
    originLabels.push('Swar Yoga Level-3: अष्टावक्र ध्यान (History vs Potential, Self-Letter, 5 Truths & Shivoham)');
  }

  // Fallback: If no specific day matched, provide the full overview
  if (excerpts.length === 0) {
    const langKey = (language || 'mr').toLowerCase();
    excerpts.push(getLibraryCorpusText(langKey, moduleId, 'all', 'all'));
    originLabels.push(`Swar Yoga Master Library Corpus (${moduleId.toUpperCase()})`);
  }

  const curriculumNote = originLabels.length > 0
    ? originLabels.join('; ')
    : 'Swar Yoga Approved Master Library Syllabus';

  return { excerpts, citations, curriculumNote };
}

let answerSchemaReady = false;

export async function generateGroundedMohanAnswer(input: { query: string; moduleId: MohanRagModule; language: string }): Promise<GroundedAnswer> {
  const expanded = expandSwarYogaQuery(input.query);
  let sources = await searchApprovedKnowledge({ moduleIds: modulesForAccess(input.moduleId), query: expanded, language: input.language, limit: 6 });
  if (!sources.length && input.language !== 'auto') {
    sources = await searchApprovedKnowledge({ moduleIds: modulesForAccess(input.moduleId), query: expanded, language: 'auto', limit: 6 });
  }

  // If no sources matched in target module, expand search across all modules
  if (!sources.length) {
    sources = await searchApprovedKnowledge({
      moduleIds: ['level1', 'level2', 'level3', 'aahar_shastra', 'general', 'why', 'research'],
      query: expanded,
      language: 'auto',
      limit: 8,
    });
  }

  const citations = sources.map(source => ({
    sourceId: source.sourceId,
    title: source.title,
    moduleId: source.moduleId,
    topic: source.topic,
    sourceReference: source.sourceReference,
    chunkIndex: source.chunkIndex,
  }));

  // Resolve all relevant curriculum days and synthesis notes
  const curriculum = resolveCurriculumForTopic(input.query, input.language, input.moduleId);
  for (const c of curriculum.citations) {
    if (!citations.some(existing => existing.sourceId === c.sourceId)) {
      citations.push(c);
    }
  }

  if (!sources.length && curriculum.excerpts.length === 0) {
    return { sufficientContext: false, answer: 'The approved knowledge base does not contain a matching source for this question.', citations: [] };
  }

  const cuePattern = /\[([a-z_]+):(\d{1,3})\]|\[face:([a-z_]+)\]/gi;
  const deliveryCues = new Set<string>();
  const dbContext = sources.map((source, index) => {
    let match: RegExpExecArray | null;
    cuePattern.lastIndex = 0;
    while ((match = cuePattern.exec(source.content)) !== null) {
      if (match[1] && EMOTION_LIBRARY[match[1].toLowerCase()]) deliveryCues.add(`[${match[1].toLowerCase()}:${match[2]}]`);
      if (match[3] && FACIAL_EXPRESSION_LIBRARY[match[3].toLowerCase()]) deliveryCues.add(`[face:${match[3].toLowerCase()}]`);
    }
    const sourceText = source.content.replace(cuePattern, '').replace(/\s+/g, ' ').trim();
    return `DATABASE SOURCE ${index + 1} [${source.moduleId}; ${source.title}; ${source.topic || 'topic not specified'}]\n${sourceText}`;
  }).join('\n\n');

  const context = `--- OFFICIAL SWAR YOGA MASTER CURRICULUM SCRIPTS ---\n${curriculum.excerpts.join('\n\n')}\n\n${dbContext}`;
  const supportedEmotionTags = Object.keys(EMOTION_LIBRARY).join(', ');
  const supportedFaceTags = Object.keys(FACIAL_EXPRESSION_LIBRARY).join(', ');
  const deliveryCueContext = deliveryCues.size
    ? `\n\nOptional source delivery hints (performance metadata, not factual content): ${Array.from(deliveryCues).slice(0, 16).join(' ')}`
    : '';

  const moduleRules: Record<MohanRagModule, string> = {
    why: 'This is the WHY module: explain motivation and awareness only. Do not teach HOW, techniques, exercises, or procedures.',
    level1: 'Use Level 1 knowledge. Do not reveal Level 2 or Level 3 material.',
    level2: 'Use Level 1 and Level 2 knowledge (Aham Brahmasmi, Samyama, 6 Ripu, Panch Tatva). Do not reveal Level 3 material.',
    level3: 'Use Level 1, Level 2, and Level 3 knowledge (Ashtavakra Dhyan, Shivoham Shivoham, Guru Ashtakam, Bhaja Govindam, 5 Truths).',
    weight_loss: 'Focus on Swar Yoga metabolic activation, Surya Nadi digestive fire (Jatharagni), and Panch Tatva eating schedule.',
    garbh_sanskar: 'Focus on prenatal Swar Yoga, maternal breath rhythm, fetal brain development, and peaceful Chandra Nadi state.',
    children: 'Focus on simple fun breath awareness, concentration, memory enhancement, and balanced brain hemispheres.',
    youth: 'Focus on youth energy balance, stress relief, study focus, emotional stability, and vitality.',
    meditation_sadhana: 'Focus on deep meditation sadhana: Navaratri Dhyan, 7 Chakras, 45-minute Samyama, and Dash Onkar Gayatri.',
    general: 'Clearly distinguish general education from Swar Yoga teachings. Do not diagnose or make unsupported medical claims.',
    research: 'Use only approved Research & Search Engine reports. Keep established scientific findings, traditional Swar Yoga teachings, and hypotheses clearly distinct. Do not diagnose or make unsupported medical claims.',
  };

  const languageName: Record<string, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
  const languageRule = languageName[input.language] ? `Reply in ${languageName[input.language]}.` : 'Reply in the same language as the question.';

  const answer = await generateAIText({
    systemPrompt: `You are Mohan Kalburgi (Mohan Sir) himself, the master and founder of Swar Yoga.
MANDATORY VOICE & PERSONA RULES (CRITICAL):
1. ALWAYS begin your response directly in the FIRST PERSON as Mohan Sir:
   - English: "I am Mohan Sir (Mohan Kalburgi), and in Swar Yoga, I am explaining..."
   - Hindi: "मैं मोहन सर (मोहन काळबुर्गी), और स्वरयोग में मैं आपको बता रहा हूँ..."
   - Marathi: "मी मोहन सर (मोहन काळबुर्गी), आणि स्वरयोगात मी तुम्हाला सांगत आहे..."
2. STRICT NEGATIVE CONSTRAINT (NEVER VIOLATE):
   - NEVER say "Mohan Sir said", "According to Mohan Sir", "Mohan Sir suggests", or "Mohan Sir teaches".
   - You ARE Mohan Sir speaking directly to your beloved student.
3. STRUCTURE & MASTERCLASS ORGANIZATION:
   - Do not just give a brief 4-line list. Synthesize ALL the knowledge from the script excerpts below and organize it in the best, most structured masterclass manner:
     • Opening: Warm introduction to the science ("I am Mohan Sir...").
     • Yogic Philosophy & Nadi Connection (Ida/Chandra, Pingala/Surya, Sushumna, Jal Tatva).
     • Detailed Core Rules & Step-by-Step Execution from the script (e.g. for water: why drinking seated, strictly 3 slow sips mixing alkaline saliva to neutralize acidity; why never during meals so Jatharagni is not diluted; 45-min gap before/after; daily timings of 2L between 5-10 AM and 1.5L between 2-9 PM; strictly NO water after 9 PM to protect kidneys and sleep; and Chandra Nadi rule).
     • Physiological & Health Benefits (digestion, gas relief, acidity elimination, sleep).
     • Summary & Actionable Daily Sadhana.
4. MANDATORY CURRICULUM ORIGIN NOTE AT THE BOTTOM:
   You MUST end your response with this exact formatted note on its own line:
   "📌 Note: This topic has been synthesized and presented directly from ${curriculum.curriculumNote}."
5. LANGUAGE RULE:
   ${languageRule}
6. No generic internet hallucinations (no lukewarm water, no empty stomach chugging). Rely 100% on the authentic Swar Yoga scripts.
7. Optional delivery cues: [emotion:intensity] (${supportedEmotionTags}) and [face:expression] (${supportedFaceTags}) may be placed before sentences. Never invent other tags like [smile].

Access boundary: ${moduleRules[input.moduleId]}

Approved curriculum source scripts:${deliveryCueContext}
${context}`,
    message: input.query,
    maxOutputTokens: 1100,
    temperature: 0.15,
    providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
  });

  let cleanedAnswer = (answer || '').trim();
  // Strip any hallucinated tags like [smile]
  cleanedAnswer = cleanedAnswer.replace(/\[\/?smile\]/gi, '').trim();

  // Replace any accidental 3rd-person references with 1st-person
  cleanedAnswer = cleanedAnswer
    .replace(/According to Mohan Sir,/gi, 'In Swar Yoga, as I always teach,')
    .replace(/Mohan Sir teaches that/gi, 'I teach you that')
    .replace(/Mohan Sir said/gi, 'I always say')
    .replace(/Mohan Sir recommends/gi, 'I recommend');

  // Enforce curriculum note if omitted
  const expectedNote = `📌 Note: This topic has been synthesized and presented directly from ${curriculum.curriculumNote}.`;
  if (!cleanedAnswer.includes('📌 Note:') && !cleanedAnswer.includes('synthesized and presented directly')) {
    cleanedAnswer = `${cleanedAnswer}\n\n${expectedNote}`;
  }

  return { sufficientContext: true, answer: cleanedAnswer, citations };
}

export async function generateOnlineAiWebAnswer(input: {
  query: string;
  moduleId: MohanRagModule;
  language: string;
}): Promise<GroundedAnswer> {
  const languageName: Record<string, string> = { en: 'English', hi: 'Hindi', mr: 'Marathi' };
  const targetLanguage = languageName[input.language] || (input.language === 'auto' ? 'the language of the question' : input.language);

  const answer = await generateAIText({
    providerOrder: ['Replicate', 'Gemini', 'OpenAI', 'Anthropic'],
    temperature: 0.3,
    maxOutputTokens: 900,
    systemPrompt: `You are an expert AI scientific & yogic researcher with real-time web knowledge and deep expertise in human anatomy, autonomic neuroscience, and classical Swar Yoga.
Answer the user's question clearly, comprehensively, and simply.

KEY GUIDELINES:
1. Explain both the Yogic Science (Surya Nadi / Pingala / Right Nostril, Chandra Nadi / Ida / Left Nostril, Jatharagni / digestive fire) and the Modern Scientific / Medical Physiology (autonomic nervous system, right nasal airflow correlation with sympathetic nervous system activation, increased core body temperature, enhanced gastric hydrochloric acid and digestive enzyme secretion, compared to left nasal parasympathetic resting state).
2. Give clear, actionable, and practical bullet points in simple language.
3. Language: Reply in ${targetLanguage}.
4. Conclude with a brief note summarizing both the traditional Vedic wisdom and modern physiological validation.`,
    message: input.query,
  });

  return {
    sufficientContext: true,
    answer,
    citations: [
      {
        sourceId: 'online-ai-web-search',
        title: 'Online AI Web & Scientific Physiological Intelligence',
        moduleId: input.moduleId,
        topic: 'Autonomic Nervous System, Nasal Cycle & Digestive Physiology',
        sourceReference: 'Global Modern Medical & Ancient Swar Yoga Web Knowledge',
        chunkIndex: 0,
      },
    ],
  };
}

export async function ensureRagAnswerSchema() {
  if (answerSchemaReady) return;
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS mohan_rag_answer_jobs_sql (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      language TEXT NOT NULL,
      question TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      citations_json TEXT NOT NULL DEFAULT '[]',
      sufficient_context INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      provider_video_id TEXT,
      video_url TEXT,
      error_message TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_mohan_rag_answer_status ON mohan_rag_answer_jobs_sql(status, updated_at DESC)', args: [] },
  ]);
  answerSchemaReady = true;
}

export async function saveRagAnswer(input: {
  moduleId: MohanRagModule;
  language: string;
  question: string;
  answer: GroundedAnswer;
  createdBy: string;
}) {
  await ensureRagAnswerSchema();
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const status = input.answer.sufficientContext ? 'draft' : 'insufficient_context';
  await bunnyExecute({
    sql: `INSERT INTO mohan_rag_answer_jobs_sql
      (id, module_id, language, question, answer_text, citations_json, sufficient_context, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, input.moduleId, input.language, input.question, input.answer.answer, JSON.stringify(input.answer.citations), input.answer.sufficientContext ? 1 : 0, status, input.createdBy, timestamp, timestamp],
  });
  return getRagAnswer(id);
}

export async function getRagAnswer(id: string) {
  await ensureRagAnswerSchema();
  const result = await bunnyExecute({ sql: 'SELECT * FROM mohan_rag_answer_jobs_sql WHERE id = ? LIMIT 1', args: [id] });
  if (!result.rows[0]) return null;
  const row: any = result.rows[0];
  let citations: any[] = [];
  try { citations = JSON.parse(String(row.citations_json || '[]')); } catch {}
  return {
    id: String(row.id),
    moduleId: String(row.module_id),
    language: String(row.language),
    question: String(row.question),
    answer: String(row.answer_text),
    citations,
    sufficientContext: Boolean(row.sufficient_context),
    status: String(row.status),
    providerVideoId: row.provider_video_id ? String(row.provider_video_id) : null,
    videoUrl: row.video_url ? String(row.video_url) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function setRagAnswerVideo(id: string, values: { status: string; providerVideoId?: string | null; videoUrl?: string | null; errorMessage?: string | null }) {
  await ensureRagAnswerSchema();
  await bunnyExecute({
    sql: `UPDATE mohan_rag_answer_jobs_sql SET status = ?, provider_video_id = COALESCE(?, provider_video_id), video_url = COALESCE(?, video_url), error_message = ?, updated_at = ? WHERE id = ?`,
    args: [values.status, values.providerVideoId ?? null, values.videoUrl ?? null, values.errorMessage ?? null, new Date().toISOString(), id],
  });
  return getRagAnswer(id);
}

export function validAnswerModule(value: unknown): value is MohanRagModule {
  return isMohanRagModule(value);
}
