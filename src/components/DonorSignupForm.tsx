import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bloodGroups } from "@/data/donors";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, FileUp, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import DonorQrCode from "@/components/DonorQrCode";
import GenderNameWarning from "@/components/GenderNameWarning";
import { looksFemale } from "@/lib/genderDetect";

interface ParsedDonor {
  name: string;
  phone: string;
  blood_group: string;
  gender: string;
  status: "pending" | "duplicate" | "added" | "error";
}

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("ফাইল পড়া যায়নি"));
    reader.readAsDataURL(file);
  });

const DonorSignupForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", blood_group: "", gender: "male" });
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [parsedDonors, setParsedDonors] = useState<ParsedDonor[]>([]);
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [addingFromPdf, setAddingFromPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const phoneRegex = /^01[3-9][0-9]{8}$/;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.blood_group) {
      toast({ title: "ত্রুটি", description: "সব তথ্য পূরণ করুন", variant: "destructive" });
      return;
    }

    if (form.name.trim().length < 2) {
      toast({ title: "ত্রুটি", description: "নাম কমপক্ষে ২ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }

    if (!phoneRegex.test(form.phone.trim())) {
      toast({ title: "ত্রুটি", description: "সঠিক ফোন নম্বর দিন (01XXXXXXXXX)", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from("donors")
      .select("id, name")
      .eq("phone", form.phone.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      setLoading(false);
      toast({
        title: "ডুপ্লিকেট ডোনার!",
        description: `এই ফোন নম্বর (${form.phone.trim()}) দিয়ে "${existing[0].name}" ইতোমধ্যেই ডোনার তালিকায় আছেন।`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("donors").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      blood_group: form.blood_group,
      gender: form.gender,
    });
    setLoading(false);

    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল!", description: "আপনি ডোনার তালিকায় যোগ হয়েছেন। ধন্যবাদ! 🎉" });
      setForm({ name: "", phone: "", blood_group: "", gender: "male" });
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const allowed = files.filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );

    if (allowed.length === 0) {
      toast({ title: "ত্রুটি", description: "শুধু ছবি (JPG/PNG) বা PDF আপলোড করুন", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPdfLoading(true);

    try {
      const payload = await Promise.all(
        allowed.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          base64: await readAsBase64(file),
        }))
      );

      const { data, error } = await supabase.functions.invoke("parse-donor-pdf", {
        body: { files: payload },
      });

      if (error) throw error;
      if (data?.error && !(data?.donors?.length)) throw new Error(data.error);

      const donors = (data?.donors ?? []) as Array<{ name: string; phone: string; blood_group: string }>;

      if (donors.length === 0) {
        toast({
          title: "কোনো ডোনার পাওয়া যায়নি",
          description: "ফাইল থেকে ডোনারের তথ্য বের করা যায়নি। আরও স্পষ্ট ছবি দিয়ে চেষ্টা করুন।",
          variant: "destructive",
        });
        return;
      }

      const phones = donors.map((d) => d.phone);
      const { data: existing } = await supabase.from("donors").select("phone").in("phone", phones);
      const existingSet = new Set((existing ?? []).map((d) => d.phone));

      setParsedDonors(
        donors.map((d) => ({
          name: d.name,
          phone: d.phone,
          blood_group: d.blood_group,
          gender: looksFemale(d.name) ? "female" : "male",
          status: existingSet.has(d.phone) ? "duplicate" : "pending",
        }))
      );
      setShowPdfDialog(true);
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message || "ফাইল প্রক্রিয়া করতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const updateParsed = (index: number, patch: Partial<ParsedDonor>) => {
    setParsedDonors((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const removeParsed = (index: number) => {
    setParsedDonors((prev) => prev.filter((_, i) => i !== index));
  };

  const pendingCount = parsedDonors.filter((d) => d.status === "pending").length;

  const handleAddParsedDonors = async () => {
    if (pendingCount === 0) {
      toast({ title: "কোনো নতুন ডোনার নেই", description: "সব ডোনার ইতোমধ্যেই তালিকায় আছেন।" });
      return;
    }

    setAddingFromPdf(true);
    let addedCount = 0;

    const updated = [...parsedDonors];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "pending") continue;

      const name = updated[i].name.trim();
      const phone = updated[i].phone.trim();

      if (name.length < 2 || !phoneRegex.test(phone) || !bloodGroups.includes(updated[i].blood_group)) {
        updated[i].status = "error";
        continue;
      }

      const { error } = await supabase.from("donors").insert({
        name,
        phone,
        blood_group: updated[i].blood_group,
        gender: updated[i].gender,
      });

      if (error) {
        updated[i].status = "error";
      } else {
        updated[i].status = "added";
        addedCount++;
      }
    }

    setParsedDonors(updated);
    setAddingFromPdf(false);
    queryClient.invalidateQueries({ queryKey: ["donors"] });
    toast({ title: "সফল!", description: `${addedCount} জন নতুন ডোনার যোগ হয়েছে। 🎉` });
  };

  return (
    <>
      <section className="px-4 py-10">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <UserPlus className="h-6 w-6 shrink-0 text-primary" />
                <h2 className="text-xl font-bold text-foreground">ডোনার হিসেবে যোগ দিন</h2>
              </div>
              <DonorQrCode />
            </div>
            <p className="mb-5 text-sm text-muted-foreground">
              আপনি রক্তদান করতে চাইলে নিচের তথ্য দিয়ে যোগ দিন।
            </p>
            <div className="space-y-4">
              <div>
                <Label>আপনার নাম</Label>
                <Input
                  placeholder="সম্পূর্ণ নাম লিখুন"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>ফোন নম্বর</Label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>রক্তের গ্রুপ</Label>
                <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="রক্তের গ্রুপ নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>লিঙ্গ</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">পুরুষ</SelectItem>
                    <SelectItem value="female">মহিলা</SelectItem>
                  </SelectContent>
                </Select>
                <GenderNameWarning
                  name={form.name}
                  gender={form.gender}
                  onFix={() => setForm({ ...form, gender: "female" })}
                  onSelectGender={(g) => setForm({ ...form, gender: g })}
                />

              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? "যোগ হচ্ছে..." : "ডোনার হিসেবে যোগ দিন"}
              </Button>

              {/* File Upload */}
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-medium text-foreground">
                  অথবা ছবি / PDF থেকে একসাথে ডোনার যোগ করুন
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      ফাইল প্রক্রিয়া হচ্ছে...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" />
                      ডোনার লিস্টের ছবি বা PDF আপলোড করুন
                    </>
                  )}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  একসাথে একাধিক ছবি (লিস্টের কয়েক পাতা) দেওয়া যাবে।
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parsed Donors Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>ফাইল থেকে প্রাপ্ত ডোনার তালিকা</DialogTitle>
            <DialogDescription>
              {pendingCount} জন নতুন ডোনার পাওয়া গেছে — যোগ করার আগে তথ্য ঠিক করে নিন
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] px-6">
            <div className="space-y-3 pb-2">
              {parsedDonors.map((donor, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${
                    donor.status === "duplicate" || donor.status === "error"
                      ? "border-destructive/30 bg-destructive/5"
                      : donor.status === "added"
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs">
                      {donor.status === "duplicate" && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> আগে থেকে আছে
                        </span>
                      )}
                      {donor.status === "added" && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> যোগ হয়েছে
                        </span>
                      )}
                      {donor.status === "error" && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> ত্রুটি
                        </span>
                      )}
                      {donor.status === "pending" && <span className="text-muted-foreground">নতুন</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParsed(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="বাদ দিন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      className="col-span-2 h-9"
                      value={donor.name}
                      disabled={donor.status === "added"}
                      onChange={(e) => updateParsed(i, { name: e.target.value })}
                    />
                    <Input
                      className="h-9"
                      value={donor.phone}
                      disabled={donor.status === "added"}
                      onChange={(e) => updateParsed(i, { phone: e.target.value })}
                    />
                    <Select
                      value={donor.blood_group}
                      disabled={donor.status === "added"}
                      onValueChange={(v) => updateParsed(i, { blood_group: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="গ্রুপ" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloodGroups.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={donor.gender}
                      disabled={donor.status === "added"}
                      onValueChange={(v) => updateParsed(i, { gender: v })}
                    >
                      <SelectTrigger className="col-span-2 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">পুরুষ</SelectItem>
                        <SelectItem value="female">মহিলা</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-6 pt-3 border-t border-border">
            <Button className="w-full" onClick={handleAddParsedDonors} disabled={addingFromPdf || pendingCount === 0}>
              {addingFromPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  যোগ হচ্ছে...
                </>
              ) : (
                `${pendingCount} জন নতুন ডোনার যোগ করুন`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DonorSignupForm;
