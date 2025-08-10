import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, Zap, Trophy, Loader2, CreditCard } from "lucide-react";

interface TokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TokenModal({ open, onOpenChange }: TokenModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const paymobMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/paymob/initiate-payment", { amount, currency: 'EGP' });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to Paymob payment page
      window.open(data.paymentUrl, '_blank');
      toast({
        title: "Payment Initiated",
        description: `Redirecting to payment gateway for ${data.tokens} tokens.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
    },
  });

  const legacyPurchaseMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/purchase-tokens", { amount });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Tokens Purchased!",
        description: `Successfully added ${data.purchased} tokens to your account.`,
      });
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase tokens",
        variant: "destructive",
      });
    },
  });

  const handlePaymobPurchase = (amount: number) => {
    paymobMutation.mutate(amount);
  };

  const handleLegacyPurchase = (amount: number) => {
    legacyPurchaseMutation.mutate(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-athlete-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader className="text-center">
          <div className="text-6xl mb-4">🪙</div>
          <DialogTitle className="text-2xl font-bold text-athlete-warning">
            Running Low on Tokens!
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            You need more tokens to access this premium feature. Recharge now to continue your athlete analysis journey.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          {/* Professional Pack - Most Popular */}
          <Card className="bg-athlete-gray-700 border-athlete-accent border-2 relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <span className="bg-athlete-accent text-white px-3 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </span>
            </div>
            <CardContent className="p-4 pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Trophy className="text-athlete-accent" size={24} />
                  <div>
                    <h4 className="font-semibold text-white">Professional Pack</h4>
                    <p className="text-sm text-gray-400">1,000 tokens</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">$25</div>
                  <div className="text-xs text-athlete-accent">Best Value</div>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => handlePaymobPurchase(25)}
                  data-testid="button-paymob-purchase-1000"
                  disabled={paymobMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {paymobMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay with Paymob - $25
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handleLegacyPurchase(25)}
                  data-testid="button-legacy-purchase-1000"
                  disabled={legacyPurchaseMutation.isPending}
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-athlete-gray-600"
                >
                  {legacyPurchaseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Simulate Purchase
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Starter Pack */}
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Coins className="text-athlete-warning" size={24} />
                  <div>
                    <h4 className="font-semibold text-white">Starter Pack</h4>
                    <p className="text-sm text-gray-400">500 tokens</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">$15</div>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => handlePaymobPurchase(15)}
                  data-testid="button-paymob-purchase-500"
                  disabled={paymobMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {paymobMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay with Paymob - $15
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handleLegacyPurchase(15)}
                  data-testid="button-legacy-purchase-500"
                  disabled={legacyPurchaseMutation.isPending}
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-athlete-gray-600"
                >
                  {legacyPurchaseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Simulate Purchase
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Pack */}
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Zap className="text-yellow-400" size={24} />
                  <div>
                    <h4 className="font-semibold text-white">Enterprise Pack</h4>
                    <p className="text-sm text-gray-400">2,500 tokens</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">$50</div>
                  <div className="text-xs text-gray-400">Bulk Savings</div>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => handlePaymobPurchase(50)}
                  data-testid="button-paymob-purchase-2500"
                  disabled={paymobMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {paymobMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay with Paymob - $50
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handleLegacyPurchase(50)}
                  data-testid="button-legacy-purchase-2500"
                  disabled={legacyPurchaseMutation.isPending}
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-athlete-gray-600"
                >
                  {legacyPurchaseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Simulate Purchase
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={() => onOpenChange(false)}
            data-testid="button-maybe-later"
            variant="ghost"
            className="w-full text-gray-400 hover:text-white"
            disabled={purchaseMutation.isPending}
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
