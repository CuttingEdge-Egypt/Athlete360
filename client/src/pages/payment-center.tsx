import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Zap, Trophy, Coins, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

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
  const { t } = useTranslation('payment');
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const tokenPackages: TokenPackage[] = [
    {
      id: "starter",
      name: t('packages.starter.name'),
      price: 15,
      tokens: 500,
      icon: Coins,
      features: [
        t('packages.starter.features.tokens', { count: 500 }),
        t('packages.starter.features.profiles'),
        t('packages.starter.features.insights'),
        t('packages.starter.features.support')
      ]
    },
    {
      id: "professional",
      name: t('packages.professional.name'),
      price: 25,
      tokens: 1000,
      popular: true,
      icon: Zap,
      features: [
        t('packages.professional.features.tokens', { count: 1000 }),
        t('packages.professional.features.comparisons'),
        t('packages.professional.features.breakdowns'),
        t('packages.professional.features.support'),
        t('packages.professional.features.plans')
      ]
    },
    {
      id: "elite",
      name: t('packages.elite.name'),
      price: 50,
      tokens: 2500,
      icon: Trophy,
      features: [
        t('packages.elite.features.tokens', { count: 2500 }),
        t('packages.elite.features.comparisons'),
        t('packages.elite.features.video'),
        t('packages.elite.features.support'),
        t('packages.elite.features.strategies'),
        t('packages.elite.features.nutrition')
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
        title: t('toasts.paymentSuccess.title'),
        description: t('toasts.paymentSuccess.description'),
      });
      // Clean the URL params
      window.history.replaceState({}, '', '/payment-center');
    } else if (paymentResult === 'failed') {
      toast({
        title: t('toasts.paymentFailed.title'),
        description: t('toasts.paymentFailed.description'),
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/payment-center');
    } else if (paymentResult === 'error') {
      toast({
        title: t('toasts.paymentError.title'),
        description: t('toasts.paymentError.description'),
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/payment-center');
    }
  }, [toast, t]);

  const handleSelectPackage = async (pkg: TokenPackage) => {
    if (!user) {
      toast({
        title: t('toasts.authRequired.title'),
        description: t('toasts.authRequired.description'),
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
          title: t('toasts.paymentReady.title'),
          description: t('toasts.paymentReady.description'),
        });
      } else {
        throw new Error(result.message || 'Failed to create payment intent');
      }
    } catch (error: any) {
      console.error('Payment intent creation failed:', error);
      toast({
        title: t('toasts.paymentFailed.title'),
        description: error.message || t('toasts.paymentFailed.description'),
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
      <div className="min-h-screen bg-athlete-gray-900 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className={`flex items-center gap-4 mb-6 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToPackages}
                className={`border-gray-600 text-gray-300 hover:bg-gray-700 ${isArabic ? 'flex-row-reverse' : ''}`}
                data-testid="button-back-packages"
              >
                <ArrowLeft className={`w-4 h-4 ${isArabic ? 'ml-2 rotate-180' : 'mr-2'}`} />
                {t('checkout.backToPackages')}
              </Button>
              <div className={`flex-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                <h1 className={`${isArabic ? 'text-3xl text-right' : 'text-2xl text-left'} font-bold text-white`} data-testid="text-payment-title">
                  {t('checkout.title')}
                </h1>
                <p className={`text-gray-400 ${isArabic ? 'text-lg text-right' : 'text-base text-left'}`} data-testid="text-payment-subtitle">
                  {t('checkout.subtitle', { 
                    name: selectedPackage?.name, 
                    tokens: selectedPackage?.tokens.toLocaleString(isArabic ? 'ar-EG' : 'en-US'), 
                    price: selectedPackage?.price 
                  })}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Order Summary */}
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className={`text-white flex items-center gap-2 ${isArabic ? 'text-xl flex-row-reverse' : 'text-lg'}`}>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {t('checkout.orderSummary.title')}
                  </CardTitle>
                  <CardDescription className={`text-gray-400 ${isArabic ? 'text-base text-right' : 'text-sm'}`}>
                    {t('checkout.orderSummary.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-athlete-gray-700 p-4 rounded-lg">
                      <div className={`flex justify-between items-center mb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-gray-300 ${isArabic ? 'text-base' : 'text-sm'}`}>{t('checkout.orderSummary.package')}</span>
                        <span className={`text-white font-semibold ${isArabic ? 'text-lg' : 'text-base'}`} data-testid="text-package-name">
                          {selectedPackage?.name}
                        </span>
                      </div>
                      <div className={`flex justify-between items-center mb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-gray-300 ${isArabic ? 'text-base' : 'text-sm'}`}>{t('checkout.orderSummary.tokens')}</span>
                        <span className={`text-athlete-accent font-bold ${isArabic ? 'text-lg' : 'text-base'}`} data-testid="text-tokens-amount">
                          {selectedPackage?.tokens.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                        </span>
                      </div>
                      <div className="border-t border-gray-600 pt-3">
                        <div className={`flex justify-between items-center ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className={`text-white font-semibold ${isArabic ? 'text-lg' : 'text-base'}`}>{t('checkout.orderSummary.total')}</span>
                          <span className={`text-white font-bold ${isArabic ? 'text-2xl' : 'text-xl'}`} data-testid="text-total-amount">
                            {selectedPackage?.price} {isArabic ? 'جنيه مصري' : 'EGP'}
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
                  <CardTitle className={`text-white flex items-center gap-2 ${isArabic ? 'text-xl flex-row-reverse' : 'text-lg'}`}>
                    <CreditCard className="w-5 h-5 text-athlete-accent" />
                    {t('checkout.gateway.title')}
                  </CardTitle>
                  <CardDescription className={`text-gray-400 ${isArabic ? 'text-base text-right' : 'text-sm'}`}>
                    {t('checkout.gateway.subtitle')}
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
                        <h3 className={`${isArabic ? 'text-xl' : 'text-lg'} font-bold text-white mb-2`}>{t('checkout.gateway.checkoutTitle')}</h3>
                        <p className={`text-gray-300 ${isArabic ? 'text-base' : 'text-sm'} mb-6`}>
                          {t('checkout.gateway.checkoutDescription')}
                        </p>
                        <Button 
                          size="lg"
                          onClick={() => {
                            console.log('Redirecting to Paymob Flash checkout...');
                            
                            if (paymentIntent?.redirect_url) {
                              toast({
                                title: t('toasts.redirecting.title'),
                                description: t('toasts.redirecting.description'),
                              });
                              
                              // Redirect directly to Paymob Flash
                              window.location.href = paymentIntent.redirect_url;
                            } else {
                              toast({
                                title: t('toasts.urlNotAvailable.title'),
                                description: t('toasts.urlNotAvailable.description'),
                                variant: "destructive",
                              });
                            }
                          }}
                          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 ${isArabic ? 'flex-row-reverse' : ''}`}
                          data-testid="button-proceed-payment"
                        >
                          <CreditCard className={`w-5 h-5 ${isArabic ? 'ml-3' : 'mr-3'}`} />
                          {t('checkout.gateway.proceedButton')}
                        </Button>
                      </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4">
                      <h4 className={`font-semibold text-white mb-3 flex items-center gap-2 ${isArabic ? 'flex-row-reverse text-lg' : 'text-base'}`}>
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        {t('checkout.instructions.title')}
                      </h4>
                      <div className={`${isArabic ? 'text-sm text-right' : 'text-xs'} text-gray-300 space-y-2`}>
                        <div className={`flex items-start gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className="text-blue-400 font-bold">1.</span>
                          <span>{t('checkout.instructions.step1')}</span>
                        </div>
                        <div className={`flex items-start gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className="text-blue-400 font-bold">2.</span>
                          <span>{t('checkout.instructions.step2')}</span>
                        </div>
                        <div className={`flex items-start gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className="text-blue-400 font-bold">3.</span>
                          <span>{t('checkout.instructions.step3')}</span>
                        </div>
                        <div className={`flex items-start gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className="text-blue-400 font-bold">4.</span>
                          <span>{t('checkout.instructions.step4')}</span>
                        </div>
                        <div className={`flex items-start gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <span className="text-blue-400 font-bold">5.</span>
                          <span>{t('checkout.instructions.step5')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 text-center">
              <div className={`inline-flex items-center gap-2 bg-green-900/20 border border-green-600/30 rounded-lg px-4 py-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className={`text-green-300 ${isArabic ? 'text-base' : 'text-sm'}`}>{t('checkout.security')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-athlete-gray-900 text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className={`flex items-center gap-4 mb-8 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className={`border-gray-600 text-gray-300 hover:bg-gray-700 ${isArabic ? 'flex-row-reverse' : ''}`}
              data-testid="button-back-home"
            >
              <ArrowLeft className={`w-4 h-4 ${isArabic ? 'ml-2 rotate-180' : 'mr-2'}`} />
              {t('header.backToDashboard')}
            </Button>
            <div className={`flex-1 ${isArabic ? 'text-right' : 'text-left'}`}>
              <h1 className={`${isArabic ? 'text-4xl text-right' : 'text-3xl text-left'} font-bold text-white`} data-testid="text-payment-center-title">
                {t('header.title')}
              </h1>
              <p className={`text-gray-400 ${isArabic ? 'text-xl text-right' : 'text-base text-left'}`} data-testid="text-payment-center-subtitle">
                {t('header.subtitle')}
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-athlete-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className={isArabic ? 'text-left' : 'text-left'}>
                  <h3 className={`${isArabic ? 'text-xl' : 'text-lg'} font-semibold text-white mb-1`} data-testid="text-current-balance">
                    {t('balance.title')}
                  </h3>
                  <p className={`text-gray-400 ${isArabic ? 'text-base' : 'text-sm'}`}>{t('balance.subtitle')}</p>
                </div>
                <div className={isArabic ? 'text-right' : 'text-right'}>
                  <div className="text-2xl font-bold text-athlete-accent" data-testid="text-token-balance">
                    {(user.tokens || 0).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                  </div>
                  <p className={`${isArabic ? 'text-base' : 'text-sm'} text-gray-400`}>{t('balance.tokens')}</p>
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
                      <Badge className={`bg-athlete-accent text-white px-3 py-1 ${isArabic ? 'text-sm' : 'text-xs'}`}>
                        {t('packages.professional.badge')}
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 bg-athlete-gray-700 rounded-full w-fit">
                      <IconComponent className="text-athlete-accent" size={32} />
                    </div>
                    <CardTitle className={`${isArabic ? 'text-2xl' : 'text-xl'} text-white`} data-testid={`text-package-title-${pkg.id}`}>
                      {pkg.name}
                    </CardTitle>
                    <div className={`${isArabic ? 'text-4xl' : 'text-3xl'} font-bold text-white`} data-testid={`text-package-price-${pkg.id}`}>
                      {pkg.price} {isArabic ? 'جنيه مصري' : 'EGP'}
                    </div>
                    <p className={`text-athlete-accent font-semibold ${isArabic ? 'text-lg' : 'text-base'}`} data-testid={`text-package-tokens-${pkg.id}`}>
                      {pkg.tokens.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} {t('packages.tokensLabel')}
                    </p>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className={`flex items-center ${isArabic ? 'space-x-reverse space-x-2 flex-row-reverse' : 'space-x-2'}`}>
                          <CheckCircle className="text-athlete-success" size={16} />
                          <span className={`text-gray-300 ${isArabic ? 'text-base text-right' : 'text-sm'}`}>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full bg-athlete-accent hover:bg-athlete-accent/90 text-white font-semibold ${isArabic ? 'text-base flex-row-reverse' : 'text-sm'}`}
                      disabled={isCreatingPayment && selectedPackage?.id === pkg.id}
                      data-testid={`button-purchase-${pkg.id}`}
                    >
                      {isCreatingPayment && selectedPackage?.id === pkg.id ? (
                        <>
                          <Loader2 className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'} animate-spin`} />
                          {t('packages.creatingPayment')}
                        </>
                      ) : (
                        <>
                          <CreditCard className={`w-4 h-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                          {t('packages.purchaseButton')}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className={`text-center text-gray-400 ${isArabic ? 'text-base' : 'text-sm'}`}>
            <p className="mb-2">{t('footer.secure')}</p>
            <p className={isArabic ? 'text-base' : 'text-sm'}>{t('footer.encrypted')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
