import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Subscribe from "@/pages/subscribe";
import AthleteAnalysis from "@/pages/athlete-analysis";
import PaymentCenter from "@/pages/payment-center";
import { SignupWithCard } from "@/components/ui/signup-with-card";
import { useState, useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Check if user needs to complete signup (no card on file)
  useEffect(() => {
    if (isAuthenticated && user && !user.cardToken) {
      setShowSignupModal(true);
    }
  }, [isAuthenticated, user]);

  // Handle signup completion
  const handleSignupComplete = (updatedUser: any) => {
    setShowSignupModal(false);
    // Refresh the page to update user data
    window.location.reload();
  };

  return (
    <>
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/athlete/:id" component={AthleteAnalysis} />
            <Route path="/payment-center" component={PaymentCenter} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>

      {/* Signup completion modal */}
      <SignupWithCard
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onComplete={handleSignupComplete}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
