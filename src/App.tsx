import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "@/components/AuthGate";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const Install = lazy(() => import("./pages/Install"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const JoinDonor = lazy(() => import("./pages/JoinDonor"));
const LearnBloodGrouping = lazy(() => import("./pages/LearnBloodGrouping"));
const BadhonQuiz = lazy(() => import("./pages/BadhonQuiz"));
const NotFound = lazy(() => import("./pages/NotFound"));
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
          <AuthGate>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/install" element={<Install />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join-donor" element={<JoinDonor />} />
              <Route path="/learn-blood-grouping" element={<LearnBloodGrouping />} />
              <Route path="/quiz" element={<BadhonQuiz />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGate>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
