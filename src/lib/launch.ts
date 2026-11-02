import type { SolProvider } from './wallet';

export interface LaunchInput {
  provider: SolProvider;
  address: string;
  image: Blob;
  name: string;
  symbol: string;
  description: string;
  pairedTo: string;
  twitter?: string;
  telegram?: string;
  website: string;
  devBuy: number;
  log: (line: string, kind?: 'ok' | 'err' | 'info') => void;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const r = await fetch('/api/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'RPC error');
  return j.result as T;
}

const toB64 = (u8: Uint8Array) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
const fromB64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));

export async function launchCoin(i: LaunchInput): Promise<{ mint: string; sig: string }> {
  const { Keypair, VersionedTransaction } = await import('@solana/web3.js');

  i.log('Checking wallet balance');
  const bal = await rpc<{ value: number }>('getBalance', [i.address, { commitment: 'confirmed' }]);
  const need = i.devBuy + 0.03;
  if (bal.value / 1e9 < need) throw new Error(`Not enough SOL: you have ${(bal.value / 1e9).toFixed(3)}, need about ${need.toFixed(3)}`);

  i.log('Pinning image and metadata to IPFS');
  const fd = new FormData();
  fd.append('file', i.image, 'coin.png');
  fd.append('name', i.name);
  fd.append('symbol', i.symbol);
  fd.append('description', i.description);
  fd.append('pairedTo', i.pairedTo);
  fd.append('website', i.website);
  if (i.twitter) fd.append('twitter', i.twitter);
  if (i.telegram) fd.append('telegram', i.telegram);
  const up = await fetch('/api/upload', { method: 'POST', body: fd });
  const upj = await up.json();
  if (!up.ok) throw new Error(upj.error || 'Upload failed');
  i.log(`Metadata pinned · ${upj.uri.split('/').pop().slice(0, 14)}…`, 'ok');

  i.log('Building the pump.fun create transaction');
  const mint = Keypair.generate();
  const cr = await fetch('/api/create', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicKey: i.address, mint: mint.publicKey.toBase58(), name: i.name, symbol: i.symbol, uri: upj.uri, amount: i.devBuy }),
  });
  const crj = await cr.json();
  if (!cr.ok) throw new Error(crj.error || 'Could not build transaction');
  const tx = VersionedTransaction.deserialize(fromB64(crj.tx));
  tx.sign([mint]);

  i.log('Approve the launch in your wallet');
  const signed = await i.provider.signTransaction(tx);

  i.log('Sending to Solana');
  const sig = await rpc<string>('sendTransaction', [toB64(signed.serialize()), { encoding: 'base64', skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 4 }]);
  i.log(`Sent · ${sig.slice(0, 10)}…`, 'ok');

  i.log('Waiting for confirmation');
  const t0 = Date.now();
  while (Date.now() - t0 < 75_000) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await rpc<{ value: ({ confirmationStatus?: string; err?: unknown } | null)[] }>('getSignatureStatuses', [[sig], { searchTransactionHistory: false }]);
    const s = st.value[0];
    if (s?.err) throw new Error('Transaction failed on-chain');
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) {
      i.log('Confirmed. Your coin is live on pump.fun.', 'ok');
      return { mint: mint.publicKey.toBase58(), sig };
    }
  }
  i.log('Still pending — check the transaction link below.', 'info');
  return { mint: mint.publicKey.toBase58(), sig };
}
