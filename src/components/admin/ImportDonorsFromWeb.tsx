import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDonors, bloodGroups } from "@/data/donors";
import { looksFemale } from "@/lib/genderDetect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Source: FPI Helping Hand Society (blood-donation-app-f2509.web.app) public donor list
const SRC_API_KEY = "AIzaSyCKSBKWL7p2AgX1qi2kQVLM0c7f4fGStmc";
const SRC_BASE =
  "https://firestore.googleapis.com/v1/projects/blood-donation-app-f2509/databases/(default)/documents/artifacts/blood-donation-app-f2509/public/data/donors";

interface ImportedDonor {
  name: string;
  phone: string;
  blood_group: string;
  gender: string;
  last_donation: string | null;
  total_donations: number;
  status: "new" | "duplicate" | "invalid";
}

const normalizePhone = (raw: string): string => {
  let p = (raw || "").replace(/[^0-9]/g, "");
  if (p.startsWith("8801")) p = p.slice(2);
  if (p.startsWith("+8801")) p = p.slice(3);
  return /^01[3-9][0-9]{8}$/.test(p) ? p : "";
};

const fetchAllDonors = async (): Promise<ImportedDonor[]> => {
  // Anonymous sign-in to the source project (their rules require auth)
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${SRC_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  if (!authRes.ok) throw new Error("সোর্স সাইটে সংযোগ ব্যর্থ হয়েছে");
  const { idToken } = await authRes.json();

  const out: ImportedDonor[] = [];
  let pageToken: string | null = null;
  do {
    const url = new URL(SRC_BASE);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error("ডোনার তালিকা পড়া যায়নি");
    const data = await res.json();
    for (const doc of data.documents ?? []) {
      const f = doc.fields ?? {};
      const name = f.name?.stringValue?.trim() ?? "";
      const phone = normalizePhone(f.contact?.stringValue ?? "");
      const blood_group = f.bloodGroup?.stringValue ?? "";
      const lastTs = f.lastDonationDate?.timestampValue;
      const count = f.donationCount?.integerValue ?? f.donationCount?.doubleValue;
      if (!name || !bloodGroups.includes(blood_group)) continue;
      out.push({
        name,
        phone,
        blood_group,
        gender: looksFemale(name) ? "female" : "male",
        last_donation: lastTs ? lastTs.slice(0, 10) : null,
        total_donations: count ? Number(count) : 0,
        status: phone ? "new" : "invalid",
      });
    }
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);
  return out;
};

const ImportDonorsFromWeb = () => {
  const { data: existingDonors } = useDonors();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ImportedDonor[]>([]);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const fetched = await fetchAllDonors();
      const existingPhones = new Set((existingDonors ?? []).map((d) => d.phone));
      const seen = new Set<string>();
      const marked = fetched.map((r) => {
        if (r.status === "invalid") return r;
        if (existingPhones.has(r.phone) || seen.has(r.phone)) {
          return { ...r, status: "duplicate" as const };
        }
        seen.add(r.phone);
        return r;
      });
      setRows(marked);
      toast({
        title: "তথ্য এসেছে",
        description: `মোট ${marked.length} জন পাওয়া গেছে — ${marked.filter((r) => r.status === "new").length} জন নতুন`,
      });
    } catch (e) {
      toast({
        title: "ত্রুটি",
        description: e instanceof Error ? e.message : "অজানা সমস্যা",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (i: number, patch: Partial<ImportedDonor>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleImport = async () => {
    const toAdd = rows.filter((r) => r.status === "new" && r.phone);
    if (toAdd.length === 0) return;
    setImporting(true);
    const { error } = await supabase.from("donors").insert(
      toAdd.map((r) => ({
        name: r.name,
        phone: r.phone,
        blood_group: r.blood_group,
        gender: r.gender,
        last_donation: r.last_donation,
        total_donations: r.total_donations,
        is_visible: true,
      }))
    );
    setImporting(false);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল", description: `${toAdd.length} জন ডোনার যোগ হয়েছে` });
      setRows([]);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    }
  };

  const newCount = rows.filter((r) => r.status === "new").length;
  const dupCount = rows.filter((r) => r.status === "duplicate").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Globe className="h-4 w-4" /> ওয়েবসাইট থেকে ইমপোর্ট
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>অন্য ওয়েবসাইট থেকে ডোনার আনুন</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            FPI Helping Hand Society (ফেনী পলিটেকনিক) ওয়েবসাইটের ডোনার তালিকা থেকে তথ্য এনে এখানে যোগ করা হবে।
          </p>
          <Button onClick={handleFetch} disabled={loading} className="gap-1.5">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {rows.length > 0 ? "আবার তথ্য আনুন" : "তথ্য আনুন"}
          </Button>

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">নতুন: {newCount}</Badge>
                <Badge variant="outline">ডুপ্লিকেট: {dupCount}</Badge>
                <Badge variant="destructive">সমস্যা: {invalidCount}</Badge>
              </div>
              <div className="rounded-lg border border-border overflow-x-auto max-h-[45vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>নাম</TableHead>
                      <TableHead>ফোন</TableHead>
                      <TableHead>গ্রুপ</TableHead>
                      <TableHead>লিঙ্গ</TableHead>
                      <TableHead>স্ট্যাটাস</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r.status !== "new" ? "opacity-60" : ""}>
                        <TableCell>
                          <Input
                            value={r.name}
                            onChange={(e) => updateRow(i, { name: e.target.value })}
                            className="h-8 min-w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.phone}
                            onChange={(e) => updateRow(i, { phone: e.target.value })}
                            className="h-8 min-w-28"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={r.blood_group} onValueChange={(v) => updateRow(i, { blood_group: v })}>
                            <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {bloodGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={r.gender} onValueChange={(v) => updateRow(i, { gender: v })}>
                            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">পুরুষ</SelectItem>
                              <SelectItem value="female">মহিলা</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {r.status === "new" && <Badge variant="secondary" className="text-xs">নতুন</Badge>}
                          {r.status === "duplicate" && <Badge variant="outline" className="text-xs">ডুপ্লিকেট</Badge>}
                          {r.status === "invalid" && <Badge variant="destructive" className="text-xs">সমস্যা</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleImport} disabled={importing || newCount === 0} className="w-full gap-1.5">
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                {newCount} জন নতুন ডোনার যোগ করুন
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDonorsFromWeb;
