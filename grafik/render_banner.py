import pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1600, "height": 600}, device_scale_factor=2); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((here / "banner.html").as_uri()); pg.wait_for_selector("body[data-ready]"); pg.wait_for_timeout(300)
    pg.locator("#banner").screenshot(path=str(here / "banner.png"))
    print("errors", errs); b.close()
