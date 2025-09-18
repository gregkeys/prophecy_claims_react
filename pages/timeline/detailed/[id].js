import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
        <title>{timeline.name} - Detailed Timeline | Prophecy Claims</title>
        <meta name="description" content={timeline.description || `Explore the ${timeline.name} detailed infinite timeline.`} />
      </Head>
      {/* Global header provided by _app.js */}

      <section className="pt-8 pb-2 bg-[#faf6f0] min-h-screen">
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
                  className={`px-3 py-1 rounded-full text-sm border transition-colors whitespace-nowrap ${isEditing ? 'bg-[#e3c292]/30 border-[#e3c292] text-[#1e3a5f]' : 'bg-white/70 border-[#e3c292]/60 text-[#1e3a5f]'}`}
                  title="Toggle edit mode"
                >
                  {isEditing ? 'Edit: On' : 'Edit: Off'}
                </button>
              )}
            </div>
            {timeline.description && (
              <p className="text-[#2c5f6f] mt-1 max-w-3xl mx-auto">{timeline.description}</p>
            )}
            {titleStatus && <div className="text-sm text-red-600 mt-2">{titleStatus}</div>}
          </div>

          {/* Create Drawer */}
          {canEdit && (
            <div className={`fixed top-0 right-0 h-full w-[90%] sm:w-[480px] bg-white/95 border-l border-[#e3c292]/60 shadow-2xl z-40 transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-[#e3c292]/60 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1e3a5f]">Add {itemType === 'event' ? 'Event' : 'Time Period'}</h2>
                  <button onClick={() => setDrawerOpen(false)} className="text-[#1e3a5f] hover:opacity-70">✕</button>
                </div>
                <div className="p-4 space-y-4 overflow-auto">
                  <div>
                    <label className="block text-sm text-[#2c5f6f] mb-1">Type</label>
                    <select className="w-full border rounded px-3 py-2" value={itemType} onChange={(e) => setItemType(e.target.value)}>
                      <option value="event">Event (single date)</option>
                      <option value="period">Time Period</option>
                    </select>
                  </div>
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
                          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm border transition-colors
                            ${selectedContent === ct.key ? 'bg-[#e3c292]/30 border-[#e3c292] ring-2 ring-[#e3c292]/50' : 'bg-white/85 border-[#e3c292]/60 hover:bg-[#e3c292]/15'} text-[#1e3a5f]`}
                        >
                          <span className="text-lg leading-none">{ct.icon}</span>
                        </button>
                      ))}
                    </div>

                    {selectedContent === 'text' && (
                      <div className="space-y-2">
                        <textarea className="w-full border rounded px-3 py-2" rows="3" value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Enter text..." />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Text</button></div>
                      </div>
                    )}
                    {selectedContent === 'image' && (
                      <div className="space-y-2">
                        <input className="w-full border rounded px-3 py-2" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL" />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Image</button></div>
                      </div>
                    )}
                    {selectedContent === 'video' && (
                      <div className="space-y-2">
                        <input className="w-full border rounded px-3 py-2" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL" />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Video</button></div>
                      </div>
                    )}
                    {selectedContent === 'audio' && (
                      <div className="space-y-2">
                        <input className="w-full border rounded px-3 py-2" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Audio URL" />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Audio</button></div>
                      </div>
                    )}
                    {selectedContent === 'link' && (
                      <div className="space-y-2">
                        <input className="w-full border rounded px-3 py-2" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link URL" />
                        <input className="w-full border rounded px-3 py-2" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Link title (optional)" />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Link</button></div>
                      </div>
                    )}
                    {selectedContent === 'scripture' && (
                      <div className="space-y-2">
                        <input className="w-full border rounded px-3 py-2" value={scriptureRef} onChange={(e) => setScriptureRef(e.target.value)} placeholder="Reference (e.g., Revelation 12:1-2)" />
                        <textarea className="w-full border rounded px-3 py-2" rows="2" value={scriptureText} onChange={(e) => setScriptureText(e.target.value)} placeholder="Passage text (optional)" />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Scripture</button></div>
                      </div>
                    )}
                    {selectedContent === 'celestial' && (
                      <div className="space-y-2">
                        <input className="w-full border rounded px-3 py-2" value={celestialEventType} onChange={(e) => setCelestialEventType(e.target.value)} placeholder="Event Type (alignment, conjunction, eclipse, etc.)" />
                        <input className="w-full border rounded px-3 py-2" value={celestialBodies} onChange={(e) => setCelestialBodies(e.target.value)} placeholder="Bodies (Sun, Moon, planets, constellations)" />
                        <input className="w-full border rounded px-3 py-2" value={celestialLocation} onChange={(e) => setCelestialLocation(e.target.value)} placeholder="Location / Visibility (optional)" />
                        <textarea className="w-full border rounded px-3 py-2" rows="2" value={celestialNotes} onChange={(e) => setCelestialNotes(e.target.value)} placeholder="Description / Notes / Sources (optional)" />
                        <div className="flex justify-end"><button type="button" className="prophecy-button-sm px-4 py-2 rounded-full" onClick={addContentItem}>Add Celestial</button></div>
                      </div>
                    )}

                    {contentItems.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm text-[#2c5f6f] mb-1">Queued Content</div>
                        <ul className="space-y-1">
                          {contentItems.map((ci, idx) => {
                            const isImg = (ci.type || '').toLowerCase() === 'image';
                            const srcCandidate = ci.file_path || ci.content;
                            const thumb = isImg ? buildPublicUrl(srcCandidate) : null;
                            return (
                              <li key={`${ci.type}-${idx}`} className="flex items-center justify-between text-sm bg-white/80 border border-[#e3c292]/60 rounded-xl px-3 py-2 shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  {thumb && <img src={thumb} alt="thumb" className="w-10 h-10 rounded object-cover border" style={{ borderColor: '#e3c292' }} />}
                                  <span className="truncate">{ci.type}: {ci.content?.slice ? ci.content.slice(0, 64) : ''}</span>
                                </div>
                                <button className="text-red-600 border border-red-300 rounded-full px-3 py-1 hover:bg-red-50" onClick={() => setContentItems((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                  {createError && <div className="text-sm text-red-600">{createError}</div>}
                </div>
                <div className="p-4 border-t border-[#e3c292]/60 flex justify-end gap-3">
                  <button type="button" onClick={duplicateSubmission} className="px-4 py-2 rounded-full border border-[#e3c292]/60 bg-white hover:bg-[#e3c292]/20 text-[#1e3a5f]">Duplicate</button>
                  <button type="button" onClick={deleteSubmission} className="px-4 py-2 rounded-full border border-red-300 text-white bg-red-600 hover:bg-red-500">Delete</button>
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
            onOpenSubmission={isEditing ? (id) => {
              const sub = (liveSubmissions || []).find((s) => s.id === id);
              if (!sub) return;
              // Open drawer prefilled with existing content
              const activeContents = (sub.submission_content || []); // use all rows; status lives on enhanced_submissions
              setNewTitle(sub.title || '');
              setNewDescription(sub.description || '');
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
              setDrawerOpen(true);
            } : undefined}
          />
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


