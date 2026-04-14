import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Paddle?: any;
  }
}

const PADDLE_TOKEN = "live_3c42ebb4dbddd6aa1aeaeb1c2cf";
const PRO_PRICE_ID = "pri_01kp5yry5fj52t94grqmmmhyme";
const CLUB_PRICE_ID = "pri_01kp5yxr7mcgxy2ez79c5mm4tg";

export function usePaddle() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check if already loaded
    if (window.Paddle) {
      try {
        window.Paddle.Initialize({ token: PADDLE_TOKEN });
      } catch {}
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({ token: PADDLE_TOKEN });
        setReady(true);
      }
    };
    document.head.appendChild(script);
  }, []);

  const openCheckout = useCallback(async (plan: "pro" | "club") => {
    if (!window.Paddle) return;

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

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: session.user.email },
      customData: { userId: profile?.id },
      settings: {
        successUrl: `${window.location.origin}/dashboard?payment=success&plan=${planLabel}`,
        theme: "dark",
      },
    });
  }, []);

  return { ready, openCheckout };
}

export { PRO_PRICE_ID, CLUB_PRICE_ID };
