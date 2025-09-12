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
  const [mounted, setMounted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentStyle, setCurrentStyle] = useState('list');
  const [currentOrientation, setCurrentOrientation] = useState(timeline?.orientation || 'vertical');

  useEffect(() => {
    setMounted(true);
    setIsVisible(true);
  }, []);

  // Keyboard shortcuts for full-screen and zoom
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullScreen(!isFullScreen);
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setZoomLevel(prev => Math.min(prev + 0.2, 3));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomLevel(1);
      } else if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };

    if (mounted) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [mounted, isFullScreen]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  const handleZoomReset = () => setZoomLevel(1);
  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

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
                <span className="text-sm">Created {new Date(timeline.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}</span>
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

              {/* Controls Group */}
              <div className="flex flex-wrap items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1">
                  <button
                    onClick={() => {
                      setViewMode('timeline');
                      if (!['list', 'compact', 'full'].includes(currentStyle)) {
                        setCurrentStyle('list');
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'timeline'
                        ? 'bg-[#d4a574] text-white'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Timeline View
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('grid');
                      if (currentStyle === 'list') {
                        setCurrentStyle('full');
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      viewMode === 'grid'
                        ? 'bg-[#d4a574] text-white'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Grid View
                  </button>
                </div>

            {/* Timeline Style Selector */}
            {viewMode === 'timeline' && (
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1">
                {['list', 'compact', 'full'].map((style) => (
                  <button
                    key={style}
                    onClick={() => setCurrentStyle(style)}
                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all capitalize ${
                      currentStyle === style
                        ? 'bg-[#e89547] text-white'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}

            {/* Grid Style Selector */}
            {viewMode === 'grid' && (
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1">
                {['compact', 'full'].map((style) => (
                  <button
                    key={style}
                    onClick={() => setCurrentStyle(style)}
                    className={`px-3 py-2 rounded-full text-xs font-medium transition-all capitalize ${
                      currentStyle === style
                        ? 'bg-[#e89547] text-white'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            )}

                {/* Orientation Selector */}
                {viewMode === 'timeline' && (
                  <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1">
                    <button
                      onClick={() => setCurrentOrientation('vertical')}
                      className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                        currentOrientation === 'vertical'
                          ? 'bg-[#2c5f6f] text-white'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Vertical
                    </button>
                    <button
                      onClick={() => setCurrentOrientation('horizontal')}
                      className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                        currentOrientation === 'horizontal'
                          ? 'bg-[#2c5f6f] text-white'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Horizontal
                    </button>
                  </div>
                )}

                {/* Full-Screen Toggle */}
                <button
                  onClick={toggleFullScreen}
                  className="bg-white/10 backdrop-blur-sm rounded-full p-3 text-white/80 hover:text-white hover:bg-white/20 transition-all"
                  title="Full Screen (F)"
                >
                  {isFullScreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>

                {/* 3D View Link */}
                <Link
                  href={`/timeline/3d/${timeline.id}`}
                  className="prophecy-button-sm px-4 py-2 text-sm"
                  title="Open 3D Timeline View"
                >
                  3D View
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Content */}
      <section 
        className={`py-12 px-4 bg-[#faf6f0] min-h-screen transition-all duration-300 ${
          isFullScreen 
            ? 'fixed inset-0 z-50 overflow-auto' 
            : 'relative'
        }`}
      >
        {/* Full-Screen Zoom Controls */}
        {isFullScreen && (
          <div className="fixed top-4 right-4 z-60 flex items-center space-x-2 timeline-controls rounded-full p-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-full hover:bg-[#d4a574]/20 transition-colors"
              title="Zoom Out (-)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm font-medium text-[#1e3a5f] min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-full hover:bg-[#d4a574]/20 transition-colors"
              title="Zoom In (+)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 rounded-full hover:bg-[#d4a574]/20 transition-colors text-xs font-medium"
              title="Reset Zoom (0)"
            >
              100%
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
              title="Exit Full Screen (Esc)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        {isFullScreen && (
          <div className="fixed bottom-4 left-4 z-60 timeline-help-panel rounded-lg p-3">
            <div className="text-xs text-[#2c5f6f] space-y-1">
              <div><kbd className="bg-gray-200 px-1 rounded">F</kbd> Full Screen</div>
              <div><kbd className="bg-gray-200 px-1 rounded">+/-</kbd> Zoom</div>
              <div><kbd className="bg-gray-200 px-1 rounded">0</kbd> Reset</div>
              <div><kbd className="bg-gray-200 px-1 rounded">Esc</kbd> Exit</div>
            </div>
          </div>
        )}

        <div 
          className={`timeline-zoom-transition ${
            isFullScreen ? 'max-w-none mx-8' : 'max-w-6xl mx-auto'
          }`}
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
        >
          {!mounted ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
              <p className="text-[#2c5f6f] mt-4">Loading timeline...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
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
            <TimelineView 
              submissions={filteredSubmissions} 
              style={currentStyle}
              orientation={currentOrientation}
            />
          ) : (
            <GridView 
              submissions={filteredSubmissions} 
              style={currentStyle}
            />
          )}
        </div>
      </section>
    </>
  );
}

function TimelineView({ submissions, style = 'list', orientation = 'vertical' }) {
  if (orientation === 'horizontal') {
    return <HorizontalTimelineView submissions={submissions} style={style} />;
  }

  const getTimelineClass = () => {
    switch (style) {
      case 'compact':
        return 'space-y-6';
      case 'full':
        return 'space-y-16';
      case 'list':
      default:
        return 'space-y-12';
    }
  };

  const showTimelineLine = style !== 'compact';

  return (
    <div className="relative">
      {/* Timeline Line */}
      {showTimelineLine && (
        <div className={`absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#d4a574] to-[#f4d03f] ${
          style === 'full' ? 'left-1/2 transform -translate-x-1/2' : 'left-8'
        }`}></div>
      )}
      
      {/* Timeline Items */}
      <div className={getTimelineClass()}>
        {submissions.map((submission, index) => (
          <TimelineItem 
            key={submission.id} 
            submission={submission} 
            index={index} 
            style={style}
            showNode={showTimelineLine}
          />
        ))}
      </div>
    </div>
  );
}

function GridView({ submissions, style = 'full' }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {submissions.map((submission, index) => (
        <GridItem key={submission.id} submission={submission} index={index} style={style} />
      ))}
    </div>
  );
}

function HorizontalTimelineView({ submissions, style }) {
  const getContainerHeight = () => {
    switch (style) {
      case 'compact':
        return 'h-[400px]'; // Fixed height for compact cards above and below
      case 'full':
        return 'h-[600px]'; // Fixed height for full cards above and below
      case 'list':
      default:
        return 'h-[400px]'; // Increased height so cards aren't cut off
    }
  };

  const getTimelinePosition = () => {
    switch (style) {
      case 'compact':
      case 'full':
        return 'top-1/2'; // Center for alternating
      case 'list':
      default:
        return 'top-12'; // Higher up for list so cards are below
    }
  };

  return (
    <div className={`relative overflow-x-auto pb-8 horizontal-timeline ${getContainerHeight()}`}>
      {/* Horizontal Timeline Line */}
      <div className={`absolute ${getTimelinePosition()} left-0 right-0 h-0.5 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] transform -translate-y-1/2 z-10`}></div>
      
      {/* Timeline Items Container */}
      <div className="flex space-x-8 min-w-max px-4 h-full items-center">
        {submissions.map((submission, index) => (
          <HorizontalTimelineItem 
            key={submission.id} 
            submission={submission} 
            index={index} 
            style={style}
          />
        ))}
      </div>
    </div>
  );
}

function HorizontalTimelineItem({ submission, index, style }) {
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

  // For full and compact styles, alternate above and below
  const isAbove = (style === 'full' || style === 'compact') && index % 2 === 0;

  const getLayoutClasses = () => {
    switch (style) {
      case 'compact':
        return {
          container: `relative min-w-[200px] h-full flex items-center justify-center`,
          cardPosition: isAbove 
            ? 'absolute top-4 left-1/2 transform -translate-x-1/2' 
            : 'absolute bottom-4 left-1/2 transform -translate-x-1/2',
          nodePosition: 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20',
          card: 'bg-white/80 rounded-lg p-3 shadow-sm w-full max-w-xs',
          title: 'font-display text-sm font-semibold text-[#1e3a5f] mb-1'
        };
      case 'full':
        return {
          container: `relative min-w-[320px] h-full flex items-center justify-center`,
          cardPosition: isAbove 
            ? 'absolute top-4 left-1/2 transform -translate-x-1/2' 
            : 'absolute bottom-4 left-1/2 transform -translate-x-1/2',
          nodePosition: 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20',
          card: 'prophecy-card w-full max-w-md',
          title: 'font-display text-lg font-bold text-[#1e3a5f] mb-3'
        };
      case 'list':
      default:
        return {
          container: 'relative min-w-[300px] h-full flex items-center justify-center',
          cardPosition: 'absolute top-16 left-1/2 transform -translate-x-1/2',
          nodePosition: 'absolute top-12 left-1/2 transform -translate-x-1/2 z-20',
          card: 'prophecy-card w-full max-w-sm',
          title: 'font-display text-lg font-bold text-[#1e3a5f] mb-3'
        };
    }
  };

  const layoutClasses = getLayoutClasses();

  return (
    <div className={`${layoutClasses.container} animate-fade-in-up`} style={{ animationDelay: `${index * 0.1}s` }}>
      {/* Content Card */}
      <div className={`${layoutClasses.card} ${layoutClasses.cardPosition}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium text-[#d4a574] ${style !== 'compact' ? 'bg-gradient-to-r from-[#d4a574]/10 to-[#f4d03f]/10 px-3 py-1 rounded-full text-sm font-bold' : ''}`}>
            {getTimeframeContent()}
          </span>
          <span className="text-xs text-[#2c5f6f] font-medium">
            #{index + 1}
          </span>
        </div>
        
        <h4 className={layoutClasses.title}>
          {submission.title}
        </h4>
        
        {submission.description && (
          <p className={`text-[#2c5f6f] leading-relaxed ${style === 'compact' ? 'text-sm mb-2 line-clamp-2' : 'mb-4'}`}>{submission.description}</p>
        )}

        {style !== 'compact' && getTextContent() && (
          <div className="bg-gradient-to-r from-[#1e3a5f]/5 to-[#2c5f6f]/5 p-4 rounded-lg mb-4 border-l-4 border-[#d4a574]">
            <p className="text-[#1e3a5f] italic">{getTextContent()}</p>
          </div>
        )}
        
        {style !== 'compact' && getScriptureContent() && (
          <div className="bg-gradient-to-r from-[#87ceeb]/10 to-[#d4a574]/10 p-4 rounded-lg mb-4 border border-[#d4a574]/20">
            <div className="flex items-center mb-2">
              <span className="text-xs font-bold text-[#2c5f6f] uppercase tracking-wide">📖 Scripture Reference</span>
            </div>
            <p className="text-[#1e3a5f] font-semibold text-lg">{getScriptureContent()}</p>
          </div>
        )}
        
        <div className={`text-xs text-[#2c5f6f] ${style !== 'compact' ? 'flex items-center justify-between pt-4 border-t border-[#87ceeb]/20' : ''}`}>
          {style === 'compact' ? (
            <span>📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}</span>
          ) : (
            <div className="flex items-center space-x-4">
              <span>📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}</span>
              <span>•</span>
              <span>📝 {submission.submission_content?.length || 0} items</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Timeline Node */}
      <div className={layoutClasses.nodePosition}>
        <div className={`${style === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full ${style === 'compact' ? 'border-2' : 'border-4'} border-white shadow-lg`}></div>
        {style !== 'compact' && (
          <div className="absolute -top-1 -left-1 w-6 h-6 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-ping"></div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ submission, index, style = 'list', showNode = true }) {
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

  // For full style, alternate sides
  const isLeftSide = style === 'full' && index % 2 === 0;

  const getStyleClasses = () => {
    switch (style) {
      case 'compact':
        return {
          container: 'flex items-start space-x-4',
          card: 'flex-1 bg-white/80 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-300',
          title: 'font-display text-base font-semibold text-[#1e3a5f] mb-1',
          node: 'w-2 h-2 bg-[#d4a574] rounded-full mt-2 flex-shrink-0'
        };
      case 'full':
        return {
          container: `relative flex ${isLeftSide ? 'justify-start' : 'justify-end'} w-full`,
          card: `w-full max-w-2xl prophecy-card hover:shadow-xl transition-all duration-300 ${isLeftSide ? 'mr-6' : 'ml-6'}`,
          title: 'font-display text-lg font-bold text-[#1e3a5f] mb-3',
          node: 'w-4 h-4 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full border-4 border-white shadow-lg'
        };
      case 'list':
      default:
        return {
          container: 'relative flex items-start space-x-8',
          card: 'flex-1 prophecy-card hover:shadow-xl transition-all duration-300',
          title: 'font-display text-xl font-bold text-[#1e3a5f] mb-3',
          node: showNode ? 'w-4 h-4 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full border-4 border-[#faf6f0] shadow-lg mt-6' : null
        };
    }
  };

  const styleClasses = getStyleClasses();

  if (style === 'compact') {
    return (
      <div className={`animate-fade-in-up ${styleClasses.container}`} style={{ animationDelay: `${index * 0.1}s` }}>
        <div className={styleClasses.node}></div>
        <div className={styleClasses.card}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#d4a574]">
              {getTimeframeContent()}
            </span>
            <span className="text-xs text-[#2c5f6f]">
              #{index + 1}
            </span>
          </div>
          
          <h4 className={styleClasses.title}>
            {submission.title}
          </h4>
          
          {submission.description && (
            <p className="text-[#2c5f6f] text-sm leading-relaxed mb-2">{submission.description}</p>
          )}
          
          <div className="text-xs text-[#2c5f6f]">
            📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    );
  }

  if (style === 'full') {
    return (
      <div className={`animate-fade-in-up ${styleClasses.container}`} style={{ animationDelay: `${index * 0.1}s` }}>
        {/* Timeline Node - positioned in center */}
        <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
          <div className={styleClasses.node}></div>
          <div className="absolute -top-1 -left-1 w-6 h-6 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-ping"></div>
        </div>
        
        {/* Content Card */}
        <div className={styleClasses.card}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-[#d4a574] bg-gradient-to-r from-[#d4a574]/10 to-[#f4d03f]/10 px-3 py-1 rounded-full">
              {getTimeframeContent()}
            </span>
            <span className="text-xs text-[#2c5f6f] font-medium">
              Entry #{index + 1}
            </span>
          </div>
          
          <h4 className={styleClasses.title}>
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
              <span>📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}</span>
              <span>•</span>
              <span>📝 {submission.submission_content?.length || 0} items</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default and Card styles (both use same layout)
  return (
    <div className={`animate-fade-in-up ${styleClasses.container}`} style={{ animationDelay: `${index * 0.1}s` }}>
      {/* Timeline Node */}
      {styleClasses.node && (
        <div className="relative z-10 flex-shrink-0">
          <div className={styleClasses.node}></div>
          {style === 'default' && (
            <div className="absolute -top-1 -left-1 w-6 h-6 bg-gradient-to-r from-[#d4a574] to-[#f4d03f] rounded-full opacity-20 animate-ping"></div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className={styleClasses.card}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-[#d4a574] bg-gradient-to-r from-[#d4a574]/10 to-[#f4d03f]/10 px-3 py-1 rounded-full">
            {getTimeframeContent()}
          </span>
          <span className="text-xs text-[#2c5f6f] font-medium">
            Entry #{index + 1}
          </span>
        </div>
        
        <h4 className={styleClasses.title}>
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
            <span>📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}</span>
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

function GridItem({ submission, index, style = 'full' }) {
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

  if (style === 'compact') {
    return (
      <div className="bg-white/80 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#d4a574]">
            {getTimeframeContent()}
          </span>
          <span className="text-xs text-[#2c5f6f]">
            #{index + 1}
          </span>
        </div>
        
        <h4 className="font-display text-base font-semibold text-[#1e3a5f] mb-1">
          {submission.title}
        </h4>
        
        {submission.description && (
          <p className="text-[#2c5f6f] text-sm leading-relaxed mb-2 line-clamp-2">{submission.description}</p>
        )}
        
        <div className="text-xs text-[#2c5f6f]">
          📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      </div>
    );
  }

  // Full style - show all content
  return (
    <div className="prophecy-card hover:shadow-xl transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-[#d4a574] bg-gradient-to-r from-[#d4a574]/10 to-[#f4d03f]/10 px-3 py-1 rounded-full">
          {getTimeframeContent()}
        </span>
        <span className="text-xs text-[#2c5f6f] font-medium">
          Entry #{index + 1}
        </span>
      </div>
      
      <h4 className="font-display text-lg font-bold text-[#1e3a5f] mb-2">
        {submission.title}
      </h4>
      
      {submission.description && (
        <p className="text-[#2c5f6f] text-sm mb-3 leading-relaxed">{submission.description}</p>
      )}

      {getTextContent() && (
        <div className="bg-gradient-to-r from-[#1e3a5f]/5 to-[#2c5f6f]/5 p-3 rounded-lg mb-3 border-l-4 border-[#d4a574]">
          <p className="text-[#1e3a5f] italic text-sm">{getTextContent()}</p>
        </div>
      )}
      
      {getScriptureContent() && (
        <div className="bg-gradient-to-r from-[#87ceeb]/10 to-[#d4a574]/10 p-3 rounded-lg mb-3 border border-[#d4a574]/20">
          <span className="text-xs font-bold text-[#2c5f6f] uppercase tracking-wide block mb-1">📖 Scripture Reference</span>
          <p className="text-[#1e3a5f] font-semibold text-sm">{getScriptureContent()}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-[#2c5f6f] pt-3 border-t border-[#87ceeb]/20">
        <div className="flex items-center space-x-2">
          <span>📅 {new Date(submission.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}</span>
          <span>•</span>
          <span>📝 {submission.submission_content?.length || 0} items</span>
        </div>
        <div className="flex items-center space-x-1">
          {submission.submission_content?.slice(0, 3).map((content, idx) => (
            <span key={idx} className="w-1.5 h-1.5 bg-[#d4a574] rounded-full opacity-60"></span>
          ))}
        </div>
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
