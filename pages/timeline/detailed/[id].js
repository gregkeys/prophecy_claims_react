import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import InfiniteTimeline from '../../../components/infinite-timeline';
import { supabase as browserSupabase } from '../../../lib/supabaseClient';

export default function DetailedTimeline({ timeline, submissions }) {
  const titleRef = useRef(null);
  const [timelineHeight, setTimelineHeight] = useState(600);
  const [canEdit, setCanEdit] = useState(false);
  const [title, setTitle] = useState(timeline.name);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleStatus, setTitleStatus] = useState('');

  useEffect(() => {
    const update = () => {
      const bottom = titleRef.current?.getBoundingClientRect()?.bottom || 140;
      const viewport = typeof window !== 'undefined' ? (window.innerHeight || 800) : 800;
      const available = Math.max(260, Math.floor(viewport - bottom - 16));
      setTimelineHeight(available);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const checkOwnership = async () => {
      if (!browserSupabase) return;
      const { data } = await browserSupabase.auth.getSession();
      const uid = data?.session?.user?.id;
      setCanEdit(Boolean(uid && uid === timeline.user_id));
    };
    checkOwnership();
  }, [timeline.user_id]);

  const saveTitle = async () => {
    if (!canEdit || !browserSupabase) { setEditingTitle(false); return; }
    const newTitle = (title || '').trim();
    if (!newTitle) { setTitle(timeline.name); setEditingTitle(false); return; }
    try {
      setTitleStatus('');
      const { error } = await browserSupabase
        .from('timelines')
        .update({ name: newTitle })
        .eq('id', timeline.id)
        .single();
      if (error) throw error;
    } catch (e) {
      setTitle(timeline.name);
      setTitleStatus(e?.message || 'Failed to update');
    } finally {
      setEditingTitle(false);
    }
  };
  if (!timeline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2c5f6f]">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Timeline Not Found</h1>
          <Link href="/timelines" className="prophecy-button">Back to Timelines</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{timeline.name} - Detailed Timeline | Prophecy Claims</title>
        <meta name="description" content={timeline.description || `Explore the ${timeline.name} detailed infinite timeline.`} />
      </Head>
      {/* Global header provided by _app.js */}

      <section className="pt-8 pb-2 bg-[#faf6f0] min-h-screen">
        <div className="w-full px-0">
          <div ref={titleRef} className="mb-1 px-4 sm:px-6 lg:px-12 text-center">
            {editingTitle ? (
              <input
                className="font-display text-3xl md:text-4xl font-bold text-[#1e3a5f] bg-white/70 border border-[#e3c292]/60 rounded-xl px-3 py-2 w-full max-w-3xl mx-auto"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } if (e.key === 'Escape') { setTitle(timeline.name); setEditingTitle(false); } }}
                autoFocus
              />
            ) : (
              <h1
                className={`font-display text-3xl md:text-4xl font-bold break-words ${canEdit ? 'text-[#1e3a5f] cursor-text hover:underline decoration-dotted' : 'text-[#1e3a5f]'}`}
                onClick={() => { if (canEdit) setEditingTitle(true); }}
              >
                {title}
              </h1>
            )}
            {timeline.description && (
              <p className="text-[#2c5f6f] mt-1 max-w-3xl mx-auto">{timeline.description}</p>
            )}
            {titleStatus && <div className="text-sm text-red-600 mt-2">{titleStatus}</div>}
          </div>

          <InfiniteTimeline submissions={submissions} height={timelineHeight + 48} canEdit={canEdit} />
        </div>
      </section>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const serverSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
      : null;

    if (!serverSupabase) {
      return { notFound: true };
    }

    const { id } = params;

    const { data: timeline } = await serverSupabase
      .from('timelines')
      .select('*')
      .eq('id', id)
      .single();

    if (!timeline) return { notFound: true };

    const { data: timelineSubmissions } = await serverSupabase
      .from('timeline_submissions')
      .select('submission_id, order_position')
      .eq('timeline_id', id)
      .order('order_position');

    let submissions = [];
    if (timelineSubmissions && timelineSubmissions.length > 0) {
      const submissionIds = timelineSubmissions.map(ts => ts.submission_id);
      const { data: submissionsData } = await serverSupabase
        .from('enhanced_submissions')
        .select(`*, submission_content(*)`)
        .in('id', submissionIds);

      submissions = submissionsData || [];
    }

    return { props: { timeline, submissions } };
  } catch (e) {
    console.error(e);
    return { notFound: true };
  }
}


