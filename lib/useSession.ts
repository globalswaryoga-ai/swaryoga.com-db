// Session Checker Hook - Use this to protect pages and check session validity
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isLoggedIn, getRemainingSessionTime, getFormattedRemainingTime } from '@/lib/sessionManager';

export interface UseSessionResult {
  isLoggedIn: boolean;
  session: any | null;
  remainingTime: number;
  formattedTime: string;
  isChecking: boolean;
}

/**
 * Hook to check session status and redirect if not authenticated
 * Usage in protected pages:
 * 
 * const { isLoggedIn, isChecking } = useSession();
 * if (!isChecking && !isLoggedIn) return <RedirectToLogin />;
 */
export const useSession = (): UseSessionResult => {
  const [isLoggedInState, setIsLoggedInState] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [formattedTime, setFormattedTime] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = () => {
      const sessionValid = isLoggedIn();
      const sessionData = getSession();
      const remaining = getRemainingSessionTime();
      const formatted = getFormattedRemainingTime();

      setIsLoggedInState(sessionValid);
      setSession(sessionData);
      setRemainingTime(remaining);
      setFormattedTime(formatted);
      setIsChecking(false);
    };

    checkSession();

    // Re-check session every minute (60000ms)
    const interval = setInterval(checkSession, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    isLoggedIn: isLoggedInState,
    session,
    remainingTime,
    formattedTime,
    isChecking
  };
};

/**
 * Hook to protect a page - redirects to signin if not logged in
 * Usage: useProtectedPage() at the start of your component
 */
export const useProtectedPage = () => {
  const router = useRouter();
  const { isLoggedIn, isChecking } = useSession();

  useEffect(() => {
    if (!isChecking && !isLoggedIn) {
      router.push('/signin?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [isLoggedIn, isChecking, router]);

  return { isLoggedIn, isChecking };
};
