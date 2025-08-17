import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Subscribe from "@/pages/subscribe";
import AthleteAnalysis from "@/pages/athlete-analysis";
import PaymentCenter from "@/pages/payment-center";
import Account from "@/pages/account";
import VideoAnalysis from "@/pages/video-analysis";
import TestAuthPage from "@/pages/test-auth";
import { SignupPage } from "@/pages/signup";
import { LoginPage } from "@/pages/login";
import { SignupWithCard } from "@/components/ui/signup-with-card";
import { SignupFlow } from "@/components/ui/signup-flow";
import { useState, useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Check if user needs to complete signup (no card on file) or has pending signup data
  useEffect(() => {
    if (isAuthenticated && user) {
      const pendingSignupData = sessionStorage.getItem('pendingSignupData');
      
      if (pendingSignupData) {
        // User just completed Replit auth flow, now complete signup with stored data
        completeSignupWithStoredData(JSON.parse(pendingSignupData));
      } else if (!user.paymobCustomerId) {
        // User needs to complete signup (check for Paymob customer ID which indicates card is registered)
        setShowSignupModal(true);
      }
    }
  }, [isAuthenticated, user]);

  // Complete signup with data stored during signup flow
  const completeSignupWithStoredData = async (signupData: any) => {
    try {
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cardToken: signupData.cardDetails.cardToken,
          cardLast4: signupData.cardDetails.cardLast4,
          cardBrand: signupData.cardDetails.cardBrand,
          paymobCustomerId: signupData.cardDetails.paymobCustomerId,
          referralCode: signupData.referralCode
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Clear stored data
        sessionStorage.removeItem('pendingSignupData');
        
        // Refresh page to update user data
        window.location.reload();
      } else {
        throw new Error(result.message || 'Signup completion failed');
      }
    } catch (error) {
      console.error('Error completing signup:', error);
      // Fallback to normal signup modal
      setShowSignupModal(true);
    }
  };

  // Handle signup completion
  const handleSignupComplete = (updatedUser: any) => {
    setShowSignupModal(false);
    // Refresh the page to update user data
    window.location.reload();
  };

  return (
    <>
      <Switch>
        {/* Public routes - accessible without authentication */}
        <Route path="/test-auth" component={TestAuthPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/login" component={LoginPage} />
        
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <AuthenticatedLayout>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Home} />
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/athlete/:id" component={AthleteAnalysis} />
            <Route path="/payment-center" component={PaymentCenter} />
            <Route path="/account" component={Account} />
            <Route path="/video-analysis" component={VideoAnalysis} />
          </AuthenticatedLayout>
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
