import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', visibility: 'private' });
  const [creatingStatus, setCreatingStatus] = useState('');

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

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!supabase || !session) return;
    setCreatingStatus('');
    if (!createForm.name.trim()) {
      setCreatingStatus('Name is required');
      return;
    }
    try {
      const userId = session.user.id;
      const { data, error } = await supabase
        .from('timelines')
        .insert({
          user_id: userId,
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          visibility: createForm.visibility
        })
        .select('*')
        .single();
      if (error) throw error;
      setTimelines((prev) => [data, ...prev]);
      setCreating(false);
      setCreateForm({ name: '', description: '', visibility: 'private' });
    } catch (err) {
      setCreatingStatus(err?.message || 'Failed to create timeline');
    }
  };

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
      <div className="relative min-h-screen p-6 overflow-hidden" style={{ background: `radial-gradient(1600px 800px at -10% -20%, rgba(232,149,71,0.12), transparent 60%), radial-gradient(1600px 800px at 120% 120%, rgba(135,206,235,0.15), transparent 60%), var(--prophecy-cream)` }}>
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-40" style={{ background: 'var(--prophecy-sunset-gradient)' }} />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ background: 'var(--prophecy-sky-gradient)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#1e3a5f]">Your Timelines</h1>
              <p className="text-sm text-[#2c5f6f] mt-1">Create and manage your timelines</p>
            </div>
            <button onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow hover:shadow-lg transition"
                    style={{ backgroundImage: 'var(--prophecy-sunset-gradient)', color: 'var(--prophecy-deep-blue)' }} aria-label="Create new timeline">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z"/></svg>
              <span>New Timeline</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full border-2 border-[#d4a574] border-t-transparent animate-spin" />
            </div>
          ) : timelines.length === 0 ? (
            <div className="max-w-xl mx-auto bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow p-6 text-center">
              <h2 className="text-lg font-semibold text-[#1e3a5f] mb-2">No timelines yet</h2>
              <p className="text-[#2c5f6f] mb-4">Create your first timeline to begin organizing entries.</p>
              <button onClick={() => setCreating(true)}
                      className="px-5 py-2 rounded-full font-semibold shadow hover:shadow-lg transition"
                      style={{ backgroundImage: 'var(--prophecy-sunset-gradient)', color: 'var(--prophecy-deep-blue)' }}>
                Create Timeline
              </button>
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {timelines.map((t) => (
                <li key={t.id} className="p-[1px] rounded-2xl shadow-[0_10px_35px_rgba(30,58,95,0.12)]"
                    style={{ background: 'linear-gradient(135deg, rgba(232,149,71,0.35), rgba(212,165,116,0.35))' }}>
                  <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-4 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-[#1e3a5f] leading-tight">{t.name}</div>
                        <div className="text-xs text-[#2c5f6f]">{t.visibility} • {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {t.description && (
                      <p className="mt-3 text-sm text-[#2c5f6f] line-clamp-3">{t.description}</p>
                    )}

                    <div className="mt-auto pt-3 border-t border-white/50 flex items-center justify-end">
                      <Link className="px-4 py-2 rounded-full font-medium border border-white/60 bg-white/80 hover:bg-white/95 transition"
                            style={{ color: 'var(--prophecy-deep-blue)' }}
                            href={`/timeline/detailed/${t.id}`}>View</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-[1px] rounded-2xl shadow-[0_20px_60px_rgba(30,58,95,0.25)]" style={{ background: 'linear-gradient(135deg, rgba(232,149,71,0.6), rgba(212,165,116,0.6))' }}>
            <div className="rounded-2xl bg-white/80 backdrop-blur-2xl border border-white/50">
              <div className="px-5 py-4 border-b border-white/50 flex items-center justify-between">
                <h2 className="text-[#1e3a5f] font-semibold">Create New Timeline</h2>
                <button onClick={() => setCreating(false)} className="text-[#2c5f6f] text-xl leading-none">×</button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-[#2c5f6f] mb-1">Name</label>
                  <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-xl bg-white/80 border border-white/60 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" placeholder="My Prophetic Timeline" />
                </div>
                <div>
                  <label className="block text-xs text-[#2c5f6f] mb-1">Description</label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-xl bg-white/80 border border-white/60 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d4a574]" placeholder="Optional description" />
                </div>
                <div>
                  <label className="block text-xs text-[#2c5f6f] mb-1">Visibility</label>
                  <select value={createForm.visibility} onChange={(e) => setCreateForm((f) => ({ ...f, visibility: e.target.value }))} className="w-full rounded-xl bg-white/80 border border-white/60 px-3 py-2 focus:outline-none">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="groups">Groups</option>
                  </select>
                </div>
                {creatingStatus && <div className="text-sm text-red-600">{creatingStatus}</div>}
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-full font-medium border border-white/60 bg-white/80 hover:bg-white/95 transition" style={{ color: 'var(--prophecy-deep-blue)' }}>Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-full font-semibold shadow hover:shadow-lg transition" style={{ backgroundImage: 'var(--prophecy-sunset-gradient)', color: 'var(--prophecy-deep-blue)' }}>Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


