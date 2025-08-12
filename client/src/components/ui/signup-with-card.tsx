import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Users, Gift } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SignupWithCardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (user: any) => void;
}

export function SignupWithCard({ isOpen, onClose, onComplete }: SignupWithCardProps) {
  const [step, setStep] = useState<'referral' | 'payment' | 'processing'>('referral');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const validateReferralCode = async () => {
    if (!referralCode.trim()) {
      setStep('payment');
      return;
    }

    setIsValidatingReferral(true);
    try {
      const response = await fetch(`/api/referrals/validate/${referralCode}`);
      const data = await response.json();
      
      if (data.valid) {
        setReferrerName(data.referrerName);
        toast({
          title: "Valid referral code!",
          description: `You'll receive bonus tokens from ${data.referrerName}`,
        });
      } else {
        toast({
          title: "Invalid referral code",
          description: "Code not found, but you can still continue signup",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating referral:', error);
    } finally {
      setIsValidatingReferral(false);
      setStep('payment');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
      toast({
        title: "Complete card details",
        description: "All payment fields are required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Simulate card tokenization (in real implementation, this would use Paymob's frontend SDK)
      const cardToken = `card_token_${Date.now()}`;
      const cardLast4 = cardDetails.number.slice(-4);
      const cardBrand = getCardBrand(cardDetails.number);

      // Complete signup with card info
      const response = await apiRequest('POST', '/api/auth/complete-signup', {
        cardToken,
        cardLast4,
        cardBrand,
        paymobCustomerId: `customer_${Date.now()}`,
        referralCode: referralCode.trim() || undefined
      });

      toast({
        title: "Welcome to Athlete360!",
        description: "Your account is ready with 1000 free tokens",
      });

      onComplete(response.user);
      onClose();
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
      setStep('payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardBrand = (number: string): string => {
    const firstDigit = number[0];
    if (firstDigit === '4') return 'Visa';
    if (firstDigit === '5') return 'Mastercard';
    if (firstDigit === '3') return 'American Express';
    return 'Unknown';
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="signup-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Complete Your Signup
          </DialogTitle>
          <DialogDescription>
            Secure your account with a payment method and start with 1000 free tokens
          </DialogDescription>
        </DialogHeader>

        {step === 'referral' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-500" />
                Do you have a referral code?
              </CardTitle>
              <CardDescription>
                Optional: Enter a friend's referral code to give them bonus tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="referral">Referral Code (Optional)</Label>
                <Input
                  id="referral"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  data-testid="input-referral-code"
                />
              </div>
              {referrerName && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Referred by: {referrerName}
                  </span>
                </div>
              )}
              <Button 
                onClick={validateReferralCode} 
                disabled={isValidatingReferral}
                className="w-full"
                data-testid="button-continue-referral"
              >
                {isValidatingReferral ? "Validating..." : "Continue"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-green-500" />
                Payment Method Required
              </CardTitle>
              <CardDescription>
                Add a payment card to activate your account. No charges will be made now.
                You start with 1000 free tokens!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  data-testid="input-card-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  data-testid="input-card-number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/YY"
                    maxLength={5}
                    data-testid="input-card-expiry"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                    placeholder="123"
                    maxLength={4}
                    type="password"
                    data-testid="input-card-cvv"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Gift className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  🎉 You'll start with 1000 free tokens!
                </span>
              </div>
              <Button 
                onClick={handlePaymentSubmit} 
                disabled={isProcessing}
                className="w-full"
                data-testid="button-complete-signup"
              >
                Complete Signup
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-medium">Setting up your account...</p>
            <p className="text-sm text-muted-foreground">This will just take a moment</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}