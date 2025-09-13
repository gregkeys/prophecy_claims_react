import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// InfiniteTimeline: performant canvas-based horizontal timeline with pan/zoom.
// - Scale levels: years → months → days depending on pixels-per-time
// - Clusters many items when crowded
// - Expects submissions: [{ id, title, created_at, submission_content: [{ type, content }] }]
// - Extracts a date from timeframe content or created_at
export default function InfiniteTimeline({ submissions = [], height = 260 }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const [dpr, setDpr] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [panX, setPanX] = useState(0);
  const [scale, setScale] = useState(1); // 1 = base; higher = zoom in
  const [hoverInfo, setHoverInfo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, panAtStart: 0 });

  // Convert submissions to timeline points with timestamp
  const points = useMemo(() => {
    const parseTimeframe = (contents) => {
      if (!contents) return null;
      const tf = contents.find((c) => (c?.type || '').toLowerCase() === 'timeframe');
      if (!tf) return null;
      const text = String(tf.content || '').trim();
      const parsed = Date.parse(text);
      return Number.isFinite(parsed) ? parsed : null;
    };

    return submissions
      .map((s) => {
        const ts = parseTimeframe(s.submission_content) || Date.parse(s.created_at || '') || null;
        return ts
          ? {
              id: s.id,
              title: s.title || 'Untitled',
              description: s.description || '',
              ts,
              submission: s
            }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.ts - b.ts);
  }, [submissions]);

  // Domain (min/max)
  const domain = useMemo(() => {
    if (points.length === 0) {
      const now = Date.now();
      return { min: now - 1000 * 60 * 60 * 24 * 365, max: now + 1000 * 60 * 60 * 24 * 365 };
    }
    const min = points[0].ts;
    const max = points[points.length - 1].ts;
    const pad = Math.max(1, (max - min) * 0.1);
    return { min: min - pad, max: max + pad };
  }, [points]);

  // Base mapping: at scale 1, 1px = baseMsPerPx milliseconds
  const baseMsPerPx = useMemo(() => {
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    // Try to fit domain into ~1200 px at base scale
    const approxPx = 1200;
    const span = domain.max - domain.min || yearMs;
    return span / approxPx;
  }, [domain]);

  const msPerPx = baseMsPerPx / Math.max(0.1, scale);

  const timeToX = useCallback(
    (ts, width) => {
      const center = (domain.min + domain.max) / 2;
      // World X before pan: (ts - center) / msPerPx + width/2
      return (ts - center) / msPerPx + width / 2 + panX;
    },
    [domain.min, domain.max, msPerPx, panX]
  );

  const xToTime = useCallback(
    (x, width) => {
      const center = (domain.min + domain.max) / 2;
      return (x - width / 2 - panX) * msPerPx + center;
    },
    [domain.min, domain.max, msPerPx, panX]
  );

  // Ticks based on msPerPx
  const tickSpec = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    const month = day * 30;
    const year = day * 365;
    // px per unit
    const pxPerYear = year / msPerPx;
    const pxPerMonth = month / msPerPx;
    const pxPerDay = day / msPerPx;

    if (pxPerYear > 120) return { unit: 'year', stepMs: year, fmt: (d) => d.getUTCFullYear() };
    if (pxPerMonth > 100) return { unit: 'month', stepMs: month, fmt: (d) => d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) };
    return { unit: 'day', stepMs: day, fmt: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  }, [msPerPx]);

  // Resize handling (DPR + container width)
  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
    const onWindowResize = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener('resize', onWindowResize);

    const el = containerRef.current;
    if (!el) return () => window.removeEventListener('resize', onWindowResize);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect?.width || el.clientWidth || 0;
        setContainerWidth(Math.max(0, Math.floor(w)));
      }
    });
    ro.observe(el);
    // Initial measure
    const initW = el.getBoundingClientRect().width || el.clientWidth || 0;
    setContainerWidth(Math.max(0, Math.floor(initW)));

    return () => {
      window.removeEventListener('resize', onWindowResize);
      ro.disconnect();
    };
  }, []);

  // Wheel zoom / pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const width = rect.width;
      const worldBefore = xToTime(mouseX, width);

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const nextScale = Math.min(200, Math.max(0.1, scale * zoomFactor));
      const nextMsPerPx = baseMsPerPx / nextScale;

      // Adjust pan to keep mouse anchor at same world time
      const worldAfterX = (worldBefore - (domain.min + domain.max) / 2) / nextMsPerPx + width / 2 + panX;
      const deltaX = mouseX - worldAfterX;
      setPanX((p) => p + deltaX);
      setScale(nextScale);
    };

    const onPointerDown = (e) => {
      dragging || setDragging(true);
      dragStartRef.current = { x: e.clientX, panAtStart: panX };
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      setPanX(dragStartRef.current.panAtStart + dx);
    };
    const onPointerUp = () => setDragging(false);

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [baseMsPerPx, domain.max, domain.min, dragging, panX, scale, xToTime]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;
    const width = Math.max(300, containerWidth);
    if (width <= 0) return;
    const heightPx = height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(heightPx * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${heightPx}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, heightPx);

    // Background
    ctx.fillStyle = '#faf6f0';
    ctx.fillRect(0, 0, width, heightPx);

    // Midline
    const midY = Math.round(heightPx / 2);
    const grad = ctx.createLinearGradient(0, midY - 1, 0, midY + 1);
    grad.addColorStop(0, '#d4a574');
    grad.addColorStop(1, '#f4d03f');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Ticks
    const step = tickSpec.stepMs;
    const tStart = xToTime(0, width);
    const first = Math.floor(tStart / step) * step;
    ctx.fillStyle = '#2c5f6f';
    ctx.strokeStyle = 'rgba(44,95,111,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';

    for (let t = first; t < xToTime(width, width) + step; t += step) {
      const x = timeToX(t, width);
      ctx.beginPath();
      ctx.moveTo(x, midY - 16);
      ctx.lineTo(x, midY + 16);
      ctx.stroke();

      const label = tickSpec.fmt(new Date(t));
      ctx.fillText(String(label), x, midY + 18);
    }

    // Cluster points by pixel buckets
    const bucketPx = 12;
    const buckets = new Map();
    points.forEach((p) => {
      const x = timeToX(p.ts, width);
      const key = Math.round(x / bucketPx);
      if (!buckets.has(key)) buckets.set(key, { x, items: [] });
      buckets.get(key).items.push(p);
    });

    // Draw clusters
    buckets.forEach((b) => {
      const x = b.x;
      const size = Math.min(10 + b.items.length * 2, 28);
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'rgba(212,165,116,0.6)';
      ctx.beginPath();
      ctx.arc(x, midY, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e3a5f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 10px ui-sans-serif, system-ui';
      ctx.fillText(String(b.items.length), x, midY);
    });

    // Interactive overlay (for clicks & hovers)
    const onMove = (e) => {
      const rect2 = canvas.getBoundingClientRect();
      const x = e.clientX - rect2.left;
      const y = e.clientY - rect2.top;
      let found = null;
      buckets.forEach((b) => {
        const dx = Math.abs(b.x - x);
        const dy = Math.abs(midY - y);
        const radius = Math.min(10 + b.items.length * 2, 28) / 2 + 4;
        if (dx * dx + dy * dy <= radius * radius) {
          found = b;
        }
      });
      setHoverInfo(found);
    };
    const onLeave = () => setHoverInfo(null);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [containerWidth, dpr, height, msPerPx, panX, points, tickSpec, timeToX, xToTime]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-[#2c5f6f]">
          Scale: {scale.toFixed(2)} • Drag to pan • Scroll to zoom
        </div>
        <div className="flex items-center gap-2">
          <button className="prophecy-button-sm" onClick={() => setScale((s) => Math.min(200, s * 1.2))}>Zoom In</button>
          <button className="prophecy-button-sm" onClick={() => setScale((s) => Math.max(0.1, s / 1.2))}>Zoom Out</button>
          <button className="prophecy-button-sm" onClick={() => { setScale(1); setPanX(0); }}>Reset</button>
        </div>
      </div>
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        <canvas ref={canvasRef} className="w-full h-full rounded-lg shadow-sm bg-[#faf6f0]" />
        {hoverInfo && (
          <div
            ref={overlayRef}
            className="absolute bg-white/95 backdrop-blur-sm border border-[#87ceeb]/50 rounded-lg shadow-lg p-2 text-xs text-[#1e3a5f]"
            style={{ left: Math.max(8, Math.min(hoverInfo.x + 12, (canvasRef.current?.getBoundingClientRect()?.width || 300) - 220)), top: Math.round(height / 2) - 64, width: 220 }}
          >
            <div className="font-semibold mb-1">{hoverInfo.items.length} item{hoverInfo.items.length > 1 ? 's' : ''}</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {hoverInfo.items.slice(0, 6).map((p) => (
                <div key={p.id} className="truncate"><span className="text-[#d4a574]">{new Date(p.ts).toLocaleDateString()}</span> — {p.title}</div>
              ))}
              {hoverInfo.items.length > 6 && (
                <div className="text-[#2c5f6f] italic">+{hoverInfo.items.length - 6} more…</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


