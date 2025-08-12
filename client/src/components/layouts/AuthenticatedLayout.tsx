import { Navigation } from "@/components/Navigation";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      <Navigation />
      <div className="pt-20 pb-20">
        {children}
      </div>
    </div>
  );
}