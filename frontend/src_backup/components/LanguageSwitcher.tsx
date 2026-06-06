'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
    { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
];

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const switchLanguage = (newLocale: string) => {
        if (newLocale === locale) return;

        startTransition(() => {
            // Set cookie for persistence
            document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

            // Get the new language config
            const newLang = languages.find(lang => lang.code === newLocale);
            if (!newLang) return;

            // Update HTML attributes immediately for smooth transition
            document.documentElement.lang = newLocale;
            document.documentElement.dir = newLang.dir;

            // Update body font class
            if (newLocale === 'ar') {
                document.body.classList.remove('font-inter');
                document.body.classList.add('font-cairo');
            } else {
                document.body.classList.remove('font-cairo');
                document.body.classList.add('font-inter');
            }

            // Replace the locale in the current pathname
            // pathname is like "/en/dashboard" or "/ar/about"
            const segments = pathname.split('/');
            segments[1] = newLocale; // Replace locale segment
            const newPath = segments.join('/');

            // Navigate to the new locale path
            // This triggers next-intl's locale detection and loads the correct translations
            router.push(newPath);
        });
    };

    const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    disabled={isPending}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages.map((language) => (
                    <DropdownMenuItem
                        key={language.code}
                        onClick={() => switchLanguage(language.code)}
                        className={locale === language.code ? 'bg-accent' : ''}
                    >
                        <span className="font-medium">{language.nativeName}</span>
                        {locale === language.code && (
                            <span className="ml-auto text-xs text-muted-foreground">✓</span>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
