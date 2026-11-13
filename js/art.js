/**
 * Canvas-drawn exhibition pages.
 *
 * These are intentionally made from code rather than photographs. Each page is
 * rendered once at 1600 × 900 (or 900 × 1456 for the tall solar feed) and is
 * then mapped onto a physical LED screen in the room.
 */

const PAGE = {
  landscape: { width: 1600, height: 900 },
  portrait: { width: 900, height: 1456 },
};

const PALETTES = {
  light: {
    bg: "#f6f6f6",
    bgTop: "#ffffff",
    ink: "#151515",
    muted: "#5a5a5a",
    faint: "#8b8b8b",
    line: "rgba(21, 21, 21, 0.15)",
    accent: "#3d3d3d",
    chip: "rgba(21, 21, 21, 0.05)",
  },
  paper: {
    bg: "#e2dbcc",
    bgTop: "#ece6d9",
    ink: "#17140f",
    muted: "#5c554a",
    faint: "#8d8374",
    line: "rgba(23, 20, 15, 0.18)",
    accent: "#9a6037",
    chip: "rgba(23, 20, 15, 0.055)",
  },
  dark: {
    bg: "#0a0806",
    bgTop: "#15110c",
    ink: "#f2e9db",
    muted: "#b2a391",
    faint: "#7c6f60",
    line: "rgba(242, 233, 219, 0.19)",
    accent: "#e0ac76",
    chip: "rgba(242, 233, 219, 0.08)",
  },
};

let grainCanvas = null;

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getGrainPattern(ctx) {
  if (!grainCanvas) {
    grainCanvas = createCanvas(160, 160);
    const grain = grainCanvas.getContext("2d");
    const image = grain.createImageData(160, 160);
    const random = mulberry32(90210);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.floor(random() * 255);
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 30 + Math.floor(random() * 52);
    }
    grain.putImageData(image, 0, 0);
  }
  return ctx.createPattern(grainCanvas, "repeat");
}

function drawGrain(ctx, width, height, opacity = 0.055) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = getGrainPattern(ctx);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius = 3) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function setFont(ctx, font, size, weight = 400) {
  ctx.font = `${weight} ${size}px ${font}`;
}

function drawTracked(ctx, text, x, y, spacing = 0) {
  if (!spacing) {
    ctx.fillText(text, x, y);
    return;
  }
  let total = -spacing;
  for (const character of text) {
    total += ctx.measureText(character).width + spacing;
  }
  const align = ctx.textAlign;
  let cursor = x;
  if (align === "right") cursor = x - total;
  else if (align === "center") cursor = x - total / 2;
  ctx.textAlign = "left";
  for (const character of text) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + spacing;
  }
  ctx.textAlign = align;
}

function fitFont(ctx, text, font, maxSize, maxWidth, weight = 400, minSize = 34) {
  let size = maxSize;
  do {
    setFont(ctx, font, size, weight);
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  } while (size > minSize);
  return size;
}

function wrapText(ctx, text, maxWidth, lineHeight, maxLines = 8) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last.replace(/\s+\S*$/, "")}…`;
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, 0, index * lineHeight);
  });

  return lines.length;
}

/* -------------------------------------------------------------------------- */
/*  Procedural images                                                          */
/* -------------------------------------------------------------------------- */

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const expanded =
    value.length === 3
      ? value.split("").map((character) => character + character).join("")
      : value;
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

const PAINTERS = {
  engine: paintEngine,
  lumen: paintLumen,
  firstLight: paintFirstLight,
  bsc: paintBsc,
  hack: paintHack,
  noon: paintNoon,
  sift: paintSift,
  rakis: paintRakis,
  map: paintMap,
  orbits: paintOrbits,
  web: paintWeb,
  cluster: paintCluster,
  pointers: paintPointers,
  film: paintFilm,
  award: paintAward,
  robot: paintRobot,
};

function makeImageCanvas(exhibit) {
  const canvas = createCanvas(1100, 590);
  const ctx = canvas.getContext("2d");
  const random = mulberry32(hashSeed(exhibit.id));

  (PAINTERS[exhibit.art] || paintLumen)(ctx, 1100, 590, random);
  drawGrain(ctx, 1100, 590, 0.07);

  // A little scanner/print texture keeps the generated art from feeling flat.
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1;
  for (let y = 0; y < 590; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(1100, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  return canvas;
}

function paintLumen(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#1a1712");
  bg.addColorStop(0.5, "#0c0a08");
  bg.addColorStop(1, "#060807");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const halo = ctx.createRadialGradient(w * 0.58, h * 0.35, 10, w * 0.58, h * 0.35, w * 0.44);
  halo.addColorStop(0, "rgba(240, 180, 104, 0.36)");
  halo.addColorStop(0.22, "rgba(214, 143, 69, 0.12)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Floor grid, kept faint.
  ctx.save();
  ctx.strokeStyle = "rgba(216, 177, 118, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const y = h * 0.7 + i * i * 3.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (i - 5) * 8);
    ctx.stroke();
  }
  for (let i = -8; i <= 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 26, h * 0.64);
    ctx.lineTo(w / 2 + i * 115, h);
    ctx.stroke();
  }
  ctx.restore();

  // A taller, quiet lamp silhouette.
  ctx.save();
  ctx.translate(w * 0.58, h * 0.58);
  ctx.strokeStyle = "rgba(239, 210, 167, 0.9)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 175);
  ctx.stroke();

  ctx.fillStyle = "rgba(33, 31, 25, 0.94)";
  ctx.strokeStyle = "rgba(237, 203, 151, 0.65)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-92, -22);
  ctx.bezierCurveTo(-70, -125, 93, -138, 115, -33);
  ctx.bezierCurveTo(60, -51, -38, -47, -92, -22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const glow = ctx.createRadialGradient(0, -8, 2, 0, 8, 190);
  glow.addColorStop(0, "rgba(255, 223, 166, 0.58)");
  glow.addColorStop(0.28, "rgba(238, 176, 101, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-230, -160, 460, 320);

  ctx.restore();

  // A quiet technical mark, deliberately unlabelled.
  ctx.strokeStyle = "rgba(237, 209, 164, 0.24)";
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.07, h * 0.1, w * 0.16, h * 0.11);

  // Sparse dust.
  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = `rgba(242, 213, 170, ${0.06 + random() * 0.15})`;
    ctx.fillRect(random() * w, random() * h, 1 + random() * 1.4, 1 + random() * 1.4);
  }
}

function paintFirstLight(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#081018");
  bg.addColorStop(0.6, "#070d13");
  bg.addColorStop(1, "#020406");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const orb = ctx.createRadialGradient(w * 0.6, h * 0.46, 5, w * 0.6, h * 0.46, w * 0.38);
  orb.addColorStop(0, "rgba(247, 251, 255, 0.92)");
  orb.addColorStop(0.06, "rgba(175, 207, 232, 0.6)");
  orb.addColorStop(0.22, "rgba(77, 111, 142, 0.2)");
  orb.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.57, h * 0.46);
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 220 + i * 31, 77 + i * 15, -0.38 + i * 0.035, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(177, 208, 234, ${0.15 - i * 0.012})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.beginPath();
  for (let x = -520; x <= 520; x += 7) {
    const y = Math.sin(x * 0.009 + 1.1) * 52 + Math.sin(x * 0.021) * 13;
    if (x === -520) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(214, 232, 247, 0.52)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // Reflected horizon.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const horizon = ctx.createLinearGradient(0, h * 0.66, 0, h);
  horizon.addColorStop(0, "rgba(110, 148, 181, 0.2)");
  horizon.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, h * 0.66, w, h * 0.34);
  ctx.restore();

  for (let i = 0; i < 100; i += 1) {
    ctx.fillStyle = `rgba(218, 234, 248, ${0.04 + random() * 0.2})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }
}

function paintBsc(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#121a22");
  bg.addColorStop(1, "#070a0e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(150, 181, 207, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 62; x < w; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 36; y < h; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // An architectural / interface axonometric.
  ctx.save();
  ctx.translate(w * 0.56, h * 0.5);
  ctx.strokeStyle = "rgba(186, 212, 234, 0.55)";
  ctx.lineWidth = 1.6;
  const boxes = [
    [-250, -70, 190, 160, -90],
    [-10, -140, 260, 130, -60],
    [170, 30, 180, 150, -115],
  ];
  for (const [x, y, bw, bh, lift] of boxes) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + bw, y - lift * 0.28);
    ctx.lineTo(x + bw, y + bh - lift * 0.28);
    ctx.lineTo(x, y + bh);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - lift * 0.35, y - lift * 0.6);
    ctx.lineTo(x + bw - lift * 0.35, y + bh - lift * 0.9);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(115, 35, 112, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(133, 168, 198, 0.28)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -160);
  ctx.lineTo(0, 170);
  ctx.strokeStyle = "rgba(184, 210, 230, 0.16)";
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < 60; i += 1) {
    ctx.fillStyle = `rgba(181, 211, 233, ${0.04 + random() * 0.1})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }
}

function paintHack(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#21150f");
  bg.addColorStop(0.55, "#130f0c");
  bg.addColorStop(1, "#080706");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.28, h * 0.4, 10, w * 0.28, h * 0.4, w * 0.55);
  glow.addColorStop(0, "rgba(227, 150, 89, 0.3)");
  glow.addColorStop(0.45, "rgba(157, 81, 43, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Contour bands over an invented coastline.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.57);
  for (let i = 0; i < 22; i += 1) {
    const t = i / 21;
    ctx.beginPath();
    for (let x = -480; x <= 480; x += 6) {
      const wave =
        Math.sin(x * 0.008 + i * 0.58) * (34 + i * 2.4) +
        Math.sin(x * 0.021 - i * 0.31) * 12 +
        Math.sin(x * 0.004) * 38;
      const y = wave - t * 45 + i * 4;
      if (x === -480) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(229, 172, 111, ${0.38 - i * 0.013})`;
    ctx.lineWidth = i === 13 ? 1.8 : 0.85;
    ctx.stroke();
  }

  // Glowing datum line.
  ctx.beginPath();
  ctx.moveTo(-500, 126);
  ctx.bezierCurveTo(-140, 75, 180, 190, 500, 110);
  ctx.strokeStyle = "rgba(255, 204, 144, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 230, 193, 0.9)";
  ctx.beginPath();
  ctx.arc(80, 143, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = `rgba(245, 194, 140, ${0.04 + random() * 0.13})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }
}

function paintNoon(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#bcb098");
  bg.addColorStop(0.55, "#9b8f78");
  bg.addColorStop(1, "#6c6454");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Sunlight wedge.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w * 0.57, 0);
  ctx.lineTo(w, h * 0.18);
  ctx.lineTo(w, h);
  ctx.lineTo(w * 0.16, h);
  ctx.closePath();
  ctx.fillStyle = "rgba(247, 231, 196, 0.22)";
  ctx.fill();
  ctx.restore();

  // Concrete planes.
  const columns = [
    [0.08, 0.12, 0.19, 0.78, "#786f5e"],
    [0.31, 0.02, 0.23, 0.92, "#8f846f"],
    [0.58, 0.18, 0.17, 0.75, "#6d6556"],
    [0.79, 0.04, 0.14, 0.86, "#a89b82"],
  ];
  for (const [x, y, cw, ch, color] of columns) {
    ctx.fillStyle = color;
    ctx.fillRect(x * w, y * h, cw * w, ch * h);
    ctx.fillStyle = "rgba(248, 232, 200, 0.16)";
    ctx.fillRect(x * w, y * h, 3, ch * h);
  }

  // Hard shadow.
  ctx.fillStyle = "rgba(27, 25, 21, 0.42)";
  ctx.beginPath();
  ctx.moveTo(w * 0.31, h);
  ctx.lineTo(w * 0.68, h * 0.12);
  ctx.lineTo(w * 0.8, h * 0.12);
  ctx.lineTo(w * 0.5, h);
  ctx.closePath();
  ctx.fill();

  // Tiny architectural markers.
  ctx.strokeStyle = "rgba(242, 229, 202, 0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.08, h * 0.1, w * 0.3, h * 0.28);

  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(250, 239, 212, ${0.04 + random() * 0.1})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }
}

function paintSift(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#12100b");
  bg.addColorStop(0.55, "#0b0906");
  bg.addColorStop(1, "#040302");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // A warm window in a dark reading room.
  const windowGlow = ctx.createLinearGradient(w * 0.08, h * 0.1, w * 0.55, h * 0.7);
  windowGlow.addColorStop(0, "rgba(235, 204, 155, 0.28)");
  windowGlow.addColorStop(1, "rgba(235, 204, 155, 0)");
  ctx.fillStyle = windowGlow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(223, 203, 165, 0.17)";
  ctx.fillRect(w * 0.08, h * 0.1, w * 0.2, h * 0.54);
  ctx.strokeStyle = "rgba(229, 216, 195, 0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.08, h * 0.1, w * 0.2, h * 0.54);
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.1);
  ctx.lineTo(w * 0.18, h * 0.64);
  ctx.stroke();

  // Stacked reading planes.
  ctx.save();
  for (let i = 0; i < 5; i += 1) {
    const x = w * 0.36 + i * 36;
    const y = h * 0.23 + i * 16;
    ctx.fillStyle = i === 4 ? "rgba(35, 29, 21, 0.94)" : `rgba(26, 22, 16, ${0.48 + i * 0.08})`;
    ctx.strokeStyle = `rgba(221, 196, 159, ${0.13 + i * 0.03})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(x, y, w * 0.34, h * 0.48);
    ctx.fill();
    ctx.stroke();

    if (i === 4) {
      ctx.fillStyle = "rgba(223, 189, 145, 0.25)";
      for (let line = 0; line < 7; line += 1) {
        ctx.fillRect(x + 24, y + 42 + line * 27, w * 0.24 - random() * 60, 1.5);
      }
      ctx.fillStyle = "rgba(232, 210, 178, 0.34)";
      ctx.fillRect(x + 24, y + 250, w * 0.14, 1);
    }
  }
  ctx.restore();

  const horizon = ctx.createLinearGradient(0, h * 0.72, 0, h);
  horizon.addColorStop(0, "rgba(181, 128, 77, 0.24)");
  horizon.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = `rgba(245, 224, 195, ${0.03 + random() * 0.15})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }
}

/* -- Project plates without a still image ---------------------------------- */

function paintEngine(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#101826");
  bg.addColorStop(0.55, "#080d16");
  bg.addColorStop(1, "#04060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const halo = ctx.createRadialGradient(w * 0.52, h * 0.52, 8, w * 0.52, h * 0.52, w * 0.42);
  halo.addColorStop(0, "rgba(122, 176, 232, 0.22)");
  halo.addColorStop(0.5, "rgba(76, 108, 154, 0.06)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Perspective grid.
  ctx.save();
  ctx.strokeStyle = "rgba(150, 188, 228, 0.2)";
  ctx.lineWidth = 1;
  const horizon = h * 0.58;
  for (let i = -14; i <= 14; i += 1) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 14, horizon);
    ctx.lineTo(w / 2 + i * 130, h + 60);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i += 1) {
    const y = horizon + i * i * 3.1 + i * 6;
    ctx.globalAlpha = 0.5 - i * 0.028;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  // Wireframe cube.
  ctx.save();
  ctx.translate(w * 0.52, h * 0.46);
  ctx.strokeStyle = "rgba(196, 220, 244, 0.7)";
  ctx.lineWidth = 1.4;
  const size = 118;
  const lift = 58;
  const corners = [
    [-size, -size], [size, -size], [size, size], [-size, size],
  ];
  ctx.beginPath();
  corners.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y - lift);
    else ctx.lineTo(x, y - lift);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "rgba(160, 198, 236, 0.5)";
  ctx.beginPath();
  corners.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "rgba(160, 198, 236, 0.34)";
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - lift);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(222, 240, 255, 0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-size, -size);
  ctx.lineTo(size, size);
  ctx.moveTo(size, -size);
  ctx.lineTo(-size, size);
  ctx.stroke();
  ctx.restore();

  // Two columns of pseudo-code.
  ctx.save();
  const columns = [w * 0.06, w * 0.82];
  for (const x of columns) {
    for (let i = 0; i < 15; i += 1) {
      const width = 40 + random() * 110;
      ctx.fillStyle = `rgba(150, 184, 218, ${0.05 + random() * 0.16})`;
      ctx.fillRect(x, h * 0.14 + i * 19, width, 2);
    }
  }
  ctx.restore();

  ctx.fillStyle = "rgba(206, 230, 250, 0.55)";
  setFont(ctx, '"JetBrains Mono"', 13, 400);
  drawTracked(ctx, "glDrawElements  ·  framebuffer  ·  orbit camera", 44, h - 34, 1.1);
}

function paintRakis(ctx, w, h, random) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.45, w * 0.7);
  bg.addColorStop(0, "#0b1424");
  bg.addColorStop(0.55, "#060b14");
  bg.addColorStop(1, "#020307");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // The same triangular stars as the gallery windows.
  for (let i = 0; i < 150; i += 1) {
    const x = random() * w;
    const y = random() * h;
    const size = 1.4 + random() * 4.4;
    ctx.fillStyle = `rgba(214, 230, 250, ${0.16 + random() * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.86, y + size * 0.62);
    ctx.lineTo(x - size * 0.86, y + size * 0.62);
    ctx.closePath();
    ctx.fill();
  }

  // Planet limb bottom right.
  ctx.save();
  const planet = ctx.createRadialGradient(w * 0.86, h * 0.92, 12, w * 0.86, h * 0.92, w * 0.3);
  planet.addColorStop(0, "#5b4432");
  planet.addColorStop(0.62, "#33261c");
  planet.addColorStop(1, "#120e0a");
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(w * 0.86, h * 0.96, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(226, 178, 128, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w * 0.86, h * 0.96, w * 0.28, Math.PI * 1.06, Math.PI * 1.92);
  ctx.stroke();
  ctx.restore();

  // Dotted flight path.
  ctx.save();
  ctx.strokeStyle = "rgba(151, 202, 238, 0.32)";
  ctx.setLineDash([2, 12]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h * 0.72);
  ctx.bezierCurveTo(w * 0.3, h * 0.4, w * 0.56, h * 0.66, w * 0.68, h * 0.38);
  ctx.stroke();
  ctx.restore();

  // The little ship.
  ctx.save();
  ctx.translate(w * 0.16, h * 0.72);
  ctx.fillStyle = "rgba(236, 245, 255, 0.94)";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, 11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, -11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255, 190, 120, 0.9)";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-26 - random() * 8, 4);
  ctx.lineTo(-26 - random() * 8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(190, 214, 238, 0.42)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "FUEL  38%   ·   TARGET  VEGA-4   ·   ΔV 0.62", 40, h - 30, 1.1);
}

function paintMap(ctx, w, h, random) {
  ctx.fillStyle = "#07100a";
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.6);
  glow.addColorStop(0, "rgba(76, 200, 132, 0.1)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const columns = 34;
  const rows = 18;
  const cell = Math.min(w / (columns + 2), h / (rows + 2));
  const originX = (w - columns * cell) / 2;
  const originY = (h - rows * cell) / 2;

  ctx.save();
  ctx.font = `${Math.round(cell * 0.8)}px "JetBrains Mono"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const value = random();
      const x = originX + column * cell + cell / 2;
      const y = originY + row * cell + cell / 2;
      if (value > 0.72) {
        ctx.fillStyle = `rgba(104, 198, 142, ${0.12 + random() * 0.24})`;
        ctx.fillText(random() > 0.5 ? "#" : "+", x, y);
      } else if (value > 0.62) {
        ctx.fillStyle = "rgba(226, 168, 96, 0.5)";
        ctx.fillText("$", x, y);
      }
    }
  }

  // Route through the map.
  let x = 2;
  let y = rows - 4;
  ctx.strokeStyle = "rgba(198, 246, 214, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(originX + x * cell + cell / 2, originY + y * cell + cell / 2);
  const stops = 22;
  for (let i = 0; i < stops; i += 1) {
    x = Math.min(columns - 2, Math.max(1, x + (random() > 0.28 ? 1 : 0)));
    y = Math.min(rows - 2, Math.max(1, y + (random() > 0.62 ? (random() > 0.5 ? 1 : -1) : 0)));
    ctx.lineTo(originX + x * cell + cell / 2, originY + y * cell + cell / 2);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(226, 250, 234, 0.95)";
  ctx.beginPath();
  ctx.arc(originX + x * cell + cell / 2, originY + y * cell + cell / 2, cell * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(132, 222, 168, 0.5)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "SCORE 14820   ·   MOVES 022   ·   MAP 07", 36, 34, 1.1);
}

function paintOrbits(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#05070d");
  bg.addColorStop(1, "#0b0a10");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const centerX = w * 0.42;
  const centerY = h * 0.54;

  for (let i = 0; i < 120; i += 1) {
    ctx.fillStyle = `rgba(220, 230, 245, ${0.1 + random() * 0.5})`;
    ctx.fillRect(random() * w, random() * h, 1.2, 1.2);
  }

  const sun = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 120);
  sun.addColorStop(0, "rgba(255, 240, 208, 1)");
  sun.addColorStop(0.18, "rgba(255, 194, 120, 0.7)");
  sun.addColorStop(1, "rgba(255, 160, 80, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(centerX - 130, centerY - 130, 260, 260);
  ctx.fillStyle = "#fff6e2";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
  ctx.fill();

  // Elliptical orbits and their planets.
  for (let i = 0; i < 5; i += 1) {
    const radius = 70 + i * 62;
    const squash = 0.34 + i * 0.055;
    ctx.strokeStyle = `rgba(170, 196, 226, ${0.16 - i * 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius, radius * squash, -0.2, 0, Math.PI * 2);
    ctx.stroke();

    const angle = random() * Math.PI * 2;
    const px = centerX + Math.cos(angle) * radius * Math.cos(-0.2) - Math.sin(angle) * radius * squash * Math.sin(-0.2);
    const py = centerY + Math.cos(angle) * radius * Math.sin(-0.2) + Math.sin(angle) * radius * squash * Math.cos(-0.2);
    const size = 4 + random() * 9;
    const planets = ["#9ab6d4", "#c8a17b", "#8fa68c", "#b9b2c9", "#d3b992"];
    ctx.fillStyle = planets[i % planets.length];
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(px - size * 0.3, py - size * 0.3, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(190, 210, 234, 0.42)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "G = 1.0   ·   MASS  ·   VELOCITY   ·   FRAME 004821", 36, h - 30, 1.1);
}

function paintWeb(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#14141a");
  bg.addColorStop(1, "#08080b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.3, h * 0.3, 20, w * 0.3, h * 0.3, w * 0.6);
  glow.addColorStop(0, "rgba(160, 190, 230, 0.09)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const x = w * 0.13;
  const y = h * 0.2;
  const width = w * 0.74;
  const height = h * 0.6;

  ctx.fillStyle = "rgba(16, 18, 24, 0.95)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(190, 208, 232, 0.24)";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  // Browser chrome.
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, y, width, 40);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = "rgba(214, 226, 240, 0.35)";
    ctx.beginPath();
    ctx.arc(x + 20 + i * 16, y + 20, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x + 82, y + 11, width - 110, 18);

  // Layout blocks.
  ctx.fillStyle = "rgba(226, 234, 244, 0.12)";
  ctx.fillRect(x + 26, y + 66, width - 52, 72);
  ctx.fillStyle = "rgba(196, 210, 228, 0.24)";
  ctx.fillRect(x + 44, y + 84, width * 0.32, 10);
  ctx.fillStyle = "rgba(160, 184, 214, 0.14)";
  ctx.fillRect(x + 44, y + 104, width * 0.44, 6);
  ctx.fillRect(x + 44, y + 118, width * 0.26, 6);

  for (let i = 0; i < 3; i += 1) {
    const cardX = x + 26 + i * ((width - 52) / 3);
    const cardWidth = (width - 52) / 3 - 14;
    ctx.fillStyle = `rgba(210, 224, 240, ${0.07 + i * 0.015})`;
    ctx.fillRect(cardX, y + 160, cardWidth, height - 196);
    ctx.fillStyle = "rgba(170, 198, 228, 0.2)";
    ctx.fillRect(cardX + 14, y + 178, cardWidth * 0.55, 8);
    for (let line = 0; line < 4; line += 1) {
      ctx.fillStyle = "rgba(160, 184, 214, 0.1)";
      ctx.fillRect(cardX + 14, y + 202 + line * 14, cardWidth * (0.4 + random() * 0.4), 4);
    }
  }

  // Cursor.
  ctx.fillStyle = "rgba(240, 246, 252, 0.82)";
  ctx.beginPath();
  ctx.moveTo(x + width * 0.62, y + height * 0.52);
  ctx.lineTo(x + width * 0.62 + 13, y + height * 0.52 + 19);
  ctx.lineTo(x + width * 0.62 + 5, y + height * 0.52 + 18);
  ctx.closePath();
  ctx.fill();
}

function paintCluster(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0c0a0c");
  bg.addColorStop(1, "#050405");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const warm = ctx.createRadialGradient(w * 0.5, h * 0.9, 20, w * 0.5, h * 0.9, w * 0.55);
  warm.addColorStop(0, "rgba(226, 120, 60, 0.16)");
  warm.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  // Rack rows.
  const racks = 5;
  const rackWidth = w * 0.14;
  const gap = w * 0.022;
  const total = racks * rackWidth + (racks - 1) * gap;
  let x = (w - total) / 2;
  for (let rack = 0; rack < racks; rack += 1) {
    const height = h * (0.5 + random() * 0.16);
    const y = h - height - h * 0.08;
    ctx.fillStyle = "#0e1214";
    ctx.fillRect(x, y, rackWidth, height);
    ctx.strokeStyle = "rgba(150, 180, 196, 0.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, rackWidth - 1, height - 1);

    const slots = Math.floor(height / 22);
    for (let slot = 0; slot < slots; slot += 1) {
      const slotY = y + 10 + slot * 22;
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.fillRect(x + 8, slotY, rackWidth - 16, 14);
      for (let led = 0; led < 3; led += 1) {
        const hot = random();
        ctx.fillStyle = hot > 0.72
          ? "rgba(255, 126, 72, 0.9)"
          : hot > 0.4
            ? "rgba(120, 220, 170, 0.75)"
            : "rgba(96, 148, 190, 0.5)";
        ctx.fillRect(x + 12 + led * 7, slotY + 5, 3, 3);
      }
    }
    x += rackWidth + gap;
  }

  ctx.fillStyle = "rgba(196, 210, 220, 0.4)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "NODE 07  ·  62°C  ·  SLURM  ·  PROFILE DEPLOY  ·  IDLE 03", 36, h - 30, 1.1);
}

function paintPointers(ctx, w, h, random) {
  ctx.fillStyle = "#0a0806";
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createLinearGradient(0, 0, w, h);
  glow.addColorStop(0, "rgba(223, 173, 120, 0.12)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Faint allocation grid.
  ctx.strokeStyle = "rgba(240, 220, 190, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath();
    ctx.moveTo(40 + i * 42, 40);
    ctx.lineTo(40 + i * 42, h - 40);
    ctx.stroke();
  }

  const nodes = 5;
  const nodeWidth = 152;
  const nodeHeight = 84;
  const gap = (w - 160 - nodeWidth * nodes) / (nodes - 1);
  for (let i = 0; i < nodes; i += 1) {
    const x = 80 + i * (nodeWidth + gap);
    const y = h * 0.5 + (i % 2 === 0 ? -60 : 26);
    ctx.fillStyle = "rgba(26, 22, 17, 0.95)";
    ctx.fillRect(x, y, nodeWidth, nodeHeight);
    ctx.strokeStyle = "rgba(226, 205, 174, 0.42)";
    ctx.strokeRect(x + 0.5, y + 0.5, nodeWidth - 1, nodeHeight - 1);
    ctx.fillStyle = "rgba(223, 173, 120, 0.85)";
    setFont(ctx, '"JetBrains Mono"', 15, 500);
    ctx.fillText("*value", x + 16, y + 34);
    ctx.fillStyle = "rgba(232, 222, 206, 0.32)";
    setFont(ctx, '"JetBrains Mono"', 10, 400);
    ctx.fillText(`0x${(0x7f4a + i * 0x18).toString(16)}`, x + 16, y + 58);

    if (i < nodes - 1) {
      const nextY = h * 0.5 + ((i + 1) % 2 === 0 ? -60 : 26);
      ctx.strokeStyle = "rgba(180, 200, 220, 0.4)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + nodeWidth, y + nodeHeight / 2);
      ctx.bezierCurveTo(
        x + nodeWidth + gap * 0.5,
        y + nodeHeight / 2,
        x + nodeWidth + gap * 0.5,
        nextY + nodeHeight / 2,
        x + nodeWidth + gap,
        nextY + nodeHeight / 2
      );
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(226, 210, 188, 0.38)";
  setFont(ctx, '"JetBrains Mono"', 11, 400);
  drawTracked(ctx, "struct Node { int value; Node* next; };   ·   memory  heap  stack", 36, h - 28, 1);
}

function paintFilm(ctx, w, h, random) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#1a1218");
  bg.addColorStop(0.55, "#0e090d");
  bg.addColorStop(1, "#060405");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.7, h * 0.2, 10, w * 0.7, h * 0.2, w * 0.6);
  glow.addColorStop(0, "rgba(226, 150, 170, 0.16)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Film strip.
  const stripY = h * 0.2;
  const stripH = 130;
  ctx.fillStyle = "rgba(14, 12, 14, 0.9)";
  ctx.fillRect(0, stripY, w, stripH);
  ctx.strokeStyle = "rgba(226, 214, 222, 0.16)";
  ctx.strokeRect(0.5, stripY + 0.5, w - 1, stripH);
  for (let x = 10; x < w; x += 34) {
    ctx.fillStyle = "rgba(226, 214, 222, 0.22)";
    ctx.fillRect(x, stripY + 10, 18, 9);
    ctx.fillRect(x, stripY + stripH - 19, 18, 9);
  }
  for (let i = 0; i < 5; i += 1) {
    const frameX = 60 + i * 200;
    ctx.fillStyle = `rgba(190, 160, 180, ${0.1 + random() * 0.1})`;
    ctx.fillRect(frameX, stripY + 32, 150, 68);
    ctx.fillStyle = "rgba(24, 20, 26, 1)";
    ctx.fillRect(frameX + 8, stripY + 40, 134, 52);
  }

  // Timeline.
  const timelineY = h * 0.72;
  ctx.strokeStyle = "rgba(214, 202, 216, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, timelineY);
  ctx.lineTo(w - 60, timelineY);
  ctx.stroke();

  const clips = 6;
  for (let i = 0; i < clips; i += 1) {
    const x = 60 + i * ((w - 120) / clips);
    const width = (w - 120) / clips - 10;
    ctx.fillStyle = `rgba(190, 150, 170, ${0.16 + random() * 0.16})`;
    ctx.fillRect(x, timelineY - 34, width, 34);
    ctx.fillStyle = "rgba(240, 230, 236, 0.18)";
    ctx.fillRect(x + 6, timelineY - 27, width * (0.3 + random() * 0.4), 4);
  }

  // Playhead.
  ctx.strokeStyle = "rgba(255, 226, 236, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.46, timelineY - 52);
  ctx.lineTo(w * 0.46, timelineY + 22);
  ctx.stroke();

  // Aperture.
  ctx.save();
  ctx.translate(w * 0.16, h * 0.3);
  ctx.strokeStyle = "rgba(236, 220, 232, 0.5)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i += 1) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0.2, Math.PI / 2.9);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(226, 214, 222, 0.4)";
  setFont(ctx, '"JetBrains Mono"', 11, 400);
  drawTracked(ctx, "ASMI   ·   FILM 02   ·   24 FPS   ·   CUT 018", 60, h - 26, 1);
}

function paintAward(ctx, w, h, random) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, w * 0.6);
  bg.addColorStop(0, "#111a26");
  bg.addColorStop(0.55, "#080c13");
  bg.addColorStop(1, "#030508");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.4, w * 0.34);
  glow.addColorStop(0, "rgba(206, 226, 250, 0.22)");
  glow.addColorStop(0.5, "rgba(150, 182, 220, 0.07)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Ribbons.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.46);
  for (const [offset, color] of [
    [-46, "rgba(122, 154, 194, 0.5)"],
    [46, "rgba(92, 122, 160, 0.5)"],
  ]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(offset - 26, 70);
    ctx.lineTo(offset + 26, 70);
    ctx.lineTo(offset + 42, 250);
    ctx.lineTo(offset + 6, 218);
    ctx.lineTo(offset - 30, 250);
    ctx.closePath();
    ctx.fill();
  }

  // Medal.
  const medal = ctx.createRadialGradient(-22, -24, 8, 0, 0, 92);
  medal.addColorStop(0, "#f2f7ff");
  medal.addColorStop(0.32, "#cddced");
  medal.addColorStop(0.72, "#8ba2bc");
  medal.addColorStop(1, "#4c5f75");
  ctx.fillStyle = medal;
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(238, 246, 255, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.stroke();

  // A star, cut into the medal.
  ctx.strokeStyle = "rgba(26, 38, 52, 0.55)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 44 : 18;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Engraved credit line.
  ctx.fillStyle = "rgba(190, 212, 238, 0.42)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "OLYMPIAD  ·  HACKATHON  ·  INTERNATIONAL FINAL", 40, h - 32, 1.1);

  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = `rgba(220, 235, 252, ${0.03 + random() * 0.12})`;
    ctx.fillRect(random() * w, random() * h, 1, 1);
  }
}

function paintRobot(ctx, w, h, random) {
  ctx.fillStyle = "#070b10";
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createLinearGradient(0, 0, w, h);
  glow.addColorStop(0, "rgba(106, 152, 204, 0.12)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Circuit traces.
  ctx.strokeStyle = "rgba(120, 168, 214, 0.16)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    let x = 40 + i * 118;
    let y = 60 + random() * 40;
    ctx.moveTo(x, y);
    for (let step = 0; step < 4; step += 1) {
      x += 40;
      ctx.lineTo(x, y);
      y += random() > 0.5 ? 46 : -46;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let step = 0; step < 5; step += 1) {
      ctx.fillStyle = "rgba(150, 196, 238, 0.35)";
      ctx.beginPath();
      ctx.arc(40 + i * 118 + step * 74, 60 + ((step * 53) % 120), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The robot, three-quarter view.
  ctx.save();
  ctx.translate(w * 0.5, h * 0.56);
  ctx.rotate(-0.06);

  ctx.fillStyle = "rgba(18, 24, 32, 0.96)";
  ctx.strokeStyle = "rgba(176, 206, 238, 0.7)";
  ctx.lineWidth = 2;
  roundedRect(ctx, -150, -70, 300, 150, 12);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(150, 188, 226, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-120, -42);
  ctx.lineTo(112, -42);
  ctx.moveTo(-120, -22);
  ctx.lineTo(80, -22);
  ctx.stroke();

  // LiDAR puck.
  ctx.fillStyle = "rgba(30, 40, 52, 1)";
  ctx.strokeStyle = "rgba(196, 224, 250, 0.8)";
  ctx.beginPath();
  ctx.arc(0, -78, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(210, 235, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(0, -78, 10, 0, Math.PI * 2);
  ctx.fill();

  // Wheels.
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#0c1117";
    ctx.strokeStyle = "rgba(160, 196, 232, 0.45)";
    ctx.beginPath();
    ctx.ellipse(side * 118, 88, 40, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Sensor bar.
  ctx.fillStyle = "rgba(120, 200, 255, 0.75)";
  for (let i = -3; i <= 3; i += 1) {
    ctx.fillRect(i * 26 - 5, -58, 10, 4);
  }
  ctx.restore();

  // Start line.
  ctx.strokeStyle = "rgba(226, 240, 255, 0.5)";
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.moveTo(40, h - 96);
  ctx.lineTo(w - 40, h - 96);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(180, 208, 238, 0.42)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "LINE FOLLOWER  ·  SMARTHACK  ·  2024 — 2026", 40, h - 34, 1.1);
}

function paintSol(ctx, w, h, random) {
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 30, w * 0.5, h * 0.42, h * 0.62);
  bg.addColorStop(0, "#1b1209");
  bg.addColorStop(0.45, "#090b0a");
  bg.addColorStop(1, "#020303");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Stars first.
  for (let i = 0; i < 190; i += 1) {
    const x = random() * w;
    const y = random() * h;
    const size = random() < 0.92 ? 1 : 1.8;
    ctx.fillStyle = `rgba(246, 241, 235, ${0.06 + random() * 0.44})`;
    ctx.fillRect(x, y, size, size);
  }

  const sun = ctx.createRadialGradient(w * 0.48, h * 0.44, 10, w * 0.48, h * 0.44, h * 0.35);
  sun.addColorStop(0, "rgba(255, 252, 232, 1)");
  sun.addColorStop(0.12, "rgba(255, 230, 172, 1)");
  sun.addColorStop(0.3, "rgba(245, 176, 85, 0.88)");
  sun.addColorStop(0.62, "rgba(158, 83, 30, 0.23)");
  sun.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.44, h * 0.19 + i * 34, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(253, 205, 135, ${0.1 - i * 0.015})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();

  // Lens artifact.
  ctx.beginPath();
  ctx.arc(w * 0.48, h * 0.44, h * 0.16, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 238, 201, 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const vignette = ctx.createRadialGradient(w * 0.48, h * 0.44, h * 0.3, w * 0.48, h * 0.44, h * 0.7);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.66)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  drawGrain(ctx, w, h, 0.075);
}

/* -------------------------------------------------------------------------- */
/*  Page composition                                                           */
/* -------------------------------------------------------------------------- */

function pageShell(ctx, width, height, palette) {
  ctx.clearRect(0, 0, width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, palette.bgTop);
  bg.addColorStop(0.65, palette.bg);
  bg.addColorStop(1, palette.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const edge = ctx.createRadialGradient(width * 0.15, height * 0.08, 10, width * 0.15, height * 0.08, width * 0.92);
  edge.addColorStop(0, "rgba(255,255,255,0.055)");
  edge.addColorStop(0.5, "rgba(255,255,255,0.012)");
  edge.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, width, height);

  drawGrain(ctx, width, height, 0.032);
}

function drawMeta(ctx, width, exhibit, palette) {
  ctx.fillStyle = palette.accent;
  setFont(ctx, '"JetBrains Mono"', 20, 500);
  drawTracked(ctx, exhibit.number, 64, 56, 1.2);

  ctx.fillStyle = palette.faint;
  ctx.textAlign = "right";
  drawTracked(ctx, exhibit.year, width - 64, 56, 1);
  ctx.textAlign = "left";

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 82.5);
  ctx.lineTo(width - 64, 82.5);
  ctx.stroke();
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function drawEditorialImage(ctx, exhibit, x, y, width, height, palette) {
  const random = mulberry32(hashSeed(`${exhibit.id}-plate`));
  const accent = hexToRgb(exhibit.accent);

  const still =
    exhibit._image?.complete && exhibit._image.naturalWidth
      ? exhibit._image
      : null;
  const image = still || makeImageCanvas(exhibit);
  const paperPage = exhibit.theme === "paper" || exhibit.theme === "light";

  /**
   * `plate` lets each exhibit choose what sits behind its image:
   *   "image" (default for real screenshots) — a blurred copy of the image,
   *           so the mat always matches the picture instead of cutting a black
   *           band into a light page;
   *   "paper" — the page's own background colour;
   *   "dark"  — the near-black plate;
   *   "#rrggbb" — any flat colour.
   * `fit: "cover"` crops the image to the plate instead of containing it.
   */
  const plateOption = exhibit.plate || (still ? "image" : "dark");
  let plateColor = "#0a0907";
  let lightPlate = false;
  let imagePlate = false;

  if (plateOption === "paper") {
    plateColor = palette.bg;
    lightPlate = true;
  } else if (plateOption === "dark") {
    plateColor = "#0a0907";
  } else if (plateOption === "image" && still) {
    imagePlate = true;
    lightPlate = paperPage;
  } else if (plateOption.startsWith("#")) {
    plateColor = plateOption;
    lightPlate = relativeLuminance(plateOption) > 0.45;
  } else {
    plateColor = paperPage ? palette.bg : "#0a0907";
    lightPlate = paperPage;
  }

  ctx.save();
  roundedRect(ctx, x, y, width, height, 1);
  ctx.clip();

  ctx.fillStyle = plateColor;
  ctx.fillRect(x, y, width, height);

  if (imagePlate) {
    // A deliberately tiny copy, scaled up, gives a soft and cheap blur.
    const small = createCanvas(72, 50);
    const smallCtx = small.getContext("2d");
    const cover = Math.max(72 / image.width, 50 / image.height);
    smallCtx.drawImage(
      image,
      (72 - image.width * cover) / 2,
      (50 - image.height * cover) / 2,
      image.width * cover,
      image.height * cover
    );
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.drawImage(small, x, y, width, height);
    ctx.restore();
    ctx.fillStyle = lightPlate
      ? "rgba(236, 230, 217, 0.64)"
      : "rgba(5, 7, 10, 0.62)";
    ctx.fillRect(x, y, width, height);
  }

  const glowX = x + width * (0.28 + random() * 0.44);
  const glowY = y + height * (0.26 + random() * 0.48);
  const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, width * 0.78);
  glow.addColorStop(0, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${lightPlate ? 0.1 : 0.18})`);
  glow.addColorStop(0.5, `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${lightPlate ? 0.03 : 0.05})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = lightPlate ? "rgba(23, 20, 15, 0.06)" : "rgba(242, 233, 219, 0.05)";
  ctx.lineWidth = 1;
  for (let gx = x + 24; gx < x + width; gx += 34) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, y);
    ctx.lineTo(gx + 0.5, y + height);
    ctx.stroke();
  }
  for (let gy = y + 24; gy < y + height; gy += 34) {
    ctx.beginPath();
    ctx.moveTo(x, gy + 0.5);
    ctx.lineTo(x + width, gy + 0.5);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    height * 0.18,
    x + width / 2,
    y + height / 2,
    width * 0.8
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, lightPlate ? "rgba(54, 43, 30, 0.18)" : "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, width, height);

  const cover = exhibit.fit === "cover";
  const pad = cover ? 0 : 24;
  const maxWidth = width - pad * 2;
  const maxHeight = height - pad * 2;
  const scale = cover
    ? Math.max(width / image.width, height / image.height)
    : still
      ? Math.min(maxWidth / image.width, maxHeight / image.height, 1.6)
      : Math.max(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  if (still && !cover) {
    ctx.strokeStyle = lightPlate
      ? "rgba(23, 20, 15, 0.22)"
      : "rgba(242, 233, 219, 0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawWidth - 1, drawHeight - 1);
  }

  // Registration ticks in the corners of the plate.
  ctx.strokeStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.55)`;
  ctx.lineWidth = 1.4;
  const tick = 13;
  for (const [cornerX, cornerY, sx, sy] of [
    [x + 12, y + 12, 1, 1],
    [x + width - 12, y + 12, -1, 1],
    [x + 12, y + height - 12, 1, -1],
    [x + width - 12, y + height - 12, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cornerX, cornerY + sy * tick);
    ctx.lineTo(cornerX, cornerY);
    ctx.lineTo(cornerX + sx * tick, cornerY);
    ctx.stroke();
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(23, 20, 15, 0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
}

function drawPortraitPage(ctx, width, height, exhibit, palette) {
  pageShell(ctx, width, height, palette);

  const art = paintSolCanvas(width, height);
  ctx.drawImage(art, 0, 0);

  const topShade = ctx.createLinearGradient(0, 0, 0, 260);
  topShade.addColorStop(0, "rgba(0,0,0,0.7)");
  topShade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, width, 260);

  const bottomShade = ctx.createLinearGradient(0, height * 0.58, 0, height);
  bottomShade.addColorStop(0, "rgba(0,0,0,0)");
  bottomShade.addColorStop(0.7, "rgba(2,2,1,0.7)");
  bottomShade.addColorStop(1, "rgba(2,2,1,0.96)");
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  ctx.fillStyle = "rgba(241, 233, 221, 0.55)";
  setFont(ctx, '"JetBrains Mono"', 15, 400);
  drawTracked(ctx, exhibit.number, 48, 58, 1.2);
  ctx.textAlign = "right";
  drawTracked(ctx, exhibit.year, width - 48, 58, 1.2);
  ctx.textAlign = "left";

  ctx.fillStyle = "rgba(244, 231, 211, 0.94)";
  setFont(ctx, '"JetBrains Mono"', 92, 500);
  drawTracked(ctx, "SOL", 44, height - 72, -1);
  ctx.fillStyle = "rgba(241, 233, 221, 0.3)";
  setFont(ctx, '"JetBrains Mono"', 12, 400);
  drawTracked(ctx, "LIVE", 48, height - 140, 1.5);
}

function paintSolCanvas(width, height) {
  const canvas = createCanvas(width, height);
  const local = canvas.getContext("2d");
  const random = mulberry32(7719);
  paintSol(local, width, height, random);
  return canvas;
}

function drawPageFooter(ctx, exhibit, x, y, width, palette, alignRight = false) {
  if (exhibit.tech) {
    ctx.fillStyle = palette.faint;
    setFont(ctx, '"JetBrains Mono"', 17, 400);
    ctx.textAlign = alignRight ? "right" : "left";
    drawTracked(ctx, exhibit.tech.toUpperCase(), alignRight ? x + width : x, y, 1.3);
  }

  if (exhibit.link) {
    const link = exhibit.link;
    setFont(ctx, '"JetBrains Mono"', 18, 500);
    const linkWidth = ctx.measureText(link).width;
    const boxWidth = linkWidth + 48;
    const boxX = alignRight ? x + width - boxWidth : x;
    const boxY = y + 22;

    ctx.fillStyle = palette.chip;
    ctx.fillRect(boxX, boxY, boxWidth, 30);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxWidth, 30);

    ctx.fillStyle = palette.accent;
    ctx.textAlign = "left";
    ctx.fillText(link, boxX + 12, y + 42);
    ctx.textAlign = "right";
    ctx.fillText("↗", boxX + boxWidth - 14, y + 42);
    ctx.textAlign = alignRight ? "right" : "left";
  }

  ctx.textAlign = "left";
}

function drawLandscapePage(ctx, width, height, exhibit, palette) {
  pageShell(ctx, width, height, palette);
  drawMeta(ctx, width, exhibit, palette);

  ctx.fillStyle = palette.accent;
  setFont(ctx, '"JetBrains Mono"', 30, 500);
  drawTracked(ctx, exhibit.category.toUpperCase(), 64, 120, 1.4);

  const title = exhibit.title.toUpperCase();
  const titleSize = fitFont(ctx, title, '"JetBrains Mono"', 88, width - 128, 500, 24);
  ctx.fillStyle = palette.ink;
  setFont(ctx, '"JetBrains Mono"', titleSize, 500);
  ctx.fillText(title, 64, 204);

  drawEditorialImage(ctx, exhibit, 64, 260, 760, 530, palette);

  const x = 910;
  const bodyWidth = 626;

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(870.5, 260);
  ctx.lineTo(870.5, 790);
  ctx.stroke();

  ctx.fillStyle = palette.accent;
  ctx.fillRect(x, 288, 34, 1);

  ctx.fillStyle = palette.muted;
  setFont(ctx, '"JetBrains Mono"', 24, 400);
  ctx.save();
  ctx.translate(x, 344);
  wrapText(ctx, exhibit.body, bodyWidth, 34, 10);
  ctx.restore();

  drawPageFooter(ctx, exhibit, x, 736, bodyWidth, palette);
}

function drawDarkModelPage(ctx, width, height, exhibit, palette) {
  pageShell(ctx, width, height, palette);
  drawMeta(ctx, width, exhibit, palette);

  ctx.fillStyle = palette.accent;
  setFont(ctx, '"JetBrains Mono"', 11, 500);
  drawTracked(ctx, exhibit.category.toUpperCase(), 64, 112, 1.4);

  const title = exhibit.title.toUpperCase();
  const titleSize = fitFont(ctx, title, '"JetBrains Mono"', 78, 488, 500);
  ctx.fillStyle = palette.ink;
  setFont(ctx, '"JetBrains Mono"', titleSize, 500);
  ctx.fillText(title, 64, 210);

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 248.5);
  ctx.lineTo(552, 248.5);
  ctx.stroke();

  ctx.fillStyle = palette.muted;
  setFont(ctx, '"JetBrains Mono"', 18, 400);
  ctx.save();
  ctx.translate(64, 304);
  wrapText(ctx, exhibit.body, 488, 31, 7);
  ctx.restore();

  drawPageFooter(ctx, exhibit, 64, 606, 488, palette);

  const vp = { x: 620, y: 170, w: 916, h: 596 };
  ctx.fillStyle = "rgba(2, 2, 1, 0.4)";
  ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
  ctx.strokeStyle = "rgba(241, 233, 221, 0.14)";
  ctx.strokeRect(vp.x - 0.5, vp.y - 0.5, vp.w + 1, vp.h + 1);

  ctx.fillStyle = palette.faint;
  setFont(ctx, '"JetBrains Mono"', 10, 400);
  drawTracked(ctx, "LIVE RENDER", vp.x, vp.y - 14, 1.4);

  const corners = [
    [vp.x + 14, vp.y + 14, 1, 1],
    [vp.x + vp.w - 14, vp.y + 14, -1, 1],
    [vp.x + 14, vp.y + vp.h - 14, 1, -1],
    [vp.x + vp.w - 14, vp.y + vp.h - 14, -1, -1],
  ];
  ctx.strokeStyle = "rgba(223, 173, 120, 0.5)";
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x, y + sy * 14);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 14, y);
    ctx.stroke();
  }

  return {
    inset: {
      x: vp.x,
      y: vp.y,
      width: vp.w,
      height: vp.h,
    },
  };
}

/**
 * Optional local images can be dropped into an exhibit with `image: "assets/..."`.
 * Generated art remains the fallback when no image is supplied.
 */
export async function preloadExhibitImages(exhibits) {
  await Promise.all(
    exhibits.map(
      (exhibit) =>
        new Promise((resolve) => {
          if (!exhibit.image) {
            resolve();
            return;
          }
          const image = new Image();
          image.onload = () => {
            exhibit._image = image;
            resolve();
          };
          image.onerror = () => resolve();
          image.src = exhibit.image;
        })
    )
  );
}

export async function loadPageFonts() {
  if (!document.fonts?.ready) return;
  await document.fonts.ready;
  try {
    await Promise.all([
      document.fonts.load('400 18px "JetBrains Mono"'),
      document.fonts.load('500 88px "JetBrains Mono"'),
      document.fonts.load('500 15px "JetBrains Mono"'),
    ]);
  } catch {
    // The system fallbacks are fine if the local font files are unavailable.
  }
}

export function createExhibitPage(exhibit) {
  const size = PAGE[exhibit.format] || PAGE.landscape;
  const width = size.width;
  const height = size.height;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const palette = PALETTES[exhibit.theme] || PALETTES.paper;

  if (exhibit.format === "portrait") {
    drawPortraitPage(ctx, width, height, exhibit, palette);
  } else {
    drawLandscapePage(ctx, width, height, exhibit, palette);
  }

  return {
    canvas,
    width,
    height,
  };
}
