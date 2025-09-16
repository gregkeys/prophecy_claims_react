import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// InfiniteTimeline: performant canvas-based horizontal timeline with pan/zoom.
// - Scale levels: years → months → days depending on pixels-per-time
// - Clusters many items when crowded
// - Expects submissions: [{ id, title, created_at, submission_content: [{ type, content }] }]
// - Extracts a date from timeframe content or created_at
export default function InfiniteTimeline({ submissions = [], height = '70vh' }) {
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
  const autoFramedRef = useRef(false);

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

  // Buckets for overlay cards (one card per pixel bucket to avoid overlap)
  const overlayBuckets = useMemo(() => {
    const width = Math.max(1, containerWidth || 0);
    if (width === 0 || points.length === 0) return [];
    const bucketPx = 16;
    const map = new Map();
    points.forEach((p) => {
      const x = timeToX(p.ts, width);
      const key = Math.round(x / bucketPx);
      if (!map.has(key)) map.set(key, { x, items: [] });
      map.get(key).items.push(p);
    });
    return Array.from(map.values()).filter((b) => b.x > -200 && b.x < width + 200);
  }, [containerWidth, points, timeToX]);

  const buildPublicUrl = useCallback((path) => {
    if (!path) return '';
    const str = String(path);
    if (/^https?:\/\//i.test(str)) return str;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'prophecy-files';
    if (!supabaseUrl) return '';
    const base = supabaseUrl.replace(/\/$/, '');
    const clean = str.replace(/^\/+/, '');
    const withBucket = clean.startsWith(`${bucket}/`) ? clean : `${bucket}/${clean}`;
    return `${base}/storage/v1/object/public/${withBucket}`;
  }, []);

  const layoutCards = useMemo(() => {
    const CARD_WIDTH = 320;
    const H_SPACING = 12;
    const items = overlayBuckets.map((b) => {
      const desiredLeft = (b.x || 0) - CARD_WIDTH / 2;
      const left = Math.max(8, Math.min(desiredLeft, (containerWidth || 300) - CARD_WIDTH - 8));
      return { bucket: b, left, right: left + CARD_WIDTH };
    }).sort((a, b) => a.left - b.left);

    const levelsRight = [];
    return items.map((it) => {
      let level = 0;
      while (levelsRight[level] !== undefined && it.left <= levelsRight[level] + H_SPACING) {
        level += 1;
      }
      levelsRight[level] = it.right;
      return { ...it, level };
    });
  }, [overlayBuckets, containerWidth]);

  // Ticks based on msPerPx
  const tickSpec = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    const month = day * 30;
    const year = day * 365;

    // Prefer months at scale >= 2, days at scale >= 8; otherwise years
    let baseUnit = 'year';
    let baseMs = year;
    if (scale >= 8) {
      baseUnit = 'day';
      baseMs = day;
    } else if (scale >= 2) {
      baseUnit = 'month';
      baseMs = month;
    }

    // Ensure ticks are not overly dense
    const minPxPerTick = 80; // labels remain readable
    const multiples = baseUnit === 'year' ? [1, 2, 5, 10, 20, 50] : baseUnit === 'month' ? [1, 2, 3, 6, 12] : [1, 2, 5, 10, 15];
    let stepMs = baseMs;
    let i = 0;
    while (stepMs / msPerPx < minPxPerTick && i < multiples.length - 1) {
      i += 1;
      stepMs = baseMs * multiples[i];
    }

    const fmt = (d) => {
      if (baseUnit === 'day') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (baseUnit === 'month') return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return d.getUTCFullYear();
    };

    return { unit: baseUnit, stepMs, fmt };
  }, [msPerPx, scale]);

  // Layout-based measurement (track DPR + width) using effect (avoids SSR warnings)
  useEffect(() => {
    const measure = () => {
      setDpr(window.devicePixelRatio || 1);
      const w = (containerRef.current?.offsetWidth)
        || (canvasRef.current?.parentElement?.offsetWidth)
        || (typeof window !== 'undefined' ? Math.max(800, window.innerWidth - 64) : 0);
      setContainerWidth(Math.max(0, Math.floor(w)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
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

      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      // Limit how far we can zoom out by ensuring the visible span is not more than
      // a multiple of the domain span. When width ≈ 1200px and factor=2.5, minScale≈0.4-0.5.
      const VISIBLE_DOMAIN_MULT = 1.25; // stricter cap to avoid blank/blue area
      const approxPx = 1200;
      const minScaleBySpan = Math.max(0.7, (width / (approxPx * VISIBLE_DOMAIN_MULT)));
      const nextScale = Math.min(200, Math.max(minScaleBySpan, scale * zoomFactor));
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

  // Auto-center and auto-zoom once when data and container are ready
  useEffect(() => {
    if (autoFramedRef.current) return;
    if (!containerRef.current || points.length === 0) return;
    const width = Math.max(1, containerRef.current.offsetWidth || 0);
    if (width === 0) return;
    const span = Math.max(1, domain.max - domain.min);
    const targetMsPerPx = span / (width * 0.7); // fit 70% of width
    const targetScale = Math.min(50, Math.max(0.1, baseMsPerPx / targetMsPerPx));
    setScale(targetScale);
    setPanX(0);
    autoFramedRef.current = true;
  }, [baseMsPerPx, containerRef, domain.max, domain.min, points.length]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = Math.max(600, containerWidth || canvas.parentElement?.offsetWidth || 1200);
    const heightPx = typeof height === 'string' && height.endsWith('vh')
      ? Math.max(260, Math.floor((parseFloat(height) / 100) * (window.innerHeight || 800)))
      : (typeof height === 'number' ? height : 260);
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
    // Optional border (subtle)
    ctx.strokeStyle = 'rgba(212,165,116,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, heightPx - 1);

    // Midline (high contrast)
    const midY = Math.round(heightPx / 2);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 8; // even thicker baseline for stronger visual weight
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // Helper to draw rounded label background
    const drawRoundedRect = (ctx2, rx, ry, rw, rh, rr) => {
      ctx2.beginPath();
      ctx2.moveTo(rx + rr, ry);
      ctx2.lineTo(rx + rw - rr, ry);
      ctx2.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
      ctx2.lineTo(rx + rw, ry + rh - rr);
      ctx2.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
      ctx2.lineTo(rx + rr, ry + rh);
      ctx2.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
      ctx2.lineTo(rx, ry + rr);
      ctx2.quadraticCurveTo(rx, ry, rx + rr, ry);
      ctx2.closePath();
    };

    // Ticks
    const step = tickSpec.stepMs;
    const tStart = xToTime(0, width);
    const first = Math.floor(tStart / step) * step;
    ctx.fillStyle = '#2c5f6f';
    ctx.strokeStyle = 'rgba(30,58,95,0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';

    // Month bracket when months (or days) are visible
    if (tickSpec.unit === 'month' || tickSpec.unit === 'day') {
      const tEnd = xToTime(width, width);
      const startDate = new Date(tStart);
      // Use UTC to avoid DST/timezone drift and start from the month that contains tStart
      const monthStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

      const yBase = midY - 18; // slightly higher above the thick baseline
      const bracketHeight = 10;
      const minSpanPx = 20;
      const insetPx = 0; // no extra inset to keep gap precise
      // Scale the inter-month gap by the visual month width, not raw scale
      const maxTotalGapPx = 120; // at high zoom (wide months)
      const maxShiftRightPx = 30;
      const minTotalGapPx = 4;   // at far zoom-out (narrow months)
      const minShiftRightPx = 2;
      const dayMsLocal = 24 * 60 * 60 * 1000;
      const monthMsLocal = 30 * dayMsLocal;
      const monthWidthPx = monthMsLocal / msPerPx;
      const visibleMinMonthPx = 80;  // close to tick density threshold for months
      const visibleMaxMonthPx = 600; // beyond this we consider fully zoomed for months
      const z = Math.max(0, Math.min(1, (monthWidthPx - visibleMinMonthPx) / (visibleMaxMonthPx - visibleMinMonthPx)));
      const totalGapPx = minTotalGapPx + z * (maxTotalGapPx - minTotalGapPx);
      const gapHalfPx = totalGapPx / 2;
      const gapShiftPx = minShiftRightPx + z * (maxShiftRightPx - minShiftRightPx);
      const leftEpsilonPx = 4; // small crisp boundary near next month's tick
      const leftEpsilonMs = msPerPx * leftEpsilonPx;
      const rightStartOffsetMs = msPerPx * (gapShiftPx + gapHalfPx); // start bracket this far right of month start
      
      ctx.save();
      ctx.strokeStyle = '#c37a45';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let d = new Date(monthStart); d.getTime() <= tEnd; d.setUTCMonth(d.getUTCMonth() + 1)) {
        const startMs = d.getTime();
        const endMs = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).getTime();
        // Create a small pixel gap centered on the month boundary and align near day ticks
        // Right bracket (start of the current month) sits to the right creating a 120px gap centered 60px to the right of the boundary
        const adjStartMs = startMs + rightStartOffsetMs;
        // Left bracket (end of the current month) ends just left of the next month's tick for a crisp boundary
        const adjEndMs = endMs - leftEpsilonMs;
        const sx = timeToX(adjStartMs, width);
        const ex = timeToX(adjEndMs, width);
        const left = Math.max(0, sx);
        const right = Math.min(width, ex);
        const innerLeft = left + insetPx;
        const innerRight = right - insetPx;
        const span = innerRight - innerLeft;
        if (span < minSpanPx) continue;

        // rounded-corner bracket path starting at month start and ending at month end
        const radius = Math.min(10, Math.max(6, Math.min(span * 0.1, 12))); // match corner curvature to span
        const topY = yBase - bracketHeight;

        ctx.beginPath();
        // up-left corner
        ctx.moveTo(innerLeft, yBase);
        ctx.quadraticCurveTo(innerLeft, topY, innerLeft + radius, topY);
        // top straight segment
        ctx.lineTo(innerRight - radius, topY);
        // down-right corner
        ctx.quadraticCurveTo(innerRight, topY, innerRight, yBase);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let t = first; t < xToTime(width, width) + step; t += step) {
      const x = timeToX(t, width);
      // Year markers as circles on the baseline; keep line ticks for finer units
      if (tickSpec.unit === 'year') {
        ctx.save();
        const radius = 9; // larger year node
        ctx.fillStyle = '#1e3a5f'; // solid node without border
        ctx.beginPath();
        ctx.arc(x, midY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (tickSpec.unit === 'month') {
        // Month boundary as a small circle on the baseline
        ctx.save();
        const mr = 6; // slightly larger to align visually with bracket corners
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.arc(x, midY, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Finer units (day) keep short tick lines
        ctx.save();
        ctx.strokeStyle = 'rgba(30,58,95,0.35)';
        ctx.beginPath();
        ctx.moveTo(x, midY - 10);
        ctx.lineTo(x, midY + 10);
        ctx.stroke();
        ctx.restore();
      }

      const label = tickSpec.fmt(new Date(t));
      const text = String(label);
      const padX = 6;
      const padY = 3;
      // Larger font for year labels
      const isYear = tickSpec.unit === 'year';
      ctx.save();
      ctx.font = `${isYear ? '600 ' : ''}${isYear ? 14 : 12}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
      const metrics = ctx.measureText(text);
      const tw = Math.ceil(metrics.width);
      const th = isYear ? 20 : 16;
      const rx = x - (tw / 2) - padX;
      const ry = midY + 18;
      // label background
      ctx.fillStyle = 'rgba(250,246,240,0.85)';
      drawRoundedRect(ctx, rx, ry, tw + padX * 2, th, 6);
      ctx.fill();
      // no stroke (border) around the year label background
      // label text
      ctx.fillStyle = '#1e3a5f';
      ctx.fillText(text, x, ry + padY);
      ctx.restore();
    }

    if (points.length === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(44,95,111,0.4)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 14px ui-sans-serif, system-ui';
      ctx.fillText('No items to display', width / 2, midY - 28);
      ctx.restore();
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

    // Draw point markers
    points.forEach((p) => {
      const x = timeToX(p.ts, width);
      ctx.fillStyle = '#e89547';
      ctx.save();
      ctx.shadowColor = 'rgba(232,149,71,0.8)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, midY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // small vertical marker for extra visibility
      ctx.strokeStyle = '#e89547';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, midY - 72);
      ctx.lineTo(x, midY + 32);
      ctx.stroke();
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
  }, [containerWidth, dpr, height, msPerPx, panX, points, tickSpec, timeToX, xToTime, scale]);

  return (
    <div className="w-full relative">
      <div ref={containerRef} className="relative w-full" style={{ height }}>
        <canvas ref={canvasRef} className="w-full h-full rounded-lg shadow-sm bg-[#faf6f0]" />
        {/* Hover tooltip (uses cluster detection above) */}
        {/* Always-visible connectors and cards (one per bucket) */}
        {layoutCards.map((lc, idx) => {
          const stemOffset = 160 + lc.level * 108 - 8; // distance from baseline to just under card
          const cardTop = `calc(50% - ${160 + lc.level * 108}px)`;
          return (
          <div key={`card-${idx}`} className="absolute left-0 top-0 w-full h-full pointer-events-none">
            {/* Stem connecting to baseline */}
            <div
              className="absolute"
              style={{ left: `${Math.max(2, Math.min(containerWidth - 2, Math.round(lc.bucket.x))) - 1}px`, top: `calc(50% - ${stemOffset}px)`, width: '0px', height: `${stemOffset}px`, borderLeft: '2px solid #e89547', boxShadow: '0 0 8px rgba(232,149,71,0.6)' }}
            />
            {/* Rectangular info card */}
            <div
              className="absolute bg-white/95 backdrop-blur-sm border border-[#e3c292]/60 rounded-xl shadow-xl p-3 text-xs text-[#1e3a5f]"
              style={{ left: `${Math.round(lc.left)}px`, top: cardTop, width: '320px' }}
            >
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {lc.bucket.items.map((p) => {
                  const img = (p.submission?.submission_content || []).find((c) => ['image','images','photo'].includes((c.type||'').toLowerCase()) && (c.file_path || (c.content||'').startsWith('http')));
                  const title = p.title || 'Untitled';
                  const desc = p.description || '';
                  const dateStr = new Date(p.ts).toLocaleDateString();
                  const imgUrlRaw = img?.file_path || (img?.content || '');
                  const imgUrl = buildPublicUrl(imgUrlRaw);
                  return (
                    <div key={p.id} className="flex items-start gap-3">
                      {imgUrl && <img src={imgUrl} alt="thumb" className="w-10 h-10 rounded-md object-cover border border-[#e3c292]/60" />}
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1e3a5f] truncate">{title}</div>
                        {desc && <div className="text-[#2c5f6f] truncate">{desc}</div>}
                        <div className="text-[10px] text-[#2c5f6f] mt-0.5">{dateStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );})}
      </div>
      {/* Controls bottom-right */}
      <div className="absolute right-4 bottom-4 flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-[#e3c292]/60 rounded-full shadow-md px-3 py-2">
        <div className="text-xs text-[#2c5f6f] hidden sm:block">Scale {scale.toFixed(2)}</div>
        <button className="prophecy-button-sm px-4 py-2 rounded-full text-sm" onClick={() => setScale((s) => Math.min(200, s * 1.2))}>Zoom In</button>
        <button className="prophecy-button-sm px-4 py-2 rounded-full text-sm" onClick={() => setScale((s) => Math.max(0.1, s / 1.2))}>Zoom Out</button>
        <button className="prophecy-button-sm px-4 py-2 rounded-full text-sm" onClick={() => { setScale(1); setPanX(0); }}>Reset</button>
      </div>
    </div>
  );
}


