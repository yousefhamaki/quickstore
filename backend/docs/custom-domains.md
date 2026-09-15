# Custom domains — how it works, and what you (the operator) must set up

This covers the feature built in this session: a merchant can connect their
own domain (e.g. `shop.example.com`) to their Buildora store, prove they
actually control it, and have it served the same way `*.quickstore.live`
subdomains already are.

There are two separate halves to this: **application code** (already built —
nothing more to do) and **server/DNS infrastructure** (you need to set this
up once; it isn't something that can be done from inside this repo).

---

## 1. What was built (application layer)

- `backend/src/models/Store.ts` — `domain.customDomain`, `domain.verificationToken`,
  `domain.isVerified`. `domain.customDomain` has a **unique** index — two
  stores can never claim the same domain string.
- `backend/src/services/domain/DomainVerificationService.ts` — generates a
  random token and checks it via a DNS **TXT** record lookup
  (`_buildora-verify.<domain>`). This is the ownership proof: only whoever
  controls the domain's DNS can publish that record, so no one can claim a
  domain they don't own.
- Endpoints (`backend/src/routes/storeRoutes.ts`, merchant-authenticated,
  ownership-checked, plan-gated on `SubscriptionPlan.features.customDomain`):
  - `POST /api/stores/:id/domain` `{ customDomain }` — connect a domain,
    returns the TXT record to add.
  - `POST /api/stores/:id/domain/verify` — checks DNS now; flips
    `isVerified: true` on success.
  - `DELETE /api/stores/:id/domain` — disconnects it.
- `backend/src/controllers/publicController.ts` (`getStoreBySubdomain`) only
  serves a store by `customDomain` when `isVerified: true` — an unverified
  (or removed) custom domain is never resolvable, even if someone else's
  Host header happens to match it.
- Merchant UI: `frontend/apps/saas-portal/.../settings/domain/page.tsx`
  — connect/verify/remove flow with the DNS instructions shown inline.

**None of this requires any server/infra change to keep working for
subdomains** (`*.quickstore.live`) — that part is unaffected. The rest of
this document is only about making *custom* domains actually reachable.

---

## 2. What YOU need to set up (infrastructure — do this once, not per merchant)

A custom domain needs three things to actually work, on top of the app-level
verification above:

1. **DNS**: the merchant's domain must point at your infrastructure.
2. **Routing**: whatever's in front of the app must accept requests for
   *any* hostname (not just `quickstore.live`) and forward them to the
   `saas-portal` Next.js app with the original `Host` header intact — it
   already knows what to do with an arbitrary hostname (see
   `frontend/apps/saas-portal/src/proxy.ts`, which treats any hostname not
   in its `mainDomains` list as either a subdomain or a custom domain and
   rewrites to `/store/<hostname>`).
3. **TLS**: browsers require valid HTTPS for the merchant's domain. This is
   the genuinely hard part of "custom domains for a SaaS" — you cannot
   pre-issue a certificate for a domain you don't know about in advance, so
   whatever you pick below needs to issue certificates **on demand**, per
   customer domain.

### Recommended: Cloudflare for SaaS (Custom Hostnames)

This is what most small-to-mid SaaS platforms use for exactly this problem,
and it's the path of least ops burden:

1. Put `quickstore.live` behind Cloudflare (if it isn't already), and enable
   **Cloudflare for SaaS** → **Custom Hostnames** on the zone.
2. Create one **fallback origin** in Cloudflare pointing at wherever
   `saas-portal` actually runs (your AWS load balancer / EC2 / ECS service).
3. Tell merchants (already done — the UI shows this) to add a `CNAME` for
   their domain pointing at a hostname you choose, e.g.
   `stores.quickstore.live` (a DNS record you create once, pointing at your
   Cloudflare Custom Hostname fallback origin).
4. When a merchant's domain's CNAME resolves through Cloudflare, Cloudflare
   automatically issues and renews a TLS certificate for it and forwards
   traffic to your origin with the original Host header preserved — no
   further per-domain work on your end.
5. Nothing else changes: `proxy.ts` already handles whatever hostname
   arrives, and `getStoreBySubdomain` already requires `isVerified`.

### Alternative: self-managed reverse proxy with on-demand TLS (AWS EC2/ECS)

If you'd rather not depend on Cloudflare, this is the DIY equivalent:

1. Run **Caddy** (simplest) or **Traefik** in front of the `saas-portal`
   Node process(es), instead of (or in addition to) Nginx.
   - Caddy supports "on-demand TLS": it can request a Let's Encrypt
     certificate the *first time* it sees a request for a new hostname (with
     an `ask` callback endpoint you control, so it only does this for
     domains that are actually in your `stores` collection with
     `isVerified: true` — do not leave on-demand TLS wide open, or anyone
     could make your server request certs for arbitrary hostnames).
   - Traefik can do the same with its ACME provider + a dynamic hostname
     matcher.
2. DNS: create `stores.quickstore.live` → the public IP/ALB in front of that
   Caddy/Traefik instance, and have merchants CNAME to it (same as above).
3. The reverse proxy forwards every request, whatever the Host header, to
   the `saas-portal` app on its internal port — do **not** configure
   `server_name` to a fixed list if you go the plain-Nginx route; Nginx
   cannot issue certificates on demand, so plain Nginx + certbot is only
   practical if you're willing to manually run certbot for each merchant's
   domain as they connect one (workable at small scale, not at scale).
4. Everything downstream (proxy.ts, the API) is unchanged.

### If you deploy `saas-portal` on Vercel

Vercel has built-in support for exactly this (their "Domains for Platforms"
API/UI) — you'd call their API to add each verified custom domain to the
project, and Vercel handles DNS + TLS automatically. Only relevant if
`saas-portal` is actually hosted there rather than on your own AWS
infrastructure.

---

## 3. Operational notes

- **Order of operations for a merchant**: they can add the TXT record and
  click "Verify" before or after pointing the CNAME — verification only
  checks the TXT record. The store won't actually be reachable on that
  domain until the CNAME also resolves through whichever path you chose
  above, but that's fine; it's normal for DNS changes to take a few minutes
  to propagate regardless of order.
- **Removing/changing a domain**: `DELETE /api/stores/:id/domain` clears
  `isVerified` and the Redis cache key for the old domain immediately. If
  you used Cloudflare for SaaS, also remove the Custom Hostname there (not
  automated — there's no code in this repo calling Cloudflare's API); if you
  used Caddy on-demand TLS, its cert cache can just be left to expire
  naturally.
- **Re-verification**: nothing currently re-checks an already-verified
  domain's DNS periodically. If a merchant later points that domain
  elsewhere entirely (stops CNAMEing to you) their store simply stops being
  reachable there — no action needed on your end, but also nothing will shy
  away from redisplaying "Verified" in the UI since MongoDB doesn't know
  the CNAME changed. That's a reasonable v1 behavior, not a security issue
  (the uniqueness index is the thing preventing hijack, not this check).
