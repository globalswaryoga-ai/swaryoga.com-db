'use client';

import React, { useState } from 'react';
import { Loader } from 'lucide-react';

interface SocialLoginProps {
  onSuccess?: (user: { email: string; name: string; provider: string; id: string }) => void;
  onError?: (error: string) => void;
}

export default function SocialLoginButtons({ onSuccess, onError }: SocialLoginProps) {
  const [loading, setLoading] = useState<string | null>(null);

  // Initialize Google Login
  const handleGoogleLogin = async () => {
    setLoading('google');
    try {
      // Check if google is available
      if (!window.google) {
        throw new Error('Google SDK not loaded');
      }

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        callback: async (response) => {
          try {
            // Send token to backend for verification
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: response.credential }),
            });

            const data = await res.json();

            if (data.success) {
              // Store JWT token
              localStorage.setItem('token', data.token);
              if (onSuccess) {
                onSuccess({
                  email: data.user.email,
                  name: data.user.name,
                  provider: 'google',
                  id: data.user.id,
                });
              }
              // Redirect to dashboard
              window.location.href = '/profile';
            } else {
              throw new Error(data.error || 'Google login failed');
            }
          } catch (error) {
            console.error('Google login error:', error);
            if (onError) onError(error instanceof Error ? error.message : 'Google login failed');
          } finally {
            setLoading(null);
          }
        },
      });

      // Trigger the Google login popup
      window.google.accounts.id.renderButton(document.getElementById('google-login-btn'), {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin',
      });
    } catch (error) {
      console.error('Google SDK error:', error);
      if (onError) onError('Google SDK failed to load. Please try again.');
      setLoading(null);
    }
  };

  // Facebook Login
  const handleFacebookLogin = async () => {
    setLoading('facebook');
    try {
      if (!window.FB) {
        throw new Error('Facebook SDK not loaded');
      }

      window.FB.login(
        async (response) => {
          if (response.authResponse) {
            try {
              // Get user info
              window.FB.api('/me', { fields: 'id,name,email' }, async (userInfo) => {
                // Send to backend for verification
                const res = await fetch('/api/auth/facebook', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: response.authResponse.accessToken,
                    userInfo: userInfo,
                  }),
                });

                const data = await res.json();

                if (data.success) {
                  localStorage.setItem('token', data.token);
                  if (onSuccess) {
                    onSuccess({
                      email: data.user.email,
                      name: data.user.name,
                      provider: 'facebook',
                      id: data.user.id,
                    });
                  }
                  window.location.href = '/profile';
                } else {
                  throw new Error(data.error || 'Facebook login failed');
                }
              });
            } catch (error) {
              console.error('Facebook auth error:', error);
              if (onError) onError(error instanceof Error ? error.message : 'Facebook login failed');
            } finally {
              setLoading(null);
            }
          } else {
            if (onError) onError('Facebook login cancelled');
            setLoading(null);
          }
        },
        { scope: 'public_profile,email' }
      );
    } catch (error) {
      console.error('Facebook SDK error:', error);
      if (onError) onError('Facebook SDK failed to load');
      setLoading(null);
    }
  };

  // Apple Login
  const handleAppleLogin = async () => {
    setLoading('apple');
    try {
      // Apple Sign In requires special handling
      if (!window.AppleID) {
        throw new Error('Apple SDK not loaded');
      }

      window.AppleID.auth.init({
        clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
        teamId: process.env.NEXT_PUBLIC_APPLE_TEAM_ID || '',
        keyId: process.env.NEXT_PUBLIC_APPLE_KEY_ID || '',
        redirectURI: `${window.location.origin}/auth/apple/callback`,
        scope: ['name', 'email'],
        usePopup: true,
      });

      window.AppleID.auth.signIn();
    } catch (error) {
      console.error('Apple SDK error:', error);
      if (onError) onError('Apple Sign In not available. Please use email signup.');
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-swar-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-swar-text-secondary">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading !== null}
          className="flex items-center justify-center px-4 py-2 border border-swar-300 rounded-lg hover:bg-swar-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign in with Google"
        >
          {loading === 'google' ? (
            <Loader className="w-5 h-5 animate-spin text-swar-600" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </>
          )}
        </button>

        {/* Facebook Login */}
        <button
          onClick={handleFacebookLogin}
          disabled={loading !== null}
          className="flex items-center justify-center px-4 py-2 border border-swar-300 rounded-lg hover:bg-swar-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign in with Facebook"
        >
          {loading === 'facebook' ? (
            <Loader className="w-5 h-5 animate-spin text-swar-600" />
          ) : (
            <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
        </button>

        {/* Apple Login */}
        <button
          onClick={handleAppleLogin}
          disabled={loading !== null}
          className="flex items-center justify-center px-4 py-2 border border-swar-300 rounded-lg hover:bg-swar-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign in with Apple"
        >
          {loading === 'apple' ? (
            <Loader className="w-5 h-5 animate-spin text-swar-600" />
          ) : (
            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 13.05c-.59.35-1.18.54-1.69.54-.51 0-1.1-.19-1.69-.54 2.59-1.62 4.33-4.51 4.33-7.85 0-5.02-4.08-9.1-9.1-9.1-5.02 0-9.1 4.08-9.1 9.1 0 3.34 1.74 6.23 4.33 7.85-.59.35-1.18.54-1.69.54-.51 0-1.1-.19-1.69-.54C1.61 11.7 0 9.24 0 6.35 0 2.84 2.84 0 6.35 0c3.51 0 6.35 2.84 6.35 6.35s-2.84 6.35-6.35 6.35c-.5 0-1-.07-1.5-.19l-1.15 1.15c.46.12.94.19 1.42.19 2.13 0 4.07-.87 5.47-2.27 1.4 1.4 3.34 2.27 5.47 2.27.51 0 1.01-.07 1.5-.19z" />
            </svg>
          )}
        </button>
      </div>

      {/* Info Text */}
      <p className="text-xs text-center text-swar-text-secondary mt-4">
        By signing in, you agree to our Terms of Service and Privacy Policy
      </p>

      {/* Script loaders - Add to your layout.tsx or _document.tsx */}
      <script
        async
        src="https://accounts.google.com/gsi/client"
        onLoad={() => {
          // Google SDK loaded
        }}
      />
      <script
        async
        defer
        crossOrigin="anonymous"
        src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0"
        onLoad={() => {
          // Facebook SDK loaded
          if (window.FB) {
            window.FB.init({
              appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
              xfbml: true,
              version: 'v18.0',
            });
          }
        }}
      />
      <script
        async
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid.js"
        onLoad={() => {
          // Apple SDK loaded
        }}
      />
    </div>
  );
}

// Type definitions for global objects
declare global {
  interface Window {
    google?: any;
    FB?: any;
    AppleID?: any;
  }
}
