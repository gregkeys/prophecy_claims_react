import { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';

// Lazy import OrbitControls to avoid SSR issues
let OrbitControls;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const controlsModule = require('three/examples/jsm/controls/OrbitControls.js');
  OrbitControls = controlsModule.OrbitControls;
}

function normalizeDatesToPositions(items) {
  if (!items || items.length === 0) {
    return [];
  }

  const parsed = items.map((i) => ({
    ...i,
    dateValue: parseDateToNumber(i.timeframe || i.date || i.created_at)
  }));

  const min = Math.min(...parsed.map((p) => p.dateValue));
  const max = Math.max(...parsed.map((p) => p.dateValue));
  const range = Math.max(1, max - min);

  return parsed
    .sort((a, b) => a.dateValue - b.dateValue)
    .map((p, idx) => ({
      ...p,
      // Map along X axis from -length/2 to +length/2
      x: ((p.dateValue - min) / range - 0.5) * 100,
      y: ((idx % 2 === 0) ? 1 : -1) * 6,
      z: (Math.sin(idx) * 4)
    }));
}

function parseDateToNumber(input) {
  if (!input) return 0;

  // Handle year-only strings like "2025"
  if (/^\d{4}$/.test(String(input))) {
    return new Date(`${input}-01-01`).getTime();
  }

  const tryDate = new Date(input);
  if (!Number.isNaN(tryDate.getTime())) {
    return tryDate.getTime();
  }

  // Fallback: try to extract year
  const match = String(input).match(/(\d{4})/);
  if (match) {
    return new Date(`${match[1]}-01-01`).getTime();
  }

  return 0;
}

export default function ThreeTimeline({
  items = [],
  onSelect,
  axisType = 'helix',
  background = 'stars',
  getCategory,
  relations = [],
  timeAxis = 'z',
  showMiniCards = false
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const [isReady, setIsReady] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const targetCameraZRef = useRef(60);
  const timeSpanRef = useRef({ min: 0, max: 1, years: 1, length: 120 });

  const nodes = useMemo(() => normalizeDatesToPositions(items), [items]);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (renderer.outputColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 20, 60);
    cameraRef.current = camera;
    targetCameraZRef.current = camera.position.z;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(30, 50, 30);
    scene.add(dir);
    const point = new THREE.PointLight(0xffffff, 0.8, 300);
    point.position.set(-20, 10, 40);
    scene.add(point);

    // Background stars
    if (background === 'stars') {
      const starCount = 800;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 600;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 600;
      }
      const starsGeo = new THREE.BufferGeometry();
      starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, sizeAttenuation: true, opacity: 0.8, transparent: true });
      const stars = new THREE.Points(starsGeo, starsMat);
      stars.name = 'starfield';
      scene.add(stars);
    }

    // Timeline path along Z-axis (helix or straight)
    if (nodes.length > 0) {
      const min = Math.min(...nodes.map(n => n.dateValue));
      const max = Math.max(...nodes.map(n => n.dateValue));
      const years = Math.max(1, new Date(max).getFullYear() - new Date(min).getFullYear());
      const length = Math.min(300, Math.max(60, years * 15));
      timeSpanRef.current = { min, max, years, length };

      let pathMesh;
      if (axisType === 'helix') {
        const helixCurve = new HelixCurve({ length, radius: 10, turns: Math.max(2, Math.min(6, Math.ceil(years / 8))) });
        const tubeGeo = new THREE.TubeGeometry(helixCurve, 400, 0.6, 16, false);
        const tubeMat = new THREE.MeshPhysicalMaterial({ color: 0x87ceeb, emissive: 0x87ceeb, emissiveIntensity: 0.6, transparent: true, opacity: 0.3, metalness: 0.1, roughness: 0.6, blending: THREE.AdditiveBlending });
        pathMesh = new THREE.Mesh(tubeGeo, tubeMat);
      } else {
        const straightCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, -length / 2),
          new THREE.Vector3(0, 0, length / 2)
        ]);
        const tubeGeo = new THREE.TubeGeometry(straightCurve, 100, 0.6, 16, false);
        const tubeMat = new THREE.MeshPhysicalMaterial({ color: 0xd4a574, emissive: 0xd4a574, emissiveIntensity: 0.6, transparent: true, opacity: 0.35, metalness: 0.1, roughness: 0.6, blending: THREE.AdditiveBlending });
        pathMesh = new THREE.Mesh(tubeGeo, tubeMat);
      }
      pathMesh.name = 'timeline_path';
      scene.add(pathMesh);
    }

    // Nodes or cards depending on axisType
    const nodeGroup = new THREE.Group();
    nodeGroup.name = 'timeline_nodes';
    const cardsGroup = new THREE.Group();
    cardsGroup.name = 'cards_group';
    const stemsGroup = new THREE.Group();
    stemsGroup.name = 'stems_group';

    const sphereGeometry = new THREE.SphereGeometry(1.1, 24, 24);
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    const tetraGeometry = new THREE.TetrahedronGeometry(1.4);

    const cardPosById = {};

    nodes.forEach((n, index) => {
      const category = getCategory ? getCategory(n) : (n.status || 'default');
      const color = getCategoryColor(category);
      const emissive = color;
      const shape = getCategoryShape(category);
      const geometry = shape === 'box' ? boxGeometry : shape === 'tetra' ? tetraGeometry : sphereGeometry;
      const basePos = positionForNode(n, timeSpanRef.current, axisType);

      if (axisType === 'line') {
        const side = index % 2 === 0 ? -1 : 1; // left/right
        const cardPos = new THREE.Vector3(14 * side, 0, basePos.z);
        cardPosById[n.id ?? n.submission_id ?? index] = cardPos.clone();

        // stem line from axis to card
        const stemGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, basePos.z),
          cardPos
        ]);
        const stemMat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.6 });
        const stem = new THREE.Line(stemGeo, stemMat);
        stemsGroup.add(stem);

        // card sprite with title and timeframe
        const subtitle = n.timeframe || n.date || new Date(n.created_at || Date.now()).toLocaleDateString('en-US');
        const desc = n.description || '';
        const card = createCardSprite(n.title || 'Untitled', subtitle, desc);
        card.position.copy(cardPos);
        card.userData = { item: n, isCard: true };
        cardsGroup.add(card);
      } else {
        // Helix mode: meshes + optional labels
        const material = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.2, metalness: 0.2, roughness: 0.5 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(basePos);
        mesh.userData = { item: n, index, baseScale: 1 };
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        if (showMiniCards) {
          const label = createLabelSprite(n.title || 'Untitled', {
            bgColor: 'rgba(255,255,255,0.95)',
            textColor: '#1e3a5f'
          });
          label.position.set(0, 3, 0);
          label.userData = { isLabel: true };
          mesh.add(label);
        }
        nodeGroup.add(mesh);
      }
    });

    if (nodeGroup.children.length > 0) scene.add(nodeGroup);
    if (cardsGroup.children.length > 0) scene.add(cardsGroup);
    if (stemsGroup.children.length > 0) scene.add(stemsGroup);

    // Year tick marks
    if (nodes.length > 0) {
      const tickGroup = new THREE.Group();
      const tickMaterial = new THREE.LineBasicMaterial({ color: 0xf4d03f });
      const minYear = new Date(timeSpanRef.current.min).getFullYear();
      const maxYear = new Date(timeSpanRef.current.max).getFullYear();
      const spanYears = Math.max(1, maxYear - minYear);
      const step = spanYears <= 6 ? 1 : spanYears <= 20 ? 2 : 5;
      for (let y = minYear; y <= maxYear; y += step) {
        const t = (parseDateToNumber(`${y}-01-01`) - timeSpanRef.current.min) /
          Math.max(1, timeSpanRef.current.max - timeSpanRef.current.min);
        const z = (t - 0.5) * timeSpanRef.current.length;
        const tickGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-2, 0, z),
          new THREE.Vector3(2, 0, z)
        ]);
        const tick = new THREE.Line(tickGeo, tickMaterial);
        tickGroup.add(tick);
      }
      scene.add(tickGroup);
    }

    // Relations
    if ((relations && relations.length > 0) || nodes.length > 1) {
      const linesGroup = new THREE.Group();
      linesGroup.name = 'relations_group';
      const rels = (relations && relations.length > 0)
        ? relations
        : nodes.slice(0, nodes.length - 1).map((n, i) => ({ sourceId: nodes[i].id ?? nodes[i].submission_id, targetId: nodes[i + 1].id ?? nodes[i + 1].submission_id }));

      rels.forEach((rel) => {
        const a = nodes.find(n => (n.id ?? n.submission_id) === rel.sourceId);
        const b = nodes.find(n => (n.id ?? n.submission_id) === rel.targetId);
        if (!a || !b) return;
        let p0 = positionForNode(a, timeSpanRef.current, axisType);
        let p2 = positionForNode(b, timeSpanRef.current, axisType);
        if (axisType === 'line') {
          const aid = a.id ?? a.submission_id;
          const bid = b.id ?? b.submission_id;
          if (cardPosById[aid]) p0 = cardPosById[aid].clone();
          if (cardPosById[bid]) p2 = cardPosById[bid].clone();
        }
        const mid = p0.clone().add(p2).multiplyScalar(0.5);
        mid.y += 8;
        const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
        const points = curve.getPoints(50);
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineDashedMaterial({ color: 0x87ceeb, dashSize: 2, gapSize: 1, linewidth: 1 });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        linesGroup.add(line);
      });
      scene.add(linesGroup);
    }

    // Controls
    if (OrbitControls) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enablePan = true;
      controls.minDistance = 10;
      controls.maxDistance = 200;
      controlsRef.current = controls;
    }

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 600;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      if (controlsRef.current) controlsRef.current.update();
      // Smooth camera z towards target
      cameraRef.current.position.z += (targetCameraZRef.current - cameraRef.current.position.z) * 0.08;
      // Animate dashed relation lines
      const relGroup = sceneRef.current.getObjectByName('relations_group');
      if (relGroup) {
        relGroup.children.forEach((line) => {
          if (line.material && line.material.isLineDashedMaterial) {
            line.material.dashOffset = (line.material.dashOffset || 0) - 0.01;
          }
        });
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      requestAnimationFrame(animate);
    };
    animate();

    const handlePointerMove = (event) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleClick = () => {
      if (!cameraRef.current || !sceneRef.current) return;
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouseRef.current, cameraRef.current);
      const nodesGroup = sceneRef.current.getObjectByName('timeline_nodes');
      const cardsGroupRef = sceneRef.current.getObjectByName('cards_group');
      const intersectTargets = [];
      if (nodesGroup) intersectTargets.push(...nodesGroup.children);
      if (cardsGroupRef) intersectTargets.push(...cardsGroupRef.children);
      if (intersectTargets.length === 0) return;
      const intersects = raycaster.intersectObjects(intersectTargets, false);
      if (intersects.length > 0) {
        const first = intersects[0].object.userData.item;
        if (onSelect) onSelect(first);
      }
    };

    const updateHover = () => {
      if (!cameraRef.current || !sceneRef.current || !rendererRef.current) return;
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouseRef.current, cameraRef.current);
      const nodesGroup = sceneRef.current.getObjectByName('timeline_nodes');
      const cardsGroupRef = sceneRef.current.getObjectByName('cards_group');
      const intersectTargets = [];
      if (nodesGroup) intersectTargets.push(...nodesGroup.children);
      if (cardsGroupRef) intersectTargets.push(...cardsGroupRef.children);
      if (intersectTargets.length === 0) return;
      const intersects = raycaster.intersectObjects(intersectTargets, false);
      let top = null;
      if (intersects.length > 0) top = intersects[0].object;

      if (hovered && hovered !== top) {
        if (hovered.isSprite) {
          hovered.scale.set(12, 6, 1);
        } else {
          hovered.scale.setScalar(hovered.userData.baseScale || 1);
          if (hovered.material) hovered.material.emissiveIntensity = 0.2;
        }
      }
      if (top) {
        if (top.isSprite) {
          top.scale.set(13.2, 6.6, 1);
        } else {
          top.scale.setScalar(1.5);
          if (top.material) top.material.emissiveIntensity = 0.8;
        }
        setHovered(top);
        const vector = top.position.clone();
        vector.project(cameraRef.current);
        const x = (vector.x * 0.5 + 0.5) * rendererRef.current.domElement.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * rendererRef.current.domElement.clientHeight;
        const item = top.userData.item;
        setTooltip({ x, y, title: item.title, subtitle: item.timeframe || item.date });
      } else {
        setHovered(null);
        setTooltip(null);
      }
    };

    const handleKey = (e) => {
      const step = 5;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        targetCameraZRef.current = Math.max(-300, targetCameraZRef.current - step);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        targetCameraZRef.current = Math.min(300, targetCameraZRef.current + step);
      } else if (e.key === 'Home') {
        targetCameraZRef.current = 60;
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('mousemove', updateHover);
    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);

    setIsReady(true);

    return () => {
      setIsReady(false);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('mousemove', updateHover);
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
      // Clean up scene
      scene.traverse((obj) => {
        if (obj.isMesh || obj.isLine || obj.isPoints) {
          if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m && m.dispose && m.dispose());
          } else if (mat && mat.dispose) {
            mat.dispose();
          }
        }
      });
    };
  }, [nodes, onSelect, axisType, background, relations, getCategory]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#1e3a5f] via-[#2c5f6f] to-[#87ceeb] rounded-xl overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Legend and help overlay */}
      <div className="absolute top-4 left-4 bg-white/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-[#1e3a5f]">
        <div className="font-semibold mb-1">3D Timeline</div>
        <div>Mouse: Drag orbit • Wheel zoom • Right-drag pan</div>
        <div>Keys: W/S or ↑/↓ travel time • Home reset</div>
        <div>Click: Open node details</div>
        {isReady ? null : <div className="text-red-700 mt-1">Initializing...</div>}
      </div>
      <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-[#1e3a5f]">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></span>
          <span>Fulfilled</span>
          <span className="inline-block w-3 h-3 rounded-full ml-3" style={{ backgroundColor: '#f59e0b' }}></span>
          <span>Pending</span>
        </div>
      </div>
      {showMiniCards && (
        <div className="absolute bottom-4 right-4 bg-white/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-[#1e3a5f]">Mini cards visible</div>
      )}
      {tooltip && (
        <div className="pointer-events-none absolute bg-white/90 text-[#1e3a5f] text-xs rounded px-2 py-1 shadow" style={{ left: `${tooltip.x + 8}px`, top: `${tooltip.y + 8}px` }}>
          <div className="font-semibold">{tooltip.title}</div>
          {tooltip.subtitle && <div className="opacity-70">{tooltip.subtitle}</div>}
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-[#1e3a5f] w-[60%]">
        <input
          type="range"
          min={-300}
          max={300}
          step={1}
          defaultValue={60}
          onChange={(e) => {
            targetCameraZRef.current = Number(e.target.value);
          }}
          className="w-full"
        />
        <div className="text-center mt-1">Scroll time (camera Z)</div>
      </div>
    </div>
  );
}

function getCategoryColor(category) {
  const palette = {
    fulfilled: 0x22c55e,
    pending: 0xf59e0b,
    economic: 0x8b5cf6,
    spiritual: 0x06b6d4,
    war: 0xef4444,
    unity: 0x10b981,
    default: 0x3b82f6
  };
  return palette[category] || palette.default;
}

function getCategoryShape(category) {
  if (category === 'economic') return 'box';
  if (category === 'war') return 'tetra';
  return 'sphere';
}

function positionForNode(n, span, axisType) {
  const { min, max, length } = span;
  const t = (n.dateValue - min) / Math.max(1, max - min);
  const z = (t - 0.5) * length;
  if (axisType === 'helix') {
    const turns = 3;
    const angle = t * turns * Math.PI * 2;
    const radius = 10;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return new THREE.Vector3(x, y, z);
  }
  return new THREE.Vector3(0, 0, z);
}

class HelixCurve extends THREE.Curve {
  constructor({ length = 120, radius = 10, turns = 3 }) {
    super();
    this.length = length;
    this.radius = radius;
    this.turns = turns;
  }
  getPoint(t) {
    const angle = t * this.turns * Math.PI * 2;
    const x = this.radius * Math.cos(angle);
    const y = this.radius * Math.sin(angle);
    const z = (t - 0.5) * this.length;
    return new THREE.Vector3(x, y, z);
  }
}

function createLabelSprite(text, { bgColor = 'rgba(255,255,255,0.95)', textColor = '#111827' } = {}) {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = 300 * scale;
  canvas.height = 160 * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  roundRect(ctx, 8 * scale, 8 * scale, canvas.width - 16 * scale, canvas.height - 16 * scale, 16 * scale);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `${18 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  wrapText(ctx, text || '', canvas.width / 2, canvas.height / 2, canvas.width - 40 * scale, 24 * scale);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(12, 6, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  const lines = [];
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  const totalHeight = lines.length * lineHeight;
  let startY = y - totalHeight / 2 + lineHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

function createCardSprite(title, subtitle, description) {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = 480 * scale;
  canvas.height = 320 * scale;
  const ctx = canvas.getContext('2d');

  // Background panel with subtle gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(250, 246, 240, 0.98)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
  ctx.fillStyle = gradient;
  roundRect(ctx, 14 * scale, 14 * scale, canvas.width - 28 * scale, canvas.height - 28 * scale, 18 * scale);
  ctx.fill();

  // Accent top border
  ctx.fillStyle = '#d4a574';
  roundRect(ctx, 14 * scale, 14 * scale, canvas.width - 28 * scale, 10 * scale, 8 * scale);
  ctx.fill();

  // Title
  ctx.fillStyle = '#1e3a5f';
  ctx.font = `${28 * scale}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const paddingX = 28 * scale;
  let cursorY = 40 * scale;
  wrapText(ctx, String(title || 'Untitled'), paddingX + 4 * scale, cursorY, canvas.width - paddingX * 2, 34 * scale);

  // Subtitle/timeframe
  ctx.fillStyle = '#8b6f47';
  ctx.font = `${20 * scale}px sans-serif`;
  cursorY += 60 * scale;
  const subtitleText = String(subtitle || 'Date not specified');
  wrapText(ctx, subtitleText, paddingX + 4 * scale, cursorY, canvas.width - paddingX * 2, 26 * scale);

  // Divider
  cursorY += 36 * scale;
  ctx.fillStyle = 'rgba(212,165,116,0.25)';
  ctx.fillRect(paddingX, cursorY, canvas.width - paddingX * 2, 2 * scale);

  // Description
  ctx.fillStyle = '#2c5f6f';
  ctx.font = `${20 * scale}px sans-serif`;
  cursorY += 16 * scale;
  wrapText(
    ctx,
    String(description || ''),
    paddingX + 4 * scale,
    cursorY,
    canvas.width - paddingX * 2,
    28 * scale
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  // Scale roughly matching readable size in scene
  sprite.scale.set(22, 14, 1);
  return sprite;
}


