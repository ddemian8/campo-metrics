import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Paddle?: any;
    __paddleInitialized?: boolean;
  }
}

const PADDLE_TOKEN = "live_3c42ebb4dbddd6aa1aeaeb1c2cf";
const PRO_PRICE_ID = "pri_01kp5yry5fj52t94grqmmmhyme";
const CLUB_PRICE_ID = "pri_01kp5yxr7mcgxy2ez79c5mm4tg";

function initPaddle() {
  if (window.Paddle && !window.__paddleInitialized) {
    try {
      window.Paddle.Initialize({ token: PADDLE_TOKEN });
      window.__paddleInitialized = true;
      console.log("[Paddle] Initialized successfully");
    } catch (e) {
      console.error("[Paddle] Initialize error:", e);
    }
  }
}

export function usePaddle() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Paddle) {
      initPaddle();
      setReady(true);
      return;
    }

    // Check if script tag already exists
    if (document.querySelector('script[src*="paddle.com"]')) {
      const check = setInterval(() => {
        if (window.Paddle) {
          clearInterval(check);
          initPaddle();
          setReady(true);
        }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      initPaddle();
      setReady(true);
    };
    script.onerror = () => console.error("[Paddle] Failed to load paddle.js");
    document.head.appendChild(script);
  }, []);

  const openCheckout = useCallback(async (plan: "pro" | "club") => {
    if (!window.Paddle) {
      console.error("[Paddle] Paddle not loaded");
      return;
    }
    if (!window.__paddleInitialized) {
      console.error("[Paddle] Paddle not initialized");
      initPaddle();
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = `/signup?redirectTo=/#pricing&plan=${plan}`;
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    const priceId = plan === "pro" ? PRO_PRICE_ID : CLUB_PRICE_ID;
    const planLabel = plan === "pro" ? "pro" : "club";

    const checkoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customer: { email: session.user.email },
      customData: { userId: profile?.id },
      settings: {
        successUrl: `${window.location.origin}/dashboard?payment=success&plan=${planLabel}`,
        theme: "dark",
      },
    };

    console.log("[Paddle] Opening checkout with config:", JSON.stringify(checkoutConfig, null, 2));

    try {
      window.Paddle.Checkout.open(checkoutConfig);
    } catch (e) {
      console.error("[Paddle] Checkout.open error:", e);
    }
  }, []);

  return { ready, openCheckout };
}

export { PRO_PRICE_ID, CLUB_PRICE_ID };
