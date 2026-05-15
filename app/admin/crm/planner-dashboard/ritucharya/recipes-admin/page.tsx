'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, Edit, Eye, Image, Video, FileText, Check, AlertCircle, X } from 'lucide-react';

interface Recipe {
  _id?: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  category: string;
  categoryHi: string;
  primaryRasa: string;
  primaryRasaHi: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  ingredients: { name: string; quantity: string; unit: string }[];
  instructions: string[];
  instructionsHi: string[];
  benefits: string[];
  benefitsHi: string[];
  thumbnailUrl?: string;
  images: { url: string; caption?: string }[];
  videoUrl?: string;
  pdfUrl?: string;
  doshaImpact: { vata: string; pitta: string; kapha: string };
  bestForRitus: string[];
  isPublished: boolean;
}

export default function CRMRitucharyaRecipesAdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const [formData, setFormData] = useState<Recipe>({
    name: '',
    nameHi: '',
    description: '',
    descriptionHi: '',
    category: 'breakfast',
    categoryHi: 'नाश्ता',
    primaryRasa: 'Sweet',
    primaryRasaHi: 'मीठा',
    servings: 1,
    prepTime: 15,
    cookTime: 30,
    difficulty: 'easy',
    ingredients: [],
    instructions: [],
    instructionsHi: [],
    benefits: [],
    benefitsHi: [],
    thumbnailUrl: '',
    images: [],
    videoUrl: '',
    pdfUrl: '',
    doshaImpact: { vata: 'balance', pitta: 'balance', kapha: 'balance' },
    bestForRitus: [],
    isPublished: false,
  });

  const categories = [
    { en: 'Salad', hi: 'सलाद', id: 'salad' },
    { en: 'Drink', hi: 'पेय', id: 'drink' },
    { en: 'Breakfast', hi: 'नाश्ता', id: 'breakfast' },
    { en: 'Lunch', hi: 'दोपहर का खाना', id: 'lunch' },
    { en: 'Dinner', hi: 'रात का खाना', id: 'dinner' },
    { en: 'Herbal', hi: 'औषधीय', id: 'herbal' },
    { en: 'Dessert', hi: 'मिठाई', id: 'dessert' },
  ];

  const rasas = [
    { en: 'Sweet', hi: 'मीठा' },
    { en: 'Sour', hi: 'खट्टा' },
    { en: 'Salty', hi: 'लवण' },
    { en: 'Pungent', hi: 'तीव्र' },
    { en: 'Bitter', hi: 'कड़वा' },
    { en: 'Astringent', hi: 'कसैला' },
  ];

  const ritus = [
    { id: 'grisham', hi: 'गर्मी' },
    { id: 'varsha', hi: 'वर्षा' },
    { id: 'sharad', hi: 'शरद' },
    { id: 'hemant', hi: 'हेमंत' },
    { id: 'shishir', hi: 'शिशिर' },
    { id: 'vasant', hi: 'वसंत' },
  ];

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ritucharya/recipes');
      const data = await response.json();
      if (data.success) {
        setRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setUploadStatus({ type: 'error', message: 'Failed to fetch recipes' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, fileType: 'image' | 'video' | 'pdf') => {
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('type', fileType);

      const response = await fetch('/api/ritucharya/upload', {
        method: 'POST',
        body: formDataObj,
      });

      const data = await response.json();

      if (data.success) {
        setUploadStatus({ type: 'success', message: `${fileType} uploaded successfully` });

        if (fileType === 'image') {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, { url: data.url }],
            thumbnailUrl: prev.thumbnailUrl || data.url,
          }));
        } else if (fileType === 'video') {
          setFormData(prev => ({ ...prev, videoUrl: data.url }));
        } else if (fileType === 'pdf') {
          setFormData(prev => ({ ...prev, pdfUrl: data.url }));
        }

        setTimeout(() => setUploadStatus({ type: null, message: '' }), 3000);
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Upload failed' });
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Upload failed' });
    }
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }],
    }));
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const ingredients = [...prev.ingredients];
      ingredients[index] = { ...ingredients[index], [field]: value };
      return { ...prev, ingredients };
    });
  };

  const handleAddInstruction = (lang: 'en' | 'hi') => {
    const key = lang === 'en' ? 'instructions' : 'instructionsHi';
    setFormData(prev => ({
      ...prev,
      [key]: [...prev[key], ''],
    }));
  };

  const handleInstructionChange = (lang: 'en' | 'hi', index: number, value: string) => {
    const key = lang === 'en' ? 'instructions' : 'instructionsHi';
    setFormData(prev => {
      const instructions = [...prev[key]];
      instructions[index] = value;
      return { ...prev, [key]: instructions };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/ritucharya/recipes/${editingId}` : '/api/ritucharya/recipes';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setUploadStatus({ type: 'success', message: editingId ? 'Recipe updated!' : 'Recipe created!' });
        setShowForm(false);
        setEditingId(null);
        setFormData({
          name: '',
          nameHi: '',
          description: '',
          descriptionHi: '',
          category: 'breakfast',
          categoryHi: 'नाश्ता',
          primaryRasa: 'Sweet',
          primaryRasaHi: 'मीठा',
          servings: 1,
          prepTime: 15,
          cookTime: 30,
          difficulty: 'easy',
          ingredients: [],
          instructions: [],
          instructionsHi: [],
          benefits: [],
          benefitsHi: [],
          thumbnailUrl: '',
          images: [],
          videoUrl: '',
          pdfUrl: '',
          doshaImpact: { vata: 'balance', pitta: 'balance', kapha: 'balance' },
          bestForRitus: [],
          isPublished: false,
        });
        fetchRecipes();
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Failed to save recipe' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const response = await fetch(`/api/ritucharya/recipes/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setUploadStatus({ type: 'success', message: 'Recipe deleted!' });
        fetchRecipes();
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Failed to delete recipe' });
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData(recipe);
    setEditingId(recipe._id || null);
    setShowForm(true);
  };

  return (
    <main className="min-h-screen bg-white pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Recipe Management</h1>
            <p className="text-gray-600">Create and manage Ayurvedic recipes</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) setEditingId(null);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            {showForm ? 'Cancel' : 'Add Recipe'}
          </button>
        </div>

        {/* Status Messages */}
        {uploadStatus.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border-l-4 ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 border-green-500 text-green-800'
              : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            {uploadStatus.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Form Section */}
        {showForm && (
          <div className="bg-white border-2 border-blue-300 rounded-lg p-8 mb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Recipe Name (English)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Recipe Name (Hindi)</label>
                  <input
                    type="text"
                    value={formData.nameHi}
                    onChange={(e) => setFormData(prev => ({ ...prev, nameHi: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                    required
                  />
                </div>
              </div>

              {/* Category & Rasa */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = categories.find(c => c.id === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        category: e.target.value,
                        categoryHi: cat?.hi || '',
                      }));
                    }}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.en} ({cat.hi})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Primary Rasa (Taste)</label>
                  <select
                    value={formData.primaryRasa}
                    onChange={(e) => {
                      const rasa = rasas.find(r => r.en === e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        primaryRasa: e.target.value,
                        primaryRasaHi: rasa?.hi || '',
                      }));
                    }}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                  >
                    {rasas.map(rasa => (
                      <option key={rasa.en} value={rasa.en}>{rasa.en} ({rasa.hi})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time & Servings */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.prepTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, prepTime: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Cook Time (min)</label>
                  <input
                    type="number"
                    value={formData.cookTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, cookTime: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Servings</label>
                  <input
                    type="number"
                    value={formData.servings}
                    onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Description (English)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Description (Hindi)</label>
                  <textarea
                    value={formData.descriptionHi}
                    onChange={(e) => setFormData(prev => ({ ...prev, descriptionHi: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                    rows={3}
                  />
                </div>
              </div>

              {/* Media Upload */}
              <div className="border-2 border-blue-300 rounded-lg p-4 space-y-4">
                <h3 className="font-bold text-gray-900">Media</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Thumbnail Image</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                      <Image size={20} className="text-blue-600" />
                      <span className="text-gray-700">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'image')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Video</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                      <Video size={20} className="text-blue-600" />
                      <span className="text-gray-700">Upload Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'video')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">PDF Recipe</label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                      <FileText size={20} className="text-blue-600" />
                      <span className="text-gray-700">Upload PDF</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'pdf')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Show uploaded files */}
                {formData.thumbnailUrl && (
                  <div className="text-sm text-green-600">✓ Thumbnail: {formData.thumbnailUrl.split('/').pop()}</div>
                )}
                {formData.videoUrl && (
                  <div className="text-sm text-green-600">✓ Video: {formData.videoUrl.split('/').pop()}</div>
                )}
                {formData.pdfUrl && (
                  <div className="text-sm text-green-600">✓ PDF: {formData.pdfUrl.split('/').pop()}</div>
                )}
              </div>

              {/* Ingredients */}
              <div className="border-2 border-blue-300 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Ingredients</h3>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.ingredients.map((ing, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                        className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="Quantity"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                        className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="border-2 border-blue-300 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">Instructions (English)</h3>
                  <button
                    type="button"
                    onClick={() => handleAddInstruction('en')}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.instructions.map((inst, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={inst}
                      onChange={(e) => handleInstructionChange('en', idx, e.target.value)}
                      placeholder={`Step ${idx + 1}`}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                    />
                  ))}
                </div>
              </div>

              {/* Dosha Impact */}
              <div className="border-2 border-blue-300 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-gray-900">Dosha Impact</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {['vata', 'pitta', 'kapha'].map(dosha => (
                    <div key={dosha}>
                      <label className="block text-gray-700 font-semibold mb-2 capitalize">{dosha}</label>
                      <select
                        value={formData.doshaImpact[dosha as keyof typeof formData.doshaImpact]}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          doshaImpact: { ...prev.doshaImpact, [dosha]: e.target.value }
                        }))}
                        className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                      >
                        <option value="balance">Balance</option>
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                  className="w-5 h-5 cursor-pointer"
                />
                <label htmlFor="published" className="text-gray-700 font-semibold cursor-pointer">Publish this recipe</label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check size={20} />
                {editingId ? 'Update Recipe' : 'Create Recipe'}
              </button>
            </form>
          </div>
        )}

        {/* Recipes List */}
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No recipes yet. Create your first recipe!</div>
        ) : (
          <div className="grid gap-4">
            {recipes.map(recipe => (
              <div key={recipe._id} className="bg-white border-2 border-blue-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                <div className="flex gap-4">
                  {recipe.thumbnailUrl && (
                    <img src={recipe.thumbnailUrl} alt={recipe.name} className="w-24 h-24 object-cover rounded-lg" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{recipe.name}</h3>
                        <p className="text-gray-600 text-sm">{recipe.nameHi}</p>
                        <div className="flex gap-2 mt-2 text-xs">
                          <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold">{recipe.category}</span>
                          <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">{recipe.primaryRasa}</span>
                          {recipe.isPublished && (
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-semibold">✓ Published</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(recipe)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => recipe._id && handleDelete(recipe._id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">{recipe.description}</p>
                    <div className="flex gap-4 mt-3 text-xs text-gray-600">
                      <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
                      <span>👥 {recipe.servings} servings</span>
                      {recipe.videoUrl && <span>🎥 Video</span>}
                      {recipe.pdfUrl && <span>📄 PDF</span>}
                      {recipe.images.length > 0 && <span>📸 {recipe.images.length} images</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
