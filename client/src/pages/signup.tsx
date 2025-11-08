import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Gift, Zap, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

export function SignupPage() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  
  const { toast } = useToast();
  const { t } = useTranslation('signup');
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  // Check for referral code in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setPersonalInfo(prev => ({ ...prev, referralCode: refCode }));
      // Show a friendly message about the referral
      toast({
        title: t('toasts.referralApplied.title'),
        description: t('toasts.referralApplied.description'),
      });
    }
  }, [t, toast]);

  const handleSignup = async () => {
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.email || !personalInfo.password || !personalInfo.confirmPassword) {
      toast({
        title: t('toasts.completeInfo.title'),
        description: t('toasts.completeInfo.description'),
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalInfo.email)) {
      toast({
        title: t('toasts.invalidEmail.title'),
        description: t('toasts.invalidEmail.description'),
        variant: "destructive",
      });
      return;
    }

    // Password validation
    if (personalInfo.password.length < 8) {
      toast({
        title: t('toasts.passwordTooShort.title'),
        description: t('toasts.passwordTooShort.description'),
        variant: "destructive",
      });
      return;
    }

    if (!/[A-Z]/.test(personalInfo.password)) {
      toast({
        title: t('toasts.passwordNoUppercase.title'),
        description: t('toasts.passwordNoUppercase.description'),
        variant: "destructive",
      });
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(personalInfo.password)) {
      toast({
        title: t('toasts.passwordNoSpecial.title'),
        description: t('toasts.passwordNoSpecial.description'),
        variant: "destructive",
      });
      return;
    }

    if (personalInfo.password !== personalInfo.confirmPassword) {
      toast({
        title: t('toasts.passwordMismatch.title'),
        description: t('toasts.passwordMismatch.description'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create signup payload without card information
      const signupPayload = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        password: personalInfo.password,
        confirmPassword: personalInfo.confirmPassword,
        referralCode: personalInfo.referralCode || ''
      };

      console.log('Attempting local signup with:', signupPayload);

      // Use local authentication signup endpoint
      const response = await apiRequest('POST', '/api/auth/signup', signupPayload);
      const result = await response.json();

      if (result.success) {
        toast({
          title: t('toasts.accountCreated.title'),
          description: t('toasts.accountCreated.description', { name: result.user.firstName }),
        });
        // Force page reload to update authentication state and redirect to dashboard
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        toast({
          title: t('toasts.signupFailed.title'),
          description: result.message || t('toasts.signupFailed.description'),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: t('toasts.signupError.title'),
        description: error.message || t('toasts.signupError.description'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-3 sm:p-4" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className={`flex items-center justify-center gap-2 mb-3 sm:mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            <h1 className={`${isArabic ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} font-bold text-white`}>{t('header.title')}</h1>
          </div>
          <p className={`text-gray-300 ${isArabic ? 'text-base sm:text-xl' : 'text-base sm:text-lg'} px-2`}>
            {t('header.subtitle')}
          </p>
          
          {/* Back to Home Button */}
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className={`mt-3 sm:mt-4 text-gray-400 hover:text-white h-11 ${isArabic ? 'flex-row-reverse' : ''}`}
            data-testid="button-back-home"
          >
            <ArrowLeft className={`${isArabic ? 'ml-2 rotate-180' : 'mr-2'} h-4 w-4`} />
            {t('header.backToHome')}
          </Button>
        </div>

        {/* Main Content */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className={`${isArabic ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} font-bold text-white flex items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              {t('card.title')}
            </CardTitle>
            <CardDescription className={`text-gray-300 text-center ${isArabic ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} px-2`}>
              {t('card.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className={`${isArabic ? 'text-base' : 'text-sm'} font-medium text-gray-200`}>{t('form.firstName')}</Label>
                <Input
                  id="firstName"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder={t('form.firstNamePlaceholder')}
                  className={`h-12 ${isArabic ? 'text-lg' : 'text-base'} bg-gray-700 border-gray-600 text-white`}
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className={`${isArabic ? 'text-base' : 'text-sm'} font-medium text-gray-200`}>{t('form.lastName')}</Label>
                <Input
                  id="lastName"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder={t('form.lastNamePlaceholder')}
                  className={`h-12 ${isArabic ? 'text-lg' : 'text-base'} bg-gray-700 border-gray-600 text-white`}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className={`${isArabic ? 'text-base' : 'text-sm'} font-medium text-gray-200`}>{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('form.emailPlaceholder')}
                className={`h-12 ${isArabic ? 'text-lg' : 'text-base'} bg-gray-700 border-gray-600 text-white`}
                data-testid="input-email"
              />
            </div>
            
            {/* Referral Code Field */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className={`${isArabic ? 'text-base flex-row-reverse' : 'text-sm'} font-medium text-gray-200 flex items-center gap-2`}>
                <Gift className="h-4 w-4 text-green-500" />
                {t('form.referralCode')}
              </Label>
              <Input
                id="referralCode"
                value={personalInfo.referralCode}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
                placeholder={t('form.referralCodePlaceholder')}
                className={`h-12 ${isArabic ? 'text-lg' : 'text-base'} bg-gray-700 border-gray-600 text-white`}
                data-testid="input-referral-code"
              />
              {personalInfo.referralCode && (
                <p className={`text-xs text-green-400 flex items-center gap-1 ${isArabic ? 'flex-row-reverse text-sm' : ''}`}>
                  <Gift className="h-3 w-3" />
                  {t('form.referralBonus')}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label htmlFor="password" className={`${isArabic ? 'text-base' : 'text-sm'} font-medium text-gray-200`}>{t('form.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={personalInfo.password}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={t('form.passwordPlaceholder')}
                  className={`h-12 ${isArabic ? 'text-lg' : 'text-base'} bg-gray-700 border-gray-600 text-white`}
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={`${isArabic ? 'text-base' : 'text-sm'} font-medium text-gray-200`}>{t('form.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={personalInfo.confirmPassword}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder={t('form.confirmPasswordPlaceholder')}
                  className={`h-12 ${isArabic ? 'text-lg' : 'text-base'} bg-gray-700 border-gray-600 text-white`}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSignup}
              disabled={isProcessing}
              className={`w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-medium h-12 ${isArabic ? 'text-lg flex-row-reverse' : 'text-base'}`}
              data-testid="button-create-account"
            >
              {isProcessing ? t('form.creating') : t('form.createButton')}
              <Gift className={`${isArabic ? 'mr-2' : 'ml-2'} h-5 w-5`} />
            </Button>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className={`text-gray-400 ${isArabic ? 'text-lg' : 'text-base'}`}>
            {t('footer.haveAccount')}{' '}
            <Button 
              variant="link" 
              onClick={() => setLocation('/login')}
              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
              data-testid="link-login"
            >
              {t('footer.signIn')}
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
