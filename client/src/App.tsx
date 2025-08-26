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
import Account from "@/pages/account";
import VideoAnalysis from "@/pages/video-analysis";
import PaymentCenter from "@/pages/payment-center";
import TestAuthPage from "@/pages/test-auth";
import { SignupPage } from "@/pages/signup";
import { LoginPage } from "@/pages/login";
import PaymentSuccess from "@/pages/payment-success";
function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <>
      <Switch>
        {/* Public routes - accessible without authentication */}
        <Route path="/test-auth" component={TestAuthPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/payment-success" component={PaymentSuccess} />
        
        {isLoading ? (
          <Route path="/" component={() => (
            <div className="min-h-screen bg-athlete-primary flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading...</p>
              </div>
            </div>
          )} />
        ) : !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <AuthenticatedLayout>
            <Route path="/" component={Home} />
            <Route path="/dashboard" component={Home} />
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/payment-center" component={PaymentCenter} />
            <Route path="/athlete/:id" component={AthleteAnalysis} />
            <Route path="/account" component={Account} />
            <Route path="/video-analysis" component={VideoAnalysis} />
          </AuthenticatedLayout>
        )}
        <Route component={NotFound} />
      </Switch>
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
