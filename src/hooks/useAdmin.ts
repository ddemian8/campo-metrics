import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["ddemian6@gmail.com"];

export const useAdmin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const email = session.user.email?.toLowerCase() || "";
      // Also check platform_settings for dynamic admin list
      const { data: setting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_emails")
        .single();
      const adminList = setting?.value
        ? setting.value.split(",").map((e: string) => e.trim().toLowerCase())
        : ADMIN_EMAILS;
      if (!adminList.includes(email)) { navigate("/dashboard"); return; }
      setUser(session.user);
      setIsAdmin(true);
      setLoading(false);
    };
    check();
  }, [navigate]);

  return { isAdmin, loading, user };
};

export const isAdminEmail = async (email: string): Promise<boolean> => {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "admin_emails")
    .single();
  const list = data?.value
    ? data.value.split(",").map((e: string) => e.trim().toLowerCase())
    : ADMIN_EMAILS;
  return list.includes(email.toLowerCase());
};
