import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { HistoryDropdown } from "@/components/ui/history-dropdown";
import { ProfileDropdown } from "@/components/ui/profile-dropdown";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Clock, Coins, Plus, LogOut, User as UserIcon, Video, Menu, Globe } from "lucide-react";
import { Link } from "wouter";
import logoImage from "@assets/Athlete360Logo-removebg-preview_1764434600616.png";
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
    <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className={`flex items-center cursor-pointer ${isArabic ? 'space-x-reverse space-x-2' : 'space-x-2'} flex-shrink-0`}>
            <img src={logoImage} alt="Athlete360" className="h-8 sm:h-10 w-auto" />
          </Link>
          
          {/* Desktop Menu */}
          <div className={`hidden lg:flex items-center ${isArabic ? 'space-x-reverse space-x-4 xl:space-x-6' : 'space-x-4 xl:space-x-6'}`}>
            <div 
              data-testid="token-balance"
              className={`flex items-center bg-muted px-3 xl:px-4 py-2 rounded-full ${isArabic ? 'space-x-reverse space-x-2' : 'space-x-2'}`}
            >
              <Coins className="text-amber-500" size={18} />
              <div className="flex flex-col items-center">
                <span className="font-semibold text-foreground text-sm">{formatNumber(user?.tokens || 0, isArabic)}</span>
                {user?.totalTokensPurchased && (
                  <span className="text-xs text-muted-foreground">
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
                className="bg-primary hover:bg-teal-600 text-white whitespace-nowrap h-11"
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
                className="bg-muted text-amber-500 flex items-center gap-2 py-2 px-3 sm:px-4"
              >
                <Coins size={18} />
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-bold">{formatNumber(user?.tokens || 0, isArabic)}</span>
                  {user?.totalTokensPurchased && (
                    <span className="text-xs text-muted-foreground">
                      /{formatNumber(user.totalTokensPurchased, isArabic)}
                    </span>
                  )}
                </div>
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
                className="text-muted-foreground hover:text-foreground"
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
                  className="text-foreground h-11 w-11 p-0"
                  data-testid="button-mobile-menu"
                >
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side={isArabic ? "left" : "right"} 
                className="bg-background border-border w-[300px] sm:w-[340px]"
              >
                <SheetHeader className="border-b pb-4">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-foreground text-lg font-bold">{t('menu.menu', { defaultValue: 'Menu' })}</SheetTitle>
                    {/* Token Balance Display */}
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2.5 mr-10">
                      <Coins className="text-amber-500" size={18} />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground" dir="ltr">{formatNumber(user?.tokens || 0, isArabic)}</span>
                        {user?.totalTokensPurchased && (
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            /{formatNumber(user.totalTokensPurchased, isArabic)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetHeader>
                
                <div className="flex flex-col gap-3 mt-5">
                  {/* Primary Actions */}
                  <div className="space-y-2">
                    <Button 
                      data-testid="mobile-button-video-analysis"
                      className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white font-semibold justify-start h-11 shadow-lg"
                      onClick={handleVideoAnalysis}
                    >
                      <Video className={isArabic ? 'ml-2' : 'mr-2'} size={18} />
                      {t('menu.videoAnalysis')}
                    </Button>
                    
                    <Button 
                      data-testid="mobile-button-payment-center"
                      className="w-full bg-primary hover:bg-teal-600 text-white font-semibold justify-start h-11 shadow-lg"
                      onClick={handleBuyTokens}
                    >
                      <Plus className={isArabic ? 'ml-2' : 'mr-2'} size={18} />
                      {t('menu.buyTokens')}
                    </Button>
                  </div>

                  {/* Menu Items */}
                  <div className="mt-4 space-y-1">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('menu.account', { defaultValue: 'Account' })}
                    </div>
                    
                    <div className="bg-muted rounded-lg p-1 space-y-0.5">
                      <HistoryDropdown 
                        customTrigger={(count) => (
                          <button className="w-full flex items-center justify-between px-3 py-2.5 text-foreground hover:bg-accent rounded transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                                <Clock size={16} className="text-primary" />
                              </div>
                              <span className="text-sm font-medium">{t('menu.history', { defaultValue: 'History' })}</span>
                            </div>
                            {count > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="bg-primary/20 text-primary border-primary/30 h-5 px-2 text-xs font-semibold"
                              >
                                {count > 99 ? formatNumber('99+', isArabic) : formatNumber(count, isArabic)}
                              </Badge>
                            )}
                          </button>
                        )}
                      />
                      
                      <ProfileDropdown
                        customTrigger={
                          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-foreground hover:bg-accent rounded transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                              <UserIcon size={16} className="text-green-500" />
                            </div>
                            <span className="text-sm font-medium">{t('menu.profile', { defaultValue: 'Profile' })}</span>
                          </button>
                        }
                      />
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="mt-3 space-y-1">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('menu.settings', { defaultValue: 'Settings' })}
                    </div>
                    
                    <div className="bg-muted rounded-lg p-1">
                      <LanguageSwitcher
                        customTrigger={
                          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-foreground hover:bg-accent rounded transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                              <Globe size={16} className="text-purple-500" />
                            </div>
                            <span className="text-sm font-medium">{t('menu.language', { defaultValue: 'Language' })}</span>
                          </button>
                        }
                      />
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="mt-6">
                    <Button 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      data-testid="mobile-button-logout"
                      variant="ghost" 
                      className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 justify-start h-11 font-medium"
                    >
                      <LogOut className={isArabic ? 'ml-2' : 'mr-2'} size={18} />
                      {t('menu.logout')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
