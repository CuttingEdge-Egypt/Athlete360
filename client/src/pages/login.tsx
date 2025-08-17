import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, ArrowLeft, User, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "Complete all fields",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid email address",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Attempting local login with:', { email: formData.email });

      const response = await apiRequest('POST', '/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      const result = await response.json();

      if (result.success || result.message === "Login successful") {
        toast({
          title: "Welcome back!",
          description: `Successfully logged in as ${result.user?.firstName || formData.email}`,
        });
        // Force page reload to update authentication state and redirect to dashboard
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        toast({
          title: "Login failed",
          description: result.message || "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <LogIn className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Sign in to your Athlete360 account
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
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-white">
              <User className="h-6 w-6 text-blue-500" />
              Sign In
            </CardTitle>
            <CardDescription className="text-gray-300 text-base">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john.doe@example.com"
                  className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                  data-testid="input-login-email"
                  required
                />
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="h-12 text-base bg-gray-700 border-gray-600 text-white"
                  data-testid="input-login-password"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium h-12 text-base"
                data-testid="button-login-submit"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
            
            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-blue-50/10 rounded-lg border border-blue-500/30 mt-6">
              <Lock className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-300 text-sm mb-1">Secure Login</h4>
                <p className="text-sm text-blue-200">
                  Your login credentials are encrypted and secure
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Button 
              variant="link" 
              onClick={() => setLocation('/signup')}
              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
              data-testid="link-signup"
            >
              Sign up here
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}