import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { bloodGroups } from "@/data/donors";
import Seo from "@/components/Seo";

const Login = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const phoneRegex = /^01[3-9][0-9]{8}$/;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "ত্রুটি", description: "ইমেইল দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      const isRateLimit = (error as { status?: number }).status === 429;
      toast({
        title: "ত্রুটি",
        description: isRateLimit
          ? "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "সফল! ✅", description: "পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।" });
      setIsForgotPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignup) {
      if (!name.trim() || !phone.trim() || !bloodGroup) {
        setLoading(false);
        toast({ title: "ত্রুটি", description: "সব তথ্য পূরণ করুন", variant: "destructive" });
        return;
      }
      if (name.trim().length < 2) {
        setLoading(false);
        toast({ title: "ত্রুটি", description: "নাম কমপক্ষে ২ অক্ষরের হতে হবে", variant: "destructive" });
        return;
      }
      if (!phoneRegex.test(phone.trim())) {
        setLoading(false);
        toast({ title: "ত্রুটি", description: "সঠিক ফোন নম্বর দিন (01XXXXXXXXX)", variant: "destructive" });
        return;
      }

      const { data: existing } = await supabase
        .from("donors")
        .select("id")
        .eq("phone", phone.trim())
        .limit(1);

      if (existing && existing.length > 0) {
        setLoading(false);
        toast({ title: "ডুপ্লিকেট!", description: "এই ফোন নম্বর দিয়ে আগেই ডোনার তালিকায় আছেন।", variant: "destructive" });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Return the user to the same site (Vercel / Lovable / PWA) they signed up from.
          emailRedirectTo: `${window.location.origin}`,
          data: {
            name: name.trim(),
            phone: phone.trim(),
            blood_group: bloodGroup,
          },
        },
      });

      if (error) {
        setLoading(false);
        toast({ title: "সাইনআপ ব্যর্থ", description: error.message, variant: "destructive" });
      } else {
        await supabase.from("donors").insert({
          name: name.trim(),
          phone: phone.trim(),
          blood_group: bloodGroup,
        });


        setLoading(false);
        toast({ title: "ধন্যবাদ! 🎉", description: "আপনার সাইনআপ সফল হয়েছে। আমাদের পাশে থাকার জন্য অসংখ্য ধন্যবাদ! ইমেইল ভেরিফাই করে লগইন করুন। ❤️" });
        setIsSignup(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast({ title: "লগইন ব্যর্থ", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    }
  };

  // Forgot password view
  if (isForgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">পাসওয়ার্ড রিসেট</CardTitle>
            <p className="text-sm text-muted-foreground">আপনার ইমেইলে রিসেট লিংক পাঠানো হবে</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">ইমেইল</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "পাঠানো হচ্ছে..." : "রিসেট লিংক পাঠান"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setIsForgotPassword(false)}
              className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              লগইনে ফিরে যান
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Seo
        title="লগইন — বাঁধন ফেনী সরকারি কলেজ ইউনিট"
        description="বাঁধন ফেনী সরকারি কলেজ ইউনিটের রক্তদাতা প্ল্যাটফর্মে লগইন বা সাইনআপ করুন এবং জরুরি রক্তের অনুরোধ করুন।"
        path="/login"
      />
      <Card className="w-full max-w-sm border-border shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold leading-none tracking-tight text-foreground">
            {isSignup ? "সাইনআপ করুন — বাঁধন ফেনী সরকারি কলেজ" : "লগইন করুন — বাঁধন ফেনী সরকারি কলেজ"}
          </h1>
          <p className="text-sm text-muted-foreground">বাঁধন, ফেনী সরকারি কলেজ ইউনিট</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            {!isSignup && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            )}

            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">আপনার নাম</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="সম্পূর্ণ নাম লিখুন"
                    required
                  />
                </div>
              </>
            )}
            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">ফোন নম্বর</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>রক্তের গ্রুপ</Label>
                  <Select value={bloodGroup} onValueChange={setBloodGroup} required>
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
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {isSignup ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {loading
                ? isSignup ? "সাইনআপ হচ্ছে..." : "লগইন হচ্ছে..."
                : isSignup ? "সাইনআপ" : "লগইন"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignup ? "ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
