// src/context/PaddleContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

/**
 * Paddle Billing v2 minimal surface
 */
type PaddleV2 = {
  Initialize: (opts: { token: string; eventCallback?: (e: unknown) => void }) => void; // sync, returns void
  Environment: { set: (env: "sandbox" | "production") => void };
  Checkout: { open: (opts: any) => void; close: () => void };
};

declare global {
  interface Window {
    Paddle?: any;
  }
}

interface PaddleContextType {
  paddle: PaddleV2 | null;
  isLoading: boolean;
}

const PaddleContext = createContext<PaddleContextType | undefined>(undefined);

/**
 * Load the Paddle v2 script from the correct CDN (production or sandbox) and resolve once the v2 API is present.
 * We explicitly check for Initialize + Checkout.open to ensure we're NOT on Classic.
 */
function loadPaddleV2Script(environment: 'sandbox' | 'production'): Promise<PaddleV2> {
  return new Promise((resolve, reject) => {
    // If already loaded and looks like v2, resolve immediately
    if (window.Paddle?.Initialize && window.Paddle?.Checkout?.open) {
      return resolve(window.Paddle as PaddleV2);
    }

    // Remove any Classic script tag if present (defensive)
    const classic = document.querySelector<HTMLScriptElement>(
      "script[src='https://cdn.paddle.com/paddle/paddle.js']"
    );
    if (classic) classic.remove();

    // Determine the correct CDN URL based on environment
    const cdnUrl = environment === 'production'
      ? "https://cdn.paddle.com/paddle/v2/paddle.js"
      : "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js";

    // Avoid injecting multiple copies
    const existingV2 = document.querySelector<HTMLScriptElement>(
      `script[src='${cdnUrl}']`
    );
    if (existingV2) {
      existingV2.addEventListener("load", () => {
        const p = window.Paddle;
        if (p?.Initialize && p?.Checkout?.open) resolve(p as PaddleV2);
        else reject(new Error("Paddle v2 script loaded but API not present."));
      });
      existingV2.addEventListener("error", () =>
        reject(new Error("Failed loading existing Paddle v2 script."))
      );
      return;
    }

    // Inject v2 script
    const s = document.createElement("script");
    s.src = cdnUrl;
    s.async = true;
    s.onload = () => {
      const p = window.Paddle;
      if (p?.Initialize && p?.Checkout?.open) resolve(p as PaddleV2);
      else reject(new Error("Loaded Paddle, but v2 API not present (no Initialize/Checkout.open)."));
    };
    s.onerror = () => reject(new Error("Failed to load Paddle v2 script."));
    document.body.appendChild(s);
  });
}

export const PaddleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [paddle, setPaddle] = useState<PaddleV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ensure we only initialize once per page load (even with Strict Mode)
  const initOnceRef = useRef(false);

  const initializePaddle = useCallback(async () => {
    if (initOnceRef.current) {
      setIsLoading(false);
      return;
    }
    if (!isAuthenticated || !accessToken) {
      setPaddle(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1) Fetch client-side token and environment from your backend
      const { clientSideToken, environment } = await api.getBillingConfig(accessToken);
      const paddleEnv = environment === 'production' ? 'production' : 'sandbox';

      // 2) Load the correct script and verify v2 API surface
      const p = await loadPaddleV2Script(paddleEnv);

      // 3) Set environment BEFORE Initialize
      p.Environment.set(paddleEnv);

      // 4) Initialize (sync, do NOT await)
      p.Initialize({
        token: clientSideToken,
        eventCallback: async (event: any) => {
          console.log('[Paddle] Event received:', event);

          if (event?.name === 'checkout.completed') {
            console.log('✅ Checkout completed! Syncing subscription...');
            p.Checkout.close(); // Auto-close the overlay
            try {
              await api.syncSubscription(accessToken);
              window.dispatchEvent(new Event('payment_success'));
            } catch (err) {
              console.error('Manual sync failed:', err);
            }
          }
        }
      });

      setPaddle(p);
      initOnceRef.current = true;
      // eslint-disable-next-line no-console
      console.log(`%c[Paddle] v2 initialized (${paddleEnv})`, "color:#39FF14");
    } catch (err) {
      console.error("[Paddle] initialization failed:", err);
      setPaddle(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    void initializePaddle();
  }, [initializePaddle]);

  return (
    <PaddleContext.Provider value={{ paddle, isLoading }}>
      {children}
    </PaddleContext.Provider>
  );
};

export const usePaddle = () => {
  const ctx = useContext(PaddleContext);
  if (!ctx) throw new Error("usePaddle must be used within a PaddleProvider");
  return ctx;
};
