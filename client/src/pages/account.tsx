import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { AnalysisPopup } from "@/components/ui/analysis-popup";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import {
  User,
  Edit3,
  Save,
  X,
  Coins,
  History,
  TrendingUp,
  Target,
  Zap,
  Utensils,
  Video,
  GitCompare,
  ArrowLeft
} from "lucide-react";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  currentTokens: number;
  totalTokensPurchased: number;
  memberSince: string;
}

const serviceIcons: { [key: string]: any } = {
  bio: User,
  rank: TrendingUp,
  strengths: Target,
  weaknesses: Target,
  development: Zap,
  'nutrition-plan': Utensils,
  nutrition: Utensils,
  beat: Zap,
  video: Video,
  comparison: GitCompare,
};

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useTranslation('account');
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [athleteForPopup, setAthleteForPopup] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

  // Service labels from translations
  const getServiceLabel = (serviceType: string) => {
    const serviceMap: { [key: string]: string } = {
      bio: t('services.bio'),
      rank: t('services.rank'),
      strengths: t('services.strengths'),
      weaknesses: t('services.weaknesses'),
      development: t('services.development'),
      'nutrition-plan': t('services.nutrition-plan'),
      nutrition: t('services.nutrition'),
      beat: t('services.beat'),
      video: t('services.video'),
      comparison: t('services.comparison'),
    };
    return serviceMap[serviceType] || serviceType;
  };

  // Fetch user profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"]
  });

  // Update profile data when user data changes
  React.useEffect(() => {
    if (profile && Object.keys(profile).length > 0) {
      setProfileData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || ""
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string }) => {
      return await apiRequest("PUT", "/api/user/profile", data);
    },
    onSuccess: () => {
      toast({
        title: t('toasts.profileUpdated.title'),
        description: t('toasts.profileUpdated.description'),
      });
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error) => {
      toast({
        title: t('toasts.updateFailed.title'),
        description: error.message || t('toasts.updateFailed.description'),
        variant: "destructive",
      });
    }
  });

  // Fetch user history (filter out cancelled and refund entries)
  const { data: rawHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/user-history"]
  });
  
  // Filter out cancelled generations and refund entries from display
  const history = rawHistory.filter((item: any) => {
    // Exclude refund entries (serviceType ends with -refund)
    if (item.serviceType?.includes('-refund')) return false;
    // Exclude cancelled entries (action contains "CANCELLED" or "REFUND")
    if (item.action?.includes('CANCELLED') || item.action?.includes('REFUND')) return false;
    // Exclude items with negative tokens (refunds)
    if (item.tokensDeducted < 0) return false;
    return true;
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleHistoryItemClick = async (item: any) => {
    setSelectedHistoryItem(item);
    
    if (item.serviceType === 'comparison') {
      // Store comparison data in sessionStorage to avoid URL length limits
      sessionStorage.setItem('comparisonData', JSON.stringify(item.resultData));
      const url = "/?tab=comparison&data=fromStorage";
      
      // Use both wouter navigation and manual URL update
      setLocation(url);
      
      // Also update the URL directly and trigger event
      setTimeout(() => {
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 100);
    } else if (item.serviceType === 'video') {
      // Navigate to video analysis page with data in sessionStorage
      sessionStorage.setItem('videoAnalysisData', JSON.stringify(item.resultData));
      
      // Dispatch custom event to trigger reload even if already on the page
      window.dispatchEvent(new CustomEvent('videoAnalysisDataUpdated'));
      
      setLocation('/video-analysis');
    } else if (item.serviceType === 'development-plan') {
      // Store development plan data in sessionStorage to avoid URL length limits
      sessionStorage.setItem('developmentPlanData', JSON.stringify(item.resultData));
      const url = "/?tab=development&data=fromStorage";
      
      // Use both wouter navigation and manual URL update
      setLocation(url);
      
      // Also update the URL directly and trigger event
      setTimeout(() => {
        window.history.pushState({}, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, 100);
    } else {
      // For bio, rank, strengths, weaknesses - fetch athlete data to include rankings
      if (item.athleteId) {
        try {
          const response = await fetch(`/api/athletes/${item.athleteId}`);
          if (response.ok) {
            const athleteData = await response.json();
            setAthleteForPopup(athleteData);
          }
        } catch (error) {
          console.error('Failed to fetch athlete data for history popup:', error);
        }
      }
      setShowAnalysisPopup(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isArabic ? 'rtl' : 'ltr'}>
        <div className={`text-foreground ${isArabic ? 'text-xl' : 'text-base'}`}>{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="container mx-auto p-3 sm:p-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div>
            <h1 className={`${isArabic ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'} font-bold text-foreground`}>{t('header.title')}</h1>
            <p className={`text-muted-foreground mt-1 ${isArabic ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>{t('header.subtitle')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            className={`h-11 w-full sm:w-auto border-gray-300 text-gray-700 bg-gray-50 hover:bg-accent hover:text-accent-foreground ${isArabic ? 'flex-row-reverse' : ''}`}
            data-testid="button-back-home"
          >
            <ArrowLeft className={`${isArabic ? 'ml-2 rotate-180' : 'mr-2'} h-4 w-4`} />
            {t('header.backToHome')}
          </Button>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Profile Information */}
          <Card className="bg-card border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className={`${isArabic ? 'text-2xl flex-row-reverse' : 'text-xl'} text-foreground flex items-center gap-2`}>
                  <User className="h-5 w-5 text-primary" />
                  {t('profile.title')}
                </CardTitle>
                <CardDescription className={`text-muted-foreground ${isArabic ? 'text-base' : 'text-sm'}`}>
                  {t('profile.subtitle')}
                </CardDescription>
              </div>
              <Button
                variant={editingProfile ? "destructive" : "outline"}
                onClick={() => {
                  if (editingProfile) {
                    setEditingProfile(false);
                    // Reset to original profile data
                    if (profile) {
                      setProfileData({
                        firstName: profile.firstName || "",
                        lastName: profile.lastName || "",
                        email: profile.email || ""
                      });
                    }
                  } else {
                    setEditingProfile(true);
                  }
                }}
                className={`h-11 ${isArabic ? 'flex-row-reverse' : ''}`}
                data-testid={editingProfile ? "button-cancel-edit" : "button-edit-profile"}
              >
                {editingProfile ? <X className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} /> : <Edit3 className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />}
                {editingProfile ? t('profile.cancelButton') : t('profile.editButton')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Token Balance */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg border border-primary/20">
                <div className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                  <Coins className="h-6 w-6 text-primary" />
                  <div>
                    <p className={`font-medium text-primary ${isArabic ? 'text-lg' : 'text-base'}`}>{t('tokens.title')}</p>
                    <p className={`${isArabic ? 'text-base' : 'text-sm'} text-muted-foreground`}>{t('tokens.current')}</p>
                  </div>
                </div>
                <div className={`${isArabic ? 'text-left' : 'text-right'}`}>
                  <div className="text-2xl font-bold text-primary">
                    {profile?.currentTokens ?? 0}
                  </div>
                  <div className={`${isArabic ? 'text-base' : 'text-sm'} text-muted-foreground`}>
                    {t('tokens.totalPurchased')}: {profile?.totalTokensPurchased ?? 0}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Profile Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className={isArabic ? 'text-base' : 'text-sm'}>{t('profile.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!editingProfile}
                      className={`h-11 ${isArabic ? 'text-lg' : 'text-base'}`}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className={isArabic ? 'text-base' : 'text-sm'}>{t('profile.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!editingProfile}
                      className={`h-11 ${isArabic ? 'text-lg' : 'text-base'}`}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={isArabic ? 'text-base' : 'text-sm'}>{t('profile.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!editingProfile}
                    className={`h-11 ${isArabic ? 'text-lg' : 'text-base'}`}
                    data-testid="input-email"
                  />
                </div>

                {editingProfile && (
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className={`bg-primary hover:bg-blue-700 h-11 ${isArabic ? 'flex-row-reverse' : ''}`}
                    data-testid="button-save-profile"
                  >
                    <Save className={`h-4 w-4 ${isArabic ? 'ml-2' : 'mr-2'}`} />
                    {updateProfileMutation.isPending ? t('profile.saveButton') : t('profile.saveButton')}
                  </Button>
                )}
              </div>

              <Separator />

              {/* Account Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className={`text-muted-foreground ${isArabic ? 'text-base' : 'text-sm'}`}>{t('profile.memberSince')}</Label>
                  <div className={`text-foreground font-medium ${isArabic ? 'text-lg' : 'text-base'}`}>
                    {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis History */}
          <Card className="bg-card border shadow-sm">
            <CardHeader>
              <CardTitle className={`${isArabic ? 'text-2xl flex-row-reverse' : 'text-xl'} text-foreground flex items-center gap-2`}>
                <History className="h-5 w-5 text-primary" />
                {t('history.title')}
              </CardTitle>
              <CardDescription className={`text-muted-foreground ${isArabic ? 'text-base' : 'text-sm'}`}>
                {t('history.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history && history.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.slice(0, 50).map((item: any) => {
                    const ServiceIcon = serviceIcons[item.serviceType] || User;
                    const serviceLabel = getServiceLabel(item.serviceType);
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleHistoryItemClick(item)}
                        className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg border hover:border-primary/50 hover:bg-muted transition-all cursor-pointer text-left min-h-[56px]"
                        data-testid={`button-history-item-${item.id}`}
                      >
                        <div className={`flex items-center gap-3 flex-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ServiceIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className={`flex-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                            <div className={`font-medium text-foreground ${isArabic ? 'text-lg' : 'text-base'}`}>
                              {serviceLabel}
                            </div>
                            <div className={`${isArabic ? 'text-base' : 'text-sm'} text-muted-foreground`}>
                              {item.athleteName && `${item.athleteName} • `}
                              {item.athleteSport && `${item.athleteSport} • `}
                              {new Date(item.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          -{item.tokensDeducted} {t('tokens.tokens')}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`text-center py-8 text-muted-foreground ${isArabic ? 'text-lg' : 'text-base'}`}>
                  <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>{t('history.emptyState')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analysis Popup for viewing history items */}
      {selectedHistoryItem && (
        <AnalysisPopup
          open={showAnalysisPopup}
          onOpenChange={setShowAnalysisPopup}
          type={selectedHistoryItem.serviceType}
          data={selectedHistoryItem.resultData}
          athleteName={selectedHistoryItem.athleteName}
          athleteId={selectedHistoryItem.athleteId}
          athlete={athleteForPopup}
          createdAt={selectedHistoryItem.createdAt}
        />
      )}
    </div>
  );
}
