import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bloodGroups } from "@/data/donors";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, FileUp, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import DonorQrCode from "@/components/DonorQrCode";
import GenderNameWarning from "@/components/GenderNameWarning";

interface ParsedDonor {
  name: string;
  phone: string;
  blood_group: string;
  status?: "pending" | "duplicate" | "added" | "error";
}

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

  const checkDuplicate = async (phone: string): Promise<boolean> => {
    const { data } = await supabase
      .from("donors")
      .select("id, name")
      .eq("phone", phone.trim())
      .limit(1);
    return (data && data.length > 0);
  };

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

    // Check for duplicate
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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "ত্রুটি", description: "শুধুমাত্র PDF ফাইল আপলোড করুন", variant: "destructive" });
      return;
    }

    setPdfLoading(true);

    try {
      // Upload to storage
      const fileName = `upload_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("donor-pdfs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("donor-pdfs")
        .getPublicUrl(fileName);

      // Call edge function to parse
      const { data, error } = await supabase.functions.invoke("parse-donor-pdf", {
        body: { fileUrl: urlData.publicUrl },
      });

      if (error) throw error;

      if (data.donors && data.donors.length > 0) {
        // Check duplicates for each parsed donor
        const donorsWithStatus: ParsedDonor[] = await Promise.all(
          data.donors.map(async (d: ParsedDonor) => {
            const isDuplicate = await checkDuplicate(d.phone);
            return { ...d, status: isDuplicate ? "duplicate" : "pending" as const };
          })
        );
        setParsedDonors(donorsWithStatus);
        setShowPdfDialog(true);
      } else {
        toast({ title: "কোনো ডোনার পাওয়া যায়নি", description: "PDF থেকে ডোনারের তথ্য বের করা যায়নি।", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message || "PDF প্রক্রিয়া করতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddParsedDonors = async () => {
    const pendingDonors = parsedDonors.filter((d) => d.status === "pending");
    if (pendingDonors.length === 0) {
      toast({ title: "কোনো নতুন ডোনার নেই", description: "সব ডোনার ইতোমধ্যেই তালিকায় আছেন।" });
      return;
    }

    setAddingFromPdf(true);
    let addedCount = 0;

    const updated = [...parsedDonors];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== "pending") continue;

      const { error } = await supabase.from("donors").insert({
        name: updated[i].name,
        phone: updated[i].phone,
        blood_group: updated[i].blood_group,
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
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? "যোগ হচ্ছে..." : "ডোনার হিসেবে যোগ দিন"}
              </Button>

              {/* PDF Upload */}
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-sm font-medium text-foreground">অথবা PDF থেকে ডোনার যোগ করুন</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
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
                      PDF প্রক্রিয়া হচ্ছে...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4" />
                      ডোনার লিস্টের PDF আপলোড করুন
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parsed Donors Dialog */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>PDF থেকে প্রাপ্ত ডোনার তালিকা</DialogTitle>
            <DialogDescription>
              {parsedDonors.filter((d) => d.status === "pending").length} জন নতুন ডোনার পাওয়া গেছে
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] px-6">
            <div className="space-y-2">
              {parsedDonors.map((donor, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                    donor.status === "duplicate"
                      ? "border-destructive/30 bg-destructive/5"
                      : donor.status === "added"
                      ? "border-green-500/30 bg-green-500/5"
                      : donor.status === "error"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border"
                  }`}
                >
                  <div>
                    <p className="font-medium text-foreground">{donor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {donor.phone} • {donor.blood_group}
                    </p>
                  </div>
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
                    {donor.status === "pending" && (
                      <span className="text-muted-foreground">নতুন</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-6 pt-3 border-t border-border">
            <Button
              className="w-full"
              onClick={handleAddParsedDonors}
              disabled={addingFromPdf || parsedDonors.filter((d) => d.status === "pending").length === 0}
            >
              {addingFromPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  যোগ হচ্ছে...
                </>
              ) : (
                `${parsedDonors.filter((d) => d.status === "pending").length} জন নতুন ডোনার যোগ করুন`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DonorSignupForm;
