import { useEffect, useState, useMemo } from 'react';
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

  const stats = useMemo(() => {
    const total = timelines.length;
    const visibilityCounts = timelines.reduce((acc, t) => {
      const key = (t.visibility || 'private').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { private: 0, public: 0, groups: 0 });

    const now = new Date();
    const last7days = timelines.filter((t) => {
      const d = new Date(t.created_at);
      return (now - d) / (1000 * 60 * 60 * 24) <= 7;
    }).length;

    // Build last 6 months including current
    const monthLabels = [];
    const monthCounts = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = dt.toLocaleString(undefined, { month: 'short' });
      monthLabels.push(label);
      const count = timelines.filter((t) => {
        const d = new Date(t.created_at);
        return d.getFullYear() === dt.getFullYear() && d.getMonth() === dt.getMonth();
      }).length;
      monthCounts.push(count);
    }

    const maxBar = Math.max(1, ...monthCounts);

    const recent = [...timelines]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return { total, visibilityCounts, last7days, monthLabels, monthCounts, maxBar, recent };
  }, [timelines]);

  if (!supabase) return <div className="p-6">Supabase is not configured</div>;
  if (!session) return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black p-6">
      <div className="text-center">
        <p className="mb-3">Please sign in to access the dashboard.</p>
        <Link className="btn-blue" href="/login">Go to Login</Link>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Dashboard • Prophecy Claims</title>
      </Head>
      <div className="relative min-h-screen p-6 overflow-hidden bg-white text-black">
        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Your Timelines</h1>
              <p className="text-sm text_black/70 mt-1">Create and manage your timelines</p>
            </div>
            <button onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow hover:shadow-lg transition btn-blue" aria-label="Create new timeline">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 4.5a.75.75 0 0 1 .75.75v6h6a.75.75 0 0 1 0 1.5h-6v6a.75.75 0 0 1-1.5 0v-6h-6a.75.75 0 0 1 0-1.5h6v-6A.75.75 0 0 1 12 4.5Z"/></svg>
              <span>New Timeline</span>
            </button>
          </div>

          {/* Stats Cards */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="text-sm text-black/60">Total Timelines</div>
                <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="text-sm text-black/60">Last 7 days</div>
                <div className="mt-1 text-2xl font-semibold">{stats.last7days}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="text-sm text-black/60">Public</div>
                <div className="mt-1 text-2xl font-semibold">{stats.visibilityCounts.public}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="text-sm text-black/60">Private</div>
                <div className="mt-1 text-2xl font-semibold">{stats.visibilityCounts.private}</div>
              </div>
            </div>
          )}

          {/* Charts + Recent */}
          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Bar Chart */}
              <div className="lg:col-span-2 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Timelines Created (last 6 months)</h3>
                  <div className="text-xs text-black/60">Max: {stats.maxBar}</div>
                </div>
                <div className="mt-4 h-40 flex items-end gap-3">
                  {stats.monthCounts.map((count, idx) => {
                    const height = `${Math.round((count / stats.maxBar) * 100)}%`;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-[#0038b8] rounded-t-md" style={{ height }} />
                        <div className="mt-2 text-xs text-black/60">{stats.monthLabels[idx]}</div>
                        <div className="text-xs font-medium">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Donut + Legend + Recent */}
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <h3 className="font-semibold">Visibility</h3>
                {stats.total === 0 ? (
                  <div className="h-40 flex items-center justify-center text-black/60">No data</div>
                ) : (
                  <div className="mt-3">
                    {(() => {
                      const p = stats.visibilityCounts.public;
                      const r = stats.visibilityCounts.private;
                      const g = stats.visibilityCounts.groups;
                      const total = Math.max(1, p + r + g);
                      const pPct = (p / total) * 100;
                      const rPct = (r / total) * 100;
                      const gPct = 100 - pPct - rPct;
                      const bg = `conic-gradient(#0038b8 0 ${pPct}%, #000000 ${pPct}% ${pPct + rPct}%, #ffd700 ${pPct + rPct}% 100%)`;
                      return (
                        <div className="flex items-center gap-4">
                          <div className="w-28 h-28 rounded-full" style={{ background: bg }} />
                          <div className="text-sm">
                            <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#0038b8' }} /> Public: {p}</div>
                            <div className="flex items-center gap-2 mt-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#000000' }} /> Private: {r}</div>
                            <div className="flex items-center gap-2 mt-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#ffd700' }} /> Groups: {g}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <h3 className="font-semibold mt-6">Recent</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {stats.recent.length === 0 && <li className="text-black/60">No recent activity</li>}
                  {stats.recent.map((t) => (
                    <li key={t.id} className="flex items-center justify-between">
                      <span className="truncate mr-2">{t.name}</span>
                      <span className="text-black/60">{new Date(t.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full border-2 border-[#0038b8] border-t-transparent animate-spin" />
            </div>
          ) : timelines.length === 0 ? (
            <div className="max-w-xl mx-auto bg-white border border-black/10 rounded-2xl shadow p-6 text-center">
              <h2 className="text-lg font-semibold mb-2">No timelines yet</h2>
              <p className="text-black/70 mb-4">Create your first timeline to begin organizing entries.</p>
              <button onClick={() => setCreating(true)} className="px-5 py-2 rounded-full font-semibold shadow hover:shadow-lg transition btn-blue">
                Create Timeline
              </button>
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {timelines.map((t) => (
                <li key={t.id} className="p-[1px] rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-black/10">
                  <div className="rounded-2xl bg-white border border-black/10 p-4 h-full flex flex_col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold leading-tight">{t.name}</div>
                        <div className="text-xs text-black/60">{t.visibility} • {new Date(t.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {t.description && (
                      <p className="mt-3 text-sm text-black/70 line-clamp-3">{t.description}</p>
                    )}

                    <div className="mt-auto pt-3 border-t border-black/10 flex items-center justify-end">
                      <Link className="px-4 py-2 rounded-full font-medium border-2 border-black bg-white hover:bg-black/5 transition"
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
          <div className="w-full max-w-lg rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-black/10 bg-white">
            <div className="rounded-2xl bg-white">
              <div className="px-5 py-4 border-b border-black/10 flex items-center justify_between">
                <h2 className="font-semibold">Create New Timeline</h2>
                <button onClick={() => setCreating(false)} className="text-xl leading-none hover:bg-black/5 rounded-full px-2">×</button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-black/70 mb-1">Name</label>
                  <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#0038b8]" placeholder="My Prophetic Timeline" />
                </div>
                <div>
                  <label className="block text-xs text-black/70 mb-1">Description</label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-[#0038b8]" placeholder="Optional description" />
                </div>
                <div>
                  <label className="block text-xs text-black/70 mb-1">Visibility</label>
                  <select value={createForm.visibility} onChange={(e) => setCreateForm((f) => ({ ...f, visibility: e.target.value }))} className="w-full rounded-xl bg-white border border-black/10 px-3 py-2 focus:outline-none">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="groups">Groups</option>
                  </select>
                </div>
                {creatingStatus && <div className="text-sm text-red-600">{creatingStatus}</div>}
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-full font-medium btn-white">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-full font-semibold btn-blue">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


