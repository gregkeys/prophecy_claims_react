import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// InfiniteTimeline: performant canvas-based horizontal timeline with pan/zoom.
// - Scale levels: years → months → days depending on pixels-per-time
// - Clusters many items when crowded
// - Expects submissions: [{ id, title, created_at, submission_content: [{ type, content }] }]
// - Extracts a date from timeframe content or created_at
export default function InfiniteTimeline({ submissions = [], height = '70vh', canEdit = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const [tool, setTool] = useState(null); // {id, x, y, ts}
  const [dpr, setDpr] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [panX, setPanX] = useState(0);
  const [scale, setScale] = useState(1); // 1 = base; higher = zoom in
  const [hoverInfo, setHoverInfo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, panAtStart: 0 });
  const movedRef = useRef(false);
  const pointerDownOnCanvasRef = useRef(false);
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

    const parseEventStyle = (contents) => {
      if (!contents) return null;
      const styleItem = contents.find((c) => (c?.type || '').toLowerCase() === 'timeline_style');
      if (!styleItem) return null;
      // Parse strictly from metadata jsonb
      const raw = styleItem.metadata;
      if (!raw) return null;
      try {
        const root = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const src = root?.timeline_style ? root.timeline_style : root;

        const toPos = (v) => {
          const val = (v || '').toString().toLowerCase();
          if (['on', 'center', 'on_line'].includes(val)) return 'on';
          if (['above', 'above_line'].includes(val)) return 'above';
          if (['below', 'below_line'].includes(val)) return 'below';
          return 'above';
        };

        const toItemStyle = (v) => {
          const val = (v || '').toString().toLowerCase();
          if (['marker + text','marker_text','marker+text'].includes(val)) return 'marker_text';
          if (['chat bubble','chat_bubble'].includes(val)) return 'chat_bubble';
          if (['chat square','chat_square'].includes(val)) return 'chat_square';
          if (['marker'].includes(val)) return 'marker';
          if (['text'].includes(val)) return 'text';
          if (['circle'].includes(val)) return 'circle';
          if (['card'].includes(val)) return 'card';
          // Back-compat: map old outline styles to nearest
          if (['subtle','bold','none','outline'].includes(val)) return 'marker';
          return 'card';
        };

        const toBorderStyle = (v) => {
          const val = (v || '').toString().toLowerCase();
          if (['none','solid','dashed','dotted','drop shadow','drop_shadow','glow'].includes(val)) return val;
          return 'solid';
        };

        const normalize = {
          colors: {
            background: src?.colors?.background || null,
            border: src?.colors?.border || null,
            text: src?.colors?.text || null,
          },
          textLayout: src?.textLayout || src?.text_layout || 'left',
          design: {
            itemStyle: toItemStyle(src?.design?.style || src?.design?.outlineStyle || src?.design?.outline_style),
            linePosition: (src?.design?.linePosition || src?.design?.line_position || 'center').toString().toLowerCase(), // left|center|right
            borderStyle: toBorderStyle(src?.design?.borderStyle || src?.design?.border_style),
          },
          timelinePosition: toPos(src?.timelinePosition || src?.timeline_position),
        };
        return normalize;
      } catch (e) {
        return null;
      }
    };

    return submissions
      .map((s) => {
        const ts = parseTimeframe(s.submission_content) || Date.parse(s.created_at || '') || null;
        const style = parseEventStyle(s.submission_content);
        return ts
          ? {
              id: s.id,
              title: s.title || 'Untitled',
              description: s.description || '',
              ts,
              submission: s,
              style
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

  // Zoom configuration
  const DAY_MS = 24 * 60 * 60 * 1000;
  const MIN_SCALE = 1e-6; // effectively infinite zoom-out

  const getCanvasWidth = () => Math.max(1, canvasRef.current?.getBoundingClientRect()?.width || containerWidth || 1200);
  const getMaxScale = (w) => {
    const width = Math.max(1, w || getCanvasWidth());
    // Max zoom corresponds to 24 hours across the canvas width
    const targetMsPerPx = DAY_MS / width;
    return Math.max(10, baseMsPerPx / targetMsPerPx);
  };

  // Minimum zoom: 12,000 years visible across the canvas
  const getMinScale = (w) => {
    const width = Math.max(1, w || getCanvasWidth());
    const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const spanYears = 12000;
    const targetMsPerPx = (spanYears * YEAR_MS) / width;
    return Math.max(MIN_SCALE, baseMsPerPx / targetMsPerPx);
  };

  const msPerPx = baseMsPerPx / Math.max(MIN_SCALE, scale);

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
      // Choose side per bucket based on contained item styles (below > on > above)
      const positions = (b.items || []).map((p) => (p.style?.timelinePosition || 'above').toLowerCase());
      const side = positions.includes('below') ? 'below' : positions.includes('on') ? 'on' : 'above';
      // Determine dominant style for premium shapes
      const styleOrder = ['chat_bubble','chat_square','marker_text','text','marker','circle','card'];
      const styles = (b.items || []).map((p) => (p.style?.design?.itemStyle || 'card').toLowerCase());
      const dominantStyle = styles.sort((a, b2) => styleOrder.indexOf(a) - styleOrder.indexOf(b2))[0] || 'card';
      // Aggregate colors/border style from first styled item
      const firstStyled = (b.items || []).find((p) => p.style && (p.style.colors || p.style.design));
      const styleMeta = firstStyled?.style || {};
      const desiredLeft = (b.x || 0) - CARD_WIDTH / 2;
      const left = Math.max(8, Math.min(desiredLeft, (containerWidth || 300) - CARD_WIDTH - 8));
      return { bucket: b, left, right: left + CARD_WIDTH, side, styleMode: dominantStyle, styleMeta };
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

  // Ticks based on msPerPx (supports year → month → day → hour)
  const tickSpec = useMemo(() => {
    const hour = 60 * 60 * 1000;
    const day = 24 * 60 * 60 * 1000;
    const month = day * 30;
    const year = day * 365;

    // Choose unit based on visual resolution (ms per pixel)
    let baseUnit = 'year';
    let baseMs = year;
    if (msPerPx <= 2 * hour) {
      baseUnit = 'hour';
      baseMs = hour;
    } else if (msPerPx <= 12 * hour) {
      baseUnit = 'day';
      baseMs = day;
    } else if (msPerPx <= 45 * day) {
      baseUnit = 'month';
      baseMs = month;
    } else if (msPerPx >= (1000 * year) / 200) { // ~1000-year ticks when showing ~12k years
      baseUnit = 'millennium';
      baseMs = 1000 * year;
    }

    // Ensure ticks are not overly dense (allow denser ticks for hours)
    const pxPerHour = hour / msPerPx;
    const minPxPerTick = baseUnit === 'hour' ? 30 : 80; // allow 24 hourly segments
    const multiples = baseUnit === 'millennium'
      ? [1]
      : baseUnit === 'year'
      ? [1, 2, 5, 10, 20, 50]
      : baseUnit === 'month'
        ? [1, 2, 3, 6, 12]
        : baseUnit === 'day'
          ? [1, 2, 5, 10, 15]
          : [1, 2, 3, 6, 12]; // hour (avoid 24h to prevent single tick)
    let stepMs = baseMs;
    let i = 0;
    while (stepMs / msPerPx < minPxPerTick && i < multiples.length - 1) {
      i += 1;
      stepMs = baseMs * multiples[i];
    }

    // Prefer 1-hour ticks when they are sufficiently spaced
    if (baseUnit === 'hour' && pxPerHour >= minPxPerTick) {
      stepMs = hour;
    }

    const fmt = (d) => {
      if (baseUnit === 'millennium') return `${Math.floor(d.getUTCFullYear() / 1000) * 1000}`;
      if (baseUnit === 'hour') return d.toLocaleTimeString('en-US', { hour: '2-digit' });
      if (baseUnit === 'day') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (baseUnit === 'month') return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      return d.getUTCFullYear();
    };

    return { unit: baseUnit, stepMs, fmt };
  }, [msPerPx]);

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
      const nextScale = Math.max(getMinScale(width), Math.min(getMaxScale(width), scale * zoomFactor));
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
      movedRef.current = false;
      pointerDownOnCanvasRef.current = true;
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      setPanX(dragStartRef.current.panAtStart + dx);
      if (Math.abs(dx) > 4) {
        movedRef.current = true;
        // Close any open tool while the timeline is being moved
        setTool(null);
      }
    };
    const onPointerUp = (e) => {
      setDragging(false);
      if (!canEdit) return;
      if (!pointerDownOnCanvasRef.current) return; // only open when click originated on canvas
      if (movedRef.current) return; // do not open when timeline was moved
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = Math.round(rect.height / 2);
      // open tool near click projected to baseline
      setTool({ id: Date.now(), x: cx, y: cy, ts: xToTime(cx, rect.width) });
      pointerDownOnCanvasRef.current = false;
    };

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
  }, [baseMsPerPx, domain.max, domain.min, dragging, panX, scale, xToTime, canEdit]);

  // Auto-center and auto-zoom once when data and container are ready
  useEffect(() => {
    if (autoFramedRef.current) return;
    if (!containerRef.current || points.length === 0) return;
    const width = Math.max(1, containerRef.current.offsetWidth || 0);
    if (width === 0) return;
    const span = Math.max(1, domain.max - domain.min);
    const targetMsPerPx = span / (width * 0.7); // fit 70% of width
    const targetScale = Math.min(getMaxScale(width), Math.max(getMinScale(width), baseMsPerPx / targetMsPerPx));
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
    let first = Math.floor(tStart / step) * step;
    if (tickSpec.unit === 'hour') {
      // Align to exact hour boundary in local time
      const d = new Date(first);
      d.setMinutes(0, 0, 0);
      first = d.getTime();
    }
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
      if (tickSpec.unit === 'millennium') {
        // Millennium nodes as larger circles
        ctx.save();
        const radius = 10;
        ctx.fillStyle = '#1e3a5f';
        ctx.beginPath();
        ctx.arc(x, midY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (tickSpec.unit === 'year') {
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
      } else if (tickSpec.unit === 'day') {
        // Day ticks: short lines
        ctx.save();
        ctx.strokeStyle = 'rgba(30,58,95,0.35)';
        ctx.beginPath();
        ctx.moveTo(x, midY - 10);
        ctx.lineTo(x, midY + 10);
        ctx.stroke();
        ctx.restore();
      } else {
        // Hour ticks: smaller lines
        ctx.save();
        ctx.strokeStyle = 'rgba(30,58,95,0.28)';
        ctx.beginPath();
        ctx.moveTo(x, midY - 8);
        ctx.lineTo(x, midY + 8);
        ctx.stroke();
        ctx.restore();
      }

      const label = tickSpec.fmt(new Date(t));
      const text = String(label);
      const padX = 6;
      const padY = 3;
      // Larger font for year labels; smaller for hours; largest for millennia
      const isMillennium = tickSpec.unit === 'millennium';
      const isYear = tickSpec.unit === 'year';
      const isHour = tickSpec.unit === 'hour';
      ctx.save();
      ctx.font = `${(isMillennium || isYear) ? '600 ' : ''}${isMillennium ? 16 : (isYear ? 14 : (isHour ? 11 : 12))}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`;
      const metrics = ctx.measureText(text);
      const tw = Math.ceil(metrics.width);
      const th = isMillennium ? 22 : (isYear ? 20 : (isHour ? 14 : 16));
      const rx = x - (tw / 2) - padX;
      const ry = midY + (isHour ? 14 : 18);
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

    // Draw point markers with optional per-event styling
    points.forEach((p) => {
      const x = timeToX(p.ts, width);
      const style = p.style || {};
      const colorFill = style?.colors?.background || '#e89547';
      const colorStroke = style?.colors?.border || '#e89547';
      const itemStyle = (style?.design?.itemStyle || 'card').toLowerCase(); // card|marker|text|marker_text|circle|chat_bubble|chat_square
      const borderStyle = (style?.design?.borderStyle || 'solid').toLowerCase(); // none|solid|dashed|dotted|drop shadow|glow
      const linePosition = (style?.design?.linePosition || 'center').toLowerCase(); // left|center|right
      const timelinePosition = (style?.timelinePosition || 'above').toLowerCase(); // above|on|below

      // Node
      ctx.save();
      ctx.shadowColor = 'rgba(232,149,71,0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const nodeRadius = itemStyle === 'circle' ? 8 : 6;
      ctx.arc(x, midY, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = colorFill;
      ctx.fill();
      if (['marker','marker_text','circle'].includes(itemStyle)) {
        ctx.strokeStyle = colorStroke;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Stem
      ctx.save();
      if (borderStyle === 'none') {
        ctx.restore();
      } else {
        ctx.strokeStyle = colorStroke;
        ctx.lineWidth = 2;
        if (borderStyle === 'dashed') ctx.setLineDash([6, 4]);
        else if (borderStyle === 'dotted') ctx.setLineDash([2, 4]);
        else ctx.setLineDash([]);
        if (borderStyle === 'drop shadow') {
          ctx.shadowColor = colorStroke;
          ctx.shadowBlur = 8;
        } else if (borderStyle === 'glow') {
          ctx.shadowColor = colorStroke;
          ctx.shadowBlur = 14;
        }
        let topY = midY - 72;
        let bottomY = midY + 32;
        if (timelinePosition === 'above') { topY = midY - 72; bottomY = midY - (linePosition === 'center' ? 0 : (linePosition === 'left' ? 8 : -8)); }
        else if (timelinePosition === 'below') { topY = midY + (linePosition === 'center' ? 0 : (linePosition === 'left' ? -8 : 8)); bottomY = midY + 72; }
        else { // on
          topY = midY - 24;
          bottomY = midY + 24;
        }
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.stroke();
        ctx.restore();
      }
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
        {canEdit && tool && (
          <RadialTool key={tool.id} x={tool.x} y={tool.y} />
        )}
        {/* Hover tooltip (uses cluster detection above) */}
        {/* Always-visible connectors and cards (one per bucket) */}
        {layoutCards.map((lc, idx) => {
          const insidePx = 12; // how far the connector ends inside the card
          const distAboveTop = 160 + lc.level * 108; // distance from baseline to card top (above)
          const distBelowTop = 20 + lc.level * 108;  // distance from baseline to card top (below)
          // Stem height stops inside the card by insidePx
          const stemHeight = lc.side === 'below'
            ? distBelowTop + insidePx
            : distAboveTop - insidePx;
          const cardTop = lc.side === 'below'
            ? `calc(50% + ${distBelowTop}px)`
            : lc.side === 'on'
              ? `calc(50% - 12px)`
              : `calc(50% - ${distAboveTop}px)`;
          return (
          <div key={`card-${idx}`} className="absolute left-0 top-0 w-full h-full pointer-events-none">
            {/* Stem connecting to baseline */}
            {lc.side !== 'on' && (
              <div
                className="absolute"
                style={{
                  left: `${Math.max(2, Math.min(containerWidth - 2, Math.round(lc.bucket.x))) - 1}px`,
                  top: lc.side === 'below' ? '50%' : `calc(50% - ${stemHeight}px)`,
                  width: '0px',
                  height: `${stemHeight}px`,
                  borderLeft: '2px solid #e89547',
                  boxShadow: '0 0 8px rgba(232,149,71,0.6)'
                }}
              />
            )}
            {/* Premium/standard card container */}
            <div
              className="absolute p-3 text-xs"
              style={{
                left: `${Math.round(lc.left)}px`,
                top: cardTop,
                width: '320px',
                backgroundColor: lc.styleMode === 'text' ? 'transparent' : 'rgba(255,255,255,0.95)',
                borderColor: lc.styleMode === 'text' ? 'transparent' : '#e3c292',
                borderWidth: lc.styleMode === 'text' ? 0 : 1,
                borderStyle: lc.styleMode === 'text' ? 'none' : 'solid',
                borderRadius: lc.styleMode === 'chat_square' ? '10px' : '12px',
                boxShadow: lc.styleMeta?.design?.borderStyle === 'glow' ? `0 0 16px ${lc.styleMeta?.colors?.border || '#00000055'}` : lc.styleMeta?.design?.borderStyle === 'drop shadow' ? `0 6px 14px ${lc.styleMeta?.colors?.border || '#00000055'}` : '0 4px 10px rgba(0,0,0,0.08)'
              }}
            >
              {/* Chat bubble tail */}
              {lc.styleMode === 'chat_bubble' && (
                <div
                  className="absolute"
                  style={{
                    left: `${Math.max(6, Math.min(314, Math.round(lc.bucket.x - lc.left))) - 6}px`,
                    bottom: lc.side === 'below' ? 'auto' : '-8px',
                    top: lc.side === 'below' ? '-8px' : 'auto',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: lc.side === 'below' ? '8px solid rgba(255,255,255,0.95)' : 'none',
                    borderBottom: lc.side !== 'below' ? '8px solid rgba(255,255,255,0.95)' : 'none'
                  }}
                />
              )}
              <div className="space-y-3 max-h-56 overflow-y-auto">
                {lc.bucket.items.map((p) => {
                  const img = (p.submission?.submission_content || []).find((c) => ['image','images','photo'].includes((c.type||'').toLowerCase()) && (c.file_path || (c.content||'').startsWith('http')));
                  const title = p.title || 'Untitled';
                  const desc = p.description || '';
                  const dateStr = new Date(p.ts).toLocaleDateString();
                  const imgUrlRaw = img?.file_path || (img?.content || '');
                  const imgUrl = buildPublicUrl(imgUrlRaw);
                  const style = p.style || {};
                  const textColor = style?.colors?.text || '#1e3a5f';
                  const subTextColor = style?.colors?.text ? style?.colors?.text : '#2c5f6f';
                  const bgColor = style?.colors?.background || undefined;
                  const borderColor = style?.colors?.border || undefined;
                  const align = (style?.textLayout || 'left').toLowerCase();
                  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                  const itemStyle = (style?.design?.itemStyle || 'card').toLowerCase();
                  const borderStyle = (style?.design?.borderStyle || 'solid').toLowerCase();
                  const cardStyle = {
                    backgroundColor: itemStyle === 'text' ? 'transparent' : (bgColor || 'transparent'),
                    color: textColor,
                    borderColor: borderColor || undefined,
                    borderWidth: borderColor ? 1 : undefined,
                    borderStyle: borderColor ? 'solid' : undefined,
                    boxShadow: borderStyle === 'drop shadow' ? `0 6px 14px ${borderColor || '#00000055'}` : borderStyle === 'glow' ? `0 0 16px ${borderColor || '#00000055'}` : undefined
                  };
                  return (
                    <div key={p.id} className={`flex items-start gap-3 ${alignClass}`} style={{ color: textColor }}>
                      {imgUrl && <img src={imgUrl} alt="thumb" className="w-10 h-10 rounded-md object-cover border" style={{ borderColor: borderColor || '#e3c292' }} />}
                      <div className="min-w-0 rounded-md p-1" style={cardStyle}>
                        <div className="font-semibold truncate" style={{ color: textColor }}>{title}</div>
                        {desc && <div className="truncate" style={{ color: subTextColor }}>{desc}</div>}
                        <div className="text-[10px] mt-0.5" style={{ color: subTextColor }}>{dateStr}</div>
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
      <div className="absolute right-4 bottom-4 z-20 flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-[#e3c292]/60 rounded-full shadow-md px-3 py-2" style={{ right: '24px', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}>
        <div className="text-xs text-[#2c5f6f] hidden sm:block">Scale {scale.toFixed(2)}</div>
        <button className="prophecy-button-sm px-4 py-2 rounded-full text-sm" onClick={() => setScale((s) => Math.min(getMaxScale(), s * 1.2))}>Zoom In</button>
        <button className="prophecy-button-sm px-4 py-2 rounded-full text-sm" onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.2))}>Zoom Out</button>
        <button className="prophecy-button-sm px-4 py-2 rounded-full text-sm" onClick={() => { setScale(1); setPanX(0); }}>Reset</button>
      </div>
    </div>
  );
}

function RadialTool({ x, y }) {
  const items = [
    { key: 'event', icon: '📍', label: 'Event' },
    { key: 'period', icon: '⏳', label: 'Time Period' },
    { key: 'percentage', icon: '📊', label: 'Percentage' },
    { key: 'stats', icon: '📈', label: 'Statistics' },
    { key: 'data', icon: '🧩', label: 'Data' },
    { key: 'api', icon: '🔌', label: 'API' },
    { key: 'group', icon: '🗂️', label: 'Grouping' },
    { key: 'multi', icon: '📉', label: 'MultiStatistics' },
    { key: 'import', icon: '🔗', label: 'Import Google' },
  ];
  const radius = 96;
  const centerY = `${y}px`;

  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="absolute z-30 select-none" style={{ left: x, top: centerY, transform: 'translate(-50%, -50%)' }}>
      <div className="relative" style={{ width: 0, height: 0 }}>
        {/* Central circle */}
        <div
          className="absolute -left-7 -top-7 w-14 h-14 rounded-full bg-white/95 border border-[#e3c292]/60 shadow-xl flex items-center justify-center text-[#1e3a5f] font-semibold"
          style={{ transform: `translate(-2px, 4px) scale(${open ? 1 : 0.6})`, opacity: open ? 1 : 0, transition: 'transform .18s ease-out, opacity .18s ease-out', willChange: 'transform, opacity' }}
        >
          +
        </div>
        {/* Orbiting items with opening animation and stagger */}
        {items.map((it, idx) => {
          const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2; // start at top
          const ox = Math.cos(angle) * radius;
          const oy = Math.sin(angle) * radius;
          const sizeHalf = 20; // half of 40px (w-10 h-10)
          const target = `translate(${ox - sizeHalf}px, ${oy - sizeHalf}px)`;
          const delay = 30 + idx * 12; // ms stagger
          return (
            <div
              key={it.key}
              className="absolute"
              style={{
                transform: open ? target : `translate(${-sizeHalf}px, ${-sizeHalf}px)`,
                transition: `transform .25s cubic-bezier(.2,.8,.2,1) ${delay}ms, opacity .2s ease-out ${delay}ms`,
                opacity: open ? 1 : 0,
                willChange: 'transform, opacity'
              }}
            >
              <div className="group relative">
                <button className="w-10 h-10 rounded-full bg-white/95 border border-[#e3c292]/60 shadow-md hover:shadow-xl flex items-center justify-center text-base transition-transform duration-150 hover:scale-110">
                  <span>{it.icon}</span>
                </button>
                {/* Tooltip above the icon */}
                <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-[#1e3a5f] text-white text-[10px] px-2 py-1 rounded shadow whitespace-nowrap">{it.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


