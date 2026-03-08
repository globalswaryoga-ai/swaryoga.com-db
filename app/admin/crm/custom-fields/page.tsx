'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  GripVertical,
  ChevronDown,
  Check,
  X,
  Type,
  Hash,
  Mail,
  Phone,
  Link,
  Calendar,
  Clock,
  AlignLeft,
  CheckSquare,
  DollarSign,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CustomField {
  id: string;
  _id?: string;
  name: string;
  key: string;
  type: string;
  entity: string;
  description?: string;
  required: boolean;
  unique: boolean;
  defaultValue?: any;
  options?: { label: string; value: string; color?: string }[];
  showInList: boolean;
  showInForm: boolean;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

interface FieldLimits {
  maxFields: number;
  used: number;
  remaining: number;
  allowedTypes: string[];
  hasValidation: boolean;
  hasGroups: boolean;
}

const FIELD_TYPES = [
  { id: 'text', name: 'Text', icon: Type, description: 'Single line text' },
  { id: 'textarea', name: 'Long Text', icon: AlignLeft, description: 'Multi-line text area' },
  { id: 'number', name: 'Number', icon: Hash, description: 'Numeric value' },
  { id: 'currency', name: 'Currency', icon: DollarSign, description: 'Money amount' },
  { id: 'email', name: 'Email', icon: Mail, description: 'Email address' },
  { id: 'phone', name: 'Phone', icon: Phone, description: 'Phone number' },
  { id: 'url', name: 'URL', icon: Link, description: 'Web link' },
  { id: 'date', name: 'Date', icon: Calendar, description: 'Date picker' },
  { id: 'datetime', name: 'Date & Time', icon: Clock, description: 'Date and time picker' },
  { id: 'select', name: 'Dropdown', icon: ChevronDown, description: 'Single selection' },
  { id: 'multiselect', name: 'Multi-Select', icon: CheckSquare, description: 'Multiple selections' },
  { id: 'checkbox', name: 'Checkbox', icon: Check, description: 'Yes/No toggle' },
];

const ENTITIES = [
  { id: 'lead', name: 'Leads' },
  { id: 'deal', name: 'Deals' },
  { id: 'contact', name: 'Contacts' },
  { id: 'company', name: 'Companies' },
  { id: 'ticket', name: 'Tickets' },
];

export default function CustomFieldsPage() {
  const token = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [limits, setLimits] = useState<FieldLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('lead');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'text',
    description: '',
    required: false,
    unique: false,
    defaultValue: '',
    showInList: true,
    showInForm: true,
    options: [{ label: '', value: '' }],
    min: '',
    max: '',
    minLength: '',
    maxLength: '',
    pattern: '',
  });

  useEffect(() => {
    if (token) fetchFields();
  }, [token, selectedEntity]);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm-site/custom-fields?entity=${selectedEntity}&includeSystem=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFields(data.data.fields);
        setLimits(data.data.limits);
      }
    } catch (err) {
      console.error('Failed to fetch fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError('');
      
      if (!formData.name.trim()) {
        setError('Field name is required');
        return;
      }

      const payload: any = {
        name: formData.name,
        type: formData.type,
        entity: selectedEntity,
        description: formData.description,
        required: formData.required,
        unique: formData.unique,
        showInList: formData.showInList,
        showInForm: formData.showInForm,
      };

      if (formData.defaultValue) payload.defaultValue = formData.defaultValue;
      
      if (formData.type === 'select' || formData.type === 'multiselect') {
        payload.options = formData.options.filter(o => o.label && o.value);
      }

      if (limits?.hasValidation) {
        if (formData.min) payload.min = parseFloat(formData.min);
        if (formData.max) payload.max = parseFloat(formData.max);
        if (formData.minLength) payload.minLength = parseInt(formData.minLength);
        if (formData.maxLength) payload.maxLength = parseInt(formData.maxLength);
        if (formData.pattern) payload.pattern = formData.pattern;
      }

      const res = await fetch('/api/crm-site/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create field');
        return;
      }

      setShowCreateModal(false);
      resetForm();
      fetchFields();
    } catch (err) {
      setError('Failed to create field');
    }
  };

  const handleUpdate = async () => {
    if (!editingField) return;

    try {
      setError('');

      const payload: any = {
        id: editingField._id || editingField.id,
        name: formData.name,
        description: formData.description,
        required: formData.required,
        showInList: formData.showInList,
        showInForm: formData.showInForm,
      };

      if (formData.defaultValue) payload.defaultValue = formData.defaultValue;
      
      if (editingField.type === 'select' || editingField.type === 'multiselect') {
        payload.options = formData.options.filter(o => o.label && o.value);
      }

      if (limits?.hasValidation) {
        if (formData.min) payload.min = parseFloat(formData.min);
        if (formData.max) payload.max = parseFloat(formData.max);
        if (formData.minLength) payload.minLength = parseInt(formData.minLength);
        if (formData.maxLength) payload.maxLength = parseInt(formData.maxLength);
        if (formData.pattern) payload.pattern = formData.pattern;
      }

      const res = await fetch('/api/crm-site/custom-fields', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to update field');
        return;
      }

      setEditingField(null);
      resetForm();
      fetchFields();
    } catch (err) {
      setError('Failed to update field');
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (field.isSystem) return;
    if (!confirm(`Delete field "${field.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/crm-site/custom-fields?id=${field._id || field.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchFields();
      }
    } catch (err) {
      console.error('Failed to delete field:', err);
    }
  };

  const toggleVisibility = async (field: CustomField, property: 'showInList' | 'showInForm') => {
    if (field.isSystem) return;

    try {
      await fetch('/api/crm-site/custom-fields', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: field._id || field.id,
          [property]: !field[property],
        }),
      });
      fetchFields();
    } catch (err) {
      console.error('Failed to update field:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'text',
      description: '',
      required: false,
      unique: false,
      defaultValue: '',
      showInList: true,
      showInForm: true,
      options: [{ label: '', value: '' }],
      min: '',
      max: '',
      minLength: '',
      maxLength: '',
      pattern: '',
    });
  };

  const openEditModal = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      type: field.type,
      description: field.description || '',
      required: field.required,
      unique: field.unique,
      defaultValue: field.defaultValue || '',
      showInList: field.showInList,
      showInForm: field.showInForm,
      options: field.options?.length ? field.options : [{ label: '', value: '' }],
      min: field.min?.toString() || '',
      max: field.max?.toString() || '',
      minLength: field.minLength?.toString() || '',
      maxLength: field.maxLength?.toString() || '',
      pattern: field.pattern || '',
    });
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { label: '', value: '' }],
    }));
  };

  const updateOption = (index: number, key: 'label' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [key]: value } : opt
      ),
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const getFieldIcon = (type: string) => {
    const fieldType = FIELD_TYPES.find(f => f.id === type);
    return fieldType?.icon || Type;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-gray-600 text-sm mt-1">
            Define custom fields for your CRM entities
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!!(limits && limits.remaining <= 0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {/* Limits Info */}
      {limits && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">
                {limits.used} / {limits.maxFields} custom fields used
              </p>
              <p className="text-sm text-blue-700">
                {limits.remaining} fields remaining on your plan
              </p>
            </div>
            <div className="w-48 bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2"
                style={{ width: `${Math.min((limits.used / limits.maxFields) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Entity Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {ENTITIES.map(entity => (
            <button
              key={entity.id}
              onClick={() => setSelectedEntity(entity.id)}
              className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                selectedEntity === entity.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {entity.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Fields List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading fields...</div>
      ) : fields.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No custom fields for {ENTITIES.find(e => e.id === selectedEntity)?.name}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">List</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Form</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {fields.map(field => {
                const Icon = getFieldIcon(field.type);
                return (
                  <tr key={field.id || field.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded">
                          <Icon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{field.name}</p>
                          <p className="text-xs text-gray-500">{field.key}</p>
                        </div>
                        {field.isSystem && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 capitalize">{field.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      {field.required ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(field, 'showInList')}
                        disabled={field.isSystem}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                      >
                        {field.showInList ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(field, 'showInForm')}
                        disabled={field.isSystem}
                        className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                      >
                        {field.showInForm ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(field)}
                          disabled={field.isSystem}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(field)}
                          disabled={field.isSystem}
                          className="p-1 hover:bg-red-50 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingField) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingField ? 'Edit Field' : 'Create Custom Field'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingField(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Field Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Field Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., LinkedIn Profile"
                />
              </div>

              {/* Field Type (only for create) */}
              {!editingField && (
                <div>
                  <label className="block text-sm font-medium mb-1">Field Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FIELD_TYPES.filter(t => limits?.allowedTypes.includes(t.id)).map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                          className={`p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors ${
                            formData.type === type.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${formData.type === type.id ? 'text-blue-600' : 'text-gray-500'}`} />
                          <span className="text-xs">{type.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Help text for this field"
                />
              </div>

              {/* Options for select/multiselect */}
              {(formData.type === 'select' || formData.type === 'multiselect' || 
                (editingField && (editingField.type === 'select' || editingField.type === 'multiselect'))) && (
                <div>
                  <label className="block text-sm font-medium mb-1">Options</label>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => updateOption(index, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={option.value}
                          onChange={(e) => updateOption(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => removeOption(index)}
                          disabled={formData.options.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addOption}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Validation (if plan supports) */}
              {limits?.hasValidation && (formData.type === 'number' || formData.type === 'currency') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Value</label>
                    <input
                      type="number"
                      value={formData.min}
                      onChange={(e) => setFormData(prev => ({ ...prev, min: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Value</label>
                    <input
                      type="number"
                      value={formData.max}
                      onChange={(e) => setFormData(prev => ({ ...prev, max: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {limits?.hasValidation && (formData.type === 'text' || formData.type === 'textarea') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Length</label>
                    <input
                      type="number"
                      value={formData.minLength}
                      onChange={(e) => setFormData(prev => ({ ...prev, minLength: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Length</label>
                    <input
                      type="number"
                      value={formData.maxLength}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxLength: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3 border-t pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.required}
                    onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Required field</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInList}
                    onChange={(e) => setFormData(prev => ({ ...prev, showInList: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Show in list view</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInForm}
                    onChange={(e) => setFormData(prev => ({ ...prev, showInForm: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Show in forms</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingField(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingField ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingField ? 'Update' : 'Create'} Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
