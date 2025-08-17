import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, User, Gift, Shield, Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function SignupPage() {
  const [, setLocation] = useLocation();
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
      // Create complete signup payload for local authentication
      const signupPayload = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        password: 'temp_password_123!', // Will be set by user later
        confirmPassword: 'temp_password_123!',
        referralCode: new URLSearchParams(window.location.search).get('ref') || '',
        cardNumber: cardDetails.number,
        expiryMonth: cardDetails.expiry.split('/')[0] || '',
        expiryYear: cardDetails.expiry.split('/')[1] ? `20${cardDetails.expiry.split('/')[1]}` : '',
        cvv: cardDetails.cvv,
        cardholderName: cardDetails.name
      };

      console.log('Attempting local signup with:', signupPayload);

      // Use local authentication signup endpoint
      const response = await apiRequest('POST', '/api/auth/signup', signupPayload);
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Account created successfully!",
          description: `Welcome ${result.user.firstName}! You got 1000 free tokens.`,
        });
        // Redirect to dashboard
        setLocation('/dashboard');
      } else {
        toast({
          title: "Signup failed",
          description: result.message || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Please try again or contact support",
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Join Athlete360</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Create your account and start analyzing athletes with AI-powered insights
          </p>
          
          {/* Back to Home Button */}
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mt-4 text-gray-400 hover:text-white"
            data-testid="button-back-home"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Main Content */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Info
                </TabsTrigger>
                <TabsTrigger value="payment" disabled={activeTab === "personal"} className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Method
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <User className="h-6 w-6 text-blue-500" />
                    Your Information
                  </h2>
                  <p className="text-gray-300 mt-2">Tell us about yourself to get started</p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-200">First Name</Label>
                      <Input
                        id="firstName"
                        value={personalInfo.firstName}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-200">Last Name</Label>
                      <Input
                        id="lastName"
                        value={personalInfo.lastName}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                        className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@example.com"
                      className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                      data-testid="input-email"
                    />
                  </div>
                  
                  <Button 
                    onClick={handlePersonalInfoSubmit}
                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium h-12 text-base"
                    data-testid="button-continue-personal"
                  >
                    Continue to Payment Method
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <CreditCard className="h-6 w-6 text-green-500" />
                    Payment Method
                  </h2>
                  <p className="text-gray-300 mt-2">Secure your account with a payment method for future token purchases</p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="space-y-4">
                    <Label htmlFor="cardName" className="text-sm font-medium text-gray-200">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                      className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                      data-testid="input-card-name"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label htmlFor="cardNumber" className="text-sm font-medium text-gray-200">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="h-12 text-base font-mono tracking-wider bg-gray-700 border-gray-600 text-white"
                        data-testid="input-card-number"
                      />
                      {cardDetails.number && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">
                          {getCardBrand(cardDetails.number)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label htmlFor="expiry" className="text-sm font-medium text-gray-200">Expiry Date</Label>
                      <Input
                        id="expiry"
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="h-12 text-base font-mono bg-gray-700 border-gray-600 text-white"
                        data-testid="input-card-expiry"
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="cvv" className="text-sm font-medium text-gray-200">CVV</Label>
                      <Input
                        id="cvv"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        className="h-12 text-base font-mono bg-gray-700 border-gray-600 text-white"
                        data-testid="input-card-cvv"
                      />
                    </div>
                  </div>
                  
                  {/* Benefits and Security Notice */}
                  <div className="grid grid-cols-2 gap-6 mt-8">
                    {/* Free Trial Benefits */}
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50/10 to-blue-50/10 rounded-lg border border-green-500/30">
                      <Gift className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-green-300 text-sm mb-2">Free Trial Benefits</h4>
                        <ul className="text-sm text-green-200 space-y-1">
                          <li>• 1,000 free tokens</li>
                          <li>• No signup charges</li>
                          <li>• Cancel anytime</li>
                        </ul>
                      </div>
                    </div>

                    {/* Security Notice */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50/10 rounded-lg border border-blue-500/30">
                      <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-300 text-sm mb-2">Secure Payment</h4>
                        <p className="text-sm text-blue-200">
                          Your payment info is encrypted and secure. We use industry-standard security measures.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button 
                      onClick={handleCardSubmit}
                      disabled={isProcessing}
                      className="flex-[2] bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium h-12 text-base"
                      data-testid="button-create-account"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Creating Account...
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          Create Account & Get 1000 Tokens
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setActiveTab("personal")}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 h-12 text-base"
                      data-testid="button-back"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Button 
              variant="link" 
              onClick={() => setLocation('/login')}
              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
              data-testid="link-login"
            >
              Sign in here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}