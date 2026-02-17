import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const LanguageSwitcher = ({ className, variant = "outline", size = "sm", showName = true }) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language.split('-')[0] || 'tr';

  const languages = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    // Dynamic updates for <html> lang attribute
    document.documentElement.lang = code;
  };

  const currentLangObj = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2 border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-all", className)}
        >
          <Globe className="h-4 w-4 text-teal-500" />
          {showName && <span className="hidden sm:inline font-medium">{currentLangObj.flag} {currentLangObj.name}</span>}
          {!showName && <span className="font-bold text-xs uppercase">{currentLanguage}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              "flex items-center justify-between cursor-pointer focus:bg-slate-800 focus:text-white",
              currentLanguage === lang.code ? "bg-slate-800/50 text-teal-400" : "text-slate-400"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </div>
            {currentLanguage === lang.code && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
