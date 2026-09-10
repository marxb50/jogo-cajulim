import asyncio
import json
import os
import shutil
from pathlib import Path

import edge_tts


BASE_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = BASE_DIR / "narrations.json"
OUTPUT_DIRS = [
    BASE_DIR / "assets" / "audio",
    BASE_DIR / "PC" / "assets" / "audio",
    BASE_DIR / "celular" / "assets" / "audio",
]
SCRIPT_OUTPUTS = [
    BASE_DIR / "narrations.js",
    BASE_DIR / "PC" / "narrations.js",
    BASE_DIR / "celular" / "narrations.js",
]


def load_manifest():
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        narrations = json.load(handle)

    if len(narrations) != 12:
        raise ValueError(f"Esperadas 12 narrações; encontradas {len(narrations)}")

    boss_keys = [key for key, item in narrations.items() if "AntonioNeural" in item["voice"]]
    if boss_keys != ["PHASE7_TO_8:1"]:
        raise ValueError(f"Somente o chefão pode usar AntonioNeural: {boss_keys}")

    non_thalita = [
        key for key, item in narrations.items()
        if key != "PHASE7_TO_8:1" and item["voice"] != "pt-BR-ThalitaNeural"
    ]
    if non_thalita:
        raise ValueError(f"Narrações fora da voz Thalita Neural: {non_thalita}")
    return narrations


def build_browser_manifest(narrations):
    payload = json.dumps(narrations, ensure_ascii=False, separators=(",", ":"))
    return (
        "(function (root) {\n"
        f"    const narrations = {payload};\n"
        "    root.CAJULIM_NARRATIONS = Object.freeze(narrations);\n"
        "    if (typeof module !== 'undefined' && module.exports) module.exports = narrations;\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n"
    )


def write_browser_manifests(narrations):
    content = build_browser_manifest(narrations)
    for output in SCRIPT_OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content, encoding="utf-8")
        print(f"[OK] Manifesto do navegador: {output.relative_to(BASE_DIR)}")


async def generate_all():
    narrations = load_manifest()
    write_browser_manifests(narrations)

    for directory in OUTPUT_DIRS:
        directory.mkdir(parents=True, exist_ok=True)

    primary_dir = OUTPUT_DIRS[0]
    for key, item in narrations.items():
        output_path = primary_dir / item["filename"]
        print(f"Gerando {key} -> {item['filename']} com {item['voice']}...")
        communicate = edge_tts.Communicate(item["text"], item["voice"], rate=item.get("rate", "+2%"))
        await communicate.save(str(output_path))
        if output_path.stat().st_size < 1_000:
            raise RuntimeError(f"Áudio inválido ou vazio: {output_path}")
        print(f"[OK] {item['filename']} ({output_path.stat().st_size} bytes)")

        for mirror_dir in OUTPUT_DIRS[1:]:
            destination = mirror_dir / item["filename"]
            shutil.copy2(output_path, destination)


if __name__ == "__main__":
    os.environ.setdefault("PYTHONUTF8", "1")
    asyncio.run(generate_all())
