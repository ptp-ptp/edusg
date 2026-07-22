// Tiny canvas confetti engine — no dependencies.
let canvas = null;
let ctx = null;
let particles = [];
let rafId = null;

const COLORS = ["#11a6a6", "#ffc247", "#ff6147", "#43b35a", "#4a9df8", "#b06df5"];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!canvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function spawn({ x, y, count, spread, power, shapes }) {
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const velocity = power * (0.6 + Math.random() * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 5 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
      gravity: 0.35,
      drag: 0.985,
      life: 1,
      decay: 0.012 + Math.random() * 0.01,
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    });
  }
}

function tick() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles = particles.filter((p) => p.life > 0);

  for (const p of particles) {
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.spin;
    p.life -= p.decay;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "star") {
      drawStar(ctx, p.size);
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  }

  if (particles.length > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function drawStar(context, size) {
  const outer = size / 2;
  const inner = outer * 0.45;
  context.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fill();
}

function fire(options = {}) {
  if (prefersReducedMotion()) return;
  ensureCanvas();
  spawn({
    x: options.x ?? window.innerWidth / 2,
    y: options.y ?? window.innerHeight * 0.6,
    count: options.count ?? 60,
    spread: options.spread ?? 1.6,
    power: options.power ?? 14,
    shapes: options.shapes ?? ["rect", "circle"]
  });
  if (!rafId) rafId = requestAnimationFrame(tick);
}

export function confettiBurst(origin) {
  fire({ x: origin?.x, y: origin?.y, count: 50, power: 12 });
}

export function confettiCelebration() {
  fire({ x: window.innerWidth * 0.25, y: window.innerHeight * 0.7, count: 70, power: 16, spread: 1.2 });
  setTimeout(() => fire({ x: window.innerWidth * 0.75, y: window.innerHeight * 0.7, count: 70, power: 16, spread: 1.2 }), 150);
  setTimeout(() => fire({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.6, count: 80, power: 18, shapes: ["star", "rect", "circle"] }), 320);
}

export function starBurst(origin) {
  fire({ x: origin?.x, y: origin?.y, count: 24, power: 9, spread: 2.2, shapes: ["star"] });
}
