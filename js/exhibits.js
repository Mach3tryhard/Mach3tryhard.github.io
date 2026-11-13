/**
 * The exhibition plan.
 *
 * A single entrance hall (HOME) holds the "hello world" monitor and seven
 * doorways. Each doorway opens into a corridor (WING) for one category, with
 * screens on both walls and an observation window at the far end.
 *
 * All copy is taken from the old portfolio site (Mach3tryhard.github.io) and
 * the September 2026 CV. Screen positions are computed from the entry order, so
 * adding a project simply lengthens its hallway.
 *
 * Optional entry fields:
 *   image   — a local plate under assets/images; without one, js/art.js draws
 *             procedural art.
 *   link    — shown at the foot of the page.
 *   tech    — the small technical line under the body.
 *   plate   — what sits behind the image: "image" (default for a real image,
 *             a blurred copy of it), "paper" (page background), "dark", or
 *             "#rrggbb".
 *   fit     — "contain" (default) or "cover" to crop into the plate.d
 */

export const HOME = {
  width: 30,
  depth: 5.5,
  height: 5.6,
  eyeHeight: 1.66,
  startX: 0,
  startZ: 6.0,
  startYaw: Math.PI,
  startPitch: 0.1,
  doorWidth: 2.6,
  doorHeight: 3.2,
  wall: 0.3,
};

export const WING = {
  width: 3.8,
  height: 4.2,
  pitch: 3.6,
  firstZ: -3.3,
  wall: 0.4,
  screenWidth: 3.0,
  screenHeight: 1.69,
  screenCenterY: 2.3,
  endWindowWidth: 3.0,
  endWindowHeight: 2.6,
  endWindowBottom: 0.9,
};

const SYSTEMS = {
  education: { accent: "#bccbdb", theme: "light", brightness: 1.0 },
  experience: { accent: "#dfad78", theme: "light", brightness: 1.0 },
  contests: { accent: "#e6c28c", theme: "light", brightness: 1.0 },
  coding: { accent: "#a9c6df", theme: "light", brightness: 1.0 },
  games: { accent: "#e0ac76", theme: "light", brightness: 1.0 },
  cad: { accent: "#bccbdb", theme: "light", brightness: 1.0 },
  social: { accent: "#c3d2e2", theme: "light", brightness: 1.0 },
};

const CATALOGUE = [
  {
    key: "education",
    title: "Education",
    entries: [
      {
        id: "university",
        title: "University of Bucharest",
        kind: "Education / BEng",
        year: "2024 — 2028",
        tech: "Computer Science · GPA 9.39",
        body:
          "BEng Computer Science at the Faculty of Mathematics and Computer Science. Current GPA 9.39 / 10. Relevant Coursework: Data Structures & Algorithms, Artificial Intelligence, Object-Oriented Programming, Numerical Methods, Linear Algebra and Calculus.",
        image: "assets/images/unibuc.jpg",
        fit : "cover",
      },
      {
        id: "tudor-vianu",
        title: "National College of Computer Science \"Tudor Vianu\"",
        kind: "Education / High school",
        year: "2020 — 2024",
        tech: "Computer science · GPA 9.41",
        body:
          "The best public school for computer science program in Romania, with a focus on competitive programming and problem-solving. This is where I continued my education in computer science with a GPA 9.41 / 10.",
        image: "assets/images/vianu.png",
        fit: "cover",
      },
      {
        id: "tudor-vianu-middle",
        title: "National College of Computer Science \"Tudor Vianu\", Middle School",
        kind: "Education / Middle school",
        year: "2016 — 2020",
        tech: "Where it started",
        body:
          "Passed the entrance exam for the middle school of the National College of Computer Science \"Tudor Vianu\" in 2016. This is where I first learned algorithms, competitive programming and the joy of solving problems with code.",
        image: "assets/images/vianu.png",
        fit: "cover",
      },
    ],
  },
  {
    key: "experience",
    title: "Experience",
    entries: [
      {
        id: "ifin-hh",
        title: "IFIN-HH Department of Physical Computation and Informational Technologies",
        kind: "HPC software engineering intern",
        year: "2026.07 — 2026.09",
        tech: "SLURM · MQTT · Linux",
        body:
          "HPC software engineering intern at the Horia Hulubei National Institute. I developed a temperature-aware SLURM scheduling that redirects jobs based on temperature changes in the cluster. Also developed an MQTT remote provisioning application that allows the cluster to be set up and configured remotely, with a web interface for monitoring and control.",
        image: "assets/images/ifin.png",
        fit: "cover",
      },
      {
        id: "student-tutor",
        title: "Faculty of Mathematics and Computer Science, University of Bucharest",
        kind: "Student tutor",
        year: "2025.10 - present",
        tech: "C · C++",
        body:
          "Student tutor at the University of Bucharest, FMI. C and C++ labs on pointers, manual memory management, dynamic structures and complexity. I also helped students with their projects and assignments, and provided guidance on best practices and debugging techniques.",
        image: "assets/images/fmi.png",
        fit: "cover",
      },
      {
        id: "asmi",
        title: "Association of Mathematics and Computer Science Students",
        kind: "Experience / Volunteer",
        year: "2024.10 — 2026.10",
        tech: "Film · Design · Social",
        body:
          "Volunteer for the Association of Mathematics and Computer Science Students. I was part of the Design and PR Department, handling filming and editing, graphic design and social media. I was also a part of the Technical Group where I worked a bit on the .NET website.",
        image: "assets/images/asmi.png",
        fit: "cover",
      },
    ],
  },
  {
    key: "contests",
    title: "Contests",
    entries: [
      {
        id: "oni",
        title: "Romanian National Olympiad",
        kind: "Contests / Informatics",
        year: "2017 — 2024",
        tech: "Algorithms · C++",
        body:
          "Bronze medal at the Romanian National Olympiad in Informatics in 2017, and finalist in four different years at national level:2017, 2019, 2022 and 2024.",
        image: "assets/images/oni.png",
        fit: "cover",
      },
      {
        id: "smarthack",
        title: "Smarthack",
        kind: "Contests / Teams",
        year: "2024 — 2026",
        tech: "Software · Machine learning",
        body:
          "Smarthack finalist in 2024 and 2026 where we developed machine learning apps to solve real world problems. In 2024 tried optimizing the pipline of delivering packages from factories all the way to the customers, and in 2026 we developed a machine learning algorithm that calculates the optimal locations for new EV charging stations based on a node graph.",
        image: "assets/images/smarthack.png",
        fit: "cover",
      },
      {
        id: "NXP-line-follower",
        title: "NXP Line Follower Robotics",
        kind: "Contests / Teams",
        year: "2026",
        tech: "Hardware · Software",
        body:
          "Participated in the NXP Line Follower Robotics competition with FMI and NXP Romania, and placed 6th out of 16. Learned a lot about the basics of robotics, sensors and control systems, and how to work effectively in a team.",
        image: "assets/images/nxp.jpg",
        fit: "cover",
      },
      {
        id: "qube2space",
        title: "Qube2Space",
        kind: "Contests / Space",
        year: "2024",
        tech: "3D modelling · Hardware",
        body:
          "Top 10 at the international final stage of Qube2Space with a satellite cube that was designed and built in 11th grade. The cube was 10*10*10 cm and used multiple sensor modules to measure temperature, pressure, humidity and radiation in the upper atmosphere, all powered by an arduino.",
        image: "assets/images/qube2space.png",
        fit: "cover",
      },
      {
        id: "moon-camp",
        title: "Moon Camp",
        kind: "Contests / Space",
        year: "2023",
        tech: "3D modelling · Physics",
        body:
          "Entered the Moon Camp Challenge 2023 with a complete 3D moon base and an essay that explained how we would build a sustainable habitat on the moon, while tackling the challenges that come with it.",
        image: "assets/images/mooncamp.jpeg",
        fit: "cover",
      },
    ],
  },
  {
    key: "coding",
    title: "Coding Projects",
    entries: [
      {
        id: "corefall",
        title: "CoreFall",
        kind: "Coding / Game engine",
        year: "2026",
        tech: "C++ · OpenGL",
        body:
          "A game engine written in C++ on top of OpenGL, started in the summer of 2026 and still growing.",
        link: "github.com/Mach3tryhard/CoreFall",
        image: "assets/images/corefall.png",
        fit: "cover",
      },
      {
        id: "mtg-tracker",
        title: "MTG Tracker",
        kind: "Coding / Collection",
        year: "2026",
        tech: "Oracle SQL · Python",
        body:
          "An app for tracking and managing a Magic: The Gathering collection, the players you meet and the games you play.",
        link: "github.com/Mach3tryhard/MTG-Tracker",
        image: "assets/images/mtg.png",
        fit: "cover",
      },
      {
        id: "quantum-gate",
        title: "Quantum Gate Simulator",
        kind: "Coding / Simulation",
        year: "2026",
        tech: "C++ · SFML",
        body:
          "A C++ and SFML application for experimenting with qubit logic gates and watching basic quantum circuits behave.",
        link: "github.com/Mach3tryhard/qbit-logic-gate-simulator",
        image: "assets/images/qbit.png",
        fit: "cover",
      },
      {
        id: "AI-Dungeon-Master",
        title: "AI Dungeon Master",
        kind: "Coding / Simulation",
        year: "2026",
        tech: "Python · Llama2",
        body:
          "A terminal user interface game where the Dungeon Master of the game Dungeons and Dragons is represented by an AI and an Engine behind it. The AI is able to tell a story and respond to the player's actions in real time.",
        link: "github.com/Mach3tryhard/AI-Dungeon-Master",
        image: "assets/images/ai-dm.png",
        fit: "cover",
      },
      {
        id: "chesshacker",
        title: "ChessHacker",
        kind: "Coding / Real-time analysis",
        year: "2025",
        tech: "Python · Playwright · Stockfish",
        body:
          "An automated board observer that reads a live game from the DOM and asks Stockfish for the best move while you play.",
        link: "github.com/Mach3tryhard/ChessHacker",
        image: "assets/images/chesshacker.png",
        fit: "cover",
      },
      {
        id: "song-reconstructor",
        title: "Song Reconstructor",
        kind: "Coding / Numerical analysis",
        year: "2025",
        tech: "Python · STFT · SVD · QR",
        body:
          "A university project with two other students that reconstructs a song through numerical analysis, saving memory while losing a little of the original.",
        link: "github.com/Mach3tryhard/Song-Approximation",
        image: "assets/images/spectograma.png",
        fit: "cover",
      },
      {
        id: "langstons-ant",
        title: "Langston's Ant",
        kind: "Coding / Cellular automaton",
        year: "2025",
        tech: "JavaScript",
        body:
          "A Langston's ant visualiser: change the rules, watch the grid, and run up to a million steps a second.",
        link: "mach3tryhard.github.io/LangstonAnt",
        image: "assets/images/ant.png",
        fit : "cover",
      },
      {
        id: "hyperboloid",
        title: "Hyperboloid Visualiser",
        kind: "Coding / Surfaces",
        year: "2024",
        tech: "JavaScript",
        body:
          "Control every parameter of a hyperboloid and see how the surface answers, made for university. A hyperboloid is a surface that can be generated by rotating a hyperbola around one of its principal axes.",
        link: "mach3tryhard.github.io/Hyperboloid-Visualizer",
        image: "assets/images/hyperbolodi.png",
        fit: "cover",
      },
      {
        id: "menger",
        title: "Menger Sponge",
        kind: "Coding / Fractals",
        year: "2023",
        tech: "JavaScript",
        body:
          "A Menger universal curve generator that builds the sponge up to its fourth iteration. Simple and fun project I did since i wanted to visualise fractals.",
        link: "mach3tryhard.github.io/Menger-Universal-Curve",
        image: "assets/images/menger.png",
        fit: "cover",
      },
      {
        id: "scp-graph",
        title: "SCP Foundation Graph",
        kind: "Coding / Data visualisation",
        year: "2024",
        tech: "JavaScript",
        body:
          "An interactive website that shows the connections between SCPs across the SCP Foundation universe, with a 3D version as well.",
        link: "drop-table-taskforces.github.io/scp-graph",
        image: "assets/images/scp-graph.png",
        fit: "cover",
      },
      {
        id: "EV charging station placer",
        title: "EV Charging Station Placer",
        kind: "Coding / Data visualisation",
        year: "2026",
        tech: "JavaScript · python · ML",
        body:
          "An interactive website that uses a machine learning algorithm that calculates the optimal locations for new EV charging stations based on a node graph.",
        link: "https://github.com/Mach3tryhard/EV-Charging-Station-Placer",
        image: "assets/images/evstations.png",
        fit: "cover",
      },
    ],
  },
  {
    key: "games",
    title: "Video Games",
    entries: [
      {
        id: "roblox-game",
        title: "Roblox Tycoon",
        kind: "Games / Tycoon",
        year: "2026",
        tech: "Roblox Studio",
        body:
          "A Roblox tycoon game that has been in development during the summer of 2026. Has over 200 visitors, with detailed features and content to explore.",
        link: "https://www.roblox.com/games/98652270071766/Animatronic-Farm",
        image: "assets/images/roblox_tycoon.png",
        fit: "cover",
      },
      {
        id: "find-rakis",
        title: "Find Rakis",
        kind: "Games / Physics · Space",
        year: "2025",
        tech: "C++23 · SFML · CMake",
        body:
          "A 2D physics-driven space game. Harvest fuel from celestial bodies, reach your goal, and try not to crash into anything on the way.",
        link: "github.com/Mach3tryhard/Find-Rakis",
        image: "assets/images/rakis.png",
        fit: "cover",
      },
      {
        id: "fnaf-museum",
        title: "FNaF Museum",
        kind: "Games / Archive",
        year: "2025",
        tech: "GameJolt release",
        body:
          "A Five Nights at Freddy's museum that sorts and displays animatronics by game, iteration, type and location.",
        link: "gamejolt.com/games/FNAFMUSEUM/1019420",
        image: "assets/images/fnaf_museum.png",
        fit: "cover",
      },
      {
        id: "fnaf6-remastered",
        title: "FNaF6 Remastered",
        kind: "Games / 3D remake",
        year: "2024",
        tech: "Unity · C#",
        body:
          "A 3D remake of Five Nights at Freddy's 6 in Unity. Unfinished, and a deep lesson in how engines are put together.",
        link: "https://github.com/Mach3tryhard/FNAF6-3D",
        image: "assets/images/fnaf6-remastered.png",
        fit: "cover",
      },
      {
        id: "lumturo",
        title: "Lumturo",
        kind: "Games / Platformer",
        year: "2024",
        tech: "Godot",
        body:
          "A platformer made as my end-of-high-school project, in Godot, to show what I could build on my own.",
        link: "github.com/Mach3tryhard/Lumturo",
        image: "assets/images/lumturo.webp",
        fit: "cover",
      },
    ],
  },
  {
    key: "cad",
    title: "CAD 3D Modeling",
    entries: [
      {
        id: "microwave-model",
        title: "Microwave Model",
        kind: "CAD / Product",
        year: "2025",
        tech: "AutoCAD",
        body:
          "An accurate, part-by-part microwave modelled in AutoCAD for university, with all of the most important parts also being included.",
        link: "github.com/Mach3tryhard/Microwave-Model",
        image: "assets/images/microunde.png",
        fit: "cover",
      },
      {
        id: "qube2space",
        title: "Qube2Space",
        kind: "CAD / Satellite",
        year: "2024",
        tech: "3D modelling",
        body:
          "A satellite designed for the international Qube2Space contest in 11th grade, built to be launched into space.",
        link: "Raport_tehnic_final_NoDynamics.pdf",
        image: "assets/images/qube.png",
        fit: "cover",
      },
      {
        id: "mooncamp",
        title: "Moon Camp",
        kind: "CAD / Lunar base",
        year: "2023",
        tech: "3D modelling",
        body:
          "A complete 3D moon base and an essay about it, entered in the Moon Camp Challenge when I was in 11th grade.",
        link: "Mooncamp Project Ouroboros.pdf",
        image: "assets/images/mooncamp.webp",
        fit: "cover",
      },
    ],
  },
  {
    key: "social",
    title: "Socials",
    entries: [
      {
        id: "github",
        title: "GitHub",
        kind: "Social / Code",
        year: "Profile",
        tech: "Open source",
        body:
          "The code for every project in this museum, plus the experiments that never became one.",
        link: "github.com/Mach3tryhard",
        image: "assets/images/github.png",
        fit: "cover",
      },
      {
        id: "LeetCode",
        title: "LeetCode",
        kind: "Social / Competitive programming",
        year: "Profile",
        tech: "Algorithms",
        body:"Solving algorithmic problems to improve my coding skills and prepare for technical interviews. Also doing it to keep my mind sharp and to learn new techniques and algorithms.",
        link: "leetcode.com/mateisirghe",
        image: "assets/images/leetcode.png",
        fit: "cover",
      },
      {
        id: "Codeforces",
        title: "Codeforces",
        kind: "Social / Competitive programming",
        year: "Profile",
        tech: "Algorithms",
        body:"Solving algorithmic problems to improve my coding skills and for competitive programming contests in general. Also doing it to keep my mind sharp and to learn new techniques and algorithms.",
        link: "codeforces.com/matei_sirghe",
        image: "assets/images/codeforces.png",
        fit: "cover",
      },
      {
        id: "linkedin",
        title: "LinkedIn",
        kind: "Social / Profile",
        year: "Profile",
        tech: "Professional",
        body:
          "The professional side: education, experience and everything that does not fit in a hallway.",
        link: "https://www.linkedin.com/in/matei-sirghe-b56783312/",
        image: "assets/images/linkedin.png",
        fit: "cover",
      },
    ],
  },
];

const DOOR_PITCH = WING.width + WING.wall;
const DOOR_COUNT = CATALOGUE.length;

/** The walking order of the seven doorways, left to right. */
const DOOR_ORDER = ["coding", "games", "cad", "social", "education", "contests", "experience"];
const ORDERED = DOOR_ORDER.map((key) => CATALOGUE.find((category) => category.key === key));

/** Walk-through rectangles, used by the player instead of a single room box. */
export const WALKABLE = [
  {
    minX: -HOME.width / 2,
    maxX: HOME.width / 2,
    minZ: HOME.wall / 2,
    maxZ: HOME.depth,
  },
];

export const CATEGORIES = ORDERED.map((category, index) => {
  const system = SYSTEMS[category.key];
  const rows = Math.ceil(category.entries.length / 2);
  const length = 2.6 + rows * WING.pitch;
  const x = (index - (DOOR_COUNT - 1) / 2) * DOOR_PITCH;
  const first = WING.firstZ;

  const exhibits = category.entries.map((entry, entryIndex) => ({
    ...entry,
    number: `${String(index + 1).padStart(2, "0")}.${String(entryIndex + 1).padStart(2, "0")}`,
    category: entry.kind,
    x,
    side: entryIndex % 2 === 0 ? "left" : "right",
    z: first - Math.floor(entryIndex / 2) * WING.pitch,
    format: "landscape",
    variant: entry.variant || "editorial",
    accent: entry.accent || system.accent,
    theme: entry.theme || system.theme,
    brightness: entry.brightness ?? system.brightness,
  }));

  WALKABLE.push(
    { minX: x - HOME.doorWidth / 2, maxX: x + HOME.doorWidth / 2, minZ: -0.9, maxZ: 0.9 },
    { minX: x - WING.width / 2, maxX: x + WING.width / 2, minZ: -length, maxZ: -0.15 }
  );

  return {
    ...category,
    number: String(index + 1).padStart(2, "0"),
    x,
    rows,
    length,
    endZ: -length,
    exhibits,
  };
});

export const EXHIBITS = CATEGORIES.flatMap((category) => category.exhibits);
