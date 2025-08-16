import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Users, Gift, Check, X, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { 
  validateCard, 
  formatCardNumber, 
  formatExpiry,
  detectCardBrand,
  getCardBrandInfo,
  type CardDetails 
} from "@/lib/cardValidation";
import { 
  validatePassword, 
  validatePasswordMatch,
  checkPasswordRequirements,
  getPasswordStrengthColor,
  getPasswordStrengthBgColor 
} from "@/lib/passwordValidation";

interface SignupWithCardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (user: any) => void;
}

export function SignupWithCard({ isOpen, onClose, onComplete }: SignupWithCardProps) {
  const [step, setStep] = useState<'referral' | 'account' | 'payment' | 'processing'>('referral');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  
  // Account details state
  const [accountDetails, setAccountDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Card details state
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  
  // Validation states
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(''));
  const [passwordMatchValidation, setPasswordMatchValidation] = useState(validatePasswordMatch('', ''));
  const [cardValidation, setCardValidation] = useState(validateCard({ number: '', expiry: '', cvv: '', name: '' }));
  
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Extract referral code from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      validateReferralCode(refCode);
    }
  }, []);

  // Update password validation when password changes
  useEffect(() => {
    setPasswordValidation(validatePassword(accountDetails.password));
  }, [accountDetails.password]);

  // Update password match validation when either password changes
  useEffect(() => {
    setPasswordMatchValidation(validatePasswordMatch(accountDetails.password, accountDetails.confirmPassword));
  }, [accountDetails.password, accountDetails.confirmPassword]);

  // Update card validation when card details change
  useEffect(() => {
    setCardValidation(validateCard(cardDetails));
  }, [cardDetails]);

  const validateReferralCode = async (codeToValidate?: string) => {
    const code = codeToValidate || referralCode;
    if (!code.trim()) {
      setStep('account');
      return;
    }

    setIsValidatingReferral(true);
    try {
      const response = await fetch(`/api/referrals/validate/${code}`);
      const data = await response.json();
      
      if (data.valid) {
        setReferrerName(data.referrerName);
        toast({
          title: "Valid referral link!",
          description: `You were referred by ${data.referrerName} - they'll get 100 bonus tokens when you sign up!`,
        });
      } else {
        toast({
          title: "Invalid referral link",
          description: "Link not found, but you can still continue signup",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating referral:', error);
    } finally {
      setIsValidatingReferral(false);
      setStep('account');
    }
  };

  const validateAccountDetails = () => {
    const errors: string[] = [];
    
    // Check required fields
    if (!accountDetails.firstName.trim()) errors.push('First name is required');
    if (!accountDetails.lastName.trim()) errors.push('Last name is required');
    if (!accountDetails.email.trim()) errors.push('Email is required');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (accountDetails.email && !emailRegex.test(accountDetails.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Validate password
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
    
    // Validate password match
    if (!passwordMatchValidation.match) {
      errors.push(passwordMatchValidation.error || 'Passwords do not match');
    }
    
    if (errors.length > 0) {
      toast({
        title: "Please fix the following errors:",
        description: errors.join(', '),
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handlePaymentSubmit = async () => {
    // Validate card details using comprehensive validation
    if (!cardValidation.isValid) {
      toast({
        title: "Please fix card validation errors:",
        description: cardValidation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Extract expiry month and year
      const [expiryMonth, expiryYear] = cardDetails.expiry.split('/');
      const cleanCardNumber = cardDetails.number.replace(/\s/g, '');
      
      // Simulate card tokenization (in real implementation, this would use Paymob's frontend SDK)
      const cardToken = `card_token_${Date.now()}`;
      const cardLast4 = cleanCardNumber.slice(-4);
      const cardBrand = detectCardBrand(cleanCardNumber);

      console.log('Submitting signup completion...', { cardLast4, cardBrand });

      // Complete signup with all details
      const signupData = {
        // Account details
        firstName: accountDetails.firstName,
        lastName: accountDetails.lastName,
        email: accountDetails.email,
        password: accountDetails.password,
        
        // Card details
        cardToken,
        cardLast4,
        cardBrand,
        expiryMonth,
        expiryYear: `20${expiryYear}`, // Convert YY to YYYY
        cvv: cardDetails.cvv,
        cardholderName: cardDetails.name,
        
        // Payment processing
        paymobCustomerId: `customer_${Date.now()}`,
        referralCode: referralCode.trim() || undefined
      };

      // Use the signup-with-card endpoint
      const response = await apiRequest('POST', '/api/auth/signup-with-card', signupData);

      // Parse the response properly
      const responseData = await response.json();
      console.log('Signup completion response:', responseData);

      if (responseData.success) {
        toast({
          title: "Welcome to Athlete360!",
          description: "Your account is ready with 1000 free tokens",
        });

        // Pass the user data to parent component
        onComplete(responseData.user);
        onClose();
      } else {
        throw new Error(responseData.message || 'Signup failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Prevent page refresh by stopping event propagation
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.log('Request was aborted, likely due to page refresh');
        return;
      }
      
      toast({
        title: "Signup failed",
        description: error?.message || "Please try again or contact support",
        variant: "destructive",
      });
      setStep('payment');
    } finally {
      setIsProcessing(false);
    }
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
                {referralCode ? "Referral Link Detected!" : "Do you have a referral link?"}
              </CardTitle>
              <CardDescription>
                {referralCode ? 
                  "You used a referral link to get here. Your friend will get bonus tokens when you sign up!" :
                  "Optional: If someone shared a referral link with you, enter the code here"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referralCode && referrerName && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Referred by: {referrerName}
                  </span>
                </div>
              )}
              {referralCode && !referrerName && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Using referral link: {referralCode}
                  </span>
                </div>
              )}
              {!referralCode && (
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">No referral link detected</p>
                  <p className="text-xs">You can still sign up and start with 1000 free tokens!</p>
                </div>
              )}
              <Button 
                onClick={() => validateReferralCode()} 
                disabled={isValidatingReferral}
                className="w-full"
                data-testid="button-continue-referral"
              >
                {isValidatingReferral ? "Validating..." : "Continue"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'account' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-500" />
                Create Your Account
              </CardTitle>
              <CardDescription>
                Enter your details and create a secure password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={accountDetails.firstName}
                    onChange={(e) => setAccountDetails(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={accountDetails.lastName}
                    onChange={(e) => setAccountDetails(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={accountDetails.email}
                  onChange={(e) => setAccountDetails(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={accountDetails.password}
                    onChange={(e) => setAccountDetails(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a strong password"
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password strength indicator */}
                {accountDetails.password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getPasswordStrengthBgColor(passwordValidation.strength)}`}
                          style={{ width: `${passwordValidation.score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getPasswordStrengthColor(passwordValidation.strength)}`}>
                        {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                      </span>
                    </div>
                    
                    {/* Password requirements checklist */}
                    <div className="space-y-1">
                      {Object.entries(checkPasswordRequirements(accountDetails.password)).map(([requirement, met]) => (
                        <div key={requirement} className="flex items-center gap-2 text-xs">
                          {met ? 
                            <Check className="h-3 w-3 text-green-500" /> : 
                            <X className="h-3 w-3 text-red-500" />
                          }
                          <span className={met ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {requirement === 'length' && '8+ characters'}
                            {requirement === 'uppercase' && 'Uppercase letter'}
                            {requirement === 'lowercase' && 'Lowercase letter'}
                            {requirement === 'number' && 'Number'}
                            {requirement === 'special' && 'Special character'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={accountDetails.confirmPassword}
                    onChange={(e) => setAccountDetails(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password match indicator */}
                {accountDetails.confirmPassword && (
                  <div className="flex items-center gap-2 text-xs">
                    {passwordMatchValidation.match ? 
                      <Check className="h-3 w-3 text-green-500" /> : 
                      <X className="h-3 w-3 text-red-500" />
                    }
                    <span className={passwordMatchValidation.match ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {passwordMatchValidation.match ? "Passwords match" : "Passwords don't match"}
                    </span>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => {
                  if (validateAccountDetails()) {
                    setStep('payment');
                  }
                }}
                className="w-full"
                data-testid="button-continue-account"
              >
                Continue to Payment
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
                  className={cardValidation.errors.some(e => e.includes('name')) ? 'border-red-500' : ''}
                />
                {cardValidation.errors.filter(e => e.includes('name')).map((error, idx) => (
                  <p key={idx} className="text-xs text-red-500">{error}</p>
                ))}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="flex items-center justify-between">
                  <span>Card Number</span>
                  {cardDetails.number && cardValidation.brand !== 'Unknown' && (
                    <span className={`text-xs font-medium ${getCardBrandInfo(cardValidation.brand).textColor}`}>
                      {cardValidation.brand}
                    </span>
                  )}
                </Label>
                <Input
                  id="cardNumber"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  data-testid="input-card-number"
                  className={cardValidation.errors.some(e => e.includes('card number') || e.includes('Invalid card')) ? 'border-red-500' : ''}
                />
                {cardValidation.errors.filter(e => e.includes('card number') || e.includes('Invalid card') || e.includes('Unsupported')).map((error, idx) => (
                  <p key={idx} className="text-xs text-red-500">{error}</p>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Valid Until (MM/YY)</Label>
                  <Input
                    id="expiry"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/YY"
                    maxLength={5}
                    data-testid="input-card-expiry"
                    className={cardValidation.errors.some(e => e.includes('expiry') || e.includes('expired')) ? 'border-red-500' : ''}
                  />
                  {cardValidation.errors.filter(e => e.includes('expiry') || e.includes('expired') || e.includes('format')).map((error, idx) => (
                    <p key={idx} className="text-xs text-red-500">{error}</p>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">
                    CVV {cardValidation.brand === 'American Express' ? '(4 digits)' : '(3 digits)'}
                  </Label>
                  <Input
                    id="cvv"
                    value={cardDetails.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const maxLength = cardValidation.brand === 'American Express' ? 4 : 3;
                      setCardDetails(prev => ({ ...prev, cvv: value.slice(0, maxLength) }));
                    }}
                    placeholder={cardValidation.brand === 'American Express' ? '1234' : '123'}
                    maxLength={cardValidation.brand === 'American Express' ? 4 : 3}
                    type="password"
                    data-testid="input-card-cvv"
                    className={cardValidation.errors.some(e => e.includes('CVV')) ? 'border-red-500' : ''}
                  />
                  {cardValidation.errors.filter(e => e.includes('CVV')).map((error, idx) => (
                    <p key={idx} className="text-xs text-red-500">{error}</p>
                  ))}
                </div>
              </div>

              {/* Card validation summary */}
              {cardDetails.number && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {cardValidation.isValid ? 
                      <Check className="h-4 w-4 text-green-500" /> :
                      <X className="h-4 w-4 text-red-500" />
                    }
                    <span className={`text-sm font-medium ${cardValidation.isValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                      {cardValidation.isValid ? 'Card validation passed' : 'Please fix card details'}
                    </span>
                  </div>
                  {cardValidation.brand !== 'Unknown' && (
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Card brand: {cardValidation.brand}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Gift className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  🎉 You'll start with 1000 free tokens!
                </span>
              </div>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePaymentSubmit();
                }}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-complete-signup"
                type="button"
              >
                {isProcessing ? "Processing..." : "Complete Signup"}
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