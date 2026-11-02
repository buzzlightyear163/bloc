import { useEffect, useMemo, useRef, useState } from 'react';
import { SUBJECT_BY_KEY, searchSubjects, initials, COUNTRIES, type Subject } from '../lib/world';
import { BLOC_BY_CODE } from '../lib/blocs';
import { renderCoinImage, canvasToBlob, subjectColor } from '../lib/coinImage';
import { WALLETS, connectWallet, short, type SolProvider } from '../lib/wallet';
import { launchCoin } from '../lib/launch';
import { SectionHead } from './Sections';

interface Props { subjectKey: string; setSubjectKey: (k: string) => void; launchOn: boolean }
type Log = { t: string; k: 'ok' | 'err' | 'info' };

function pairedLabel(s: Subject) {
  if (s.kind === 'leader') return `${s.name} (${s.sub})`;
  if (s.kind === 'bloc') return `${s.name}${s.bloc && BLOC_BY_CODE[s.bloc].name !== s.name ? ` (${BLOC_BY_CODE[s.bloc].name})` : ''}`;
  return s.name;
}

export default function Pair({ subjectKey, setSubjectKey, launchOn }: Props) {
  const subject = SUBJECT_BY_KEY.get(subjectKey)!;
  const [q, setQ] = useState('');
  const results = useMemo(() => searchSubjects(q, 80), [q]);
  const [name, setName] = useState(subject.name);
  const [ticker, setTicker] = useState(subject.ticker);
  const [desc, setDesc] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [tg, setTg] = useState('');
  const [devBuy, setDevBuy] = useState(0.1);
  const [upload, setUpload] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [wallet, setWallet] = useState<{ provider: SolProvider; address: string; name: string } | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ mint: string; sig: string } | null>(null);
  const cvs = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setName(subject.name.slice(0, 32)); setTicker(subject.ticker); setDone(null); setLogs([]); }, [subjectKey]); // eslint-disable-line
  useEffect(() => { if (cvs.current) renderCoinImage(cvs.current, subject, ticker); }, [subject, ticker]);
  useEffect(() => { if (!upload) { setUploadUrl(''); return; } const u = URL.createObjectURL(upload); setUploadUrl(u); return () => URL.revokeObjectURL(u); }, [upload]);

  const T = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const errors: string[] = [];
  if (!name.trim() || name.length > 32) errors.push('Name must be 1–32 characters.');
  if (T.length < 2 || T.length > 10) errors.push('Ticker must be 2–10 letters or numbers.');
  if (/official/i.test(name) || /OFFICIAL/.test(T)) errors.push('No “official” in names or tickers.');
  if (!(devBuy >= 0.01 && devBuy <= 5)) errors.push('Dev buy must be 0.01–5 SOL.');
  const pairing = `Memecoin paired to ${pairedLabel(subject)} on BLOC. Not affiliated with or endorsed by ${subject.name}.`;
  const log = (t: string, k: Log['k'] = 'info') => setLogs((l) => [...l, { t, k }]);

  async function imageBlob(): Promise<Blob> {
    if (upload) return upload;
    return canvasToBlob(cvs.current!);
  }

  async function onLaunch() {
    if (!wallet || errors.length) return;
    setBusy(true); setDone(null); setLogs([]);
    try {
      const res = await launchCoin({
        provider: wallet.provider, address: wallet.address, image: await imageBlob(), name: name.trim(), symbol: T,
        description: desc.trim(), pairedTo: pairedLabel(subject), twitter: xUrl.trim(), telegram: tg.trim(),
        website: window.location.origin, devBuy, log,
      });
      setDone(res);
    } catch (e) {
      log((e as Error).message || String(e), 'err');
    } finally { setBusy(false); }
  }

  async function onHandoff() {
    const b = await imageBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `${T.toLowerCase()}.png`; a.click();
    const text = `${name.trim()}\n$${T}\n\n${desc.trim() ? desc.trim() + '\n\n' : ''}${pairing}`;
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setLogs([{ t: 'Coin image downloaded.', k: 'ok' }, { t: 'Name, ticker and description copied.', k: 'ok' }, { t: 'Paste them on pump.fun and upload the image.', k: 'info' }]);
    window.open('https://pump.fun/create', '_blank', 'noopener');
  }

  const color = subjectColor(subject);

  return (
    <section className="sec" id="pair">
      <div className="wrap">
        <SectionHead k="04 — Launch" title="Pair a coin." sub="Pick who it’s paired to, name it, launch it. One transaction, your wallet, live on pump.fun." />
        <div className="pair">
          <div className="pair-pick">
            <div className="search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leaders, countries and blocs" aria-label="Search subjects" />
            </div>
            <div className="results" role="listbox">
              {results.map((s) => (
                <button key={s.key} role="option" aria-selected={s.key === subjectKey} className={`res ${s.key === subjectKey ? 'on' : ''}`} onClick={() => setSubjectKey(s.key)}>
                  <span className="res-av mono" style={{ '--c': subjectColor(s) } as React.CSSProperties}>
                    {s.kind === 'bloc' ? s.ticker.slice(0, 4) : s.kind === 'country' ? COUNTRIES[s.country!].id : initials(s.name)}
                  </span>
                  <span className="res-txt"><b>{s.name}</b><span>{s.sub}</span></span>
                  <span className="res-kind mono">{s.kind}</span>
                </button>
              ))}
              {!results.length && <p className="muted small pad">No match. Try a country or a last name.</p>}
            </div>
          </div>

          <div className="pair-build">
            <div className="build-top">
              <div className="preview" style={{ '--c': color } as React.CSSProperties}>
                <canvas ref={cvs} style={{ display: upload ? 'none' : 'block' }} />
                {upload && <img src={uploadUrl} alt="Your coin image" />}
              </div>
              <div className="build-meta">
                <div className="kicker mono">Paired to</div>
                <div className="paired"><b>{subject.name}</b><span>{subject.sub}</span></div>
                <div className="img-switch">
                  <button className={!upload ? 'on' : ''} onClick={() => setUpload(null)}>Generated</button>
                  <label className={upload ? 'on' : ''}>
                    Upload
                    <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setUpload(e.target.files?.[0] || null)} hidden />
                  </label>
                </div>
              </div>
            </div>

            <div className="fields">
              <label className="field"><span>Name</span><input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} /><em className="mono">{name.length}/32</em></label>
              <label className="field"><span>Ticker</span><div className="tick"><b>$</b><input value={T} maxLength={10} onChange={(e) => setTicker(e.target.value)} /></div></label>
              <label className="field wide"><span>Description <i>optional</i></span><textarea rows={2} value={desc} maxLength={400} onChange={(e) => setDesc(e.target.value)} placeholder="Say something. Or don’t." /></label>
              <div className="field wide lock"><span>Pairing line <i>always added</i></span><p>{pairing}</p></div>
              <label className="field"><span>X link <i>optional</i></span><input value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/…" /></label>
              <label className="field"><span>Telegram <i>optional</i></span><input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="https://t.me/…" /></label>
              <div className="field wide">
                <span>Dev buy</span>
                <div className="devbuy">
                  {[0.05, 0.1, 0.5, 1, 2].map((v) => <button key={v} className={devBuy === v ? 'on' : ''} onClick={() => setDevBuy(v)}>{v} SOL</button>)}
                  <input type="number" min={0.01} max={5} step={0.01} value={devBuy} onChange={(e) => setDevBuy(Number(e.target.value))} aria-label="Dev buy in SOL" />
                </div>
              </div>
            </div>

            {errors.length > 0 && <p className="err small">{errors[0]}</p>}

            {launchOn ? (
              <div className="launch-row">
                {wallet ? (
                  <span className="wallet-chip mono"><i />{wallet.name} · {short(wallet.address)}</span>
                ) : (
                  <div className="wallets">
                    {WALLETS.map((w) => (
                      <button key={w.id} className="btn btn-line btn-sm" onClick={async () => {
                        try { const r = await connectWallet(w); setWallet({ ...r, name: w.name }); } catch (e) { log((e as Error).message, 'err'); }
                      }}>{w.name}</button>
                    ))}
                  </div>
                )}
                <button className="btn btn-primary btn-launch" disabled={!wallet || busy || errors.length > 0} onClick={onLaunch}>
                  {busy ? 'Launching…' : `Launch $${T || '—'}`}
                </button>
              </div>
            ) : (
              <div className="launch-row">
                <p className="muted small handoff-note">Downloads the coin image, copies the name, ticker and pairing line, and opens pump.fun’s launcher.</p>
                <button className="btn btn-primary btn-launch" disabled={errors.length > 0} onClick={onHandoff}>Launch ${T || '—'} on pump.fun</button>
              </div>
            )}

            {logs.length > 0 && (
              <div className="console mono" aria-live="polite">
                {logs.map((l, i) => <div key={i} className={l.k}><span>{l.k === 'err' ? '✕' : l.k === 'ok' ? '✓' : '›'}</span>{l.t}</div>)}
              </div>
            )}

            {done && (
              <div className="done">
                <div className="kicker mono">Live · contract address</div>
                <code>{done.mint}</code>
                <div className="done-links">
                  <a className="btn btn-primary btn-sm" href={`https://pump.fun/coin/${done.mint}`} target="_blank" rel="noreferrer">Open on pump.fun</a>
                  <a className="btn btn-line btn-sm" href={`https://solscan.io/tx/${done.sig}`} target="_blank" rel="noreferrer">Transaction</a>
                  <button className="btn btn-line btn-sm" onClick={() => navigator.clipboard.writeText(done.mint)}>Copy CA</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
