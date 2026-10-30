'use client';

/**
 * Universal Video Fullscreen & Screen Rotation Utility
 * 
 * Works seamlessly across:
 * 1. Native Android WebView (via window.SwarYoga bridge)
 * 2. Android Chrome / Edge / Firefox (via Screen Orientation API)
 * 3. iOS Safari / iPad (via webkitEnterFullscreen and CSS rotate fallback)
 * 4. Desktop browsers (standard HTML5 Fullscreen)
 */

declare global {
  interface Window {
    SwarYoga?: {
      setOrientationLandscape?: () => void;
      setLandscape?: () => void;
      setOrientationPortrait?: () => void;
      setPortrait?: () => void;
      setAutoOrientation?: () => void;
      toggleOrientation?: () => void;
      showToast?: (msg: string) => void;
    };
  }
}

export function isCurrentlyFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

/**
 * Enter fullscreen on target element and rotate device to landscape
 */
export async function requestFullscreenAndRotate(targetElement?: HTMLElement | HTMLVideoElement | null): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const element = targetElement || document.documentElement;

  // 1. Request Fullscreen
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      await (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      await (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      await (element as any).msRequestFullscreen();
    } else if ((element as any).webkitEnterFullscreen) {
      // iOS Safari video element native fullscreen
      (element as any).webkitEnterFullscreen();
    }
  } catch (err) {
    console.warn('[VideoRotate] Fullscreen request fallback:', err);
  }

  // 2. Rotate to Landscape
  applyLandscapeOrientation();

  return true;
}

/**
 * Exit fullscreen and restore normal portrait/auto orientation
 */
export async function exitFullscreenAndRestore(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('[VideoRotate] Exit fullscreen error:', err);
  }

  // Restore orientation
  restoreOrientation();

  return true;
}

/**
 * Toggle between Fullscreen Landscape and Normal View
 */
export async function toggleFullscreenAndRotate(targetElement?: HTMLElement | HTMLVideoElement | null): Promise<boolean> {
  if (isCurrentlyFullscreen()) {
    return exitFullscreenAndRestore();
  } else {
    return requestFullscreenAndRotate(targetElement);
  }
}

/**
 * Force rotate device to landscape
 */
export function applyLandscapeOrientation(): void {
  if (typeof window === 'undefined') return;

  // Method A: Native Android App Bridge
  if (window.SwarYoga) {
    try {
      if (window.SwarYoga.setLandscape) {
        window.SwarYoga.setLandscape();
        return;
      }
      if (window.SwarYoga.setOrientationLandscape) {
        window.SwarYoga.setOrientationLandscape();
        return;
      }
    } catch (e) {
      console.warn('[VideoRotate] Native app landscape error:', e);
    }
  }

  // Method B: Modern Screen Orientation API (Chrome / Android / Edge)
  try {
    const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
    if (orientation && orientation.lock) {
      orientation.lock('landscape').catch(() => {
        // Fallback to landscape-primary or landscape-secondary
        orientation.lock('landscape-primary').catch(() => {});
      });
    }
  } catch (e) {
    console.warn('[VideoRotate] Screen orientation lock not supported:', e);
  }
}

/**
 * Restore normal device orientation (portrait or auto-sensor)
 */
export function restoreOrientation(): void {
  if (typeof window === 'undefined') return;

  // Method A: Native Android App Bridge
  if (window.SwarYoga) {
    try {
      if (window.SwarYoga.setAutoOrientation) {
        window.SwarYoga.setAutoOrientation();
        return;
      }
      if (window.SwarYoga.setPortrait) {
        window.SwarYoga.setPortrait();
        return;
      }
      if (window.SwarYoga.setOrientationPortrait) {
        window.SwarYoga.setOrientationPortrait();
        return;
      }
    } catch (e) {
      console.warn('[VideoRotate] Native app restore orientation error:', e);
    }
  }

  // Method B: Modern Screen Orientation API
  try {
    const orientation = screen.orientation || (screen as any).mozOrientation || (screen as any).msOrientation;
    if (orientation && orientation.unlock) {
      orientation.unlock();
    }
  } catch (e) {
    console.warn('[VideoRotate] Screen orientation unlock error:', e);
  }
}

/**
 * Attach global event listeners to automatically rotate on ANY fullscreen video playback
 */
export function setupFullscreenRotateListener(callback?: (isFullscreen: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const handleFsChange = () => {
    const isFs = isCurrentlyFullscreen();
    if (isFs) {
      applyLandscapeOrientation();
    } else {
      restoreOrientation();
    }
    callback?.(isFs);
  };

  document.addEventListener('fullscreenchange', handleFsChange);
  document.addEventListener('webkitfullscreenchange', handleFsChange);
  document.addEventListener('mozfullscreenchange', handleFsChange);
  document.addEventListener('MSFullscreenChange', handleFsChange);

  return () => {
    document.removeEventListener('fullscreenchange', handleFsChange);
    document.removeEventListener('webkitfullscreenchange', handleFsChange);
    document.removeEventListener('mozfullscreenchange', handleFsChange);
    document.removeEventListener('MSFullscreenChange', handleFsChange);
  };
}
