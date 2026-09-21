import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDonors, bloodGroups } from "@/data/donors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DonorManagement = () => {
  const { data: donors, isLoading } = useDonors();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", blood_group: "A+", gender: "male" });
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  const bulkToggleVisibility = async (gender: "male" | "female", makeVisible: boolean) => {
    const key = `${gender}-${makeVisible ? "show" : "hide"}`;
    setBulkLoading(key);
    const affected = (donors ?? []).filter(
      (d) => d.gender === gender && d.is_visible !== makeVisible
    ).length;
    const { error } = await supabase
      .from("donors")
      .update({ is_visible: makeVisible })
      .eq("gender", gender);
    setBulkLoading(null);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: makeVisible ? "প্রকাশিত" : "লুকানো হয়েছে",
        description: `${gender === "female" ? "মহিলা" : "পুরুষ"} ডোনার — ${affected} জন আপডেট হয়েছে`,
      });
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.blood_group) return;
    const { error } = await supabase.from("donors").insert({
      name: form.name,
      phone: form.phone,
      blood_group: form.blood_group,
      gender: form.gender,
    });
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "ডোনার যোগ করা হয়েছে" });
      setForm({ name: "", phone: "", blood_group: "A+", gender: "male" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("donors").delete().eq("id", id);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    }
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("donors")
      .update({ is_visible: !current })
      .eq("id", id);
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: !current ? "প্রকাশিত" : "লুকানো হয়েছে",
        description: !current
          ? "এই ডোনার এখন public list-এ দেখাবে"
          : "এই ডোনার শুধু admin দেখবে",
      });
      queryClient.invalidateQueries({ queryKey: ["donors"] });
    }
  };

  if (isLoading) return <p className="text-muted-foreground">লোড হচ্ছে...</p>;

  const visibleCount = donors?.filter((d) => d.is_visible).length ?? 0;
  const hiddenCount = (donors?.length ?? 0) - visibleCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            ডোনার তালিকা ({donors?.length || 0})
          </h2>
          <p className="text-xs text-muted-foreground">
            দৃশ্যমান: {visibleCount} • লুকানো: {hiddenCount}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4" /> যোগ করুন</Button>
          </DialogTrigger>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={bulkLoading === "male-show"}
          onClick={() => bulkToggleVisibility("male", true)}
        >
          {bulkLoading === "male-show" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          সব পুরুষ দেখান
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={bulkLoading === "male-hide"}
          onClick={() => bulkToggleVisibility("male", false)}
        >
          {bulkLoading === "male-hide" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          সব পুরুষ লুকান
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={bulkLoading === "female-show"}
          onClick={() => bulkToggleVisibility("female", true)}
        >
          {bulkLoading === "female-show" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          সব মহিলা দেখান
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={bulkLoading === "female-hide"}
          onClick={() => bulkToggleVisibility("female", false)}
        >
          {bulkLoading === "female-hide" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          সব মহিলা লুকান
        </Button>
      </div>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন ডোনার যোগ করুন</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>নাম</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>ফোন</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>রক্তের গ্রুপ</Label>
                <Select value={form.blood_group} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{bloodGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>লিঙ্গ</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">পুরুষ</SelectItem>
                    <SelectItem value="female">মহিলা</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAdd}>যোগ করুন</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>গ্রুপ</TableHead>
              <TableHead>লিঙ্গ</TableHead>
              <TableHead>ফোন</TableHead>
              <TableHead>দান</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="w-24">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...(donors ?? [])].sort((a, b) => {
              const ai = bloodGroups.indexOf(a.blood_group);
              const bi = bloodGroups.indexOf(b.blood_group);
              if (ai !== bi) return ai - bi;
              return a.name.localeCompare(b.name, "bn");
            }).map((d) => (
              <TableRow key={d.id} className={!d.is_visible ? "opacity-60" : ""}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.blood_group}</TableCell>
                <TableCell className="text-xs">
                  {d.gender === "female" ? "মহিলা" : "পুরুষ"}
                </TableCell>
                <TableCell>{d.phone}</TableCell>
                <TableCell>{d.total_donations}</TableCell>
                <TableCell>
                  {d.is_visible ? (
                    <Badge variant="secondary" className="text-xs">দৃশ্যমান</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">লুকানো</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(d.id, d.is_visible)}
                      title={d.is_visible ? "লুকান" : "দেখান"}
                    >
                      {d.is_visible ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DonorManagement;
