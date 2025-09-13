import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import InfiniteTimeline from '../../../components/infinite-timeline';

export default function DetailedTimeline({ timeline, submissions }) {
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
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#1e3a5f]/95 backdrop-blur-sm border-b border-[#2c5f6f]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold prophecy-gradient-text">Prophecy.Claims</Link>
          <div className="flex items-center gap-3">
            <Link href={`/timeline/${timeline.id}`} className="prophecy-button-sm px-4 py-2 rounded-full">Standard View</Link>
            <Link href="/timelines" className="px-4 py-2 rounded-full border border-white/30 text-[#faf6f0] hover:text-[#d4a574] hover:border-[#d4a574] transition-colors">Timelines</Link>
          </div>
        </div>
      </nav>

      <section className="pt-20 pb-6 bg-[#faf6f0] min-h-screen">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="mb-6 px-2 sm:px-4 lg:px-12 text-center">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#1e3a5f] break-words">{timeline.name}</h1>
            {timeline.description && (
              <p className="text-[#2c5f6f] mt-2 max-w-3xl mx-auto">{timeline.description}</p>
            )}
          </div>

          <InfiniteTimeline submissions={submissions} height="72vh" />
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


