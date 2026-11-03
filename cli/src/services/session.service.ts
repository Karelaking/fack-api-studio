/**
 * Fack CLI — picks the Studio URL and credential for one command.
 *
 * Precedence: `--url` → `.fackrc.json` → `FACK_STUDIO_URL` → last saved
 * session → localhost. Tokens in `FACK_TOKEN` always override the keychain.
 */

import {
  defaultStudioUrl,
  environmentToken,
  getAnySession,
  getSession,
  normalizeStudioUrl,
  type StoredCliSession,
} from "./credentials.service";

export interface ResolvedCliSession {
  studioUrl: string;
  token?: string;
  stored?: StoredCliSession;
}

export function resolveCliSession(
  input: {
    url?: string;
    preferredUrl?: string;
  } = {},
): ResolvedCliSession {
  const explicit = input.url?.trim();
  const preferred = input.preferredUrl?.trim();
  const lastSession = getAnySession();

  const raw =
    explicit ||
    preferred ||
    process.env.FACK_STUDIO_URL?.trim() ||
    lastSession?.studioUrl ||
    defaultStudioUrl();

  const studioUrl = normalizeStudioUrl(raw);
  const stored = getSession(studioUrl);

  return {
    studioUrl,
    token: environmentToken() || stored?.token,
    stored,
  };
}
