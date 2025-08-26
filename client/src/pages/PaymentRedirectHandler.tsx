import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function PaymentRedirectHandler() {
  const [, setLocation] = useLocation();
  const [paymentStatus, setPaymentStatus] = useState<{
    status: string;
    transactionId: string;
    amount: string;
    tokens: string;
  } | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    console.log("🔄 Payment redirect handler activated");
    
    // Get URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get("status");
    const transactionId = searchParams.get("transaction") || "";
    const amount = searchParams.get("amount") || "";
    const tokens = searchParams.get("tokens") || "";
    
    console.log("Payment params:", { status, transactionId, amount, tokens });
    
    // Set payment status for display
    setPaymentStatus({ 
      status: status || "unknown", 
      transactionId, 
      amount, 
      tokens 
    });

    // Start countdown and redirect after 5 seconds
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          
          if (status === "completed" && transactionId && amount) {
            console.log("✅ Payment completed - redirecting to dashboard");
            sessionStorage.setItem('paymentSuccess', JSON.stringify({
              status,
              transactionId,
              amount,
              tokens,
              timestamp: Date.now()
            }));
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
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  if (!paymentStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold mb-2">Loading Payment Status...</h1>
          <p className="text-muted-foreground">Please wait while we process your payment information.</p>
        </div>
      </div>
    );
  }

  const getStatusDisplay = () => {
    switch (paymentStatus.status) {
      case "completed":
        return {
          title: "Payment Successful!",
          message: `Your payment of ${paymentStatus.amount} EGP has been processed successfully.`,
          tokenMessage: paymentStatus.tokens ? `${paymentStatus.tokens} tokens have been added to your account.` : "",
          bgColor: "bg-green-50 dark:bg-green-950",
          textColor: "text-green-800 dark:text-green-200",
          icon: "✅"
        };
      case "pending":
        return {
          title: "Payment Pending",
          message: "Your payment is being processed. This may take a few minutes.",
          tokenMessage: "",
          bgColor: "bg-yellow-50 dark:bg-yellow-950",
          textColor: "text-yellow-800 dark:text-yellow-200",
          icon: "⏳"
        };
      case "failed":
        return {
          title: "Payment Failed",
          message: "There was an issue processing your payment. Please try again.",
          tokenMessage: "",
          bgColor: "bg-red-50 dark:bg-red-950",
          textColor: "text-red-800 dark:text-red-200",
          icon: "❌"
        };
      default:
        return {
          title: "Payment Status Unknown",
          message: "We're checking your payment status.",
          tokenMessage: "",
          bgColor: "bg-gray-50 dark:bg-gray-950",
          textColor: "text-gray-800 dark:text-gray-200",
          icon: "❓"
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={`max-w-md w-full rounded-lg border shadow-lg p-8 text-center ${statusDisplay.bgColor}`}>
        <div className="text-6xl mb-4">{statusDisplay.icon}</div>
        <h1 className={`text-2xl font-bold mb-4 ${statusDisplay.textColor}`}>
          {statusDisplay.title}
        </h1>
        <p className={`mb-4 ${statusDisplay.textColor}`}>
          {statusDisplay.message}
        </p>
        {statusDisplay.tokenMessage && (
          <p className={`mb-4 font-semibold ${statusDisplay.textColor}`}>
            {statusDisplay.tokenMessage}
          </p>
        )}
        {paymentStatus.transactionId && (
          <p className={`text-sm mb-6 ${statusDisplay.textColor} opacity-75`}>
            Transaction ID: {paymentStatus.transactionId}
          </p>
        )}
        <div className={`text-lg font-semibold mb-2 ${statusDisplay.textColor}`}>
          Redirecting in {countdown} seconds...
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-1000"
            style={{ width: `${((5 - countdown) / 5) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}