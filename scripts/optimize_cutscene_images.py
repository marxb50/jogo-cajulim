import os
from PIL import Image
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIMARY_DIR = os.path.join(BASE_DIR, 'assets', 'cutscenes')
OTHER_DIRS = [
    os.path.join(BASE_DIR, 'PC', 'assets', 'cutscenes'),
    os.path.join(BASE_DIR, 'celular', 'assets', 'cutscenes')
]

for f in sorted(os.listdir(PRIMARY_DIR)):
    if f.endswith('.jpg'):
        p = os.path.join(PRIMARY_DIR, f)
        orig_kb = os.path.getsize(p) // 1024
        im = Image.open(p)
        # Save optimized with high quality 85 and progressive encoding
        im.save(p, 'JPEG', quality=85, optimize=True, progressive=True)
        new_kb = os.path.getsize(p) // 1024
        print(f"{f:30} {orig_kb} KB -> {new_kb} KB")
        for od in OTHER_DIRS:
            dest = os.path.join(od, f)
            shutil.copy2(p, dest)

print("All cutscene images optimized and synchronized!")
