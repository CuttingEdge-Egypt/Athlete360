import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { HistoryDropdown } from "@/components/ui/history-dropdown";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Trophy, Coins, Plus, LogOut, User as UserIcon, Video, Menu, X } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!authUser,
  });

  const handleLogout = async () => {
    try {
      await apiRequest('GET', '/api/logout', null);
      queryClient.clear();
      setLocation('/');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = "/api/logout";
    }
  };

  const handleVideoAnalysis = () => {
    sessionStorage.removeItem('videoAnalysisData');
    console.log('Header Video Analysis button clicked - clearing data and navigating');
    window.dispatchEvent(new CustomEvent('videoAnalysisDataUpdated'));
    setLocation('/video-analysis');
    setMobileMenuOpen(false);
  };

  const handleBuyTokens = () => {
    setLocation('/payment-center');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-athlete-primary/90 backdrop-blur-lg border-b border-gray-800">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className={`flex items-center cursor-pointer ${isArabic ? 'space-x-reverse space-x-2' : 'space-x-2'} flex-shrink-0`}>
            <Trophy className="text-athlete-accent text-xl sm:text-2xl" />
            <span className="text-lg sm:text-xl font-bold text-white">{t('brand')}</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className={`hidden lg:flex items-center ${isArabic ? 'space-x-reverse space-x-4 xl:space-x-6' : 'space-x-4 xl:space-x-6'}`}>
            <div 
              data-testid="token-balance"
              className={`flex items-center bg-athlete-gray-800 px-3 xl:px-4 py-2 rounded-full ${isArabic ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
            >
              <Coins className="text-athlete-warning" size={18} />
              <div className="flex flex-col items-center">
                <span className="font-semibold text-white text-sm">{formatNumber(user?.tokens || 0, isArabic)}</span>
                {user?.totalTokensPurchased && (
                  <span className="text-xs text-gray-400">
                    /{formatNumber(user.totalTokensPurchased, isArabic)} {t('units.tokens', { ns: 'common' })}
                  </span>
                )}
              </div>
            </div>
            
            <Button 
              data-testid="button-video-analysis"
              variant="ghost"
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white font-semibold hover:shadow-xl transition-all duration-300 whitespace-nowrap h-11"
              style={{
                backgroundSize: '200% 200%',
                animation: 'gradientShift 3s ease infinite'
              }}
              onClick={handleVideoAnalysis}
            >
              <Video className={isArabic ? 'ml-2' : 'mr-2'} size={16} />
              {t('menu.videoAnalysis')}
            </Button>
            
            <Link href="/payment-center">
              <Button 
                data-testid="button-payment-center"
                className="bg-athlete-accent hover:bg-blue-600 text-white whitespace-nowrap h-11"
              >
                <Plus className={isArabic ? 'ml-2' : 'mr-2'} size={16} />
                {t('menu.buyTokens')}
              </Button>
            </Link>
          </div>

          <div className={`flex items-center gap-2 sm:gap-3`}>
            {/* Mobile Token Display */}
            <div className="lg:hidden">
              <Badge 
                variant="secondary" 
                className="bg-athlete-gray-800 text-athlete-warning flex flex-col py-1.5 px-2"
              >
                <div className="flex items-center">
                  <Coins className={isArabic ? 'ml-1' : 'mr-1'} size={12} />
                  <span className="text-xs">{formatNumber(user?.tokens || 0, isArabic)}</span>
                </div>
                {user?.totalTokensPurchased && (
                  <span className="text-[10px] text-gray-400">
                    /{formatNumber(user.totalTokensPurchased, isArabic)}
                  </span>
                )}
              </Badge>
            </div>

            {/* Desktop Actions */}
            <div className={`hidden md:flex items-center ${isArabic ? 'space-x-reverse space-x-2 lg:space-x-3' : 'space-x-2 lg:space-x-3'}`}>
              <HistoryDropdown />
              <ProfileDropdown />
              
              <Button 
                onClick={handleLogout}
                data-testid="button-logout"
                variant="ghost" 
                size="sm"
                className="text-gray-300 hover:text-white"
              >
                <LogOut size={16} />
                <span className={`hidden lg:inline ${isArabic ? 'mr-2' : 'ml-2'}`}>{t('menu.logout')}</span>
              </Button>
              
              <LanguageSwitcher />
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button 
                  variant="ghost" 
                  className="text-white h-11 w-11 p-0"
                  data-testid="button-mobile-menu"
                >
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side={isArabic ? "left" : "right"} 
                className="bg-athlete-primary border-gray-800 w-[280px] sm:w-[320px]"
              >
                <SheetHeader>
                  <SheetTitle className="text-white text-left">{t('menu.menu', { defaultValue: 'Menu' })}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <Button 
                    data-testid="mobile-button-video-analysis"
                    variant="ghost"
                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white font-semibold justify-start h-12"
                    style={{
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 3s ease infinite'
                    }}
                    onClick={handleVideoAnalysis}
                  >
                    <Video className={isArabic ? 'ml-2' : 'mr-2'} size={20} />
                    {t('menu.videoAnalysis')}
                  </Button>
                  
                  <Button 
                    data-testid="mobile-button-payment-center"
                    className="bg-athlete-accent hover:bg-blue-600 text-white justify-start h-12"
                    onClick={handleBuyTokens}
                  >
                    <Plus className={isArabic ? 'ml-2' : 'mr-2'} size={20} />
                    {t('menu.buyTokens')}
                  </Button>

                  <div className="border-t border-gray-700 my-2"></div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{t('menu.history', { defaultValue: 'History' })}</span>
                      <HistoryDropdown />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{t('menu.profile', { defaultValue: 'Profile' })}</span>
                      <ProfileDropdown />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{t('menu.language', { defaultValue: 'Language' })}</span>
                      <LanguageSwitcher />
                    </div>
                  </div>

                  <div className="border-t border-gray-700 my-2"></div>

                  <Button 
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    data-testid="mobile-button-logout"
                    variant="ghost" 
                    className="text-gray-300 hover:text-white justify-start h-12"
                  >
                    <LogOut className={isArabic ? 'ml-2' : 'mr-2'} size={20} />
                    {t('menu.logout')}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
