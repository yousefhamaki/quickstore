import { encrypt } from './crypto';

// Must match the exact placeholder the frontend substitutes into a masked
// credential field's VALUE (not just its `placeholder` attribute) once a
// secret is already stored server-side — see
// settings/shipping/page.tsx and settings/payments/page.tsx, both of which
// default e.g. `credentials.apiKey` to this string whenever
// `store.settings.*.credentials.apiKey` is already set, and to '' otherwise.
const MASKED_VALUE = '••••••••••••';

// Recognizes utils/crypto.ts's own `iv:authTag:cipher` output (hex:hex:hex,
// with fixed-length 12-byte IV / 16-byte GCM auth tag). Unlike
// settings.emailSender.smtp.passwordEncrypted (stripped/renamed to
// `hasPassword` by EmailSenderSchema's toJSON transform before it ever
// reaches the client), payment/shipping credentials have no such transform
// — a store payload round-trips this ciphertext back to the client as a
// plain string. So another settings page that wholesale-spreads
// `...store.settings` before overwriting only its OWN slice (e.g. the
// Payments page saving `{ ...store.settings, payment: data.payment }`,
// which carries `settings.shipping` — including its already-encrypted
// credentials — through untouched) resends that ciphertext completely
// unchanged. It must pass through as-is here rather than being encrypted a
// second time.
const ENCRYPTED_SHAPE = /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]*$/i;

/**
 * Resolves what a single secret credential field (a payment/shipping
 * provider's apiKey/apiSecret) should actually be saved as, given whatever
 * the client just submitted for it and whatever ciphertext (if any) is
 * already stored. The equivalent-but-separate carve-out to
 * applyEmailSenderUpdate.ts for the identical underlying bug:
 * PaymentFactory/ShippingFactory both call decrypt() on these fields at use
 * time, which throws on anything not in encrypt()'s `iv:authTag:cipher`
 * format — so a plaintext string (or a corrupted double-encrypted one) must
 * never reach Mongo here.
 *
 *  - undefined  → field wasn't part of this submission at all (e.g. the
 *    Shipping settings page never registers `apiSecret`/`accountNumber`
 *    inputs) → keep whatever is already stored.
 *  - ''         → merchant explicitly cleared the field → drop the credential.
 *  - the frontend's mask placeholder → merchant left it untouched → keep
 *    the existing ciphertext.
 *  - already in encrypt()'s own ciphertext shape → an already-encrypted
 *    value carried over unchanged from a wholesale `...store.settings`
 *    spread on a DIFFERENT settings page → pass through as-is.
 *  - anything else → a freshly typed plaintext secret → encrypt it.
 */
export function applyEncryptedCredentialField(
    incoming: string | undefined,
    existingEncrypted: string | undefined
): string | undefined {
    if (incoming === undefined) return existingEncrypted;
    if (incoming === '') return undefined;
    if (incoming === MASKED_VALUE) return existingEncrypted;
    if (ENCRYPTED_SHAPE.test(incoming)) return incoming;
    return encrypt(incoming);
}
