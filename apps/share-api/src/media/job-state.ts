export const failureTransition = (
  attempts: number,
  maxAttempts: number,
  now = new Date(),
): { terminal: boolean; jobStatus: 'pending' | 'failed'; mediaStatus: 'pending' | 'failed'; availableAt: Date } => {
  const terminal = attempts >= maxAttempts;
  return {
    terminal,
    jobStatus: terminal ? 'failed' : 'pending',
    mediaStatus: terminal ? 'failed' : 'pending',
    availableAt: new Date(now.getTime() + (terminal ? 0 : attempts * 5000)),
  };
};

export const leaseExpired = (leaseExpiresAt: Date | null, now = new Date()): boolean =>
  leaseExpiresAt !== null && leaseExpiresAt <= now;
