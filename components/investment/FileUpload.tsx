/**
 * File Upload Component
 * Drag-and-drop file upload with validation
 */

import React, { useState } from 'react';
import { FILE_UPLOAD } from '@/lib/investment-constants';

interface FileUploadProps {
  label: string;
  name: string;
  onFileChange: (file: File | null) => void;
  error?: string;
  accept?: string;
  required?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  name,
  onFileChange,
  error,
  accept = '.pdf,.jpg,.jpeg,.png',
  required,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.size > FILE_UPLOAD.MAX_SIZE_BYTES) {
      alert(`File size exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit`);
      return;
    }

    setFileName(file.name);
    onFileChange(file);
  };

  return (
    <div className="mb-4">
      <label className="block text-gray-700 font-semibold mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center
          transition-all duration-200 cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${error ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        <input
          type="file"
          name={name}
          onChange={handleChange}
          accept={accept}
          className="hidden"
          id={name}
          required={required}
        />

        <label htmlFor={name} className="cursor-pointer block">
          <div className="text-4xl mb-2">📁</div>
          <p className="text-gray-700 font-medium">
            {fileName ? `✓ ${fileName}` : 'Drag and drop your file here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to select</p>
          <p className="text-xs text-gray-400 mt-2">Max {FILE_UPLOAD.MAX_SIZE_MB}MB</p>
        </label>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};
