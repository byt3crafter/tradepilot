import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserProvider, Contract, JsonRpcSigner, formatUnits, parseUnits, MaxUint256 } from 'ethers';
import {
  ClobClient,
  Side,
  OrderType,
  getContractConfig,
  type ApiKeyCreds,
} from '@polymarket/clob-client';
import { PmPosition, PolymarketMarket, PolymarketOutcome } from '../../types';
import api from '../../services/api';

// ─── Polygon mainnet constants (chainId 137) ─────────────────────────────────
const CHAIN_ID = 137;
const CHAIN_ID_HEX = '0x89';
const CLOB_HOST = 'https://clob.polymarket.com';
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e on Polygon
const USDC_DECIMALS = 6;

// Exchange (CTF Exchange) address sourced from the clob-client config.
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
    _signTypedData: (domain: unknown, types: unknown, value: unknown) =>
      signer.signTypedData(domain as Parameters<typeof signer.signTypedData>[0], types as Parameters<typeof signer.signTypedData>[1], value as Parameters<typeof signer.signTypedData>[2]),
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const getEthereum = (): any => // eslint-disable-line @typescript-eslint/no-explicit-any
  typeof window !== 'undefined' ? (window as any).ethereum : undefined; // eslint-disable-line @typescript-eslint/no-explicit-any

const truncate = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

/** Format a 0..1 price as cents, e.g. 0.62 → "62¢" */
const fmtCents = (p: number) => `${Math.round(p * 100)}¢`;

/** Format dollar amount, e.g. 1200000 → "$1.2M" or 1234.5 → "$1,234.50" */
const fmtVol = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Spinner ─────────────────────────────────────────────────────────────────
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className ?? 'w-4 h-4 text-jtp-textDim'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

// ─── Quick-amount chip ────────────────────────────────────────────────────────
const AmountChip: React.FC<{ label: string; onClick: () => void; active?: boolean }> = ({
  label,
  onClick,
  active,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-jtp-lg text-sm font-semibold transition-colors ${
      active
        ? 'bg-jtp-blue text-white'
        : 'bg-jtp-active border border-jtp-borderStrong text-jtp-textSoft hover:bg-jtp-hover hover:text-jtp-text'
    }`}
  >
    {label}
  </button>
);

interface Props {
  prefill?: TradePrefill | null;
}

const PolymarketTradePanel: React.FC<Props> = ({ prefill }) => {
  // Non-serializable web3 objects live in refs.
  const providerRef = useRef<BrowserProvider | null>(null);
  const signerRef = useRef<JsonRpcSigner | null>(null);
  const clobRef = useRef<ClobClient | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Wallet state ──
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [allowanceRaw, setAllowanceRaw] = useState<bigint | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // ── CLOB session state ──
  const [creds, setCreds] = useState<ApiKeyCreds | null>(null);
  const [initializingClob, setInitializingClob] = useState(false);
  const [clobError, setClobError] = useState<string | null>(null);

  // ── Market browser state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  // ── Selected market / outcome ──
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);
  const [selectedOutcomeIdx, setSelectedOutcomeIdx] = useState<number | null>(null);

  // ── Order form ──
  const [side, setSide] = useState<SideValue>('BUY');
  const [usdAmount, setUsdAmount] = useState('');

  // ── Advanced fallback (collapsed by default) ──
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advTokenId, setAdvTokenId] = useState('');
  const [advPrice, setAdvPrice] = useState('0.50');
  const [advSize, setAdvSize] = useState('2');

  // ── Placement state ──
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeResult, setPlaceResult] = useState<string | null>(null);

  const hasWallet = !!getEthereum();
  const onPolygon = chainId === CHAIN_ID;
  const sessionReady = !!address && onPolygon && !!creds;

  // ── Derived: active outcome & trade params ──
  const selectedOutcome: PolymarketOutcome | null =
    selectedMarket && selectedOutcomeIdx !== null
      ? selectedMarket.outcomes[selectedOutcomeIdx] ?? null
      : null;

  const usingAdvanced = showAdvanced && !selectedOutcome;

  const tradeTokenId = usingAdvanced ? advTokenId.trim() : (selectedOutcome?.tokenId ?? '');
  const tradePriceNum = usingAdvanced ? parseFloat(advPrice) : (selectedOutcome?.price ?? 0);
  const usdNum = parseFloat(usdAmount) || 0;

  // In normal mode: user enters USD → shares = usd / price
  // In advanced mode: user enters shares directly
  const tradeSizeNum = usingAdvanced
    ? parseFloat(advSize) || 0
    : tradePriceNum > 0 && usdNum > 0
      ? usdNum / tradePriceNum
      : 0;

  const validTradePrice = !Number.isNaN(tradePriceNum) && tradePriceNum >= 0.01 && tradePriceNum <= 0.99;
  const validTradeSize = !Number.isNaN(tradeSizeNum) && tradeSizeNum > 0;

  // Cost in USDC for BUY
  const cost = usingAdvanced
    ? validTradePrice && validTradeSize ? tradePriceNum * tradeSizeNum : 0
    : usdNum;

  const maxPayout = validTradeSize ? tradeSizeNum : 0;
  const potentialProfit = cost > 0 && maxPayout > cost ? maxPayout - cost : 0;
  const overMaxGuard = cost > MAX_SIZE_WARN_USD;

  const needsApproval = useMemo(() => {
    if (side !== 'BUY') return false;
    if (allowanceRaw == null) return true;
    if (cost <= 0) return false;
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
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
        } catch (switchErr: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (switchErr?.code === 4902) {
            await eth.request({ method: 'wallet_addEthereumChain', params: [POLYGON_NETWORK] });
          } else {
            throw switchErr;
          }
        }
        net = await provider.getNetwork();
      }

      const signer = await provider.getSigner();
      const addr = await signer.getAddress();

      providerRef.current = provider;
      signerRef.current = signer;
      setAddress(addr);
      setChainId(Number(net.chainId));
      await refreshBalances(addr, provider);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
        clobRef.current = null;
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

  // ── Initialise CLOB client + derive L2 creds (triggers a wallet signature) ──
  const initClob = useCallback(async () => {
    if (!signerRef.current) return;
    setClobError(null);
    setInitializingClob(true);
    try {
      const clobSigner = toClobSigner(signerRef.current);
      const l1 = new ClobClient(CLOB_HOST, CHAIN_ID, clobSigner);
      const apiCreds = await l1.createOrDeriveApiKey();
      const l2 = new ClobClient(CLOB_HOST, CHAIN_ID, clobSigner, apiCreds);
      clobRef.current = l2;
      setCreds(apiCreds);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
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
      setPlaceError('CLOB session not ready. Initialise your trading session first.');
      return;
    }
    if (!tradeTokenId) {
      setPlaceError('No outcome selected. Pick an outcome from the market browser.');
      return;
    }
    if (!validTradePrice || !validTradeSize) {
      setPlaceError('Price must be between 0.01 and 0.99 and size must be positive.');
      return;
    }

    setPlacing(true);
    try {
      if (needsApproval) {
        const ok = await approveUsdc();
        if (!ok) {
          setPlacing(false);
          return;
        }
      }

      const signedOrder = await clobRef.current.createOrder({
        tokenID: tradeTokenId,
        price: tradePriceNum,
        side: side === 'BUY' ? Side.BUY : Side.SELL,
        size: tradeSizeNum,
      });
      const resp: any = await clobRef.current.postOrder(signedOrder, OrderType.GTC); // eslint-disable-line @typescript-eslint/no-explicit-any

      if (resp && (resp.success === false || resp.error)) {
        setPlaceError(resp.error || resp.errorMsg || 'Order was rejected by the exchange.');
      } else {
        const id = resp?.orderID || resp?.orderId || resp?.id || 'submitted';
        setPlaceResult(`Order ${id} (${resp?.status || 'live'}).`);
        if (address && providerRef.current) await refreshBalances(address, providerRef.current);
      }
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setPlaceError(e?.response?.data?.error || e?.shortMessage || e?.message || 'Order failed.');
    } finally {
      setPlacing(false);
      setConfirmOpen(false);
    }
  }, [tradeTokenId, validTradePrice, validTradeSize, tradePriceNum, tradeSizeNum, side, needsApproval, approveUsdc, address, refreshBalances]);

  // ── Load markets from backend ──
  const loadMarkets = useCallback(async (q?: string) => {
    setLoadingMarkets(true);
    setMarketsError(null);
    try {
      const data = await api.quantMarkets(q);
      setMarkets(data);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setMarketsError(e?.message || 'Could not load markets. Please try again.');
      setMarkets([]);
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  // Load trending markets on mount
  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  // ── Debounced search ──
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadMarkets(q.trim() || undefined);
    }, 350);
  };

  // ── Select an outcome (from market card click) ──
  const selectOutcome = useCallback((market: PolymarketMarket, outcomeIdx: number) => {
    setSelectedMarket(market);
    setSelectedOutcomeIdx(outcomeIdx);
    setUsdAmount('');
    setPlaceError(null);
    setPlaceResult(null);
    setShowAdvanced(false);
    // Scroll to ticket
    setTimeout(() => {
      document.getElementById('poly-trade-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }, []);

  // ── Prefill from a scanned wallet position ──
  useEffect(() => {
    if (!prefill) return;
    // Build a synthetic market from the prefill so the ticket renders correctly
    const syntheticMarket: PolymarketMarket = {
      question: prefill.title ?? 'Position from wallet scan',
      slug: '',
      conditionId: prefill.tokenId,
      outcomes: [
        {
          label: prefill.outcome ?? 'Outcome',
          tokenId: prefill.tokenId,
          price: typeof prefill.price === 'number' && prefill.price > 0 ? prefill.price : 0.5,
        },
      ],
    };
    setSelectedMarket(syntheticMarket);
    setSelectedOutcomeIdx(0);
    if (prefill.side) setSide(prefill.side);
    setUsdAmount('');
    setPlaceResult(null);
    setPlaceError(null);
    setShowAdvanced(false);
  }, [prefill]);

  const canSubmit =
    !!creds && !!tradeTokenId && validTradePrice && validTradeSize && !placing && !approving;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Disclaimer banner ── */}
      <div className="rounded-jtp-panel border border-[rgba(229,99,95,0.35)] bg-[rgba(229,99,95,0.08)] px-4 py-3">
        <p className="text-base font-semibold text-jtp-loss">Live trading — real funds on Polygon mainnet</p>
        <p className="text-sm text-jtp-textMuted mt-1 leading-relaxed">
          Non-custodial: you sign every action with your own wallet. JTradePilot never holds your
          keys or funds. Orders place real trades on Polymarket using your USDC.e.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — WALLET                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-jtp-border flex items-center gap-2">
          <span className="text-jtp-textDim text-sm font-medium uppercase tracking-wide">Step 1</span>
          <span className="text-base font-semibold text-jtp-text">Wallet</span>
        </div>

        <div className="px-5 py-4">
          {!hasWallet ? (
            <p className="text-base text-jtp-textMuted">
              No injected wallet detected.{' '}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-jtp-blue hover:underline font-semibold"
              >
                Install MetaMask
              </a>{' '}
              or another Polygon wallet to continue.
            </p>
          ) : !address ? (
            <div className="flex flex-col gap-3">
              <p className="text-base text-jtp-textSoft">Connect your Polygon wallet to browse markets and trade.</p>
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-jtp-xl text-base font-semibold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 w-fit"
              >
                {connecting ? <Spinner className="w-4 h-4 text-white" /> : null}
                {connecting ? 'Connecting…' : 'Connect wallet'}
              </button>
            </div>
          ) : (
            /* Compact connected state */
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* Status pill */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-[rgba(76,195,138,0.12)] text-jtp-profit border border-[rgba(76,195,138,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-jtp-profitDot" />
                  Connected
                </span>
                {/* Address */}
                <span className="font-mono text-base text-jtp-text font-medium">{truncate(address)}</span>
                {/* Chain */}
                {onPolygon ? (
                  <span className="text-sm text-jtp-textDim font-mono">Polygon · 137</span>
                ) : (
                  <button
                    type="button"
                    onClick={connect}
                    className="text-sm font-semibold px-3 py-1 rounded-jtp-lg bg-[rgba(229,99,95,0.12)] text-jtp-loss border border-[rgba(229,99,95,0.3)] hover:bg-[rgba(229,99,95,0.18)] transition-colors"
                  >
                    Wrong network — switch to Polygon
                  </button>
                )}
              </div>

              {/* USDC Balance — prominent */}
              <div className="flex items-baseline gap-2">
                <span className="text-base text-jtp-textDim">USDC.e balance</span>
                <span className="font-mono text-2xl font-bold text-jtp-text">
                  {usdcBalance != null ? parseFloat(usdcBalance).toFixed(2) : '—'}
                </span>
                {usdcBalance != null && (
                  <span className="text-sm text-jtp-textMuted font-semibold">USDC.e</span>
                )}
              </div>

              {/* Session init (inline when address ok, Polygon ok, but no creds yet) */}
              {onPolygon && !creds && (
                <div className="flex flex-col gap-2 pt-1">
                  <p className="text-sm text-jtp-textMuted">
                    One-time signature needed (no gas) to start your Polymarket CLOB session.
                  </p>
                  <button
                    type="button"
                    onClick={initClob}
                    disabled={initializingClob}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-jtp-xl text-base font-semibold bg-jtp-active border border-jtp-borderStrong text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50 w-fit"
                  >
                    {initializingClob ? <Spinner className="w-4 h-4 text-jtp-textDim" /> : null}
                    {initializingClob ? 'Signing…' : 'Initialise trading session'}
                  </button>
                  {clobError && (
                    <p role="alert" className="text-sm text-jtp-loss">{clobError}</p>
                  )}
                </div>
              )}

              {/* All ready banner */}
              {onPolygon && creds && (
                <div className="flex items-center gap-2 text-base text-jtp-profit font-semibold">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                  </svg>
                  Session ready — you can place live orders
                </div>
              )}
            </div>
          )}

          {walletError && (
            <p role="alert" className="text-sm text-jtp-loss mt-3">{walletError}</p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — MARKET BROWSER                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <div className="px-5 py-3.5 border-b border-jtp-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-jtp-textDim text-sm font-medium uppercase tracking-wide">Step 2</span>
            <span className="text-base font-semibold text-jtp-text">Browse markets</span>
          </div>
          {selectedOutcome && (
            <span className="text-sm text-jtp-textDim">
              Viewing <span className="text-jtp-text font-medium">{selectedOutcome.label}</span> selected
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Search box */}
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-jtp-textDim pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search Polymarket…  e.g. Trump, Bitcoin, Fed"
              className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl pl-10 pr-4 py-3 text-base text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
              aria-label="Search markets"
            />
            {loadingMarkets && (
              <Spinner className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-jtp-textDim" />
            )}
          </div>

          {/* Error */}
          {marketsError && (
            <p role="alert" className="text-sm text-jtp-loss">{marketsError}</p>
          )}

          {/* Empty / loading */}
          {!loadingMarkets && markets.length === 0 && !marketsError && (
            <p className="text-base text-jtp-textMuted text-center py-8">
              {searchQuery ? `No markets found for "${searchQuery}"` : 'Loading trending markets…'}
            </p>
          )}

          {/* Market cards */}
          {markets.length > 0 && (
            <div className="space-y-3">
              {markets.map((market) => (
                <MarketCard
                  key={market.conditionId}
                  market={market}
                  selectedOutcomeIdx={
                    selectedMarket?.conditionId === market.conditionId
                      ? selectedOutcomeIdx
                      : null
                  }
                  onSelectOutcome={(idx) => selectOutcome(market, idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — TRADE TICKET (appears when outcome selected)              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedOutcome && selectedMarket && (
        <div
          id="poly-trade-ticket"
          className="bg-jtp-panel border border-jtp-borderStrong rounded-jtp-panel overflow-hidden animate-jtp-fade-in"
        >
          <div className="px-5 py-3.5 border-b border-jtp-border flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-jtp-textDim text-sm font-medium uppercase tracking-wide">Step 3</span>
              <span className="text-base font-semibold text-jtp-text">Trade ticket</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMarket(null);
                setSelectedOutcomeIdx(null);
                setPlaceError(null);
                setPlaceResult(null);
              }}
              className="text-sm text-jtp-textDim hover:text-jtp-textSoft transition-colors"
            >
              ← Back to markets
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Market header */}
            <div className="space-y-2">
              <p className="text-lg font-semibold text-jtp-text leading-snug">
                {selectedMarket.question}
              </p>
              <div className="flex items-center gap-3">
                {/* Chosen outcome badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-jtp-lg text-base font-bold ${
                    selectedOutcome.label.toUpperCase() === 'YES' || selectedOutcome.label.toUpperCase() === 'NO'
                      ? selectedOutcome.label.toUpperCase() === 'YES'
                        ? 'bg-[rgba(76,195,138,0.15)] text-jtp-profit border border-[rgba(76,195,138,0.35)]'
                        : 'bg-[rgba(229,99,95,0.12)] text-jtp-loss border border-[rgba(229,99,95,0.3)]'
                      : 'bg-jtp-active border border-jtp-borderStrong text-jtp-textSoft'
                  }`}
                >
                  {selectedOutcome.label}
                  <span className="font-mono text-xl font-bold">
                    {fmtCents(selectedOutcome.price)}
                  </span>
                </span>
                {selectedMarket.category && (
                  <span className="text-sm text-jtp-textDim">{selectedMarket.category}</span>
                )}
              </div>
            </div>

            {/* Side toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-jtp-textDim uppercase tracking-wide">Side</label>
              <div className="inline-flex items-center gap-1 p-1 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl">
                {(['BUY', 'SELL'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`px-6 py-2 rounded-jtp-lg text-sm font-bold uppercase tracking-wide transition-colors ${
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

            {/* USD Amount input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-jtp-textDim uppercase tracking-wide">
                Amount (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-jtp-textDim font-mono pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl pl-8 pr-4 py-3.5 text-2xl font-bold font-mono text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
                  aria-label="USD amount to spend"
                />
              </div>
              {/* Quick chips */}
              <div className="flex flex-wrap items-center gap-2">
                {['5', '25', '100'].map((v) => (
                  <AmountChip
                    key={v}
                    label={`$${v}`}
                    active={usdAmount === v}
                    onClick={() => setUsdAmount(v)}
                  />
                ))}
                {usdcBalance && parseFloat(usdcBalance) > 0 && (
                  <AmountChip
                    label="Max"
                    active={usdAmount === parseFloat(usdcBalance).toFixed(2)}
                    onClick={() => setUsdAmount(parseFloat(usdcBalance).toFixed(2))}
                  />
                )}
              </div>
              {/* Shares helper */}
              {usdNum > 0 && tradePriceNum > 0 && (
                <p className="text-sm text-jtp-textDim">
                  ≈{' '}
                  <span className="font-mono font-semibold text-jtp-textSoft">
                    {(usdNum / tradePriceNum).toFixed(2)}
                  </span>{' '}
                  shares at {fmtCents(tradePriceNum)}
                </p>
              )}
            </div>

            {/* Order summary */}
            <div className="rounded-jtp-xl border border-jtp-border bg-jtp-bg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-jtp-borderSubtle">
                <p className="text-sm font-semibold text-jtp-textDim uppercase tracking-wide">Order summary</p>
              </div>
              <div className="divide-y divide-jtp-borderSubtle">
                <SummaryRow label="Price" value={tradePriceNum > 0 ? fmtCents(tradePriceNum) : '—'} mono />
                <SummaryRow
                  label={side === 'BUY' ? 'Cost (USDC)' : 'Proceeds (USDC)'}
                  value={cost > 0 ? fmtUsd(cost) : '—'}
                  mono
                  emphasis
                />
                <SummaryRow
                  label="Shares"
                  value={tradeSizeNum > 0 ? tradeSizeNum.toFixed(2) : '—'}
                  mono
                />
                <SummaryRow
                  label="Max payout"
                  value={maxPayout > 0 ? fmtUsd(maxPayout) : '—'}
                  mono
                  positive
                />
                <SummaryRow
                  label="Potential profit"
                  value={potentialProfit > 0 ? `+${fmtUsd(potentialProfit)}` : '—'}
                  mono
                  positive={potentialProfit > 0}
                />
              </div>
            </div>

            {/* Guards */}
            {overMaxGuard && (
              <p className="text-sm text-jtp-warning font-medium">
                This order is {fmtUsd(cost)} — above the {fmtUsd(MAX_SIZE_WARN_USD)} safety guard. Double-check your amount.
              </p>
            )}
            {side === 'BUY' && needsApproval && creds && (
              <p className="text-sm text-jtp-textMuted">
                First BUY needs a one-time USDC.e approval for the exchange — this happens automatically when you confirm.
              </p>
            )}
            {side === 'SELL' && (
              <p className="text-sm text-jtp-textMuted">
                SELL spends the outcome tokens you already hold — no USDC approval needed.
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
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-jtp-xl text-lg font-bold bg-jtp-blue text-white hover:bg-jtp-blueHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placing || approving ? <Spinner className="w-5 h-5 text-white" /> : null}
              {!creds
                ? 'Connect & initialise wallet first'
                : approving
                  ? 'Approving USDC…'
                  : placing
                    ? 'Placing order…'
                    : `Review ${side} order →`}
            </button>

            {placeError && (
              <p role="alert" className="text-base text-jtp-loss font-medium">{placeError}</p>
            )}
            {placeResult && (
              <p className="text-base text-jtp-profit font-semibold">Order placed — {placeResult}</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ADVANCED FALLBACK — collapsed by default                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-jtp-panel border border-jtp-border rounded-jtp-panel overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-jtp-hover transition-colors"
          aria-expanded={showAdvanced}
        >
          <span className="text-sm font-medium text-jtp-textDim">Advanced: paste outcome token id manually</span>
          <svg
            className={`w-4 h-4 text-jtp-textDim transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="px-5 pb-5 space-y-4 border-t border-jtp-border">
            <p className="text-sm text-jtp-textMuted pt-4">
              For power users: manually enter a token id, price, and size to trade any outcome directly.
            </p>

            {/* Token id */}
            <div className="space-y-1.5">
              <label className="text-sm text-jtp-textDim font-medium">Outcome token id</label>
              <input
                type="text"
                value={advTokenId}
                onChange={(e) => setAdvTokenId(e.target.value)}
                placeholder="Paste a Polymarket outcome token id…"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-4 py-3 text-sm font-mono text-jtp-text placeholder:text-jtp-textDim focus:outline-none focus:border-jtp-borderFocus transition-colors"
              />
            </div>

            {/* Price + size */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-jtp-textDim font-medium">Price (0.01–0.99)</label>
                <input
                  type="number"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={advPrice}
                  onChange={(e) => setAdvPrice(e.target.value)}
                  className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-4 py-3 text-base font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-jtp-textDim font-medium">Size (shares)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={advSize}
                  onChange={(e) => setAdvSize(e.target.value)}
                  className="w-full bg-jtp-bg border border-jtp-borderStrong rounded-jtp-xl px-4 py-3 text-base font-mono text-jtp-text focus:outline-none focus:border-jtp-borderFocus transition-colors"
                />
              </div>
            </div>

            {/* Side toggle (advanced) */}
            <div className="space-y-1.5">
              <label className="text-sm text-jtp-textDim font-medium">Side</label>
              <div className="inline-flex items-center gap-1 p-1 bg-jtp-control border border-jtp-borderStrong rounded-jtp-xl">
                {(['BUY', 'SELL'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`px-5 py-2 rounded-jtp-lg text-sm font-bold uppercase tracking-wide transition-colors ${
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

            {/* Submit (advanced) */}
            <button
              type="button"
              onClick={() => {
                setSelectedMarket(null);
                setSelectedOutcomeIdx(null);
                setPlaceError(null);
                setPlaceResult(null);
                setConfirmOpen(true);
              }}
              disabled={
                !creds ||
                !advTokenId.trim() ||
                !(parseFloat(advPrice) >= 0.01 && parseFloat(advPrice) <= 0.99) ||
                !(parseFloat(advSize) > 0) ||
                placing ||
                approving
              }
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-jtp-xl text-base font-bold bg-jtp-active border border-jtp-borderStrong text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placing || approving ? <Spinner className="w-4 h-4 text-jtp-textDim" /> : null}
              {!creds ? 'Initialise session first' : `Review ${side} order (advanced)`}
            </button>

            {placeError && !selectedOutcome && (
              <p role="alert" className="text-base text-jtp-loss font-medium">{placeError}</p>
            )}
            {placeResult && !selectedOutcome && (
              <p className="text-base text-jtp-profit font-semibold">Order placed — {placeResult}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Confirmation modal (safety rail — existing logic preserved) ── */}
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
            <div className="px-6 py-5 border-b border-jtp-border">
              <h3 className="text-xl font-bold text-jtp-text">Confirm live order</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Danger banner */}
              <div className="rounded-jtp-lg border border-[rgba(229,99,95,0.4)] bg-[rgba(229,99,95,0.1)] px-4 py-3">
                <p className="text-sm font-bold text-jtp-loss uppercase tracking-wide">
                  Real funds on Polygon mainnet — this places a live order
                </p>
              </div>

              <dl className="space-y-3">
                {(selectedMarket?.question || usingAdvanced) && (
                  <ConfirmRow
                    label="Market"
                    value={selectedMarket?.question ?? '—'}
                    truncate
                  />
                )}
                {selectedOutcome && (
                  <ConfirmRow label="Outcome" value={selectedOutcome.label} />
                )}
                <ConfirmRow label="Token id" value={truncate(tradeTokenId)} mono />
                <ConfirmRow
                  label="Side"
                  value={side}
                  className={side === 'BUY' ? 'font-bold text-jtp-profit' : 'font-bold text-jtp-loss'}
                />
                <ConfirmRow
                  label="Price"
                  value={tradePriceNum > 0 ? fmtCents(tradePriceNum) : '—'}
                  mono
                />
                <ConfirmRow
                  label="Shares"
                  value={tradeSizeNum > 0 ? `${tradeSizeNum.toFixed(2)} shares` : '—'}
                  mono
                />
                <div className="border-t border-jtp-border pt-3">
                  <ConfirmRow
                    label={side === 'BUY' ? 'Cost (USDC)' : 'Proceeds (USDC)'}
                    value={cost > 0 ? fmtUsd(cost) : '—'}
                    mono
                    emphasis
                  />
                </div>
              </dl>

              {overMaxGuard && (
                <p className="text-sm text-jtp-warning font-medium">
                  Above the {fmtUsd(MAX_SIZE_WARN_USD)} safety guard — are you sure?
                </p>
              )}
              {side === 'BUY' && needsApproval && (
                <p className="text-sm text-jtp-textMuted">
                  A USDC.e approval transaction will be requested before the order.
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={placing || approving}
                  className="flex-1 px-4 py-3 rounded-jtp-xl text-base font-semibold bg-jtp-active border border-jtp-border text-jtp-text hover:bg-jtp-hover transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={placing || approving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-jtp-xl text-base font-bold bg-jtp-loss text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {placing || approving ? <Spinner className="w-4 h-4 text-white" /> : null}
                  {approving ? 'Approving USDC…' : placing ? 'Placing order…' : `Place ${side} order`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Market Card ─────────────────────────────────────────────────────────────

interface MarketCardProps {
  market: PolymarketMarket;
  selectedOutcomeIdx: number | null;
  onSelectOutcome: (idx: number) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, selectedOutcomeIdx, onSelectOutcome }) => {
  const isBinary = market.outcomes.length === 2;
  const vol = market.volume != null ? fmtVol(market.volume) : null;

  return (
    <div
      className={`rounded-jtp-panel border transition-colors ${
        selectedOutcomeIdx !== null
          ? 'border-jtp-blue bg-[rgba(91,141,239,0.05)]'
          : 'border-jtp-border bg-jtp-bg hover:border-jtp-borderStrong'
      }`}
    >
      <div className="px-4 pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {market.image && (
            <img
              src={market.image}
              alt=""
              className="w-10 h-10 rounded-jtp-lg object-cover shrink-0 mt-0.5"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-jtp-text leading-snug">{market.question}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {market.category && (
                <span className="text-sm text-jtp-textDim px-2 py-0.5 rounded-full bg-jtp-active border border-jtp-borderSubtle">
                  {market.category}
                </span>
              )}
              {vol && (
                <span className="text-sm text-jtp-textMuted font-mono">{vol} Vol</span>
              )}
              {market.endDate && (
                <span className="text-sm text-jtp-textFaint">
                  Closes {new Date(market.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Outcome buttons */}
        <div className={`mt-3 ${isBinary ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}`}>
          {market.outcomes.map((outcome, idx) => {
            const isSelected = selectedOutcomeIdx === idx;
            const isYes = outcome.label.toUpperCase() === 'YES';
            const isNo = outcome.label.toUpperCase() === 'NO';
            const pct = Math.round(outcome.price * 100);

            return (
              <button
                key={outcome.tokenId}
                type="button"
                onClick={() => onSelectOutcome(idx)}
                className={`flex items-center justify-between px-4 py-3 rounded-jtp-xl border font-semibold transition-all ${
                  isSelected
                    ? isYes || (!isNo && idx === 0)
                      ? 'bg-[rgba(76,195,138,0.2)] border-[rgba(76,195,138,0.5)] text-jtp-profit'
                      : 'bg-[rgba(229,99,95,0.15)] border-[rgba(229,99,95,0.4)] text-jtp-loss'
                    : isYes || (!isNo && !isBinary && idx === 0)
                      ? 'bg-[rgba(76,195,138,0.06)] border-[rgba(76,195,138,0.2)] text-jtp-profit hover:bg-[rgba(76,195,138,0.12)] hover:border-[rgba(76,195,138,0.35)]'
                      : isNo
                        ? 'bg-[rgba(229,99,95,0.06)] border-[rgba(229,99,95,0.2)] text-jtp-loss hover:bg-[rgba(229,99,95,0.12)] hover:border-[rgba(229,99,95,0.35)]'
                        : 'bg-jtp-active border-jtp-borderStrong text-jtp-textSoft hover:bg-jtp-hover hover:text-jtp-text'
                }`}
                aria-pressed={isSelected}
                aria-label={`Select ${outcome.label} at ${pct}¢`}
              >
                <span className="text-base font-bold">{outcome.label}</span>
                <span className="font-mono text-xl font-bold tabular-nums">{pct}¢</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Summary row (trade ticket) ───────────────────────────────────────────────

interface SummaryRowProps {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
  positive?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, mono, emphasis, positive }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-jtp-textDim">{label}</span>
    <span
      className={[
        mono ? 'font-mono' : '',
        emphasis ? 'text-xl font-bold text-jtp-text' : 'text-base font-semibold',
        positive ? 'text-jtp-profit' : emphasis ? 'text-jtp-text' : 'text-jtp-textSoft',
      ].join(' ')}
    >
      {value}
    </span>
  </div>
);

// ─── Confirm modal row ────────────────────────────────────────────────────────

interface ConfirmRowProps {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
  truncate?: boolean;
  className?: string;
}

const ConfirmRow: React.FC<ConfirmRowProps> = ({ label, value, mono, emphasis, truncate: trunc, className }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-base text-jtp-textDim shrink-0">{label}</dt>
    <dd
      className={[
        'text-right',
        mono ? 'font-mono' : '',
        emphasis ? 'text-xl font-bold text-jtp-text' : 'text-base text-jtp-text',
        trunc ? 'truncate max-w-[60%]' : '',
        className ?? '',
      ].join(' ')}
    >
      {value}
    </dd>
  </div>
);

export default PolymarketTradePanel;
