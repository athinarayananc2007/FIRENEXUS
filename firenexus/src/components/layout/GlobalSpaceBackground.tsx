import { useEffect, useRef } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  baseRadius: number;       // Radius: 1.0px to 2.5px (Diameter: 2px to 5px)
  currentRadius: number;
  targetRadius: number;

  // Velocity and Movement Dynamics
  vx: number;
  vy: number;
  baseSpeed: number;        // Speed: 0.4 to 1.1 px/frame
  angle: number;           // Heading angle in radians (0 to 2*PI)
  curveSpeed: number;      // Subtle orbital curve (-0.007 to +0.007 rad/frame)
  driftPhase: number;
  driftFrequency: number;

  // Visual Appearance & Glow
  baseAlpha: number;       // Clearly visible: 0.55 to 0.88
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;           // Cyan, teal, turquoise, soft orange, gold
  coreColor: string;
  glowColor: string;

  // Interaction State Machine
  isExcited: boolean;
  blinkTimer: number;      // Countdown in frames (e.g. 35 frames ≈ 0.6s)
  excitedGlow: number;     // 0 to 1 intensity
  trail: TrailPoint[];
}

// Subtle cyan, teal, turquoise, and soft orange color palette
const PARTICLE_PALETTE = [
  {
    color: '#00B8D9',       // Satellite Cyan
    coreColor: '#7DE7F9',
    glowColor: 'rgba(0, 184, 217, 0.45)',
  },
  {
    color: '#00E5B0',       // Turquoise / Mint
    coreColor: '#96FFDF',
    glowColor: 'rgba(0, 229, 176, 0.45)',
  },
  {
    color: '#06D6A0',       // Deep Luminous Teal
    coreColor: '#80FCE0',
    glowColor: 'rgba(6, 214, 160, 0.45)',
  },
  {
    color: '#FF8A5B',       // Soft Solar Orange
    coreColor: '#FFD1BE',
    glowColor: 'rgba(255, 138, 91, 0.45)',
  },
  {
    color: '#FFA94D',       // Soft Golden Amber
    coreColor: '#FFE0B2',
    glowColor: 'rgba(255, 169, 77, 0.45)',
  },
];

interface GlobalSpaceBackgroundProps {
  /** Optional density modifier: 'normal' | 'dense' | 'minimal' */
  density?: 'normal' | 'dense' | 'minimal';
  /** Show subtle celestial orbital rings */
  showOrbitalRings?: boolean;
}

export default function GlobalSpaceBackground({
  density = 'normal',
  showOrbitalRings = true,
}: GlobalSpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let isDocumentVisible = !document.hidden;

    // Pointer tracking via window listeners with { passive: true }
    // Guarantees zero interference with scrolling, dragging, clicking, maps, or 3D Earth
    let pointerX = -2000;
    let pointerY = -2000;
    let pointerActive = false;
    let pointerInactivityTimer: number | null = null;
    let isTouchInteraction = false;

    // Desktop: 50–70 particles | Mobile: 32–42 particles
    const getParticleCount = (w: number) => {
      let base = w < 640 ? 36 : w < 1024 ? 52 : 62;
      if (density === 'minimal') base = Math.floor(base * 0.5);
      if (density === 'dense') base = Math.floor(base * 1.25);
      return base;
    };

    const initParticles = () => {
      const count = getParticleCount(width);
      particles = [];

      for (let i = 0; i < count; i++) {
        const theme = PARTICLE_PALETTE[i % PARTICLE_PALETTE.length];

        // Particle size between 2px and 5px diameter (radius: 1.0px to 2.5px)
        // Stratified sizing: ~20% large (2.0-2.5px), ~40% medium (1.5-2.0px), ~40% small (1.0-1.5px)
        const sizeCategory = Math.random();
        const baseRadius = sizeCategory > 0.8
          ? Math.random() * 0.5 + 2.0   // 4.0px to 5.0px diameter
          : sizeCategory > 0.4
            ? Math.random() * 0.5 + 1.5 // 3.0px to 4.0px diameter
            : Math.random() * 0.5 + 1.0; // 2.0px to 3.0px diameter

        // Full 360-degree continuous automatic movement
        const angle = Math.random() * Math.PI * 2;
        // Varied speeds between 0.45 and 1.1 px/frame
        const baseSpeed = Math.random() * 0.65 + 0.45;

        // ~40% of particles drift along slow curved orbital paths
        const hasCurve = Math.random() < 0.42;
        const curveSpeed = hasCurve ? (Math.random() - 0.5) * 0.009 : 0;

        // Base opacity: clearly visible (0.55 to 0.88)
        const baseAlpha = Math.random() * 0.33 + 0.55;

        particles.push({
          id: i,
          x: Math.random() * width,
          y: Math.random() * height,
          baseRadius,
          currentRadius: baseRadius,
          targetRadius: baseRadius,

          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
          baseSpeed,
          angle,
          curveSpeed,
          driftPhase: Math.random() * Math.PI * 2,
          driftFrequency: Math.random() * 0.02 + 0.008,

          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: Math.random() * 0.022 + 0.008,
          twinklePhase: Math.random() * Math.PI * 2,
          color: theme.color,
          coreColor: theme.coreColor,
          glowColor: theme.glowColor,

          isExcited: false,
          blinkTimer: 0,
          excitedGlow: 0,
          trail: [],
        });
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      initParticles();

      if (prefersReducedMotion) {
        drawFrame();
      }
    };

    // Passive window-level pointer tracking
    const handlePointerMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerActive = true;
      isTouchInteraction = e.pointerType === 'touch';

      if (pointerInactivityTimer !== null) {
        window.clearTimeout(pointerInactivityTimer);
      }
      pointerInactivityTimer = window.setTimeout(() => {
        pointerActive = false;
        pointerX = -2000;
        pointerY = -2000;
      }, 1800);
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerActive = true;
      isTouchInteraction = e.pointerType === 'touch';
    };

    const handlePointerLeave = () => {
      pointerActive = false;
      pointerX = -2000;
      pointerY = -2000;
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      const interactionRadius = isTouchInteraction ? 75 : 55;
      const interactionRadiusSq = interactionRadius * interactionRadius;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          // ── 1. AUTOMATIC CONTINUOUS 360° MOVEMENT ────────────────────────
          if (p.curveSpeed !== 0) {
            p.angle += p.curveSpeed;
          }

          // Lateral wave drift
          p.driftPhase += p.driftFrequency;
          const lateralWiggle = Math.sin(p.driftPhase) * 0.22;

          const targetVx = Math.cos(p.angle) * p.baseSpeed - Math.sin(p.angle) * lateralWiggle;
          const targetVy = Math.sin(p.angle) * p.baseSpeed + Math.cos(p.angle) * lateralWiggle;

          // Smooth velocity blending
          if (!p.isExcited) {
            p.vx += (targetVx - p.vx) * 0.05;
            p.vy += (targetVy - p.vy) * 0.05;
          } else {
            p.vx += (targetVx - p.vx) * 0.04;
            p.vy += (targetVy - p.vy) * 0.04;
          }

          p.x += p.vx;
          p.y += p.vy;

          // Continuous boundary wrap
          const margin = 28;
          if (p.x < -margin) p.x = width + margin;
          else if (p.x > width + margin) p.x = -margin;
          if (p.y < -margin) p.y = height + margin;
          else if (p.y > height + margin) p.y = -margin;

          // ── 2. INTERACTION: HOVER / TOUCH PROXIMITY ──────────────────────
          if (pointerActive) {
            const dx = p.x - pointerX;
            const dy = p.y - pointerY;
            const distSq = dx * dx + dy * dy;

            if (distSq < interactionRadiusSq) {
              const dist = Math.sqrt(distSq) || 1;
              const force = (1 - dist / interactionRadius);

              p.isExcited = true;
              p.blinkTimer = 34; // ~0.57s of bright pulse
              p.excitedGlow = Math.min(1.0, p.excitedGlow + 0.5);
              p.targetRadius = p.baseRadius * 2.2;

              // Smooth repulsive push
              const pushX = (dx / dist) * (force * 2.8);
              const pushY = (dy / dist) * (force * 2.8);
              p.vx += pushX;
              p.vy += pushY;
              p.angle = Math.atan2(p.vy, p.vx) + (Math.random() - 0.5) * 0.35;
            }
          }

          // ── 3. BLINK & RECOVERY STATE ────────────────────────────────────
          if (p.isExcited) {
            if (p.trail.length > 3) {
              p.trail.shift();
            }
            p.trail.push({
              x: p.x,
              y: p.y,
              alpha: p.excitedGlow * 0.45,
              radius: p.currentRadius * 0.7,
            });

            if (p.blinkTimer > 0) {
              p.blinkTimer--;
              // Rapid bright pulsation factor
              const pulse = Math.abs(Math.sin((34 - p.blinkTimer) * 0.6));
              p.alpha = Math.min(1.0, 0.75 + pulse * 0.25);
              p.currentRadius += (p.targetRadius - p.currentRadius) * 0.25;
            } else {
              // Return smoothly to normal appearance
              p.targetRadius = p.baseRadius;
              p.currentRadius += (p.targetRadius - p.currentRadius) * 0.08;
              p.excitedGlow *= 0.92;

              if (p.excitedGlow < 0.03) {
                p.isExcited = false;
                p.excitedGlow = 0;
                p.trail = [];
              }
            }
          } else {
            // Subtle ambient twinkle
            p.twinklePhase += p.twinkleSpeed;
            p.alpha = p.baseAlpha + Math.sin(p.twinklePhase) * 0.16;
            if (p.alpha < 0.45) p.alpha = 0.45;
            if (p.alpha > 0.98) p.alpha = 0.98;
            p.currentRadius += (p.baseRadius - p.currentRadius) * 0.1;
          }
        }

        // ── 4. RENDER TRAILS ─────────────────────────────────────────────
        if (p.trail.length > 0) {
          for (let t = 0; t < p.trail.length; t++) {
            const tp = p.trail[t];
            const trailAlpha = ((t + 1) / p.trail.length) * tp.alpha;
            ctx.save();
            ctx.globalAlpha = trailAlpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, tp.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // ── 5. RENDER PARTICLE WITH SOFT GLOW AURA ───────────────────────
        ctx.save();
        ctx.globalAlpha = p.alpha;

        // Every particle features a soft outer glow
        const glowMult = p.isExcited ? 4.2 : 2.8;
        const glowRadius = p.currentRadius * glowMult;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);

        if (p.isExcited) {
          // Intense radiant corona
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.3, p.coreColor);
          grad.addColorStop(0.7, p.glowColor);
          grad.addColorStop(1, 'transparent');
        } else {
          // Soft ambient luminous corona
          grad.addColorStop(0, p.coreColor);
          grad.addColorStop(0.4, p.glowColor);
          grad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Distinct starlight center core
        ctx.fillStyle = p.isExcited ? '#ffffff' : p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    };

    const render = () => {
      if (!isDocumentVisible) return;
      drawFrame();
      animationFrameId = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
      if (isDocumentVisible && !prefersReducedMotion) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(render);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!prefersReducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);
      if (pointerInactivityTimer !== null) {
        window.clearTimeout(pointerInactivityTimer);
      }
    };
  }, [density]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0 bg-[#070B18]"
    >
      {/* 1. Deep Space Cosmic Nebular Ambient Gradients */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.07) 0%, rgba(167, 139, 250, 0) 70%)',
          filter: 'blur(70px)',
        }}
      />
      <div
        className="absolute top-[25%] right-[-8%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 184, 217, 0.065) 0%, rgba(0, 229, 176, 0.035) 45%, rgba(0, 184, 217, 0) 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-[-15%] left-[20%] w-[50vw] h-[50vw] max-w-[750px] max-h-[750px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 113, 62, 0.045) 0%, rgba(255, 113, 62, 0) 65%)',
          filter: 'blur(75px)',
        }}
      />

      {/* 2. Celestial Orbital Rings / Coordinate Geometry */}
      {showOrbitalRings && (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.09] stroke-current text-cyan pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="ringFade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00B8D9" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#A78BFA" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00B8D9" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx="80%"
            cy="20%"
            rx="460"
            ry="240"
            fill="none"
            stroke="url(#ringFade)"
            strokeWidth="1.2"
            strokeDasharray="6 12"
            transform="rotate(-18 800 200)"
          />
          <ellipse
            cx="20%"
            cy="85%"
            rx="540"
            ry="300"
            fill="none"
            stroke="url(#ringFade)"
            strokeWidth="1"
            strokeDasharray="4 16"
            transform="rotate(12 250 850)"
          />
          <circle
            cx="50%"
            cy="50%"
            r="680"
            fill="none"
            stroke="#1F2E4A"
            strokeWidth="0.8"
            strokeDasharray="2 10"
          />
        </svg>
      )}

      {/* 3. High-Performance Canvas for Living, Visible Floating Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      />
    </div>
  );
}
