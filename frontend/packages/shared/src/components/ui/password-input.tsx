'use client';

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { cn } from "@shared/lib/utils";

/**
 * A password <Input> with a show/hide toggle (eye icon). Forwards its ref
 * to the underlying native input — required so react-hook-form's
 * `register(...)` (used on the shipping/payments credential fields) keeps
 * working exactly as it would with a plain <Input type="password" />.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, ...props }, ref) => {
        const [visible, setVisible] = React.useState(false);

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type={visible ? "text" : "password"}
                    className={cn("pr-10 rtl:pr-3 rtl:pl-10", className)}
                    {...props}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((v) => !v)}
                    className="absolute right-0 rtl:right-auto rtl:left-0 top-0 h-9 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        );
    }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
