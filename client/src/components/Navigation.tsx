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
import { useLanguage } from "@/hooks/useLanguage";
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
        <Link href="/" className={`flex items-center cursor-pointer ${isArabic ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
          <Trophy className="text-athlete-accent text-2xl" />
          <span className="text-xl font-bold text-white">{t('brand')}</span>
        </Link>
        
        <div className={`hidden md:flex items-center ${isArabic ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
          {/* Token Balance Display */}
          <div 
            data-testid="token-balance"
            className={`flex items-center bg-athlete-gray-800 px-4 py-2 rounded-full ${isArabic ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
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
          
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-lg opacity-75 group-hover:opacity-100 blur-sm" 
                 style={{
                   backgroundSize: '200% 200%',
                   animation: 'gradientShift 3s ease infinite'
                 }}
            ></div>
            <Button 
              data-testid="button-video-analysis"
              variant="ghost"
              className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white font-semibold hover:shadow-xl transition-all duration-300"
              style={{
                backgroundSize: '200% 200%',
                animation: 'gradientShift 3s ease infinite'
              }}
              onClick={() => {
                // Clear any URL parameters and sessionStorage to ensure fresh start
                sessionStorage.removeItem('videoAnalysisData');
                console.log('Header Video Analysis button clicked - clearing data and navigating');
                
                // Dispatch event to trigger reload even if already on the page
                window.dispatchEvent(new CustomEvent('videoAnalysisDataUpdated'));
                
                setLocation('/video-analysis');
              }}
            >
              <Video className={isArabic ? 'ml-2' : 'mr-2'} size={16} />
              {t('menu.videoAnalysis')}
            </Button>
          </div>
          
          <Link href="/payment-center">
            <Button 
              data-testid="button-payment-center"
              className="bg-athlete-accent hover:bg-blue-600 text-white"
            >
              <Plus className={isArabic ? 'ml-2' : 'mr-2'} size={16} />
              {t('menu.buyTokens')}
            </Button>
          </Link>
        </div>

        <div className={`flex items-center ${isArabic ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
          {/* Mobile Token Display */}
          <div className="md:hidden">
            <Badge 
              variant="secondary" 
              className="bg-athlete-gray-800 text-athlete-warning flex flex-col py-2"
            >
              <div className="flex items-center">
                <Coins className={isArabic ? 'ml-1' : 'mr-1'} size={14} />
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
          <div className={`flex items-center ${isArabic ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
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
              <span className={`hidden sm:inline ${isArabic ? 'mr-2' : 'ml-2'}`}>{t('menu.logout')}</span>
            </Button>
            
            {/* Language switcher as last element - rightmost in LTR, leftmost in RTL due to flex inversion */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
