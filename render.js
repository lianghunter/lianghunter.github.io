// A tiny CPU ray tracer for the hero image.
// Three spheres (one mirrored) on a checkered floor, with shadows,
// reflections and 4x supersampling. It renders in tiles ("buckets"),
// center-out, the way offline renderers do, then reports its stats.
(() => {
  const canvas = document.getElementById("hero-render");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const stats = document.getElementById("render-stats");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- scene (colors are linear; output uses gamma 2) ----------
  const spheres = [
    { c: [-0.95, 0.72, -0.35], r: 0.72, col: [0.02, 0.08, 0.7], mirror: 0 },     // cobalt
    { c: [0.82, 0.56, 0.1],    r: 0.56, col: [0.85, 0.88, 0.92], mirror: 0.82 }, // mirror
    { c: [0.08, 0.27, 1.05],   r: 0.27, col: [0.9, 0.44, 0.05], mirror: 0 },     // amber
  ];
  const floorA = [0.75, 0.79, 0.83];
  const floorB = [0.58, 0.63, 0.7];
  const skyLow = [0.88, 0.91, 0.93];
  const skyHigh = [0.42, 0.53, 0.78];
  const L = normalize([-0.55, 1.0, 0.75]);

  const camPos = [0.15, 1.2, 4.6];
  const camTarget = [0, 0.5, 0];
  const fovY = (33 * Math.PI) / 180;

  let rays = 0;
  let hitIndex = -1;
  let hitT = 0;

  function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  function intersect(ox, oy, oz, dx, dy, dz) {
    hitIndex = -1;
    hitT = 1e9;
    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      const lx = ox - s.c[0], ly = oy - s.c[1], lz = oz - s.c[2];
      const b = lx * dx + ly * dy + lz * dz;
      const disc = b * b - (lx * lx + ly * ly + lz * lz - s.r * s.r);
      if (disc > 0) {
        const t = -b - Math.sqrt(disc);
        if (t > 1e-4 && t < hitT) { hitT = t; hitIndex = i; }
      }
    }
    if (dy < -1e-6) {
      const t = -oy / dy;
      if (t > 1e-4 && t < hitT) { hitT = t; hitIndex = -2; }
    }
  }

  function occluded(px, py, pz) {
    rays++;
    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i];
      const lx = px - s.c[0], ly = py - s.c[1], lz = pz - s.c[2];
      const b = lx * L[0] + ly * L[1] + lz * L[2];
      const c = lx * lx + ly * ly + lz * lz - s.r * s.r;
      const disc = b * b - c;
      if (disc > 0 && -b - Math.sqrt(disc) > 1e-4) return true;
    }
    return false;
  }

  function sky(dy, out) {
    const t = Math.min(1, Math.max(0, dy * 1.8 + 0.15));
    out[0] = skyLow[0] + (skyHigh[0] - skyLow[0]) * t;
    out[1] = skyLow[1] + (skyHigh[1] - skyLow[1]) * t;
    out[2] = skyLow[2] + (skyHigh[2] - skyLow[2]) * t;
  }

  // Writes a linear RGB color into out
  function trace(ox, oy, oz, dx, dy, dz, depth, out) {
    rays++;
    intersect(ox, oy, oz, dx, dy, dz);
    if (hitIndex === -1) { sky(dy, out); return; }

    const t = hitT, idx = hitIndex;
    const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
    let nx, ny, nz, base, mirror = 0, ao = 1;

    if (idx === -2) {
      nx = 0; ny = 1; nz = 0;
      base = ((Math.floor(px * 1.6) + Math.floor(pz * 1.6)) & 1) ? floorA : floorB;
      // soft contact shadows under each sphere
      for (const s of spheres) {
        const vx = s.c[0] - px, vy = s.c[1] - py, vz = s.c[2] - pz;
        const d2 = vx * vx + vy * vy + vz * vz;
        ao -= (vy / Math.sqrt(d2)) * (s.r * s.r) / d2;
      }
      ao = Math.max(0.15, ao);
    } else {
      const s = spheres[idx];
      nx = (px - s.c[0]) / s.r; ny = (py - s.c[1]) / s.r; nz = (pz - s.c[2]) / s.r;
      base = s.col;
      mirror = s.mirror;
      ao = 0.75 + 0.25 * ny; // a little darker underneath
    }

    const sx = px + nx * 1e-3, sy = py + ny * 1e-3, sz = pz + nz * 1e-3;
    const ndl = nx * L[0] + ny * L[1] + nz * L[2];
    let light = 0;
    if (ndl > 0 && !occluded(sx, sy, sz)) light = ndl;

    const ambient = (0.3 + 0.14 * ny) * ao;
    const diffuse = ambient + light * 0.9;
    let r = base[0] * diffuse, g = base[1] * diffuse, b = base[2] * diffuse;

    if (idx !== -2 && light > 0) {
      // Blinn-Phong highlight
      let hx = L[0] - dx, hy = L[1] - dy, hz = L[2] - dz;
      const hl = Math.hypot(hx, hy, hz);
      const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 80) * 0.7;
      r += spec; g += spec; b += spec;
    }

    if (mirror > 0 && depth < 3) {
      const dn = dx * nx + dy * ny + dz * nz;
      const rx = dx - 2 * dn * nx, ry = dy - 2 * dn * ny, rz = dz - 2 * dn * nz;
      const rc = [0, 0, 0];
      trace(sx, sy, sz, rx, ry, rz, depth + 1, rc);
      r = r * (1 - mirror) + rc[0] * base[0] * mirror;
      g = g * (1 - mirror) + rc[1] * base[1] * mirror;
      b = b * (1 - mirror) + rc[2] * base[2] * mirror;
    }

    if (idx === -2) {
      // fade the floor into the horizon
      const fog = 1 - Math.exp(-t * 0.07);
      sky(0, out);
      r += (out[0] - r) * fog; g += (out[1] - g) * fog; b += (out[2] - b) * fog;
    }

    out[0] = r; out[1] = g; out[2] = b;
  }

  // ---------- camera ----------
  let W = 0, H = 0, fwd, right, up, tanY, aspect;

  function setupCamera() {
    fwd = normalize([camTarget[0] - camPos[0], camTarget[1] - camPos[1], camTarget[2] - camPos[2]]);
    // right = fwd x worldUp, up = right x fwd
    const wu = [0, 1, 0];
    right = normalize([
      fwd[1] * wu[2] - fwd[2] * wu[1],
      fwd[2] * wu[0] - fwd[0] * wu[2],
      fwd[0] * wu[1] - fwd[1] * wu[0],
    ]);
    up = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0],
    ];
    tanY = Math.tan(fovY / 2);
    aspect = W / H;
  }

  const col = [0, 0, 0];
  function samplePixel(fx, fy) {
    const u = (2 * fx / W - 1) * tanY * aspect;
    const v = (1 - 2 * fy / H) * tanY;
    let dx = fwd[0] + right[0] * u + up[0] * v;
    let dy = fwd[1] + right[1] * u + up[1] * v;
    let dz = fwd[2] + right[2] * u + up[2] * v;
    const l = Math.hypot(dx, dy, dz);
    trace(camPos[0], camPos[1], camPos[2], dx / l, dy / l, dz / l, 0, col);
  }

  const toByte = (c) => Math.round(Math.sqrt(Math.min(1, Math.max(0, c))) * 255);
  const SS = [[0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]]; // rotated grid

  // ---------- progressive bucket render ----------
  let job = 0;

  function start() {
    const myJob = ++job;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(rect.width * dpr);
    H = Math.round(rect.height * dpr);
    const maxPixels = 900 * 680;
    if (W * H > maxPixels) {
      const k = Math.sqrt(maxPixels / (W * H));
      W = Math.round(W * k); H = Math.round(H * k);
    }
    canvas.width = W;
    canvas.height = H;
    setupCamera();
    rays = 0;
    let busy = 0;

    // Reduced motion: render off-screen and show the finished image once
    const target = reduceMotion ? document.createElement("canvas").getContext("2d") : ctx;
    if (reduceMotion) { target.canvas.width = W; target.canvas.height = H; }

    // 1. quick low-res preview pass
    const t0 = performance.now();
    const block = Math.max(8, Math.round(W / 60));
    for (let y = 0; y < H; y += block) {
      for (let x = 0; x < W; x += block) {
        samplePixel(x + block / 2, y + block / 2);
        target.fillStyle = `rgb(${toByte(col[0])},${toByte(col[1])},${toByte(col[2])})`;
        target.fillRect(x, y, block, block);
      }
    }
    busy += performance.now() - t0;

    // 2. full-quality buckets, nearest the center first
    const T = Math.max(24, Math.round(W / 18));
    const tiles = [];
    for (let y = 0; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const w = Math.min(T, W - x), h = Math.min(T, H - y);
        const d = Math.hypot(x + w / 2 - W / 2, (y + h / 2 - H / 2) * 1.3);
        tiles.push({ x, y, w, h, d });
      }
    }
    tiles.sort((a, b) => a.d - b.d);

    let next = 0;
    const bracketW = Math.max(2, Math.round(dpr * 1.5));

    function drawBracket(t) {
      const k = Math.min(t.w, t.h) * 0.28;
      ctx.strokeStyle = "#e89a2c";
      ctx.lineWidth = bracketW;
      const a = bracketW / 2;
      const x0 = t.x + a, y0 = t.y + a, x1 = t.x + t.w - a, y1 = t.y + t.h - a;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + k); ctx.lineTo(x0, y0); ctx.lineTo(x0 + k, y0);
      ctx.moveTo(x1 - k, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + k);
      ctx.moveTo(x1, y1 - k); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k, y1);
      ctx.moveTo(x0 + k, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - k);
      ctx.stroke();
    }

    function renderTile(t) {
      const img = target.createImageData(t.w, t.h);
      const data = img.data;
      let i = 0;
      for (let y = 0; y < t.h; y++) {
        for (let x = 0; x < t.w; x++) {
          let r = 0, g = 0, b = 0;
          for (let s = 0; s < 4; s++) {
            samplePixel(t.x + x + SS[s][0], t.y + y + SS[s][1]);
            r += col[0]; g += col[1]; b += col[2];
          }
          data[i++] = toByte(r / 4);
          data[i++] = toByte(g / 4);
          data[i++] = toByte(b / 4);
          data[i++] = 255;
        }
      }
      target.putImageData(img, t.x, t.y);
    }

    function frame() {
      if (myJob !== job) return; // a resize restarted the render
      const f0 = performance.now();
      let done = 0;
      // Small per-frame budget so the buckets are visible filling in (~1 s on a laptop)
      const budget = reduceMotion ? 12 : 4;
      while (next < tiles.length && performance.now() - f0 < budget) {
        renderTile(tiles[next++]);
        done++;
      }
      busy += performance.now() - f0;

      if (next < tiles.length) {
        if (!reduceMotion) {
          for (let k = 0; k < Math.max(2, done) && next + k < tiles.length; k++) drawBracket(tiles[next + k]);
        }
        requestAnimationFrame(frame);
      } else {
        if (reduceMotion) ctx.drawImage(target.canvas, 0, 0);
        if (stats) {
          const millions = (rays / 1e6).toFixed(1);
          stats.textContent = `Ray traced live in your browser: ${millions} million rays in ${(busy / 1000).toFixed(1)} s.`;
        }
      }
    }
    requestAnimationFrame(frame);
  }

  // Re-render if the canvas is resized noticeably
  let lastWidth = 0;
  let resizeTimer;
  const ro = new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width;
    if (Math.abs(w - lastWidth) / Math.max(1, lastWidth) < 0.1) return;
    const first = lastWidth === 0;
    lastWidth = w;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, first ? 0 : 150);
  });
  ro.observe(canvas);
})();
