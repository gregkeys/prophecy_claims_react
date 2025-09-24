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
  const siteOrigin = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL || '');

  // Force explicit, on-site callback target to avoid Supabase defaulting to its own domain
  // Use the auth callback path so Supabase JS can process the session reliably
  const callbackPath = process.env.NEXT_PUBLIC_AUTH_CALLBACK_PATH || '/auth/v1/callback';
  const redirectTo = siteOrigin ? `${siteOrigin}${callbackPath}` : undefined;
  const resetRedirectTo = siteOrigin ? `${siteOrigin}/reset-password` : undefined;

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
      <div data-theme="prophecy" className="min-h-screen flex items-center justify-center bg-base-200 p-6">
        <div className="w-full max-w-xl card bg-base-100 shadow-2xl border">
          <div className="card-body p-0">
            <div className="px-6 py-4 bg-gradient-to-r from-primary to-warning text-primary-content flex items-center justify-between">
              <h1 className="font-display text-xl md:text-2xl font-bold">Welcome back</h1>
              <div className="tabs tabs-boxed bg-white/20">
                <a className={`tab ${mode==='signin'?'tab-active':''}`} onClick={() => setMode('signin')}>Sign in</a>
                <a className={`tab ${mode==='signup'?'tab-active':''}`} onClick={() => setMode('signup')}>Create</a>
                <a className={`tab ${mode==='forgot'?'tab-active':''}`} onClick={() => setMode('forgot')}>Forgot</a>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {mode === 'signin' && (
                <form onSubmit={handleEmailPassword} className="space-y-4">
                  <input className="input input-bordered w-full" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className="input input-bordered w-full" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button className="btn btn-primary w-full" disabled={loading} type="submit">Sign in</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" className="btn btn-outline" onClick={handleMagicLink} disabled={loading}>Magic link</button>
                    <button type="button" className="btn btn-outline" onClick={handleGoogle} disabled={loading}>Google</button>
                  </div>
                </form>
              )}

              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <input className="input input-bordered w-full" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className="input input-bordered w-full" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <input className="input input-bordered w-full" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <button className="btn btn-primary w-full" disabled={loading} type="submit">Create account</button>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <input className="input input-bordered w-full" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button className="btn btn-primary w-full" disabled={loading} type="submit">Send reset link</button>
                </form>
              )}

              {status && <div className="alert alert-info text-sm"><span>{status}</span></div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


