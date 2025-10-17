import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Zap, Trophy, Coins, ArrowLeft, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

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

export default function PaymentCenter() {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as { user: User | null };
  const { toast } = useToast();
  const { t } = useTranslation('common');

  const tokenPackages: TokenPackage[] = [
    {
      id: "starter",
      name: "Starter Pack",
      price: 15,
      tokens: 500,
      icon: Coins,
      features: [
        `500 analysis ${t('units.tokens')}`,
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
        `1000 analysis ${t('units.tokens')}`,
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
        `2500 analysis ${t('units.tokens')}`,
        "Unlimited comparisons",
        "Video analysis",
        "VIP support",
        "Custom strategies",
        "Nutrition plans"
      ]
    }
  ];
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
        description: `Your ${t('units.tokens')} have been added to your account.`,
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
        description: `Please log in to purchase ${t('units.tokens')}.`,
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

      if (result.success && result.paymentIntent?.redirect_url) {
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
                    Secure payment with Paymob Flash - supports all Egyptian payment methods
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
                        <h3 className="text-lg font-bold text-white mb-2">Secure Checkout</h3>
                        <p className="text-gray-300 text-sm mb-6">
                          Proceed to Paymob's secure checkout to complete your purchase.
                        </p>
                        <Button 
                          size="lg"
                          onClick={() => {
                            console.log('Redirecting to Paymob Flash checkout...');
                            
                            if (paymentIntent?.redirect_url) {
                              toast({
                                title: "Redirecting to Payment",
                                description: "Taking you to the secure checkout page...",
                              });
                              
                              // Redirect directly to Paymob Flash
                              window.location.href = paymentIntent.redirect_url;
                            } else {
                              toast({
                                title: "Payment Error",
                                description: "Payment checkout URL not available. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3"
                          data-testid="button-proceed-payment"
                        >
                          <CreditCard className="w-5 h-5 mr-3" />
                          Proceed to Checkout
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
                          <span>Click "Proceed to Checkout" to go to Paymob's secure payment page</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">2.</span>
                          <span>Choose your payment method (cards, wallets, Valu, etc.)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">3.</span>
                          <span>Enter your payment details and complete 3D Secure (OTP) if required</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">4.</span>
                          <span>After successful payment, you'll be redirected back to our site</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">5.</span>
                          <span>Your tokens will be added automatically to your account</span>
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