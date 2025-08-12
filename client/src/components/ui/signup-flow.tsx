import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, User, Gift, Shield, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SignupFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (user: any) => void;
}

export function SignupFlow({ isOpen, onClose, onComplete }: SignupFlowProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  
  const { toast } = useToast();

  const handlePersonalInfoSubmit = () => {
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email) {
      toast({
        title: "Complete personal information",
        description: "All fields are required to continue",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalInfo.email)) {
      toast({
        title: "Invalid email address",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setActiveTab("payment");
  };

  const handleCardSubmit = async () => {
    if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
      toast({
        title: "Complete card details",
        description: "All payment fields are required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Store signup data in sessionStorage for completion after auth
      const signupData = {
        personalInfo,
        cardDetails: {
          ...cardDetails,
          cardToken: `card_token_${Date.now()}`,
          cardLast4: cardDetails.number.replace(/\s/g, '').slice(-4),
          cardBrand: getCardBrand(cardDetails.number.replace(/\s/g, '')),
          paymobCustomerId: `customer_${Date.now()}`
        },
        referralCode: new URLSearchParams(window.location.search).get('ref')
      };
      
      sessionStorage.setItem('pendingSignupData', JSON.stringify(signupData));
      
      // Redirect to Replit auth - this will create the user account first
      window.location.href = "/api/login";
    } catch (error) {
      console.error('Signup initiation error:', error);
      toast({
        title: "Signup failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\s/g, '');
    const firstDigit = cleanNumber[0];
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col" data-testid="signup-flow-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Join Athlete360
          </DialogTitle>
          <DialogDescription>
            Create your account and start analyzing athletes with AI-powered insights
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="payment" disabled={activeTab === "personal"} className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-blue-500" />
                  Your Information
                </CardTitle>
                <CardDescription>
                  Tell us about yourself to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john.doe@example.com"
                    data-testid="input-email"
                  />
                </div>
                <Button 
                  onClick={handlePersonalInfoSubmit}
                  className="w-full"
                  data-testid="button-continue-personal"
                >
                  Continue to Payment Method
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="mt-6 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {/* Free Trial Benefits */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Gift className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200">Free Trial Benefits</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 mt-1 space-y-1">
                    <li>• 1,000 free tokens to start analyzing athletes</li>
                    <li>• No money will be charged during signup</li>
                    <li>• Card is only for future token purchases</li>
                    <li>• Cancel anytime with no obligations</li>
                  </ul>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Your payment information is encrypted and secure
                </span>
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5 text-green-500" />
                    Payment Method
                  </CardTitle>
                  <CardDescription>
                    Secure your account with a payment method for future token purchases
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
                
                </CardContent>
              </Card>
            </div>
            
            {/* Fixed bottom action buttons */}
            <div className="flex flex-col gap-2 pt-4 border-t bg-white dark:bg-gray-900 mt-4">
              <Button 
                onClick={handleCardSubmit}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-create-account"
              >
                {isProcessing ? "Creating Account..." : "Create Account & Start Free Trial"}
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setActiveTab("personal")}
                className="w-full"
                data-testid="button-back"
              >
                Back to Personal Info
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}