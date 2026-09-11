import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const PUBLIC_ROUTES = ["/login", "/install", "/reset-password", "/join-donor"];

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return; // loading
    const isPublic = PUBLIC_ROUTES.includes(location.pathname);

    if (!session && !isPublic) {
      navigate("/login", { replace: true });
    }
  }, [session, location.pathname, navigate]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(location.pathname);
  if (!session && !isPublic) return null;

  return <>{children}</>;
};

export default AuthGate;
