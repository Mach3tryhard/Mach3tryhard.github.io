# Matei Sîrghe — Curriculum Vitae

A curriculum vitae that can be read or explored. The start screen offers a short
CV, a long CV and a Where to find me list, plus an optional first-person Three.js
tour. The tour begins in an entrance hall facing seven doorways, one for each
part of the CV, and each opens into its own hallway. Behind the visitor, set a
few metres in front of the rear wall, is a simple desk with a short-throw
projector, an open PC and a backless wooden chair; the projector throws the
terminal-style `hello world` across the gap onto the wall.

The short CV is a 1:1 copy of the September 2026 LaTeX CV. The long CV and the
hallways extend it with the full archive from the old portfolio site
(`Mach3tryhard.github.io`) — every project, its screenshot, links and dates.

The interface and exhibit pages use JetBrains Mono throughout, with a warm amber
/ cold blue palette. The rooms, exhibits, screen pages and the blue star are
generated in code; there are no runtime CDN requests.

## Run

```bash
npm start
```

Open <http://127.0.0.1:4173>.

The project is dependency-free at runtime. Three.js and the JetBrains Mono font
are vendored under `vendor/` and `assets/`. Project screenshots are local WebP
plates under `assets/images/`.

## Reading without 3D

The start menu has three reading routes:

- **Short CV** — the LaTeX CV, section for section.
- **Long CV** — generated from the exhibit catalogue: profile, education,
  experience, contests, coding projects, video games, CAD, socials, skills and
  elsewhere.
- **Where to find me** — generated from the Socials category, plus the website
  and email.

These open in a paper reader over the menu. The 3D button is separate, so no
visitor has to walk a hallway to get the information. If WebGL fails, the reading
options remain available and the 3D entry is hidden.

## 3D controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Walk |
| Mouse | Look |
| `Shift` | Walk faster |
| `Space` | Jump |
| `M` | Toggle gallery sound |
| `Esc` | Release the mouse / pause (with a Back to menu button) |
| Touch | Left stick to move, drag to look, Jump button |

The tour starts facing the seven doorways. Turn around to see the desk,
projector and open PC, with the projected `hello world` terminal on the wall;
walk toward a screen until the interface gets out of the way and the page becomes
readable. At very close range the display resolves into an RGB LED matrix.

## The rooms

The entrance hall is 30 × 26 metres and 5.6 metres tall, with a free-standing desk,
projector, open PC and wall-projected terminal towards the back and seven doorways
on the opposite wall. Above each doorway is a backlit sign.

Left to right, the seven hallways are:

1. **Coding projects** — 14 screens: CoreFall, MTG Tracker, Quantum Gate
   Simulator, ChessHacker, Song Reconstructor, Langston's Ant, Hyperboloid
   Visualiser, Menger Sponge, Tokamak Simulator, 2D Gravity, Commercial Plant
   Shop, CNITV Test Website, SCP Foundation Graph, Entrepreneurial Education.
2. **Video games** — 8 screens: Roblox Tycoon, Find Rakis, FNaF Museum, FNaF6
   Remastered, Lumturo, Evolution Race, Console C Game, Unfinished Unity Games.
3. **CAD 3D modeling** — 3 screens: Microwave Model, Qube2Space, Moon Camp.
4. **Social media** — 3 screens: GitHub, GitLab, LinkedIn.
5. **Education** — 3 screens: University of Bucharest, Tudor Vianu, Tudor Vianu
   middle school.
6. **Contests** — 4 screens: National Olympiad, Hackathons, Qube2Space, Moon Camp.
7. **Experience** — 3 screens: IFIN-HH, Student Tutor, ASMI.

Every hallway is 3.8 metres wide, with screens on both walls at a fixed 3.6 metre
rhythm and an observation window at the far end; a second category sign hangs
above that window. Each hallway is only as long as its own category needs, so the
wings have different depths while the spacing between screens stays constant.

Each screen is a Canvas2D page mapped onto a physical plane. A custom shader adds
the LED grid, RGB subpixels, subtle electrical breathing and a distance-aware
transition back to a smooth high-definition image.

Outside the windows is a quiet white star field built from small triangles, and
one detailed blue star at the end of the Coding hallway. The star's surface has
convection cells, granulation, sunspots, faculae, limb darkening and an animated
corona. No stars are generated inside a 20° cone around it.

## Editing

### Copy and dates

Edit `js/exhibits.js`. The `CATALOGUE` holds each category and its entries; the
`DOOR_ORDER` array decides which doorway sits where, left to right, and the
screen numbers follow that order. Each entry controls its page title, category,
year, tech line, body, link, accent and screen image. Adding an entry lengthens
its hallway automatically.

The short CV is fixed. The long CV and the Where to find me page are built from
`CATEGORIES` when the page loads, so editing this file updates the documents too.
Every entry with a `link` gets a button in the long CV (`Code`, `Play`, `Profile`,
`PDF` or `Open`, chosen from the URL). Add optional `code` and `app` fields to an
entry to show both buttons; `play`, `demo` and a `links` array are also understood.
A bare filename such as `Raport_tehnic_final.pdf` is resolved under
`assets/documents/`.

### Images

Every exhibit can point at a local plate:

```js
{
  id: "chesshacker",
  image: "assets/images/chesshacker.webp",
  // ...
}
```

The background behind an image is chosen per exhibit:

```js
{
  id: "university",
  image: "assets/images/university.webp",
  plate: "paper",   // "image" (blurred copy, default for real images),
                    // "paper" (page background), "dark", or "#rrggbb"
  fit: "contain",   // "contain" (default) or "cover" to crop into the plate
}
```

With `plate: "image"` the mat is a soft, blurred copy of the picture itself, so a
white screenshot no longer gets a black band around it. On a paper page the mat is
lightened; on a dark page it is darkened. Leave `plate` out to get that automatic
behaviour.

The old portfolio media was imported once with:

```bash
python tools/import-media.py "C:/Users/matei/Desktop/Mach3tryhard.github.io/Media"
```

That script only reads the old folder and writes `assets/images/*.webp`. Pages
without an image fall back to the procedural art in `js/art.js`.

### Rooms, screens and quality

- `js/exhibits.js` — the catalogue, doorway order, hallway length and walkable rectangles.
- `js/world.js` — entrance hall, projected terminal, desk and open PC, doorways, hallways, windows and stars.
- `js/screens.js` — screen housings, page textures, title cards, LED shader and ray targets.
- `js/quality.js` — low/high device tier: render resolution, page texture size and load distances.
- `js/player.js` — pointer-lock FPS controller and movement through the walkable rectangles.
- `js/art.js` — generated exhibit pages and procedural plates.
- `js/app.js` — start menu, generated long CV and find page, CV reader and tour flow.
- `css/museum.css` — the HUD, start menu, CV reader and camera vignette.

## Technical notes

- There are no scene lights. Walls, floors, ceilings, frames and signs use flat
  unlit colours; the only elaborate light source is the screen shader. The walls
  have no texture, and the floor is a single colour.
- Geometry is deliberately low-poly and the screen count is fixed by the
  catalogue. Every screen is three meshes (housing, panel, plaque); there are no
  per-screen halos, glow pools or extra lights.
- Pages are laid out at 1600 × 900 but uploaded at **1280 × 720** (high) or
  **1024 × 576** (low), and the canvas is dropped as soon as the texture exists.
  A screen shows a small title card until the visitor is within eleven metres
  (high) or eight metres (low); the page is released again at eighteen / thirteen.
- Screens beyond 26 metres (high) or 19 metres (low) are hidden entirely. The
  renderer also caps the drawing buffer at 1920 × 1080 (high) or 1280 × 720 (low),
  so a 4K window does not render at 4K.
- There is no post-processing: no bloom, no MSAA render targets and no live model
  render target. The renderer draws the scene once per frame.
- Before the start menu becomes interactive, the renderer builds the pages near
  the spawn, compiles every shader, uploads every texture and draws a frame while
  the loading overlay is still up. The visitor is only spawned after that warm-up.
- While the start menu or pause screen is open the render loop is stopped and the
  canvas shows that warmed frame; the loop starts on entry or resume. The menu and
  pause screen therefore cost no 3D frames.
- Walking speed is 3.8 m/s and sprinting is 5.4 m/s.
- Movement is a union of rectangles: the entrance hall, seven doorway throats and
  seven hallways. A candidate position is accepted, or slid along one axis, so a
  doorway can be crossed but a pier cannot.
- Look input is collected per frame and capped at roughly 4.4° per frame. The
  first pointer-lock hand-off events are discarded, so a high-DPI mouse or a
  browser-generated delta cannot snap the view.
- Force a tier with `?quality=low` or `?quality=high`; otherwise the tour detects
  coarse pointers, ≤ 4 GB of device memory or ≤ 4 CPU threads and uses the low
  tier. If WebGL is unavailable the reading routes still work.
- `tools/shots.mjs` drives a headless Chromium over the DevTools protocol to
  regenerate the images in `preview/`; pass a scene list with `--scenes-file`.

## Credits

- [Three.js](https://threejs.org) r180 — MIT, see `vendor/THREE-LICENSE.txt`.
- JetBrains Mono — SIL Open Font License, see `assets/fonts/OFL.txt`.
- Project screenshots and copy are taken from Matei Sîrghe's old portfolio site
  and his September 2026 CV.
