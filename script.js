// ===================== Fondo animado: mapa mundial conectado =====================
// Continentes formados por puntos de luz unidos en red, con arcos de flujo
// espacial que salen de Puno hacia ciudades del mundo.
(function () {
  const canvas = document.getElementById('network');
  const ctx = canvas.getContext('2d');
  const linksLabel = document.getElementById('hudLinks');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json';

  const CITIES = {
    puno: [-70.02, -15.84, 'PUNO'], lima: [-77.04, -12.05], bogota: [-74.07, 4.71],
    mexico: [-99.13, 19.43], ny: [-74.0, 40.71], la: [-118.24, 34.05], toronto: [-79.38, 43.65],
    saopaulo: [-46.63, -23.55], baires: [-58.38, -34.6], santiago: [-70.65, -33.45],
    madrid: [-3.7, 40.42], london: [-0.13, 51.51], paris: [2.35, 48.86], berlin: [13.4, 52.52],
    lagos: [3.38, 6.52], cairo: [31.24, 30.04], joburg: [28.05, -26.2], moscow: [37.62, 55.76],
    dubai: [55.27, 25.2], mumbai: [72.88, 19.08], beijing: [116.4, 39.9], tokyo: [139.69, 35.69],
    singapore: [103.82, 1.35], sydney: [151.21, -33.87],
  };
  const ROUTES = [
    ['puno', 'lima'], ['puno', 'bogota'], ['puno', 'mexico'], ['puno', 'ny'], ['puno', 'saopaulo'],
    ['puno', 'baires'], ['puno', 'madrid'], ['puno', 'london'], ['puno', 'la'], ['puno', 'santiago'],
    ['puno', 'lagos'], ['puno', 'paris'], ['london', 'ny'], ['london', 'moscow'], ['london', 'dubai'],
    ['london', 'lagos'], ['paris', 'cairo'], ['berlin', 'beijing'], ['madrid', 'saopaulo'],
    ['ny', 'toronto'], ['dubai', 'mumbai'], ['mumbai', 'singapore'], ['beijing', 'tokyo'],
    ['singapore', 'sydney'], ['cairo', 'joburg'], ['moscow', 'beijing'], ['la', 'tokyo'],
  ];

  let w, h, k, cx, cy, land = null, layer, nodes = [], arcs = [], sparks = [], t = 0;

  function project(lon, lat) {
    return [cx + lon * k, cy - lat * k];
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // escala tipo "cover", centrado para ver América, Europa y África
    k = Math.max(w / 330, h / 140);
    cx = w * 0.5 + 15 * k;
    cy = h * 0.52 + 12 * k;
    build(dpr);
  }

  function landMask() {
    const m = document.createElement('canvas');
    m.width = w; m.height = h;
    const mc = m.getContext('2d');
    mc.fillStyle = '#fff';
    for (const shift of [-360, 0, 360]) {
      for (const f of land.features) {
        const g = f.geometry;
        const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
        for (const poly of polys) {
          mc.beginPath();
          for (const ring of poly) {
            ring.forEach(([lon, lat], i) => {
              const [x, y] = project(lon + shift, lat);
              i ? mc.lineTo(x, y) : mc.moveTo(x, y);
            });
            mc.closePath();
          }
          mc.fill('evenodd');
        }
      }
    }
    return mc.getImageData(0, 0, w, h).data;
  }

  function build(dpr) {
    layer = document.createElement('canvas');
    layer.width = w * dpr; layer.height = h * dpr;
    const lc = layer.getContext('2d');
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = [];
    sparks = [];

    if (land) {
      const data = landMask();
      const step = w < 700 ? 7 : 9;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const jx = x + (Math.random() - 0.5) * step * 0.8;
          const jy = y + (Math.random() - 0.5) * step * 0.8;
          const px = Math.round(jx), py = Math.round(jy);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          if (data[(py * w + px) * 4 + 3] > 0) {
            nodes.push({ x: jx, y: jy, fade: 0.35 + 0.65 * Math.min(1, jx / (w * 0.75)) });
          }
        }
      }
      // malla tipo constelación: une cada punto con sus vecinos cercanos
      const cell = 22, hash = new Map();
      nodes.forEach((n, i) => {
        const key = Math.floor(n.x / cell) + ',' + Math.floor(n.y / cell);
        if (!hash.has(key)) hash.set(key, []);
        hash.get(key).push(i);
      });
      lc.lineWidth = 0.6;
      nodes.forEach((n, i) => {
        if (Math.random() > 0.55) return;
        const gx = Math.floor(n.x / cell), gy = Math.floor(n.y / cell);
        let links = 0;
        for (let dx = -1; dx <= 1 && links < 2; dx++) {
          for (let dy = -1; dy <= 1 && links < 2; dy++) {
            for (const j of hash.get((gx + dx) + ',' + (gy + dy)) || []) {
              if (j <= i) continue;
              const m = nodes[j], d = Math.hypot(n.x - m.x, n.y - m.y);
              if (d < cell && Math.random() < 0.35) {
                lc.strokeStyle = `rgba(120, 210, 255, ${0.22 * n.fade})`;
                lc.beginPath(); lc.moveTo(n.x, n.y); lc.lineTo(m.x, m.y); lc.stroke();
                if (++links >= 2) break;
              }
            }
          }
        }
      });
      for (const n of nodes) {
        lc.fillStyle = `rgba(150, 225, 255, ${(0.35 + Math.random() * 0.4) * n.fade})`;
        lc.fillRect(n.x - 0.8, n.y - 0.8, 1.6, 1.6);
      }
    }

    // arcos de flujo (trazo base tenue)
    arcs = ROUTES.map(([a, b]) => {
      const [x0, y0] = project(CITIES[a][0], CITIES[a][1]);
      const [x1, y1] = project(CITIES[b][0], CITIES[b][1]);
      const d = Math.hypot(x1 - x0, y1 - y0);
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - d * 0.32;
      return { x0, y0, x1, y1, mx, my, s: -Math.random() * 1.5, speed: 0.004 + Math.random() * 0.004 };
    });
    lc.lineWidth = 1;
    lc.strokeStyle = 'rgba(200, 240, 255, .16)';
    for (const a of arcs) {
      lc.beginPath(); lc.moveTo(a.x0, a.y0); lc.quadraticCurveTo(a.mx, a.my, a.x1, a.y1); lc.stroke();
    }
    if (linksLabel) linksLabel.textContent = arcs.length;
  }

  function bez(a, s) {
    const u = 1 - s;
    return [u * u * a.x0 + 2 * u * s * a.mx + s * s * a.x1, u * u * a.y0 + 2 * u * s * a.my + s * s * a.y1];
  }

  // luz que viaja por cada arco, con estela
  function drawArcs() {
    ctx.lineCap = 'round';
    for (const a of arcs) {
      a.s += a.speed;
      if (a.s > 1.35) a.s = -Math.random() * 0.8;
      const head = Math.min(a.s, 1), tail = Math.max(0, a.s - 0.28);
      if (head <= 0 || tail >= 1) continue;
      const N = 18;
      let prev = bez(a, tail);
      for (let i = 1; i <= N; i++) {
        const p = bez(a, tail + (head - tail) * (i / N));
        ctx.strokeStyle = `rgba(210, 245, 255, ${0.9 * (i / N)})`;
        ctx.lineWidth = 0.6 + 1.8 * (i / N);
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        prev = p;
      }
      if (a.s <= 1) {
        ctx.shadowColor = '#bff4ff'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(prev[0], prev[1], 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  function drawCities() {
    for (const [key, [lon, lat, label]] of Object.entries(CITIES)) {
      const [x, y] = project(lon, lat);
      const main = key === 'puno';
      const pulse = (t * 0.012 + Math.abs(lon) * 0.01) % 1;
      ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - pulse) * (main ? 0.9 : 0.5)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, 3 + pulse * (main ? 26 : 12), 0, Math.PI * 2); ctx.stroke();
      ctx.shadowColor = '#7df9ff'; ctx.shadowBlur = main ? 22 : 12;
      ctx.fillStyle = main ? '#ffffff' : 'rgba(200, 245, 255, .95)';
      ctx.beginPath(); ctx.arc(x, y, main ? 4.5 : 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (label) {
        ctx.font = '700 11px Consolas, monospace';
        ctx.fillStyle = 'rgba(190, 245, 255, .95)';
        ctx.fillText(label, x + 10, y + 4);
      }
    }
  }

  // destellos aleatorios sobre los continentes
  function drawSparks() {
    if (nodes.length && sparks.length < 70) {
      for (let i = 0; i < 3; i++) sparks.push({ n: nodes[Math.floor(Math.random() * nodes.length)], life: 0 });
    }
    ctx.shadowColor = '#7df9ff'; ctx.shadowBlur = 8;
    for (const s of sparks) {
      s.life += 0.02;
      ctx.fillStyle = `rgba(200, 245, 255, ${Math.sin(s.life * Math.PI) * s.n.fade})`;
      ctx.beginPath(); ctx.arc(s.n.x, s.n.y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    sparks = sparks.filter(s => s.life < 1);
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(layer, 0, 0, w, h);
    drawSparks();
    drawArcs();
    drawCities();
  }

  function step() {
    t++;
    frame();
    requestAnimationFrame(step);
  }

  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(resize, 150); });
  resize();
  if (reduce) frame(); else step();

  fetch(LAND_URL)
    .then(r => r.json())
    .then(topo => {
      land = topojson.feature(topo, topo.objects.land);
      build(window.devicePixelRatio || 1);
      if (reduce) frame();
    })
    .catch(() => { /* sin internet: se muestran solo las ciudades y los arcos */ });
})();

// ===================== Navbar =====================
const nav = document.getElementById('mainNav');
const links = document.querySelectorAll('.nav-link');
const sections = [...links].map(l => document.querySelector(l.getAttribute('href')));

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
  let current = sections[0];
  for (const s of sections) if (s.getBoundingClientRect().top < 120) current = s;
  links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + current.id));
});

// Cierra el menú móvil al elegir una opción
links.forEach(l => l.addEventListener('click', () => {
  const menu = document.getElementById('navMenu');
  if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
}));

// ===================== Aparición al hacer scroll + contadores =====================
document.querySelectorAll('.stat-card, .topic-card, .portfolio-card, .contact-box').forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    const num = entry.target.querySelector('[data-count]');
    if (num) {
      const target = +num.dataset.count;
      let n = 0;
      const timer = setInterval(() => {
        num.textContent = ++n;
        if (n >= target) clearInterval(timer);
      }, 120);
    }
    observer.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===================== Filtros del portafolio =====================
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.card-item').forEach(card => {
      const types = card.dataset.type.split(' ');
      card.classList.toggle('hide', f !== 'all' && !types.includes(f));
    });
  });
});

// ===================== Visores (código e imagen) =====================
function openViewer(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeViewers() {
  document.querySelectorAll('.viewer').forEach(v => v.classList.remove('open'));
  document.body.style.overflow = '';
}

const codeBlock = document.getElementById('codeBlock');
document.querySelectorAll('[data-code]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const path = btn.dataset.code;
    document.getElementById('codeTitle').innerHTML = `<i class="bi bi-filetype-py"></i> ${path.split('/').pop()}`;
    codeBlock.textContent = 'Cargando…';
    codeBlock.removeAttribute('data-highlighted');
    openViewer('codeViewer');
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(res.status);
      codeBlock.textContent = await res.text();
      if (window.hljs) hljs.highlightElement(codeBlock);
    } catch (e) {
      codeBlock.textContent = 'No se pudo cargar el archivo. Si abriste la página con doble clic, súbela a GitHub Pages o usa un servidor local.';
    }
  });
});

document.getElementById('copyCode').addEventListener('click', e => {
  navigator.clipboard.writeText(codeBlock.textContent);
  const icon = e.currentTarget.querySelector('i');
  icon.className = 'bi bi-check2';
  setTimeout(() => (icon.className = 'bi bi-clipboard'), 1500);
});

document.querySelectorAll('[data-img]').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('imgFull').src = el.dataset.img;
    document.getElementById('imgFull').alt = el.dataset.caption;
    document.getElementById('imgCaption').textContent = el.dataset.caption;
    openViewer('imgViewer');
  });
});

document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeViewers));
document.querySelectorAll('.viewer').forEach(v => v.addEventListener('click', e => { if (e.target === v) closeViewers(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeViewers(); });

document.getElementById('year').textContent = new Date().getFullYear();
