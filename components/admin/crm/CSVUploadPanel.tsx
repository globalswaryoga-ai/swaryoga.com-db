'use client';

import React, { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  parseCSVText,
  autoDetectColumns,
  detectPhoneByData,
  normalizePhoneCSV,
  type CSVColumnMap,
  type CSVContact,
} from '@/lib/utils/csvParser';

export type { CSVContact, CSVColumnMap };

export interface CSVUploadPanelProps {
  /** Which columns to show in preview. Defaults to ['name','phone','email'] */
  previewColumns?: ('name' | 'phone' | 'email' | 'workshop' | 'amount' | 'status' | 'source' | 'date' | 'address' | 'customerId' | 'labels')[];
  /** Called when contacts are successfully parsed */
  onContactsParsed: (contacts: CSVContact[], columnMap: CSVColumnMap, fileName: string) => void;
  /** Called when CSV is removed */
  onRemove?: () => void;
  /** Optional: parsed contacts (for external state control) */
  contacts?: CSVContact[];
  /** Optional: file name (for external state control) */
  fileName?: string;
  /** Optional: column map (for external state control) */
  columnMap?: CSVColumnMap | null;
  /** Optional: existing phone numbers to check "In DB?" */
  existingPhones?: Set<string>;
  /** Label for the action. Default: "Upload CSV" */
  label?: string;
  /** Accent color. Default: green */
  accent?: 'green' | 'blue' | 'purple' | 'teal';
}

const accentClasses = {
  green: {
    border: 'border-green-200',
    bg: 'bg-green-50/50',
    headerBg: 'bg-green-100',
    headerText: 'text-green-800',
    rowBorder: 'border-green-100',
    text: 'text-green-800',
    textLight: 'text-green-600',
    btn: 'border-green-300 hover:bg-green-50 text-green-700',
    hoverBorder: 'hover:border-green-400',
    footerBg: 'bg-green-50',
  },
  blue: {
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    headerBg: 'bg-blue-100',
    headerText: 'text-blue-800',
    rowBorder: 'border-blue-100',
    text: 'text-blue-800',
    textLight: 'text-blue-600',
    btn: 'border-blue-300 hover:bg-blue-50 text-blue-700',
    hoverBorder: 'hover:border-blue-400',
    footerBg: 'bg-blue-50',
  },
  purple: {
    border: 'border-purple-200',
    bg: 'bg-purple-50/50',
    headerBg: 'bg-purple-100',
    headerText: 'text-purple-800',
    rowBorder: 'border-purple-100',
    text: 'text-purple-800',
    textLight: 'text-purple-600',
    btn: 'border-purple-300 hover:bg-purple-50 text-purple-700',
    hoverBorder: 'hover:border-purple-400',
    footerBg: 'bg-purple-50',
  },
  teal: {
    border: 'border-teal-200',
    bg: 'bg-teal-50/50',
    headerBg: 'bg-teal-100',
    headerText: 'text-teal-800',
    rowBorder: 'border-teal-100',
    text: 'text-teal-800',
    textLight: 'text-teal-600',
    btn: 'border-teal-300 hover:bg-teal-50 text-teal-700',
    hoverBorder: 'hover:border-teal-400',
    footerBg: 'bg-teal-50',
  },
};

const columnLabels: Record<string, { icon: string; label: string; mapKey: keyof CSVColumnMap }> = {
  name: { icon: '👤', label: 'Name', mapKey: 'name' },
  phone: { icon: '📱', label: 'Phone', mapKey: 'phone' },
  email: { icon: '✉️', label: 'Email', mapKey: 'email' },
  workshop: { icon: '🎓', label: 'Workshop', mapKey: 'workshop' },
  amount: { icon: '💰', label: 'Amount', mapKey: 'amount' },
  status: { icon: '📊', label: 'Status', mapKey: 'status' },
  source: { icon: '📌', label: 'Source', mapKey: 'source' },
  date: { icon: '📅', label: 'Date', mapKey: 'date' },
  address: { icon: '📍', label: 'Address', mapKey: 'address' },
  customerId: { icon: '🆔', label: 'ID', mapKey: 'customerId' },
  labels: { icon: '🏷️', label: 'Labels', mapKey: 'labels' },
};

export default function CSVUploadPanel({
  previewColumns = ['name', 'phone', 'email'],
  onContactsParsed,
  onRemove,
  contacts: externalContacts,
  fileName: externalFileName,
  columnMap: externalColumnMap,
  existingPhones,
  label = 'Upload CSV — Auto-detect Name, Phone, Email',
  accent = 'green',
}: CSVUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [internalContacts, setInternalContacts] = useState<CSVContact[]>([]);
  const [internalFileName, setInternalFileName] = useState('');
  const [internalColumnMap, setInternalColumnMap] = useState<CSVColumnMap | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Use external state if provided, otherwise internal
  const contacts = externalContacts ?? internalContacts;
  const fileName = externalFileName ?? internalFileName;
  const columnMap = externalColumnMap !== undefined ? externalColumnMap : internalColumnMap;

  const colors = accentClasses[accent];

  /** Shared processing: takes headers + rows (Record<string,string>[]) and produces contacts */
  const processRows = useCallback((headers: string[], rows: Record<string, string>[], fileName: string) => {
    if (headers.length === 0 || rows.length === 0) {
      setError('No data found in file');
      setParsing(false);
      return;
    }

    const colMap = autoDetectColumns(headers);

    // Fallback phone detection from data
    if (!colMap.phone) {
      colMap.phone = detectPhoneByData(headers, rows);
    }

    if (!colMap.phone) {
      setError(`Could not detect phone column. Found columns: ${headers.join(', ')}`);
      setParsing(false);
      return;
    }

    // Parse and deduplicate contacts
    const parsed: CSVContact[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const rawPhone = row[colMap.phone] || '';
      const phone = normalizePhoneCSV(rawPhone);
      if (!phone || phone.length < 10 || seen.has(phone)) continue;
      seen.add(phone);
      parsed.push({
        name: colMap.name ? row[colMap.name]?.trim() : undefined,
        phoneNumber: phone,
        email: colMap.email ? row[colMap.email]?.trim() : undefined,
        raw: row,
      });
    }

    if (parsed.length === 0) {
      setError('No valid phone numbers found in file');
      setParsing(false);
      return;
    }

    setInternalContacts(parsed);
    setInternalColumnMap(colMap);
    setShowPreview(true);
    onContactsParsed(parsed, colMap, fileName);
    setParsing(false);
  }, [onContactsParsed]);

  const isExcelFile = (name: string) => /\.(xlsx|xls)$/i.test(name);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setError(null);
    setInternalFileName(file.name);

    if (isExcelFile(file.name)) {
      // --- Excel path ---
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
          if (!jsonRows.length) {
            setError('Excel file is empty');
            setParsing(false);
            return;
          }
          // Convert all values to strings and collect headers
          const headers = Object.keys(jsonRows[0]);
          const rows: Record<string, string>[] = jsonRows.map(r => {
            const out: Record<string, string> = {};
            for (const h of headers) out[h] = String(r[h] ?? '');
            return out;
          });
          processRows(headers, rows, file.name);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
          setParsing(false);
        }
      };
      reader.onerror = () => { setError('Failed to read file'); setParsing(false); };
      reader.readAsArrayBuffer(file);
    } else {
      // --- CSV / TSV / TXT path ---
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const { headers, rows } = parseCSVText(text);
          processRows(headers, rows, file.name);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse CSV');
          setParsing(false);
        }
      };
      reader.onerror = () => { setError('Failed to read file'); setParsing(false); };
      reader.readAsText(file);
    }

    if (fileRef.current) fileRef.current.value = '';
  }, [onContactsParsed, processRows]);

  const handleRemove = useCallback(() => {
    setInternalContacts([]);
    setInternalFileName('');
    setInternalColumnMap(null);
    setError(null);
    setShowPreview(false);
    onRemove?.();
  }, [onRemove]);

  const getColumnValue = (contact: CSVContact, col: string): string => {
    const meta = columnLabels[col];
    if (!meta || !columnMap) return '—';
    const key = meta.mapKey;
    const csvHeader = columnMap[key];
    if (!csvHeader) return '—';
    if (col === 'phone') return contact.phoneNumber;
    if (col === 'name') return contact.name || '—';
    if (col === 'email') return contact.email || '—';
    return contact.raw[csvHeader]?.trim() || '—';
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,.tsv,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />

      {contacts.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className={`w-full border-2 border-dashed border-gray-300 ${colors.hoverBorder} rounded-xl p-4 flex items-center justify-center gap-3 text-gray-500 hover:text-gray-700 transition-all duration-200 hover:bg-gray-50/30 group`}
        >
          {parsing ? (
            <span className="animate-spin text-xl">⏳</span>
          ) : (
            <span className="text-2xl group-hover:scale-110 transition-transform">📄</span>
          )}
          <span className="font-medium">
            {parsing ? 'Parsing file...' : label}
          </span>
        </button>
      ) : (
        <div className={`border-2 ${colors.border} ${colors.bg} rounded-xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span className={`font-semibold ${colors.text}`}>{fileName}</span>
              <span className={`text-sm ${colors.textLight}`}>— {contacts.length} contacts loaded</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1 text-sm bg-white border ${colors.btn} rounded-lg font-medium transition-colors`}
              >
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>
              <button
                onClick={handleRemove}
                className="px-3 py-1 text-sm bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-600 font-medium transition-colors"
              >
                ✕ Remove
              </button>
            </div>
          </div>

          {/* Detected column badges */}
          {columnMap && (
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              {previewColumns.map(col => {
                const meta = columnLabels[col];
                if (!meta) return null;
                const detected = columnMap[meta.mapKey];
                if (!detected) return null;
                return (
                  <span key={col} className="px-2 py-1 bg-white/80 border border-gray-200 text-gray-700 rounded-full">
                    {meta.icon} {meta.label} → {detected}
                  </span>
                );
              })}
            </div>
          )}

          {/* Preview table */}
          {showPreview && (
            <div className={`mt-3 max-h-[200px] overflow-auto rounded-lg border ${colors.border}`}>
              <table className="w-full text-sm">
                <thead className={`${colors.headerBg} sticky top-0`}>
                  <tr>
                    <th className={`px-3 py-2 text-left ${colors.headerText} font-semibold`}>#</th>
                    {previewColumns.map(col => {
                      const meta = columnLabels[col];
                      if (!meta || !columnMap?.[meta.mapKey]) return null;
                      return (
                        <th key={col} className={`px-3 py-2 text-left ${colors.headerText} font-semibold`}>
                          {meta.label}
                        </th>
                      );
                    })}
                    {existingPhones && (
                      <th className={`px-3 py-2 text-left ${colors.headerText} font-semibold`}>In DB?</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {contacts.slice(0, 50).map((c, i) => {
                    const last10 = c.phoneNumber.replace(/\D/g, '').slice(-10);
                    const existsInDB = existingPhones?.has(last10);
                    return (
                      <tr key={i} className={`border-t ${colors.rowBorder} ${existsInDB ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                        {previewColumns.map(col => {
                          const meta = columnLabels[col];
                          if (!meta || !columnMap?.[meta.mapKey]) return null;
                          return (
                            <td key={col} className={`px-3 py-1.5 text-gray-700 ${col === 'phone' ? 'font-mono text-xs' : ''}`}>
                              {getColumnValue(c, col)}
                            </td>
                          );
                        })}
                        {existingPhones && (
                          <td className="px-3 py-1.5">
                            {existsInDB ? (
                              <span className="text-blue-600 text-xs font-medium">✓ Exists</span>
                            ) : (
                              <span className="text-orange-500 text-xs font-medium">New</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {contacts.length > 50 && (
                <div className={`text-center py-2 text-xs text-gray-500 ${colors.footerBg}`}>
                  ... and {contacts.length - 50} more contacts
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
        </div>
      )}
    </div>
  );
}
