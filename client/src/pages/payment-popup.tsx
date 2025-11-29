import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';

interface PaymentPopupProps {
  selectedPackage: any;
  paymentIntent: any;
  onBack: () => void;
}

export function PaymentPopup({ selectedPackage, paymentIntent, onBack }: PaymentPopupProps) {
  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="border text-foreground hover:bg-muted"
              data-testid="button-back-packages"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Packages
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-payment-title">
                Secure Checkout
              </h1>
              <p className="text-muted-foreground" data-testid="text-payment-subtitle">
                {selectedPackage?.name} - {selectedPackage?.tokens} tokens for {selectedPackage?.price} EGP
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Summary */}
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Order Summary
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Review your purchase details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-foreground">Package:</span>
                      <span className="text-white font-semibold" data-testid="text-package-name">
                        {selectedPackage?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-foreground">Tokens:</span>
                      <span className="text-athlete-accent font-bold" data-testid="text-tokens-amount">
                        {selectedPackage?.tokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border pt-3">
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
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-athlete-accent" />
                  Secure Checkout
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Complete your payment through Paymob's hosted checkout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-6">
                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-blue-600 p-3 rounded-full">
                          <CreditCard className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">Secure Checkout</h3>
                      <p className="text-foreground text-sm mb-6">
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

                  {/* Payment Instructions */}
                  <div className="bg-muted border border/30 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-400" />
                      Payment Instructions
                    </h4>
                    <div className="text-xs text-foreground space-y-2">
                      <p>1. Click "Proceed to Checkout"</p>
                      <p>2. Choose your payment method (cards, wallets, Valu, etc.)</p>
                      <p>3. Enter your payment details & complete OTP if required</p>
                      <p>4. You'll be redirected back after successful payment</p>
                      <p>5. Tokens will be added automatically to your account</p>
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
