import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CloudOff, Heart, Loader2, Wifi } from "lucide-react";
import { bloodGroups } from "@/data/donors";
import { flushDonorQueue, getQueuedDonors, queueDonor, submitDonor, validateDonor, type DonorRegistration } from "@/lib/donorRegistration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Seo from "@/components/Seo";
import GenderNameWarning from "@/components/GenderNameWarning";

const emptyForm: DonorRegistration = { name: "", phone: "", blood_group: "", gender: "male" };

const JoinDonor = () => {
  const [form, setForm] = useState<DonorRegistration>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(() => getQueuedDonors().length);

  const syncPending = useCallback(async () => {
    if (!navigator.onLine || getQueuedDonors().length === 0) return;
    const result = await flushDonorQueue();
    setPending(result.pending);
    if (result.synced > 0) setMessage(`${result.synced}টি pending registration সফলভাবে জমা হয়েছে।`);
    if (result.duplicates > 0 && result.synced === 0) setMessage("এই phone number আগে থেকেই donor list-এ আছে।");
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      void syncPending();
    };
    const handleOffline = () => setOnline(false);
    const handleQueue = () => setPending(getQueuedDonors().length);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("donor-queue-change", handleQueue);
    void syncPending();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("donor-queue-change", handleQueue);
    };
  }, [syncPending]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const validationError = validateDonor(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!navigator.onLine) {
      queueDonor(form);
      setForm(emptyForm);
      setMessage("তথ্য offline-এ রাখা হয়েছে। Internet এলে automatic জমা হবে।");
      return;
    }

    setLoading(true);
    try {
      const result = await submitDonor(form);
      if (result === "duplicate") setError("এই phone number দিয়ে আগে থেকেই donor list-এ আছেন।");
      else {
        setForm(emptyForm);
        setMessage("আপনি donor list-এ যোগ হয়েছেন। ধন্যবাদ!");
      }
    } catch {
      if (!navigator.onLine) {
        queueDonor(form);
        setForm(emptyForm);
        setMessage("তথ্য offline-এ রাখা হয়েছে। Internet এলে automatic জমা হবে।");
      } else setError("তথ্য জমা দেওয়া যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Seo title="Donor Registration | বাঁধন ফেনী" description="QR scan করে বাঁধন ফেনী সরকারি কলেজ ইউনিটের donor list-এ যোগ দিন।" path="/join-donor" />
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary"><Heart className="h-6 w-6 fill-primary" /><span className="font-semibold">বাঁধন</span></div>
            <h1 className="text-2xl font-bold text-foreground">Donor হিসেবে যোগ দিন</h1>
            <p className="mt-1 text-sm text-muted-foreground">ফেনী সরকারি কলেজ ইউনিট</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {online ? <Wifi className="h-4 w-4 text-primary" /> : <CloudOff className="h-4 w-4 text-destructive" />}
            {online ? "Online" : "Offline"}
          </div>
        </div>

        {pending > 0 && <p className="mb-4 rounded-md bg-muted p-3 text-sm text-foreground">{pending}টি registration internet-এর অপেক্ষায় আছে।</p>}
        {message && <p role="status" className="mb-4 flex gap-2 rounded-md bg-accent p-3 text-sm text-accent-foreground"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</p>}
        {error && <p role="alert" className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="donor-name">নাম</Label><Input id="donor-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="সম্পূর্ণ নাম" autoComplete="name" /></div>
          <div className="space-y-2"><Label htmlFor="donor-phone">Phone number</Label><Input id="donor-phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
          <div className="space-y-2"><Label>Gender</Label><Select value={form.gender} onValueChange={(value: "male" | "female") => setForm({ ...form, gender: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">পুরুষ</SelectItem><SelectItem value="female">মহিলা</SelectItem></SelectContent></Select><GenderNameWarning name={form.name} gender={form.gender} onFix={() => setForm({ ...form, gender: "female" })} onSelectGender={(g) => setForm({ ...form, gender: g })} /></div>
          <div className="space-y-2"><Label>Blood group</Label><Select value={form.blood_group} onValueChange={(value) => setForm({ ...form, blood_group: value })}><SelectTrigger><SelectValue placeholder="Blood group নির্বাচন করুন" /></SelectTrigger><SelectContent>{bloodGroups.map((group) => <SelectItem key={group} value={group}>{group}</SelectItem>)}</SelectContent></Select></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> জমা হচ্ছে...</> : "Donor হিসেবে যোগ দিন"}</Button>
        </form>
        <Button asChild variant="ghost" className="mt-3 w-full"><Link to="/login">মূল website-এ যান</Link></Button>
      </section>
    </main>
  );
};

export default JoinDonor;