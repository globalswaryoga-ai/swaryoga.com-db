'use client';

import { useState } from 'react';

export default function AdminTestPage() {
  const [userId, setUserId] = useState('admincrm');
  const [password, setPassword] = useState('1076Turya@2456');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Testing login...');

    try {
      const response = await fetch('/api/crm-site/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ LOGIN SUCCESS! Token received:');
        console.log('✅ User:', data.user);
        console.log('✅ Token:', data.token);

        // Store in localStorage for testing
        localStorage.setItem('crm_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));

        setMessage(`✅ SUCCESS! Logged in as: ${data.user.name || data.user.userId}`);
      } else {
        setMessage(`❌ LOGIN FAILED: ${data.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px', fontFamily: 'Arial' }}>
      <h1>🔐 Admin Login Test</h1>

      <form onSubmit={testLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="text"
          placeholder="Username/Email"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px',
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Testing...' : '🔓 Test Login'}
        </button>
      </form>

      {message && (
        <div style={{
          marginTop: '20px',
          padding: '10px',
          borderRadius: '4px',
          background: message.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
          color: message.includes('SUCCESS') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('SUCCESS') ? '#c3e6cb' : '#f5c6cb'}`,
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}>
          {message}
        </div>
      )}

      <hr style={{ margin: '20px 0' }} />

      <h3>📋 Debug Info:</h3>
      <p><strong>API Endpoint:</strong> /api/crm-site/login</p>
      <p><strong>Database:</strong> swaryoga_admin_crm</p>
      <p><strong>Collection:</strong> admin_users</p>
      <p><strong>User:</strong> {userId}</p>

      <h3>❓ If Login Fails:</h3>
      <ol>
        <li>Check MongoDB Atlas network whitelist (allow all IPs)</li>
        <li>Verify admin_users collection has the user record</li>
        <li>Check password hash is correct (use bcrypt to verify)</li>
        <li>Check browser console for CORS errors</li>
      </ol>
    </div>
  );
}
