import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import InfiniteTimeline from '../../../components/infinite-timeline';

export default function DetailedTimeline({ timeline, submissions }) {
  const titleRef = useRef(null);
  const [timelineHeight, setTimelineHeight] = useState(600);

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

      <section className="pt-20 pb-6 bg-[#faf6f0] min-h-screen">
        <div className="w-full px-0">
          <div ref={titleRef} className="mb-6 px-4 sm:px-6 lg:px-12 text-center">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#1e3a5f] break-words">{timeline.name}</h1>
            {timeline.description && (
              <p className="text-[#2c5f6f] mt-2 max-w-3xl mx-auto">{timeline.description}</p>
            )}
          </div>

          <InfiniteTimeline submissions={submissions} height={timelineHeight} />
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


