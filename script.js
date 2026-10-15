// ===================== Fondo animado de estadística espacial =====================
// Malla hexagonal (datos de área) con hotspots/coldspots que se mueven,
// eventos puntuales con ondas (patrón de puntos), conexiones entre vecinos
// (matriz de pesos) y el I de Moran calculado en vivo sobre la malla.
(function () {
  const canvas = document.getElementById('network');
  const ctx = canvas.getContext('2d');
  const moranLabel = document.getElementById('hudMoran');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = 24;                       // radio del hexágono
  const HW = Math.sqrt(3) * R;        // ancho del hexágono
  const VH = 1.5 * R;                 // separación vertical
  let w, h, cells, grid, rows, cols, events = [], t = 0;

  // Focos que se desplazan: valor positivo = hotspot, negativo = coldspot
  const spots = [
    { s: 1, ax: 0.78, ay: 0.38, rx: 0.10, ry: 0.12, sp: 0.0021, sig: 150 },
    { s: 1, ax: 0.62, ay: 0.72, rx: 0.14, ry: 0.08, sp: 0.0016, sig: 120 },
    { s: 1, ax: 0.90, ay: 0.78, rx: 0.06, ry: 0.10, sp: 0.0027, sig: 100 },
    { s: -1, ax: 0.50, ay: 0.30, rx: 0.12, ry: 0.10, sp: 0.0018, sig: 140 },
    { s: -1, ax: 0.30, ay: 0.80, rx: 0.15, ry: 0.06, sp: 0.0013, sig: 160 },
  ];
  function spotPos(p, i) {
    return {
      x: w * (p.ax + p.rx * Math.sin(t * p.sp + i * 1.7)),
      y: h * (p.ay + p.ry * Math.cos(t * p.sp * 1.3 + i)),
    };
  }

  function hexPath(cx, cy) {
    const path = new Path2D();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 180 * (60 * k - 30);
      const x = cx + (R - 1.5) * Math.cos(a), y = cy + (R - 1.5) * Math.sin(a);
      k ? path.lineTo(x, y) : path.moveTo(x, y);
    }
    path.closePath();
    return path;
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.offsetWidth;
    h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rows = Math.ceil(h / VH) + 1;
    cols = Math.ceil(w / HW) + 1;
    cells = [];
    grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const x = c * HW + (r % 2 ? HW / 2 : 0), y = r * VH;
        const cell = { x, y, r, c, v: 0, path: hexPath(x, y), fade: 0.25 + 0.75 * Math.min(1, x / (w * 0.9)) };
        grid[r][c] = cell;
        cells.push(cell);
      }
    }
    // vecinos tipo Queen en malla hexagonal (offset por filas)
    const even = [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
    const odd = [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
    for (const cell of cells) {
      cell.nb = (cell.r % 2 ? odd : even)
        .map(([dr, dc]) => grid[cell.r + dr] && grid[cell.r + dr][cell.c + dc])
        .filter(Boolean);
    }
  }

  function updateField() {
    const pos = spots.map(spotPos);
    for (const cell of cells) {
      let v = 0;
      spots.forEach((p, i) => {
        const dx = cell.x - pos[i].x, dy = cell.y - pos[i].y;
        v += p.s * Math.exp(-(dx * dx + dy * dy) / (2 * p.sig * p.sig));
      });
      cell.v = v + 0.08 * Math.sin(cell.x * 0.05 + cell.y * 0.03 + t * 0.02);
    }
    return pos;
  }

  // I de Moran global con pesos estandarizados por fila
  function moranI() {
    const n = cells.length;
    const mean = cells.reduce((s, c) => s + c.v, 0) / n;
    let num = 0, den = 0;
    for (const c of cells) {
      const zi = c.v - mean;
      den += zi * zi;
      let lag = 0;
      for (const nb of c.nb) lag += nb.v - mean;
      num += zi * (lag / c.nb.length);
    }
    return num / den;
  }

  function drawHexes() {
    ctx.lineWidth = 1;
    for (const c of cells) {
      const f = c.fade;
      if (c.v > 0.3) {                     // High-High (hotspot)
        const a = Math.min(1, (c.v - 0.3) / 0.7);
        ctx.fillStyle = `rgba(0, 212, 255, ${(0.08 + 0.42 * a) * f})`;
        ctx.fill(c.path);
        ctx.strokeStyle = `rgba(125, 249, 255, ${(0.25 + 0.6 * a) * f})`;
      } else if (c.v < -0.3) {             // Low-Low (coldspot)
        const a = Math.min(1, (-c.v - 0.3) / 0.7);
        ctx.fillStyle = `rgba(70, 60, 255, ${(0.06 + 0.32 * a) * f})`;
        ctx.fill(c.path);
        ctx.strokeStyle = `rgba(140, 120, 255, ${(0.2 + 0.45 * a) * f})`;
      } else {                             // no significativo
        ctx.strokeStyle = `rgba(0, 212, 255, ${0.07 * f})`;
      }
      ctx.stroke(c.path);
    }
  }

  // Eventos puntuales: aparecen con más frecuencia cerca de los hotspots
  function spawnEvent(pos) {
    const hot = spots.map((p, i) => i).filter(i => spots[i].s > 0);
    const i = hot[Math.floor(Math.random() * hot.length)];
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * spots[i].sig * 0.9;
    events.push({ x: pos[i].x + g(), y: pos[i].y + g(), life: 0, max: 220 + Math.random() * 120 });
  }

  function drawEvents() {
    // matriz de pesos: conecta eventos vecinos
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i], b = events[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) {
          const al = (1 - d / 110) * 0.5 * Math.min(a.alpha, b.alpha);
          ctx.strokeStyle = `rgba(160, 240, 255, ${al})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.shadowColor = '#7df9ff';
    for (const e of events) {
      e.life++;
      const p = e.life / e.max;
      e.alpha = p < 0.1 ? p / 0.1 : 1 - Math.max(0, (p - 0.6) / 0.4);
      // onda expansiva (ping)
      const ring = (e.life % 90) / 90;
      ctx.strokeStyle = `rgba(0, 212, 255, ${(1 - ring) * 0.6 * e.alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3 + ring * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(220, 252, 255, ${e.alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    events = events.filter(e => e.life < e.max);
  }

  // Marcadores en los centros de los hotspots
  function drawSpotMarkers(pos) {
    spots.forEach((p, i) => {
      if (p.s < 0) return;
      const { x, y } = pos[i];
      const s = 14;
      ctx.strokeStyle = 'rgba(125, 249, 255, .7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - s, y); ctx.lineTo(x - 5, y);
      ctx.moveTo(x + 5, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y - 5);
      ctx.moveTo(x, y + 5); ctx.lineTo(x, y + s);
      ctx.stroke();
      ctx.font = '10px Consolas, monospace';
      ctx.fillStyle = 'rgba(125, 249, 255, .8)';
      ctx.fillText('HH', x + 8, y - 8);
      ctx.lineWidth = 1;
    });
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    const pos = updateField();
    drawHexes();
    drawEvents();
    drawSpotMarkers(pos);
    if (t % 30 === 0 && moranLabel) moranLabel.textContent = moranI().toFixed(3);
    if (t % 9 === 0 && events.length < 45) spawnEvent(pos);
  }

  function step() {
    t++;
    frame();
    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  resize();
  if (reduce) frame(); else step();
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
