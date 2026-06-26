import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserProvider, Contract, JsonRpcSigner, formatUnits, parseUnits, MaxUint256 } from 'ethers';
import {
  ClobClient,
  Side,
  OrderType,
  getContractConfig,
  type ApiKeyCreds,
} from '@polymarket/clob-client';
import { PmPosition } from '../../types';

// ─── Polygon mainnet constants (chainId 137) ────────────────────────────────────
const CHAIN_ID = 137;
const CHAIN_ID_HEX = '0x89';
const CLOB_HOST = 'https://clob.polymarket.com';
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e on Polygon
const USDC_DECIMALS = 6;

// Exchange (CTF Exchange) address sourced from the clob-client config — not hardcoded blindly.
const EXCHANGE_ADDRESS = getContractConfig(CHAIN_ID).exchange;

const POLYGON_NETWORK = {
  chainId: CHAIN_ID_HEX,
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
};

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

// Hard safety rail: warn loudly above this notional.
const MAX_SIZE_WARN_USD = 50;
// Sane default — keep the first live order tiny.
const DEFAULT_SIZE = 2; // shares; ~$1 at price 0.50

type SideValue = 'BUY' | 'SELL';

export interface TradePrefill {
  tokenId: string;
  price?: number;
  side?: SideValue;
  title?: string;
  outcome?: string;
}

// ethers v6 exposes `signTypedData`, but @polymarket/clob-client detects an
// ethers signer by the v5-style `_signTypedData`. Adapt the v6 signer here.
function toClobSigner(signer: JsonRpcSigner) {
  return {
    getAddress: () => signer.getAddress(),
    _signTypedData: (domain: any, types: any, value: any) =>
      signer.signTypedData(domain, types, value),
  } as any;
}

const getEthereum = (): any =>
  typeof window !== 'undefined' ? (window as any).ethereum : undefined;

const truncate = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// ─── Spinner ────────────────────────────────────────────────────────────────────
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin text-jtp-textDim ${className ?? 'w-4 h-4'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

interface Props {
  prefill?: TradePrefill | null;
}

const PolymarketTradePanel: React.FC<Props> = ({ prefill }) => {
  // Non-serializable web3 objects live in refs.
  const providerRef = useRef<BrowserProvider | null>(null);
  const signerRef = useRef<JsonRpcSigner | null>(null);
  const clobRef = useRef<ClobClient | null>(null);

  // Wallet state
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [allowanceRaw, setAllowanceRaw] = useState<bigint | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // CLOB state
  const [creds, setCreds] = useState<ApiKeyCreds | null>(null);
  const [initializingClob, setInitializingClob] = useState(false);
  const [clobError, setClobError] = useState<string | null>(null);

  // Order form
  const [tokenId, setTokenId] = useState('');
  const [side, setSide] = useState<SideValue>('BUY');
  const [price, setPrice] = useState('0.50');
  const [size, setSize] = useState(String(DEFAULT_SIZE));
  const [marketTitle, setMarketTitle] = useState<string | null>(null);
  const [outcomeLabel, setOutcomeLabel] = useState<string | null>(null);

  // Placement state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeResult, setPlaceResult] = useState<string | null>(null);

  const hasWallet = !!getEthereum();
  const onPolygon = chainId === CHAIN_ID;

  // ── Prefill from a Quant position ──
  useEffect(() => {
    if (!prefill) return;
    if (prefill.tokenId) setTokenId(prefill.tokenId);
    if (typeof prefill.price === 'number' && prefill.price > 0 && prefill.price < 1) {
      setPrice(prefill.price.toFixed(2));
    }
    if (prefill.side) setSide(prefill.side);
    setMarketTitle(prefill.title ?? null);
    setOutcomeLabel(prefill.outcome ?? null);
    setPlaceResult(null);
    setPlaceError(null);
  }, [prefill]);

  // ── Derived preview ──
  const priceNum = parseFloat(price);
  const sizeNum = parseFloat(size);
  const validPrice = !Number.isNaN(priceNum) && priceNum >= 0.01 && priceNum <= 0.99;
  const validSize = !Number.isNaN(sizeNum) && sizeNum > 0;
  const cost = validPrice && validSize ? priceNum * sizeNum : 0; // USDC cost for BUY
  const maxPayout = validSize ? sizeNum : 0; // each share pays $1 on a winning resolution
  const overMaxGuard = cost > MAX_SIZE_WARN_USD;

  const needsApproval = useMemo(() => {
    if (side !== 'BUY') return false; // SELL spends conditional tokens, not USDC
    if (allowanceRaw == null) return true;
    try {
      const needed = parseUnits(cost.toFixed(USDC_DECIMALS), USDC_DECIMALS);
      return allowanceRaw < needed;
    } catch {
      return true;
    }
  }, [side, allowanceRaw, cost]);

  // ── Read USDC balance + allowance for the exchange ──
  const refreshBalances = useCallback(async (owner: string, provider: BrowserProvider) => {
    try {
      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, provider);
      const [bal, allow] = await Promise.all([
        usdc.balanceOf(owner) as Promise<bigint>,
        usdc.allowance(owner, EXCHANGE_ADDRESS) as Promise<bigint>,
      ]);
      setUsdcBalance(formatUnits(bal, USDC_DECIMALS));
      setAllowanceRaw(allow);
    } catch (e: any) {
      // non-fatal — surface but keep going
      setWalletError(`Could not read USDC balance: ${e?.message || e}`);
    }
  }, []);

  // ── Connect wallet + require Polygon ──
  const connect = useCallback(async () => {
    setWalletError(null);
    const eth = getEthereum();
    if (!eth) {
      setWalletError('No injected wallet found. Install MetaMask or another Polygon wallet.');
      return;
    }
    setConnecting(true);
    try {
      const provider = new BrowserProvider(eth);
      await provider.send('eth_requestAccounts', []);

      let net = await provider.getNetwork();
      if (Number(net.chainId) !== CHAIN_ID) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_ID_HEX }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            await eth.request({ method: 'wallet_addEthereumChain', params: [POLYGON_NETWORK] });
          } else {
            throw switchErr;
          }
        }
        // re-read after switch
        net = await provider.getNetwork();
      }

      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      providerRef.current = provider;
      signerRef.current = signer;
      setAddress(addr);
      setChainId(Number(net.chainId));
      await refreshBalances(addr, provider);
    } catch (e: any) {
      setWalletError(e?.shortMessage || e?.message || 'Failed to connect wallet.');
    } finally {
      setConnecting(false);
    }
  }, [refreshBalances]);

  // ── React to wallet account / chain changes ──
  useEffect(() => {
    const eth = getEthereum();
    if (!eth?.on) return;
    const reset = () => {
      providerRef.current = null;
      signerRef.current = null;
      clobRef.current = null;
      setAddress(null);
      setChainId(null);
      setUsdcBalance(null);
      setAllowanceRaw(null);
      setCreds(null);
    };
    // Re-sync the provider/signer for the new chain or account WITHOUT dropping the
    // connection — connect() triggers a 1→137 switch, and a hard reset here would
    // undo the connect we just made. Only fully reset when the wallet disconnects.
    const reSync = async () => {
      try {
        const e = getEthereum();
        if (!e) return reset();
        const provider = new BrowserProvider(e);
        const accs: string[] = await provider.send('eth_accounts', []);
        if (!accs || accs.length === 0) return reset();
        const net = await provider.getNetwork();
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        providerRef.current = provider;
        signerRef.current = signer;
        clobRef.current = null; // session creds are chain-bound → require re-init
        setCreds(null);
        setAddress(addr);
        setChainId(Number(net.chainId));
        await refreshBalances(addr, provider);
      } catch {
        reset();
      }
    };
    const onAccounts = (accs: string[]) => {
      if (!accs || accs.length === 0) reset();
      else reSync();
    };
    const onChain = () => reSync();
    eth.on('accountsChanged', onAccounts);
    eth.on('chainChanged', onChain);
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts);
      eth.removeListener?.('chainChanged', onChain);
    };
  }, [refreshBalances]);

  // ── Initialise CLOB client + derive L2 creds (triggers a signature) ──
  const initClob = useCallback(async () => {
    if (!signerRef.current) return;
    setClobError(null);
    setInitializingClob(true);
    try {
      const clobSigner = toClobSigner(signerRef.current);
      // L1 client (signer only) to derive API creds.
      const l1 = new ClobClient(CLOB_HOST, CHAIN_ID, clobSigner);
      const apiCreds = await l1.createOrDeriveApiKey();
      // L2 client (signer + creds) for authenticated order posting.
      const l2 = new ClobClient(CLOB_HOST, CHAIN_ID, clobSigner, apiCreds);
      clobRef.current = l2;
      setCreds(apiCreds);
    } catch (e: any) {
      setClobError(e?.shortMessage || e?.message || 'Could not initialise Polymarket CLOB session.');
    } finally {
      setInitializingClob(false);
    }
  }, []);

  // ── Approve USDC for the exchange ──
  const approveUsdc = useCallback(async () => {
    if (!signerRef.current || !providerRef.current || !address) return false;
    setApproving(true);
    setPlaceError(null);
    try {
      const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signerRef.current);
      const tx = await usdc.approve(EXCHANGE_ADDRESS, MaxUint256);
      await tx.wait();
      await refreshBalances(address, providerRef.current);
      return true;
    } catch (e: any) {
      setPlaceError(e?.shortMessage || e?.message || 'USDC approval failed.');
      return false;
    } finally {
      setApproving(false);
    }
  }, [address, refreshBalances]);

  // ── Place the order (called after confirmation) ──
  const placeOrder = useCallback(async () => {
    setPlaceError(null);
    setPlaceResult(null);

    if (!clobRef.current) {
      setPlaceError('CLOB session not ready. Click "Initialise trading session" first.');
      return;
    }
    if (!tokenId.trim()) {
      setPlaceError('Token ID is required.');
      return;
    }
    if (!validPrice || !validSize) {
      setPlaceError('Enter a price between 0.01 and 0.99 and a positive size.');
      return;
    }

    setPlacing(true);
    try {
      // BUY orders spend USDC → ensure allowance first.
      if (needsApproval) {
        const ok = await approveUsdc();
        if (!ok) {
          setPlacing(false);
          return;
        }
      }

      const signedOrder = await clobRef.current.createOrder({
        tokenID: tokenId.trim(),
        price: priceNum,
        side: side === 'BUY' ? Side.BUY : Side.SELL,
        size: sizeNum,
      });
      const resp: any = await clobRef.current.postOrder(signedOrder, OrderType.GTC);

      if (resp && (resp.success === false || resp.error)) {
        setPlaceError(resp.error || resp.errorMsg || 'Order was rejected by the exchange.');
      } else {
        const id = resp?.orderID || resp?.orderId || resp?.id || 'submitted';
        setPlaceResult(`Order ${id} (${resp?.status || 'live'}).`);
        if (address && providerRef.current) await refreshBalances(address, providerRef.current);
      }
    } catch (e: any) {
      setPlaceError(e?.response?.data?.error || e?.shortMessage || e?.message || 'Order failed.');
    } finally {
      setPlacing(false);
      setConfirmOpen(false);
    }
  }, [tokenId, validPrice, validSize, priceNum, sizeNum, side, needsApproval, approveUsdc, address, refreshBalances]);

  const canSubmit =
    !!creds && !!tokenId.trim() && validPrice && validSize && !placing && !approving;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Disclaimer banner */}
      <div className="rounded-jtp-panel border border-[rgba(229,99,95,0.35)] bg-[rgba(229,99,95,0.08)] px-4 py-3">
        <p className="text-jtp-sm font-semibold text-jtp-loss">Live trading — real funds on Polygon mainnet</p>
        <p className="text-jtp-xs text-jtp-textMuted mt-1 leading-relaxed">
          This is a non-custodial connection: you sign every action with your own wallet and JTradePilot
          never holds your keys or funds. Orders place real trades on Polymarket using your USDC.e.
          Prediction markets are high-risk — only trade what you can afford to lose.
        </p>
      </div>

      {/* ── Wallet ── */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-jtp-border">
          <h2 className="text-jtp-base font-semibold text-jtp-text tracking-tight">1 · Wallet</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          {!hasWallet ? (
            <p className="text-jtp-sm text-jtp-textMuted">
              No injected wallet detected.{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-jtp-blue hover:underline font-medium"
              >
                Install MetaMask
              </a>{' '}
              or another Polygon wallet to continue.
            </p>
          ) : !address ? (
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50"
            >
              {connecting ? <Spinner /> : null}
              {connecting ? 'Connecting…' : 'Connect wallet'}
            </button>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-jtp-xs font-medium bg-[rgba(76,195,138,0.12)] text-jtp-profit border border-[rgba(76,195,138,0.25)]">
                    Connected
                  </span>
                  <span className="font-mono text-jtp-sm text-jtp-text">{truncate(address)}</span>
                </div>
                {!onPolygon ? (
                  <button
                    type="button"
                    onClick={connect}
                    className="px-3 py-1.5 rounded-jtp-lg text-jtp-xs font-semibold bg-[rgba(229,99,95,0.12)] text-jtp-loss border border-[rgba(229,99,95,0.3)] hover:bg-[rgba(229,99,95,0.18)] transition-colors"
                  >
                    Wrong network — switch to Polygon
                  </button>
                ) : (
                  <span className="text-jtp-xs text-jtp-textDim font-mono">Polygon · 137</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-jtp-sm">
                <span className="text-jtp-textDim">USDC.e balance:</span>
                <span className="font-mono text-jtp-text font-semibold">
                  {usdcBalance != null ? `${parseFloat(usdcBalance).toFixed(2)} USDC.e` : '—'}
                </span>
              </div>
            </div>
          )}
          {walletError && <p role="alert" className="text-jtp-xs text-jtp-loss">{walletError}</p>}
        </div>
      </div>

      {/* ── CLOB session ── */}
      {address && onPolygon && (
        <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-jtp-border">
            <h2 className="text-jtp-base font-semibold text-jtp-text tracking-tight">2 · Trading session</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {creds ? (
              <p className="text-jtp-sm text-jtp-profit font-medium">Polymarket session ready ✓</p>
            ) : (
              <>
                <p className="text-jtp-xs text-jtp-textMuted">
                  Derive your Polymarket API credentials. This asks your wallet for a one-time signature
                  (no transaction, no gas).
                </p>
                <button
                  type="button"
                  onClick={initClob}
                  disabled={initializingClob}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-active border border-jtp-border text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50"
                >
                  {initializingClob ? <Spinner /> : null}
                  {initializingClob ? 'Signing…' : 'Initialise trading session'}
                </button>
              </>
            )}
            {clobError && <p role="alert" className="text-jtp-xs text-jtp-loss">{clobError}</p>}
          </div>
        </div>
      )}

      {/* ── Order form ── */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-jtp-border">
          <h2 className="text-jtp-base font-semibold text-jtp-text tracking-tight">3 · Order</h2>
          {marketTitle && (
            <p className="text-jtp-xs text-jtp-textMuted mt-1 truncate">
              {marketTitle}
              {outcomeLabel ? <span className="text-jtp-textDim"> · {outcomeLabel}</span> : null}
            </p>
          )}
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Token id */}
          <div className="space-y-1.5">
            <label className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Outcome token id</label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Paste a Polymarket token id (or pick a position from a wallet)"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text placeholder:text-jtp-textDim placeholder:font-sans focus:outline-none focus:border-jtp-borderFocus transition-colors"
            />
          </div>

          {/* Side */}
          <div className="space-y-1.5">
            <label className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Side</label>
            <div className="inline-flex items-center gap-1 p-1 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl">
              {(['BUY', 'SELL'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`px-5 py-1.5 rounded-jtp-lg text-jtp-xs font-semibold uppercase tracking-wide transition-colors ${
                    side === s
                      ? s === 'BUY'
                        ? 'bg-[rgba(76,195,138,0.15)] text-jtp-profit border border-[rgba(76,195,138,0.35)]'
                        : 'bg-[rgba(229,99,95,0.15)] text-jtp-loss border border-[rgba(229,99,95,0.35)]'
                      : 'text-jtp-textDim hover:text-jtp-textMuted border border-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Price + size */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Price (0.01–0.99)</label>
              <input
                type="number"
                min="0.01"
                max="0.99"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Size (shares)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-3.5 py-2.5 text-jtp-sm font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-jtp-xl border border-jtp-border bg-jtp-bg px-4 py-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Shares</div>
              <div className="font-mono text-jtp-lg font-semibold text-jtp-text mt-0.5">
                {validSize ? sizeNum.toLocaleString('en-US') : '—'}
              </div>
            </div>
            <div>
              <div className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">
                {side === 'BUY' ? 'Cost' : 'Proceeds'}
              </div>
              <div className="font-mono text-jtp-lg font-semibold text-jtp-text mt-0.5">
                {validPrice && validSize ? fmtUsd(cost) : '—'}
              </div>
            </div>
            <div>
              <div className="text-jtp-xs text-jtp-textDim uppercase tracking-wide">Max payout</div>
              <div className="font-mono text-jtp-lg font-semibold text-jtp-profit mt-0.5">
                {validSize ? fmtUsd(maxPayout) : '—'}
              </div>
            </div>
          </div>

          {/* Guards / hints */}
          {overMaxGuard && (
            <p className="text-jtp-xs text-jtp-warning">
              ⚠ This order is {fmtUsd(cost)} — above the {fmtUsd(MAX_SIZE_WARN_USD)} guard. Double-check the size.
            </p>
          )}
          {side === 'BUY' && needsApproval && creds && (
            <p className="text-jtp-xs text-jtp-textMuted">
              First BUY needs a one-time USDC.e approval for the exchange — this happens automatically when you confirm.
            </p>
          )}
          {side === 'SELL' && (
            <p className="text-jtp-xs text-jtp-textMuted">
              SELL spends the outcome tokens you already hold (no USDC approval needed).
            </p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={() => {
              setPlaceError(null);
              setPlaceResult(null);
              setConfirmOpen(true);
            }}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {placing || approving ? <Spinner className="w-4 h-4 text-white" /> : null}
            {!creds
              ? 'Initialise trading session first'
              : approving
                ? 'Approving USDC…'
                : placing
                  ? 'Placing order…'
                  : `Review ${side} order`}
          </button>

          {placeError && <p role="alert" className="text-jtp-sm text-jtp-loss">{placeError}</p>}
          {placeResult && (
            <p className="text-jtp-sm text-jtp-profit font-medium">Order placed ✓ — {placeResult}</p>
          )}
        </div>
      </div>

      {/* ── Confirmation modal (safety rail) ── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !placing && !approving && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-jtp-border">
              <h3 className="text-jtp-base font-semibold text-jtp-text">Confirm live order</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-jtp-lg border border-[rgba(229,99,95,0.4)] bg-[rgba(229,99,95,0.1)] px-3.5 py-2.5">
                <p className="text-jtp-xs font-bold text-jtp-loss uppercase tracking-wide">
                  Real funds on Polygon mainnet — this places a live order
                </p>
              </div>

              <dl className="space-y-2 text-jtp-sm">
                {marketTitle && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-jtp-textDim">Market</dt>
                    <dd className="text-jtp-text text-right truncate max-w-[60%]">{marketTitle}</dd>
                  </div>
                )}
                {outcomeLabel && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-jtp-textDim">Outcome</dt>
                    <dd className="text-jtp-text">{outcomeLabel}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-jtp-textDim">Token id</dt>
                  <dd className="font-mono text-jtp-text text-right truncate max-w-[60%]">{truncate(tokenId)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-jtp-textDim">Side</dt>
                  <dd className={`font-semibold ${side === 'BUY' ? 'text-jtp-profit' : 'text-jtp-loss'}`}>{side}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-jtp-textDim">Price</dt>
                  <dd className="font-mono text-jtp-text">{priceNum.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-jtp-textDim">Size</dt>
                  <dd className="font-mono text-jtp-text">{sizeNum} shares</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-jtp-border pt-2">
                  <dt className="text-jtp-textDim">{side === 'BUY' ? 'Cost' : 'Proceeds'}</dt>
                  <dd className="font-mono text-jtp-text font-semibold">{fmtUsd(cost)}</dd>
                </div>
              </dl>

              {overMaxGuard && (
                <p className="text-jtp-xs text-jtp-warning">
                  ⚠ Above the {fmtUsd(MAX_SIZE_WARN_USD)} safety guard.
                </p>
              )}
              {side === 'BUY' && needsApproval && (
                <p className="text-jtp-xs text-jtp-textMuted">
                  A USDC.e approval transaction will be requested before the order.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={placing || approving}
                  className="flex-1 px-4 py-2.5 rounded-jtp-xl text-jtp-sm font-semibold bg-jtp-active border border-jtp-border text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={placing || approving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-jtp-xl text-jtp-sm font-bold bg-jtp-loss text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {(placing || approving) ? <Spinner className="w-4 h-4 text-white" /> : null}
                  {approving ? 'Approving…' : placing ? 'Placing…' : `Place ${side} order`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolymarketTradePanel;
