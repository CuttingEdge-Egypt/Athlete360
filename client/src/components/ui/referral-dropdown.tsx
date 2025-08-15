import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Share2, Gift } from "lucide-react";

interface ReferralData {
  referralCode: string;
  referralCount: number;
  totalBonusTokens: number;
}

export function ReferralDropdown() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: referralData } = useQuery<ReferralData>({
    queryKey: ['/api/referrals'],
  });

  const copyReferralLink = async () => {
    if (!referralData?.referralCode) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Referral link copied!",
        description: "Share this link to earn 100 tokens per signup",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareReferralLink = async () => {
    if (!referralData?.referralCode) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    const shareText = `Join me on Athlete360 and get 1000 free tokens for AI-powered athlete analysis! Click this link to sign up: ${referralLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Athlete360 - Get 1000 Free Tokens!',
          text: shareText,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Share message copied!",
          description: "Paste this message to invite friends",
        });
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Please copy the text manually",
          variant: "destructive",
        });
      }
    }
  };

  if (!referralData) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white relative"
          data-testid="referral-dropdown-trigger"
        >
          <Users size={16} />
          {referralData.referralCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {referralData.referralCount}
            </span>
          )}
          <span className="hidden sm:inline ml-2">Refer</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-4">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
              <Gift className="h-5 w-5 text-green-500" />
              Referral Program
            </h3>
            <p className="text-sm text-muted-foreground">
              Earn 100 tokens for each friend who joins
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{referralData.referralCount}</p>
              <p className="text-xs text-muted-foreground">Referrals</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xl font-bold text-green-600">{referralData.totalBonusTokens}</p>
              <p className="text-xs text-muted-foreground">Tokens Earned</p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Referral Link</label>
            <div className="flex items-center gap-2">
              <Input
                value={`${window.location.origin}?ref=${referralData.referralCode}`}
                readOnly
                className="text-xs font-mono"
                data-testid="referral-link-input"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={copyReferralLink}
                data-testid="copy-referral-link"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone who signs up using this link gives you 100 tokens
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyReferralLink}
              className="flex-1"
              data-testid="copy-link-button"
            >
              <Copy className="h-3 w-3 mr-1" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              size="sm"
              onClick={shareReferralLink}
              className="flex-1"
              data-testid="share-link-button"
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}