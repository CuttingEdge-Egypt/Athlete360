import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon, Settings, Gift, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface ProfileDropdownProps {
  customTrigger?: React.ReactNode;
}

export function ProfileDropdown({ customTrigger }: ProfileDropdownProps = {}) {
  const { user: authUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('common');
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!authUser,
  });

  const { data: referralData } = useQuery({
    queryKey: ["/api/referrals"],
    enabled: !!authUser,
  });

  const copyReferralLink = async () => {
    if (!user?.referralCode) return;
    
    const referralLink = `${window.location.origin}/signup?ref=${user.referralCode}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Referral link copied!",
        description: "Share this link to earn 100 tokens per referral",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy link",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const shareReferralLink = () => {
    if (!user?.referralCode) return;
    
    const referralLink = `${window.location.origin}/signup?ref=${user.referralCode}`;
    const text = `Join Athlete360 and get AI-powered athlete insights! Use my referral link: ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Athlete360',
        text,
        url: referralLink,
      });
    } else {
      // Fallback to copying
      copyReferralLink();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {customTrigger || (
          <Button 
            variant="ghost" 
            className="relative h-8 w-8 rounded-full p-0 hover:ring-2 hover:ring-blue-400 transition-all"
            data-testid="profile-dropdown-trigger"
          >
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 mr-4" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <Link href="/account">
          <DropdownMenuItem className="cursor-pointer" data-testid="dropdown-account">
            <Settings className="mr-2 h-4 w-4" />
            <span>Account Details</span>
          </DropdownMenuItem>
        </Link>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Your Referral Link
        </DropdownMenuLabel>
        
        <div className="px-2 py-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Referrals Made:</span>
              <span className="font-medium">{(referralData as any)?.referralCount || 0}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tokens Earned:</span>
              <span className="font-medium text-green-600">
                {(parseInt((referralData as any)?.referralCount || '0') * 100).toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Referral Code Display */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Your Referral Code:</Label>
                {user?.referralCode ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={user.referralCode}
                      readOnly
                      className="text-xs h-7 font-mono bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-foreground"
                      data-testid="input-referral-code"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(user.referralCode || '');
                        toast({ title: t('toast.referralCodeCopied', 'Referral code copied!') });
                      }}
                      className="px-2 h-7"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                )}
              </div>

              {/* Referral Link Display */}
              <div className="space-y-1">
                <Label htmlFor="referral-link" className="text-xs font-medium">Your Referral Link:</Label>
                {user?.referralCode ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      id="referral-link"
                      value={`${window.location.origin}/signup?ref=${user.referralCode}`}
                      readOnly
                      className="text-xs h-7"
                      data-testid="input-referral-link"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyReferralLink}
                      className="px-2 h-7"
                      data-testid="button-copy-referral"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ) : (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <div className="flex items-center text-xs text-amber-700 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3 mr-2" />
                      Referral link being generated. Please refresh the page.
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Share this link to earn 100 tokens per signup
                </p>
              </div>
            </div>
            
            <Button
              size="sm"
              onClick={shareReferralLink}
              className="w-full bg-primary hover:bg-teal-600 text-white text-xs h-8"
              data-testid="button-share-referral"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Share Referral Link
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}