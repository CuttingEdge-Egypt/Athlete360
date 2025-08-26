import React, { useEffect } from "react";
import { useLocation } from "wouter";

export default function PaymentRedirectHandler() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("🔄 Payment redirect handler activated");
    
    // Get URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get("status");
    const transactionId = searchParams.get("transaction");
    const amount = searchParams.get("amount");
    
    console.log("Payment params:", { status, transactionId, amount });
    
    // Immediate redirect to dashboard with success notification
    if (status === "completed" && transactionId && amount) {
      console.log("✅ Payment completed - redirecting to dashboard");
      
      // Store success info in sessionStorage for dashboard to display
      sessionStorage.setItem('paymentSuccess', JSON.stringify({
        status,
        transactionId,
        amount,
        timestamp: Date.now()
      }));
      
      // Redirect to dashboard immediately
      window.location.href = '/';
    } else if (status === "pending") {
      console.log("⏳ Payment pending - redirecting to dashboard");
      sessionStorage.setItem('paymentPending', JSON.stringify({
        status,
        transactionId,
        timestamp: Date.now()
      }));
      window.location.href = '/';
    } else if (status === "failed") {
      console.log("❌ Payment failed - redirecting to payment center");
      sessionStorage.setItem('paymentFailed', JSON.stringify({
        status,
        transactionId,
        timestamp: Date.now()
      }));
      window.location.href = '/payment-center';
    } else {
      console.log("⚠️ Unknown payment status - redirecting to dashboard");
      window.location.href = '/';
    }
  }, []);

  // Show loading screen while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold mb-2">Processing Payment...</h1>
        <p className="text-muted-foreground">Please wait while we confirm your payment.</p>
      </div>
    </div>
  );
}