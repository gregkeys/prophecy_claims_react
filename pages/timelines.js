import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client with fallback for environment variables
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (typeof window !== 'undefined') {
    console.log('Environment variables check:', {
      url: url ? 'present' : 'missing',
      key: key ? 'present' : 'missing',
      urlValue: url,
      keyLength: key ? key.length : 0
    });
  }
  
  return url && key ? createClient(url, key) : null;
};

const supabase = getSupabaseClient();

export default function Timelines({ timelines }) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsVisible(true);
  }, []);

  return (
    <>
      <Head>
        <title>Divine Timelines - Prophecy Claims</title>
        <meta name="description" content="Explore prophetic timelines revealing divine truth through time." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e3a5f]/95 backdrop-blur-sm border-b border-[#2c5f6f]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold prophecy-gradient-text">
            Prophecy.Claims
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-[#faf6f0] hover:text-[#d4a574] transition-colors">
              Home
            </Link>
            <Link href="/timelines" className="text-[#d4a574] font-semibold">
              Timelines
            </Link>
            <a 
              href="https://app.prophecy.claims" 
              target="_blank" 
              rel="noopener noreferrer"
              className="prophecy-button-sm px-4 py-2 text-sm"
            >
              Create Timeline
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2c5f6f] to-[#87ceeb]"></div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-32 left-10 w-32 h-32 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-float"></div>
          <div className="absolute top-60 right-20 w-24 h-24 bg-gradient-to-r from-[#e89547] to-[#d4a574] rounded-full opacity-30 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-4 max-w-7xl mx-auto w-full">
          <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-[#faf6f0] mb-6">
              Divine <span className="prophecy-gradient-text">Timelines</span>
            </h1>
            <p className="text-xl md:text-2xl text-[#faf6f0] mb-8 max-w-3xl mx-auto opacity-90">
              Witness the unfolding of prophetic truth through sacred timelines of revelation
            </p>
          </div>

          {/* Timeline Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {mounted && timelines.map((timeline, index) => (
              <TimelineCard 
                key={timeline.id} 
                timeline={timeline} 
                index={index}
                onClick={() => setSelectedTimeline(timeline)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Detail Modal */}
      {selectedTimeline && (
        <TimelineModal 
          timeline={selectedTimeline} 
          onClose={() => setSelectedTimeline(null)} 
        />
      )}
    </>
  );
}

function TimelineCard({ timeline, index, onClick }) {
  return (
    <div 
      className={`prophecy-card cursor-pointer transform hover:scale-105 transition-all duration-300 animate-fade-in-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full"></div>
          <span className="text-xs font-medium text-[#2c5f6f] uppercase tracking-wide">
            {timeline.visibility}
          </span>
        </div>
        {timeline.featured && (
          <span className="text-xs bg-gradient-to-r from-[#e89547] to-[#f4d03f] text-white px-2 py-1 rounded-full font-medium">
            ⭐ Featured
          </span>
        )}
      </div>
      
      <h3 className="font-display text-xl font-semibold text-[#1e3a5f] mb-3">
        {timeline.name}
      </h3>
      
      {timeline.description && (
        <p className="text-[#2c5f6f] text-sm mb-4 line-clamp-3">
          {timeline.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-[#2c5f6f]">
        <span>{timeline.submission_count} entries</span>
        <span>{new Date(timeline.created_at).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}</span>
      </div>
      
      <div className="mt-4 pt-4 border-t border-[#87ceeb]/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-xs text-[#2c5f6f]">Style:</span>
            <span className="text-xs font-medium text-[#1e3a5f] capitalize">
              {timeline.style} • {timeline.orientation}
            </span>
          </div>
          <Link 
            href={`/timeline/${timeline.id}`}
            className="text-xs text-[#d4a574] hover:text-[#e89547] transition-colors font-medium whitespace-nowrap"
          >
            Full View →
          </Link>
        </div>
      </div>
    </div>
  );
}

function TimelineModal({ timeline, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTimelineSubmissions = useCallback(async () => {
    console.log('Modal fetch attempt:', {
      supabaseExists: !!supabase,
      timelineId: timeline.id,
      envUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      envKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });
    
    if (!supabase) {
      setError('Supabase connection not available. Check environment variables.');
      setLoading(false);
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // First get timeline submissions with order
      const { data: timelineSubmissions, error: timelineError } = await supabase
        .from('timeline_submissions')
        .select('submission_id, order_position')
        .eq('timeline_id', timeline.id)
        .order('order_position');

      console.log('Timeline submissions query result:', {
        data: timelineSubmissions,
        error: timelineError,
        count: timelineSubmissions?.length || 0
      });

      if (timelineError) {
        throw new Error(`Timeline submissions error: ${timelineError.message}`);
      }

      if (!timelineSubmissions || timelineSubmissions.length === 0) {
        console.log('No timeline submissions found for timeline:', timeline.id);
        setSubmissions([]);
        return;
      }

      // Then get the submissions with content
      const submissionIds = timelineSubmissions.map(ts => ts.submission_id);
      console.log('Fetching submissions for IDs:', submissionIds);
      
      const { data: submissions, error: submissionsError } = await supabase
        .from('enhanced_submissions')
        .select(`
          *,
          submission_content(*)
        `)
        .in('id', submissionIds);

      console.log('Enhanced submissions query result:', {
        data: submissions,
        error: submissionsError,
        count: submissions?.length || 0
      });

      if (submissionsError) {
        throw new Error(`Enhanced submissions error: ${submissionsError.message}`);
      }

      // Merge and sort by order_position
      const submissionsWithOrder = submissions?.map(submission => {
        const timelineSubmission = timelineSubmissions.find(ts => ts.submission_id === submission.id);
        return {
          ...submission,
          order_position: timelineSubmission?.order_position || 0
        };
      }).sort((a, b) => a.order_position - b.order_position) || [];
      
      setSubmissions(submissionsWithOrder);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setError(`Failed to load timeline data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [timeline.id]);

  useEffect(() => {
    fetchTimelineSubmissions();
  }, [fetchTimelineSubmissions]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-[#faf6f0] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c5f6f] p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-2xl font-bold">{timeline.name}</h2>
                {timeline.description && (
                  <p className="text-[#87ceeb] mt-2">{timeline.description}</p>
                )}
              </div>
              <button 
                onClick={onClose}
                className="text-white hover:text-[#d4a574] transition-colors text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center">
              <Link 
                href={`/timeline/${timeline.id}`}
                className="prophecy-button-sm px-6 py-2 text-sm"
              >
                View Full Timeline
              </Link>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
                <p className="text-[#2c5f6f] mt-4">Loading timeline...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-red-600 mb-2">Error Loading Timeline</h3>
                <p className="text-[#2c5f6f] mb-4">{error}</p>
                <button 
                  onClick={fetchTimelineSubmissions}
                  className="prophecy-button text-sm px-4 py-2"
                >
                  Retry
                </button>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">No Timeline Entries</h3>
                <p className="text-[#2c5f6f]">This timeline doesn't have any entries yet.</p>
              </div>
            ) : (
              <TimelineView submissions={submissions} configuration={timeline} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineView({ submissions, configuration }) {
  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#d4a574] to-[#f4d03f]"></div>
      
      {/* Timeline Items */}
      <div className="space-y-8">
        {submissions.map((submission, index) => (
          <TimelineItem key={submission.id} submission={submission} index={index} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ submission, index }) {
  const getTimeframeContent = () => {
    const timeframeContent = submission.submission_content?.find(c => c.type === 'timeframe');
    return timeframeContent?.content || 'Date not specified';
  };

  const getScriptureContent = () => {
    const scriptureContent = submission.submission_content?.find(c => c.type === 'scriptures');
    return scriptureContent?.content || null;
  };

  return (
    <div className="relative flex items-start space-x-6">
      {/* Timeline Node */}
      <div className="relative z-10 flex-shrink-0">
        <div className="w-4 h-4 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full border-4 border-[#faf6f0]"></div>
      </div>
      
      {/* Content */}
      <div className="flex-1 prophecy-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#d4a574]">
            {getTimeframeContent()}
          </span>
          <span className="text-xs text-[#2c5f6f]">
            #{index + 1}
          </span>
        </div>
        
        <h4 className="font-display text-lg font-semibold text-[#1e3a5f] mb-2">
          {submission.title}
        </h4>
        
        {submission.description && (
          <p className="text-[#2c5f6f] mb-3">{submission.description}</p>
        )}
        
        {getScriptureContent() && (
          <div className="bg-gradient-to-r from-[#87ceeb]/10 to-[#d4a574]/10 p-3 rounded-lg mb-3">
            <span className="text-xs font-medium text-[#2c5f6f] uppercase tracking-wide">Scripture Reference</span>
            <p className="text-[#1e3a5f] font-medium">{getScriptureContent()}</p>
          </div>
        )}
        
        <div className="flex items-center space-x-4 text-xs text-[#2c5f6f]">
          <span>Created: {new Date(submission.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>{submission.submission_content?.length || 0} content items</span>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    // Create server-side Supabase client
    const serverSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
      : null;

    if (serverSupabase) {
      // Fetch timelines with configurations
      const { data: timelines } = await serverSupabase
        .from('timelines')
        .select(`
          *,
          timeline_configuration(*)
        `)
        .eq('visibility', 'public')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      // Get submission counts for each timeline
      const timelinesWithCounts = await Promise.all(
        (timelines || []).map(async (timeline) => {
          const { count } = await serverSupabase
            .from('timeline_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('timeline_id', timeline.id);

          return {
            ...timeline,
            submission_count: count || 0,
            style: timeline.timeline_configuration?.[0]?.style || 'default',
            orientation: timeline.timeline_configuration?.[0]?.orientation || 'vertical'
          };
        })
      );

      return { props: { timelines: timelinesWithCounts } };
    }
    return { props: { timelines: [] } };
  } catch (error) {
    console.error('Error fetching timelines:', error);
    return { props: { timelines: [] } };
  }
}
