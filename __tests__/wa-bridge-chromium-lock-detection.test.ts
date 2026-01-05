describe('wa-bridge chromium lock detection', () => {
  /**
   * Keep this test simple and string-based.
   * We don't want to import/execute `qrServer.js` in Jest because it starts an HTTP server.
   */
  function isChromiumProfileLockError(err: unknown) {
    const msg = String((err as any)?.message || err || '');
    return msg.includes('process_singleton_posix.cc') || msg.includes('profile appears to be in use');
  }

  it('detects the canonical singleton lock error', () => {
    const err = new Error(
      'Failed to launch the browser process!\nprocess_singleton_posix.cc:358 The profile appears to be in use by another Chromium process (14)...'
    );
    expect(isChromiumProfileLockError(err)).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isChromiumProfileLockError(new Error('Target closed'))).toBe(false);
  });
});
