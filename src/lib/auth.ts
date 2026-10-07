import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

const EMAIL_PATHS = new Set([
  '/email-otp/send-verification-otp',
  '/sign-in/email-otp',
  '/sign-up/email',
]);

const isOhsuEmail = (email: string) => email.trim().toLowerCase().endsWith('@ohsu.edu');

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    'https://ohsusim.com',
    'https://www.ohsusim.com',
    'http://localhost:3000',
    // Vercel preview deployments
    ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
      .filter(Boolean)
      .map(host => `https://${host}`),
  ],

  // Table names (profiles/sessions are app tables, so prefix the auth ones)
  user: { modelName: 'auth_users' },
  account: { modelName: 'auth_accounts' },
  verification: { modelName: 'auth_verifications' },
  session: {
    modelName: 'auth_sessions',
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh expiry daily
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    database: { generateId: 'uuid' },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 72,
    password: {
      hash: hashPassword,
      // Also accepts bcrypt hashes ($2a$...) in case Supabase Auth hashes are imported
      verify: async ({ hash, password }) =>
        hash.startsWith('$2')
          ? bcrypt.compare(password, hash)
          : verifyPassword({ hash, password }),
    },
  },

  emailVerification: {
    autoSignInAfterVerification: true,
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOtpEmail(email, otp, type);
      },
    }),
    nextCookies(),
  ],

  // Reject non-OHSU addresses before any email is sent
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const email = ctx.body?.email;
      if (typeof email === 'string' && EMAIL_PATHS.has(ctx.path) && !isOhsuEmail(email)) {
        throw new APIError('BAD_REQUEST', {
          message: 'Please use your @ohsu.edu email address.',
        });
      }
    }),
  },

  // Backstop: never create a non-OHSU user
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isOhsuEmail(user.email)) {
            throw new APIError('BAD_REQUEST', {
              message: 'Only @ohsu.edu email addresses are allowed',
            });
          }
          return { data: { ...user, name: user.name || user.email.split('@')[0] } };
        },
      },
    },
  },
});
