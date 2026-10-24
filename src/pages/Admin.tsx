import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Users, UserCog, Droplets, UserPlus2, Megaphone } from "lucide-react";
import DonorManagement from "@/components/admin/DonorManagement";
import CommitteeManagement from "@/components/admin/CommitteeManagement";
import BloodRequestList from "@/components/admin/BloodRequestList";
import PushNotificationToggle from "@/components/admin/PushNotificationToggle";
import NewSignupsList from "@/components/admin/NewSignupsList";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import type { Session } from "@supabase/supabase-js";

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/login");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const ADMIN_EMAIL = "badhanfgcunit2018@gmail.com";

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!session) return null;

  if (session.user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-lg font-semibold text-destructive">⛔ আপনার অ্যাডমিন অ্যাক্সেস নেই</p>
        <Button variant="outline" onClick={() => navigate("/")}>হোমে ফিরে যান</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">অ্যাডমিন প্যানেল</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> লগআউট
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <PushNotificationToggle />
        <Tabs defaultValue="donors" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="donors" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" /> ডোনার
            </TabsTrigger>
            <TabsTrigger value="committee" className="gap-1 text-xs sm:text-sm">
              <UserCog className="h-4 w-4" /> কমিটি
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1 text-xs sm:text-sm">
              <Droplets className="h-4 w-4" /> অনুরোধ
            </TabsTrigger>
            <TabsTrigger value="signups" className="gap-1 text-xs sm:text-sm">
              <UserPlus2 className="h-4 w-4" /> সাইনআপ
            </TabsTrigger>
            <TabsTrigger value="announcement" className="gap-1 text-xs sm:text-sm">
              <Megaphone className="h-4 w-4" /> ঘোষণা
            </TabsTrigger>
          </TabsList>

          <TabsContent value="donors"><DonorManagement /></TabsContent>
          <TabsContent value="committee"><CommitteeManagement /></TabsContent>
          <TabsContent value="requests"><BloodRequestList /></TabsContent>
          <TabsContent value="signups"><NewSignupsList /></TabsContent>
          <TabsContent value="announcement"><AnnouncementManager /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
