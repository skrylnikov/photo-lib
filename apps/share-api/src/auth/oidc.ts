import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { randomBytes, createHash } from 'node:crypto';

import { appConfig } from 'config';

import { issueSession } from './session';
import { hasExpectedNonce, isAllowedIdentity, type OidcIdentity } from './security';

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

type PendingLogin = {
  state: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
};

const pendingLogins = new Map<string, PendingLogin>();
let discoveryCache: { value: Discovery; expiresAt: number } | undefined;

const safeString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const groupsFromClaims = (payload: JWTPayload): string[] => {
  const values = [payload.groups, payload['group'], payload['roles']];
  return values.flatMap((value) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
    return [];
  });
};

const getDiscovery = async (): Promise<Discovery> => {
  if (!appConfig.oidc.issuer) throw new Error('oidc_not_configured');
  if (discoveryCache && discoveryCache.expiresAt > Date.now()) {
    return discoveryCache.value;
  }

  const response = await fetch(
    `${appConfig.oidc.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`,
  );
  if (!response.ok) throw new Error('oidc_discovery_failed');

  const value = (await response.json()) as Partial<Discovery>;
  if (
    value.issuer !== appConfig.oidc.issuer ||
    !value.authorization_endpoint ||
    !value.token_endpoint ||
    !value.jwks_uri
  ) {
    throw new Error('oidc_discovery_invalid');
  }

  const discovery = value as Discovery;
  discoveryCache = { value: discovery, expiresAt: Date.now() + 5 * 60 * 1000 };
  return discovery;
};

const codeChallenge = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

export const beginLogin = async (): Promise<string> => {
  const discovery = await getDiscovery();
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(48).toString('base64url');
  pendingLogins.set(state, {
    state,
    nonce,
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', appConfig.oidc.clientId);
  url.searchParams.set('redirect_uri', appConfig.oidc.redirectUri);
  url.searchParams.set('scope', 'openid profile email groups');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge(codeVerifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
};

export const finishLogin = async (code: string | undefined, state: string | undefined) => {
  const pending = state ? pendingLogins.get(state) : undefined;
  if (state) pendingLogins.delete(state);
  if (!pending || pending.expiresAt <= Date.now() || !code) {
    throw new Error('oidc_callback_invalid');
  }

  const discovery = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: appConfig.oidc.redirectUri,
    client_id: appConfig.oidc.clientId,
    code_verifier: pending.codeVerifier,
  });
  if (appConfig.oidc.clientSecret) body.set('client_secret', appConfig.oidc.clientSecret);

  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenResponse.ok) throw new Error('oidc_token_exchange_failed');

  const tokens = (await tokenResponse.json()) as { id_token?: unknown };
  const idToken = safeString(tokens.id_token);
  if (!idToken) throw new Error('oidc_id_token_missing');

  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
  const verified = await jwtVerify(idToken, jwks, {
    issuer: appConfig.oidc.issuer,
    audience: appConfig.oidc.clientId,
  });
  if (!hasExpectedNonce(verified.payload.nonce, pending.nonce)) throw new Error('oidc_nonce_invalid');
  const subject = safeString(verified.payload.sub);
  if (!subject) throw new Error('oidc_subject_missing');

  const identity: OidcIdentity = { subject, groups: groupsFromClaims(verified.payload) };
  if (!isAllowedIdentity(identity, appConfig.oidc.allowedSubjects, appConfig.oidc.allowedGroups)) throw new Error('oidc_identity_not_allowed');

  return issueSession(identity.subject, identity.groups);
};

export const purgePendingLogins = (): void => {
  const now = Date.now();
  for (const [state, pending] of pendingLogins) {
    if (pending.expiresAt <= now) pendingLogins.delete(state);
  }
};
