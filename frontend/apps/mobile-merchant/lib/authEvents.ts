// Tiny pub/sub so the axios interceptor (lib/api.ts) can tell the auth
// context (lib/authContext.tsx) "the refresh token is dead, force the user
// back to login" without api.ts having to import React/navigation directly.
type Listener = () => void;

let listener: Listener | null = null;

export function onForceLogout(fn: Listener) {
  listener = fn;
}

export function triggerForceLogout() {
  if (listener) listener();
}
