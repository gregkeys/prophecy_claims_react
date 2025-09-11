import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  : null;

export default function TimelineDetail({ timeline, submissions }) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [viewMode, setViewMode] = useState('timeline');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSubmissions, setFilteredSubmissions] = useState(submissions);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = submissions.filter(submission =>
        submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.submission_content?.some(content =>
          content.content?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredSubmissions(filtered);
    } else {
      setFilteredSubmissions(submissions);
    }
  }, [searchTerm, submissions]);

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

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
        <title>{timeline.name} - Divine Timeline | Prophecy Claims</title>
        <meta name="description" content={timeline.description || `Explore the ${timeline.name} prophetic timeline revealing divine truth.`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#1e3a5f]/95 backdrop-blur-sm border-b border-[#2c5f6f]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold prophecy-gradient-text">
            Prophecy.Claims
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-[#faf6f0] hover:text-[#d4a574] transition-colors">
              Home
            </Link>
            <Link href="/timelines" className="text-[#faf6f0] hover:text-[#d4a574] transition-colors">
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
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#2c5f6f] to-[#87ceeb]"></div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-float"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-[#e89547] to-[#d4a574] rounded-full opacity-30 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 px-4 max-w-7xl mx-auto">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Breadcrumb */}
            <div className="mb-6">
              <nav className="flex items-center space-x-2 text-sm text-[#87ceeb]">
                <Link href="/timelines" className="hover:text-[#d4a574] transition-colors">
                  Timelines
                </Link>
                <span>•</span>
                <span className="text-[#faf6f0]">{timeline.name}</span>
              </nav>
            </div>

            {/* Timeline Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full"></div>
                  <span className="text-sm font-medium text-[#87ceeb] uppercase tracking-wide">
                    {timeline.visibility} Timeline
                  </span>
                </div>
                {timeline.featured && (
                  <span className="ml-4 text-sm bg-gradient-to-r from-[#e89547] to-[#f4d03f] text-white px-3 py-1 rounded-full font-medium">
                    ⭐ Featured
                  </span>
                )}
              </div>
              
              <h1 className="font-display text-4xl md:text-6xl font-bold text-[#faf6f0] mb-4">
                {timeline.name}
              </h1>
              
              {timeline.description && (
                <p className="text-xl text-[#87ceeb] max-w-3xl mx-auto mb-6">
                  {timeline.description}
                </p>
              )}

              <div className="flex justify-center items-center space-x-8 text-[#87ceeb]">
                <span className="text-sm">{submissions.length} entries</span>
                <span className="text-sm">•</span>
                <span className="text-sm">Created {new Date(timeline.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search timeline entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:border-[#d4a574] transition-colors"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
                  🔍
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-[#d4a574] text-white'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Timeline View
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#d4a574] text-white'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Grid View
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Content */}
      <section className="py-12 px-4 bg-[#faf6f0] min-h-screen">
        <div className="max-w-6xl mx-auto">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📜</div>
              <h3 className="text-2xl font-bold text-[#1e3a5f] mb-2">
                {searchTerm ? 'No matching entries found' : 'No entries yet'}
              </h3>
              <p className="text-[#2c5f6f] mb-6">
                {searchTerm ? 'Try a different search term' : 'This timeline is waiting for its first prophetic entry'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="prophecy-button"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : viewMode === 'timeline' ? (
            <TimelineView submissions={filteredSubmissions} />
          ) : (
            <GridView submissions={filteredSubmissions} />
          )}
        </div>
      </section>
    </>
  );
}

function TimelineView({ submissions }) {
  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#d4a574] to-[#f4d03f]"></div>
      
      {/* Timeline Items */}
      <div className="space-y-12">
        {submissions.map((submission, index) => (
          <TimelineItem key={submission.id} submission={submission} index={index} />
        ))}
      </div>
    </div>
  );
}

function GridView({ submissions }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {submissions.map((submission, index) => (
        <GridItem key={submission.id} submission={submission} index={index} />
      ))}
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

  const getTextContent = () => {
    const textContent = submission.submission_content?.find(c => c.type === 'text');
    return textContent?.content || null;
  };

  return (
    <div className="relative flex items-start space-x-8 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
      {/* Timeline Node */}
      <div className="relative z-10 flex-shrink-0 mt-6">
        <div className="w-4 h-4 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full border-4 border-[#faf6f0] shadow-lg"></div>
        <div className="absolute -top-1 -left-1 w-6 h-6 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-ping"></div>
      </div>
      
      {/* Content */}
      <div className="flex-1 prophecy-card hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-[#d4a574] bg-gradient-to-r from-[#d4a574]/10 to-[#f4d03f]/10 px-3 py-1 rounded-full">
            {getTimeframeContent()}
          </span>
          <span className="text-xs text-[#2c5f6f] font-medium">
            Entry #{index + 1}
          </span>
        </div>
        
        <h4 className="font-display text-xl font-bold text-[#1e3a5f] mb-3">
          {submission.title}
        </h4>
        
        {submission.description && (
          <p className="text-[#2c5f6f] mb-4 leading-relaxed">{submission.description}</p>
        )}

        {getTextContent() && (
          <div className="bg-gradient-to-r from-[#1e3a5f]/5 to-[#2c5f6f]/5 p-4 rounded-lg mb-4 border-l-4 border-[#d4a574]">
            <p className="text-[#1e3a5f] italic">{getTextContent()}</p>
          </div>
        )}
        
        {getScriptureContent() && (
          <div className="bg-gradient-to-r from-[#87ceeb]/10 to-[#d4a574]/10 p-4 rounded-lg mb-4 border border-[#d4a574]/20">
            <div className="flex items-center mb-2">
              <span className="text-xs font-bold text-[#2c5f6f] uppercase tracking-wide">📖 Scripture Reference</span>
            </div>
            <p className="text-[#1e3a5f] font-semibold text-lg">{getScriptureContent()}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t border-[#87ceeb]/20">
          <div className="flex items-center space-x-4 text-xs text-[#2c5f6f]">
            <span>📅 {new Date(submission.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>📝 {submission.submission_content?.length || 0} items</span>
          </div>
          <div className="flex items-center space-x-2">
            {submission.submission_content?.map((content, idx) => (
              <span key={idx} className="w-2 h-2 bg-[#d4a574] rounded-full opacity-60"></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GridItem({ submission, index }) {
  const getTimeframeContent = () => {
    const timeframeContent = submission.submission_content?.find(c => c.type === 'timeframe');
    return timeframeContent?.content || 'Date not specified';
  };

  const getScriptureContent = () => {
    const scriptureContent = submission.submission_content?.find(c => c.type === 'scriptures');
    return scriptureContent?.content || null;
  };

  return (
    <div className="prophecy-card hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-[#d4a574]">
          {getTimeframeContent()}
        </span>
        <span className="text-xs text-[#2c5f6f]">
          #{index + 1}
        </span>
      </div>
      
      <h4 className="font-display text-lg font-bold text-[#1e3a5f] mb-2">
        {submission.title}
      </h4>
      
      {submission.description && (
        <p className="text-[#2c5f6f] text-sm mb-3 line-clamp-3">{submission.description}</p>
      )}
      
      {getScriptureContent() && (
        <div className="bg-gradient-to-r from-[#87ceeb]/10 to-[#d4a574]/10 p-3 rounded-lg mb-3">
          <span className="text-xs font-medium text-[#2c5f6f] uppercase tracking-wide block mb-1">📖 Scripture</span>
          <p className="text-[#1e3a5f] font-semibold text-sm">{getScriptureContent()}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-[#2c5f6f] pt-3 border-t border-[#87ceeb]/20">
        <span>{new Date(submission.created_at).toLocaleDateString()}</span>
        <span>{submission.submission_content?.length || 0} items</span>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  try {
    // Create server-side Supabase client
    const serverSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
      ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
      : null;

    if (!serverSupabase) {
      return { notFound: true };
    }

    const { id } = params;

    // Fetch timeline details
    const { data: timeline } = await serverSupabase
      .from('timelines')
      .select(`
        *,
        timeline_configuration(*)
      `)
      .eq('id', id)
      .single();

    if (!timeline) {
      return { notFound: true };
    }

    // First get timeline submissions with order
    const { data: timelineSubmissions } = await serverSupabase
      .from('timeline_submissions')
      .select('submission_id, order_position')
      .eq('timeline_id', id)
      .order('order_position');

    let submissions = [];
    if (timelineSubmissions && timelineSubmissions.length > 0) {
      // Then get the submissions with content
      const submissionIds = timelineSubmissions.map(ts => ts.submission_id);
      const { data: submissionsData } = await serverSupabase
        .from('enhanced_submissions')
        .select(`
          *,
          submission_content(*)
        `)
        .in('id', submissionIds);

      // Merge and sort by order_position
      submissions = submissionsData?.map(submission => {
        const timelineSubmission = timelineSubmissions.find(ts => ts.submission_id === submission.id);
        return {
          ...submission,
          order_position: timelineSubmission?.order_position || 0
        };
      }).sort((a, b) => a.order_position - b.order_position) || [];
    }

    return {
      props: {
        timeline: {
          ...timeline,
          style: timeline.timeline_configuration?.[0]?.style || 'default',
          orientation: timeline.timeline_configuration?.[0]?.orientation || 'vertical'
        },
        submissions: submissions || []
      }
    };
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return { notFound: true };
  }
}
