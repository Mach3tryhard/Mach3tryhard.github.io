/**
 * Device budget for the 3D tour.
 *
 * The tour is one big flat-shaded scene with self-lit screens; the expensive
 * parts are pixel fill rate and the number of live page textures. Phones,
 * tablets and low-memory laptops get a smaller render resolution and fewer
 * loaded pages. Force a tier with `?quality=low` or `?quality=high` in the URL.
 */

const params = new URLSearchParams(window.location.search);
const forced = params.get("quality");
const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
const memory = navigator.deviceMemory ?? 8;
const cores = navigator.hardwareConcurrency ?? 8;

export const LOW_POWER =
  forced === "low"
    ? true
    : forced === "high"
      ? false
      : coarse || memory <= 4 || cores <= 4;

/** Ceiling for the device-pixel multiplier. */
export const PIXEL_RATIO_CAP = LOW_POWER ? 1 : 1.5;

/** The renderer never draws more pixels than this, whatever the screen size. */
export const MAX_RENDER_PIXELS = LOW_POWER ? 1280 * 720 : 1920 * 1080;

/** Resolution of an exhibit page texture (the page is still laid out at 1600 × 900). */
export const PAGE_TEXTURE_WIDTH = LOW_POWER ? 1024 : 1280;
export const PAGE_TEXTURE_HEIGHT = LOW_POWER ? 576 : 720;

/** Distance at which a screen builds its full page / drops it again. */
export const DETAIL_DISTANCE = LOW_POWER ? 8 : 11;
export const RELEASE_DISTANCE = LOW_POWER ? 13 : 18;

/** Distant screens are hidden entirely; their title cards are no longer drawn. */
export const DRAW_DISTANCE = LOW_POWER ? 19 : 26;
