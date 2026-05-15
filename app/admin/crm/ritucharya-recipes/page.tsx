'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Upload, Trash2, Edit, Eye, Image, Video, FileText, Check, AlertCircle } from 'lucide-react';

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

export default function RitucharyaRecipesAdminPage() {
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

  // Fetch recipes
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', fileType);

      const response = await fetch('/api/ritucharya/upload', {
        method: 'POST',
        body: formData,
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
        setUploadStatus({ type: 'success', message: `Recipe ${editingId ? 'updated' : 'created'} successfully` });
        resetForm();
        fetchRecipes();
        setTimeout(() => setUploadStatus({ type: null, message: '' }), 3000);
      } else {
        setUploadStatus({ type: 'error', message: data.error });
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Failed to save recipe' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      const response = await fetch(`/api/ritucharya/recipes/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        setUploadStatus({ type: 'success', message: 'Recipe deleted' });
        fetchRecipes();
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Failed to delete recipe' });
    }
  };

  const resetForm = () => {
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
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div style={{ backgroundColor: '#000000', color: '#FFFFFF', minHeight: '100vh' }} className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#00FF00' }}>
            Ritucharya Recipe Management
          </h1>
          <p style={{ color: '#AAAAAA' }}>Manage recipes for Salads, Drinks, Breakfast, Lunch, and Dinner</p>
        </div>

        {/* Status Alert */}
        {uploadStatus.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${uploadStatus.type === 'success' ? 'bg-green-900/30 border-l-4 border-green-500' : 'bg-red-900/30 border-l-4 border-red-500'}`}>
            {uploadStatus.type === 'success' ? (
              <Check size={20} style={{ color: '#00FF00' }} />
            ) : (
              <AlertCircle size={20} style={{ color: '#FF6B6B' }} />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Add Recipe Button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-8 font-bold py-3 px-6 rounded-lg flex items-center gap-2"
          style={{ backgroundColor: '#00FF00', color: '#000000' }}
        >
          <Plus size={20} />
          {showForm ? 'Cancel' : 'Add New Recipe'}
        </button>

        {/* Recipe Form */}
        {showForm && (
          <div className="mb-8 p-6 rounded-lg" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
              {editingId ? 'Edit Recipe' : 'Create New Recipe'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Recipe Name (English)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                  required
                />
                <input
                  type="text"
                  placeholder="व्यंजन का नाम (Hindi)"
                  value={formData.nameHi}
                  onChange={(e) => setFormData({ ...formData, nameHi: e.target.value })}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                  required
                />
              </div>

              {/* Category & Rasa */}
              <div className="grid md:grid-cols-2 gap-4">
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      category: e.target.value,
                      categoryHi: cat?.hi || '',
                    });
                  }}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.en} ({cat.hi})
                    </option>
                  ))}
                </select>

                <select
                  value={formData.primaryRasa}
                  onChange={(e) => {
                    const rasa = rasas.find(r => r.en === e.target.value);
                    setFormData({
                      ...formData,
                      primaryRasa: e.target.value,
                      primaryRasaHi: rasa?.hi || '',
                    });
                  }}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                >
                  {rasas.map(rasa => (
                    <option key={rasa.en} value={rasa.en}>
                      {rasa.en} ({rasa.hi})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descriptions */}
              <textarea
                placeholder="Description (English)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 rounded-lg focus:outline-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                rows={2}
              />

              <textarea
                placeholder="विवरण (Hindi)"
                value={formData.descriptionHi}
                onChange={(e) => setFormData({ ...formData, descriptionHi: e.target.value })}
                className="w-full px-4 py-2 rounded-lg focus:outline-none"
                style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                rows={2}
              />

              {/* Cooking Info */}
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Servings"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                />
                <input
                  type="number"
                  placeholder="Prep Time (min)"
                  value={formData.prepTime}
                  onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) })}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                />
                <input
                  type="number"
                  placeholder="Cook Time (min)"
                  value={formData.cookTime}
                  onChange={(e) => setFormData({ ...formData, cookTime: parseInt(e.target.value) })}
                  className="px-4 py-2 rounded-lg focus:outline-none"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                />
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>Ingredients</h3>
                {formData.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <input
                      type="text"
                      placeholder="Quantity"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                      className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-sm font-bold py-2 px-4 rounded-lg mt-2"
                  style={{ backgroundColor: 'rgba(0, 255, 0, 0.2)', color: '#00FF00', border: '1px solid #00FF00' }}
                >
                  + Add Ingredient
                </button>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>Instructions (English)</h3>
                {formData.instructions.map((inst, idx) => (
                  <textarea
                    key={idx}
                    value={inst}
                    onChange={(e) => handleInstructionChange('en', idx, e.target.value)}
                    placeholder={`Step ${idx + 1}`}
                    className="w-full px-3 py-2 rounded-lg mb-2 focus:outline-none text-sm"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #FFFF00', color: '#FFFFFF' }}
                    rows={2}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => handleAddInstruction('en')}
                  className="text-sm font-bold py-2 px-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(0, 255, 0, 0.2)', color: '#00FF00', border: '1px solid #00FF00' }}
                >
                  + Add Step
                </button>
              </div>

              {/* Media Upload */}
              <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 0, 0.1)', border: '1px solid #FFFF00' }}>
                <h3 className="font-bold" style={{ color: '#00FF00' }}>📸 Upload Media</h3>

                {/* Image Upload */}
                <div>
                  <label className="block mb-2 text-sm" style={{ color: '#FFFFFF' }}>Images</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'image')}
                    className="text-sm"
                  />
                  {formData.images.length > 0 && (
                    <div className="mt-2">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm" style={{ color: '#00FF00' }}>
                          <Image size={16} /> Image {idx + 1} uploaded
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block mb-2 text-sm" style={{ color: '#FFFFFF' }}>Video</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'video')}
                    className="text-sm"
                  />
                  {formData.videoUrl && (
                    <div className="flex items-center gap-2 text-sm mt-2" style={{ color: '#00FF00' }}>
                      <Video size={16} /> Video uploaded
                    </div>
                  )}
                </div>

                {/* PDF Upload */}
                <div>
                  <label className="block mb-2 text-sm" style={{ color: '#FFFFFF' }}>Recipe PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'pdf')}
                    className="text-sm"
                  />
                  {formData.pdfUrl && (
                    <div className="flex items-center gap-2 text-sm mt-2" style={{ color: '#00FF00' }}>
                      <FileText size={16} /> PDF uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Publish */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Publish this recipe</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="w-full font-bold py-3 rounded-lg"
                style={{ backgroundColor: '#00FF00', color: '#000000' }}
              >
                {editingId ? 'Update Recipe' : 'Create Recipe'}
              </button>
            </form>
          </div>
        )}

        {/* Recipes List */}
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
            Recipes ({recipes.length})
          </h2>

          {loading ? (
            <p style={{ color: '#AAAAAA' }}>Loading recipes...</p>
          ) : recipes.length === 0 ? (
            <p style={{ color: '#AAAAAA' }}>No recipes yet. Create one to get started!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recipes.map(recipe => (
                <div key={recipe._id} className="p-4 rounded-lg" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}>
                  {recipe.thumbnailUrl && (
                    <img src={recipe.thumbnailUrl} alt={recipe.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                  )}
                  <h3 className="font-bold mb-2" style={{ color: '#00FF00' }}>{recipe.name}</h3>
                  <p style={{ color: '#AAAAAA' }} className="text-sm mb-2">{recipe.nameHi}</p>
                  <div className="flex items-center gap-2 text-sm mb-3" style={{ color: '#FFFFFF' }}>
                    <span>{recipe.category}</span>
                    <span>{recipe.primaryRasa} ({recipe.primaryRasaHi})</span>
                    {recipe.isPublished && <span style={{ color: '#00FF00' }}>✓ Published</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(recipe._id!);
                        setFormData(recipe);
                        setShowForm(true);
                      }}
                      className="flex-1 py-2 rounded text-sm font-bold"
                      style={{ backgroundColor: '#FFFF00', color: '#000000' }}
                    >
                      <Edit size={16} className="inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => recipe._id && handleDelete(recipe._id)}
                      className="flex-1 py-2 rounded text-sm font-bold"
                      style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
                    >
                      <Trash2 size={16} className="inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
