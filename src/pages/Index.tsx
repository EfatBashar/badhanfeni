import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import HeroSection from "@/components/HeroSection";
import DonorList from "@/components/DonorList";
import BloodRequestForm from "@/components/BloodRequestForm";
import DonorSignupForm from "@/components/DonorSignupForm";
import { Link } from "react-router-dom";
import DonationDateUpdate from "@/components/DonationDateUpdate";
import { Heart, LogOut, BookOpen, Trophy } from "lucide-react";
import AboutBadhon from "@/components/AboutBadhon";
import { Button } from "@/components/ui/button";
import Seo from "@/components/Seo";

const Index = () => {
  const [requestedBloodGroup, setRequestedBloodGroup] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Badhan Feni | বাঁধন ফেনী সরকারি কলেজ ইউনিট"
        description="Badhan Feni - বাঁধন ফেনী সরকারি কলেজ ইউনিট। রক্তদাতা তালিকা, জরুরি রক্তের অনুরোধ ও রক্তদানের তথ্য এক জায়গায়।"
        path="/"
      />
      <AboutBadhon />
      <HeroSection />
      <BloodRequestForm onSubmitted={(bloodGroup) => setRequestedBloodGroup(bloodGroup)} />
      {requestedBloodGroup && <DonorList lockedBloodGroup={requestedBloodGroup} />}
      <DonorSignupForm />
      <DonationDateUpdate />
      <div className="px-4 py-4">
        <Link to="/learn-blood-grouping" className="mx-auto block max-w-2xl">
          <Button
            variant="outline"
            className="w-full gap-2 border-2 border-primary/30 bg-primary/5 py-6 text-base font-semibold text-primary hover:bg-primary/10"
          >
            <BookOpen className="h-5 w-5" />
            📚 ব্লাড গ্রুপিং শিখুন
          </Button>
        </Link>
        <Link to="/quiz" className="mx-auto mt-3 block max-w-2xl">
          <Button
            variant="outline"
            className="w-full gap-2 border-2 border-primary/30 bg-primary/5 py-6 text-base font-semibold text-primary hover:bg-primary/10"
          >
            <Trophy className="h-5 w-5" />
            🏆 ব্লাড ও বাঁধন কুইজ — High Score
          </Button>
        </Link>
      </div>
      
      

      {/* Footer */}
      <footer className="border-t border-border bg-card px-4 py-8 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex items-center justify-center gap-1 text-sm font-semibold text-foreground">
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
            বাঁধন, ফেনী সরকারি কলেজ ইউনিট
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>📞 <a href="tel:01577280577" className="hover:text-primary transition-colors">01577280577</a></p>
            <p>📧 <a href="mailto:badhanfgcunit2018@gmail.com" className="hover:text-primary transition-colors">badhanfgcunit2018@gmail.com</a></p>
            <p>📍 অফিস: কক্ষ নং-১, নিচ তলা, পূর্ব লাল ভবন, ফেনী সরকারি কলেজ।</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-3 border-t border-border mt-3">
            <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              🔒 অ্যাডমিন
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-3 w-3" /> লগআউট
            </button>
          </div>
          <p className="pt-3 text-xs text-muted-foreground">
            DEVELOPED BY{" "}
            <a
              href="https://www.facebook.com/profile.php?id=61582382462458"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground/70 hover:text-primary transition-colors"
            >
              RIHAN CHOWDHURY
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
