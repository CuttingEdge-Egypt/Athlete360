import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { HistoryDropdown } from "@/components/ui/history-dropdown";
import { ReferralDropdown } from "@/components/ui/referral-dropdown";
import { Trophy, Coins, Plus, LogOut, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function Navigation() {
  const { user: authUser } = useAuth();
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!authUser,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-athlete-primary/90 backdrop-blur-lg border-b border-gray-800">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 cursor-pointer">
          <Trophy className="text-athlete-accent text-2xl" />
          <span className="text-xl font-bold text-white">Athlete360</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-6">
          {/* Token Balance Display */}
          <div 
            data-testid="token-balance"
            className="flex items-center space-x-2 bg-athlete-gray-800 px-4 py-2 rounded-full"
          >
            <Coins className="text-athlete-warning" size={20} />
            <div className="flex flex-col items-center">
              <span className="font-semibold text-white">{user?.tokens || 0}</span>
              {user?.totalTokensPurchased && (
                <span className="text-xs text-gray-400">
                  /{user.totalTokensPurchased} tokens
                </span>
              )}
            </div>
          </div>
          
          <Link href="/payment-center">
            <Button 
              data-testid="button-payment-center"
              className="bg-athlete-accent hover:bg-blue-600 text-white"
            >
              <Plus className="mr-2" size={16} />
              Payment Center
            </Button>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Mobile Token Display */}
          <div className="md:hidden">
            <Badge 
              variant="secondary" 
              className="bg-athlete-gray-800 text-athlete-warning flex flex-col py-2"
            >
              <div className="flex items-center">
                <Coins className="mr-1" size={14} />
                {user?.tokens || 0}
              </div>
              {user?.totalTokensPurchased && (
                <span className="text-xs text-gray-400">
                  /{user.totalTokensPurchased}
                </span>
              )}
            </Badge>
          </div>

          {/* History, Referral, and User Menu */}
          <div className="flex items-center space-x-2">
            <HistoryDropdown />
            <ReferralDropdown />
            
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="text-gray-300 w-8 h-8" />
            )}
            
            <Button 
              onClick={handleLogout}
              data-testid="button-logout"
              variant="ghost" 
              size="sm"
              className="text-gray-300 hover:text-white"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
