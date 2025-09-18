import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefer runtime origin (works locally) and fall back to env for SSR
  const origin = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL || '');
  // Always use the site origin for magic link and Google OAuth (do not use Supabase URL)
  const redirectTo = origin || undefined;
  const resetRedirectTo = origin ? `${origin}/reset-password` : redirectTo;

  const handleEmailPassword = async (e) => {
    e.preventDefault();
    if (!supabase) { setStatus('Supabase not configured'); return; }
    setLoading(true);
    setStatus('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatus(error.message);
    else router.push('/dashboard');
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!supabase) { setStatus('Supabase not configured'); return; }
    setLoading(true);
    setStatus('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setStatus(error ? error.message : 'Magic link sent. Check your email.');
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!supabase) { setStatus('Supabase not configured'); return; }
    setLoading(true);
    setStatus('');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error) setStatus(error.message);
    else if (data?.url) {
      setStatus('Redirecting to Google…');
      window.location.assign(data.url);
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!supabase) { setStatus('Supabase not configured'); return; }
    if (!email || !password) { setStatus('Email and password are required'); return; }
    if (password !== confirmPassword) { setStatus('Passwords do not match'); return; }
    setLoading(true);
    setStatus('');
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    setStatus(error ? error.message : 'Check your email to confirm your account.');
    setLoading(false);
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!supabase) { setStatus('Supabase not configured'); return; }
    if (!email) { setStatus('Enter your email'); return; }
    setLoading(true);
    setStatus('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectTo });
    setStatus(error ? error.message : 'Password reset link sent. Check your email.');
    setLoading(false);
  };

  // Redirect after successful magic link / OAuth
  useEffect(() => {
    if (!supabase) return;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) router.replace('/dashboard');
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.replace('/dashboard');
    }) || { data: null };
    return () => sub?.subscription?.unsubscribe();
  }, [router]);

  return (
    <>
      <Head>
        <title>Login • Prophecy Claims</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#2c5f6f] to-[#87ceeb] p-6">
        <div className="w-full max-w-xl bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-[#e3c292]/50 overflow-hidden">
          <div className="bg-gradient-to-r from-[#e89547] to-[#f4d03f] text-[#1e3a5f] px-6 py-4 flex items-center justify-between">
            <h1 className="font-display text-xl md:text-2xl font-bold">Welcome back</h1>
            <div className="flex items-center gap-2 text-sm">
              <button className={`px-3 py-1 rounded-full ${mode==='signin'?'bg-white/80':'bg-white/30'}`} onClick={() => setMode('signin')}>Sign in</button>
              <button className={`px-3 py-1 rounded-full ${mode==='signup'?'bg-white/80':'bg-white/30'}`} onClick={() => setMode('signup')}>Create</button>
              <button className={`px-3 py-1 rounded-full ${mode==='forgot'?'bg-white/80':'bg-white/30'}`} onClick={() => setMode('forgot')}>Forgot</button>
            </div>
          </div>

          <div className="p-6">
            {mode === 'signin' && (
              <form onSubmit={handleEmailPassword} className="space-y-4">
                <input className="w-full border rounded-xl px-4 py-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full border rounded-xl px-4 py-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button className="prophecy-button w-full py-3 rounded-full" disabled={loading} type="submit">Sign in</button>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="prophecy-button-sm py-2 rounded-full" onClick={handleMagicLink} disabled={loading}>Magic link</button>
                  <button type="button" className="prophecy-button-sm py-2 rounded-full" onClick={handleGoogle} disabled={loading}>Continue with Google</button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <input className="w-full border rounded-xl px-4 py-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="w-full border rounded-xl px-4 py-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <input className="w-full border rounded-xl px-4 py-3" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <button className="prophecy-button w-full py-3 rounded-full" disabled={loading} type="submit">Create account</button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <input className="w-full border rounded-xl px-4 py-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="prophecy-button w-full py-3 rounded-full" disabled={loading} type="submit">Send reset link</button>
              </form>
            )}

            {status && <div className="mt-4 text-sm text-[#2c5f6f]">{status}</div>}
          </div>
        </div>
      </div>
    </>
  );
}


