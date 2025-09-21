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
  Checkout: { open: (opts: any) => void };
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
 * Load the Paddle v2 script from the sandbox CDN and resolve once the v2 API is present.
 * We explicitly check for Initialize + Checkout.open to ensure we're NOT on Classic.
 */
function loadPaddleV2Script(): Promise<PaddleV2> {
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

    // Avoid injecting multiple copies
    const existingV2 = document.querySelector<HTMLScriptElement>(
      "script[src='https://sandbox-cdn.paddle.com/paddle/v2/paddle.js']"
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
    s.src = "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js";
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
    if (!isAuthenticated) {
      setPaddle(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1) Load the correct script and verify v2 API surface
      const p = await loadPaddleV2Script();

      // 2) Fetch client-side token from your backend
      const { clientSideToken } = await api.getBillingConfig(accessToken!);

      // 3) Sandbox must be set BEFORE Initialize
      p.Environment.set("sandbox");

      // 4) Initialize (sync, do NOT await)
      p.Initialize({ token: clientSideToken });

      setPaddle(p);
      initOnceRef.current = true;
      // eslint-disable-next-line no-console
      console.log("%c[Paddle] v2 initialized", "color:#39FF14");
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
