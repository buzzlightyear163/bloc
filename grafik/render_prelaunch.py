import pathlib, sys
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here
names = {"p1": "prelaunch-1-reveal.png", "p2": "prelaunch-2-inside.png", "p3": "prelaunch-3-sides.png"}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1700, "height": 1000}, device_scale_factor=2); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((here / "prelaunch.html").as_uri()); pg.wait_for_selector("body[data-ready]"); pg.wait_for_timeout(300)
    for i, n in names.items(): pg.locator("#" + i).screenshot(path=str(out / n))
    print("errors", errs); b.close()
