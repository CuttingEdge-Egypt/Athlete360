import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentReceipts } from "@/components/ui/payment-receipts";
import { ReferralSystem } from "@/components/ui/referral-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Coins, Zap, Crown } from "lucide-react";

export default function PaymentCenter() {
  const [tokenAmount, setTokenAmount] = useState(1000);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  const tokenPackages = [
    { tokens: 500, price: 50, popular: false },
    { tokens: 1000, price: 90, popular: true },
    { tokens: 2500, price: 200, popular: false },
    { tokens: 5000, price: 350, popular: false },
  ];

  const calculatePrice = (tokens: number) => {
    // 1 EGP = 10 tokens, so price = tokens / 10
    return tokens / 10;
  };

  const handleTokenPurchase = async (tokens: number) => {
    setIsProcessing(true);
    try {
      const price = calculatePrice(tokens);
      
      // Create payment intent
      const intentResponse = await apiRequest('POST', '/api/payments/create-intent', {
        amount: price,
        tokensAmount: tokens
      });

      // In a real implementation, you would open the Paymob iframe here
      // For now, we'll simulate a successful payment
      toast({
        title: "Payment initiated",
        description: "Opening payment window...",
      });

      // Simulate payment completion after 3 seconds
      setTimeout(async () => {
        try {
          await apiRequest('POST', '/api/payments/complete', {
            transactionId: `txn_${Date.now()}`,
            amount: price,
            tokensAmount: tokens,
            paymentMethod: 'card',
            cardLast4: user?.cardLast4 || '1234',
            cardBrand: user?.cardBrand || 'Visa'
          });

          toast({
            title: "Payment successful!",
            description: `${tokens} tokens added to your account`,
          });

          // Refresh user data and receipts
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/payments/receipts'] });
        } catch (error) {
          toast({
            title: "Payment failed",
            description: "Please try again or contact support",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      }, 3000);
    } catch (error) {
      toast({
        title: "Failed to initiate payment",
        description: "Please try again later",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment Center</h1>
        <p className="text-muted-foreground">
          Manage your tokens, view receipts, and invite friends
        </p>
      </div>

      <Tabs defaultValue="purchase" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="purchase" data-testid="tab-purchase">
            <Coins className="h-4 w-4 mr-2" />
            Buy Tokens
          </TabsTrigger>
          <TabsTrigger value="receipts" data-testid="tab-receipts">
            <CreditCard className="h-4 w-4 mr-2" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="referrals" data-testid="tab-referrals">
            <Crown className="h-4 w-4 mr-2" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase" className="space-y-6">
          {/* Current Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {user?.tokens || 0} tokens
              </div>
              <p className="text-sm text-muted-foreground">
                Ready for AI-powered athlete analysis
              </p>
            </CardContent>
          </Card>

          {/* Token Packages */}
          <Card>
            <CardHeader>
              <CardTitle>Token Packages</CardTitle>
              <CardDescription>
                Choose a package that fits your analysis needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tokenPackages.map((pkg) => (
                  <div
                    key={pkg.tokens}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      pkg.popular
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Popular
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-2xl font-bold">{pkg.tokens}</div>
                      <div className="text-sm text-muted-foreground mb-2">tokens</div>
                      <div className="text-lg font-semibold text-green-600">
                        {pkg.price} EGP
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        {(pkg.price / pkg.tokens * 10).toFixed(2)} EGP per 10 tokens
                      </div>
                      <Button
                        onClick={() => handleTokenPurchase(pkg.tokens)}
                        disabled={isProcessing}
                        className="w-full"
                        variant={pkg.popular ? "default" : "outline"}
                        data-testid={`button-buy-${pkg.tokens}`}
                      >
                        {isProcessing ? "Processing..." : "Buy Now"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Amount */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Amount</CardTitle>
              <CardDescription>
                Buy a specific number of tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="customTokens">Number of Tokens</Label>
                  <Input
                    id="customTokens"
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(Number(e.target.value))}
                    data-testid="input-custom-tokens"
                  />
                </div>
                <div className="flex-1">
                  <Label>Price</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {calculatePrice(tokenAmount)} EGP
                  </div>
                </div>
                <Button
                  onClick={() => handleTokenPurchase(tokenAmount)}
                  disabled={isProcessing || tokenAmount < 100}
                  data-testid="button-buy-custom"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Buy Tokens
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <PaymentReceipts />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralSystem />
        </TabsContent>
      </Tabs>
    </div>
  );
}