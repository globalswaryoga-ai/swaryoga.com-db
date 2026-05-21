'use client';

import { useState } from 'react';

export default function BackupUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setMessage(`✅ Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setMessage('❌ Please select a file');
      return;
    }

    if (!apiKey) {
      setMessage('❌ Please enter your API key');
      return;
    }

    setLoading(true);
    setMessage('📤 Uploading... (this may take a few minutes)');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/backup/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`
✅ SUCCESS! File uploaded to Bunny

📋 Details:
  • File: ${data.file.name}
  • Size: ${data.file.size}
  • Location: ${data.file.location}
  • Zone: ${data.file.zone}

📅 Next Steps:
  1. Automatic backups start tomorrow at 2:00 AM UTC
  2. Check Bunny dashboard to verify file
  3. Go to /api/backup/status to verify

✨ Your backup is now safe in Bunny CDN!
        `);
      } else {
        setMessage(`❌ Upload failed: ${data.error}\n\n${data.details || ''}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '30px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
    }}>
      <h1>📤 Manual Backup Upload to Bunny</h1>

      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* API Key Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            API Key (BACKUP_API_KEY):
          </label>
          <input
            type="password"
            placeholder="Enter your BACKUP_API_KEY"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          />
          <small style={{ color: '#666' }}>
            Find this in your .env.local or use: 9be8553001e2e229835636397e6d15a7450a152a11be870be2aba661f1b46cd8
          </small>
        </div>

        {/* File Selection */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select Backup File:
          </label>
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".tar.gz,.tar,.gz,.zip"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              border: '2px dashed #007bff',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          />
          <small style={{ color: '#666' }}>
            Choose your backup file (tar.gz, tar, zip, etc.)
            <br />
            From: /Users/mohankalburgi/Downloads/restore-6a0e9f37dc17afa1aebd2d25
          </small>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !file}
          style={{
            padding: '12px',
            backgroundColor: loading || !file ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading || !file ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Uploading...' : '📤 Upload to Bunny'}
        </button>
      </form>

      {/* Message Display */}
      {message && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '4px',
          backgroundColor: message.includes('SUCCESS') ? '#d4edda' : message.includes('Selected') ? '#d1ecf1' : '#f8d7da',
          color: message.includes('SUCCESS') ? '#155724' : message.includes('Selected') ? '#0c5460' : '#721c24',
          border: `1px solid ${message.includes('SUCCESS') ? '#c3e6cb' : message.includes('Selected') ? '#bee5eb' : '#f5c6cb'}`,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.6',
        }}>
          {message}
        </div>
      )}

      <hr style={{ margin: '30px 0' }} />

      <h3>📋 Instructions:</h3>
      <ol style={{ lineHeight: '1.8' }}>
        <li><strong>Locate your backup file:</strong> /Users/mohankalburgi/Downloads/restore-6a0e9f37dc17afa1aebd2d25</li>
        <li><strong>Compress it first</strong> (if not already compressed):
          <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
tar -czf ~/Downloads/backup.tar.gz ~/Downloads/restore-6a0e9f37dc17afa1aebd2d25
          </pre>
        </li>
        <li><strong>Enter your API key</strong> above</li>
        <li><strong>Click "Upload to Bunny"</strong> button</li>
        <li><strong>Wait for upload to complete</strong> (may take 5-10 minutes for large files)</li>
        <li><strong>Verify in Bunny dashboard</strong> - Check backupmobgo zone</li>
      </ol>

      <h3>🔑 API Key Location:</h3>
      <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
# In .env.local:
BACKUP_API_KEY=9be8553001e2e229835636397e6d15a7450a152a11be870be2aba661f1b46cd8
      </pre>

      <h3>📍 Destination:</h3>
      <p>File will be uploaded to:</p>
      <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
Bunny Zone: backupmobgo
Path: /backups/mongodb/2026-05-21/backup.tar.gz
      </pre>
    </div>
  );
}
