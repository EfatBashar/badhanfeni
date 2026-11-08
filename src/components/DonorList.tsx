import { useState, useMemo } from "react";
import { Search, Users, Loader2 } from "lucide-react";
import { useDonors } from "@/data/donors";
import DonorCard from "./DonorCard";

const DonorList = ({ lockedBloodGroup }: { lockedBloodGroup?: string }) => {
  const [search, setSearch] = useState("");
  const { data: donors = [], isLoading } = useDonors();

  const filtered = useMemo(() => {
    return donors.filter((d) => {
      const matchesGroup = !lockedBloodGroup || d.blood_group === lockedBloodGroup;
      const matchesSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.phone?.includes(search) ?? false);
      return matchesGroup && matchesSearch;
    });
  }, [search, donors, lockedBloodGroup]);

  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2 text-center">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {lockedBloodGroup ? `${lockedBloodGroup} রক্তদাতা তালিকা` : "রক্তদাতা তালিকা"}
          </h2>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="নাম দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          মোট {filtered.length} জন {lockedBloodGroup} রক্তদাতা পাওয়া গেছে
        </p>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((donor) => <DonorCard key={donor.id} donor={donor} />)
          ) : (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              কোনো রক্তদাতা পাওয়া যায়নি
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DonorList;
