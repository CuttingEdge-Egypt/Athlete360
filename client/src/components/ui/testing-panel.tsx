import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, CreditCard, Coins, CheckCircle, AlertCircle } from "lucide-react";

export function TestingPanel() {
  const [testAmount, setTestAmount] = useState(35);
  const [testTokens, setTestTokens] = useState(1000);
  const [testCardLast4, setTestCardLast4] = useState("1234");
  const [testCardBrand, setTestCardBrand] = useState("Visa");
  const [testScenario, setTestScenario] = useState("success");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  const { data: savedCards = [] } = useQuery({
    queryKey: ['/api/payments/cards'],
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      tokens: number;
      cardLast4: string;
      cardBrand: string;
      scenario: string;
    }) => {
      const response = await apiRequest('POST', '/api/test/simulate-payment', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test Payment Completed",
        description: `${data.tokensAdded} tokens added. New balance: ${data.newBalance}/${data.totalTokensPurchased}`,
      });
      
      // Refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/cards'] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Test payment simulation failed",
        variant: "destructive",
      });
    },
  });

  const addTestCardMutation = useMutation({
    mutationFn: async (data: {
      cardToken: string;
      cardLast4: string;
      cardBrand: string;
    }) => {
      const response = await apiRequest('POST', '/api/payments/cards', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Card Added",
        description: "Card saved successfully for testing",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/cards'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Card",
        description: error.message || "Could not save test card",
        variant: "destructive",
      });
    },
  });

  const handleSimulatePayment = () => {
    simulatePaymentMutation.mutate({
      amount: testAmount,
      tokens: testTokens,
      cardLast4: testCardLast4,
      cardBrand: testCardBrand,
      scenario: testScenario
    });
  };

  const handleAddTestCard = () => {
    const cardToken = `test_card_token_${Date.now()}`;
    addTestCardMutation.mutate({
      cardToken,
      cardLast4: testCardLast4,
      cardBrand: testCardBrand
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-blue-500" />
          Payment Flow Testing Panel
        </CardTitle>
        <CardDescription>
          Test the complete payment flow including card selection and token balance updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Current State Display */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Current State</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Token Balance:</span>
              <div className="font-mono text-lg">
                {user?.tokens || 0} / {user?.totalTokensPurchased || 0}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Saved Cards:</span>
              <div className="font-mono text-lg">{savedCards.length} cards</div>
            </div>
          </div>
        </div>

        {/* Test Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testAmount">Amount (EGP)</Label>
            <Input
              id="testAmount"
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              data-testid="input-test-amount"
            />
          </div>
          <div>
            <Label htmlFor="testTokens">Tokens</Label>
            <Input
              id="testTokens"
              type="number"
              value={testTokens}
              onChange={(e) => setTestTokens(Number(e.target.value))}
              data-testid="input-test-tokens"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testCardLast4">Card Last 4</Label>
            <Input
              id="testCardLast4"
              value={testCardLast4}
              onChange={(e) => setTestCardLast4(e.target.value)}
              maxLength={4}
              data-testid="input-test-card-last4"
            />
          </div>
          <div>
            <Label htmlFor="testCardBrand">Card Brand</Label>
            <Select value={testCardBrand} onValueChange={setTestCardBrand}>
              <SelectTrigger data-testid="select-test-card-brand">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visa">Visa</SelectItem>
                <SelectItem value="Mastercard">Mastercard</SelectItem>
                <SelectItem value="American Express">American Express</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="testScenario">Test Scenario</Label>
          <Select value={testScenario} onValueChange={setTestScenario}>
            <SelectTrigger data-testid="select-test-scenario">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="success">✅ Payment Success</SelectItem>
              <SelectItem value="failure">❌ Payment Failure</SelectItem>
              <SelectItem value="timeout">⏱️ Payment Timeout</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleAddTestCard}
            disabled={addTestCardMutation.isPending}
            variant="outline"
            className="flex-1"
            data-testid="button-add-test-card"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {addTestCardMutation.isPending ? "Adding..." : "Add Test Card"}
          </Button>
          
          <Button
            onClick={handleSimulatePayment}
            disabled={simulatePaymentMutation.isPending}
            className="flex-1"
            data-testid="button-simulate-payment"
          >
            <Coins className="h-4 w-4 mr-2" />
            {simulatePaymentMutation.isPending ? "Testing..." : "Simulate Payment"}
          </Button>
        </div>

        {/* Saved Cards Display */}
        {savedCards.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Saved Payment Cards</h3>
            <div className="space-y-2">
              {savedCards.map((card: any) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <div>
                      <span className="font-medium">{card.cardBrand}</span>
                      <span className="text-muted-foreground ml-2">•••• {card.cardLast4}</span>
                    </div>
                  </div>
                  {card.isDefault && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">Testing Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li>Add test cards to simulate multiple payment methods</li>
                <li>Run payment simulations to test token balance logic</li>
                <li>Check that tokens display as "current / total_purchased"</li>
                <li>Verify receipts are generated correctly</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}