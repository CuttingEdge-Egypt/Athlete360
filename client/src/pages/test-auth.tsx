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
    referralCode: ""
  });
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

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/signup', signupData);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Signup Successful",
          description: `Welcome, ${result.user.firstName}! You got 1000 free tokens.`,
        });
        setUser(result.user);
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
                Signup Test
              </CardTitle>
              <CardDescription className="text-gray-400">
                Test user registration with referral code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                onClick={handleSignup} 
                disabled={isLoading || !signupData.email || !signupData.password || !signupData.firstName || !signupData.lastName}
                className="w-full"
                data-testid="button-signup"
              >
                {isLoading ? "Creating Account..." : "Sign Up"}
              </Button>
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