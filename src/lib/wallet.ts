// Minimal Solana wallet bridge (Phantom, Solflare, Backpack) without adapter libraries.
export interface SolProvider {
  publicKey?: { toBase58(): string } | null;
  connect: (opts?: unknown) => Promise<unknown>;
  disconnect?: () => Promise<void>;
  signTransaction: <T>(tx: T) => Promise<T>;
}
export interface WalletOption { id: string; name: string; url: string; get: () => SolProvider | undefined }

type W = Window & {
  phantom?: { solana?: SolProvider & { isPhantom?: boolean } };
  solana?: SolProvider & { isPhantom?: boolean };
  solflare?: SolProvider & { isSolflare?: boolean };
  backpack?: { solana?: SolProvider } & Partial<SolProvider>;
};

export const WALLETS: WalletOption[] = [
  { id: 'phantom', name: 'Phantom', url: 'https://phantom.com/download', get: () => { const w = window as W; return w.phantom?.solana || (w.solana?.isPhantom ? w.solana : undefined); } },
  { id: 'solflare', name: 'Solflare', url: 'https://solflare.com/download', get: () => { const w = window as W; return w.solflare?.isSolflare ? w.solflare : undefined; } },
  { id: 'backpack', name: 'Backpack', url: 'https://backpack.app/download', get: () => { const w = window as W; return (w.backpack?.solana || (w.backpack as SolProvider | undefined)) as SolProvider | undefined; } },
];

export async function connectWallet(opt: WalletOption): Promise<{ provider: SolProvider; address: string }> {
  const p = opt.get();
  if (!p) { window.open(opt.url, '_blank', 'noopener'); throw new Error(`${opt.name} is not installed`); }
  const res = (await p.connect()) as { publicKey?: { toBase58(): string } } | boolean | undefined;
  const pk = (typeof res === 'object' && res?.publicKey) || p.publicKey;
  if (!pk) throw new Error('Wallet did not return an address');
  return { provider: p, address: pk.toBase58() };
}

export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
