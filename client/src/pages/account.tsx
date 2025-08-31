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
import {
  User,
  Edit3,
  Save,
  X,
  Coins,
  History
} from "lucide-react";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  currentTokens: number;
  totalTokensPurchased: number;
  memberSince: string;
}

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Handle comparison selection from history
  const handleComparisonFromHistory = (comparisonData: any) => {
    // Navigate to home with comparison tab
    setLocation("/?tab=comparison&data=" + encodeURIComponent(JSON.stringify(comparisonData)));
  };
  const [editingProfile, setEditingProfile] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

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
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  // Fetch user history
  const { data: history } = useQuery({
    queryKey: ["/api/user-history"]
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading your account...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <p className="text-gray-400 mt-1">Manage your profile and view account information</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            data-testid="button-back-home"
          >
            Back to Home
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-400" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your personal account details
                </CardDescription>
              </div>
              <Button
                variant={editingProfile ? "destructive" : "outline"}
                size="sm"
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
                className="border-gray-600"
                data-testid={editingProfile ? "button-cancel-edit" : "button-edit-profile"}
              >
                {editingProfile ? <X className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                {editingProfile ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Token Balance */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <Coins className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="font-medium text-green-400">Token Balance</p>
                    <p className="text-sm text-gray-400">Available for analysis</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">
                    {profile?.currentTokens ?? 0}
                  </div>
                  <div className="text-sm text-gray-400">
                    of {profile?.totalTokensPurchased ?? 0} purchased
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-700" />

              {/* Profile Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!editingProfile}
                      className="bg-gray-900/50 border-gray-600"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!editingProfile}
                      className="bg-gray-900/50 border-gray-600"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!editingProfile}
                    className="bg-gray-900/50 border-gray-600"
                    data-testid="input-email"
                  />
                </div>

                {editingProfile && (
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </div>

              <Separator className="bg-gray-700" />

              {/* Account Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-400">Member Since</Label>
                  <div className="text-white font-medium">
                    {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Account Status</Label>
                  <div className="text-white font-medium">
                    <Badge variant="outline" className="border-green-500 text-green-400">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis History */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                Recent Analysis History
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your recent athlete analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history && history.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {history.slice(0, 10).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {item.athleteName} - {item.serviceType}
                        </div>
                        <div className="text-sm text-gray-400">
                          {item.athleteSport} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                          -{item.tokensDeducted} tokens
                        </Badge>
                        {item.serviceType === 'comparison' && item.resultData && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleComparisonFromHistory(item.resultData)}
                            className="text-blue-400 hover:text-blue-300"
                            data-testid={`button-view-comparison-${item.id}`}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No analysis history yet</p>
                  <p className="text-sm">Start analyzing athletes to see your history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}