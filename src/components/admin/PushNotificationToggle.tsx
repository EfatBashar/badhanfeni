import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BM_7-qRdsMMJLaEASwDTRPh-aNewQXJrwA0b-qCaYRcSGJNBHqE74pAQW0DAZMC8NhmLjq4ccXtZ6-bBNZi-x1U";

const toUint8 = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export default function PushNotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported()) return;
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setEnabled(!!s));
  }, []);

  const enable = async () => {
    if (!supported()) return toast.error("এই ব্রাউজারে নোটিফিকেশন সাপোর্ট নেই। iPhone হলে আগে Home Screen-এ অ্যাপটি ইনস্টল করুন।");
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("নোটিফিকেশন পারমিশন দেওয়া হয়নি");
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) throw new Error("প্রকাশিত (published) অ্যাপ থেকে চালু করুন — প্রিভিউতে কাজ করে না");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(VAPID_PUBLIC_KEY) });
      const j = sub.toJSON();
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("push_subscriptions").upsert(
        { endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, user_id: u.user?.id ?? null },
        { onConflict: "endpoint" },
      );
      if (error) throw error;
      setEnabled(true);
      toast.success("এই ফোনে নোটিফিকেশন চালু হয়েছে ✅");
    } catch (e) {
      toast.error((e as Error).message || "চালু করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setEnabled(false);
    setBusy(false);
    toast.success("নোটিফিকেশন বন্ধ করা হয়েছে");
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="text-sm">
        <p className="font-semibold">মোবাইল নোটিফিকেশন</p>
        <p className="text-muted-foreground">নতুন রক্তের রিকোয়েস্ট এলে এই ফোনে নোটিফিকেশন যাবে</p>
      </div>
      <Button size="sm" variant={enabled ? "outline" : "default"} onClick={enabled ? disable : enable} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {enabled ? "বন্ধ করুন" : "চালু করুন"}
      </Button>
    </div>
  );
}
