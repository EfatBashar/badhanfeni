import { useState } from "react";
import { Send, Droplets, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bloodGroups } from "@/data/donors";
import { toast } from "sonner";
import { z } from "zod";
import { normalizeBdPhone, BD_PHONE_REGEX } from "@/lib/phone";

const requestSchema = z.object({
  patient_name: z.string().trim().min(1, "রোগীর নাম দিন").max(100),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
    errorMap: () => ({ message: "রক্তের গ্রুপ নির্বাচন করুন" }),
  }),
  units_needed: z.number().int().min(1).max(20),
  hemoglobin: z.preprocess(
    (v) => (v === "" || v === null || v === undefined || Number.isNaN(v) ? null : v),
    z
      .number()
      .min(1, "হিমোগ্লোবিন ১ এর কম হতে পারে না")
      .max(20, "হিমোগ্লোবিন ২০ এর বেশি হতে পারে না")
      .nullable()
  ),
  hospital: z.string().trim().min(1, "হাসপাতালের নাম দিন").max(200),
  contact_phone: z
    .string()
    .transform((v) => normalizeBdPhone(v))
    .refine((v) => v.length > 0, "ফোন নম্বর দিন")
    .refine((v) => BD_PHONE_REGEX.test(v), "সঠিক বাংলাদেশি নম্বর দিন (যেমন: 01XXXXXXXXX)"),
  notes: z.string().trim().max(500).optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

const BloodRequestForm = ({ onSubmitted }: { onSubmitted?: (bloodGroup: string) => void }) => {
  const [form, setForm] = useState({
    patient_name: "",
    blood_group: "",
    units_needed: 1,
    hemoglobin: "" as string | number,
    hospital: "",
    contact_phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "units_needed"
          ? parseInt(value) || 1
          : name === "hemoglobin"
          ? value === ""
            ? ""
            : parseFloat(value)
          : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = requestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const requestId = crypto.randomUUID();
    const { error } = await supabase
      .from("blood_requests")
      .insert({
        id: requestId,
        patient_name: result.data.patient_name,
        blood_group: result.data.blood_group,
        units_needed: result.data.units_needed,
        hemoglobin: result.data.hemoglobin,
        hospital: result.data.hospital,
        contact_phone: result.data.contact_phone,
        notes: result.data.notes || null,
        status: "pending",
      });

    setSubmitting(false);

    if (error) {
      toast.error("রিকোয়েস্ট পাঠানো যায়নি। আবার চেষ্টা করুন।");
      return;
    }

    supabase.functions.invoke("notify-admin-push", { body: { request_id: requestId } }).catch(() => {});
    setSubmitted(true);
    onSubmitted?.(result.data.blood_group);
    toast.success("রক্তের রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!");
  };

  if (submitted) {
    return (
      <section className="px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-bold text-foreground">রিকোয়েস্ট পাঠানো হয়েছে!</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            আপনার রক্তের রিকোয়েস্ট সফলভাবে জমা হয়েছে। শীঘ্রই যোগাযোগ করা হবে।
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                patient_name: "",
                blood_group: "",
                units_needed: 1,
                hemoglobin: "",
                hospital: "",
                contact_phone: "",
                notes: "",
              });
            }}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            নতুন রিকোয়েস্ট
          </button>
        </div>
      </section>
    );
  }

  const inputClass = (field: string) =>
    `w-full rounded-xl border bg-card py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 ${
      errors[field] ? "border-destructive" : "border-border focus:border-primary"
    }`;

  return (
    <section className="px-4 py-10" id="blood-request">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <Droplets className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">রক্তের রিকোয়েস্ট</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
          {/* Patient Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">রোগীর নাম</label>
            <input
              type="text"
              name="patient_name"
              value={form.patient_name}
              onChange={handleChange}
              placeholder="রোগীর পুরো নাম লিখুন"
              className={inputClass("patient_name")}
            />
            {errors.patient_name && <p className="mt-1 text-xs text-destructive">{errors.patient_name}</p>}
          </div>

          {/* Blood Group */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">প্রয়োজনীয় রক্তের গ্রুপ</label>
            <select
              name="blood_group"
              value={form.blood_group}
              onChange={handleChange}
              className={inputClass("blood_group")}
            >
              <option value="">রক্তের গ্রুপ নির্বাচন করুন</option>
              {bloodGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            {errors.blood_group && <p className="mt-1 text-xs text-destructive">{errors.blood_group}</p>}
          </div>

          {/* Units */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">কত ব্যাগ প্রয়োজন</label>
            <input
              type="number"
              name="units_needed"
              value={form.units_needed}
              onChange={handleChange}
              min={1}
              max={20}
              className={inputClass("units_needed")}
            />
          </div>

          {/* Hemoglobin */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              হিমোগ্লোবিন (g/dL) <span className="text-muted-foreground text-xs">(ঐচ্ছিক)</span>
            </label>
            <input
              type="number"
              name="hemoglobin"
              value={form.hemoglobin}
              onChange={handleChange}
              min={1}
              max={20}
              step={0.1}
              placeholder="যেমন: 12.5"
              className={inputClass("hemoglobin")}
            />
            {errors.hemoglobin && <p className="mt-1 text-xs text-destructive">{errors.hemoglobin}</p>}
            <p className="mt-1 text-[11px] text-muted-foreground">
              রোগীর সাম্প্রতিক হিমোগ্লোবিন রিপোর্ট থেকে (১–২০ g/dL এর মধ্যে)
            </p>
          </div>


          {/* Hospital */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">হাসপাতালের নাম ও ঠিকানা</label>
            <input
              type="text"
              name="hospital"
              value={form.hospital}
              onChange={handleChange}
              placeholder="হাসপাতালের নাম লিখুন"
              className={inputClass("hospital")}
            />
            {errors.hospital && <p className="mt-1 text-xs text-destructive">{errors.hospital}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">যোগাযোগের নম্বর</label>
            <input
              type="tel"
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
              className={inputClass("contact_phone")}
            />
            {errors.contact_phone && <p className="mt-1 text-xs text-destructive">{errors.contact_phone}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">অতিরিক্ত তথ্য (ঐচ্ছিক)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="কোনো অতিরিক্ত তথ্য থাকলে লিখুন..."
              className={inputClass("notes")}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "পাঠানো হচ্ছে..." : "রিকোয়েস্ট পাঠান"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default BloodRequestForm;
