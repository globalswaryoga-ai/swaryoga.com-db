'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DiamondPerson, VISION_CATEGORIES, type VisionCategory } from '@/lib/types/lifePlanner';

interface DiamondPersonModalProps {
  person: DiamondPerson | null;
  onSave: (personData: Omit<DiamondPerson, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const DiamondPersonModal: React.FC<DiamondPersonModalProps> = ({ person, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    profession: '',
    country: '',
    state: '',
    address: '',
    email: '',
    notes: '',
    imageUrl: '',
    category: 'Spiritual Mentor',
    visionHead: '' as '' | VisionCategory,
    relationship: 'professional' as 'professional' | 'personal' | 'family' | 'friend',
    lastContact: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        mobile: person.mobile || '',
        profession: person.profession || '',
        country: person.country || '',
        state: person.state || '',
        address: person.address || '',
        email: person.email || '',
        notes: person.notes || '',
        imageUrl: person.imageUrl || '',
        category: person.category || 'Spiritual Mentor',
        visionHead: (person.visionHead || '') as any,
        relationship: (person.relationship || 'professional') as any,
        lastContact: person.lastContact || new Date().toISOString().split('T')[0],
      });
    }
  }, [person]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      visionHead: formData.visionHead ? (formData.visionHead as any) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-swar-border">
          <h2 className="text-2xl font-bold text-swar-text">
            {person ? 'Edit Person' : 'Add New Person'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-swar-text-secondary hover:text-swar-text hover:bg-swar-primary-light rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Row 1: Name and Profession */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Profession *</label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="e.g., Yoga Instructor"
              />
            </div>
          </div>

          {/* Row 2: Email and Phone */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Mobile *</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          {/* Row 3: Country and State */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Country *</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="United States"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">State/Province *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="California"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Address *</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="123 Street, City, ZIP"
            />
          </div>

          {/* Row 4: Category and Relationship */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option>Spiritual Mentor</option>
                <option>Health Professional</option>
                <option>Personal Development</option>
                <option>Family</option>
                <option>Friends</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-swar-text mb-2">Relationship *</label>
              <select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="professional">Professional</option>
                <option value="personal">Personal</option>
                <option value="family">Family</option>
                <option value="friend">Friend</option>
              </select>
            </div>
          </div>

          {/* Vision Head */}
          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Vision Head</label>
            <select
              name="visionHead"
              value={formData.visionHead}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="">Select Vision Head</option>
              {VISION_CATEGORIES.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-swar-text-secondary">Optional: connects this person to one of your 10 Vision Heads.</p>
          </div>

          {/* Last Contact */}
          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Last Contact</label>
            <input
              type="date"
              name="lastContact"
              value={formData.lastContact}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Image URL</label>
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-swar-text mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Add any notes about this person..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-swar-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-swar-border rounded-lg text-swar-text font-medium hover:bg-swar-bg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              {person ? 'Update Person' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiamondPersonModal;
