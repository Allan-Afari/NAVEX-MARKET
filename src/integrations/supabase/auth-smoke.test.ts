import { describe, it, expect } from 'vitest';
import { mockSupabase } from './mock-client';

describe('Auth smoke test (mock)', () => {
  it('can sign up, sign in, verify OTP, get session and sign out', async () => {
    const email = `smoke+${Math.random().toString(36).slice(2,8)}@example.com`;

    // Sign up
    const signUpRes = await mockSupabase.auth.signUp({ email, options: { data: { full_name: 'Smoke User' } } });
    expect(signUpRes).toHaveProperty('data');
    expect(signUpRes.error).toBeNull();

    // Sign in with password
    const signInRes = await mockSupabase.auth.signInWithPassword({ email, password: 'password' });
    expect(signInRes).toHaveProperty('data');
    expect(signInRes.error).toBeNull();

    // Get session and user
    const sessionRes = await mockSupabase.auth.getSession();
    expect(sessionRes.data).toHaveProperty('session');

    const userRes = await mockSupabase.auth.getUser();
    expect(userRes.data).toHaveProperty('user');

    // Sign out
    const signOutRes = await mockSupabase.auth.signOut();
    expect(signOutRes).toHaveProperty('error');

    // OTP flow
    const otpRes = await mockSupabase.auth.signInWithOtp({ email });
    expect(otpRes).toBeDefined();

    const verifyRes = await mockSupabase.auth.verifyOtp({ token: '123456', email, type: 'sms' });
    expect(verifyRes.data).toHaveProperty('user');

    // Functions.invoke stub
    const fn = await mockSupabase.functions.invoke('send-email-notification', { to_email: email, type: 'welcome' });
    expect(fn).toEqual({ data: null, error: null });
  });
});
