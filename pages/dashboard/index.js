import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      if (!data.session) return;
      const userId = data.session.user.id;
      // Admins and moderators can view all timelines; users only their own
      const roles = data.session.user?.app_metadata?.roles || [];
      const isAdmin = roles?.includes?.('admin') || data.session.user?.user_metadata?.role === 'admin';
      const isModerator = roles?.includes?.('moderator') || data.session.user?.user_metadata?.role === 'moderator';
      const query = supabase.from('timelines').select('*').order('created_at', { ascending: false });
      const { data: t } = isAdmin || isModerator ? await query : await query.eq('user_id', userId);
      setTimelines(t || []);
      setLoading(false);
    };
    init();
    const { data: sub } = supabase?.auth?.onAuthStateChange((_ev, s) => setSession(s));
    return () => sub?.subscription?.unsubscribe();
  }, []);

  if (!supabase) return <div className="p-6">Supabase is not configured</div>;
  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf6f0] p-6">
      <div className="text-center">
        <p className="mb-3 text-[#1e3a5f]">Please sign in to access the dashboard.</p>
        <Link className="prophecy-button" href="/login">Go to Login</Link>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Dashboard • Prophecy Claims</title>
      </Head>
      <div className="min-h-screen bg-[#faf6f0] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center mb-6">
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Your Timelines</h1>
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : timelines.length === 0 ? (
            <div className="text-[#2c5f6f]">No timelines yet.</div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-4">
              {timelines.map((t) => (
                <li key={t.id} className="bg-white rounded-xl shadow p-4 border border-[#e3c292]/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#1e3a5f]">{t.name}</div>
                      <div className="text-xs text-[#2c5f6f]">{t.visibility} • {new Date(t.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <Link className="prophecy-button-sm px-4 py-2" href={`/timeline/detailed/${t.id}`}>View</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}


