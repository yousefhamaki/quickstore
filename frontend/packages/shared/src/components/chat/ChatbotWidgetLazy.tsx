'use client';

import dynamic from 'next/dynamic';

// The widget lives in the root layout, so a plain import would ship its
// ~400-line client bundle (chat UI, ticket form, feedback widget) as part
// of EVERY route's initial JS even though almost nobody opens it on any
// given visit. `ssr: false` moves it into its own chunk that loads after
// the main page is interactive instead of blocking it — but Next.js only
// allows `ssr: false` inside a Client Component, not the (server) root
// layout, hence this tiny wrapper.
export const ChatbotWidget = dynamic(
    () => import('./ChatbotWidget').then((m) => m.ChatbotWidget),
    { ssr: false }
);
