import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, LogIn, UserPlus, Gift, Mail } from "lucide-react";

export default function TestAuthPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    referralCode: "",
    // Card details
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
    cardholderName: ""
  });
  const [currentStep, setCurrentStep] = useState<"personal" | "payment">("personal");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/login', loginData);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.firstName}!`,
        });
        setUser(result.user);
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Invalid credentials",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalInfoNext = () => {
    if (!signupData.firstName || !signupData.lastName || !signupData.email || !signupData.password) {
      toast({
        title: "Complete personal information",
        description: "All fields are required to continue",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupData.email)) {
      toast({
        title: "Invalid email address",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep("payment");
  };

  const handleSignup = async () => {
    // Validate card details
    if (!signupData.cardNumber || !signupData.expiryMonth || !signupData.expiryYear || !signupData.cvv || !signupData.cardholderName) {
      toast({
        title: "Complete payment information",
        description: "All card details are required",
        variant: "destructive",
      });
      return;
    }

    // Validate card number format (basic Luhn algorithm check)
    if (!isValidCardNumber(signupData.cardNumber)) {
      toast({
        title: "Invalid card number",
        description: "Please enter a valid card number",
        variant: "destructive",
      });
      return;
    }

    // Validate expiry date
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    const expiryYear = parseInt(signupData.expiryYear);
    const expiryMonth = parseInt(signupData.expiryMonth);
    
    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      toast({
        title: "Card expired",
        description: "Please use a card that hasn't expired",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, authenticate the card with Paymob
      const cardAuthResult = await authenticateCard({
        cardNumber: signupData.cardNumber,
        expiryMonth: signupData.expiryMonth,
        expiryYear: signupData.expiryYear,
        cvv: signupData.cvv,
        cardholderName: signupData.cardholderName
      });

      if (!cardAuthResult.success) {
        throw new Error(cardAuthResult.message || "Card authentication failed");
      }

      // Process card details with real Paymob response
      const cardLast4 = signupData.cardNumber.slice(-4);
      const cardBrand = getCardBrand(signupData.cardNumber);
      
      const signupPayload = {
        ...signupData,
        cardLast4,
        cardBrand,
        cardToken: cardAuthResult.cardToken,
        paymobCustomerId: cardAuthResult.customerId
      };

      const response = await apiRequest('POST', '/api/auth/signup-with-card', signupPayload);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Signup Successful",
          description: `Welcome, ${result.user.firstName}! You got 1000 free tokens and your card is registered.`,
        });
        setUser(result.user);
        setCurrentStep("personal"); // Reset for next test
        setSignupData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          referralCode: "",
          cardNumber: "",
          expiryMonth: "",
          expiryYear: "",
          cvv: "",
          cardholderName: ""
        });
      } else {
        toast({
          title: "Signup Failed",
          description: result.message || "Failed to create account",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Signup Error", 
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to detect card brand
  const getCardBrand = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'Mastercard';
    if (number.startsWith('3')) return 'American Express';
    return 'Unknown';
  };

  // Luhn algorithm for basic card validation
  const isValidCardNumber = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(number)) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  // Authenticate card with Paymob
  const authenticateCard = async (cardData: any) => {
    try {
      const response = await apiRequest('POST', '/api/auth/validate-card', cardData);
      return await response.json();
    } catch (error) {
      return { success: false, message: "Card validation failed" };
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('GET', '/api/logout');
      setUser(null);
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "Failed to logout",
        variant: "destructive"
      });
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await apiRequest('GET', '/api/auth/user');
      const userData = await response.json();
      setUser(userData);
      toast({
        title: "User Data Fetched",
        description: `Current user: ${userData.firstName} ${userData.lastName}`,
      });
    } catch (error) {
      toast({
        title: "Not Logged In",
        description: "No active session found",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Authentication Testing</h1>
          <p className="text-gray-300">Test email/password login, signup, and referral functionality</p>
        </div>

        {user && (
          <Alert className="mb-6 bg-green-900 border-green-600">
            <User className="h-4 w-4" />
            <AlertDescription className="text-green-100">
              Logged in as: <strong>{user.firstName} {user.lastName}</strong> ({user.email}) | 
              Tokens: <strong>{user.tokens}/{user.totalTokensPurchased}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login Test
              </CardTitle>
              <CardDescription className="text-gray-400">
                Test email/password login functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="test@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-login-email"
                />
              </div>
              <div>
                <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="bg-gray-800 border-gray-600 text-white"
                  data-testid="input-login-password"
                />
              </div>
              <Button 
                onClick={handleLogin} 
                disabled={isLoading || !loginData.email || !loginData.password}
                className="w-full"
                data-testid="button-login"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Signup Test {currentStep === "payment" && "- Payment Info"}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {currentStep === "personal" 
                  ? "Test user registration with referral code" 
                  : "Add payment card to complete signup"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === "payment" && (
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Complete Your Signup</h2>
                  <p className="text-gray-300">Secure your account with a payment method and start with 1000 free tokens</p>
                  
                  <div className="mt-4 p-4 bg-green-900 border border-green-600 rounded-lg">
                    <div className="flex items-center gap-2 text-green-100">
                      <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <span className="font-medium">Payment Method Required</span>
                    </div>
                    <p className="text-green-200 text-sm mt-2">
                      Add a payment card to activate your account. No charges will be made now. You start with 1000 free tokens!
                    </p>
                  </div>

                  {/* Show referral info if one was provided, but don't ask again */}
                  {signupData.referralCode && (
                    <div className="mt-4 p-3 bg-blue-900 border border-blue-600 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-100">
                        <Gift className="h-4 w-4" />
                        <span className="font-medium">Referral Code Applied: {signupData.referralCode}</span>
                      </div>
                      <p className="text-blue-200 text-sm mt-1">
                        Your referrer will get bonus tokens when you complete signup!
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {currentStep === "personal" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signup-firstname" className="text-gray-300">First Name</Label>
                    <Input
                      id="signup-firstname"
                      placeholder="John"
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-signup-firstname"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-lastname" className="text-gray-300">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      placeholder="Doe"
                      value={signupData.lastName}
                      onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-signup-lastname"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="john@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-signup-email"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={signupData.password}
                    onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-signup-password"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-referral" className="text-gray-300 flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Referral Code (Optional)
                  </Label>
                  <Input
                    id="signup-referral"
                    placeholder="REF123"
                    value={signupData.referralCode}
                    onChange={(e) => setSignupData({...signupData, referralCode: e.target.value})}
                    className="bg-gray-800 border-gray-600 text-white"
                    data-testid="input-signup-referral"
                  />
                </div>
                  <Button 
                    onClick={handlePersonalInfoNext} 
                    disabled={!signupData.email || !signupData.password || !signupData.firstName || !signupData.lastName}
                    className="w-full"
                    data-testid="button-next-to-payment"
                  >
                    Next: Add Payment Card
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="card-number" className="text-gray-300">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      value={signupData.cardNumber}
                      onChange={(e) => setSignupData({...signupData, cardNumber: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-card-number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardholder-name" className="text-gray-300">Cardholder Name</Label>
                    <Input
                      id="cardholder-name"
                      placeholder="John Doe"
                      value={signupData.cardholderName}
                      onChange={(e) => setSignupData({...signupData, cardholderName: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                      data-testid="input-cardholder-name"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expiry-month" className="text-gray-300">Month</Label>
                      <Input
                        id="expiry-month"
                        placeholder="MM"
                        maxLength={2}
                        value={signupData.expiryMonth}
                        onChange={(e) => setSignupData({...signupData, expiryMonth: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-expiry-month"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiry-year" className="text-gray-300">Year</Label>
                      <Input
                        id="expiry-year"
                        placeholder="YY"
                        maxLength={2}
                        value={signupData.expiryYear}
                        onChange={(e) => setSignupData({...signupData, expiryYear: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-expiry-year"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-gray-300">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        maxLength={4}
                        value={signupData.cvv}
                        onChange={(e) => setSignupData({...signupData, cvv: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-cvv"
                      />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-900 border border-blue-600 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-100">
                      <Gift className="h-4 w-4" />
                      <span className="font-medium">You'll start with 1000 free tokens!</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={() => setCurrentStep("personal")}
                      variant="outline"
                      className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      data-testid="button-back-to-personal"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleSignup} 
                      disabled={isLoading || !signupData.cardNumber || !signupData.cvv || !signupData.cardholderName}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-complete-signup"
                    >
                      {isLoading ? "Validating Card..." : "Complete Signup"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex gap-4 justify-center">
          <Button 
            onClick={fetchCurrentUser}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            data-testid="button-check-session"
          >
            <Mail className="h-4 w-4 mr-2" />
            Check Current Session
          </Button>
          
          {user && (
            <Button 
              onClick={handleLogout}
              variant="destructive"
              data-testid="button-logout"
            >
              Logout
            </Button>
          )}
        </div>

        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🔒 This page tests local email/password authentication</p>
          <p>No Replit popups - perfect for testing login flows!</p>
        </div>
      </div>
    </div>
  );
}