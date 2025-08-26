import React from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";

export default function PaymentSuccess() {
  const searchParams = new URLSearchParams(window.location.search);
  const status = searchParams.get("status");
  const transactionId = searchParams.get("transaction");
  const amount = searchParams.get("amount");

  // Fetch user data to show updated token balance
  const { data: user, refetch } = useQuery<{ id: string; tokens: number }>({
    queryKey: ['/api/auth/user'],
  });

  const getStatusConfig = () => {
    switch (status) {
      case "completed":
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: "Payment Successful!",
          description: "Your payment has been processed and tokens have been added to your account.",
          bgColor: "bg-green-50 dark:bg-green-900/20",
          borderColor: "border-green-200 dark:border-green-800",
          buttonText: "Continue to Dashboard"
        };
      case "pending":
        return {
          icon: <Clock className="h-16 w-16 text-yellow-500" />,
          title: "Payment Pending",
          description: "Your payment is being processed. You'll receive your tokens once confirmation is complete.",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
          buttonText: "Go to Dashboard"
        };
      case "failed":
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again or contact support.",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
          buttonText: "Try Again"
        };
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-orange-500" />,
          title: "Payment Status Unknown",
          description: "We're verifying your payment status. Please check your account or contact support.",
          bgColor: "bg-orange-50 dark:bg-orange-900/20",
          borderColor: "border-orange-200 dark:border-orange-800",
          buttonText: "Contact Support"
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Refresh user data when component mounts (to get updated token balance)
  React.useEffect(() => {
    if (status === "completed") {
      setTimeout(() => refetch(), 1000); // Small delay to ensure backend processing is complete
    }
  }, [status, refetch]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2`}>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                {statusConfig.icon}
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {statusConfig.title}
              </CardTitle>
              <CardDescription className="text-lg">
                {statusConfig.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Transaction Details */}
              <div className="bg-background/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono">{transactionId || 'N/A'}</span>
                </div>
                {amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">{amount} EGP</span>
                  </div>
                )}
                {status === "completed" && amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tokens Added:</span>
                    <span className="font-semibold text-green-600">
                      {amount === "15" ? "500" : amount === "25" ? "1000" : amount === "50" ? "2500" : "0"} tokens
                    </span>
                  </div>
                )}
                {user && status === "completed" && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Current Balance:</span>
                    <span className="font-bold text-primary">{user.tokens} tokens</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <Link href="/">
                    {statusConfig.buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                
                {status === "completed" && (
                  <Button variant="outline" asChild>
                    <Link href="/payment-center">
                      Buy More Tokens
                    </Link>
                  </Button>
                )}
                
                {status === "failed" && (
                  <Button variant="outline" asChild>
                    <Link href="/payment-center">
                      Try Again
                    </Link>
                  </Button>
                )}
              </div>

              {/* Next Steps */}
              {status === "completed" && (
                <div className="bg-primary/5 rounded-lg p-4">
                  <h3 className="font-semibold text-primary mb-2">What's Next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Use your tokens to analyze athlete performance</li>
                    <li>• Compare athletes from different sports</li>
                    <li>• Generate detailed video analysis reports</li>
                    <li>• Access nutrition and training plans</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}