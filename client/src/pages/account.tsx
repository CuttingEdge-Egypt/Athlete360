import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  CreditCard, 
  Mail, 
  Calendar, 
  Shield, 
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Coins
} from "lucide-react";

interface PaymentCard {
  id: string;
  cardLast4: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  createdAt: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  currentTokens: number;
  totalTokensPurchased: number;
  memberSince: string;
  cards: PaymentCard[];
}

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  
  const [newCard, setNewCard] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

  // Fetch user profile and cards
  const { data: profile = {} as UserProfile, isLoading } = useQuery({
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

  // Add card mutation
  const addCardMutation = useMutation({
    mutationFn: async (cardData: typeof newCard) => {
      return await apiRequest("POST", "/api/user/cards", {
        cardNumber: cardData.number.replace(/\s/g, ''),
        expiryMonth: cardData.expiry.split('/')[0],
        expiryYear: cardData.expiry.split('/')[1],
        cvv: cardData.cvv,
        cardholderName: cardData.name
      });
    },
    onSuccess: () => {
      toast({
        title: "Card Added",
        description: "Your payment card has been added successfully.",
      });
      setIsAddCardOpen(false);
      setNewCard({ number: "", expiry: "", cvv: "", name: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Add Card Failed",
        description: error.message || "Failed to add payment card",
        variant: "destructive",
      });
    }
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      return await apiRequest("DELETE", `/api/user/cards/${cardId}`);
    },
    onSuccess: () => {
      toast({
        title: "Card Removed",
        description: "Payment card has been removed from your account.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove payment card",
        variant: "destructive",
      });
    }
  });

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const getCardBrandIcon = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('visa')) return '💳';
    if (brandLower.includes('mastercard')) return '💳';
    if (brandLower.includes('amex') || brandLower.includes('american')) return '💳';
    return '💳';
  };

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleAddCard = () => {
    if (!newCard.number || !newCard.expiry || !newCard.cvv || !newCard.name) {
      toast({
        title: "Complete all fields",
        description: "All card details are required",
        variant: "destructive",
      });
      return;
    }
    addCardMutation.mutate(newCard);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-300">Manage your profile information and payment methods</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-gray-400">
                Your personal account details
              </CardDescription>
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
                    {profile?.currentTokens || 0}
                  </div>
                  <div className="text-sm text-gray-400">
                    of {profile?.totalTokensPurchased || 0} purchased
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
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!editingProfile}
                      className="bg-gray-900/50 border-gray-600"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {profile?.memberSince && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    Member since {new Date(profile.memberSince).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Profile Action Buttons */}
              <div className="flex gap-3">
                {editingProfile ? (
                  <>
                    <Button
                      onClick={handleProfileSave}
                      disabled={updateProfileMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-save-profile"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileData({
                          firstName: profile?.firstName || "",
                          lastName: profile?.lastName || "",
                          email: profile?.email || ""
                        });
                      }}
                      className="border-gray-600 text-gray-300"
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setEditingProfile(true)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    data-testid="button-edit-profile"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-green-400" />
                    Payment Methods
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage your saved payment cards
                  </CardDescription>
                </div>
                <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      data-testid="button-add-card"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Payment Card</DialogTitle>
                      <DialogDescription>
                        Add a new payment method to your account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Cardholder Name</Label>
                        <Input
                          id="cardName"
                          value={newCard.name}
                          onChange={(e) => setNewCard(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="John Doe"
                          data-testid="input-new-card-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          value={newCard.number}
                          onChange={(e) => setNewCard(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          data-testid="input-new-card-number"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry</Label>
                          <Input
                            id="expiry"
                            value={newCard.expiry}
                            onChange={(e) => setNewCard(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                            placeholder="MM/YY"
                            maxLength={5}
                            data-testid="input-new-card-expiry"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            value={newCard.cvv}
                            onChange={(e) => setNewCard(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                            placeholder="123"
                            maxLength={4}
                            type="password"
                            data-testid="input-new-card-cvv"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleAddCard}
                          disabled={addCardMutation.isPending}
                          className="flex-1"
                          data-testid="button-save-card"
                        >
                          Add Card
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddCardOpen(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {profile?.cards && profile.cards.length > 0 ? (
                <div className="space-y-3">
                  {profile.cards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getCardBrandIcon(card.cardBrand)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {showCardDetails === card.id 
                                ? `${card.cardBrand} **** **** **** ${card.cardLast4}`
                                : `${card.cardBrand} ••••${card.cardLast4}`
                              }
                            </span>
                            {card.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {showCardDetails === card.id 
                              ? `Full Number: **** **** **** ${card.cardLast4} | Expires ${card.expiryMonth || 'XX'}/${card.expiryYear || 'XX'}`
                              : `Expires ${card.expiryMonth || 'XX'}/${card.expiryYear || 'XX'}`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowCardDetails(showCardDetails === card.id ? null : card.id)}
                          data-testid={`button-toggle-card-${card.id}`}
                        >
                          {showCardDetails === card.id ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (profile?.cards && profile.cards.length > 1) {
                              deleteCardMutation.mutate(card.id);
                            } else {
                              toast({
                                title: "Cannot remove card",
                                description: "You must have at least one payment method",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={profile?.cards && profile.cards.length <= 1}
                          className="text-red-400 hover:text-red-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                          data-testid={`button-delete-card-${card.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment methods saved</p>
                  <p className="text-sm">Add a card to make token purchases</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Security Section */}
        <Card className="mt-8 bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-400" />
              Security & Privacy
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your account security information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <Shield className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <h3 className="font-medium text-green-400">Secure Authentication</h3>
                <p className="text-sm text-gray-400 mt-1">Protected by Replit Auth</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                <h3 className="font-medium text-blue-400">Encrypted Payments</h3>
                <p className="text-sm text-gray-400 mt-1">Card data is securely encrypted</p>
              </div>
              <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <User className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                <h3 className="font-medium text-purple-400">Privacy Protected</h3>
                <p className="text-sm text-gray-400 mt-1">Your data stays private</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}