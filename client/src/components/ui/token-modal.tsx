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
import { Coins, Zap, Trophy, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

interface TokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TokenModal({ open, onOpenChange }: TokenModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation('tokens');
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const purchaseMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest("POST", "/api/purchase-tokens", { amount });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('toasts.purchased.title'),
        description: t('toasts.purchased.description', { amount: data.purchased }),
      });
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('toasts.failed.title'),
        description: error.message || t('toasts.failed.description'),
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (amount: number) => {
    purchaseMutation.mutate(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-athlete-gray-800 border-gray-700 text-white w-[95vw] max-w-md sm:max-w-lg max-h-[95vh] overflow-y-auto" dir={isArabic ? 'rtl' : 'ltr'}>
        <DialogHeader className="text-center">
          <div className="text-5xl mb-3">🪙</div>
          <DialogTitle className={`${isArabic ? 'text-2xl' : 'text-xl'} font-bold text-athlete-warning mb-2`}>
            {t('modal.title')}
          </DialogTitle>
          <DialogDescription className={`text-gray-300 ${isArabic ? 'text-base' : 'text-sm'}`}>
            {t('modal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Professional Pack - Most Popular */}
          <Card className="bg-athlete-gray-700 border-athlete-accent border-2 relative">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <span className={`bg-athlete-accent text-white px-3 py-1 rounded-full ${isArabic ? 'text-sm' : 'text-xs'} font-semibold`}>
                {t('packs.professional.badge')}
              </span>
            </div>
            <CardContent className="p-4 pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center ${isArabic ? 'space-x-reverse space-x-3 flex-row-reverse' : 'space-x-3'}`}>
                  <Trophy className="text-athlete-accent" size={24} />
                  <div className={isArabic ? 'text-right' : 'text-left'}>
                    <h4 className={`font-semibold text-white ${isArabic ? 'text-lg' : 'text-base'}`}>{t('packs.professional.name')}</h4>
                    <p className={`${isArabic ? 'text-base' : 'text-sm'} text-gray-400`}>{t('packs.professional.tokens')}</p>
                  </div>
                </div>
                <div className={isArabic ? 'text-left' : 'text-right'}>
                  <div className={`font-bold text-white ${isArabic ? 'text-lg' : 'text-base'}`}>{t('packs.professional.price')}</div>
                  <div className={`${isArabic ? 'text-sm' : 'text-xs'} text-athlete-accent`}>{t('packs.professional.value')}</div>
                </div>
              </div>
              <Button 
                onClick={() => handlePurchase(25)}
                data-testid="button-purchase-1000"
                disabled={purchaseMutation.isPending}
                className={`w-full bg-gradient-to-r from-athlete-accent to-athlete-success hover:from-blue-600 hover:to-green-600 text-white ${isArabic ? 'text-base flex-row-reverse' : 'text-sm'}`}
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                    {t('states.processing')}
                  </>
                ) : (
                  t('packs.professional.button')
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Starter Pack */}
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center ${isArabic ? 'space-x-reverse space-x-3 flex-row-reverse' : 'space-x-3'}`}>
                  <Coins className="text-athlete-warning" size={24} />
                  <div className={isArabic ? 'text-right' : 'text-left'}>
                    <h4 className={`font-semibold text-white ${isArabic ? 'text-lg' : 'text-base'}`}>{t('packs.starter.name')}</h4>
                    <p className={`${isArabic ? 'text-base' : 'text-sm'} text-gray-400`}>{t('packs.starter.tokens')}</p>
                  </div>
                </div>
                <div className={isArabic ? 'text-left' : 'text-right'}>
                  <div className={`font-bold text-white ${isArabic ? 'text-lg' : 'text-base'}`}>{t('packs.starter.price')}</div>
                </div>
              </div>
              <Button 
                onClick={() => handlePurchase(15)}
                data-testid="button-purchase-500"
                disabled={purchaseMutation.isPending}
                variant="outline"
                className={`w-full border-gray-600 text-white hover:bg-athlete-gray-600 ${isArabic ? 'text-base flex-row-reverse' : 'text-sm'}`}
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                    {t('states.processing')}
                  </>
                ) : (
                  t('packs.starter.button')
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Enterprise Pack */}
          <Card className="bg-athlete-gray-700 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center ${isArabic ? 'space-x-reverse space-x-3 flex-row-reverse' : 'space-x-3'}`}>
                  <Zap className="text-yellow-400" size={24} />
                  <div className={isArabic ? 'text-right' : 'text-left'}>
                    <h4 className={`font-semibold text-white ${isArabic ? 'text-lg' : 'text-base'}`}>{t('packs.enterprise.name')}</h4>
                    <p className={`${isArabic ? 'text-base' : 'text-sm'} text-gray-400`}>{t('packs.enterprise.tokens')}</p>
                  </div>
                </div>
                <div className={isArabic ? 'text-left' : 'text-right'}>
                  <div className={`font-bold text-white ${isArabic ? 'text-lg' : 'text-base'}`}>{t('packs.enterprise.price')}</div>
                  <div className={`${isArabic ? 'text-sm' : 'text-xs'} text-gray-400`}>{t('packs.enterprise.value')}</div>
                </div>
              </div>
              <Button 
                onClick={() => handlePurchase(50)}
                data-testid="button-purchase-2500"
                disabled={purchaseMutation.isPending}
                variant="outline"
                className={`w-full border-gray-600 text-white hover:bg-athlete-gray-600 ${isArabic ? 'text-base flex-row-reverse' : 'text-sm'}`}
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className={`${isArabic ? 'ml-2' : 'mr-2'} h-4 w-4 animate-spin`} />
                    {t('states.processing')}
                  </>
                ) : (
                  t('packs.enterprise.button')
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
