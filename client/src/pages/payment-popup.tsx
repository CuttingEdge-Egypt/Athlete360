import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentPopupProps {
  selectedPackage: any;
  paymentIntent: any;
  onBack: () => void;
}

export function PaymentPopup({ selectedPackage, paymentIntent, onBack }: PaymentPopupProps) {
  const { toast } = useToast();
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'ready' | 'processing' | 'completed' | 'failed'>('ready');
  const [isMonitoring, setIsMonitoring] = useState(false);

  const openPaymentPopup = () => {
    console.log('Opening payment popup window...');
    
    const popup = window.open(
      paymentIntent.redirect_url, 
      'paymob_payment', 
      'width=900,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,menubar=no,toolbar=no,directories=no,copyhistory=no'
    );
    
    if (popup) {
      setPopupWindow(popup);
      setPaymentStatus('processing');
      setIsMonitoring(true);
      
      // Focus the popup
      popup.focus();
      
      toast({
        title: "Payment Window Opened",
        description: "Complete your payment in the new window.",
      });
      
      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsMonitoring(false);
          setPopupWindow(null);
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
  };

  const focusPopup = () => {
    if (popupWindow && !popupWindow.closed) {
      popupWindow.focus();
    }
  };

  return (
    <div className="min-h-screen bg-athlete-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              data-testid="button-back-packages"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Packages
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-payment-title">
                Secure Payment
              </h1>
              <p className="text-gray-400" data-testid="text-payment-subtitle">
                {selectedPackage?.name} - {selectedPackage?.tokens} tokens for {selectedPackage?.price} EGP
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

            {/* Payment Controls */}
            <Card className="bg-athlete-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-athlete-accent" />
                  Payment Gateway
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Secure payment with Paymob Flash - supports all Egyptian payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {paymentStatus === 'ready' && (
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
                            if (paymentIntent?.redirect_url) {
                              window.location.href = paymentIntent.redirect_url;
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
                  )}

                  {paymentStatus === 'processing' && (
                    <div className="text-center">
                      <div className="bg-orange-900/20 border border-orange-600/30 rounded-lg p-6">
                        <div className="flex items-center justify-center mb-4">
                          <div className="bg-orange-600 p-3 rounded-full animate-pulse">
                            <CreditCard className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Payment in Progress</h3>
                        <p className="text-gray-300 text-sm mb-4">
                          Complete your payment in the popup window. If you don't see it, check for popup blockers.
                        </p>
                        <div className="space-y-3">
                          <Button 
                            variant="outline"
                            onClick={focusPopup}
                            className="border-orange-600 text-orange-400 hover:bg-orange-600 hover:text-white"
                            data-testid="button-focus-popup"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Focus Payment Window
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={openPaymentPopup}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            data-testid="button-reopen-payment"
                          >
                            Open New Payment Window
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

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

          <div className="mt-8 text-center">
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