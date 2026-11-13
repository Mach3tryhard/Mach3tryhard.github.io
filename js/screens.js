import * as THREE from "three";
import { createExhibitPage } from "./art.js";
import { EXHIBITS, WING } from "./exhibits.js";
import {
  DETAIL_DISTANCE,
  DRAW_DISTANCE,
  PAGE_TEXTURE_HEIGHT,
  PAGE_TEXTURE_WIDTH,
  RELEASE_DISTANCE,
} from "./quality.js";

const SCREEN = {
  landscape: { width: 3.0, height: 1.69, centerY: 2.3 },
  portrait: { width: 1.9, height: 3.08, centerY: 2.7 },
};

const CARD = { width: 384, height: 216, scale: 0.75 };
const PLAQUE = { width: 512, height: 100, scale: 2 / 3 };

/**
 * The screen shader. This is the one place where light is allowed to be
 * elaborate: the panel is the light source. Everything else in the room is
 * flat-shaded, so the cost here is bounded by the panel's screen area.
 */
const LED_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const LED_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uGrid;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uHighlight;
  uniform float uReveal;
  uniform float uClose;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vec2 uv = vUv;

    // At a distance the panel reads as one smooth, high-resolution image.
    vec3 smoothColor = texture2D(uMap, uv).rgb;

    // Up close, each cell resolves into an RGB LED. Derivatives are used to
    // fade the matrix out before it can alias into large moiré bands.
    vec2 gridCoordinate = uv * uGrid;
    vec2 gridDerivative = max(fwidth(gridCoordinate), vec2(0.0001));
    float resolve = 1.0 - smoothstep(0.26, 0.52, gridDerivative.x);

    vec2 cell = fract(gridCoordinate);
    vec2 ledUv = (floor(gridCoordinate) + 0.5) / uGrid;
    vec3 ledBase = mix(texture2D(uMap, ledUv).rgb, smoothColor, 0.26);

    // Three distinct subpixel bands per cell. The descending edges use
    // 1.0 - smoothstep(...); GLSL leaves smoothstep undefined when its
    // edges are reversed, which previously left only the blue band visible.
    float red = smoothstep(0.04, 0.12, cell.x) * (1.0 - smoothstep(0.27, 0.33, cell.x));
    float green = smoothstep(0.37, 0.43, cell.x) * (1.0 - smoothstep(0.60, 0.66, cell.x));
    float blue = smoothstep(0.70, 0.76, cell.x) * (1.0 - smoothstep(0.93, 0.99, cell.x));

    vec3 subpixel = vec3(red, green, blue);
    float gapX = smoothstep(0.008, 0.06, cell.x) * (1.0 - smoothstep(0.94, 0.992, cell.x));
    float gapY = smoothstep(0.008, 0.06, cell.y) * (1.0 - smoothstep(0.94, 0.992, cell.y));
    float cellMask = mix(0.44, 1.0, gapX * gapY);

    // A lower white base and a stronger channel boost keep a white page from
    // washing the three subpixels back into one white stripe.
    vec3 ledSharp = ledBase * (0.05 + subpixel * 1.45) * cellMask;
    // When the cells get too small to resolve, fade the colour pattern to its
    // average instead of letting the RGB bands alias into rainbows.
    vec3 ledAverage = ledBase * (0.05 + 1.45 / 3.0) * cellMask;
    vec3 ledColor = mix(ledAverage, ledSharp, resolve);

    // The whole panel switches together, based on the screen centre, instead
    // of resolving only at the point closest to the camera.
    float close = uClose;
    vec3 color = mix(smoothColor, ledColor, close * 0.95);

    // Very slight glass falloff and electrical breathing.
    vec2 edgeUv = abs(uv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.72, 1.0, max(edgeUv.x, edgeUv.y));
    color *= mix(0.92, 1.0, edge);
    color *= 1.0 + sin(uTime * 9.0 + uv.y * 17.0) * 0.0035;

    color *= uBrightness * (1.0 + uHighlight * 0.065) * uReveal;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

const CARD_PALETTE = {
  light: {
    bg: "#f2f2f2",
    bgTop: "#ffffff",
    ink: "#151515",
    muted: "#5a5a5a",
    faint: "#8b8b8b",
  },
  paper: {
    bg: "#ddd5c5",
    bgTop: "#ece6d9",
    ink: "#17140f",
    muted: "#5c554a",
    faint: "#8d8374",
  },
  dark: {
    bg: "#080706",
    bgTop: "#12100c",
    ink: "#f2e9db",
    muted: "#b2a391",
    faint: "#7c6f60",
  },
};

/** Cheap title card shown until the visitor is close enough for the page. */
function createTitleCard(exhibit) {
  const canvas = createCanvas(CARD.width, CARD.height);
  const ctx = canvas.getContext("2d");
  ctx.scale(CARD.scale, CARD.scale);

  const width = 512;
  const height = 288;
  const palette = CARD_PALETTE[exhibit.theme] || CARD_PALETTE.dark;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, palette.bgTop);
  bg.addColorStop(1, palette.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = exhibit.accent;
  ctx.fillRect(36, 40, 40, 2);

  ctx.fillStyle = palette.muted;
  ctx.font = '400 11px "JetBrains Mono"';
  ctx.fillText(exhibit.number, 36, 30);
  ctx.textAlign = "right";
  ctx.fillText(exhibit.year, 476, 30);
  ctx.textAlign = "left";

  ctx.fillStyle = exhibit.accent;
  ctx.font = '500 15px "JetBrains Mono"';
  ctx.fillText(exhibit.category.toUpperCase(), 36, 76);

  const words = exhibit.title.toUpperCase().split(" ");
  let size = 44;
  const maxWidth = 440;
  do {
    ctx.font = `500 ${size}px "JetBrains Mono"`;
    const longest = words.reduce(
      (value, word) => Math.max(value, ctx.measureText(word).width),
      0
    );
    const total = ctx.measureText(words.join(" ")).width;
    if (longest <= maxWidth && total <= maxWidth) break;
    size -= 4;
  } while (size > 17);

  ctx.fillStyle = palette.ink;
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  lines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 36, 150 + index * (size * 1.14));
  });

  ctx.strokeStyle = "rgba(242, 233, 219, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, 250.5);
  ctx.lineTo(476, 250.5);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

/** The full page is laid out at 1600 × 900, then stored at the quality size. */
function makePageTexture(renderer, page) {
  const target = createCanvas(PAGE_TEXTURE_WIDTH, PAGE_TEXTURE_HEIGHT);
  const ctx = target.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(page.canvas, 0, 0, PAGE_TEXTURE_WIDTH, PAGE_TEXTURE_HEIGHT);

  const texture = new THREE.CanvasTexture(target);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function makeScreenMaterial({ map, grid, brightness }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uGrid: { value: new THREE.Vector2(grid[0], grid[1]) },
      uTime: { value: 0 },
      uBrightness: { value: brightness },
      uHighlight: { value: 0 },
      uReveal: { value: 1 },
      uClose: { value: 0 },
    },
    vertexShader: LED_VERTEX,
    fragmentShader: LED_FRAGMENT,
    toneMapped: false,
  });
}

function makePlaqueTexture(exhibit) {
  const canvas = createCanvas(PLAQUE.width, PLAQUE.height);
  const ctx = canvas.getContext("2d");
  ctx.scale(PLAQUE.scale, PLAQUE.scale);

  const width = 768;
  const height = 150;

  ctx.fillStyle = "#080604";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(242, 228, 211, 0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  ctx.fillStyle = exhibit.accent;
  ctx.fillRect(0, 0, 8, height);

  ctx.fillStyle = "rgba(242, 233, 219, 0.88)";
  const plaqueTitle = exhibit.title.toUpperCase();
  let plaqueTitleSize = 26;
  do {
    ctx.font = `500 ${plaqueTitleSize}px "JetBrains Mono"`;
    if (ctx.measureText(plaqueTitle).width <= width - 64) break;
    plaqueTitleSize -= 1;
  } while (plaqueTitleSize > 10);
  ctx.fillText(plaqueTitle, 32, 60);

  ctx.fillStyle = "rgba(242, 233, 219, 0.34)";
  ctx.font = '400 17px "JetBrains Mono"';
  ctx.fillText(exhibit.number, 32, 96);
  ctx.textAlign = "right";
  ctx.fillText(exhibit.year, width - 30, 96);
  ctx.textAlign = "left";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function placementFor(exhibit) {
  const format = SCREEN[exhibit.format] || SCREEN.landscape;
  const offset = WING.width / 2 - 0.15;
  let position;
  let rotationY;
  let normal;

  if (exhibit.side === "left") {
    position = new THREE.Vector3(exhibit.x - offset, format.centerY, exhibit.z);
    rotationY = Math.PI / 2;
    normal = new THREE.Vector3(1, 0, 0);
  } else {
    position = new THREE.Vector3(exhibit.x + offset, format.centerY, exhibit.z);
    rotationY = -Math.PI / 2;
    normal = new THREE.Vector3(-1, 0, 0);
  }

  return { format, position, rotationY, normal };
}

/**
 * Build every screen. Each one is three simple meshes — a dark housing, the
 * shader panel and a plaque — with no per-screen lights, halos or glow planes.
 * Full pages are built only near the visitor and dropped from the GPU behind.
 */
export function buildScreens(renderer, scene) {
  const screens = [];
  const meshes = [];

  const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x05070a });
  const plaqueMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });

  for (const exhibit of EXHIBITS) {
    const { format, position, rotationY, normal } = placementFor(exhibit);
    const card = createTitleCard(exhibit);

    const group = new THREE.Group();
    group.name = `screen-${exhibit.id}`;
    group.position.copy(position);
    group.rotation.y = rotationY;

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(format.width + 0.14, format.height + 0.14, 0.12),
      frameMaterial
    );
    backing.position.z = -0.06;
    group.add(backing);

    const grid = [
      Math.round(format.width * 170),
      Math.round(format.height * 170),
    ];
    const material = makeScreenMaterial({
      map: card,
      grid,
      brightness: exhibit.brightness,
    });
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(format.width, format.height),
      material
    );
    panel.position.z = 0.012;
    panel.userData.exhibit = exhibit;
    panel.name = `screen-panel-${exhibit.id}`;
    group.add(panel);
    meshes.push(panel);

    const plaqueTexture = makePlaqueTexture(exhibit);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.235),
      plaqueMaterial.clone()
    );
    plaque.material.map = plaqueTexture;
    plaque.material.needsUpdate = true;
    plaque.position.set(0, -format.height / 2 - 0.24, 0.026);
    group.add(plaque);

    scene.add(group);

    screens.push({
      exhibit,
      group,
      panel,
      material,
      normal,
      position: group.position.clone(),
      center: group.position.clone(),
      width: format.width,
      height: format.height,
      card,
      pageTexture: null,
      ready: false,
      distance: Infinity,
    });
  }

  function release(screen) {
    screen.pageTexture?.dispose();
    screen.pageTexture = null;
    screen.ready = false;
    screen.material.uniforms.uMap.value = screen.card;
    screen.material.uniforms.uReveal.value = 0.6;
  }

  function detail(screen) {
    const page = createExhibitPage(screen.exhibit);
    const texture = makePageTexture(renderer, page);
    screen.pageTexture = texture;
    screen.ready = true;
    screen.material.uniforms.uMap.value = texture;
    screen.material.uniforms.uReveal.value = 0;
    // The 1600 × 900 canvas is no longer needed once it is on the GPU.
  }

  function update(position) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const screen of screens) {
      const distance = position.distanceTo(screen.group.position);
      screen.distance = distance;

      // Hide far panels outright instead of drawing tiny title cards.
      screen.group.visible = distance < DRAW_DISTANCE;

      if (screen.ready && distance > RELEASE_DISTANCE) {
        release(screen);
      } else if (!screen.ready && distance < DETAIL_DISTANCE && distance < nearestDistance) {
        nearest = screen;
        nearestDistance = distance;
      }
    }

    if (nearest) detail(nearest);
  }

  /**
   * Build the pages near the spawn while the loading overlay is still up, so
   * the first frames after entering do not have to generate textures.
   */
  function warmUp(position, radius = DETAIL_DISTANCE) {
    for (const screen of screens) {
      if (!screen.ready && position.distanceTo(screen.group.position) < radius) {
        detail(screen);
      }
    }
  }

  return { screens, meshes, update, warmUp };
}
