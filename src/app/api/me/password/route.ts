import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { query } from '@/lib/db';
import { requireRole, serverError } from '@/lib/api';
import { validatePassword } from '@/lib/auth/password';

// Set (or replace) the signed-in user's password. Signing in with an email
// code is enough to set a new one, which doubles as "forgot password".
export async function POST(request: NextRequest) {
  const { profile, error } = await requireRole('viewer');
  if (error) return error;

  const { password } = await request.json();
  const validation = validatePassword(typeof password === 'string' ? password : '');
  if (!validation.valid) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  try {
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(password);

    const updated = await query(
      `update auth_accounts set "password" = $2, "updatedAt" = now()
       where "userId" = $1 and "providerId" = 'credential' returning "id"`,
      [profile.id, hash]
    );
    if (updated.length === 0) {
      await query(
        `insert into auth_accounts ("accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
         values ($1::text, 'credential', $1::uuid, $2, now(), now())`,
        [profile.id, hash]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError(err);
  }
}
