import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_TO_PLAN: Record<string, string> = {
  "pri_01kp5yry5fj52t94grqmmmhyme": "player_pro",
  "pri_01kp5yxr7mcgxy2ez79c5mm4tg": "club",
};

const PLAN_TO_AMOUNT: Record<string, number> = {
  player_pro: 9,
  club: 59,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventType = body.event_type;
    const data = body.data;

    console.log(`Paddle webhook received: ${eventType}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract user ID from custom_data
    const customData = data?.custom_data;
    const userId = customData?.userId;

    if (!userId && eventType !== "transaction.completed" && eventType !== "transaction.payment_failed") {
      console.log("No userId in custom_data, checking subscription");
    }

    // Determine plan from price ID
    const getPlanFromItems = (items: any[]): string => {
      if (!items?.length) return "player_pro";
      for (const item of items) {
        const priceId = item.price?.id || item.price_id;
        if (priceId && PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId];
      }
      return "player_pro";
    };

    // Find profile by userId (which is profile.id)
    const findProfile = async (profileId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("id", profileId)
        .single();
      return profile;
    };

    // Find profile by paddle_customer_id
    const findProfileByCustomer = async (customerId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("paddle_customer_id", customerId)
        .single();
      return profile;
    };

    switch (eventType) {
      case "subscription.created": {
        const plan = getPlanFromItems(data.items);
        const subscriptionId = data.id;
        const customerId = data.customer_id;
        const nextBilledAt = data.next_billed_at || data.current_billing_period?.ends_at;

        let profileId = userId;
        if (!profileId && customerId) {
          const p = await findProfileByCustomer(customerId);
          if (p) profileId = p.id;
        }

        if (profileId) {
          await supabase.from("profiles").update({
            subscription_plan: plan,
            subscription_status: "active",
            paddle_subscription_id: subscriptionId,
            paddle_customer_id: customerId,
            subscription_started_at: new Date().toISOString(),
            subscription_current_period_end: nextBilledAt || null,
            subscription_cancel_at: null,
          }).eq("id", profileId);
          console.log(`Subscription created for profile ${profileId}: ${plan}`);
        }
        break;
      }

      case "subscription.updated": {
        const plan = getPlanFromItems(data.items);
        const subscriptionId = data.id;
        const customerId = data.customer_id;
        const nextBilledAt = data.next_billed_at || data.current_billing_period?.ends_at;
        const scheduledChange = data.scheduled_change;

        let profileId = userId;
        if (!profileId && customerId) {
          const p = await findProfileByCustomer(customerId);
          if (p) profileId = p.id;
        }

        if (profileId) {
          const updates: any = {
            subscription_plan: plan,
            subscription_current_period_end: nextBilledAt || null,
            paddle_subscription_id: subscriptionId,
          };

          if (scheduledChange?.action === "cancel") {
            updates.subscription_status = "canceled";
            updates.subscription_cancel_at = scheduledChange.effective_at;
          } else if (data.status === "active") {
            updates.subscription_status = "active";
            updates.subscription_cancel_at = null;
          } else if (data.status === "paused") {
            updates.subscription_status = "paused";
          }

          await supabase.from("profiles").update(updates).eq("id", profileId);
          console.log(`Subscription updated for profile ${profileId}`);
        }
        break;
      }

      case "subscription.canceled": {
        const customerId = data.customer_id;
        const effectiveAt = data.effective_at || data.current_billing_period?.ends_at;

        let profileId = userId;
        if (!profileId && customerId) {
          const p = await findProfileByCustomer(customerId);
          if (p) profileId = p.id;
        }

        if (profileId) {
          await supabase.from("profiles").update({
            subscription_status: "canceled",
            subscription_cancel_at: effectiveAt || null,
          }).eq("id", profileId);
          console.log(`Subscription canceled for profile ${profileId}`);
        }
        break;
      }

      case "subscription.paused": {
        const customerId = data.customer_id;

        let profileId = userId;
        if (!profileId && customerId) {
          const p = await findProfileByCustomer(customerId);
          if (p) profileId = p.id;
        }

        if (profileId) {
          await supabase.from("profiles").update({
            subscription_status: "paused",
          }).eq("id", profileId);
          console.log(`Subscription paused for profile ${profileId}`);
        }
        break;
      }

      case "transaction.completed": {
        const customerId = data.customer_id;
        const plan = getPlanFromItems(data.items);
        const amount = data.details?.totals?.total
          ? parseFloat(data.details.totals.total) / 100
          : PLAN_TO_AMOUNT[plan] || 0;
        const currency = data.currency_code || "EUR";
        const transactionId = data.id;

        let profileId = userId;
        if (!profileId && customerId) {
          const p = await findProfileByCustomer(customerId);
          if (p) profileId = p.id;
        }

        if (profileId) {
          await supabase.from("transactions").insert({
            user_id: profileId,
            paddle_transaction_id: transactionId,
            amount,
            currency,
            status: "completed",
            plan_type: plan,
          });
          console.log(`Transaction recorded for profile ${profileId}: €${amount}`);
        }
        break;
      }

      case "transaction.payment_failed": {
        const customerId = data.customer_id;

        let profileId = userId;
        if (!profileId && customerId) {
          const p = await findProfileByCustomer(customerId);
          if (p) profileId = p.id;
        }

        if (profileId) {
          await supabase.from("profiles").update({
            subscription_status: "past_due",
          }).eq("id", profileId);

          const plan = getPlanFromItems(data.items);
          await supabase.from("transactions").insert({
            user_id: profileId,
            paddle_transaction_id: data.id,
            amount: 0,
            currency: data.currency_code || "EUR",
            status: "failed",
            plan_type: plan,
          });
          console.log(`Payment failed for profile ${profileId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
