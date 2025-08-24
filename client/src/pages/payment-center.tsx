import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Zap, Trophy, Coins, ArrowLeft, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface TokenPackage {
  id: string;
  name: string;
  price: number;
  tokens: number;
  popular?: boolean;
  icon: React.ComponentType<any>;
  features: string[];
}

interface User {
  tokens?: number;
  [key: string]: any;
}

const tokenPackages: TokenPackage[] = [
  {
    id: "starter",
    name: "Starter Pack",
    price: 15,
    tokens: 500,
    icon: Coins,
    features: [
      "500 analysis tokens",
      "Basic athlete profiles",
      "Performance insights",
      "Standard support"
    ]
  },
  {
    id: "professional",
    name: "Professional Pack",
    price: 25,
    tokens: 1000,
    popular: true,
    icon: Zap,
    features: [
      "1000 analysis tokens",
      "Advanced comparisons",
      "Detailed breakdowns",
      "Priority support",
      "Development plans"
    ]
  },
  {
    id: "elite",
    name: "Elite Pack",
    price: 50,
    tokens: 2500,
    icon: Trophy,
    features: [
      "2500 analysis tokens",
      "Unlimited comparisons",
      "Video analysis",
      "VIP support",
      "Custom strategies",
      "Nutrition plans"
    ]
  }
];

export default function PaymentCenter() {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as { user: User | null };
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [showIframe, setShowIframe] = useState(false);

  // Check for payment status in URL params after user is redirected back
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentResult = urlParams.get('payment');

    if (paymentResult === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your tokens have been added to your account.",
      });
      // Clean the URL params
      window.history.replaceState({}, '', '/payment-center');
    } else if (paymentResult === 'failed') {
      toast({
        title: "Payment Failed",
        description: "Your payment could not be processed. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/payment-center');
    } else if (paymentResult === 'error') {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred while processing your payment.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/payment-center');
    }
  }, [toast]);

  const handleSelectPackage = async (pkg: TokenPackage) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase tokens.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPackage(pkg);
    setIsCreatingPayment(true);

    try {
      console.log('🔄 Creating payment intent for package:', pkg.name);

      const response = await apiRequest('POST', '/api/payments/create-intent', {
        amount: pkg.price,
        tokensAmount: pkg.tokens
      });

      const result = await response.json();

      if (result.success && result.paymentIntent?.iframeUrl) {
        setPaymentIntent(result.paymentIntent);
        setShowIframe(true);
        toast({
          title: "Payment Ready",
          description: "Complete your payment in the secure payment window.",
        });
      } else {
        throw new Error(result.message || 'Failed to create payment intent');
      }
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleBackToPackages = () => {
    setSelectedPackage(null);
    setPaymentIntent(null);
    setShowIframe(false);
  };

  const handleGoBack = () => {
    setLocation('/');
  };

  if (showIframe && paymentIntent && selectedPackage) {
    return (
      <div className="min-h-screen bg-athlete-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToPackages}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-back-packages"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Packages
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="text-payment-title">
                  Secure Payment Gateway
                </h1>
                <p className="text-gray-400" data-testid="text-payment-subtitle">
                  {selectedPackage?.name} - {selectedPackage?.tokens.toLocaleString()} tokens for {selectedPackage?.price} EGP
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Order Summary */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Order Summary
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Review your purchase details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-athlete-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300">Package:</span>
                        <span className="text-white font-semibold" data-testid="text-package-name">
                          {selectedPackage?.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-300">Tokens:</span>
                        <span className="text-athlete-accent font-bold" data-testid="text-tokens-amount">
                          {selectedPackage?.tokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-gray-600 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Total:</span>
                          <span className="text-white font-bold text-xl" data-testid="text-total-amount">
                            {selectedPackage?.price} EGP
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Payment Session Ready
                      </div>
                      <p className="text-green-300 text-xs mt-1">
                        Integration ID: 4723444 (Active)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Gateway */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-athlete-accent" />
                    Secure Payment Gateway
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Popup-based payment for optimal 3D Secure compatibility
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Payment Button */}
                    <div className="text-center">
                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                        <div className="flex items-center justify-center mb-4">
                          <div className="bg-blue-600 p-3 rounded-full">
                            <CreditCard className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Ready to Process</h3>
                        <p className="text-gray-300 text-sm mb-6">
                          Open the secure payment window to complete your purchase safely.
                        </p>
                        <Button 
                          size="lg"
                          onClick={() => {
                            console.log('Opening payment popup window...');
                            const popup = window.open(
                              paymentIntent.iframeUrl, 
                              'paymob_payment', 
                              'width=900,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=no,toolbar=no'
                            );
                            
                            if (popup) {
                              popup.focus();
                              
                              toast({
                                title: "Payment Window Opened",
                                description: "Complete your payment in the new window.",
                              });
                              
                              // Monitor popup for completion
                              const checkClosed = setInterval(() => {
                                if (popup.closed) {
                                  clearInterval(checkClosed);
                                  console.log('Payment popup closed, checking status...');
                                  
                                  toast({
                                    title: "Payment Window Closed",
                                    description: "Checking payment status...",
                                  });
                                  
                                  // Check payment status after popup closes
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 2000);
                                }
                              }, 1000);
                              
                            } else {
                              toast({
                                title: "Popup Blocked",
                                description: "Please allow popups for this site and try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3"
                          data-testid="button-open-payment"
                        >
                          <ExternalLink className="w-5 h-5 mr-3" />
                          Open Payment Window
                        </Button>
                      </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        Payment Instructions
                      </h4>
                      <div className="text-xs text-gray-300 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">1.</span>
                          <span>Click "Open Payment Window" to start the secure payment process</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">2.</span>
                          <span>Enter your card details in the Paymob payment form</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">3.</span>
                          <span>Complete 3D Secure authentication (OTP) if required by your bank</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">4.</span>
                          <span>Keep the popup window open until payment completes successfully</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">5.</span>
                          <span>You'll be redirected back automatically after successful payment</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 bg-green-900/20 border border-green-600/30 rounded-lg px-4 py-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm">SSL Secured by Paymob</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-athlete-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white" data-testid="text-payment-center-title">
                Payment Center
              </h1>
              <p className="text-gray-400" data-testid="text-payment-center-subtitle">
                Purchase tokens to unlock powerful athlete analysis features
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-athlete-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1" data-testid="text-current-balance">
                    Current Balance
                  </h3>
                  <p className="text-gray-400">Available tokens for analysis</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-athlete-accent" data-testid="text-token-balance">
                    {(user.tokens || 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-400">tokens</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-athlete-gray-800 border border-green-600/30 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-sm font-semibold text-green-400">Payment Integration Status</h3>
                <p className="text-xs text-gray-400">Using Integration ID: 4233746 (Online Card)</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm font-medium">Active</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {tokenPackages.map((pkg) => {
              const IconComponent = pkg.icon;
              return (
                <Card
                  key={pkg.id}
                  className={`bg-athlete-gray-800 border-gray-700 relative cursor-pointer transition-all duration-200 hover:scale-105 ${
                    pkg.popular ? 'border-athlete-accent border-2' : ''
                  }`}
                  onClick={() => handleSelectPackage(pkg)}
                  data-testid={`card-package-${pkg.id}`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-athlete-accent text-white px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-athlete-gray-700 rounded-full w-fit">
                      <IconComponent className="text-athlete-accent" size={32} />
                    </div>
                    <CardTitle className="text-xl text-white" data-testid={`text-package-title-${pkg.id}`}>
                      {pkg.name}
                    </CardTitle>
                    <div className="text-3xl font-bold text-white" data-testid={`text-package-price-${pkg.id}`}>
                      {pkg.price} EGP
                    </div>
                    <p className="text-athlete-accent font-semibold" data-testid={`text-package-tokens-${pkg.id}`}>
                      {pkg.tokens.toLocaleString()} Tokens
                    </p>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="text-athlete-success" size={16} />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full bg-athlete-accent hover:bg-athlete-accent/90 text-white font-semibold"
                      disabled={isCreatingPayment && selectedPackage?.id === pkg.id}
                      data-testid={`button-purchase-${pkg.id}`}
                    >
                      {isCreatingPayment && selectedPackage?.id === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Purchase Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center text-gray-400">
            <p className="mb-2">🔒 Secure payments powered by Paymob</p>
            <p className="text-sm">All transactions are encrypted and protected</p>
          </div>
        </div>
      </div>
    </div>
  );
}