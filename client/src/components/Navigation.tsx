import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { HistoryDropdown } from "@/components/ui/history-dropdown";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Trophy, Coins, Plus, LogOut, User as UserIcon, Video } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatNumber } from "@/lib/arabicNumbers";

export function Navigation() {
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['nav', 'common']);
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!authUser,
  });

  const handleLogout = async () => {
    try {
      await apiRequest('GET', '/api/logout', null);
      // Clear all cached data
      queryClient.clear();
      // Navigate to landing page
      setLocation('/');
      // Force a small delay then reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to direct navigation
      window.location.href = "/api/logout";
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-athlete-primary/90 backdrop-blur-lg border-b border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 cursor-pointer">
          <Trophy className="text-athlete-accent text-2xl" />
          <span className="text-xl font-bold text-white">{t('brand')}</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-6">
          {/* Token Balance Display */}
          <div 
            data-testid="token-balance"
            className="flex items-center space-x-2 bg-athlete-gray-800 px-4 py-2 rounded-full"
          >
            <Coins className="text-athlete-warning" size={20} />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-white">{formatNumber(user?.tokens || 0, isArabic)}</span>
              {user?.totalTokensPurchased && (
                <span className="text-xs text-gray-400">
                  /{formatNumber(user.totalTokensPurchased, isArabic)} {t('units.tokens', { ns: 'common' })}
                </span>
              )}
            </div>
          </div>
          
          
          <Link href="/payment-center">
            <Button 
              data-testid="button-payment-center"
              className="bg-athlete-accent hover:bg-blue-600 text-white"
            >
              <Plus className="mr-2" size={16} />
              {t('menu.buyTokens')}
            </Button>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mobile Token Display */}
          <div className="md:hidden">
            <Badge 
              variant="secondary" 
              className="bg-athlete-gray-800 text-athlete-warning flex flex-col py-2"
            >
              <div className="flex items-center">
                <Coins className="mr-1" size={14} />
                {formatNumber(user?.tokens || 0, isArabic)}
              </div>
              {user?.totalTokensPurchased && (
                <span className="text-xs text-gray-400">
                  /{formatNumber(user.totalTokensPurchased, isArabic)}
                </span>
              )}
            </Badge>
          </div>

          {/* History, Profile Menu, Logout, and Language Switcher */}
          <div className="flex items-center space-x-4">
            <HistoryDropdown />
            <div className={isArabic ? "mr-6" : "ml-6"}>
              <ProfileDropdown />
            </div>
            
            <Button 
              onClick={handleLogout}
              data-testid="button-logout"
              variant="ghost" 
              size="sm"
              className="text-gray-300 hover:text-white"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline ml-2">{t('menu.logout')}</span>
            </Button>
            
            {/* Language switcher as last element - rightmost in LTR, leftmost in RTL due to flex inversion */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
