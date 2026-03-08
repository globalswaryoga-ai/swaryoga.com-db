'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Loader2,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  UserPlus,
  MessageSquare,
  Tag,
  Mail,
  Globe,
  FileText,
  Settings,
  X,
  ChevronDown,
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: { type: string; config: Record<string, any> };
  conditions: any[];
  actions: any[];
  isActive: boolean;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
}

interface TriggerType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  fields?: any[];
}

interface ActionType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  fields?: any[];
}

const ICON_MAP: Record<string, any> = {
  UserPlus,
  RefreshCw,
  UserCheck: UserPlus,
  MessageSquare,
  Tag,
  Clock,
  Calendar: Clock,
  MessageCircle: MessageSquare,
  Mail,
  Edit: Edit2,
  FileText,
  CheckSquare: CheckCircle2,
  Globe,
  X,
};

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [triggerTypes, setTriggerTypes] = useState<Record<string, TriggerType>>({});
  const [actionTypes, setActionTypes] = useState<Record<string, ActionType>>({});
  const [usage, setUsage] = useState({ workflows: 0, maxWorkflows: 1, canCreate: true });
  const [plan, setPlan] = useState('free');
  const [tenantSlug, setTenantSlug] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);

  // Create workflow form
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: { type: '', config: {} },
    conditions: [] as any[],
    actions: [] as { id: string; type: string; config: Record<string, any>; order: number }[],
  });

  // Step tracking for create flow
  const [createStep, setCreateStep] = useState(1); // 1: name, 2: trigger, 3: actions, 4: review

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/workflows?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
        setTriggerTypes(data.triggerTypes || {});
        setActionTypes(data.actionTypes || {});
        setUsage(data.usage || { workflows: 0, maxWorkflows: 1, canCreate: true });
        setPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (workflow: Workflow) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/workflows', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          workflowId: workflow.id,
          isActive: !workflow.isActive,
        }),
      });
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/workflows', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, workflowId }),
      });
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name.trim() || !newWorkflow.trigger.type || newWorkflow.actions.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          ...newWorkflow,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreate(false);
        setCreateStep(1);
        setNewWorkflow({
          name: '',
          description: '',
          trigger: { type: '', config: {} },
          conditions: [],
          actions: [],
        });
        fetchWorkflows();
      } else {
        alert(data.error || 'Failed to create workflow');
      }
    } catch (err) {
      console.error('Failed to create workflow:', err);
      alert('Failed to create workflow');
    } finally {
      setSaving(false);
    }
  };

  // Track which action is being configured
  const [configuringAction, setConfiguringAction] = useState<number | null>(null);

  const addAction = (actionType: string) => {
    const newIndex = newWorkflow.actions.length;
    setNewWorkflow(w => ({
      ...w,
      actions: [
        ...w.actions,
        {
          id: `action-${Date.now()}`,
          type: actionType,
          config: {},
          order: newIndex,
        },
      ],
    }));
    // Auto-open config for new action if it has fields
    const actionDef = actionTypes[actionType];
    if (actionDef?.fields && actionDef.fields.length > 0) {
      setConfiguringAction(newIndex);
    }
  };

  const removeAction = (index: number) => {
    setNewWorkflow(w => ({
      ...w,
      actions: w.actions.filter((_, i) => i !== index).map((a, i) => ({ ...a, order: i })),
    }));
    if (configuringAction === index) setConfiguringAction(null);
  };

  const updateActionConfig = (index: number, config: Record<string, any>) => {
    setNewWorkflow(w => ({
      ...w,
      actions: w.actions.map((a, i) => (i === index ? { ...a, config: { ...a.config, ...config } } : a)),
    }));
  };

  const updateTriggerConfig = (config: Record<string, any>) => {
    setNewWorkflow(w => ({
      ...w,
      trigger: { ...w.trigger, config: { ...w.trigger.config, ...config } },
    }));
  };

  // Render config field based on type
  const renderConfigField = (
    field: { name: string; label: string; type: string; placeholder?: string; default?: any; options?: any; showIf?: any },
    value: any,
    onChange: (val: any) => void,
    allConfig: Record<string, any>
  ) => {
    // Check showIf condition
    if (field.showIf) {
      const [key, expectedValue] = Object.entries(field.showIf)[0];
      if (allConfig[key] !== expectedValue) return null;
    }

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <input
              type="text"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );
      case 'number':
        return (
          <div key={field.name} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <input
              type="number"
              value={value ?? field.default ?? ''}
              onChange={e => onChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={field.name} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <textarea
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );
      case 'select':
        const options = Array.isArray(field.options) ? field.options : [];
        return (
          <div key={field.name} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <select
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select...</option>
              {options.map((opt: string | { value: string; label: string }) => {
                const optVal = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                return <option key={optVal} value={optVal}>{optLabel}</option>;
              })}
            </select>
          </div>
        );
      case 'time':
        return (
          <div key={field.name} className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <input
              type="time"
              value={value || field.default || '09:00'}
              onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || Zap;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Automations
          </h1>
          <p className="text-sm text-gray-500">
            {usage.workflows} of {usage.maxWorkflows} workflows • {plan} plan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkflows}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!usage.canCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Limit Warning */}
      {!usage.canCreate && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Workflow limit reached</p>
            <p className="text-sm text-amber-700">
              Your {plan} plan allows {usage.maxWorkflows} workflow{usage.maxWorkflows !== 1 ? 's' : ''}. 
              Upgrade to create more automations.
            </p>
          </div>
        </div>
      )}

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first automation to automatically assign leads, send messages, and more.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map(workflow => {
            const trigger = triggerTypes[workflow.trigger.type];
            const TriggerIcon = trigger ? getIcon(trigger.icon) : Zap;

            return (
              <div
                key={workflow.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition ${
                  workflow.isActive ? 'border-gray-100' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          workflow.isActive ? 'bg-amber-100' : 'bg-gray-100'
                        }`}
                      >
                        <TriggerIcon className={`w-6 h-6 ${workflow.isActive ? 'text-amber-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              workflow.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {workflow.isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {trigger?.name || workflow.trigger.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowRight className="w-4 h-4" />
                            {workflow.actions.length} action{workflow.actions.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {workflow.runCount} runs
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleWorkflow(workflow)}
                        className={`p-2 rounded-lg transition ${
                          workflow.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={workflow.isActive ? 'Pause' : 'Activate'}
                      >
                        {workflow.isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setShowEdit(workflow)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg shrink-0">
                        <TriggerIcon className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">{trigger?.name || 'Trigger'}</span>
                      </div>
                      {workflow.actions.map((action, i) => {
                        const actionDef = actionTypes[action.type];
                        const ActionIcon = actionDef ? getIcon(actionDef.icon) : Zap;
                        return (
                          <React.Fragment key={action.id}>
                            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg shrink-0">
                              <ActionIcon className="w-4 h-4 text-indigo-600" />
                              <span className="text-sm font-medium text-indigo-700">
                                {actionDef?.name || action.type}
                              </span>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Workflow</h3>
                <p className="text-sm text-gray-500">Step {createStep} of 4</p>
              </div>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setCreateStep(1);
                  setNewWorkflow({
                    name: '',
                    description: '',
                    trigger: { type: '', config: {} },
                    conditions: [],
                    actions: [],
                  });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Name & Description */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name *</label>
                    <input
                      type="text"
                      value={newWorkflow.name}
                      onChange={e => setNewWorkflow(w => ({ ...w, name: e.target.value }))}
                      placeholder="e.g., Auto-assign new leads"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                    <textarea
                      value={newWorkflow.description}
                      onChange={e => setNewWorkflow(w => ({ ...w, description: e.target.value }))}
                      placeholder="What does this workflow do?"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Select Trigger */}
              {createStep === 2 && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">When should this workflow run?</p>
                  <div className="grid gap-3">
                    {Object.entries(triggerTypes).map(([id, trigger]) => {
                      const Icon = getIcon(trigger.icon);
                      const isSelected = newWorkflow.trigger.type === id;
                      const triggerDef = trigger as TriggerType;
                      const hasFields = triggerDef.fields && triggerDef.fields.length > 0;
                      return (
                        <div key={id} className={`rounded-xl border-2 overflow-hidden transition ${
                          isSelected ? 'border-indigo-500' : 'border-gray-200'
                        }`}>
                          <button
                            onClick={() => setNewWorkflow(w => ({ ...w, trigger: { type: id, config: {} } }))}
                            className={`flex items-center gap-4 p-4 w-full text-left ${
                              isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-indigo-100' : 'bg-gray-100'
                            }`}>
                              <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{trigger.name}</p>
                              <p className="text-sm text-gray-500">{trigger.description}</p>
                            </div>
                          </button>
                          {/* Trigger Config Fields */}
                          {isSelected && hasFields && (
                            <div className="p-4 bg-white border-t border-indigo-100">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Configure Trigger</p>
                              {triggerDef.fields?.map((field: any) =>
                                renderConfigField(
                                  field,
                                  newWorkflow.trigger.config[field.name],
                                  val => updateTriggerConfig({ [field.name]: val }),
                                  newWorkflow.trigger.config
                                )
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Add Actions */}
              {createStep === 3 && (
                <div>
                  <p className="text-sm text-gray-600 mb-4">What should happen when the trigger fires?</p>

                  {/* Current Actions with Config */}
                  {newWorkflow.actions.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <p className="text-sm font-medium text-gray-700">Actions ({newWorkflow.actions.length})</p>
                      {newWorkflow.actions.map((action, index) => {
                        const actionDef = actionTypes[action.type] as TriggerType;
                        const Icon = actionDef ? getIcon(actionDef.icon) : Zap;
                        const hasFields = actionDef?.fields && actionDef.fields.length > 0;
                        const isConfiguring = configuringAction === index;

                        return (
                          <div key={action.id} className="border border-indigo-200 rounded-xl overflow-hidden">
                            <div
                              className="flex items-center gap-3 p-3 bg-indigo-50 cursor-pointer"
                              onClick={() => hasFields && setConfiguringAction(isConfiguring ? null : index)}
                            >
                              <span className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                                {index + 1}
                              </span>
                              <Icon className="w-5 h-5 text-indigo-600" />
                              <span className="flex-1 font-medium text-indigo-700">{actionDef?.name || action.type}</span>
                              {hasFields && (
                                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${isConfiguring ? 'rotate-180' : ''}`} />
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); removeAction(index); }}
                                className="p-1 text-indigo-400 hover:text-red-600 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Config Fields */}
                            {isConfiguring && hasFields && (
                              <div className="p-4 bg-white border-t border-indigo-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Configure Action</p>
                                {actionDef.fields?.map((field: any) =>
                                  renderConfigField(
                                    field,
                                    action.config[field.name],
                                    val => updateActionConfig(index, { [field.name]: val }),
                                    action.config
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Action */}
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-gray-700">Add an action</p>
                    {Object.entries(actionTypes).map(([id, action]) => {
                      const Icon = getIcon(action.icon);
                      return (
                        <button
                          key={id}
                          onClick={() => addAction(id)}
                          className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{action.name}</p>
                            <p className="text-sm text-gray-500">{action.description}</p>
                          </div>
                          <Plus className="w-5 h-5 text-gray-400 ml-auto" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {createStep === 4 && (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-500 mb-1">Workflow Name</p>
                    <p className="text-lg font-semibold text-gray-900">{newWorkflow.name}</p>
                    {newWorkflow.description && (
                      <p className="text-sm text-gray-600 mt-1">{newWorkflow.description}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">Trigger</p>
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
                      {(() => {
                        const trigger = triggerTypes[newWorkflow.trigger.type];
                        const Icon = trigger ? getIcon(trigger.icon) : Zap;
                        return (
                          <>
                            <Icon className="w-5 h-5 text-amber-600" />
                            <span className="font-medium text-amber-700">
                              {trigger?.name || newWorkflow.trigger.type}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">
                      Actions ({newWorkflow.actions.length})
                    </p>
                    <div className="space-y-2">
                      {newWorkflow.actions.map((action, index) => {
                        const actionDef = actionTypes[action.type];
                        const Icon = actionDef ? getIcon(actionDef.icon) : Zap;
                        return (
                          <div
                            key={action.id}
                            className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl"
                          >
                            <span className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                              {index + 1}
                            </span>
                            <Icon className="w-5 h-5 text-indigo-600" />
                            <span className="font-medium text-indigo-700">{actionDef?.name || action.type}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-between">
              <button
                onClick={() => {
                  if (createStep > 1) setCreateStep(createStep - 1);
                  else {
                    setShowCreate(false);
                    setNewWorkflow({
                      name: '',
                      description: '',
                      trigger: { type: '', config: {} },
                      conditions: [],
                      actions: [],
                    });
                  }
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
              >
                {createStep > 1 ? 'Back' : 'Cancel'}
              </button>

              {createStep < 4 ? (
                <button
                  onClick={() => setCreateStep(createStep + 1)}
                  disabled={
                    (createStep === 1 && !newWorkflow.name.trim()) ||
                    (createStep === 2 && !newWorkflow.trigger.type) ||
                    (createStep === 3 && newWorkflow.actions.length === 0)
                  }
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={createWorkflow}
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Create Workflow
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Workflow Modal */}
      {showEdit && (
        <EditWorkflowModal
          workflow={showEdit}
          triggerTypes={triggerTypes}
          actionTypes={actionTypes}
          onClose={() => setShowEdit(null)}
          onSave={async (updated) => {
            try {
              const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
              const res = await fetch('/api/crm-site/workflows', {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  tenantSlug,
                  workflowId: updated.id,
                  ...updated,
                }),
              });
              if (res.ok) {
                setShowEdit(null);
                fetchWorkflows();
              }
            } catch (err) {
              console.error('Failed to update workflow:', err);
            }
          }}
          getIcon={getIcon}
          renderConfigField={renderConfigField}
        />
      )}
    </div>
  );
}

// Edit Workflow Modal Component
function EditWorkflowModal({
  workflow,
  triggerTypes,
  actionTypes,
  onClose,
  onSave,
  getIcon,
  renderConfigField,
}: {
  workflow: Workflow;
  triggerTypes: Record<string, TriggerType>;
  actionTypes: Record<string, ActionType>;
  onClose: () => void;
  onSave: (w: Workflow) => Promise<void>;
  getIcon: (name: string) => any;
  renderConfigField: (field: any, value: any, onChange: (v: any) => void, config: any) => React.ReactNode;
}) {
  const [edited, setEdited] = useState<Workflow>(() => ({
    ...workflow,
    actions: workflow.actions.map((a, i) => ({ ...a, order: i })),
  }));
  const [saving, setSaving] = useState(false);
  const [configuringAction, setConfiguringAction] = useState<number | null>(null);

  const trigger = triggerTypes[edited.trigger.type];
  const TriggerIcon = trigger ? getIcon(trigger.icon) : Zap;

  const addAction = (actionType: string) => {
    const newIndex = edited.actions.length;
    setEdited(e => ({
      ...e,
      actions: [...e.actions, { id: `action-${Date.now()}`, type: actionType, config: {}, order: newIndex }],
    }));
    const actionDef = actionTypes[actionType];
    if (actionDef?.fields && actionDef.fields.length > 0) {
      setConfiguringAction(newIndex);
    }
  };

  const removeAction = (index: number) => {
    setEdited(e => ({
      ...e,
      actions: e.actions.filter((_, i) => i !== index).map((a, i) => ({ ...a, order: i })),
    }));
    if (configuringAction === index) setConfiguringAction(null);
  };

  const updateActionConfig = (index: number, config: Record<string, any>) => {
    setEdited(e => ({
      ...e,
      actions: e.actions.map((a, i) => (i === index ? { ...a, config: { ...a.config, ...config } } : a)),
    }));
  };

  const updateTriggerConfig = (config: Record<string, any>) => {
    setEdited(e => ({
      ...e,
      trigger: { ...e.trigger, config: { ...e.trigger.config, ...config } },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(edited);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Edit Workflow</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
              <input
                type="text"
                value={edited.name}
                onChange={e => setEdited(w => ({ ...w, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={edited.description || ''}
                onChange={e => setEdited(w => ({ ...w, description: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Trigger</p>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <TriggerIcon className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-700">{trigger?.name || edited.trigger.type}</span>
              </div>
              {trigger?.fields && trigger.fields.length > 0 && (
                <div className="pt-3 border-t border-amber-200">
                  {trigger.fields.map((field: any) =>
                    renderConfigField(
                      field,
                      edited.trigger.config[field.name],
                      val => updateTriggerConfig({ [field.name]: val }),
                      edited.trigger.config
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Actions ({edited.actions.length})</p>
            <div className="space-y-3">
              {edited.actions.map((action, index) => {
                const actionDef = actionTypes[action.type];
                const Icon = actionDef ? getIcon(actionDef.icon) : Zap;
                const hasFields = actionDef?.fields && actionDef.fields.length > 0;
                const isConfiguring = configuringAction === index;

                return (
                  <div key={action.id} className="border border-indigo-200 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center gap-3 p-3 bg-indigo-50 cursor-pointer"
                      onClick={() => hasFields && setConfiguringAction(isConfiguring ? null : index)}
                    >
                      <span className="w-6 h-6 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                        {index + 1}
                      </span>
                      <Icon className="w-5 h-5 text-indigo-600" />
                      <span className="flex-1 font-medium text-indigo-700">{actionDef?.name || action.type}</span>
                      {hasFields && (
                        <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${isConfiguring ? 'rotate-180' : ''}`} />
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); removeAction(index); }}
                        className="p-1 text-indigo-400 hover:text-red-600 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {isConfiguring && hasFields && (
                      <div className="p-4 bg-white border-t border-indigo-100">
                        {actionDef.fields?.map((field: any) =>
                          renderConfigField(
                            field,
                            action.config[field.name],
                            val => updateActionConfig(index, { [field.name]: val }),
                            action.config
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add action dropdown */}
            <div className="mt-4">
              <select
                onChange={e => { if (e.target.value) { addAction(e.target.value); e.target.value = ''; } }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-600"
              >
                <option value="">+ Add Action...</option>
                {Object.entries(actionTypes).map(([id, action]) => (
                  <option key={id} value={id}>{action.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !edited.name.trim()}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
