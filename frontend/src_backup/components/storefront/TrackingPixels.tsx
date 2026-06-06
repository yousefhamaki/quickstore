'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface TrackingPixelsProps {
    marketing?: {
        facebookPixelId?: string;
        googleAnalyticsId?: string;
        tiktokPixelId?: string;
        snapchatPixelId?: string;
    };
}

export function TrackingPixels({ marketing }: TrackingPixelsProps) {
    const { facebookPixelId, googleAnalyticsId, tiktokPixelId, snapchatPixelId } = marketing || {};

    // Facebook Pixel PageView
    useEffect(() => {
        if (facebookPixelId && typeof window !== 'undefined') {
            // @ts-ignore
            if (window.fbq) {
                // @ts-ignore
                window.fbq('track', 'PageView');
            }
        }
    }, [facebookPixelId]);

    return (
        <>
            {/* Facebook Pixel */}
            {facebookPixelId && (
                <>
                    <Script
                        id="facebook-pixel"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                !function(f,b,e,v,n,t,s)
                                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                                n.queue=[];t=b.createElement(e);t.async=!0;
                                t.src=v;s=b.getElementsByTagName(e)[0];
                                s.parentNode.insertBefore(t,s)}(window, document,'script',
                                'https://connect.facebook.net/en_US/fbevents.js');
                                fbq('init', '${facebookPixelId}');
                                fbq('track', 'PageView');
                            `,
                        }}
                    />
                    <noscript>
                        <img
                            height="1"
                            width="1"
                            style={{ display: 'none' }}
                            src={`https://www.facebook.com/tr?id=${facebookPixelId}&ev=PageView&noscript=1`}
                            alt=""
                        />
                    </noscript>
                </>
            )}

            {/* Google Analytics */}
            {googleAnalyticsId && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
                        strategy="afterInteractive"
                    />
                    <Script
                        id="google-analytics"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${googleAnalyticsId}');
                            `,
                        }}
                    />
                </>
            )}

            {/* TikTok Pixel */}
            {tiktokPixelId && (
                <Script
                    id="tiktok-pixel"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            !function (w, d, t) {
                                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                                ttq.load('${tiktokPixelId}');
                                ttq.page();
                            }(window, document, 'ttq');
                        `,
                    }}
                />
            )}

            {/* Snapchat Pixel */}
            {snapchatPixelId && (
                <Script
                    id="snapchat-pixel"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
                            {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
                            a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
                            r.src=n;var u=t.getElementsByTagName(s)[0];
                            u.parentNode.insertBefore(r,u);})(window,document,
                            'https://sc-static.net/scevent.min.js');
                            snaptr('init', '${snapchatPixelId}', {});
                            snaptr('track', 'PAGE_VIEW');
                        `,
                    }}
                />
            )}
        </>
    );
}
