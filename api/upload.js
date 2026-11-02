// POST /api/upload — stores the coin image + metadata on IPFS (Pinata) and returns the metadata URI.
// Needs env PINATA_JWT. Optional PINATA_GATEWAY (e.g. https://yourname.mypinata.cloud/ipfs/).

const GATEWAY = () => (process.env.PINATA_GATEWAY || 'https://ipfs.io/ipfs/').replace(/\/?$/, '/');

async function pin(file, name) {
  const fd = new FormData();
  fd.append('network', 'public');
  fd.append('name', name);
  fd.append('file', file, name);
  const r = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: fd,
  });
  if (!r.ok) throw new Error(`pinata ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return j.data.cid;
}

const bad = (msg, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request) {
  if (!process.env.PINATA_JWT) return bad('Launch is not switched on for this site yet (PINATA_JWT missing).', 503);
  let form;
  try { form = await request.formData(); } catch { return bad('Expected multipart form data.'); }
  const image = form.get('file');
  const name = String(form.get('name') || '').trim();
  const symbol = String(form.get('symbol') || '').trim().toUpperCase();
  const pairedTo = String(form.get('pairedTo') || '').trim().slice(0, 120);
  const userDesc = String(form.get('description') || '').trim().slice(0, 400);
  const twitter = String(form.get('twitter') || '').trim().slice(0, 200);
  const telegram = String(form.get('telegram') || '').trim().slice(0, 200);
  const website = String(form.get('website') || '').trim().slice(0, 200);

  if (!image || typeof image === 'string') return bad('Missing image.');
  if (image.size > 2.5 * 1024 * 1024) return bad('Image must be under 2.5 MB.');
  if (!/^image\/(png|jpeg|gif|webp)$/.test(image.type)) return bad('Image must be PNG, JPG, GIF or WebP.');
  if (!name || name.length > 32) return bad('Name must be 1–32 characters.');
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return bad('Ticker must be 2–10 letters or numbers.');
  if (/official/i.test(name) || /OFFICIAL/.test(symbol)) return bad('Names and tickers cannot contain "official".');
  if (!pairedTo) return bad('Missing pairing.');

  const pairing = `Memecoin paired to ${pairedTo} on BLOC. Not affiliated with or endorsed by ${pairedTo.split(' (')[0]}.`;
  const description = userDesc ? `${userDesc}\n\n${pairing}` : pairing;

  try {
    const ext = image.type.split('/')[1].replace('jpeg', 'jpg');
    const imageCid = await pin(image, `${symbol.toLowerCase()}.${ext}`);
    const meta = {
      name, symbol, description,
      image: `${GATEWAY()}${imageCid}`,
      showName: true,
      createdOn: 'https://pump.fun',
      ...(twitter ? { twitter } : {}),
      ...(telegram ? { telegram } : {}),
      ...(website ? { website } : {}),
    };
    const metaFile = new Blob([JSON.stringify(meta)], { type: 'application/json' });
    const metaCid = await pin(metaFile, `${symbol.toLowerCase()}.json`);
    return new Response(JSON.stringify({ uri: `${GATEWAY()}${metaCid}`, image: meta.image, description }), {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e) {
    return bad(String(e.message || e), 502);
  }
}
