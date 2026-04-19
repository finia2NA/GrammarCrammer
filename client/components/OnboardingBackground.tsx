import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  withTiming,
  Easing,
  runOnUI,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/theme';

// ─── Content ──────────────────────────────────────────────────────────────────

const GRAMMAR_WORDS = [
  '文法',        // Japanese
  'Grammatik',   // German
  'Grammaire',   // French
  'Gramática',   // Spanish
  'Грамматика',  // Russian
  '语法',        // Chinese
  'قواعد',       // Arabic
  'व्याकरण',    // Hindi
  'Grammatica',  // Italian
  '문법',        // Korean
  'Gramatika',   // Czech
  'Dil Bilgisi', // Turkish
];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const ICON_NAMES: IoniconName[] = [
  'globe-outline',
  'book-outline',
  'chatbubble-outline',
  'shuffle-outline',
  'language-outline',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Deterministic sine-hash pseudo-random, 0..1
function pr(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Static particle definitions (visual only, computed once) ─────────────────

const PARTICLE_COUNT = 40;

const SOURCES = [
  ...GRAMMAR_WORDS.map(w => ({ type: 'text' as const, content: w })),
  ...ICON_NAMES.map(n => ({ type: 'icon' as const, content: n })),
];

interface ParticleDef {
  type: 'text' | 'icon';
  content: string;
  size: number;
  baseRotation: number;
  opacity: number;
}

const DEFS: ParticleDef[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const a = pr(i * 7 + 1);
  const b = pr(i * 7 + 2);
  const c = pr(i * 7 + 3);
  const src = SOURCES[i % SOURCES.length];
  return {
    type: src.type,
    content: src.content,
    size:    src.type === 'icon' ? 26 + Math.round(b * 14) : 11 + Math.round(a * 9),
    baseRotation: (c - 0.5) * 30,
    opacity: 0.07 + a * 0.07,
  };
});

// ─── Physics constants ────────────────────────────────────────────────────────

const DAMPING          = 0.998;  // per-frame velocity multiplier — light, particles coast
const MIN_SPEED        = 0.4;    // below this, damping is not applied (floor)
const BOUNDARY_MARGIN  = 60;     // px from edge where soft force kicks in
const BOUNDARY_FORCE   = 0.05;
const SPAWN_MARGIN     = 100;    // px from edge — particles never spawn here
const REPULSE_RADIUS   = 160;    // inter-particle cutoff (px)
const REPULSE_STRENGTH = 14;
const HOVER_RADIUS     = 200;    // continuous cursor/touch push radius
const HOVER_STRENGTH   = 0.06;   // continuous force scale (per-frame)
const IMPULSE_STRENGTH = 300;    // tap/click impulse scale (one-shot)
const MAX_SPEED        = 5.0;
const INIT_SPEED       = 1.6;    // initial speed magnitude (px/frame)

// ─── Simulation state type ────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OnboardingBackgroundProps {
  color?: string;
}

export function OnboardingBackground({ color }: OnboardingBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const colors = useColors();
  const tint = color ?? colors.primary;

  // ── Simulation state ───────────────────────────────────────────────────────
  const sim    = useSharedValue<Particle[]>([]);
  const simW   = useSharedValue(width);
  const simH   = useSharedValue(height);

  // Active repulsion point (cursor hover or held touch)
  const repX   = useSharedValue(-9999);
  const repY   = useSharedValue(-9999);
  const repOn  = useSharedValue(false);

  // Shockwave ring
  const swX       = useSharedValue(0);
  const swY       = useSharedValue(0);
  const swScale   = useSharedValue(0);
  const swOpacity = useSharedValue(0);

  // ── Initialise particles ───────────────────────────────────────────────────
  useEffect(() => {
    if (!width || !height) return;
    simW.value = width;
    simH.value = height;
    const particles: Particle[] = [];
    const spawnW = width  - SPAWN_MARGIN * 2;
    const spawnH = height - SPAWN_MARGIN * 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = pr(i * 3 + 2) * Math.PI * 2;
      const speed = INIT_SPEED * (0.6 + pr(i * 11 + 5) * 0.8);
      particles.push({
        x:  SPAWN_MARGIN + pr(i * 3 + 0) * spawnW,
        y:  SPAWN_MARGIN + pr(i * 3 + 1) * spawnH,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
    sim.value = particles;
  }, [width, height]);

  // ── Web: document-level mouse events (background View is behind ScrollView) ─
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = (globalThis as any).document;
    if (!doc) return;

    const onMove = (e: MouseEvent) => {
      repX.value  = e.clientX;
      repY.value  = e.clientY;
      repOn.value = true;
    };
    const onLeave = () => { repOn.value = false; };
    const onClick = (e: MouseEvent) => {
      const tag = (e.target as HTMLElement)?.tagName ?? '';
      // Don't fire shockwave when clicking interactive elements
      if (['INPUT', 'BUTTON', 'A', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      triggerImpulse(e.clientX, e.clientY);
    };

    doc.addEventListener('mousemove', onMove);
    doc.addEventListener('mouseleave', onLeave);
    doc.addEventListener('click', onClick);
    return () => {
      doc.removeEventListener('mousemove', onMove);
      doc.removeEventListener('mouseleave', onLeave);
      doc.removeEventListener('click', onClick);
    };
  }, []);

  // ── Physics loop ───────────────────────────────────────────────────────────
  useFrameCallback(({ timeSincePreviousFrame }) => {
    'worklet';
    const curr = sim.value;
    if (!curr.length) return;

    const dt = Math.min((timeSincePreviousFrame ?? 16) / 16, 3);
    const W   = simW.value;
    const H   = simH.value;
    const rx  = repX.value;
    const ry  = repY.value;
    const ron = repOn.value;
    const n   = curr.length;

    // Copy state into mutable arrays
    const x  = new Array(n); const y  = new Array(n);
    const vx = new Array(n); const vy = new Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = curr[i].x; y[i] = curr[i].y;
      vx[i] = curr[i].vx; vy[i] = curr[i].vy;
    }

    // ── Per-particle: boundary + hover repulsion ─────────────────────────────
    for (let i = 0; i < n; i++) {
      // Soft boundary
      const bl = x[i] - BOUNDARY_MARGIN;
      const br = x[i] - (W - BOUNDARY_MARGIN);
      const bt = y[i] - BOUNDARY_MARGIN;
      const bb = y[i] - (H - BOUNDARY_MARGIN);
      if (bl < 0) vx[i] -= bl * BOUNDARY_FORCE * dt;
      if (br > 0) vx[i] -= br * BOUNDARY_FORCE * dt;
      if (bt < 0) vy[i] -= bt * BOUNDARY_FORCE * dt;
      if (bb > 0) vy[i] -= bb * BOUNDARY_FORCE * dt;

      // Continuous cursor/touch push
      if (ron) {
        const dx = x[i] - rx;
        const dy = y[i] - ry;
        const d2 = dx * dx + dy * dy;
        if (d2 < HOVER_RADIUS * HOVER_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (HOVER_STRENGTH / d2) * IMPULSE_STRENGTH * 0.01 * dt;
          vx[i] += (dx / d) * f;
          vy[i] += (dy / d) * f;
        }
      }
    }

    // ── Inter-particle repulsion ─────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];
        const d2 = dx * dx + dy * dy;
        if (d2 < REPULSE_RADIUS * REPULSE_RADIUS && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (REPULSE_STRENGTH / d2) * dt;
          const nx = dx / d;
          const ny = dy / d;
          vx[i] += nx * f; vy[i] += ny * f;
          vx[j] -= nx * f; vy[j] -= ny * f;
        }
      }
    }

    // ── Speed cap + damping + integrate ─────────────────────────────────────
    const damp = Math.pow(DAMPING, dt);
    for (let i = 0; i < n; i++) {
      const spd = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      if (spd > MAX_SPEED) {
        const s = MAX_SPEED / spd;
        vx[i] *= s; vy[i] *= s;
      }
      // Only damp above MIN_SPEED — particles maintain a natural drift floor
      if (spd > MIN_SPEED) {
        vx[i] *= damp; vy[i] *= damp;
      }
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }

    // Write back
    const next: Particle[] = [];
    for (let i = 0; i < n; i++) {
      next.push({ x: x[i], y: y[i], vx: vx[i], vy: vy[i] });
    }
    sim.value = next;
  });

  // ── Shockwave + impulse ────────────────────────────────────────────────────
  function triggerImpulse(px: number, py: number) {
    // Shockwave ring animation (runs fine from JS thread)
    swX.value       = px;
    swY.value       = py;
    swScale.value   = 0;
    swOpacity.value = 0.55;
    swScale.value   = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    swOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });

    // Apply velocity impulse on UI thread
    const applyImpulse = (ipx: number, ipy: number) => {
      'worklet';
      const curr = sim.value;
      if (!curr.length) return;
      const next: Particle[] = [];
      for (let i = 0; i < curr.length; i++) {
        const p = curr[i];
        const dx = p.x - ipx;
        const dy = p.y - ipy;
        const d2 = dx * dx + dy * dy;
        if (d2 < 1) { next.push(p); continue; }
        const d = Math.sqrt(d2);
        const f = IMPULSE_STRENGTH / d2;
        next.push({ x: p.x, y: p.y, vx: p.vx + (dx / d) * f, vy: p.vy + (dy / d) * f });
      }
      sim.value = next;
    };
    runOnUI(applyImpulse)(px, py);
  }

  // ── Native touch handlers (web uses document listeners above) ─────────────
  function onTouchStart(e: any) {
    const t   = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
    const px  = t.pageX ?? t.locationX ?? 0;
    const py  = t.pageY ?? t.locationY ?? 0;
    repX.value  = px;
    repY.value  = py;
    repOn.value = true;
    triggerImpulse(px, py);
  }
  function onTouchMove(e: any) {
    const t  = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
    repX.value = t.pageX ?? t.locationX ?? 0;
    repY.value = t.pageY ?? t.locationY ?? 0;
  }
  function onTouchEnd() {
    repOn.value = false;
    repX.value  = -9999;
    repY.value  = -9999;
  }

  // ── Shockwave ring style ───────────────────────────────────────────────────
  const shockStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width:        300,
    height:       300,
    left:         swX.value - 150,
    top:          swY.value - 150,
    borderRadius: 150,
    borderWidth:  1.5,
    borderColor:  tint,
    opacity:      swOpacity.value,
    transform:    [{ scale: swScale.value }],
    pointerEvents: 'none' as any,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View
      pointerEvents={Platform.OS === 'web' ? 'none' : 'box-only'}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onTouchStart={Platform.OS !== 'web' ? onTouchStart : undefined}
      onTouchMove={Platform.OS  !== 'web' ? onTouchMove  : undefined}
      onTouchEnd={Platform.OS   !== 'web' ? onTouchEnd   : undefined}
    >
      {DEFS.map((def, i) => (
        <ParticleView key={i} index={i} sim={sim} def={def} tint={tint} />
      ))}
      <Animated.View style={shockStyle} />
    </View>
  );
}

// ─── Particle view ────────────────────────────────────────────────────────────
// Isolated component so each useAnimatedStyle only depends on sim[index].

interface ParticleViewProps {
  index: number;
  sim: SharedValue<Particle[]>;
  def: ParticleDef;
  tint: string;
}

function ParticleView({ index, sim, def, tint }: ParticleViewProps) {
  const style = useAnimatedStyle(() => {
    const p = sim.value[index];
    if (!p) return { opacity: 0 };
    return {
      position: 'absolute',
      left: 0,
      top:  0,
      opacity: def.opacity,
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { rotate: `${def.baseRotation}deg` },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      {def.type === 'icon' ? (
        <Ionicons name={def.content as IoniconName} size={def.size} color={tint} />
      ) : (
        <Text style={{ color: tint, fontSize: def.size, fontWeight: '500' }}>
          {def.content}
        </Text>
      )}
    </Animated.View>
  );
}
