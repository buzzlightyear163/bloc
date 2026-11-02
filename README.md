# BLOC — pick a bloc

Style: termkit (paper theme). The pixel computer in the logo and hero is drawn by `public/termkit.js`, the same engine that renders the X graphics in `grafik/`.

Solana launchpad that pairs a memecoin to any world leader, any country or any of 17 blocs (NATO, BRICS, CRINK, Nuclear 9, P5, G7, G20, EU, SCO, OPEC, GCC, Arab League, ASEAN, AUKUS, Quad, Five Eyes, AES). Coins launch on pump.fun.

- **Dot-matrix world map** (canvas): Alignment (NATO / BRICS), Flashpoints (live headline heat) and per-bloc modes. Click a country for its leaders, blocs, 24h headlines and coins already on-chain.
- **Flashpoints**: last-24h war & politics headlines (Google News RSS → GDELT fallback → labelled snapshot), counted per country.
- **Pair a coin**: search 342 leaders / 197 countries / 17 blocs, auto-ticker, auto-generated coin image (no portraits), locked “not affiliated” line, dev buy, wallet (Phantom / Solflare / Backpack), real pump.fun create via PumpPortal.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 — /api routes run inside Vite in dev
npm run build      # type-check + production build to dist/
```

## Deploy (Vercel)

After each deploy check: fonts load (JetBrains Mono), the X preview card shows `og.png`, and the map's wire lamp says LIVE (not snapshot).


Import the repo in Vercel (framework: Vite). The `api/` folder deploys as serverless functions automatically.

Environment variables:

| Name | Needed for | Notes |
|---|---|---|
| `PINATA_JWT` | One-click launch | Free Pinata account → API Keys → JWT. Without it the Launch button falls back to “download image + copy fields + open pump.fun/create”. |
| `PINATA_GATEWAY` | optional | e.g. `https://yourname.mypinata.cloud/ipfs/`. Defaults to `https://ipfs.io/ipfs/`. |
| `RPC_URL` | optional | Helius / QuickNode mainnet URL. Defaults to the public Solana RPC (rate-limited). |

## Edit

- `src/config.ts` — $BLOC contract address (`ca`), X link, Telegram, pixel `object`. Empty CA shows "posted here and on X at launch"; buy buttons go to `https://pump.fun/coin/<ca>` once it's set.
- `grafik/` — pfp (2000²), banner (3000×1000), launch (3200×1800), og, fav. Re-render: `cd grafik && npm i @fontsource/jetbrains-mono @fontsource/silkscreen && python3 render.py cfg.json .` (needs Python Playwright). The X banner is its own page without the computer (so it doesn't repeat the pfp): `python3 render_banner.py` in `grafik/` renders `banner.png` from `banner.html` + `world-dots.js`. `x-profile-mock.png` shows how banner and pfp sit together. Pre-launch post images (one per pre-launch post in `brand/x/x-copy.md`): `python3 render_prelaunch.py` renders `prelaunch-1-reveal.png`, `prelaunch-2-inside.png` and `prelaunch-3-sides.png` from `prelaunch.html` + `prelaunch-data.js` (map, blocs and the wire snapshot).
- `data/leaders.raw.json` — heads of state/government (Wikipedia, captured 2 Nov 2026). After editing run `npm run data`.
- `scripts/build-data.mjs` — bloc memberships, aliases used for headline matching, map grid.
- `src/data/heat-snapshot.json` — fallback headline snapshot shown (labelled) if both news feeds are down.

## API routes

- `GET /api/news` — headlines, edge-cached 10 min
- `GET /api/pairs?q=` — Solana coins already using a name (DexScreener)
- `GET /api/config` — whether one-click launch is on
- `POST /api/upload` — image + metadata → IPFS (Pinata)
- `POST /api/create` — PumpPortal local transaction (unsigned; signed in the browser by the mint key + creator wallet)
- `POST /api/rpc` — Solana RPC relay (send / status / balance only)
