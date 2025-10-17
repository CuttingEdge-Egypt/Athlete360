import * as Flags from 'country-flag-icons/react/3x2';
import { getCountryCode } from '@/lib/countryCodeMapper';

interface FlagProps {
  country: string;
  className?: string;
}

export function Flag({ country, className = "w-6 h-4" }: FlagProps) {
  const countryCode = getCountryCode(country);
  
  if (!countryCode) {
    return null;
  }
  
  // Get the flag component dynamically
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[countryCode];
  
  if (!FlagComponent) {
    return null;
  }
  
  return <FlagComponent className={className} />;
}
