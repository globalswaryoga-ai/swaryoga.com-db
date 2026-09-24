import {
  Heart, Clock, HeartPulse, DollarSign, Briefcase, Building2, GraduationCap, Home, Baby, Car, Plane, BookMarked,
  Scale, TriangleAlert, Users, Award, HeartCrack, Armchair, UserPlus, Landmark, PiggyBank,
  type LucideIcon,
} from 'lucide-react';

export interface RuleBookEntry {
  _id: string;
  category: string;
  subMatter: string;
  primaryHouse?: number;
  promiseHouses: string;
  denialHouses: string;
  dashaBhuktiAntara: string;
  gocharNote: string;
  notes: string;
  isDraft: boolean;
  order: number;
}

export interface CategoryMeta {
  icon: LucideIcon;
  grad: string;
  text: string;
  chip: string;
  ring: string;
}

// Colorful, distinct look per major life-category so the page reads as a
// well-organised "book" rather than one long grey table. Any category the
// astrologer types in that isn't in this map (a brand-new life-matter) falls
// back to DEFAULT_CATEGORY_META below rather than erroring.
export const CATEGORY_META: Record<string, CategoryMeta> = {
  'Marriage': { icon: Heart, grad: 'from-rose-500 to-pink-500', text: 'text-rose-700', chip: 'bg-rose-100 text-rose-700', ring: 'ring-rose-200' },
  'Life Span': { icon: Clock, grad: 'from-slate-500 to-slate-700', text: 'text-slate-700', chip: 'bg-slate-200 text-slate-700', ring: 'ring-slate-200' },
  'Health & Disease': { icon: HeartPulse, grad: 'from-red-500 to-rose-600', text: 'text-red-700', chip: 'bg-red-100 text-red-700', ring: 'ring-red-200' },
  'Wealth & Finance': { icon: DollarSign, grad: 'from-emerald-500 to-green-600', text: 'text-emerald-700', chip: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-200' },
  'Job / Service': { icon: Briefcase, grad: 'from-blue-500 to-indigo-600', text: 'text-blue-700', chip: 'bg-blue-100 text-blue-700', ring: 'ring-blue-200' },
  'Business': { icon: Building2, grad: 'from-amber-500 to-orange-600', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200' },
  'Education': { icon: GraduationCap, grad: 'from-indigo-500 to-violet-600', text: 'text-indigo-700', chip: 'bg-indigo-100 text-indigo-700', ring: 'ring-indigo-200' },
  'Education Location': { icon: Home, grad: 'from-purple-500 to-fuchsia-600', text: 'text-purple-700', chip: 'bg-purple-100 text-purple-700', ring: 'ring-purple-200' },
  'Children / Progeny': { icon: Baby, grad: 'from-teal-500 to-cyan-600', text: 'text-teal-700', chip: 'bg-teal-100 text-teal-700', ring: 'ring-teal-200' },
  'Property & Vehicle': { icon: Car, grad: 'from-cyan-500 to-sky-600', text: 'text-cyan-700', chip: 'bg-cyan-100 text-cyan-700', ring: 'ring-cyan-200' },
  'Travel': { icon: Plane, grad: 'from-sky-500 to-blue-600', text: 'text-sky-700', chip: 'bg-sky-100 text-sky-700', ring: 'ring-sky-200' },
  'Litigation & Disputes': { icon: Scale, grad: 'from-stone-500 to-neutral-700', text: 'text-stone-700', chip: 'bg-stone-200 text-stone-700', ring: 'ring-stone-200' },
  'Accidents': { icon: TriangleAlert, grad: 'from-orange-600 to-red-600', text: 'text-orange-700', chip: 'bg-orange-100 text-orange-700', ring: 'ring-orange-200' },
  'Family Relationships': { icon: Users, grad: 'from-violet-500 to-purple-600', text: 'text-violet-700', chip: 'bg-violet-100 text-violet-700', ring: 'ring-violet-200' },
  'Reputation & Public Life': { icon: Award, grad: 'from-yellow-500 to-amber-600', text: 'text-yellow-700', chip: 'bg-yellow-100 text-yellow-700', ring: 'ring-yellow-200' },
  'Second Marriage & Widowhood': { icon: HeartCrack, grad: 'from-rose-700 to-red-800', text: 'text-rose-800', chip: 'bg-rose-200 text-rose-800', ring: 'ring-rose-300' },
  'Retirement': { icon: Armchair, grad: 'from-orange-700 to-amber-800', text: 'text-orange-800', chip: 'bg-orange-200 text-orange-800', ring: 'ring-orange-300' },
  'Adoption': { icon: UserPlus, grad: 'from-lime-500 to-green-600', text: 'text-lime-700', chip: 'bg-lime-100 text-lime-700', ring: 'ring-lime-200' },
  'Loans & Borrowing': { icon: Landmark, grad: 'from-cyan-700 to-blue-800', text: 'text-cyan-800', chip: 'bg-cyan-200 text-cyan-800', ring: 'ring-cyan-300' },
  'Bankruptcy': { icon: PiggyBank, grad: 'from-red-700 to-rose-800', text: 'text-red-800', chip: 'bg-red-200 text-red-800', ring: 'ring-red-300' },
};

export const DEFAULT_CATEGORY_META: CategoryMeta = {
  icon: BookMarked, grad: 'from-gray-500 to-gray-700', text: 'text-gray-700', chip: 'bg-gray-100 text-gray-700', ring: 'ring-gray-200',
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META);

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] || DEFAULT_CATEGORY_META;
}

// The exact text copied to the clipboard for pasting into the Prediction
// Template's Rule field.
export function buildCopyText(entry: RuleBookEntry): string {
  const lines = [entry.subMatter];
  if (entry.promiseHouses) lines.push(`Promise: ${entry.promiseHouses}`);
  if (entry.dashaBhuktiAntara) lines.push(`Dasha-Bhukti-Antara: ${entry.dashaBhuktiAntara}`);
  if (entry.denialHouses) lines.push(`Denial / Opposite: ${entry.denialHouses}`);
  if (entry.gocharNote) lines.push(`Gochar (Transit): ${entry.gocharNote}`);
  if (entry.notes) lines.push(`Note: ${entry.notes}`);
  return lines.join('\n');
}
