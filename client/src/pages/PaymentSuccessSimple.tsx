import React from "react";
import { Navigation } from "@/components/Navigation";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccessSimple() {
  const searchParams = new URLSearchParams(window.location.search);
  const status = searchParams.get("status");
  const transactionId = searchParams.get("transaction");
  const amount = searchParams.get("amount");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-4">Payment Successful!</h1>
          <p className="text-lg text-muted-foreground mb-8">Your payment has been processed successfully.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
            <div className="space-y-2 text-left">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold">{status}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono text-sm">{transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-semibold">{amount} EGP</span>
              </div>
            </div>
          </div>

          <a 
            href="/" 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Continue to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}