import { createHash, randomBytes } from 'node:crypto';

import { prisma } from 'database';
import { appConfig } from 'config';
import { isSessionActive } from './security';

export type SessionPrincipal = {
  id: string;
  subject: string;
  groups: string[];
  expiresAt: Date;
};

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const developmentSession = (): SessionPrincipal => ({
  id: 'local-development-session',
  subject: 'local-dev-admin',
  groups: ['photo-admins'],
  expiresAt: new Date(Date.now() + appConfig.oidc.sessionLifetimeSeconds * 1000),
});

export const issueSession = async (
  subject: string,
  groups: string[],
): Promise<{ token: string; expiresAt: Date }> => {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + appConfig.oidc.sessionLifetimeSeconds * 1000,
  );

  await prisma.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      subject,
      groupsJson: JSON.stringify(groups),
      expiresAt,
    },
  });

  return { token, expiresAt };
};

export const readSession = async (
  token: string | undefined,
): Promise<SessionPrincipal | null> => {
  if (!token && appConfig.nodeEnv === 'development') return developmentSession();
  if (!token) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!session || !isSessionActive(session)) {
    return null;
  }

  let groups: string[] = [];
  try {
    const parsed: unknown = JSON.parse(session.groupsJson);
    if (Array.isArray(parsed)) {
      groups = parsed.filter((value): value is string => typeof value === 'string');
    }
  } catch {
    groups = [];
  }

  return {
    id: session.id,
    subject: session.subject,
    groups,
    expiresAt: session.expiresAt,
  };
};

export const revokeSession = async (token: string | undefined): Promise<void> => {
  if (!token) return;
  await prisma.adminSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};
