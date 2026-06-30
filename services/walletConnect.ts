/**
 * services/walletConnect.ts
 *
 * Thin wrapper around @walletconnect/ethereum-provider that exposes:
 *   - isWalletConnectConfigured() — fast sync check before showing the button
 *   - getWalletConnectProvider()  — lazy-init singleton
 *   - connectWalletConnect()      — shows QR (desktop) / deep-link (mobile), returns EIP-1193 + address
 *   - disconnectWalletConnect()   — closes session and clears the singleton
 *
 * The singleton pattern means a second click reuses the already-open QR modal
 * session rather than creating a new one.
 *
 * Throws a clear error when VITE_WALLETCONNECT_PROJECT_ID is absent so callers
 * can surface it without examining the env themselves.
 */

import { EthereumProvider } from '@walletconnect/ethereum-provider';

// Module-level singleton — one session at a time across all panels.
let _wcProvider: EthereumProvider | null = null;

/** Returns true when a WalletConnect project ID is configured. */
export function isWalletConnectConfigured(): boolean {
  return !!(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined);
}

/**
 * Lazily initialises the WalletConnect EthereumProvider.
 * Reuses the existing instance if one already exists.
 */
export async function getWalletConnectProvider(): Promise<EthereumProvider> {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
  if (!projectId) {
    throw new Error(
      'WalletConnect not configured — set VITE_WALLETCONNECT_PROJECT_ID in your environment.',
    );
  }

  if (_wcProvider) return _wcProvider;

  _wcProvider = await EthereumProvider.init({
    projectId,
    chains: [137],
    optionalChains: [137],
    showQrModal: true,
    rpcMap: { 137: 'https://polygon-bor-rpc.publicnode.com' },
    metadata: {
      name: 'JTradePilot',
      description: 'Polymarket trading',
      url: 'https://jtradepilot.com',
      icons: ['https://jtradepilot.com/icon-192.png'],
    },
  });

  return _wcProvider;
}

/**
 * Connect via WalletConnect. Shows a QR code on desktop, triggers a deep-link
 * on mobile — no in-app-browser hop required.
 *
 * Caches the provider singleton so repeated clicks reuse the same session.
 *
 * @returns The EIP-1193 provider (pass to `new BrowserProvider(eip1193)`) and
 *          the first connected address (lowercased, checksummed by ethers later).
 */
export async function connectWalletConnect(): Promise<{
  eip1193: EthereumProvider;
  address: string;
}> {
  const provider = await getWalletConnectProvider();
  await provider.enable();

  const address = provider.accounts[0];
  if (!address) {
    throw new Error('WalletConnect: no account returned after connection.');
  }

  return { eip1193: provider, address };
}

/**
 * Disconnect the active WalletConnect session and clear the singleton.
 * Safe to call even when no session exists.
 */
export async function disconnectWalletConnect(): Promise<void> {
  if (_wcProvider) {
    try {
      await _wcProvider.disconnect();
    } catch {
      // Session may already be gone on the relay side; ignore.
    }
    _wcProvider = null;
  }
}
