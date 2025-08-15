import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Plus, Loader2 } from "lucide-react";
import type { SavedCard } from "@shared/schema";

interface CardSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardSelected: (card: SavedCard | null) => void; // null means "add new card"
  tokenAmount: number;
  price: number;
}

export function CardSelectionModal({ 
  open, 
  onOpenChange, 
  onCardSelected, 
  tokenAmount, 
  price 
}: CardSelectionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: savedCards = [], isLoading } = useQuery<SavedCard[]>({
    queryKey: ["/api/payments/cards"],
    enabled: open,
  });

  const handleCardSelection = async (card: SavedCard | null) => {
    setIsProcessing(true);
    try {
      onCardSelected(card);
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return '💳';
    if (brandLower.includes('mastercard')) return '💳';
    if (brandLower.includes('amex')) return '💳';
    return '💳';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-athlete-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-athlete-accent">
            Select Payment Method
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Purchase {tokenAmount.toLocaleString()} tokens for ${price}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin" size={24} />
              <span className="ml-2">Loading payment methods...</span>
            </div>
          ) : (
            <>
              {/* Saved Cards */}
              {savedCards.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-300">Saved Cards</h3>
                  {savedCards.map((card) => (
                    <Card 
                      key={card.id} 
                      className="bg-athlete-gray-700 border-gray-600 hover:border-athlete-accent cursor-pointer transition-colors"
                      onClick={() => handleCardSelection(card)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{getCardIcon(card.cardBrand)}</div>
                            <div>
                              <div className="font-medium">
                                {card.cardBrand} •••• {card.cardLast4}
                              </div>
                              {card.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CreditCard className="text-gray-400" size={20} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add New Card Option */}
              <div className="pt-4 border-t border-gray-600">
                <Button
                  onClick={() => handleCardSelection(null)}
                  disabled={isProcessing}
                  className="w-full bg-athlete-accent hover:bg-blue-600 text-white"
                  data-testid="button-add-new-card"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : (
                    <Plus className="mr-2" size={16} />
                  )}
                  Enter New Card Details
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}