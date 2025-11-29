import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, ArrowLeft, ArrowRight, User, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";

export function LoginPage() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: t('login.completeAllFields'),
        description: t('login.emailPasswordRequired'),
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t('login.invalidEmail'),
        description: t('login.enterValidEmail'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Attempting local login with:', { email: formData.email });

      const response = await apiRequest('POST', '/api/auth/login', {
        email: formData.email,
        password: formData.password
      });
      
      const result = await response.json();

      if (result.success || result.message === "Login successful") {
        toast({
          title: t('messages.welcome'),
          description: `${t('login.loginSuccessful')} ${result.user?.firstName || formData.email}`,
        });
        // Navigate to home page and refresh auth state
        setTimeout(() => {
          setLocation('/');
          // Small delay then reload to ensure clean authentication state
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }, 1000);
      } else {
        toast({
          title: t('messages.loginFailed'),
          description: result.message || t('login.invalidCredentials'),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: t('messages.loginFailed'),
        description: error.message || t('login.checkCredentials'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-white flex items-center justify-center p-3 sm:p-4" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className={`flex items-center justify-center gap-2 mb-3 sm:mb-4 ${isArabic ? 'flex-row-reverse' : ''}`}>
            <LogIn className={`h-6 w-6 sm:h-8 sm:w-8 text-primary ${isArabic ? 'scale-x-[-1]' : ''}`} />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('login.welcomeBack')}</h1>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg px-2">
            {t('login.signInToAccount')}
          </p>
          
          {/* Back to Home Button */}
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mt-3 sm:mt-4 text-muted-foreground hover:text-foreground h-11"
            data-testid="button-back-home"
          >
            {isArabic ? (
              <>
                <ArrowRight className="ml-2 h-4 w-4" />
                {t('login.backToHome')}
              </>
            ) : (
              <>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('login.backToHome')}
              </>
            )}
          </Button>
        </div>

        {/* Main Content */}
        <Card className="bg-card/80 border shadow-lg backdrop-blur-sm">
          <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className={`flex items-center justify-center gap-2 text-xl sm:text-2xl text-foreground ${isArabic ? 'flex-row-reverse' : ''}`}>
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {t('login.signIn')}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm sm:text-base px-2">
              {t('login.enterCredentials')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
              <div className="space-y-2 sm:space-y-4">
                <Label htmlFor="email" className={`text-sm font-medium text-foreground ${isArabic ? 'text-right block' : ''}`}>
                  {t('login.emailAddress')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('login.emailPlaceholder')}
                  className={`h-12 text-base bg-background border text-foreground ${isArabic ? 'text-right' : ''}`}
                  data-testid="input-login-email"
                  required
                />
              </div>
              
              <div className="space-y-2 sm:space-y-4">
                <Label htmlFor="password" className={`text-sm font-medium text-foreground ${isArabic ? 'text-right block' : ''}`}>
                  {t('login.password')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={t('login.passwordPlaceholder')}
                  className={`h-12 text-base bg-background border text-foreground ${isArabic ? 'text-right' : ''}`}
                  data-testid="input-login-password"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                disabled={isProcessing}
                className={`w-full bg-primary hover:bg-teal-600 text-white font-medium h-12 text-base ${isArabic ? 'flex-row-reverse' : ''}`}
                data-testid="button-login-submit"
              >
                {isProcessing ? (
                  <>
                    <div className={`animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ${isArabic ? 'ml-2' : 'mr-2'}`} />
                    {t('login.signingIn')}
                  </>
                ) : (
                  <>
                    <Lock className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                    {t('login.signIn')}
                  </>
                )}
              </Button>
            </form>
            
            {/* Security Notice */}
            <div className={`flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/30 mt-6 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
              <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-primary text-sm mb-1">{t('login.secureLogin')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('login.secureLoginDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            {t('login.noAccount')}{' '}
            <Button 
              variant="link" 
              onClick={() => setLocation('/signup')}
              className="text-primary hover:text-teal-600 p-0 h-auto"
              data-testid="link-signup"
            >
              {t('login.signUpHere')}
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
