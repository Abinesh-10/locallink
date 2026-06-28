import { OAuth2Client } from 'google-auth-library';
import { env } from './env';

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export const googleOAuthClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

export function getGoogleAuthUrl(): string {
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  photoUrl: string | null;
  emailVerified: boolean;
}

/**
 * Exchanges an OAuth callback `code` for tokens, then verifies the ID token
 * and extracts the profile fields LocalLink needs to create/log in a user.
 */
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const { tokens } = await googleOAuthClient.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token');
  }
  const ticket = await googleOAuthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google ID token payload');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    fullName: payload.name || payload.email.split('@')[0],
    photoUrl: payload.picture || null,
    emailVerified: Boolean(payload.email_verified),
  };
}
