import React from 'react';

export default function RegisterNowPage() {
  const [selectedMode, setSelectedMode] = React.useState(null);
  const [showLanguagePopup, setShowLanguagePopup] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState(null);
  const [selectedCategory, setSelectedCategory] = React.useState(null);

  const categories = [
    { id: 'health', label: 'Health', icon: '🏥' },
    { id: 'wealth', label: 'Wealth', icon: '💰' },
    { id: 'married', label: 'Married', icon: '💑' },
    { id: 'youth', label: 'Youth & Children', icon: '👦' },
    { id: 'training', label: 'Training', icon: '🎓' }
  ];

  const modes = [
    { id: 'online', label: 'Online', icon: '🖥️' },
    { id: 'offline', label: 'Offline', icon: '🏢' },
    { id: 'residential', label: 'Residential', icon: '🏨' },
    { id: 'recorded', label: 'Recorded', icon: '📹' }
  ];

  const languages = [
    { id: 'hindi', label: 'Hindi', icon: '🇮🇳' },
    { id: 'english', label: 'English', icon: '🇬🇧' },
    { id: 'marathi', label: 'Marathi', icon: '🇮🇳' }
  ];

  const handleModeClick = (modeId) => {
    setSelectedMode(modeId);
    setShowLanguagePopup(true);
  };

  const handleLanguageClick = (langId) => {
    setSelectedLanguage(langId);
    setShowLanguagePopup(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">Register Now</h1>
          <p className="text-xl text-gray-600">Find and register for your perfect yoga workshop</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Dark Green Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-xl shadow-2xl p-8 sticky top-24">
              <h2 className="text-2xl font-bold text-white mb-6">
                Select Workshop
              </h2>

              {/* Categories */}
              <div className="space-y-3 mb-8">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full px-4 py-3 rounded-lg font-bold text-lg transition-all duration-300 flex items-center gap-2 ${
                      selectedCategory === cat.id
                        ? 'bg-red-600 text-black shadow-lg scale-105'
                        : 'bg-white text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="bg-green-700 rounded-lg p-4 mt-8">
                <p className="text-green-100 text-sm">
                  <strong>Legend:</strong> Click category (turns red when selected)
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Mode Buttons */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Select Mode</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeClick(mode.id)}
                    className={`p-4 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 text-center ${
                      selectedMode === mode.id
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-2xl mb-2">{mode.icon}</div>
                    <div className="text-sm">{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Language Popup */}
            {showLanguagePopup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Select Language</h3>
                    <button
                      onClick={() => setShowLanguagePopup(false)}
                      className="text-gray-600 hover:text-gray-900 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => handleLanguageClick(lang.id)}
                        className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
                          selectedLanguage === lang.id
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        <span className="text-2xl">{lang.icon}</span>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Workshops Section */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Our Workshops</h3>
              <div className="h-1 w-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-6"></div>

              {selectedCategory && selectedMode && selectedLanguage ? (
                <div>
                  <div className="mb-6 inline-block bg-orange-100 px-4 py-2 rounded-lg">
                    <p className="text-gray-700 font-semibold">
                      ✅ <span className="text-orange-600">Selected:</span> {
                        categories.find(c => c.id === selectedCategory)?.label
                      } • {
                        modes.find(m => m.id === selectedMode)?.label
                      } • {
                        languages.find(l => l.id === selectedLanguage)?.label
                      }
                    </p>
                  </div>
                  <p className="text-center text-gray-600 text-lg mt-8">
                    ✨ Ready to register! Workshops will be displayed here. ✨
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
                  <p className="text-blue-800 font-semibold text-lg">
                    👈 Select a category from the sidebar, then choose a mode and language
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
