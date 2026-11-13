import * as THREE from "three";
import { CATEGORIES, EXHIBITS, HOME, WALKABLE, WING } from "./exhibits.js";
import { loadPageFonts, preloadExhibitImages } from "./art.js";
import { buildScreens } from "./screens.js";
import { Player } from "./player.js";
import { LOW_POWER, MAX_RENDER_PIXELS, PIXEL_RATIO_CAP } from "./quality.js";

const COLORS = {
  fog: 0x04060a,
};

const SPAWN = {
  x: HOME.startX,
  z: 9.8,
  yaw: 0,
  pitch: 0.04,
};

const HALL_DEPTH = 26.0;

const DESK = {
  width: 6.0,
  depth: 1.2,
  top: 1.0,
  z: HALL_DEPTH - 8.65,
};

const PROJECTION = {
  width: 5.8,
  height: 2.9,
  centerY: 2.9,
  z: HALL_DEPTH - 0.015,
};

const FURNITURE = [
  { minX: -3.1, maxX: 3.1, minZ: DESK.z - 0.65, maxZ: DESK.z + 0.65 },
  { minX: 3.2, maxX: 3.9, minZ: DESK.z - 0.7, maxZ: DESK.z + 0.05 },
];

const HALL_WALKABLE = WALKABLE.map((rect) =>
  rect.minX === -HOME.width / 2 &&
  rect.maxX === HOME.width / 2 &&
  rect.minZ === HOME.wall / 2
    ? { ...rect, maxZ: HALL_DEPTH }
    : rect
);

const SUN_POSITION = new THREE.Vector3(-12.6, 4.6, -60);
const SUN_RADIUS = 8.0;
const STAR_EXCLUSION = THREE.MathUtils.degToRad(20);

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeCanvasTexture(canvas, { srgb = true, repeat = null } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function makeGlowTexture(inner = "rgba(255,255,255,1)") {
  const canvas = createCanvas(128, 128);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.18, "rgba(255,255,255,0.62)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.13)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return makeCanvasTexture(canvas);
}

function box(width, height, depth, material, x, y, z, { cast = false, receive = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function makeCategorySign(category) {
  const width = 1450;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Backlit white panel with a faint LED grid.
  ctx.fillStyle = "#dbe5f0";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(12, 18, 26, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 7) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.fillStyle = "#081018";
  ctx.font = '600 26px "JetBrains Mono"';
  ctx.fillText(category.number, 42, 52);

  ctx.fillStyle = "#081018";
  const title = category.title.toUpperCase();
  let size = 96;
  do {
    ctx.font = `600 ${size}px "JetBrains Mono"`;
    if (ctx.measureText(title).width <= width - 84) break;
    size -= 4;
  } while (size > 36);
  ctx.fillText(title, 40, 172);

  ctx.fillStyle = category.accent;
  ctx.fillRect(40, 204, 210, 5);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* -- The hello-world monitor ----------------------------------------------- */

function makeMonitorTexture() {
  const width = 2048;
  const height = 1024;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // A green-phosphor terminal, still saying hello world — now as block ASCII.
  const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.66);
  bg.addColorStop(0, "#07120b");
  bg.addColorStop(0.65, "#030a06");
  bg.addColorStop(1, "#010402");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const dim = "#7bd79b";
  const mid = "#b6ffcf";
  const bright = "#edfff3";

  ctx.font = '500 22px "JetBrains Mono"';
  ctx.fillStyle = dim;
  ctx.fillText("MATEI@MUSEUM — TTY 01", 120, 78);
  ctx.textAlign = "right";
  ctx.fillText("80 × 24", width - 120, 78);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(107, 216, 148, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(120, 100.5);
  ctx.lineTo(width - 120, 100.5);
  ctx.stroke();

  ctx.font = '400 30px "JetBrains Mono"';
  const prompt = "matei@museum:~$ ";
  const promptWidth = ctx.measureText(prompt).width;
  ctx.fillStyle = dim;
  ctx.fillText(prompt, 120, 180);
  ctx.fillStyle = bright;
  ctx.fillText('echo "hello world"', 120 + promptWidth, 180);

  const glyphs = {
    H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    W: ["10001", "10001", "10001", "10001", "10001", "10101", "01010"],
    R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  };

  const text = "HELLO WORLD";
  const cell = 28;
  const gap = 3;
  let columns = 0;
  for (let i = 0; i < text.length; i += 1) {
    columns += text[i] === " " ? 4 : 5;
    if (i < text.length - 1) columns += 1;
  }

  const startX = (width - columns * cell) / 2;
  const startY = 270;

  ctx.save();
  ctx.fillStyle = bright;
  ctx.shadowColor = "rgba(87, 255, 151, 0.5)";
  ctx.shadowBlur = 18;
  let column = 0;
  for (const character of text) {
    if (character === " ") {
      column += 5;
      continue;
    }
    const glyph = glyphs[character];
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (glyph[row][col] === "1") {
          ctx.fillRect(
            startX + (column + col) * cell + gap / 2,
            startY + row * cell + gap / 2,
            cell - gap,
            cell - gap
          );
        }
      }
    }
    column += 6;
  }
  ctx.restore();

  ctx.font = '400 30px "JetBrains Mono"';
  ctx.fillStyle = dim;
  ctx.fillText(prompt, 120, 700);
  ctx.fillStyle = mid;
  ctx.fillRect(120 + promptWidth, 674, 16, 30);

  ctx.font = '400 18px "JetBrains Mono"';
  ctx.fillStyle = "#3f8a5f";
  ctx.fillText("[ ok ] session attached · scrollback 0", 120, 940);
  ctx.textAlign = "right";
  ctx.fillText("UTC · 60 Hz", width - 120, 940);
  ctx.textAlign = "left";

  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, width * 0.62);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000000";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();

  return makeCanvasTexture(canvas);
}

function makeMonitorMaterial(texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec3 color = texture2D(uMap, vUv).rgb;
        float scan = 0.985 + 0.015 * sin(vUv.y * 1500.0 + uTime * 4.0);
        color *= scan;
        color *= 1.0 + sin(uTime * 0.5) * 0.008;
        gl_FragColor = vec4(color * 1.08, 1.0);
      }
    `,
    toneMapped: false,
  });
}

/* -- Desk, PC and projector ------------------------------------------------ */

function makeMotherboardTexture() {
  const width = 768;
  const height = 512;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#0d342a");
  base.addColorStop(1, "#071e18");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  let seed = 7719;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  ctx.lineCap = "round";
  for (let i = 0; i < 90; i += 1) {
    let x = random() * width;
    let y = random() * height;
    ctx.strokeStyle = i % 4 === 0 ? "rgba(154, 226, 186, 0.2)" : "rgba(69, 170, 132, 0.24)";
    ctx.lineWidth = random() > 0.8 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j += 1) {
      x += (random() - 0.5) * 130;
      y += (random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 180; i += 1) {
    ctx.fillStyle = "rgba(150, 226, 184, 0.24)";
    ctx.fillRect(random() * width, random() * height, 2, 2);
  }

  const block = (x, y, w, h, color, stroke = "rgba(0,0,0,0.5)") => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };

  // CPU socket and VRM.
  block(176, 164, 166, 166, "#0a1915");
  block(192, 180, 134, 134, "#142822");
  for (let i = 0; i < 8; i += 1) {
    block(176 + i * 21, 118, 16, 34, "#1b2a28");
  }
  block(88, 190, 72, 118, "#1c2b2c");

  // Chipset and M.2 heatsink.
  block(540, 334, 116, 96, "#1b2b2d");
  block(438, 72, 236, 38, "#162522");
  ctx.fillStyle = "#327c66";
  ctx.fillRect(448, 82, 44, 18);

  // RAM slots.
  for (let i = 0; i < 4; i += 1) {
    block(454 + i * 34, 160, 18, 236, "#0b1518");
    ctx.fillStyle = "rgba(102, 198, 158, 0.35)";
    ctx.fillRect(459 + i * 34, 168, 8, 220);
  }

  // PCIe slots.
  block(80, 410, 330, 22, "#0b1518");
  block(80, 454, 330, 22, "#0b1518");
  ctx.fillStyle = "#7cc7f2";
  ctx.fillRect(86, 416, 300, 3);

  ctx.fillStyle = "#8fe6c0";
  ctx.font = '500 15px "JetBrains Mono"';
  ctx.fillText("CPU", 208, 352);
  ctx.fillText("DDR5", 552, 142);
  ctx.fillText("PCIe 5.0", 96, 404);
  ctx.fillText("M.2", 446, 68);

  // Screw holes and capacitors.
  for (const [x, y] of [[48, 48], [720, 48], [48, 464], [720, 464]]) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#0a1513";
    ctx.fill();
    ctx.strokeStyle = "#3f7563";
    ctx.stroke();
  }
  for (let i = 0; i < 22; i += 1) {
    ctx.beginPath();
    ctx.arc(96 + random() * 560, 100 + random() * 360, 5 + random() * 5, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? "#2b4a50" : "#18282b";
    ctx.fill();
  }

  return makeCanvasTexture(canvas);
}

function makeFanTexture() {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#091016";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(125, 174, 205, 0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, size - 12, size - 12);

  const cx = size / 2;
  const cy = size / 2;
  const radius = 108;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#071017";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 7; i += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 7) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.bezierCurveTo(48, -34, 86, -30, radius - 4, -10);
    ctx.lineTo(radius - 12, 18);
    ctx.bezierCurveTo(88, 34, 48, 22, 18, 12);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "#344652" : "#2b3b46";
    ctx.fill();
    ctx.strokeStyle = "rgba(8, 13, 18, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, 108, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(124, 199, 242, 0.7)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = "#111d25";
  ctx.fill();
  ctx.strokeStyle = "rgba(124, 199, 242, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (const [x, y] of [[20, 20], [236, 20], [20, 236], [236, 236]]) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#2a3842";
    ctx.fill();
  }

  return makeCanvasTexture(canvas);
}

function makePcLabelTexture(text, color = "#9fe8ff") {
  const width = 256;
  const height = 64;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.font = '700 30px "JetBrains Mono"';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(text, width / 2, height / 2 + 1);
  return makeCanvasTexture(canvas);
}

function buildDesk(scene, materials) {
  const wood = new THREE.MeshBasicMaterial({ color: 0x4a3426 });
  const woodDark = new THREE.MeshBasicMaterial({ color: 0x33241b });
  const caseMaterial = new THREE.MeshBasicMaterial({ color: 0x1b2630 });
  const component = new THREE.MeshBasicMaterial({ color: 0x2b3843 });
  const pcb = new THREE.MeshBasicMaterial({ color: 0x103a2f });
  const copper = new THREE.MeshBasicMaterial({ color: 0xb8783e });
  const accent = new THREE.MeshBasicMaterial({ color: 0x7cc7f2, toneMapped: false });
  const red = new THREE.MeshBasicMaterial({ color: 0xb95d4e });
  const blueCable = new THREE.MeshBasicMaterial({ color: 0x286a8c });
  const cableMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0e12 });
  const fanMaterial = new THREE.MeshBasicMaterial({
    map: makeFanTexture(),
    toneMapped: false,
  });
  const boardMaterial = new THREE.MeshBasicMaterial({
    map: makeMotherboardTexture(),
    toneMapped: false,
  });

  // A simple desk along the rear wall.
  scene.add(box(DESK.width, 0.1, DESK.depth, wood, 0, DESK.top - 0.05, DESK.z));
  for (const side of [-1, 1]) {
    scene.add(box(0.08, 0.95, 1.0, woodDark, side * (DESK.width / 2 - 0.08), 0.475, DESK.z));
  }
  scene.add(box(DESK.width - 0.4, 0.42, 0.06, woodDark, 0, 0.55, DESK.z + 0.55));

  const drawerX = 1.6;
  scene.add(box(1.2, 0.72, 1.0, woodDark, drawerX, 0.36, DESK.z));
  for (const y of [0.56, 0.24]) {
    scene.add(box(1.08, 0.3, 0.02, wood, drawerX, y, DESK.z - 0.51));
    scene.add(box(0.42, 0.025, 0.03, materials.steel, drawerX, y + 0.04, DESK.z - 0.525));
  }

  // A simple backless wooden chair beside the right end of the desk.
  const chair = new THREE.Group();
  chair.position.set(3.55, 0, DESK.z - 0.35);
  scene.add(chair);
  chair.add(box(0.56, 0.06, 0.56, wood, 0, 0.52, 0));
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.22, 0.22]) {
      chair.add(box(0.055, 0.5, 0.055, woodDark, x, 0.25, z));
    }
  }
  chair.add(box(0.44, 0.04, 0.04, woodDark, 0, 0.18, -0.22));
  chair.add(box(0.44, 0.04, 0.04, woodDark, 0, 0.18, 0.22));
  chair.add(box(0.04, 0.04, 0.44, woodDark, -0.22, 0.18, 0));
  chair.add(box(0.04, 0.04, 0.44, woodDark, 0.22, 0.18, 0));

  // Open PC on the left.
  const pc = new THREE.Group();
  pc.position.set(-1.0, DESK.top, DESK.z + 0.1);
  scene.add(pc);

  const addLabel = (text, color, x, y, z, width, height) => {
    const material = new THREE.MeshBasicMaterial({
      map: makePcLabelTexture(text, color),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.rotation.y = Math.PI;
    mesh.position.set(x, y, z);
    pc.add(mesh);
  };

  pc.add(box(1.3, 0.04, 0.7, caseMaterial, 0, 0.02, 0));
  pc.add(box(1.3, 0.03, 0.7, caseMaterial, 0, 0.95, 0));
  pc.add(box(1.3, 0.95, 0.03, caseMaterial, 0, 0.475, 0.335));
  pc.add(box(0.03, 0.95, 0.7, caseMaterial, -0.635, 0.475, 0));
  pc.add(box(1.34, 0.045, 0.045, materials.steel, 0, 0.94, -0.34));
  pc.add(box(1.34, 0.045, 0.045, materials.steel, 0, 0.02, -0.34));
  pc.add(box(0.045, 0.92, 0.045, materials.steel, -0.655, 0.48, -0.34));
  pc.add(box(0.045, 0.92, 0.045, materials.steel, 0.655, 0.48, -0.34));
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.28, 0.28]) pc.add(box(0.08, 0.03, 0.08, caseMaterial, x, 0.01, z));
  }

  // Motherboard and its textured face.
  pc.add(box(1.14, 0.74, 0.03, pcb, 0, 0.5, 0.315));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.72), boardMaterial);
  board.rotation.y = Math.PI;
  board.position.set(0, 0.5, 0.288);
  pc.add(board);

  // Board-level detail: VRM heatsinks, chipset, M.2 shield, connectors,
  // battery, capacitors, PCIe slots and front-panel headers.
  pc.add(box(0.12, 0.2, 0.035, materials.steel, -0.43, 0.72, 0.27));
  for (let i = 0; i < 4; i += 1) {
    pc.add(box(0.08, 0.012, 0.012, caseMaterial, -0.43, 0.64 + i * 0.04, 0.25));
  }
  pc.add(box(0.26, 0.06, 0.035, materials.steel, -0.22, 0.875, 0.27));
  for (let i = 0; i < 5; i += 1) {
    pc.add(box(0.015, 0.02, 0.012, materials.steel, -0.32 + i * 0.05, 0.845, 0.25));
  }
  pc.add(box(0.18, 0.13, 0.035, materials.steel, 0.38, 0.3, 0.27));
  pc.add(box(0.16, 0.01, 0.012, accent, 0.38, 0.36, 0.25));
  pc.add(box(0.3, 0.055, 0.025, materials.steel, 0.02, 0.58, 0.27));
  pc.add(box(0.28, 0.008, 0.01, accent, 0.02, 0.605, 0.253));
  pc.add(box(0.05, 0.22, 0.05, caseMaterial, 0.52, 0.55, 0.27));
  pc.add(box(0.04, 0.18, 0.006, accent, 0.52, 0.55, 0.242));
  pc.add(box(0.09, 0.04, 0.045, caseMaterial, 0.08, 0.86, 0.27));
  pc.add(box(0.06, 0.02, 0.02, accent, 0.08, 0.86, 0.246));
  for (const [x, y] of [
    [-0.06, 0.7],
    [0.02, 0.72],
    [0.1, 0.7],
    [0.46, 0.68],
    [-0.06, 0.53],
    [0.12, 0.52],
  ]) {
    const capacitor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.04, 8),
      copper
    );
    capacitor.rotation.x = Math.PI / 2;
    capacitor.position.set(x, y, 0.27);
    pc.add(capacitor);
  }
  pc.add(box(0.16, 0.02, 0.02, red, 0.48, 0.22, 0.27));
  pc.add(box(0.16, 0.02, 0.02, red, 0.48, 0.18, 0.27));
  for (let i = 0; i < 4; i += 1) {
    pc.add(box(0.03, 0.02, 0.02, i === 0 ? red : accent, 0.28 + i * 0.035, 0.1, 0.27));
  }
  pc.add(box(0.3, 0.025, 0.02, materials.steel, -0.05, 0.2, 0.27));
  pc.add(box(0.3, 0.025, 0.02, materials.steel, -0.05, 0.15, 0.27));

  // CPU socket, cooler and fan.
  pc.add(box(0.26, 0.04, 0.26, component, -0.24, 0.64, 0.285));
  pc.add(box(0.22, 0.03, 0.22, materials.steel, -0.24, 0.665, 0.285));
  for (let i = 0; i < 7; i += 1) {
    pc.add(box(0.32, 0.012, 0.24, materials.steel, -0.24, 0.61 + i * 0.04, 0.17));
  }
  pc.add(box(0.32, 0.02, 0.24, caseMaterial, -0.24, 0.59, 0.17));
  pc.add(box(0.32, 0.02, 0.24, caseMaterial, -0.24, 0.9, 0.17));
  for (const x of [-0.33, -0.15]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.32, 8), copper);
    pipe.position.set(x, 0.75, 0.19);
    pc.add(pipe);
  }
  const cpuFan = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), fanMaterial);
  cpuFan.rotation.y = Math.PI;
  cpuFan.position.set(-0.24, 0.74, 0.03);
  pc.add(cpuFan);
  pc.add(box(0.32, 0.02, 0.24, materials.steel, -0.24, 0.915, 0.17));
  for (const x of [-0.33, -0.15]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.02, 8), copper);
    cap.position.set(x, 0.925, 0.19);
    pc.add(cap);
  }
  const cpuRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.007, 6, 24), accent);
  cpuRing.position.set(-0.24, 0.74, 0.045);
  pc.add(cpuRing);
  const cpuHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.018, 12),
    caseMaterial
  );
  cpuHub.rotation.x = Math.PI / 2;
  cpuHub.position.set(-0.24, 0.74, 0.045);
  pc.add(cpuHub);

  // RAM.
  for (const x of [0.23, 0.3, 0.37, 0.44]) {
    pc.add(box(0.04, 0.34, 0.03, component, x, 0.64, 0.28));
    pc.add(box(0.04, 0.04, 0.035, accent, x, 0.82, 0.28));
    pc.add(box(0.04, 0.015, 0.032, materials.steel, x, 0.47, 0.28));
  }

  // Vertical GPU with two fans.
  pc.add(box(0.86, 0.24, 0.08, component, 0.02, 0.33, 0.13));
  pc.add(box(0.86, 0.02, 0.08, materials.steel, 0.02, 0.46, 0.13));
  for (const x of [-0.2, 0.24]) {
    const fan = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.21), fanMaterial);
    fan.rotation.y = Math.PI;
    fan.position.set(x, 0.33, 0.075);
    pc.add(fan);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.006, 6, 24), accent);
    ring.position.set(x, 0.33, 0.096);
    pc.add(ring);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.014, 12),
      caseMaterial
    );
    hub.rotation.x = Math.PI / 2;
    hub.position.set(x, 0.33, 0.096);
    pc.add(hub);
  }
  pc.add(box(0.025, 0.28, 0.08, materials.steel, -0.46, 0.33, 0.13));
  for (const y of [0.27, 0.33, 0.39]) {
    pc.add(box(0.012, 0.02, 0.03, caseMaterial, -0.477, y, 0.16));
  }
  pc.add(box(0.025, 0.2, 0.025, materials.steel, 0.44, 0.125, 0.13));
  pc.add(box(0.08, 0.02, 0.08, materials.steel, 0.44, 0.03, 0.13));
  pc.add(box(0.05, 0.025, 0.025, caseMaterial, 0.27, 0.46, 0.11));
  pc.add(box(0.05, 0.025, 0.025, caseMaterial, 0.34, 0.46, 0.11));
  pc.add(box(0.04, 0.008, 0.005, accent, 0.305, 0.475, 0.11));
  pc.add(box(0.86, 0.012, 0.01, accent, 0.02, 0.455, 0.18));
  pc.add(box(0.12, 0.03, 0.03, red, 0.37, 0.405, 0.18));

  // PSU and storage.
  pc.add(box(0.72, 0.2, 0.32, caseMaterial, -0.08, 0.12, 0.1));
  pc.add(box(0.22, 0.04, 0.02, accent, -0.08, 0.12, 0.27));
  const psuFan = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), fanMaterial);
  psuFan.rotation.y = Math.PI;
  psuFan.position.set(-0.08, 0.12, 0.268);
  pc.add(psuFan);
  const psuRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.006, 6, 24), accent);
  psuRing.position.set(-0.08, 0.12, 0.282);
  pc.add(psuRing);
  const psuHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.014, 12),
    caseMaterial
  );
  psuHub.rotation.x = Math.PI / 2;
  psuHub.position.set(-0.08, 0.12, 0.282);
  pc.add(psuHub);
  pc.add(box(0.22, 0.05, 0.14, component, 0.34, 0.12, 0.22));
  pc.add(box(0.22, 0.05, 0.14, component, 0.34, 0.18, 0.22));
  pc.add(box(0.16, 0.01, 0.02, accent, 0.34, 0.15, 0.292));
  pc.add(box(0.3, 0.05, 0.16, component, 0.45, 0.06, 0.14));
  pc.add(box(0.26, 0.008, 0.02, accent, 0.45, 0.09, 0.225));

  // Rear exhaust fan.
  const caseFan = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), fanMaterial);
  caseFan.rotation.y = Math.PI;
  caseFan.position.set(0.48, 0.74, 0.3);
  pc.add(caseFan);
  const caseRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.006, 6, 24), accent);
  caseRing.position.set(0.48, 0.74, 0.316);
  pc.add(caseRing);
  const caseHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.014, 12),
    caseMaterial
  );
  caseHub.rotation.x = Math.PI / 2;
  caseHub.position.set(0.48, 0.74, 0.316);
  pc.add(caseHub);

  // Front I/O and case screws.
  const powerButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16),
    accent
  );
  powerButton.rotation.x = Math.PI / 2;
  powerButton.position.set(0.4, 0.9, -0.365);
  pc.add(powerButton);
  pc.add(box(0.04, 0.018, 0.012, materials.steel, 0.32, 0.89, -0.365));
  pc.add(box(0.04, 0.018, 0.012, materials.steel, 0.26, 0.89, -0.365));
  const audioJack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12),
    caseMaterial
  );
  audioJack.rotation.x = Math.PI / 2;
  audioJack.position.set(0.2, 0.89, -0.365);
  pc.add(audioJack);
  pc.add(box(0.24, 0.012, 0.008, accent, 0, 0.91, -0.365));
  for (const [x, y] of [
    [-0.58, 0.9],
    [0.58, 0.9],
    [-0.58, 0.05],
    [0.58, 0.05],
  ]) {
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.008, 8),
      materials.steel
    );
    screw.rotation.x = Math.PI / 2;
    screw.position.set(x, y, -0.365);
    pc.add(screw);
  }

  addLabel("RTX", "#9fe8ff", 0.4, 0.4, 0.096, 0.1, 0.03);
  addLabel("850W", "#9fe8ff", 0.16, 0.13, 0.272, 0.18, 0.045);

  // Cables.
  const wire = (points, radius = 0.012, material = cableMaterial) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    );
    pc.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 5, false), material));
  };
  wire([[-0.1, 0.22, 0.25], [0.02, 0.35, 0.3], [0.15, 0.48, 0.3]]);
  wire([[-0.05, 0.2, 0.2], [0.0, 0.35, 0.1], [0.03, 0.5, 0.08]]);
  wire([[-0.1, 0.2, 0.15], [-0.3, 0.28, 0.24], [-0.4, 0.55, 0.3]]);
  wire([[-0.08, 0.22, 0.26], [0.2, 0.34, 0.31], [0.46, 0.45, 0.3]], 0.014, blueCable);
  wire([[-0.08, 0.22, 0.16], [0.2, 0.2, 0.26], [0.46, 0.1, 0.26]], 0.01, blueCable);
  wire([[0.5, 0.88, -0.3], [0.6, 0.6, -0.08], [0.56, 0.2, 0.24]], 0.006, cableMaterial);
  pc.add(box(0.06, 0.018, 0.03, accent, 0.16, 0.34, 0.3));
  pc.add(box(0.06, 0.018, 0.03, accent, 0.3, 0.42, 0.3));
  pc.add(box(0.025, 0.025, 0.01, accent, 0.55, 0.9, -0.36));

  // Projector on the right.
  const projector = new THREE.Group();
  projector.position.set(1.5, DESK.top, DESK.z + 0.3);
  scene.add(projector);
  projector.add(box(0.66, 0.2, 0.42, caseMaterial, 0, 0.13, 0));
  projector.add(box(0.6, 0.02, 0.32, caseMaterial, 0, 0.24, -0.02));
  projector.add(box(0.26, 0.06, 0.02, component, 0, 0.13, -0.215));
  for (const x of [-0.24, -0.15, 0.15, 0.24]) {
    projector.add(box(0.05, 0.02, 0.02, materials.steel, x, 0.08, -0.216));
  }
  for (const x of [-0.55, 0.55]) {
    projector.add(box(0.08, 0.03, 0.08, caseMaterial, x, 0.015, -0.15));
  }

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.06, 20),
    new THREE.MeshBasicMaterial({ color: 0x17384a })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.13, 0.225);
  projector.add(lens);

  const lensGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture("rgba(170,235,255,1)"),
      color: 0x9fe8ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  lensGlow.position.set(0, 0.13, 0.255);
  lensGlow.scale.set(0.3, 0.3, 1);
  projector.add(lensGlow);
  projector.add(box(0.025, 0.018, 0.01, accent, 0.24, 0.23, -0.19));

  // Faint beam from the lens to the projected image.
  const bottom = PROJECTION.centerY - PROJECTION.height / 2;
  const top = PROJECTION.centerY + PROJECTION.height / 2;
  const lensWorld = new THREE.Vector3(1.5, DESK.top + 0.13, DESK.z + 0.3 + 0.255);
  const corners = [
    new THREE.Vector3(-PROJECTION.width / 2, bottom, PROJECTION.z),
    new THREE.Vector3(PROJECTION.width / 2, bottom, PROJECTION.z),
    new THREE.Vector3(PROJECTION.width / 2, top, PROJECTION.z),
    new THREE.Vector3(-PROJECTION.width / 2, top, PROJECTION.z),
  ];
  const beamPositions = [];
  for (let i = 0; i < 4; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    beamPositions.push(
      lensWorld.x, lensWorld.y, lensWorld.z,
      a.x, a.y, a.z,
      b.x, b.y, b.z
    );
  }
  const beamGeometry = new THREE.BufferGeometry();
  beamGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(beamPositions, 3)
  );
  scene.add(new THREE.Mesh(
    beamGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x8fe6b0,
      transparent: true,
      opacity: 0.022,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  ));
}

/* -- Architecture ----------------------------------------------------------- */

function makeMaterials() {
  return {
    // Flat colours only: no wall or floor textures, no lighting response.
    wall: new THREE.MeshBasicMaterial({ color: 0x141b24 }),
    metal: new THREE.MeshBasicMaterial({ color: 0x0a0d12 }),
    steel: new THREE.MeshBasicMaterial({ color: 0x4f6070 }),
    ceiling: new THREE.MeshBasicMaterial({ color: 0x0a0e13 }),
    floor: new THREE.MeshBasicMaterial({ color: 0x080b10 }),
    glass: new THREE.MeshBasicMaterial({
      color: 0xbcd2e6,
      transparent: true,
      opacity: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    signFrame: new THREE.MeshBasicMaterial({ color: 0x04060a, toneMapped: false }),
  };
}

function addWindow(scene, materials, {
  width,
  height,
  x,
  y,
  z,
  rotationY = 0,
  glow = true,
}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;

  const post = 0.075;
  const depth = 0.2;
  const railWidth = width + post * 2 - 0.04;
  const railDepth = depth + 0.02;
  group.add(box(post, height + 0.16, depth, materials.metal, -width / 2 - post / 2, 0, 0));
  group.add(box(post, height + 0.16, depth, materials.metal, width / 2 + post / 2, 0, 0));
  group.add(box(railWidth, post, railDepth, materials.metal, 0, height / 2 + post / 2, 0));
  group.add(box(railWidth, post, railDepth, materials.steel, 0, -height / 2 - post / 2, 0));

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    materials.glass
  );
  glass.position.z = 0.02;
  group.add(glass);

  scene.add(group);
  return group;
}

function buildHome(scene, materials) {
  const halfWidth = HOME.width / 2;
  const depth = HALL_DEPTH;
  const height = HOME.height;
  const wall = HOME.wall;
  const rearZ = depth + wall / 2;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HOME.width, depth), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, depth / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HOME.width, depth), materials.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, height, depth / 2);
  scene.add(ceiling);

  // Side walls with two observation windows each.
  const sideWindows = [
    { z: 3.0, width: 2.6, height: 3.0, bottom: 1.0 },
    { z: 8.0, width: 2.6, height: 3.0, bottom: 1.0 },
    { z: 13.4, width: 2.6, height: 3.0, bottom: 1.0 },
    { z: 18.8, width: 2.6, height: 3.0, bottom: 1.0 },
    { z: 23.2, width: 2.6, height: 3.0, bottom: 1.0 },
  ];
  const sideStart = depth / 2 - (depth + wall * 2) / 2;
  const sideEnd = depth / 2 + (depth + wall * 2) / 2;

  for (const side of [-1, 1]) {
    let segmentStart = sideStart;
    for (const opening of sideWindows) {
      const openingStart = opening.z - opening.width / 2;
      const openingEnd = opening.z + opening.width / 2;
      if (openingStart > segmentStart) {
        scene.add(box(wall, height, openingStart - segmentStart, materials.wall, side * (halfWidth + wall / 2), height / 2, (segmentStart + openingStart) / 2));
      }
      scene.add(box(wall, opening.bottom, opening.width, materials.wall, side * (halfWidth + wall / 2), opening.bottom / 2, opening.z));
      scene.add(box(wall, height - opening.bottom - opening.height, opening.width, materials.wall, side * (halfWidth + wall / 2), (height + opening.bottom + opening.height) / 2, opening.z));
      addWindow(scene, materials, {
        width: opening.width - 0.12,
        height: opening.height - 0.12,
        x: side * (halfWidth - 0.02),
        y: opening.bottom + opening.height / 2,
        z: opening.z,
        rotationY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
      });
      segmentStart = openingEnd;
    }
    if (segmentStart < sideEnd) {
      scene.add(box(wall, height, sideEnd - segmentStart, materials.wall, side * (halfWidth + wall / 2), height / 2, (segmentStart + sideEnd) / 2));
    }
  }

  // Rear wall with two real openings either side of the monitor.
  const windowX = 11.2;
  const windowWidth = 2.4;
  const windowBottom = 0.9;
  const windowHeight = 3.4;

  for (const [from, to] of [
    [-halfWidth - wall / 2, -windowX - windowWidth / 2],
    [-windowX + windowWidth / 2, windowX - windowWidth / 2],
    [windowX + windowWidth / 2, halfWidth + wall / 2],
  ]) {
    scene.add(box(to - from, height, wall, materials.wall, (from + to) / 2, height / 2, rearZ));
  }

  for (const side of [-1, 1]) {
    const x = side * windowX;
    scene.add(box(windowWidth, windowBottom, wall, materials.wall, x, windowBottom / 2, rearZ));
    scene.add(box(windowWidth, height - windowBottom - windowHeight, wall, materials.wall, x, (height + windowBottom + windowHeight) / 2, rearZ));
    addWindow(scene, materials, {
      width: windowWidth - 0.12,
      height: windowHeight - 0.12,
      x,
      y: windowBottom + windowHeight / 2,
      z: depth - 0.02,
      rotationY: Math.PI,
    });
  }

  // The terminal is projected onto the rear wall; the desk below carries the
  // projector and an open PC.
  const projectionMaterial = makeMonitorMaterial(makeMonitorTexture());
  projectionMaterial.transparent = true;
  projectionMaterial.blending = THREE.AdditiveBlending;
  projectionMaterial.depthWrite = false;
  projectionMaterial.needsUpdate = true;

  const projection = new THREE.Mesh(
    new THREE.PlaneGeometry(PROJECTION.width, PROJECTION.height),
    projectionMaterial
  );
  projection.position.set(0, PROJECTION.centerY, PROJECTION.z);
  projection.rotation.y = Math.PI;
  scene.add(projection);

  buildDesk(scene, materials);

  // Door wall.
  const doorZ = 0;
  let cursor = -halfWidth - wall / 2;
  const signTextures = new Map();

  for (const category of CATEGORIES) {
    const left = category.x - HOME.doorWidth / 2;
    const right = category.x + HOME.doorWidth / 2;

    if (left > cursor) {
      scene.add(box(left - cursor, height, wall, materials.wall, (cursor + left) / 2, height / 2, doorZ));
    }
    scene.add(box(HOME.doorWidth, height - HOME.doorHeight, wall, materials.wall, category.x, (HOME.doorHeight + height) / 2, doorZ));

    // Frame, sign and threshold. The frame overlaps the wall opening so no two
    // faces sit on the same plane.
    scene.add(box(0.12, HOME.doorHeight + 0.03, 0.46, materials.steel, category.x - HOME.doorWidth / 2 - 0.02, (HOME.doorHeight + 0.03) / 2, 0));
    scene.add(box(0.12, HOME.doorHeight + 0.03, 0.46, materials.steel, category.x + HOME.doorWidth / 2 + 0.02, (HOME.doorHeight + 0.03) / 2, 0));
    scene.add(box(HOME.doorWidth + 0.12, 0.16, 0.46, materials.steel, category.x, HOME.doorHeight - 0.04, 0));

    const signTexture = makeCategorySign(category);
    signTextures.set(category.key, signTexture);

    scene.add(box(2.98, 0.56, 0.08, materials.signFrame, category.x, 3.96, 0.14));
    const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.5), signMaterial);
    sign.position.set(category.x, 3.96, 0.19);
    scene.add(sign);

    cursor = right;
  }
  if (cursor < halfWidth + wall / 2) {
    scene.add(box(halfWidth + wall / 2 - cursor, height, wall, materials.wall, (cursor + halfWidth + wall / 2) / 2, height / 2, doorZ));
  }

  const floorLineMaterial = new THREE.LineBasicMaterial({
    color: 0x4c6278,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const floorVertices = [];
  for (let z = 1.4; z < depth - 0.4; z += 2.4) {
    floorVertices.push(-halfWidth + 0.1, 0.008, z, halfWidth - 0.1, 0.008, z);
  }
  for (let x = -14; x <= 14.01; x += 3.5) {
    floorVertices.push(x, 0.008, 0, x, 0.008, depth - 0.3);
  }
  const floorLines = new THREE.BufferGeometry();
  floorLines.setAttribute("position", new THREE.Float32BufferAttribute(floorVertices, 3));
  scene.add(new THREE.LineSegments(floorLines, floorLineMaterial));

  return { monitor: projection, monitorMaterial: projectionMaterial, signTextures };
}

function buildWings(scene, materials, signTextures) {
  const halfWing = WING.width / 2 + WING.wall / 2;
  const boundaries = CATEGORIES.map((category) => category.x - halfWing);
  boundaries.push(CATEGORIES[CATEGORIES.length - 1].x + halfWing);
  const floorVertices = [];

  for (const category of CATEGORIES) {
    const length = category.length;
    const x = category.x;

    // Continue the entrance-hall floor grid into the hallway.
    const halfFloor = WING.width / 2 - 0.1;
    for (let gz = 1.4; gz > -length; gz -= 2.4) {
      if (gz <= 0) {
        floorVertices.push(x - halfFloor, 0.008, gz, x + halfFloor, 0.008, gz);
      }
    }
    for (let gx = -14; gx <= 14.01; gx += 3.5) {
      if (Math.abs(gx - x) <= halfFloor) {
        floorVertices.push(gx, 0.008, 0, gx, 0.008, -length);
      }
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(WING.width, length), materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, -length / 2);
    scene.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(WING.width, length), materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(x, WING.height, -length / 2);
    scene.add(ceiling);

    // End wall with a single observation window.
    const endZ = -length - WING.wall / 2;
    const windowWidth = WING.endWindowWidth;
    const windowHeight = WING.endWindowHeight;
    const windowBottom = WING.endWindowBottom;

    scene.add(box(WING.width, windowBottom, WING.wall, materials.wall, x, windowBottom / 2, endZ));
    scene.add(box(WING.width, WING.height - windowBottom - windowHeight, WING.wall, materials.wall, x, (WING.height + windowBottom + windowHeight) / 2, endZ));
    const sideWidth = (WING.width - windowWidth) / 2;
    for (const side of [-1, 1]) {
      scene.add(box(sideWidth, windowHeight, WING.wall, materials.wall, x + side * (windowWidth / 2 + sideWidth / 2), windowBottom + windowHeight / 2, endZ));
    }
    addWindow(scene, materials, {
      width: windowWidth - 0.12,
      height: windowHeight - 0.12,
      x,
      y: windowBottom + windowHeight / 2,
      z: -length + 0.08,
      rotationY: 0,
    });

    // The category sign again, above the end window. Its texture is shared
    // with the doorway sign so it is only drawn once.
    const endSignTexture = signTextures.get(category.key) || makeCategorySign(category);
    scene.add(box(2.5, 0.46, 0.08, materials.signFrame, x, 3.86, -length + 0.05));
    const endSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.414),
      new THREE.MeshBasicMaterial({ map: endSignTexture, toneMapped: false })
    );
    endSign.position.set(x, 3.86, -length + 0.12);
    scene.add(endSign);
  }

  // One shared grid for every hallway floor, aligned with the entrance hall.
  const floorLineMaterial = new THREE.LineBasicMaterial({
    color: 0x4c6278,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const floorLines = new THREE.BufferGeometry();
  floorLines.setAttribute("position", new THREE.Float32BufferAttribute(floorVertices, 3));
  scene.add(new THREE.LineSegments(floorLines, floorLineMaterial));

  // Shared walls between the hallways, built once so no faces coincide.
  for (let index = 0; index < boundaries.length; index += 1) {
    const boundary = boundaries[index];
    let length;
    if (index === 0) length = CATEGORIES[0].length;
    else if (index === boundaries.length - 1) length = CATEGORIES[CATEGORIES.length - 1].length;
    else length = Math.max(CATEGORIES[index - 1].length, CATEGORIES[index].length);

    scene.add(box(WING.wall, WING.height, length, materials.wall, boundary, WING.height / 2, -length / 2));
  }
}

/* -- Space ------------------------------------------------------------------ */

function buildSpace(scene) {
  const group = new THREE.Group();
  group.name = "space";

  const glowTexture = makeGlowTexture("rgba(245,250,255,1)");

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(170, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {},
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vec3 d = normalize(vDirection);
          float band = sin(d.y * 7.0 + sin(d.x * 2.7) * 2.4) * 0.5 + 0.5;
          float dust = smoothstep(0.62, 1.0, sin(d.x * 9.0 + d.z * 6.0) * 0.5 + 0.5);
          vec3 color = mix(vec3(0.0012, 0.0019, 0.004), vec3(0.0034, 0.0062, 0.015), band * 0.3);
          color += vec3(0.01, 0.018, 0.04) * dust * 0.18;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  );
  sky.renderOrder = -100;
  group.add(sky);

  /**
   * Stars are small white triangles, not points. They are kept out of a wide
   * cone around the sun so the star itself stays the only thing there, and
   * their sizes stay small enough to read as grit rather than lamps.
   */
  const STAR_COUNT = 2200;
  const sunDirection = SUN_POSITION.clone().normalize();
  const exclusionDot = Math.cos(STAR_EXCLUSION);

  const starCentres = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  const starSizes = new Float32Array(STAR_COUNT);
  const starPhases = new Float32Array(STAR_COUNT);
  const starSpins = new Float32Array(STAR_COUNT);
  const random = Math.random;

  const TRIANGLE = [
    [0.0, 0.62],
    [-0.54, -0.36],
    [0.54, -0.36],
  ];

  let placed = 0;
  let attempts = 0;
  while (placed < STAR_COUNT && attempts < STAR_COUNT * 40) {
    attempts += 1;
    const radius = 90 + random() * 70;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const x = Math.sin(phi) * Math.cos(theta) * radius;
    const y = Math.cos(phi) * radius;
    const z = Math.sin(phi) * Math.sin(theta) * radius;

    const direction = new THREE.Vector3(x, y, z).normalize();
    if (direction.dot(sunDirection) > exclusionDot) continue;

    starCentres[placed * 3] = x;
    starCentres[placed * 3 + 1] = y;
    starCentres[placed * 3 + 2] = z;

    const brightness = Math.pow(random(), 3.2);
    starSizes[placed] = 0.3 + brightness * 1.05;

    // White, with the faintest blue lean. No yellow.
    const value = 0.55 + brightness * 0.45;
    starColors[placed * 3] = value * 0.93;
    starColors[placed * 3 + 1] = value * 0.97;
    starColors[placed * 3 + 2] = value;

    starPhases[placed] = random() * Math.PI * 2;
    starSpins[placed] = (random() - 0.5) * 0.8;
    placed += 1;
  }

  const starPositions = new Float32Array(9);
  const starBary = new Float32Array(9);
  for (let vertex = 0; vertex < 3; vertex += 1) {
    starPositions[vertex * 3] = TRIANGLE[vertex][0];
    starPositions[vertex * 3 + 1] = TRIANGLE[vertex][1];
    starPositions[vertex * 3 + 2] = 0;
    starBary[vertex * 3] = vertex === 0 ? 1 : 0;
    starBary[vertex * 3 + 1] = vertex === 1 ? 1 : 0;
    starBary[vertex * 3 + 2] = vertex === 2 ? 1 : 0;
  }

  const starGeometry = new THREE.InstancedBufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("aBary", new THREE.BufferAttribute(starBary, 3));
  starGeometry.setAttribute("aCentre", new THREE.InstancedBufferAttribute(starCentres, 3));
  starGeometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(starColors, 3));
  starGeometry.setAttribute("aSize", new THREE.InstancedBufferAttribute(starSizes, 1));
  starGeometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(starPhases, 1));
  starGeometry.setAttribute("aSpin", new THREE.InstancedBufferAttribute(starSpins, 1));
  starGeometry.instanceCount = placed;

  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute vec3 aCentre;
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpin;
      attribute vec3 aBary;
      varying vec3 vColor;
      varying vec3 vBary;
      varying float vTwinkle;

      void main() {
        vec4 view = modelViewMatrix * vec4(aCentre, 1.0);
        float angle = aSpin + uTime * 0.012;
        float s = sin(angle);
        float c = cos(angle);
        vec2 local = position.xy;
        vec2 rotated = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
        view.xy += rotated * aSize;
        gl_Position = projectionMatrix * view;

        vColor = aColor;
        vBary = aBary;
        vTwinkle = 0.68 + 0.32 * sin(uTime * (0.35 + fract(aPhase) * 1.4) + aPhase);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying vec3 vBary;
      varying float vTwinkle;

      void main() {
        float edge = min(min(vBary.x, vBary.y), vBary.z);
        float alpha = smoothstep(0.0, 0.34, edge);
        gl_FragColor = vec4(vColor * vTwinkle * 1.35, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });

  const stars = new THREE.Mesh(starGeometry, starMaterial);
  stars.frustumCulled = false;
  stars.renderOrder = -50;
  group.add(stars);

  /* -- A white star --------------------------------------------------------- */
  const sun = new THREE.Group();
  sun.position.copy(SUN_POSITION);
  sun.name = "sun";

  const sunMaterial = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normalize(mat3(modelMatrix) * normal);
        vObjectPosition = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
        float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
        float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
        float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
        float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
        float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
        float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
        float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z
        );
      }

      float fbm4(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * vnoise(p);
          p = p * 2.03 + vec3(7.1, 13.7, 3.9);
          amplitude *= 0.5;
        }
        return value;
      }

      float fbm3(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 3; i++) {
          value += amplitude * vnoise(p);
          p = p * 2.03 + vec3(7.1, 13.7, 3.9);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 n = normalize(vNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float mu = clamp(dot(n, viewDirection), 0.0, 1.0);

        vec3 p = normalize(vObjectPosition);
        float t = uTime;

        float cells = fbm4(p * 4.4 + vec3(0.0, t * 0.03, t * 0.012));
        float granule = fbm3(p * 24.0 + vec3(t * 0.05, 0.0, -t * 0.02));
        float grain = vnoise(p * 62.0 - vec3(0.0, t * 0.02, 0.0));

        float belt = exp(-pow((abs(p.y) - 0.44) * 4.2, 2.0));
        float spots = smoothstep(0.7, 0.8, fbm3(p * 3.3 + vec3(11.0, 0.0, 7.0))) * belt;

        float faculae = smoothstep(0.56, 0.94, granule * 0.72 + grain * 0.28);
        faculae *= pow(1.0 - mu, 2.2);

        float heat = 0.35 + cells * 0.76 + granule * 0.28 + grain * 0.12;
        heat -= spots * 0.5;
        heat += faculae * 0.3;

        // A blue star: deep blue lanes and bright cyan-blue cells.
        vec3 deep = vec3(0.03, 0.12, 0.45);
        vec3 body = vec3(0.12, 0.36, 0.95);
        vec3 bright = vec3(0.45, 0.68, 1.0);
        vec3 white = vec3(0.8, 0.9, 1.0);

        vec3 color = mix(deep, body, smoothstep(0.34, 0.72, heat));
        color = mix(color, bright, smoothstep(0.7, 0.95, heat));
        color = mix(color, white, smoothstep(0.98, 1.2, heat) * 0.55);

        float limb = pow(mu, 0.42);
        color *= 0.34 + 0.86 * limb;
        float rim = pow(1.0 - mu, 7.0);
        color += vec3(0.35, 0.6, 1.0) * rim * 0.9;

        gl_FragColor = vec4(color * 1.15, 1.0);
      }
    `,
  });

  const sunBody = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 64, 40), sunMaterial);
  sun.add(sunBody);

  const coronaMaterial = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: SUN_RADIUS * 6.6 },
    },
    vertexShader: /* glsl */ `
      uniform float uScale;
      varying vec2 vUv;
      void main() {
        vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        centre.xy += position.xy * uScale;
        gl_Position = projectionMatrix * centre;
        vUv = uv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise21(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm2(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 3; i++) {
          value += amplitude * noise21(p);
          p = p * 2.07 + vec2(3.1, 7.7);
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float angle = atan(p.y, p.x);

        float n = fbm2(vec2(cos(angle) * 2.2 + 4.0, sin(angle) * 2.2 + r * 3.6 - uTime * 0.055));
        float streaks = 0.55 + 0.45 * sin(angle * 19.0 + n * 9.0 + uTime * 0.12);
        float halo = exp(-r * 2.15);
        float streamer = pow(halo, 1.4) * (0.5 + 0.5 * n) * (0.6 + 0.4 * streaks);
        float core = smoothstep(0.46, 0.04, r);
        float alpha = clamp(core * 1.1 + streamer * 0.95, 0.0, 1.0) * smoothstep(1.0, 0.68, r);

        vec3 color = mix(vec3(0.08, 0.28, 0.85), vec3(0.6, 0.82, 1.0), halo);
        gl_FragColor = vec4(color * alpha * 1.7, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const corona = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coronaMaterial);
  corona.frustumCulled = false;
  sun.add(corona);

  const innerGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x8ec4ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    })
  );
  innerGlow.scale.set(16, 16, 1);
  sun.add(innerGlow);

  const haze = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x3f7fe8,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    })
  );
  haze.scale.set(44, 44, 1);
  sun.add(haze);

  group.add(sun);
  scene.add(group);

  return {
    group,
    sun,
    sunBody,
    sunMaterial,
    corona,
    coronaMaterial,
    innerGlow,
    haze,
    stars,
    starMaterial,
    update(time) {
      sunBody.rotation.y = time * 0.014;
      sunMaterial.uniforms.uTime.value = time;
      coronaMaterial.uniforms.uTime.value = time;
      innerGlow.material.opacity = 0.5 + Math.sin(time * 0.4) * 0.035;
      haze.material.opacity = 0.12 + Math.sin(time * 0.23) * 0.016;
      stars.rotation.y = time * 0.0009;
      starMaterial.uniforms.uTime.value = time;
    },
  };
}

/* -- World ------------------------------------------------------------------ */

export async function createWorld(canvas, hooks = {}) {
  await Promise.all([loadPageFonts(), preloadExhibitImages(EXHIBITS)]);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !LOW_POWER,
    powerPreference: "high-performance",
    alpha: false,
  });
  renderer.setPixelRatio(pixelRatioForViewport());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x020407, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020407);
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.011);

  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.06,
    240
  );
  camera.position.set(SPAWN.x, HOME.eyeHeight, SPAWN.z);
  camera.rotation.order = "YXZ";

  const materials = makeMaterials();
  const { screens, meshes, update: updateScreens, warmUp } = buildScreens(renderer, scene);

  const home = buildHome(scene, materials);
  buildWings(scene, materials, home.signTextures);
  const space = buildSpace(scene);

  // No scene lights. Every surface is unlit and the screens are the only
  // elaborate light sources, which is both the look and the budget.

  const player = new Player({
    camera,
    canvas,
    walkable: HALL_WALKABLE,
    obstacles: FURNITURE,
    eyeHeight: HOME.eyeHeight,
    startX: SPAWN.x,
    startZ: SPAWN.z,
    startYaw: SPAWN.yaw,
    startPitch: SPAWN.pitch,
  });

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  let target = null;
  let lastTargetId = null;
  let lastNearState = null;
  let elapsed = 0;
  let raf = 0;
  let disposed = false;
  let lastFrame = performance.now();

  // Warm everything while the loading overlay is still covering the canvas:
  // generate the pages near the spawn, compile every shader, upload every
  // texture and draw one frame. The visitor is only "spawned" after this.
  warmUp(camera.position);
  renderer.compile(scene, camera);
  scene.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      if (material.map) renderer.initTexture(material.map);
      if (material.uniforms) {
        for (const uniform of Object.values(material.uniforms)) {
          if (uniform?.value?.isTexture) renderer.initTexture(uniform.value);
        }
      }
    }
  });
  updateScreens(camera.position);
  updateScreenClose();
  renderer.render(scene, camera);
  await new Promise((resolve) => requestAnimationFrame(resolve));

  function pixelRatioForViewport() {
    const dpr = window.devicePixelRatio || 1;
    const cap = Math.min(dpr, PIXEL_RATIO_CAP);
    const budget = Math.sqrt(
      MAX_RENDER_PIXELS / Math.max(1, window.innerWidth * window.innerHeight)
    );
    return Math.max(0.25, Math.min(cap, budget));
  }

  function updateIdleCamera(time) {
    const yaw = SPAWN.yaw + Math.sin(time * 0.07) * 0.022;
    const pitch = SPAWN.pitch + Math.sin(time * 0.09) * 0.006;
    camera.rotation.set(pitch, yaw, 0);
    camera.position.set(SPAWN.x, HOME.eyeHeight, SPAWN.z);
  }

  function updateScreenClose() {
    for (const screen of screens) {
      const distance = camera.position.distanceTo(screen.position);
      screen.material.uniforms.uClose.value =
        1 - THREE.MathUtils.smoothstep(distance, 1.0, 2.2);
    }
  }

  function updateTarget(dt) {
    let next = null;
    if (player.active) {
      raycaster.far = 6.5;
      raycaster.setFromCamera(center, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length) {
        const hit = hits[0];
        const exhibit = hit.object.userData.exhibit;
        if (exhibit) {
          next = {
            screen: screens.find((screen) => screen.exhibit.id === exhibit.id),
            distance: hit.distance,
            exhibit,
          };
        }
      }
    }

    target = next;
    const targetId = next?.exhibit.id || null;
    const near = next ? next.distance <= 3.4 : null;
    if (targetId !== lastTargetId || near !== lastNearState) {
      lastTargetId = targetId;
      lastNearState = near;
      hooks.onTargetChange?.(next ? {
        number: next.exhibit.number,
        title: next.exhibit.title,
        category: next.exhibit.category,
        near,
        distance: next.distance,
      } : null);
    }

    for (const screen of screens) {
      const isTarget = next?.screen === screen;
      const uniform = screen.material.uniforms.uHighlight;
      const targetValue = isTarget ? 1 : 0;
      uniform.value += (targetValue - uniform.value) * (1 - Math.exp(-10 * dt));
    }
  }

  function render(now) {
    if (disposed) return;
    raf = requestAnimationFrame(render);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    elapsed += dt;

    if (!player.started) {
      updateIdleCamera(elapsed);
    } else {
      player.update(dt, elapsed);
    }

    updateTarget(dt);
    updateScreens(camera.position);
    updateScreenClose();

    space.update(elapsed);
    home.monitorMaterial.uniforms.uTime.value = elapsed;
    for (const screen of screens) {
      screen.material.uniforms.uTime.value = elapsed;
      const reveal = screen.material.uniforms.uReveal;
      reveal.value += (1 - reveal.value) * (1 - Math.exp(-5 * dt));
    }

    renderer.render(scene, camera);
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(pixelRatioForViewport());
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!raf) renderer.render(scene, camera);
  }

  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", () => {
    lastFrame = performance.now();
  });

  hooks.onReady?.();

  return {
    renderer,
    scene,
    camera,
    player,
    screens,
    space,
    home,
    startLoop() {
      if (!raf) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(render);
      }
    },
    stopLoop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    setPose({ x = player.position.x, z = player.position.z, yaw = player.yaw, pitch = player.pitch } = {}) {
      player.position.x = x;
      player.position.z = z;
      player.yaw = yaw;
      player.pitch = pitch;
      player.started = true;
      player.active = true;
      player.applyPose();
    },
    resetToSpawn() {
      player.pause();
      player.position.set(SPAWN.x, HOME.eyeHeight, SPAWN.z);
      player.velocity.set(0, 0, 0);
      player.yaw = SPAWN.yaw;
      player.pitch = SPAWN.pitch;
      player.started = false;
      player.active = false;
      player.applyPose();
      target = null;
      lastTargetId = null;
      lastNearState = null;
      updateScreens(camera.position);
      updateScreenClose();
      renderer.render(scene, camera);
    },
    getTarget() {
      return target;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      player.dispose();
      renderer.dispose();
    },
  };
}
