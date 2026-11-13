"""Copy project media from the old portfolio site into optimised WebP plates.

Run once from the repository root:

    python tools/import-media.py "C:/Users/matei/Desktop/Mach3tryhard.github.io/Media"

The source folder is only read; the site keeps its own copies under
assets/images so it stays dependency-free and portable.
"""

from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images"

# source file -> destination stem
MEDIA = {
    "mtg_tracker.png": "mtg-tracker",
    "qlgs.png": "quantum-gate",
    "chesshacker.jpg": "chesshacker",
    "roblox_game.png": "roblox-game",
    "fnafmuseum.png": "fnaf-museum",
    "fnaf6.png": "fnaf6-remastered",
    "lumturo.png": "lumturo",
    "evolution.png": "evolution-race",
    "Unity.png": "unity-games",
    "songreconstruct.png": "song-reconstructor",
    "ant.png": "langstons-ant",
    "hyperboloid.png": "hyperboloid",
    "menger.png": "menger",
    "microwavemodel.png": "microwave-model",
    "qube2space.png": "qube2space",
    "mooncamp.png": "mooncamp",
    "tokamak.png": "tokamak",
    "plant.png": "plant-shop",
    "scpgraph.png": "scp-graph",
    "entrepreneurial.png": "entrepreneurial-site",
    "unibuc.jpg": "university",
    "vianu.png": "tudor-vianu",
    "socials/github.png": "github",
    "socials/gitlab.png": "gitlab",
    "socials/linkedIn.png": "linkedin",
}

# Flatten transparency onto the dark plate colour the pages use.
BACKDROP = (10, 14, 20)
MAX_EDGE = 1000


def main(source_dir: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for source, stem in MEDIA.items():
        path = source_dir / source
        if not path.exists():
            print(f"missing  {source}")
            continue
        image = Image.open(path)
        image = image.convert("RGBA")
        if image.getchannel("A").getextrema()[0] < 255:
            flat = Image.new("RGBA", image.size, BACKDROP + (255,))
            flat.alpha_composite(image)
            image = flat
        image = image.convert("RGB")
        scale = min(1.0, MAX_EDGE / max(image.size))
        if scale < 1.0:
            image = image.resize(
                (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                Image.LANCZOS,
            )
        dest = OUT / f"{stem}.webp"
        image.save(dest, "WEBP", quality=82, method=6)
        total += dest.stat().st_size
        print(f"{source:20s} -> {dest.name:28s} {image.width}x{image.height} {dest.stat().st_size // 1024} KB")
    print(f"\n{len(MEDIA)} entries, {total / 1024 / 1024:.2f} MB total")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "C:/Users/matei/Desktop/Mach3tryhard.github.io/Media"))
