import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [location] = useLocation();
  const [status, setStatus] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status') || '';
    const txId = urlParams.get('transaction') || '';
    
    setStatus(paymentStatus);
    setTransactionId(txId);

    console.log('Payment success page loaded:', { status: paymentStatus, transactionId: txId });
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          title: 'Payment Successful!',
          message: 'Your tokens have been added to your account.',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      case 'pending':
        return {
          icon: Clock,
          title: 'Payment Pending',
          message: 'Your payment is being processed. Tokens will be added once confirmed.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
        };
      case 'failed':
        return {
          icon: XCircle,
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20'
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Payment Status Unknown',
          message: 'Unable to determine payment status. Please check your account.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20'
        };
    }
  };

  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-athlete-primary flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${config.bgColor}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <StatusIcon className={`h-16 w-16 ${config.color}`} />
          </div>
          <CardTitle className={`text-2xl ${config.color}`}>
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {config.message}
          </p>
          
          {transactionId && (
            <p className="text-sm text-gray-500">
              Transaction ID: {transactionId}
            </p>
          )}

          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
              data-testid="button-dashboard"
            >
              Go to Dashboard
            </Button>
            
            {status === 'failed' && (
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/payment-center'}
                className="w-full"
                data-testid="button-retry-payment"
              >
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}