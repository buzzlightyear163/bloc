# python3 render.py cfg.json outdir [scale]
# Renders pfp.png, banner.png, launch.png (at scale, default 2) plus og.png and fav.png (1x) from graphics.html.
import json, sys, pathlib
from playwright.sync_api import sync_playwright
cfg, out = json.load(open(sys.argv[1])), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2
here = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch()
    for s, ids in ((scale, ["pfp", "banner", "launch"]), (1, ["og", "fav"])):
        pg = b.new_page(viewport={"width": 1800, "height": 1200}, device_scale_factor=s); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.add_init_script(f"window.CFG={json.dumps(cfg)}")
        pg.goto((here / "graphics.html").as_uri()); pg.wait_for_selector("body[data-ready]"); pg.wait_for_timeout(300)
        for i in ids: pg.locator("#" + i).screenshot(path=str(out / f"{i}.png"))
        if errs: print("errors:", errs)
        pg.close()
    b.close()
print("ok", sorted(x.name for x in out.glob("*.png")))
