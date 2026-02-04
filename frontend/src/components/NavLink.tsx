'use client';

import React from 'react';
import Link, { LinkProps } from 'next/link';
import { useNavigation } from '@/providers/NavigationProvider';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NavLinkProps extends LinkProps {
    children: React.ReactNode;
    className?: string;
    activeClassName?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    disabled?: boolean;
}

export function NavLink({
    children,
    className,
    activeClassName,
    onClick,
    disabled,
    href,
    ...props
}: NavLinkProps) {
    const { isNavigating, startNavigation } = useNavigation();
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Prevent multi-navigation or if disabled
        if (isNavigating || disabled) {
            e.preventDefault();
            return;
        }

        // Custom click handler
        if (onClick) {
            onClick(e);
        }

        // Only trigger startNavigation for internal routes starting with /
        // or if it's not a hash/same-page link
        const hrefString = typeof href === 'string' ? href : href.pathname || '';
        const isInternal = hrefString.startsWith('/') && !hrefString.startsWith('/#');

        if (isInternal) {
            startNavigation();
        }
    };

    return (
        <Link
            href={href}
            className={cn(
                className,
                isNavigating && "opacity-70 cursor-wait pointer-events-none transition-opacity duration-200"
            )}
            onClick={handleClick}
            {...props}
        >
            {children}
        </Link>
    );
}

/**
 * Custom hook for manual navigation with blocking
 */
export function useSafeNavigation() {
    const { isNavigating, startNavigation } = useNavigation();
    const router = useRouter();

    const navigate = (href: string) => {
        if (isNavigating) return;
        startNavigation();
        router.push(href);
    };

    return { navigate, isNavigating };
}
