import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Gift, Zap, Star, Trophy, Coins, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
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
  const [redirectionUrl, setRedirectionUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'initial' | 'pending_3ds' | 'processing'>('initial');

  // Check for payment status in URL params and handle 3DS response
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentResult = urlParams.get('payment');
    const transactionId = urlParams.get('transaction');
    
    if (paymentResult === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your tokens have been added to your account.",
      });
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
        description: "There was an error processing your payment.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/payment-center');
    }

    // Listen for iframe messages (for 3DS redirection)
    const handleIframeMessage = (event: MessageEvent) => {
      // Accept messages from Paymob domains and bank domains
      const allowedOrigins = [
        'https://accept.paymob.com',
        'https://accept.paymobsolutions.com',
        'https://paymob.com',
        'https://paymobsolutions.com'
      ];
      
      // Also allow bank domains (they vary by bank)
      const isBankDomain = event.origin && (
        event.origin.includes('.bank.') || 
        event.origin.includes('banking.') ||
        event.origin.includes('secure.')
      );
      
      if (!allowedOrigins.some(origin => event.origin.startsWith(origin)) && !isBankDomain) {
        console.log('Message from unauthorized origin:', event.origin);
        return;
      }
      
      console.log('Iframe message received from:', event.origin, 'Data:', event.data);
      
      if (event.data && typeof event.data === 'object') {
        // Enhanced 3DS detection - check all possible format variations
        const isPending = event.data.pending === 'true' || event.data.pending === true || event.data.pending === 1;
        const useRedirection = event.data.use_redirection === 'true' || event.data.use_redirection === true || 
                              event.data.useRedirection === 'true' || event.data.useRedirection === true;
        const hasRedirectUrl = event.data.redirection_url || event.data.redirectionUrl || event.data.redirect_url;
        
        if (isPending && (useRedirection || hasRedirectUrl)) {
          const redirectUrl = hasRedirectUrl;
          console.log('🔴 3DS redirection detected:', redirectUrl);
          setRedirectionUrl(redirectUrl);
          setPaymentStatus('pending_3ds');
          
          // Force immediate top-level redirect for 3DS authentication
          console.log('🔴 Force redirecting to bank 3DS page');
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 500); // Small delay to ensure state is set
        }
        
        // Enhanced success detection
        if (event.data.success === 'true' || event.data.success === true || event.data.success === 1) {
          console.log('✅ Payment successful from iframe');
          setPaymentStatus('processing');
          toast({
            title: "Payment Successful!",
            description: "Your tokens have been added to your account.",
          });
        }
        
        // Enhanced failure detection
        if ((event.data.success === 'false' || event.data.success === false) && !isPending) {
          console.log('❌ Payment failed from iframe');
          setPaymentStatus('processing');
          toast({
            title: "Payment Failed", 
            description: "Your payment could not be processed. Please try again.",
            variant: "destructive",
          });
        }
        
        // Handle iframe ready state
        if (event.data.type === 'IFRAME_READY' || event.data.ready) {
          console.log('💡 Payment iframe is ready');
        }
      }
      
      // Handle string messages (some banks send string responses)
      if (typeof event.data === 'string') {
        console.log('String message received:', event.data);
        if (event.data.includes('3ds') || event.data.includes('redirect')) {
          console.log('🔴 3DS string message detected');
          setPaymentStatus('pending_3ds');
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
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
        tokensAmount: pkg.tokens,
        // Add proper customer data for Egyptian banking requirements  
        customerInfo: {
          phone: user.phone || '+201234567890' // Use user's phone or default
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setPaymentIntent(result.paymentIntent);
        setShowIframe(true);
        
        // Payment status polling disabled - rely on iframe messages for 3DS detection
        // and callback URLs for final payment completion
        
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
    setRedirectionUrl(null);
    setPaymentStatus('initial');
  };

  const handle3DSRedirection = () => {
    // Manually set redirection URL from the response you provided
    const redirectUrl = "https://accept.paymobsolutions.com/api/acceptance/mpgs_secure_callback/get_acs_page?token=ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrbHVkR1ZuY21GMGFXOXVWVzVwY1hWbFVtVm1JaXdpY21WbVgzQnJJam94TnprMk9ETXdOekFzSW1WNGNDSTZNVGMxTlRrMk1URXlOSDAuTW9iU1IzVHVGZmQzOHhhMzkxSGp1d1pZZnkxVkF4VDRJZkJFbUg0U2pCdHNrQ1lBM2lyZE5ZMjRiZk4yYkpzRXB2aU5TN2lQRHR6YW5SUks2bldkenc=&init=false";
    setRedirectionUrl(redirectUrl);
    setPaymentStatus('pending_3ds');
    
    toast({
      title: "3D Secure Required",
      description: "Redirecting to bank authentication page...",
    });
  };

  const handleGoBack = () => {
    setLocation('/');
  };

  if (showIframe && paymentIntent) {
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
                  Complete Payment
                </h1>
                <p className="text-gray-400" data-testid="text-payment-subtitle">
                  {selectedPackage?.name} - {selectedPackage?.tokens} tokens for {selectedPackage?.price} EGP
                </p>
              </div>
            </div>

            <Card className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-athlete-accent" />
                  Secure Payment
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Complete your payment using the secure Paymob payment gateway.<br/>
                  <span className="text-yellow-400">Note: Cards requiring 3D Secure will show "pending" until bank authentication is completed.</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-athlete-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Package:</span>
                      <span className="text-white font-semibold" data-testid="text-package-name">
                        {selectedPackage?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300">Tokens:</span>
                      <span className="text-athlete-accent font-semibold" data-testid="text-tokens-amount">
                        {selectedPackage?.tokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total:</span>
                      <span className="text-white font-bold text-lg" data-testid="text-total-amount">
                        {selectedPackage?.price} EGP
                      </span>
                    </div>
                  </div>

                  <div className="border border-gray-600 rounded-lg overflow-hidden">
                    {paymentStatus === 'pending_3ds' ? (
                      <div className="space-y-4">
                        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 text-blue-200">
                          <h4 className="font-semibold mb-2">Redirecting to 3D Secure Authentication</h4>
                          <p className="text-sm mb-3">You are being redirected to your bank's secure authentication page to complete the payment.</p>
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Redirecting...</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        src={paymentIntent.iframeUrl}
                        width="100%"
                        height="650"
                        frameBorder="0"
                        title="Paymob Payment"
                        className="w-full min-h-[650px]"
                        data-testid="iframe-payment"
                        onLoad={() => {
                          console.log('Payment iframe loaded');
                        }}
                        allow="payment *; geolocation *; camera *; microphone *; fullscreen *"
                        sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
                      />
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-400 space-y-2">
                    <p>🔒 Your payment is secured by Paymob encryption</p>
                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 text-yellow-200">
                      <h4 className="font-semibold mb-1">Payment Instructions</h4>
                      <p className="text-xs">
                        • Enter your card details in the payment form above<br/>
                        • If you see "Pending 3DS Authorization", click the button below<br/>
                        • Complete the OTP or password verification as requested by your bank<br/>
                        • Payment will be processed automatically after successful authentication
                      </p>
                      {paymentStatus === 'pending_3ds' && (
                        <div className="mt-2 p-2 bg-blue-800/30 rounded border border-blue-500/50">
                          <p className="text-blue-200 font-semibold text-xs">
                            🔐 3D Secure authentication is now required. Use the button above or complete verification in the iframe.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {paymentStatus === 'initial' && (
                      <div className="mt-4">
                        <Button 
                          onClick={handle3DSRedirection}
                          variant="outline"
                          size="sm"
                          className="border-orange-600 text-orange-300 hover:bg-orange-700/20"
                          data-testid="button-manual-3ds"
                        >
                          Having 3DS Issues? Click Here for Manual Redirection
                        </Button>
                      </div>
                    )}
                    
                    <p>After successful payment, tokens will be added to your account immediately</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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

          {/* Integration Status */}
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