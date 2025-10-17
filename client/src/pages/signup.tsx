import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Gift, Zap, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function SignupPage() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  
  const { toast } = useToast();

  // Check for referral code in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setPersonalInfo(prev => ({ ...prev, referralCode: refCode }));
      // Show a friendly message about the referral
      toast({
        title: "Referral code applied!",
        description: "You'll get bonus tokens when you sign up.",
      });
    }
  }, []);

  const handleSignup = async () => {
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email || !personalInfo.password || !personalInfo.confirmPassword) {
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

    // Password validation
    if (personalInfo.password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(personalInfo.password)) {
      toast({
        title: "Password validation failed",
        description: "Password must contain at least one uppercase letter",
        variant: "destructive",
      });
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(personalInfo.password)) {
      toast({
        title: "Password validation failed",
        description: "Password must contain at least one special character",
        variant: "destructive",
      });
      return;
    }

    if (personalInfo.password !== personalInfo.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are identical",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create signup payload without card information
      const signupPayload = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        password: personalInfo.password,
        confirmPassword: personalInfo.confirmPassword,
        referralCode: personalInfo.referralCode || ''
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
        // Force page reload to update authentication state and redirect to dashboard
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <User className="h-6 w-6 text-blue-500" />
              Create Your Account
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              Tell us about yourself to get started with 1000 free tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
            
            {/* Referral Code Field */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-sm font-medium text-gray-200 flex items-center gap-2">
                <Gift className="h-4 w-4 text-green-500" />
                Referral Code (Optional)
              </Label>
              <Input
                id="referralCode"
                value={personalInfo.referralCode}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
                placeholder="Enter referral code to earn bonus tokens"
                className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                data-testid="input-referral-code"
              />
              {personalInfo.referralCode && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  You'll receive bonus tokens when you sign up!
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={personalInfo.password}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min. 8 chars, 1 uppercase, 1 special"
                  className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={personalInfo.confirmPassword}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Re-enter password"
                  className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSignup}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium h-12 text-base"
              data-testid="button-create-account"
            >
              {isProcessing ? 'Creating Account...' : 'Create Account & Get 1000 Free Tokens'}
              <Gift className="ml-2 h-5 w-5" />
            </Button>
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