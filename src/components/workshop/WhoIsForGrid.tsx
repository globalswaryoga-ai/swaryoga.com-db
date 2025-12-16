import React from 'react';
import { Users, BookOpen, Brain, Heart } from 'lucide-react';

interface WhoIsForItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface WhoIsForGridProps {
  categories?: string[];
}

const defaultCategories: WhoIsForItem[] = [
  {
    icon: <BookOpen className="w-8 h-8 text-indigo-600" />,
    title: 'Beginners',
    description: 'New to yoga and looking to build a solid foundation'
  },
  {
    icon: <Users className="w-8 h-8 text-indigo-600" />,
    title: 'Yoga Practitioners',
    description: 'Experienced practitioners seeking deeper understanding'
  },
  {
    icon: <Brain className="w-8 h-8 text-indigo-600" />,
    title: 'Therapists',
    description: 'Health professionals wanting to integrate yoga practices'
  },
  {
    icon: <Heart className="w-8 h-8 text-indigo-600" />,
    title: 'Spiritual Seekers',
    description: 'Those on a path of spiritual growth and self-discovery'
  }
];

export default function WhoIsForGrid({ categories }: WhoIsForGridProps) {
  const items = categories && categories.length > 0
    ? categories.slice(0, 4).map((cat, idx) => ({
        ...defaultCategories[idx],
        title: cat
      }))
    : defaultCategories;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">
          Who Is This Workshop For?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-lg p-8 text-center hover:bg-indigo-50 transition-colors"
            >
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-full">
                  {item.icon}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
