import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuth() {
  const [forceNotLoading, setForceNotLoading] = useState(false);
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fallback: if loading takes too long, assume user is not authenticated
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('Auth loading timeout - proceeding as unauthenticated');
        setForceNotLoading(true);
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timeout);
    } else {
      setForceNotLoading(false);
    }
  }, [isLoading]);

  const actualIsLoading = isLoading && !forceNotLoading;
  const isAuthenticated = !actualIsLoading && !error && !!user;

  return {
    user,
    isLoading: actualIsLoading,
    isAuthenticated,
    error,
  };
}
