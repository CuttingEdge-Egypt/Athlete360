import { Navigation } from "@/components/Navigation";
import GenerationQueue from "@/components/ui/generation-queue";
import { useLocation } from "wouter";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      <Navigation />
      <div className="pt-20 pb-20">
        {children}
      </div>
      
      {/* Global Generation Queue - available on all authenticated pages */}
      <GenerationQueue
        onSelectGeneration={(result) => {
          // Navigate to home page with the result data
          if (result.serviceType === 'compare') {
            setLocation('/?tab=comparison&data=' + encodeURIComponent(JSON.stringify(result)));
          } else if (result.serviceType === 'video') {
            setLocation('/?tab=video&data=' + encodeURIComponent(JSON.stringify(result)));
          } else if (result.serviceType === 'nutrition-plan') {
            setLocation('/?tab=nutrition&data=' + encodeURIComponent(JSON.stringify(result)));
          } else if (result.serviceType === 'development-plan') {
            setLocation('/?tab=development&data=' + encodeURIComponent(JSON.stringify(result)));
          }
        }}
      />
    </div>
  );
}