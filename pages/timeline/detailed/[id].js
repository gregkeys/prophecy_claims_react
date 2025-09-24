import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import InfiniteTimeline from '../../../components/infinite-timeline';
import { supabase as browserSupabase } from '../../../lib/supabaseClient';

export default function DetailedTimeline({ timeline, submissions }) {
  const titleRef = useRef(null);
  const [timelineHeight, setTimelineHeight] = useState(600);
  const [liveSubmissions, setLiveSubmissions] = useState(submissions);
  const [canEdit, setCanEdit] = useState(false);
  const [title, setTitle] = useState(timeline?.name || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleStatus, setTitleStatus] = useState('');
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fallbackTimeline, setFallbackTimeline] = useState(null);
  const [fallbackSubmissions, setFallbackSubmissions] = useState([]);

  // Drawer create item state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [itemType, setItemType] = useState('event'); // 'event' | 'period'
  const [anchorTs, setAnchorTs] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [eventDateTime, setEventDateTime] = useState(''); // ISO local (datetime-local)
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

  // Content area state
  const [selectedContent, setSelectedContent] = useState(null); // 'text' | 'image' | 'video' | 'audio' | 'link' | 'scripture' | 'celestial'
  const [contentItems, setContentItems] = useState([]);
  const [textContent, setTextContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureText, setScriptureText] = useState('');
  const [celestialEventType, setCelestialEventType] = useState('');
  const [celestialBodies, setCelestialBodies] = useState('');
  const [celestialLocation, setCelestialLocation] = useState('');
  const [celestialNotes, setCelestialNotes] = useState('');

  // Style state (stored under enhanced_submissions.metadata.style)
  const [styleItemStyle, setStyleItemStyle] = useState('card');
  const [styleTimelinePosition, setStyleTimelinePosition] = useState('above');
  const [styleLinePosition, setStyleLinePosition] = useState('center');
  const [styleBorderStyle, setStyleBorderStyle] = useState('solid');
  const [styleColorBackground, setStyleColorBackground] = useState('');
  const [styleColorBorder, setStyleColorBorder] = useState('');
  const [styleColorText, setStyleColorText] = useState('');
  const [styleOpen, setStyleOpen] = useState(false);

  // View mode (for non-owners or when edit mode is off)
  const [viewerMode, setViewerMode] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Close drawer when clicking outside
  const closeDrawer = () => { setDrawerOpen(false); setViewerMode(false); };

  // Switch drawer content when toggling edit mode
  useEffect(() => {
    if (!drawerOpen) return;
    if (canEdit && isEditing) {
      setViewerMode(false);
    } else {
      setViewerMode(true);
      setStyleOpen(false);
    }
  }, [isEditing, canEdit, drawerOpen]);

  const resetContentForms = () => {
    setSelectedContent(null);
    setTextContent('');
    setImageUrl('');
    setVideoUrl('');
    setAudioUrl('');
    setLinkUrl('');
    setLinkTitle('');
    setScriptureRef('');
    setScriptureText('');
    setCelestialEventType('');
    setCelestialBodies('');
    setCelestialLocation('');
    setCelestialNotes('');
  };

  const createSubmissionBase = async (pickedType, ts, initial = { title: 'Untitled', description: '' }) => {
    try {
      setCreateError('');
      if (!canEdit || !browserSupabase) throw new Error('Not authorized');
      const titleClean = (initial.title || 'Untitled').trim();
      const descriptionClean = (initial.description || '').trim();

      const { data: subRows, error: subErr } = await browserSupabase
        .from('enhanced_submissions')
        .insert([{ title: titleClean, description: descriptionClean, user_id: currentUserId }])
        .select('id')
        .single();
      if (subErr) throw subErr;
      const submissionId = subRows?.id;
      if (!submissionId) throw new Error('Failed to create submission');

      const baseMeta = pickedType === 'period' ? { start_ts: ts } : { ts };
      const baseContent = pickedType === 'period'
        ? JSON.stringify({ start: new Date(ts).toISOString() })
        : new Date(ts).toISOString();

      const { error: tfErr } = await browserSupabase
        .from('submission_content')
        .insert([{ submission_id: submissionId, type: 'timeframe', content: baseContent, metadata: baseMeta }]);
      if (tfErr) throw tfErr;

      const orderPos = (Array.isArray(liveSubmissions) ? liveSubmissions.length : 0) + 1;
      const { error: linkErr } = await browserSupabase
        .from('timeline_submissions')
        .insert([{ timeline_id: timeline.id, submission_id: submissionId, order_position: orderPos }]);
      if (linkErr) throw linkErr;

      setCurrentSubmissionId(submissionId);
      // Fetch full submission with content and append to local state for immediate timeline refresh
      const { data: fetched } = await browserSupabase
        .from('enhanced_submissions')
        .select('*, submission_content(*)')
        .eq('id', submissionId)
        .single();
      if (fetched && (fetched.status || 'active').toLowerCase() === 'active') setLiveSubmissions((prev) => [...prev, fetched]);
      return submissionId;
    } catch (e) {
      setCreateError(e?.message || 'Failed to create');
      return null;
    }
  };

  const duplicateSubmission = async () => {
    try {
      if (!currentSubmissionId || !browserSupabase) return;
      const { data: contents } = await browserSupabase
        .from('submission_content')
        .select('*')
        .eq('submission_id', currentSubmissionId);

      const { data: subRows, error: subErr } = await browserSupabase
        .from('enhanced_submissions')
        .insert([{ title: newTitle || 'Untitled', description: newDescription || '', user_id: currentUserId }])
        .select('id')
        .single();
      if (subErr) throw subErr;
      const newId = subRows?.id;

      const rows = (contents || []).map((c) => ({ submission_id: newId, type: c.type, content: c.content, metadata: c.metadata }));
      if (rows.length > 0) {
        const { error: insErr } = await browserSupabase.from('submission_content').insert(rows);
        if (insErr) throw insErr;
      }

      const orderPos = (Array.isArray(submissions) ? submissions.length : 0) + 1;
      const { error: linkErr } = await browserSupabase
        .from('timeline_submissions')
        .insert([{ timeline_id: timeline.id, submission_id: newId, order_position: orderPos }]);
      if (linkErr) throw linkErr;

      setCurrentSubmissionId(newId);
    } catch (e) {
      setCreateError(e?.message || 'Failed to duplicate');
    }
  };

  const deleteSubmission = async () => {
    try {
      if (!currentSubmissionId || !browserSupabase) return;
      // Soft-delete submissions by setting status to 'deleted' for safety
      await browserSupabase.from('enhanced_submissions').update({ status: 'deleted' }).eq('id', currentSubmissionId);
      await browserSupabase.from('timeline_submissions').delete().eq('timeline_id', timeline.id).eq('submission_id', currentSubmissionId);
      setLiveSubmissions((prev) => (prev || []).filter((s) => s.id !== currentSubmissionId));
      setCurrentSubmissionId(null);
      setDrawerOpen(false);
      // No full reload needed; list updated locally
    } catch (e) {
      setCreateError(e?.message || 'Failed to delete');
    }
  };

  const addContentItem = () => {
    try {
      const type = selectedContent;
      if (!type) return;
      let item = null;
      if (type === 'text') {
        const content = (textContent || '').trim();
        if (!content) throw new Error('Text is required');
        item = { type, content };
      } else if (type === 'image') {
        const url = (imageUrl || '').trim();
        if (!url) throw new Error('Image URL is required');
        item = { type, content: url };
      } else if (type === 'video') {
        const url = (videoUrl || '').trim();
        if (!url) throw new Error('Video URL is required');
        item = { type, content: url };
      } else if (type === 'audio') {
        const url = (audioUrl || '').trim();
        if (!url) throw new Error('Audio URL is required');
        item = { type, content: url };
      } else if (type === 'link') {
        const url = (linkUrl || '').trim();
        if (!url) throw new Error('Link URL is required');
        const metadata = linkTitle ? { title: linkTitle } : null;
        item = { type, content: url, metadata };
      } else if (type === 'scripture') {
        const ref = (scriptureRef || '').trim();
        if (!ref) throw new Error('Scripture reference is required');
        const metadata = scriptureText ? { text: scriptureText } : null;
        item = { type, content: ref, metadata };
      } else if (type === 'celestial') {
        const eventType = (celestialEventType || '').trim();
        const bodies = (celestialBodies || '').trim();
        if (!eventType || !bodies) throw new Error('Event type and bodies are required');
        const metadata = {
          event_type: eventType,
          bodies,
          location: celestialLocation || '',
          notes: celestialNotes || ''
        };
        item = { type, content: `${eventType}: ${bodies}`, metadata };
      }
      if (item) {
        setContentItems((prev) => [...prev, item]);
        resetContentForms();
      }
    } catch (e) {
      setCreateError(e?.message || 'Invalid content input');
    }
  };

  // --- Inline updates on blur ---
  const buildPublicUrl = (path) => {
    if (!path) return '';
    const str = String(path);
    if (/^https?:\/\//i.test(str)) return str;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'prophecy-files';
    if (!supabaseUrl) return str;
    const base = supabaseUrl.replace(/\/$/, '');
    const clean = str.replace(/^\/+/, '');
    const withBucket = clean.startsWith(`${bucket}/`) ? clean : `${bucket}/${clean}`;
    return `${base}/storage/v1/object/public/${withBucket}`;
  };

  const refreshSubmission = async (submissionId) => {
    if (!browserSupabase || !submissionId) return;
    const { data } = await browserSupabase
      .from('enhanced_submissions')
      .select('*, submission_content(*)')
      .eq('id', submissionId)
      .single();
    if (data) {
      setLiveSubmissions((prev) => {
        const others = (prev || []).filter((s) => s.id !== submissionId);
        return [...others, data];
      });
    }
  };

  const updateSubmissionField = async (field, value) => {
    try {
      if (!currentSubmissionId || !browserSupabase) return;
      const payload = { [field]: value };
      const { error } = await browserSupabase
        .from('enhanced_submissions')
        .update(payload)
        .eq('id', currentSubmissionId);
      if (error) throw error;
      await refreshSubmission(currentSubmissionId);
    } catch (e) {
      setCreateError(e?.message || 'Failed to update');
    }
  };

  const saveStyleToMetadata = async (overrides = {}) => {
    try {
      if (!currentSubmissionId || !browserSupabase) return;
      const style = {
        colors: {
          background: (overrides.background ?? styleColorBackground) || null,
          border: (overrides.border ?? styleColorBorder) || null,
          text: (overrides.text ?? styleColorText) || null,
        },
        textLayout: 'left',
        design: {
          itemStyle: overrides.itemStyle ?? styleItemStyle,
          linePosition: overrides.linePosition ?? styleLinePosition,
          borderStyle: overrides.borderStyle ?? styleBorderStyle,
        },
        timelinePosition: overrides.timelinePosition ?? styleTimelinePosition,
      };
      const { data: current } = await browserSupabase
        .from('enhanced_submissions')
        .select('metadata')
        .eq('id', currentSubmissionId)
        .single();
      const root = (current?.metadata && typeof current.metadata === 'object') ? current.metadata : {};
      const nextMeta = { ...root, style };
      const { error } = await browserSupabase
        .from('enhanced_submissions')
        .update({ metadata: nextMeta })
        .eq('id', currentSubmissionId);
      if (error) throw error;
      await refreshSubmission(currentSubmissionId);
    } catch (e) {
      setCreateError(e?.message || 'Failed to save style');
    }
  };

  const updateTimeframe = async (opts) => {
    try {
      if (!currentSubmissionId || !browserSupabase) return;
      const base = { };
      let content = '';
      if (opts.type === 'event') {
        base.metadata = { ts: opts.ts };
        content = new Date(opts.ts).toISOString();
      } else {
        const metadata = {};
        if (Number.isFinite(opts.start_ts)) metadata.start_ts = opts.start_ts;
        if (Number.isFinite(opts.end_ts)) metadata.end_ts = opts.end_ts;
        base.metadata = metadata;
        const obj = {};
        if (Number.isFinite(opts.start_ts)) obj.start = new Date(opts.start_ts).toISOString();
        if (Number.isFinite(opts.end_ts)) obj.end = new Date(opts.end_ts).toISOString();
        content = JSON.stringify(obj);
      }
      base.content = content;
      const { error } = await browserSupabase
        .from('submission_content')
        .update(base)
        .eq('submission_id', currentSubmissionId)
        .eq('type', 'timeframe');
      if (error) throw error;
      await refreshSubmission(currentSubmissionId);
    } catch (e) {
      setCreateError(e?.message || 'Failed to update timeframe');
    }
  };

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
      const ownerId = (timeline?.user_id) || (fallbackTimeline?.user_id) || null;
      setCanEdit(Boolean(uid && ownerId && uid === ownerId));
      setCurrentUserId(uid || null);
    };
    checkOwnership();
  }, [timeline?.user_id, fallbackTimeline?.user_id]);

  // If SSR could not load (e.g., private), fetch on client with user session
  useEffect(() => {
    const fetchClient = async () => {
      if (timeline || !browserSupabase) return;
      const id = router.query?.id;
      if (!id) return;
      const { data: tl } = await browserSupabase
        .from('timelines')
        .select('*')
        .eq('id', id)
        .single();
      if (!tl) return;
      setFallbackTimeline(tl);
      setTitle(tl.name || '');

      const { data: timelineSubmissions } = await browserSupabase
        .from('timeline_submissions')
        .select('submission_id, order_position')
        .eq('timeline_id', id)
        .order('order_position');
      if (timelineSubmissions && timelineSubmissions.length > 0) {
        const submissionIds = timelineSubmissions.map(ts => ts.submission_id);
        const { data: subs } = await browserSupabase
          .from('enhanced_submissions')
          .select(`*, submission_content(*)`)
          .in('id', submissionIds);
        setFallbackSubmissions(subs || []);
        setLiveSubmissions(subs || []);
      }
    };
    fetchClient();
  }, [router.query?.id, browserSupabase, timeline]);

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

  const toTimestamp = (localDateTime) => {
    const parsed = Date.parse(localDateTime);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleCreateItem = async () => {
    try {
      setCreateError('');
      setCreating(true);
      if (!canEdit || !browserSupabase) throw new Error('Not authorized');

      const titleClean = (newTitle || '').trim();
      const descriptionClean = (newDescription || '').trim();
      if (!titleClean) throw new Error('Title is required');

      // Insert into enhanced_submissions first
      const { data: subRows, error: subErr } = await browserSupabase
        .from('enhanced_submissions')
        .insert([{ title: titleClean, description: descriptionClean, user_id: currentUserId }])
        .select('id')
        .single();
      if (subErr) throw subErr;
      const submissionId = subRows?.id;
      if (!submissionId) throw new Error('Failed to create submission');

      // Build timeframe content row
      let type = 'timeframe';
      let content = '';
      let metadata = {};
      if (itemType === 'event') {
        const ts = toTimestamp(eventDateTime);
        if (!ts) throw new Error('Provide a valid event date & time');
        metadata = { ts };
        content = new Date(ts).toISOString();
      } else {
        const startTs = toTimestamp(startDateTime);
        const endTs = toTimestamp(endDateTime);
        if (!startTs || !endTs) throw new Error('Provide valid start and end date & time');
        if (endTs < startTs) throw new Error('End must be after start');
        metadata = { start_ts: startTs, end_ts: endTs };
        content = JSON.stringify({ start: new Date(startTs).toISOString(), end: new Date(endTs).toISOString() });
      }

      const { error: contentErr } = await browserSupabase
        .from('submission_content')
        .insert([{ submission_id: submissionId, type, content, metadata }]);
      if (contentErr) throw contentErr;

      // Insert any additional content rows
      if (contentItems.length > 0) {
        const rows = contentItems.map((ci) => ({
          submission_id: submissionId,
          type: ci.type,
          content: ci.content || '',
          metadata: ci.metadata || null
        }));
        const { error: addErr } = await browserSupabase
          .from('submission_content')
          .insert(rows);
        if (addErr) throw addErr;
      }

      // Link to this timeline (append at end)
      const orderPos = (Array.isArray(submissions) ? submissions.length : 0) + 1;
      const { error: linkErr } = await browserSupabase
        .from('timeline_submissions')
        .insert([{ timeline_id: timeline.id, submission_id: submissionId, order_position: orderPos }]);
      if (linkErr) throw linkErr;

      // Reset and refresh
      setNewTitle('');
      setNewDescription('');
      setEventDateTime('');
      setStartDateTime('');
      setEndDateTime('');
      setDrawerOpen(false);
      await router.replace(router.asPath);
    } catch (e) {
      setCreateError(e?.message || 'Failed to create timeline item');
    } finally {
      setCreating(false);
    }
  };
  // When SSR returns notFound for private timelines, allow client-side load for owners
  if (!timeline && (!fallbackTimeline)) {
    // Show a loading state instead of 404 while we try client-side fetch
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2c5f6f]">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading timeline…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`${String(timeline?.name ?? '')} - Detailed Timeline | Prophecy Claims`}</title>
        <meta name="description" content={timeline.description || `Explore the ${timeline.name} detailed infinite timeline.`} />
      </Head>
      {/* Global header provided by _app.js */}

      <section className="pt-8 pb-2 min-h-screen" style={{ backgroundColor: 'var(--prophecy-cream)' }}>
        <div className="w-full px-0">
          <div ref={titleRef} className="mb-1 px-4 sm:px-6 lg:px-12">
            <div className="flex items-center justify-center gap-3 flex-wrap">
            {editingTitle ? (
              <input
                  className="font-display text-3xl md:text-4xl font-bold text-[#1e3a5f] bg-white/70 border border-[#e3c292]/60 rounded-xl px-3 py-2 w-full max-w-3xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTitle(); } if (e.key === 'Escape') { setTitle(timeline.name); setEditingTitle(false); } }}
                autoFocus
              />
            ) : (
              <h1
                  className={`font-display text-3xl md:text-4xl font-bold break-words text-center ${canEdit ? 'text-[#1e3a5f] cursor-text hover:underline decoration-dotted' : 'text-[#1e3a5f]'}`}
                onClick={() => { if (canEdit) setEditingTitle(true); }}
              >
                {title}
              </h1>
            )}
              {canEdit && (
                <button
                  onClick={() => setIsEditing((v) => !v)}
                  aria-pressed={isEditing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all whitespace-nowrap ring-2 ${
                    isEditing
                      ? 'bg-[#e89547] text-white ring-[#f4d03f] hover:brightness-105'
                      : 'bg-white text-[#1e3a5f] ring-[#e3c292] hover:bg-[#fff6ee]'
                  }`}
                  title="Toggle Edit Mode"
                >
                  <span>{isEditing ? '✎' : '✎'}</span>
                  <span>{isEditing ? 'Edit Mode: On' : 'Edit Mode: Off'}</span>
                </button>
              )}
            </div>
            {timeline.description && (
              <p className="text-[#2c5f6f] mt-1 max-w-3xl mx-auto">{timeline.description}</p>
            )}
            {titleStatus && <div className="text-sm text-red-600 mt-2">{titleStatus}</div>}
          </div>

          {/* Create/Details Drawer */}
          {(canEdit || viewerMode) && (
            <div className={`fixed inset-0 z-40 ${drawerOpen ? '' : 'pointer-events-none'}`}>
              {/* overlay backdrop to close on outside click */}
              <div className={`absolute inset-0 bg-black/30 transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={closeDrawer} />
              <div className={`absolute top-0 right-0 h-full w-[90%] sm:w-[480px] bg-white border-l shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`} role="dialog" aria-modal="true">
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/10 to-warning/10">
                  <h2 className="text-lg font-semibold">{viewerMode ? 'Details' : `Add ${itemType === 'event' ? 'Event' : 'Time Period'}`}</h2>
                  <div className="flex items-center gap-2">
                    {!viewerMode && (
                      <button onClick={() => setStyleOpen((v) => !v)} title="Style" aria-label="Style" className={`btn btn-sm btn-ghost ${styleOpen ? 'bg-primary/20' : ''}`}>🎨</button>
                    )}
                    <button onClick={closeDrawer} className="btn btn-sm btn-ghost">✕</button>
                  </div>
                </div>
                <div className="p-0 overflow-auto">
                  {viewerMode ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-[#fff7e8] to-[#fff] px-5 py-4 border-b border-[#e3c292]/50">
                        <div className="font-display text-2xl md:text-3xl font-bold text-[#1e3a5f] break-words">{newTitle}</div>
                        <div className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-[#e3c292]/20 text-[#1e3a5f] border border-[#e3c292]/60">
                          {itemType === 'event' ? (
                            eventDateTime ? new Date(eventDateTime).toLocaleString() : ''
                          ) : (
                            <>
                              <span>{startDateTime ? new Date(startDateTime).toLocaleString() : ''}</span>
                              <span>{endDateTime ? ` — ${new Date(endDateTime).toLocaleString()}` : ''}</span>
                            </>
                          )}
                        </div>
                        {newDescription && <div className="mt-3 text-[#2c5f6f] whitespace-pre-wrap">{newDescription}</div>}
                      </div>

                      <div className="px-5 pb-5 space-y-5">
                        {/* Images */}
                        {(contentItems || []).some((c) => (c.type||'').toLowerCase() === 'image') && (
                          <div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(contentItems || []).filter((c) => (c.type||'').toLowerCase() === 'image').map((ci, i) => {
                              const src = buildPublicUrl(ci.file_path || ci.content);
                              return (
                                <button key={`img-${i}`} className="group relative" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                                  <img src={src} alt="image" className="w-full h-28 sm:h-32 object-cover rounded-xl border shadow-sm" style={{ borderColor: '#e3c292' }} />
                                  <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/15 transition-colors" />
                                </button>
                              );
                            })}
                            </div>
                          </div>
                        )}

                        {/* Videos */}
                        {(contentItems || []).some((c) => (c.type||'').toLowerCase() === 'video') && (
                          <div className="space-y-3">
                            {(contentItems || []).filter((c) => (c.type||'').toLowerCase() === 'video').map((ci, i) => {
                              const url = ci.content || '';
                              const isYouTube = /youtu\.be|youtube\.com/.test(url);
                              return (
                                <div key={`vid-${i}`} className="w-full">
                                  {isYouTube ? (
                                    <iframe className="w-full aspect-video rounded-xl border" style={{ borderColor: '#e3c292' }} src={url} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={`video-${i}`} />
                                  ) : (
                                    <video className="w-full rounded-xl border" style={{ borderColor: '#e3c292' }} src={url} controls preload="metadata" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Audio */}
                        {(contentItems || []).some((c) => (c.type||'').toLowerCase() === 'audio') && (
                          <div className="space-y-2">
                            {(contentItems || []).filter((c) => (c.type||'').toLowerCase() === 'audio').map((ci, i) => (
                              <audio key={`aud-${i}`} className="w-full" src={ci.content || ''} controls preload="metadata" />
                            ))}
                          </div>
                        )}

                        {/* Links */}
                        {(contentItems || []).some((c) => (c.type||'').toLowerCase() === 'link') && (
                          <ul className="space-y-1">
                            {(contentItems || []).filter((c) => (c.type||'').toLowerCase() === 'link').map((ci, i) => (
                              <li key={`lnk-${i}`}><a className="link link-primary" href={ci.content || '#'} target="_blank" rel="noreferrer">{ci.metadata?.title || ci.content}</a></li>
                            ))}
                          </ul>
                        )}

                        {/* Scripture */}
                        {(contentItems || []).some((c) => (c.type||'').toLowerCase() === 'scripture') && (
                          <div className="space-y-2">
                            {(contentItems || []).filter((c) => (c.type||'').toLowerCase() === 'scripture').map((ci, i) => (
                              <div key={`scr-${i}`} className="bg-white shadow-sm border rounded-lg">
                                <div className="card-body p-4">
                                  <div className="font-semibold">{ci.content}</div>
                                  {ci.metadata?.text && <div className="text-sm whitespace-pre-wrap">{ci.metadata.text}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {createError && <div className="px-5 text-sm text-red-600">{createError}</div>}
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {/* Type selector removed as per request */}
                      <div>
                        <label className="block text-sm text-[#2c5f6f] mb-1">Title</label>
                        <input className="w-full border rounded px-3 py-2" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={() => updateSubmissionField('title', (newTitle || '').trim())} placeholder="Title" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#2c5f6f] mb-1">Description</label>
                        <textarea className="w-full border rounded px-3 py-2" rows="2" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} onBlur={() => updateSubmissionField('description', (newDescription || '').trim())} placeholder="Optional description" />
                      </div>
                      {itemType === 'event' ? (
                        <div>
                          <label className="block text-sm text-[#2c5f6f] mb-1">Event Date & Time</label>
                          <input type="datetime-local" className="w-full border rounded px-3 py-2" value={eventDateTime} onChange={(e) => setEventDateTime(e.target.value)} onBlur={(e) => { const ts = Date.parse(e.target.value); if (Number.isFinite(ts)) updateTimeframe({ type: 'event', ts }); }} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-[#2c5f6f] mb-1">Start Date & Time</label>
                            <input type="datetime-local" className="w-full border rounded px-3 py-2" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} onBlur={(e) => { const ts = Date.parse(e.target.value); const ets = Date.parse(endDateTime); updateTimeframe({ type: 'period', start_ts: Number.isFinite(ts) ? ts : undefined, end_ts: Number.isFinite(ets) ? ets : undefined }); }} />
                          </div>
                          <div>
                            <label className="block text-sm text-[#2c5f6f] mb-1">End Date & Time</label>
                            <input type="datetime-local" className="w-full border rounded px-3 py-2" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} onBlur={(e) => { const ets = Date.parse(e.target.value); const sts = Date.parse(startDateTime); updateTimeframe({ type: 'period', start_ts: Number.isFinite(sts) ? sts : undefined, end_ts: Number.isFinite(ets) ? ets : undefined }); }} />
                          </div>
                        </div>
                      )}

                      {/* Add Content Section */}
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[#1e3a5f] font-semibold">Add Content</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mb-3">
                          {[
                            { key: 'text', label: 'Text', icon: '📝' },
                            { key: 'image', label: 'Image', icon: '🖼️' },
                            { key: 'video', label: 'Video', icon: '🎬' },
                            { key: 'audio', label: 'Audio', icon: '🎙️' },
                            { key: 'link', label: 'Link', icon: '🔗' },
                            { key: 'scripture', label: 'Scripture', icon: '📖' },
                            { key: 'celestial', label: 'Celestial', icon: '🌙' }
                          ].map((ct) => (
                            <button
                              key={ct.key}
                              title={ct.label}
                              aria-label={ct.label}
                              onClick={() => setSelectedContent(ct.key)}
                              className={`btn btn-circle btn-sm ${selectedContent === ct.key ? 'btn-primary' : ''}`}
                            >
                              <span className="text-lg leading-none">{ct.icon}</span>
                            </button>
                          ))}
                        </div>

                        {selectedContent === 'text' && (
                          <div className="space-y-2">
                            <textarea className="textarea textarea-bordered w-full" rows="3" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Enter text..." />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Text</button></div>
                          </div>
                        )}
                        {selectedContent === 'image' && (
                          <div className="space-y-2">
                            <input className="input input-bordered w-full" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Image</button></div>
                          </div>
                        )}
                        {selectedContent === 'video' && (
                          <div className="space-y-2">
                            <input className="input input-bordered w-full" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL" />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Video</button></div>
                          </div>
                        )}
                        {selectedContent === 'audio' && (
                          <div className="space-y-2">
                            <input className="input input-bordered w-full" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Audio URL" />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Audio</button></div>
                          </div>
                        )}
                        {selectedContent === 'link' && (
                          <div className="space-y-2">
                            <input className="input input-bordered w-full" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link URL" />
                            <input className="input input-bordered w-full" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link title (optional)" />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Link</button></div>
                          </div>
                        )}
                        {selectedContent === 'scripture' && (
                          <div className="space-y-2">
                            <input className="input input-bordered w-full" value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} placeholder="Reference (e.g., Revelation 12:1-2)" />
                            <textarea className="textarea textarea-bordered w-full" rows="2" value={scriptureText} onChange={(e) => setScriptureText(e.target.value)} placeholder="Passage text (optional)" />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Scripture</button></div>
                          </div>
                        )}
                        {selectedContent === 'celestial' && (
                          <div className="space-y-2">
                            <input className="input input-bordered w-full" value={celestialEventType} onChange={(e) => setCelestialEventType(e.target.value)} placeholder="Event Type (alignment, conjunction, eclipse, etc.)" />
                            <input className="input input-bordered w-full" value={celestialBodies} onChange={(e) => setCelestialBodies(e.target.value)} placeholder="Bodies (Sun, Moon, planets, constellations)" />
                            <input className="input input-bordered w-full" value={celestialLocation} onChange={(e) => setCelestialLocation(e.target.value)} placeholder="Location / Visibility (optional)" />
                            <textarea className="textarea textarea-bordered w-full" rows="2" value={celestialNotes} onChange={(e) => setCelestialNotes(e.target.value)} placeholder="Description / Notes / Sources (optional)" />
                            <div className="flex justify-end"><button type="button" className="btn btn-outline" onClick={addContentItem}>Add Celestial</button></div>
                          </div>
                        )}

                        {contentItems.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm mb-1">Queued Content</div>
                            <ul className="space-y-1">
                              {contentItems.map((ci, idx) => {
                                const isImg = (ci.type || '').toLowerCase() === 'image';
                                const srcCandidate = ci.file_path || ci.content;
                                const thumb = isImg ? buildPublicUrl(srcCandidate) : null;
                                return (
                                  <li key={`${ci.type}-${idx}`} className="flex items-center justify-between text-sm bg-white border rounded px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {thumb && <img src={thumb} alt="thumb" className="w-10 h-10 rounded object-cover border" style={{ borderColor: '#e3c292' }} />}
                                      <span className="truncate">{ci.type}: {ci.content?.slice ? ci.content.slice(0, 64) : ''}</span>
                                    </div>
                                    <button className="btn btn-xs btn-error" onClick={() => setContentItems((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              {/* Style Section */}
              <div className={`p-4 border-t space-y-3 ${styleOpen ? '' : 'hidden'}`}>
                <div className="text-[#1e3a5f] font-semibold">Style</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Item Style</label>
                    <select className="select select-bordered w-full" value={styleItemStyle} onChange={(e) => { setStyleItemStyle(e.target.value); }} onBlur={() => saveStyleToMetadata({ itemStyle: styleItemStyle })}>
                      {['card','marker','marker_text','chat_bubble','chat_square','text','circle'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Timeline Position</label>
                    <select className="select select-bordered w-full" value={styleTimelinePosition} onChange={(e) => { setStyleTimelinePosition(e.target.value); }} onBlur={() => saveStyleToMetadata({ timelinePosition: styleTimelinePosition })}>
                      {['above','on','below'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Line Position</label>
                    <select className="select select-bordered w-full" value={styleLinePosition} onChange={(e) => { setStyleLinePosition(e.target.value); }} onBlur={() => saveStyleToMetadata({ linePosition: styleLinePosition })}>
                      {['left','center','right'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Border Style</label>
                    <select className="select select-bordered w-full" value={styleBorderStyle} onChange={(e) => { setStyleBorderStyle(e.target.value); }} onBlur={() => saveStyleToMetadata({ borderStyle: styleBorderStyle })}>
                      {['none','solid','dashed','dotted','drop_shadow','glow'].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-10 h-10 border rounded" value={styleColorBackground || '#e89547'} onChange={(e) => setStyleColorBackground(e.target.value)} onBlur={() => saveStyleToMetadata({ background: styleColorBackground })} />
                      <input className="input input-bordered flex-1" value={styleColorBackground} onChange={(e) => setStyleColorBackground(e.target.value)} onBlur={() => saveStyleToMetadata({ background: styleColorBackground })} placeholder="#e89547" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Border Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-10 h-10 border rounded" value={styleColorBorder || '#e3c292'} onChange={(e) => setStyleColorBorder(e.target.value)} onBlur={() => saveStyleToMetadata({ border: styleColorBorder })} />
                      <input className="input input-bordered flex-1" value={styleColorBorder} onChange={(e) => setStyleColorBorder(e.target.value)} onBlur={() => saveStyleToMetadata({ border: styleColorBorder })} placeholder="#e3c292" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-10 h-10 border rounded" value={styleColorText || '#1e3a5f'} onChange={(e) => setStyleColorText(e.target.value)} onBlur={() => saveStyleToMetadata({ text: styleColorText })} />
                      <input className="input input-bordered flex-1" value={styleColorText} onChange={(e) => setStyleColorText(e.target.value)} onBlur={() => saveStyleToMetadata({ text: styleColorText })} placeholder="#1e3a5f" />
                    </div>
                  </div>
                </div>
              </div>
              {!viewerMode && (
                <div className="p-4 border-t flex justify-end gap-3">
                  <button type="button" onClick={duplicateSubmission} className="btn">Duplicate</button>
                  <button type="button" onClick={deleteSubmission} className="btn btn-error">Delete</button>
                </div>
              )}
              </div>
            </div>
          </div>
          )}

          <InfiniteTimeline
            submissions={liveSubmissions}
            height={timelineHeight + 48}
            canEdit={canEdit && isEditing}
            onCreateRequest={canEdit && isEditing ? async ({ type, ts }) => {
              const chosen = type === 'period' ? 'period' : 'event';
              setItemType(chosen);
              const validTs = Number.isFinite(ts) ? ts : Date.now();
              setAnchorTs(validTs);
              const iso = new Date(validTs).toISOString().slice(0, 16);
              // Reset form state to avoid inheriting previous item's values
              setNewTitle('');
              setNewDescription('');
              setContentItems([]);
              resetContentForms();
              setEventDateTime(iso);
              setStartDateTime(iso);
              setEndDateTime('');
              setCurrentSubmissionId(null);
              const sid = await createSubmissionBase(chosen, validTs, { title: 'Untitled', description: '' });
              if (sid) setDrawerOpen(true);
            } : undefined}
            onOpenSubmission={(id) => {
              const sub = (liveSubmissions || []).find((s) => s.id === id);
              if (!sub) return;
              // Open drawer prefilled with existing content
              const activeContents = (sub.submission_content || []); // use all rows; status lives on enhanced_submissions
              setNewTitle(sub.title || '');
              setNewDescription(sub.description || '');
              // Load style from enhanced_submissions.metadata
              const metaRoot = sub.metadata || {};
              const s = metaRoot?.style || metaRoot?.timeline_style || {};
              setStyleItemStyle((s?.design?.itemStyle || 'card').toString());
              setStyleTimelinePosition((s?.timelinePosition || 'above').toString());
              setStyleLinePosition((s?.design?.linePosition || 'center').toString());
              setStyleBorderStyle((s?.design?.borderStyle || 'solid').toString());
              setStyleColorBackground(s?.colors?.background || '');
              setStyleColorBorder(s?.colors?.border || '');
              setStyleColorText(s?.colors?.text || '');
              // Load timeframe
              const tf = activeContents.find((c) => (c.type || '').toLowerCase() === 'timeframe');
              if (tf) {
                const m = tf.metadata || {};
                const ts = m.ts || m.start_ts || null;
                if (ts) {
                  const iso = new Date(ts).toISOString().slice(0, 16);
                  setEventDateTime(iso);
                  setStartDateTime(iso);
                }
                if (m.end_ts) {
                  setEndDateTime(new Date(m.end_ts).toISOString().slice(0, 16));
                  setItemType('period');
                } else {
                  setItemType('event');
                  setEndDateTime('');
                }
              }
              // Load non-timeframe content items
              const extra = activeContents.filter((c) => {
                const t = (c.type || '').toLowerCase();
                return t !== 'timeframe' && t !== 'timeline_style';
              }).map((c) => ({ type: c.type, content: c.content, file_path: c.file_path || null, metadata: c.metadata || null }));
              setContentItems(extra);
              setSelectedContent(null);
              resetContentForms();
              setCurrentSubmissionId(sub.id);
              setViewerMode(!(canEdit && isEditing));
              setDrawerOpen(true);
            }}
          />

          {/* Lightbox for images/videos */}
          {viewerMode && lightboxOpen && (
            <Lightbox
              items={(contentItems || []).filter((c) => (c.type||'').toLowerCase() === 'image' || (c.type||'').toLowerCase() === 'video')}
              index={lightboxIndex}
              onClose={() => setLightboxOpen(false)}
              buildPublicUrl={buildPublicUrl}
              onPrev={() => setLightboxIndex((idx) => Math.max(0, idx - 1))}
              onNext={() => setLightboxIndex((idx) => Math.min(((contentItems||[]).filter((c)=>['image','video'].includes((c.type||'').toLowerCase()))).length - 1, idx + 1))}
            />
          )}
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

function Lightbox({ items, index, onClose, onPrev, onNext, buildPublicUrl }) {
  const safeItems = Array.isArray(items) ? items : [];
  const current = safeItems[index] || null;
  const isImage = (current?.type || '').toLowerCase() === 'image';
  const isVideo = (current?.type || '').toLowerCase() === 'video';
  const src = current ? (isImage ? buildPublicUrl(current.file_path || current.content) : (current.content || '')) : '';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative max-w-5xl w-full bg-white/95 rounded-2xl shadow-2xl border border-[#e3c292]/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#e3c292]/60 bg-[#fff9ef]">
            <button className="px-3 py-1 rounded-full border border-[#e3c292]/60 bg-white hover:bg-[#fff6ee]" onClick={onPrev} aria-label="Previous">⟨</button>
            <button className="px-3 py-1 rounded-full border border-[#e3c292]/60 bg-white hover:bg-[#fff6ee]" onClick={onNext} aria-label="Next">⟩</button>
            <button className="px-3 py-1 rounded-full border border-[#e3c292]/60 bg-white hover:bg-[#fff6ee]" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="p-2 sm:p-4">
            {isImage && (
              <img src={src} alt="media" className="max-h-[70vh] w-auto mx-auto rounded-lg object-contain" />
            )}
            {isVideo && (
              /youtu\.be|youtube\.com/.test(src) ? (
                <iframe className="w-full aspect-video rounded-lg" src={src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="video" />
              ) : (
                <video className="w-full rounded-lg" src={src} controls preload="metadata" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


