import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (user: any) => void;
}

export function LoginModal({ isOpen, onClose, onComplete }: LoginModalProps) {
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing credentials",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting local login with:', { email: loginData.email });

      const response = await apiRequest('POST', '/api/auth/login', loginData);
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Login successful!",
          description: `Welcome back, ${result.user.firstName}!`,
        });
        onComplete(result.user);
        onClose();
        
        // Reset form
        setLoginData({
          email: '',
          password: ''
        });
      } else {
        toast({
          title: "Login failed",
          description: result.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]" data-testid="login-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <LogIn className="h-5 w-5 text-blue-500" />
            Sign In to Athlete360
          </DialogTitle>
          <DialogDescription className="text-base">
            Welcome back! Sign in to your account to continue analyzing athletes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-sm font-medium">Email Address</Label>
            <Input
              id="login-email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.doe@example.com"
              className="h-10 text-base"
              data-testid="input-login-email"
              onKeyPress={handleKeyPress}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                className="h-10 text-base pr-10"
                data-testid="input-login-password"
                onKeyPress={handleKeyPress}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-login-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleLogin}
            disabled={isLoading || !loginData.email || !loginData.password}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium h-10"
            data-testid="button-submit-login"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Signing In...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </Button>

          <div className="text-center text-sm text-gray-600 dark:text-muted-foreground">
            Don't have an account?{" "}
            <button 
              onClick={onClose}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Sign up here
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}