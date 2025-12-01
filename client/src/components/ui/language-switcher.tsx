import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface LanguageSwitcherProps {
  customTrigger?: React.ReactNode;
}

export const LanguageSwitcher = ({ customTrigger }: LanguageSwitcherProps = {}) => {
  const { language, changeLanguage, availableLanguages } = useLanguage();
  const { t } = useTranslation('common');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {customTrigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0 text-foreground hover:text-primary hover:bg-primary/10"
            data-testid="button-language-switcher"
          >
            <Globe className="h-4 w-4" />
            <span className="sr-only">Switch language</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
            data-testid={`language-option-${lang.code}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-xs text-muted-foreground">{lang.name}</span>
            </div>
            {language === lang.code && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Compact version for mobile/small spaces
export const CompactLanguageSwitcher = () => {
  const { language, changeLanguage, availableLanguages } = useLanguage();

  const currentLang = availableLanguages.find(lang => lang.code === language);
  const otherLang = availableLanguages.find(lang => lang.code !== language);

  if (!currentLang || !otherLang) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => changeLanguage(otherLang.code)}
      className="h-8 px-2 text-xs font-medium"
      data-testid="button-compact-language-switcher"
    >
      {otherLang.nativeName}
    </Button>
  );
};