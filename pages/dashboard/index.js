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
      <div className="min-h-screen bg-[#faf6f0] p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Your Timelines</h1>
            <button onClick={() => setCreating(true)} className="prophecy-button-sm px-4 py-2">New Timeline</button>
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

      {creating && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#faf6f0] w-full max-w-lg rounded-2xl border border-[#e3c292]/60 shadow-2xl">
            <div className="px-5 py-4 border-b border-[#e3c292]/40 flex items-center justify-between">
              <h2 className="text-[#1e3a5f] font-semibold">Create New Timeline</h2>
              <button onClick={() => setCreating(false)} className="text-[#2c5f6f] text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[#2c5f6f] mb-1">Name</label>
                <input value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="My Prophetic Timeline" />
              </div>
              <div>
                <label className="block text-xs text-[#2c5f6f] mb-1">Description</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border rounded px-3 py-2" placeholder="Optional description" />
              </div>
              <div>
                <label className="block text-xs text-[#2c5f6f] mb-1">Visibility</label>
                <select value={createForm.visibility} onChange={(e) => setCreateForm((f) => ({ ...f, visibility: e.target.value }))} className="w-full border rounded px-3 py-2">
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="groups">Groups</option>
                </select>
              </div>
              {creatingStatus && <div className="text-sm text-red-600">{creatingStatus}</div>}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setCreating(false)} className="bg-white border border-[#1e3a5f] text-[#1e3a5f] rounded-full px-4 py-2">Cancel</button>
                <button type="submit" className="prophecy-button px-5 py-2">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


