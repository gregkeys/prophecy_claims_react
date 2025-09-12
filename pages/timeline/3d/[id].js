import Head from 'next/head';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import ThreeTimeline from '../../../components/three-timeline';

function getTimeframeFromSubmission(submission) {
  const timeframeContent = submission?.submission_content?.find(c => c.type === 'timeframe');
  return timeframeContent?.content || null;
}

export default function Timeline3D({ timeline, submissions }) {
  const [selected, setSelected] = useState(null);
  const [showData, setShowData] = useState(false);
  const [showMini, setShowMini] = useState(false);
  const [axisType, setAxisType] = useState('helix');

  const items = useMemo(() => {
    return (submissions || []).map(s => ({
      ...s,
      timeframe: getTimeframeFromSubmission(s)
    }));
  }, [submissions]);

  if (!timeline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2c5f6f]">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Timeline Not Found</h1>
          <Link href="/timelines" className="prophecy-button">
            Back to Timelines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>3D View - {timeline.name} | Prophecy Claims</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#1e3a5f]/95 backdrop-blur-sm border-b border-[#2c5f6f]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold prophecy-gradient-text">
            Prophecy.Claims
          </Link>
          <div className="flex items-center space-x-6">
            <Link href={`/timeline/${timeline.id}`} className="text-[#faf6f0] hover:text-[#d4a574] transition-colors">
              ← Back to Timeline
            </Link>
            <Link href="/timelines" className="text-[#faf6f0] hover:text-[#d4a574] transition-colors">
              All Timelines
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-24 pb-0 bg-[#faf6f0] min-h-screen">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-[#1e3a5f]">{timeline.name} — 3D View</h1>
            {timeline.description && (
              <p className="text-[#2c5f6f] mt-1">{timeline.description}</p>
            )}
          </div>

          <div className="relative h-[70vh] md:h-[80vh]">
            <ThreeTimeline
              items={items}
              onSelect={setSelected}
              axisType={axisType}
              background="stars"
              getCategory={(n) => n.category || n.status}
              relations={[]}
              timeAxis="z"
              showMiniCards={showMini}
            />
            <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
              <div className="bg-white/80 rounded shadow p-1 flex items-center text-xs">
                <button
                  onClick={() => setAxisType('helix')}
                  className={`px-3 py-2 rounded ${axisType === 'helix' ? 'bg-[#d4a574] text-white' : 'text-[#1e3a5f]'}`}
                  title="Helical timeline"
                >
                  Helix
                </button>
                <button
                  onClick={() => setAxisType('line')}
                  className={`px-3 py-2 rounded ${axisType === 'line' ? 'bg-[#d4a574] text-white' : 'text-[#1e3a5f]'}`}
                  title="Straight timeline"
                >
                  Straight
                </button>
              </div>
              <button
                onClick={() => setShowData(!showData)}
                className="bg-white/80 hover:bg-white text-[#1e3a5f] text-xs font-medium px-3 py-2 rounded shadow"
              >
                {showData ? 'Hide Data' : 'Show Data'}
              </button>
              <button
                onClick={() => setShowMini(!showMini)}
                className="bg-white/80 hover:bg-white text-[#1e3a5f] text-xs font-medium px-3 py-2 rounded shadow"
              >
                {showMini ? 'Hide Mini Cards' : 'Show Mini Cards'}
              </button>
            </div>
          </div>

          {selected && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#faf6f0] rounded-2xl max-w-2xl w-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c5f6f] p-4 text-white flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold">{selected.title}</h2>
                    <div className="text-[#87ceeb] text-sm">{getTimeframeFromSubmission(selected) || selected.timeframe || 'Date not specified'}</div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white hover:text-[#d4a574] text-2xl">×</button>
                </div>
                <div className="p-6 text-[#1e3a5f]">
                  {selected.description && (
                    <p className="text-[#2c5f6f] mb-4">{selected.description}</p>
                  )}
                  <div className="text-xs text-[#2c5f6f]">
                    Created: {new Date(selected.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Mini cards are rendered in-scene above nodes; no on-screen bar */}
          {/* Slide-in data panel */}
          <div className={`fixed top-24 right-0 bottom-0 w-full sm:w-[420px] bg-white shadow-2xl transform transition-transform duration-300 ${showData ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full overflow-y-auto">
              <div className="p-4 border-b sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-[#1e3a5f]">Event Data</h3>
                  <button onClick={() => setShowData(false)} className="text-[#2c5f6f] hover:text-[#1e3a5f] text-xl">×</button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {items.length === 0 ? (
                  <div className="text-[#2c5f6f]">No entries.</div>
                ) : (
                  items.map((s, idx) => (
                    <div key={s.id || idx} className="prophecy-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#d4a574]">{s.timeframe || s.created_at || 'Date not specified'}</span>
                        <span className="text-xs text-[#2c5f6f]">#{idx + 1}</span>
                      </div>
                      <h4 className="font-display text-base font-semibold text-[#1e3a5f] mb-1">{s.title}</h4>
                      {s.description && <p className="text-[#2c5f6f] text-sm">{s.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
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
      .select(`*, timeline_configuration(*)`)
      .eq('id', id)
      .single();

    if (!timeline) {
      return { notFound: true };
    }

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

      submissions = submissionsData?.map(submission => {
        const timelineSubmission = timelineSubmissions.find(ts => ts.submission_id === submission.id);
        return {
          ...submission,
          order_position: timelineSubmission?.order_position || 0
        };
      }).sort((a, b) => a.order_position - b.order_position) || [];
    }

    return { props: { timeline, submissions } };
  } catch (error) {
    console.error('Error fetching 3D timeline:', error);
    return { notFound: true };
  }
}


