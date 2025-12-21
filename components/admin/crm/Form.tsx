'use client';

import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string | number }[];
  rows?: number;
  className?: string;
}

/**
 * FormField - Reusable form input with error display
 */
export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  required,
  disabled,
  options,
  rows = 4,
  className = '',
}: FormFieldProps) {
  const hasError = touched && error;

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-200 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors ${
            hasError
              ? 'border-red-500 focus:border-red-500'
              : 'border-slate-700'
          }`}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors ${
            hasError
              ? 'border-red-500 focus:border-red-500'
              : 'border-slate-700'
          }`}
        >
          <option value="">Select {label}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors ${
            hasError
              ? 'border-red-500 focus:border-red-500'
              : 'border-slate-700'
          }`}
        />
      )}

      {hasError && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Form - Reusable form wrapper
 */
interface FormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  layout?: 'single' | 'double';
  className?: string;
}

export function Form({ onSubmit, children, layout = 'single', className = '' }: FormProps) {
  const containerClass =
    layout === 'double'
      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
      : 'flex flex-col gap-2';

  return (
    <form onSubmit={onSubmit} className={className}>
      <div className={containerClass}>{children}</div>
    </form>
  );
}

/**
 * FormGroup - Group related form fields
 */
export function FormGroup({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
      {children}
    </div>
  );
}

/**
 * FormActions - Submit and cancel buttons
 */
export function FormActions({
  onSubmit,
  onCancel,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  className = '',
}: {
  onSubmit: () => void;
  onCancel?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 justify-end mt-6 ${className}`}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
        >
          {cancelText}
        </button>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Saving...' : submitText}
      </button>
    </div>
  );
}
