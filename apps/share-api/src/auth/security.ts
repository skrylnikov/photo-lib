export type OidcIdentity = { subject: string; groups: string[] };

export const isAllowedIdentity = (
  identity: OidcIdentity,
  allowedSubjects: readonly string[],
  allowedGroups: readonly string[],
): boolean =>
  allowedSubjects.includes(identity.subject) ||
  identity.groups.some((group) => allowedGroups.includes(group));

export const hasExpectedNonce = (actual: unknown, expected: string): boolean =>
  typeof actual === 'string' && actual === expected;

export const isSessionActive = (
  session: { revokedAt: Date | null; expiresAt: Date },
  now = new Date(),
): boolean => session.revokedAt === null && session.expiresAt > now;
