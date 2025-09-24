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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden" style={{ background: `radial-gradient(1200px 600px at 10% -10%, rgba(232,149,71,0.18), transparent 60%), radial-gradient(1200px 600px at 110% 110%, rgba(135,206,235,0.2), transparent 60%), linear-gradient(135deg, rgba(30,58,95,0.07) 0%, rgba(212,165,116,0.08) 100%), var(--prophecy-cream)` }}>
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-50" style={{ background: 'var(--prophecy-sunset-gradient)' }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: 'var(--prophecy-sky-gradient)' }} />

        <div className="w-full max-w-lg p-[1px] rounded-3xl shadow-[0_15px_60px_rgba(30,58,95,0.15)]" style={{ background: 'linear-gradient(135deg, rgba(232,149,71,0.6), rgba(212,165,116,0.6))' }}>
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/40">
            <div className="p-8">
              <div className="text-center">
                <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'var(--prophecy-deep-blue)' }}>Welcome back</h1>
                <p className="mt-1 text-sm" style={{ color: 'rgba(30,58,95,0.75)' }}>Sign in to continue</p>
              </div>

              <div className="mt-5 flex items-center justify-center">
                <div className="inline-flex rounded-full bg-white/80 border border-white/50 shadow-sm overflow-hidden">
                  <button onClick={() => setMode('signin')} className={`px-4 py-2 text-sm font-medium transition ${mode==='signin' ? 'text-white' : 'text-[var(--prophecy-deep-blue)]/80 hover:bg-white/90'}`} style={mode==='signin' ? { backgroundImage: 'linear-gradient(135deg, #2c5f6f, #87ceeb)' } : {}}>Sign in</button>
                  <button onClick={() => setMode('signup')} className={`px-4 py-2 text-sm font-medium transition ${mode==='signup' ? 'text-white' : 'text-[var(--prophecy-deep-blue)]/80 hover:bg-white/90'}`} style={mode==='signup' ? { backgroundImage: 'linear-gradient(135deg, #2c5f6f, #87ceeb)' } : {}}>Create</button>
                  <button onClick={() => setMode('forgot')} className={`px-4 py-2 text-sm font-medium transition ${mode==='forgot' ? 'text-white' : 'text-[var(--prophecy-deep-blue)]/80 hover:bg-white/90'}`} style={mode==='forgot' ? { backgroundImage: 'linear-gradient(135deg, #2c5f6f, #87ceeb)' } : {}}>Forgot</button>
                </div>
              </div>

              {mode === 'signin' && (
                <form onSubmit={handleEmailPassword} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--prophecy-deep-blue)' }}>Email</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                           className="w-full rounded-xl bg-white/80 border border-white/50 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--prophecy-deep-blue)' }}>Password</label>
                    <div className="flex rounded-xl overflow-hidden border border-white/50 bg-white/80">
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                             className="w-full px-4 py-3 placeholder-gray-400 focus:outline-none" />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-4 text-sm font-medium hover:bg-white/90" style={{ color: 'var(--prophecy-deep-blue)' }}>{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                          className={`w-full rounded-full py-3 font-semibold shadow transition transform ${loading ? 'opacity-70' : 'hover:shadow-xl hover:-translate-y-0.5'}`}
                          style={{ backgroundImage: 'var(--prophecy-sunset-gradient)', color: 'var(--prophecy-deep-blue)' }}>
                    Sign in
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={handleMagicLink} disabled={loading}
                            className="w-full rounded-full py-2 font-medium border border-white/60 bg-white/80 hover:bg-white/90 transition" style={{ color: 'var(--prophecy-deep-blue)' }}>
                      Magic link
                    </button>
                    <button type="button" onClick={handleGoogle} disabled={loading}
                            className="w-full rounded-full py-2 font-medium border border-white/60 bg-white/80 hover:bg-white/90 transition flex items-center justify-center gap-2" style={{ color: 'var(--prophecy-deep-blue)' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.64,6.053,29.082,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.64,6.053,29.082,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c4.97,0,9.451-1.907,12.837-5.019l-5.926-5.01C29.877,35.091,27.129,36,24,36 c-5.202,0-9.619-3.317-11.277-7.949l-6.537,5.036C9.5,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.22-4.123,5.682c0.001-0.001,0.002-0.001,0.003-0.002 l6.571,5.104C36.879,41.529,44,36,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                      Google
                    </button>
                  </div>
                </form>
              )}

              {mode === 'signup' && (
                <form onSubmit={handleSignUp} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--prophecy-deep-blue)' }}>Email</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                           className="w-full rounded-xl bg-white/80 border border-white/50 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--prophecy-deep-blue)' }}>Password</label>
                    <input type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)}
                           className="w-full rounded-xl bg-white/80 border border-white/50 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--prophecy-deep-blue)' }}>Confirm password</label>
                    <input type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                           className="w-full rounded-xl bg-white/80 border border-white/50 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" />
                  </div>
                  <button type="submit" disabled={loading}
                          className={`w-full rounded-full py-3 font-semibold shadow transition transform ${loading ? 'opacity-70' : 'hover:shadow-xl hover:-translate-y-0.5'}`}
                          style={{ backgroundImage: 'var(--prophecy-sunset-gradient)', color: 'var(--prophecy-deep-blue)' }}>
                    Create account
                  </button>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--prophecy-deep-blue)' }}>Email</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                           className="w-full rounded-xl bg-white/80 border border-white/50 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" />
                  </div>
                  <button type="submit" disabled={loading}
                          className={`w-full rounded-full py-3 font-semibold shadow transition transform ${loading ? 'opacity-70' : 'hover:shadow-xl hover:-translate-y-0.5'}`}
                          style={{ backgroundImage: 'var(--prophecy-sunset-gradient)', color: 'var(--prophecy-deep-blue)' }}>
                    Send reset link
                  </button>
                </form>
              )}

              {status && (
                <div className={`mt-6 text-sm rounded-xl border px-4 py-3 ${/sent|check/i.test(status) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {status}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


