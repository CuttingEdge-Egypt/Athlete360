import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CreditCard, Users, TestTube, DollarSign, Coins, Gift } from "lucide-react";

interface TestScenarios {
  cards: {
    success: string;
    declined: string;
    networkError: string;
    insufficientFunds: string;
  };
  referral: {
    codes: string[];
    emails: string[];
  };
  tokens: {
    packages: Array<{ tokens: number; price: number }>;
  };
}

export function TestingPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(20);
  const [paymentTokens, setPaymentTokens] = useState(500);
  const [referralEmail, setReferralEmail] = useState('');
  const { toast } = useToast();

  const simulatePayment = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/test/simulate-payment', {
        amount: paymentAmount,
        tokens: paymentTokens
      });

      toast({
        title: "Payment Simulated Successfully!",
        description: `Added ${paymentTokens} tokens to your account`,
      });

      // Refresh user data and referrals
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });

    } catch (error: any) {
      toast({
        title: "Simulation Failed",
        description: error.message || "Failed to simulate payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const simulateReferral = async () => {
    if (!referralEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email for the referral simulation",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/test/simulate-referral', {
        email: referralEmail
      });

      toast({
        title: "Referral Simulated Successfully!",
        description: `${referralEmail} signed up - you earned 100 bonus tokens!`,
      });

      // Clear the input
      setReferralEmail('');

      // Refresh user data and referrals
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });

    } catch (error: any) {
      toast({
        title: "Simulation Failed",
        description: error.message || "Failed to simulate referral",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tokenPackages = [
    { tokens: 100, price: 5 },
    { tokens: 500, price: 20 },
    { tokens: 1000, price: 35 },
    { tokens: 2500, price: 80 }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-blue-500" />
          Testing Panel
        </CardTitle>
        <CardDescription>
          Simulate payments and referrals without real credit cards or signups
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="payment">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Simulation
            </TabsTrigger>
            <TabsTrigger value="referral" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Referral Simulation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Token Packages */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quick Token Packages</h3>
                <div className="grid grid-cols-2 gap-2">
                  {tokenPackages.map((pkg) => (
                    <Button
                      key={pkg.tokens}
                      variant="outline"
                      onClick={() => {
                        setPaymentTokens(pkg.tokens);
                        setPaymentAmount(pkg.price);
                      }}
                      className="flex items-center justify-between p-4 h-auto"
                    >
                      <div className="text-left">
                        <div className="font-semibold">{pkg.tokens}</div>
                        <div className="text-xs text-muted-foreground">tokens</div>
                      </div>
                      <Badge variant="secondary">${pkg.price}</Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Payment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Custom Payment</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payment-amount">Amount (USD)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      min="1"
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-tokens">Tokens</Label>
                    <Input
                      id="payment-tokens"
                      type="number"
                      value={paymentTokens}
                      onChange={(e) => setPaymentTokens(Number(e.target.value))}
                      min="1"
                      placeholder="500"
                    />
                  </div>
                  <Button 
                    onClick={simulatePayment} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {isLoading ? "Simulating..." : "Simulate Payment"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="referral" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Referral Simulation */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Simulate New Referral</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="referral-email">Friend's Email</Label>
                    <Input
                      id="referral-email"
                      type="email"
                      value={referralEmail}
                      onChange={(e) => setReferralEmail(e.target.value)}
                      placeholder="friend@example.com"
                    />
                  </div>
                  <Button 
                    onClick={simulateReferral} 
                    disabled={isLoading || !referralEmail}
                    className="w-full"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    {isLoading ? "Simulating..." : "Simulate Referral Signup"}
                  </Button>
                </div>
              </div>

              {/* Quick Referrals */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quick Referral Examples</h3>
                <div className="space-y-2">
                  {['friend1@test.com', 'friend2@test.com', 'friend3@test.com'].map((email) => (
                    <Button
                      key={email}
                      variant="outline"
                      onClick={() => setReferralEmail(email)}
                      className="w-full justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      {email}
                    </Button>
                  ))}
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>💡 Testing:</strong> Each simulated referral adds 100 tokens to your account and creates a referral record.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Test Cards Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">🧪 Testing Information</h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>Payment Simulation:</strong> No real payment processing - tokens are added directly to your account</p>
            <p><strong>Referral Simulation:</strong> Creates test user accounts and referral records without real email sending</p>
            <p><strong>Safe Testing:</strong> All simulations use mock data and don't affect real payment systems</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}