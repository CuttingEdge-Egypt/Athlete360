import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, LogIn, UserPlus, Gift, Mail, Eye, EyeOff, Check, X } from "lucide-react";
import { 
  validatePassword, 
  validatePasswordMatch,
  checkPasswordRequirements,
  getPasswordStrengthColor,
  getPasswordStrengthBgColor 
} from "@/lib/passwordValidation";
import { 
  validateCard, 
  formatCardNumber, 
  formatExpiry,
  detectCardBrand,
  getCardBrandInfo 
} from "@/lib/cardValidation";

export default function TestAuthPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const errors: string[] = [];
    
    // Check required fields
    if (!signupData.firstName.trim()) errors.push('First name is required');
    if (!signupData.lastName.trim()) errors.push('Last name is required');
    if (!signupData.email.trim()) errors.push('Email is required');
    if (!signupData.password) errors.push('Password is required');
    if (!signupData.confirmPassword) errors.push('Please confirm your password');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (signupData.email && !emailRegex.test(signupData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Validate password
    const passwordValidation = validatePassword(signupData.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(signupData.password, signupData.confirmPassword);
    if (!passwordMatchValidation.match) {
      errors.push(passwordMatchValidation.error || 'Passwords do not match');
    }

    if (errors.length > 0) {
      toast({
        title: "Please fix the following errors:",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setCurrentStep("payment");
  };

  const handleSignup = async () => {
    // Create formatted expiry for validation
    const formattedExpiry = `${signupData.expiryMonth.padStart(2, '0')}/${signupData.expiryYear.slice(-2)}`;
    
    // Validate card details using comprehensive validation
    const cardValidation = validateCard({
      number: signupData.cardNumber,
      expiry: formattedExpiry,
      cvv: signupData.cvv,
      name: signupData.cardholderName
    });

    if (!cardValidation.isValid) {
      toast({
        title: "Please fix card validation errors:",
        description: cardValidation.errors.join(', '),
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

      // Process card details with proper formatting
      const cleanCardNumber = signupData.cardNumber.replace(/\s/g, '');
      const cardLast4 = cleanCardNumber.slice(-4);
      const cardBrand = detectCardBrand(cleanCardNumber);
      
      const signupPayload = {
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        password: signupData.password,
        referralCode: signupData.referralCode,
        cardLast4,
        cardBrand,
        cardToken: cardAuthResult.cardToken,
        paymobCustomerId: cardAuthResult.customerId,
        expiryMonth: signupData.expiryMonth.padStart(2, '0'),
        expiryYear: signupData.expiryYear,
        cvv: signupData.cvv,
        cardholderName: signupData.cardholderName
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
          confirmPassword: "",
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
          <p className="text-foreground">Test email/password login, signup, and referral functionality</p>
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
          <Card className="bg-background border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login Test
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Test email/password login functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="login-email" className="text-foreground">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="test@example.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="bg-card border text-white"
                  data-testid="input-login-email"
                />
              </div>
              <div>
                <Label htmlFor="login-password" className="text-foreground">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="bg-card border text-white"
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

          <Card className="bg-background border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Signup Test {currentStep === "payment" && "- Payment Info"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
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
                  <p className="text-foreground">Secure your account with a payment method and start with 1000 free tokens</p>
                  
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
                    <Label htmlFor="signup-firstname" className="text-foreground">First Name</Label>
                    <Input
                      id="signup-firstname"
                      placeholder="John"
                      value={signupData.firstName}
                      onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
                      className="bg-card border text-white"
                      data-testid="input-signup-firstname"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-lastname" className="text-foreground">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      placeholder="Doe"
                      value={signupData.lastName}
                      onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
                      className="bg-card border text-white"
                      data-testid="input-signup-lastname"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="john@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    className="bg-card border text-white"
                    data-testid="input-signup-email"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password (min 8 chars with uppercase, lowercase, number, special char)"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      className="bg-card border text-white pr-10"
                      data-testid="input-signup-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-signup-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {signupData.password && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${getPasswordStrengthBgColor(validatePassword(signupData.password).strength)}`}
                            style={{ width: `${validatePassword(signupData.password).score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${getPasswordStrengthColor(validatePassword(signupData.password).strength)}`}>
                          {validatePassword(signupData.password).strength.charAt(0).toUpperCase() + validatePassword(signupData.password).strength.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(checkPasswordRequirements(signupData.password)).map(([requirement, met]) => (
                          <div key={requirement} className="flex items-center gap-1">
                            {met ? 
                              <Check className="h-3 w-3 text-green-500" /> : 
                              <X className="h-3 w-3 text-red-500" />
                            }
                            <span className={met ? "text-green-400" : "text-red-400"}>
                              {requirement === 'length' && '8+ chars'}
                              {requirement === 'uppercase' && 'Uppercase'}
                              {requirement === 'lowercase' && 'Lowercase'}
                              {requirement === 'number' && 'Number'}
                              {requirement === 'special' && 'Special'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="signup-confirm-password" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                      className="bg-card border text-white pr-10"
                      data-testid="input-signup-confirm-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      data-testid="button-toggle-signup-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {signupData.confirmPassword && (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      {validatePasswordMatch(signupData.password, signupData.confirmPassword).match ? 
                        <Check className="h-3 w-3 text-green-500" /> : 
                        <X className="h-3 w-3 text-red-500" />
                      }
                      <span className={validatePasswordMatch(signupData.password, signupData.confirmPassword).match ? "text-green-400" : "text-red-400"}>
                        {validatePasswordMatch(signupData.password, signupData.confirmPassword).match ? "Passwords match" : "Passwords don't match"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="signup-referral" className="text-foreground flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Referral Code (Optional)
                  </Label>
                  <Input
                    id="signup-referral"
                    placeholder="REF123"
                    value={signupData.referralCode}
                    onChange={(e) => setSignupData({...signupData, referralCode: e.target.value})}
                    className="bg-card border text-white"
                    data-testid="input-signup-referral"
                  />
                </div>
                  <Button 
                    onClick={handlePersonalInfoNext} 
                    disabled={
                      !signupData.email.trim() || 
                      !signupData.password || 
                      !signupData.confirmPassword ||
                      !signupData.firstName.trim() || 
                      !signupData.lastName.trim() ||
                      !validatePassword(signupData.password).isValid ||
                      !validatePasswordMatch(signupData.password, signupData.confirmPassword).match
                    }
                    className="w-full disabled:opacity-50"
                    data-testid="button-next-to-payment"
                  >
                    Next: Add Payment Card
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="card-number" className="text-foreground">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="card-number"
                        placeholder="1234 5678 9012 3456"
                        value={signupData.cardNumber}
                        onChange={(e) => {
                          const formatted = formatCardNumber(e.target.value);
                          setSignupData({...signupData, cardNumber: formatted});
                        }}
                        className="bg-card border text-white pr-12"
                        data-testid="input-card-number"
                        maxLength={19}
                      />
                      {signupData.cardNumber && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {(() => {
                            const brand = detectCardBrand(signupData.cardNumber);
                            const brandInfo = getCardBrandInfo(brand);
                            return (
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${brandInfo.bgColor} ${brandInfo.textColor}`}>
                                  {brandInfo.name}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cardholder-name" className="text-foreground">Cardholder Name</Label>
                    <Input
                      id="cardholder-name"
                      placeholder="John Doe"
                      value={signupData.cardholderName}
                      onChange={(e) => setSignupData({...signupData, cardholderName: e.target.value})}
                      className="bg-card border text-white"
                      data-testid="input-cardholder-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry" className="text-foreground">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={(() => {
                          if (!signupData.expiryMonth && !signupData.expiryYear) return '';
                          const month = signupData.expiryMonth.padStart(2, '0');
                          const year = signupData.expiryYear.slice(-2);
                          return month && year ? `${month}/${year}` : (signupData.expiryMonth || '');
                        })()}
                        onChange={(e) => {
                          const formatted = formatExpiry(e.target.value);
                          const [month, year] = formatted.split('/');
                          setSignupData({
                            ...signupData, 
                            expiryMonth: month || '',
                            expiryYear: year ? `20${year}` : ''
                          });
                        }}
                        className="bg-card border text-white"
                        data-testid="input-expiry"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv" className="text-foreground">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        maxLength={4}
                        value={signupData.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setSignupData({...signupData, cvv: value});
                        }}
                        className="bg-card border text-white"
                        data-testid="input-cvv"
                      />
                    </div>
                  </div>
                  
                  {/* Card validation feedback */}
                  {(signupData.cardNumber || signupData.expiryMonth || signupData.expiryYear || signupData.cvv || signupData.cardholderName) && (
                    <div className="space-y-2">
                      {(() => {
                        const formattedExpiry = signupData.expiryMonth && signupData.expiryYear ? 
                          `${signupData.expiryMonth.padStart(2, '0')}/${signupData.expiryYear.slice(-2)}` : '';
                        
                        const cardValidation = validateCard({
                          number: signupData.cardNumber,
                          expiry: formattedExpiry,
                          cvv: signupData.cvv,
                          name: signupData.cardholderName
                        });
                        
                        return (
                          <div className="text-xs space-y-1">
                            {cardValidation.errors.length > 0 && (
                              <div className="space-y-1">
                                {cardValidation.errors.map((error, index) => (
                                  <div key={index} className="flex items-center gap-2 text-red-400">
                                    <X className="h-3 w-3" />
                                    <span>{error}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {cardValidation.isValid && (
                              <div className="flex items-center gap-2 text-green-400">
                                <Check className="h-3 w-3" />
                                <span>Card details are valid</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-900 border border-blue-600 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-100">
                      <Gift className="h-4 w-4" />
                      <span className="font-medium">You'll start with 1000 free tokens!</span>
                    </div>
                    <p className="text-blue-200 text-sm mt-1">
                      <strong>Test Cards:</strong> Use 4111111111111111 (Visa) or 5123456789012346 (Mastercard)
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={() => setCurrentStep("personal")}
                      variant="outline"
                      className="bg-card border text-white hover:bg-muted"
                      data-testid="button-back-to-personal"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleSignup} 
                      disabled={isLoading || (() => {
                        const formattedExpiry = signupData.expiryMonth && signupData.expiryYear ? 
                          `${signupData.expiryMonth.padStart(2, '0')}/${signupData.expiryYear.slice(-2)}` : '';
                        
                        const cardValidation = validateCard({
                          number: signupData.cardNumber,
                          expiry: formattedExpiry,
                          cvv: signupData.cvv,
                          name: signupData.cardholderName
                        });
                        
                        return !cardValidation.isValid;
                      })()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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
            className="bg-card border text-white hover:bg-muted"
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

        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>🔒 This page tests local email/password authentication</p>
          <p>No Replit popups - perfect for testing login flows!</p>
        </div>
      </div>
    </div>
  );
}