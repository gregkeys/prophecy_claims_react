import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import InfiniteTimeline from '../../../components/infinite-timeline';

export default function CanvasTimelinePage({ timeline, submissions }) {
  const router = useRouter();

  if (router.isFallback) return <div>Loading...</div>;
  if (!timeline) return <div>Timeline not found</div>;

  return (
    <>
      <Head>
        <title>{timeline.name} - Canvas Timeline | Prophecy Claims</title>
      </Head>

      {/* Top header */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#1e3a5f]/95 backdrop-blur-sm border-b border-[#2c5f6f]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold prophecy-gradient-text">Prophecy.Claims</Link>
          <div className="flex items-center gap-4">
            <Link href={`/timeline/${timeline.id}`} className="prophecy-button-sm px-3 py-1 text-sm">Standard View</Link>
            <Link href={`/timeline/detailed/${timeline.id}`} className="prophecy-button-sm px-3 py-1 text-sm">Detailed View</Link>
          </div>
        </div>
      </nav>

      <main className="fixed inset-0 bg-[#faf6f0]">
        {/* Top-centered title overlay */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-center px-4">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#1e3a5f]">
            {timeline.name}
          </h1>
        </div>

        <InfiniteTimeline submissions={submissions} height="100vh" />
      </main>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const serverSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
      : null;
    if (!serverSupabase) return { notFound: true };

    const { id } = params;

    const { data: timeline } = await serverSupabase
      .from('timelines')
      .select('*, timeline_configuration(*)')
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
      const submissionIds = timelineSubmissions.map((ts) => ts.submission_id);
      const { data: submissionsData } = await serverSupabase
        .from('enhanced_submissions')
        .select('*, submission_content(*)')
        .in('id', submissionIds);

      submissions = (submissionsData || []).map((s) => {
        const ts = timelineSubmissions.find((t) => t.submission_id === s.id);
        return { ...s, order_position: ts?.order_position || 0 };
      }).sort((a, b) => a.order_position - b.order_position);
    }

    return {
      props: {
        timeline: {
          ...timeline,
          style: timeline.timeline_configuration?.[0]?.style || 'default',
          orientation: timeline.timeline_configuration?.[0]?.orientation || 'vertical'
        },
        submissions
      }
    };
  } catch (e) {
    return { notFound: true };
  }
}


