import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.auth.signInWithOtp({ email });
    setStatus(error ? error.message : 'Magic link sent');
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!supabase) { setStatus('Supabase not configured'); return; }
    setLoading(true);
    setStatus('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setStatus(error.message);
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Login • Prophecy Claims</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-[#faf6f0] p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
          <h1 className="text-xl font-bold text-[#1e3a5f] mb-4">Sign in</h1>
          <form onSubmit={handleEmailPassword} className="space-y-3">
            <input className="w-full border rounded px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="prophecy-button w-full" disabled={loading} type="submit">Sign in</button>
          </form>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="prophecy-button-sm" onClick={handleMagicLink} disabled={loading}>Magic link</button>
            <button className="prophecy-button-sm" onClick={handleGoogle} disabled={loading}>Google</button>
          </div>
          {status && <div className="mt-3 text-sm text-[#2c5f6f]">{status}</div>}
        </div>
      </div>
    </>
  );
}


