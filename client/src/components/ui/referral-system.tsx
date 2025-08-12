import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Gift, Calendar, ExternalLink, Share2, Coins } from "lucide-react";

interface Referral {
  id: string;
  referredUserId: string;
  bonusTokens: number;
  status: string;
  createdAt: string;
}

interface ReferralData {
  referrals: Referral[];
  referralCount: number;
  referralCode: string;
  totalBonusTokens: number;
}

export function ReferralSystem() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: referralData, isLoading } = useQuery<ReferralData>({
    queryKey: ['/api/referrals'],
  });

  const copyReferralCode = async () => {
    if (!referralData?.referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      toast({
        title: "Referral code copied!",
        description: "Share it with friends to earn bonus tokens",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  const copyReferralLink = async () => {
    if (!referralData?.referralCode) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Referral link copied!",
        description: "Share this link to invite friends",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareReferralCode = async () => {
    if (!referralData?.referralCode) return;
    
    const referralLink = `${window.location.origin}?ref=${referralData.referralCode}`;
    const shareText = `Join me on Athlete360 and get 1000 free tokens for AI-powered athlete analysis! Use my referral code: ${referralData.referralCode} or click this link: ${referralLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Athlete360',
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
          title: "Share text copied!",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>Loading your referral data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!referralData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>Unable to load referral data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Referral Program
          </CardTitle>
          <CardDescription>
            Earn 100 tokens for each friend who joins with your code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {referralData.referralCount}
              </p>
              <p className="text-sm text-muted-foreground">Successful Referrals</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Coins className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {referralData.totalBonusTokens}
              </p>
              <p className="text-sm text-muted-foreground">Bonus Tokens Earned</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Gift className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                100
              </p>
              <p className="text-sm text-muted-foreground">Tokens per Referral</p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <Input
                  value={referralData.referralCode}
                  readOnly
                  className="font-mono text-lg text-center tracking-wider"
                  data-testid="referral-code-display"
                />
                <Button
                  variant="outline"
                  onClick={copyReferralCode}
                  className="flex items-center gap-2"
                  data-testid="button-copy-code"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyReferralLink}
                className="flex items-center gap-2 flex-1"
                data-testid="button-copy-link"
              >
                <ExternalLink className="h-4 w-4" />
                Copy Link
              </Button>
              <Button
                onClick={shareReferralCode}
                className="flex items-center gap-2 flex-1"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Share your referral code or link with friends</li>
              <li>2. They sign up using your code</li>
              <li>3. You both get bonus tokens (100 for you, 1000 starting for them)</li>
              <li>4. Start analyzing athletes together!</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>
            People who joined using your referral code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralData.referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet</p>
              <p className="text-sm">Share your code to start earning bonus tokens!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referralData.referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`referral-${referral.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Successful Referral</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(referral.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      +{referral.bonusTokens}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {referral.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}