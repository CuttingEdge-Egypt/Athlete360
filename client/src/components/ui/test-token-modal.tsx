import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Coins, Zap, AlertTriangle } from "lucide-react";

interface TestTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestTokenModal({ open, onOpenChange }: TestTokenModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tokenAmount, setTokenAmount] = useState<string>("1000");

  const addTokensMutation = useMutation({
    mutationFn: async (tokens: number) => {
      const response = await apiRequest("POST", "/api/test/add-tokens", { tokens });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Tokens Added!",
        description: `Successfully added ${data.added} tokens to your account for testing.`,
      });
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      onOpenChange(false);
      setTokenAmount("1000");
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Tokens",
        description: error.message || "Failed to add test tokens",
        variant: "destructive",
      });
    },
  });

  const handleAddTokens = () => {
    const tokens = parseInt(tokenAmount);
    if (isNaN(tokens) || tokens <= 0 || tokens > 10000) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid token amount (1-10000)",
        variant: "destructive",
      });
      return;
    }
    addTokensMutation.mutate(tokens);
  };

  const quickAddButtons = [
    { amount: 500, label: "500 Tokens" },
    { amount: 1000, label: "1,000 Tokens" },
    { amount: 2500, label: "2,500 Tokens" },
    { amount: 5000, label: "5,000 Tokens" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-athlete-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Zap className="text-yellow-500" size={24} />
            Test Token Addition
            <Badge variant="destructive" className="ml-auto">
              TESTING ONLY
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Warning Notice */}
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="text-yellow-500 mt-0.5 flex-shrink-0" size={16} />
            <div className="text-sm">
              <p className="text-yellow-200 font-medium">Testing Feature</p>
              <p className="text-yellow-300/80">
                This feature is for testing purposes only and will be removed in production.
              </p>
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="token-amount" className="text-white">
              Custom Token Amount
            </Label>
            <div className="flex gap-2">
              <Input
                id="token-amount"
                type="number"
                min="1"
                max="10000"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="Enter token amount"
                className="bg-athlete-gray-700 border-gray-600 text-white"
                data-testid="input-custom-tokens"
              />
              <Button
                onClick={handleAddTokens}
                disabled={addTokensMutation.isPending}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
                data-testid="button-add-custom-tokens"
              >
                {addTokensMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Maximum: 10,000 tokens per addition
            </p>
          </div>

          {/* Quick Add Buttons */}
          <div className="space-y-3">
            <Label className="text-white">Quick Add Options</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickAddButtons.map((option) => (
                <Button
                  key={option.amount}
                  variant="outline"
                  onClick={() => {
                    setTokenAmount(option.amount.toString());
                    addTokensMutation.mutate(option.amount);
                  }}
                  disabled={addTokensMutation.isPending}
                  className="bg-athlete-gray-700 border-gray-600 text-white hover:bg-athlete-gray-600"
                  data-testid={`button-quick-add-${option.amount}`}
                >
                  <Coins className="mr-2" size={16} />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}