import { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ContentPreview: renders small previews (thumbnails/icons) for submission_content
// and opens modals/lightboxes for detailed viewing. Designed for non-compact cards.
// Expected content schema: array of { type: string, content: string } where content may be
// a URL, plain text, or a JSON string encoding an array or object with urls.
export default function ContentPreview({ contents = [], variant = 'row' }) {
  const [imageViewer, setImageViewer] = useState({ isOpen: false, urls: [], index: 0 });
  const [videoViewer, setVideoViewer] = useState({ isOpen: false, urls: [], index: 0 });
  const [audioViewer, setAudioViewer] = useState({ isOpen: false, urls: [] });

  const normalizeType = useCallback((t) => (t || '').toLowerCase(), []);

  const extractUrls = useCallback((raw) => {
    if (!raw) return [];

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((x) => typeof x === 'string');
        }
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.urls)) return parsed.urls.filter((x) => typeof x === 'string');
          if (Array.isArray(parsed.images)) return parsed.images.filter((x) => typeof x === 'string');
          if (typeof parsed.url === 'string') return [parsed.url];
          if (typeof parsed.src === 'string') return [parsed.src];
        }
      } catch (_) {
        // not JSON, treat as single URL or plain text
      }

      // Extract all URLs from plain text (newline or space separated)
      const matches = raw.match(/https?:\/\/[^\s)"']+/gi);
      if (matches && matches.length) return matches;
      // Heuristic: single URL
      if (/^https?:\/\//i.test(raw)) return [raw];
      return [];
    }

    if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string');
    if (raw && typeof raw === 'object') {
      const urls = [];
      if (Array.isArray(raw.urls)) urls.push(...raw.urls);
      if (Array.isArray(raw.images)) urls.push(...raw.images);
      if (typeof raw.url === 'string') urls.push(raw.url);
      if (typeof raw.src === 'string') urls.push(raw.src);
      return urls.filter((x) => typeof x === 'string');
    }

    return [];
  }, []);

  const isImageUrl = useCallback((url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url), []);
  const isVideoUrl = useCallback((url) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || /(youtube\.com|youtu\.be|vimeo\.com)/i.test(url), []);
  const isAudioUrl = useCallback((url) => /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(url), []);

  const toEmbedUrl = useCallback((url) => {
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes('youtube.com')) {
        const vid = u.searchParams.get('v');
        if (vid) return `https://www.youtube.com/embed/${vid}`;
      }
      if (host === 'youtu.be') {
        const vid = u.pathname.replace('/', '');
        if (vid) return `https://www.youtube.com/embed/${vid}`;
      }
      if (host.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
    } catch (_) {}
    return url;
  }, []);

  const partitioned = useMemo(() => {
    const images = [];
    const videos = [];
    const audios = [];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'prophecy-files';
    const buildPublicUrl = (path) => {
      if (!path) return null;
      const str = String(path);
      if (/^https?:\/\//i.test(str)) return str; // already full URL
      if (!supabaseUrl) return null;
      const base = supabaseUrl.replace(/\/$/, '');
      const clean = str.replace(/^\/+/, '');
      const withBucket = clean.startsWith(`${bucket}/`) ? clean : `${bucket}/${clean}`;
      return `${base}/storage/v1/object/public/${withBucket}`;
    };

    contents.forEach((c) => {
      const type = normalizeType(c?.type);
      if (!type) return;

      if (type === 'image' || type === 'images' || type === 'photo' || type === 'photos' || type === 'gallery') {
        const urls = extractUrls(c?.content);
        if (urls.length) images.push(...urls);
        if (!urls.length && c?.file_path) {
          const u = buildPublicUrl(c.file_path);
          if (u) images.push(u);
        }
        return;
      }

      if (type === 'video' || type === 'videos') {
        const urls = extractUrls(c?.content);
        if (urls.length) videos.push(...urls);
        if (!urls.length && c?.file_path) {
          const u = buildPublicUrl(c.file_path);
          if (u) videos.push(u);
        }
        return;
      }

      if (type === 'audio' || type === 'recording' || type === 'recordings' || type === 'voice') {
        const urls = extractUrls(c?.content);
        if (urls.length) audios.push(...urls);
        if (!urls.length && c?.file_path) {
          const u = buildPublicUrl(c.file_path);
          if (u) audios.push(u);
        }
        return;
      }

      // Ignore scriptures here to avoid duplicate UI; scripture is shown in main card
      if (type === 'scripture' || type === 'scriptures') return;

      // Fallback: categorize any URLs by extension/host; default unknown URLs to images
      const urls = extractUrls(c?.content);
      urls.forEach((u) => {
        if (isImageUrl(u)) images.push(u);
        else if (isVideoUrl(u)) videos.push(u);
        else if (isAudioUrl(u)) audios.push(u);
        else images.push(u);
      });
    });

    return { images, videos, audios };
  }, [contents, extractUrls, normalizeType, isAudioUrl, isImageUrl, isVideoUrl]);

  const openImageViewer = (index = 0) => setImageViewer({ isOpen: true, urls: partitioned.images, index });
  const closeImageViewer = () => setImageViewer((s) => ({ ...s, isOpen: false }));

  const openVideoViewer = (index = 0) => setVideoViewer({ isOpen: true, urls: partitioned.videos, index });
  const closeVideoViewer = () => setVideoViewer((s) => ({ ...s, isOpen: false }));

  const openAudioViewer = () => setAudioViewer({ isOpen: true, urls: partitioned.audios });
  const closeAudioViewer = () => setAudioViewer((s) => ({ ...s, isOpen: false }));

  const hasAnyPreview = partitioned.images.length || partitioned.videos.length || partitioned.audios.length;
  if (!hasAnyPreview) return null;

  return (
    <div className={variant === 'row' ? 'mt-2' : ''}>
      {/* Inline preview row */}
      <div className="flex items-center flex-wrap gap-3">
        {/* Images thumbnails */}
        {partitioned.images.length > 0 && (
          <div className="flex items-center gap-2">
            {partitioned.images.slice(0, 3).map((url, idx) => (
              <button
                key={url + idx}
                onClick={() => openImageViewer(idx)}
                className="relative w-12 h-12 rounded-md overflow-hidden ring-1 ring-[#87ceeb]/40 hover:ring-[#d4a574]/60 transition"
                title="View images"
              >
                <img src={url} alt="Image" className="w-full h-full object-cover" />
                {idx === 2 && partitioned.images.length > 3 && (
                  <div className="absolute inset-0 bg-black/50 text-white text-xs font-semibold flex items-center justify-center">
                    +{partitioned.images.length - 3}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Video icon */}
        {partitioned.videos.length > 0 && (
          <button
            onClick={() => openVideoViewer(0)}
            className="flex items-center gap-2 px-2 py-1 rounded-full bg-[#1e3a5f]/5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 transition text-xs font-medium"
            title="Play video"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#d4a574] text-white">▶</span>
            <span>{partitioned.videos.length} video{partitioned.videos.length > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Audio icon */}
        {partitioned.audios.length > 0 && (
          <button
            onClick={openAudioViewer}
            className="flex items-center gap-2 px-2 py-1 rounded-full bg-[#2c5f6f]/5 text-[#2c5f6f] hover:bg-[#2c5f6f]/10 transition text-xs font-medium"
            title="Play audio"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2c5f6f] text-white">♫</span>
            <span>{partitioned.audios.length} recording{partitioned.audios.length > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Scriptures intentionally omitted; displayed in main card */}
      </div>

      {/* Image Lightbox (Portal) */}
      {imageViewer.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeImageViewer}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#faf6f0] rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1e3a5f] to-[#2c5f6f] text-white">
                <span className="text-sm">Image {imageViewer.index + 1} of {imageViewer.urls.length}</span>
                <button onClick={closeImageViewer} className="text-2xl leading-none">×</button>
              </div>
              <div className="bg-black flex items-center justify-center">
                <img src={imageViewer.urls[imageViewer.index]} alt="Image" className="max-h-[70vh] w-auto object-contain" />
              </div>
              {imageViewer.urls.length > 1 && (
                <div className="flex items-center justify-between p-3 bg-[#faf6f0]">
                  <button
                    onClick={() => setImageViewer((s) => ({ ...s, index: (s.index - 1 + s.urls.length) % s.urls.length }))}
                    className="prophecy-button-sm"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setImageViewer((s) => ({ ...s, index: (s.index + 1) % s.urls.length }))}
                    className="prophecy-button-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* Video Modal (Portal) */}
      {videoViewer.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeVideoViewer}>
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#faf6f0] rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1e3a5f] to-[#2c5f6f] text-white">
                <span className="text-sm">Video {videoViewer.index + 1} of {videoViewer.urls.length}</span>
                <button onClick={closeVideoViewer} className="text-2xl leading-none">×</button>
              </div>
              <div className="bg-black flex items-center justify-center p-2">
                {/(youtube\.com|youtu\.be|vimeo\.com)/i.test(videoViewer.urls[videoViewer.index]) ? (
                  <iframe
                    src={toEmbedUrl(videoViewer.urls[videoViewer.index])}
                    className="w-full h-[60vh]"
                    title="Video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={videoViewer.urls[videoViewer.index]} controls className="max-h-[70vh] w-auto" />
                )}
              </div>
              {videoViewer.urls.length > 1 && (
                <div className="flex items-center justify-between p-3 bg-[#faf6f0]">
                  <button
                    onClick={() => setVideoViewer((s) => ({ ...s, index: (s.index - 1 + s.urls.length) % s.urls.length }))}
                    className="prophecy-button-sm"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setVideoViewer((s) => ({ ...s, index: (s.index + 1) % s.urls.length }))}
                    className="prophecy-button-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>, document.body
      )}

      {/* Audio Modal (Portal) */}
      {audioViewer.isOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeAudioViewer}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#faf6f0] rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1e3a5f] to-[#2c5f6f] text-white">
                <span className="text-sm">Recordings</span>
                <button onClick={closeAudioViewer} className="text-2xl leading-none">×</button>
              </div>
              <div className="p-4 space-y-4">
                {audioViewer.urls.map((u, i) => (
                  <div key={u + i} className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#2c5f6f] text-white">♫</span>
                    <audio src={u} controls className="flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* No scripture modal here to avoid duplication */}
    </div>
  );
}
