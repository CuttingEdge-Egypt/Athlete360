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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`flex items-center justify-center gap-3 mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className={`${isArabic ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'} font-bold text-slate-800`}>{t('header.title')}</h1>
          </div>
          <p className={`text-slate-500 ${isArabic ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
            {t('header.subtitle')}
          </p>
          
          {/* Back to Home Button */}
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className={`mt-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 ${isArabic ? 'flex-row-reverse' : ''}`}
            data-testid="button-back-home"
          >
            <ArrowLeft className={`${isArabic ? 'ml-2 rotate-180' : 'mr-2'} h-4 w-4`} />
            {t('header.backToHome')}
          </Button>
        </div>

        {/* Main Content */}
        <Card className="bg-white border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="px-6 sm:px-8 pt-8 pb-2">
            <CardTitle className={`${isArabic ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'} font-semibold text-slate-800 flex items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <User className="h-5 w-5 text-teal-500" />
              {t('card.title')}
            </CardTitle>
            <CardDescription className={`text-slate-400 text-center ${isArabic ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} mt-1`}>
              {t('card.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 sm:px-8 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className={`${isArabic ? 'text-sm' : 'text-xs'} font-medium text-slate-600 uppercase tracking-wide`}>{t('form.firstName')}</Label>
                <Input
                  id="firstName"
                  value={personalInfo.firstName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder={t('form.firstNamePlaceholder')}
                  className={`h-11 ${isArabic ? 'text-base' : 'text-sm'} bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-400 focus:ring-teal-400/20 transition-all rounded-lg`}
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className={`${isArabic ? 'text-sm' : 'text-xs'} font-medium text-slate-600 uppercase tracking-wide`}>{t('form.lastName')}</Label>
                <Input
                  id="lastName"
                  value={personalInfo.lastName}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder={t('form.lastNamePlaceholder')}
                  className={`h-11 ${isArabic ? 'text-base' : 'text-sm'} bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-400 focus:ring-teal-400/20 transition-all rounded-lg`}
                  data-testid="input-last-name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className={`${isArabic ? 'text-sm' : 'text-xs'} font-medium text-slate-600 uppercase tracking-wide`}>{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('form.emailPlaceholder')}
                className={`h-11 ${isArabic ? 'text-base' : 'text-sm'} bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-400 focus:ring-teal-400/20 transition-all rounded-lg`}
                data-testid="input-email"
              />
            </div>
            
            {/* Referral Code Field */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className={`${isArabic ? 'text-sm flex-row-reverse' : 'text-xs'} font-medium text-slate-600 uppercase tracking-wide flex items-center gap-2`}>
                <Gift className="h-3.5 w-3.5 text-emerald-500" />
                {t('form.referralCode')}
              </Label>
              <Input
                id="referralCode"
                value={personalInfo.referralCode}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
                placeholder={t('form.referralCodePlaceholder')}
                className={`h-11 ${isArabic ? 'text-base' : 'text-sm'} bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-400 focus:ring-emerald-400/20 transition-all rounded-lg`}
                data-testid="input-referral-code"
              />
              {personalInfo.referralCode && (
                <p className={`text-xs text-emerald-600 flex items-center gap-1.5 mt-1.5 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Gift className="h-3 w-3" />
                  {t('form.referralBonus')}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className={`${isArabic ? 'text-sm' : 'text-xs'} font-medium text-slate-600 uppercase tracking-wide`}>{t('form.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={personalInfo.password}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={t('form.passwordPlaceholder')}
                  className={`h-11 ${isArabic ? 'text-base' : 'text-sm'} bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-400 focus:ring-teal-400/20 transition-all rounded-lg`}
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className={`${isArabic ? 'text-sm' : 'text-xs'} font-medium text-slate-600 uppercase tracking-wide`}>{t('form.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={personalInfo.confirmPassword}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder={t('form.confirmPasswordPlaceholder')}
                  className={`h-11 ${isArabic ? 'text-base' : 'text-sm'} bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-400 focus:ring-teal-400/20 transition-all rounded-lg`}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSignup}
              disabled={isProcessing}
              className={`w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-medium h-12 rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all ${isArabic ? 'text-base flex-row-reverse' : 'text-sm'}`}
              data-testid="button-create-account"
            >
              {isProcessing ? t('form.creating') : t('form.createButton')}
              <Gift className={`${isArabic ? 'mr-2' : 'ml-2'} h-4 w-4`} />
            </Button>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className={`text-slate-500 ${isArabic ? 'text-base' : 'text-sm'}`}>
            {t('footer.haveAccount')}{' '}
            <Button 
              variant="link" 
              onClick={() => setLocation('/login')}
              className="text-teal-600 hover:text-teal-700 p-0 h-auto font-medium"
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
