import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, Trophy, LogOut } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-athlete-gray-800/95 backdrop-blur-sm border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2">
              <Trophy className="text-athlete-accent" size={24} />
              <span className="text-xl font-bold text-white">Athlete360</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <Button 
                variant={location === "/" ? "default" : "ghost"}
                className="text-white hover:text-athlete-accent"
              >
                <Home size={16} className="mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:flex items-center space-x-3">
                <img 
                  src={(user as any).profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=32&h=32"}
                  alt={(user as any).firstName || "User"}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-white text-sm">
                  {(user as any).firstName} {(user as any).lastName}
                </span>
              </div>
            )}
            
            <Button 
              onClick={() => window.location.href = "/api/logout"}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}