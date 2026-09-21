// Canonical list of Egypt's 27 official governorates (muhafazat), each with
// a stable `key` used as the primary match value throughout the shipping
// system (Store.settings.shipping.zones[].governorate, Order.shippingAddress
// .state), plus English and Arabic display names.
//
// Mirrored at frontend/packages/shared/src/constants/egyptianGovernorates.ts
// — keep both copies in sync by hand (backend/ and frontend/ are separate
// Node projects with no shared module boundary; see similar notes elsewhere
// in this codebase, e.g. models/Store.ts's IEmailBlock doc-comment).
export interface EgyptianGovernorate {
    key: string;
    nameEn: string;
    nameAr: string;
}

export const EGYPTIAN_GOVERNORATES: EgyptianGovernorate[] = [
    { key: 'cairo', nameEn: 'Cairo', nameAr: 'القاهرة' },
    { key: 'giza', nameEn: 'Giza', nameAr: 'الجيزة' },
    { key: 'alexandria', nameEn: 'Alexandria', nameAr: 'الإسكندرية' },
    { key: 'qalyubia', nameEn: 'Qalyubia', nameAr: 'القليوبية' },
    { key: 'port_said', nameEn: 'Port Said', nameAr: 'بورسعيد' },
    { key: 'suez', nameEn: 'Suez', nameAr: 'السويس' },
    { key: 'dakahlia', nameEn: 'Dakahlia', nameAr: 'الدقهلية' },
    { key: 'sharqia', nameEn: 'Sharqia', nameAr: 'الشرقية' },
    { key: 'gharbia', nameEn: 'Gharbia', nameAr: 'الغربية' },
    { key: 'monufia', nameEn: 'Monufia', nameAr: 'المنوفية' },
    { key: 'beheira', nameEn: 'Beheira', nameAr: 'البحيرة' },
    { key: 'ismailia', nameEn: 'Ismailia', nameAr: 'الإسماعيلية' },
    { key: 'kafr_el_sheikh', nameEn: 'Kafr El Sheikh', nameAr: 'كفر الشيخ' },
    { key: 'faiyum', nameEn: 'Faiyum', nameAr: 'الفيوم' },
    { key: 'beni_suef', nameEn: 'Beni Suef', nameAr: 'بني سويف' },
    { key: 'minya', nameEn: 'Minya', nameAr: 'المنيا' },
    { key: 'asyut', nameEn: 'Asyut', nameAr: 'أسيوط' },
    { key: 'sohag', nameEn: 'Sohag', nameAr: 'سوهاج' },
    { key: 'qena', nameEn: 'Qena', nameAr: 'قنا' },
    { key: 'aswan', nameEn: 'Aswan', nameAr: 'أسوان' },
    { key: 'luxor', nameEn: 'Luxor', nameAr: 'الأقصر' },
    { key: 'red_sea', nameEn: 'Red Sea', nameAr: 'البحر الأحمر' },
    { key: 'new_valley', nameEn: 'New Valley', nameAr: 'الوادي الجديد' },
    { key: 'matrouh', nameEn: 'Matrouh', nameAr: 'مطروح' },
    { key: 'north_sinai', nameEn: 'North Sinai', nameAr: 'شمال سيناء' },
    { key: 'south_sinai', nameEn: 'South Sinai', nameAr: 'جنوب سيناء' },
    { key: 'damietta', nameEn: 'Damietta', nameAr: 'دمياط' },
];

export function findGovernorateByKey(key?: string | null): EgyptianGovernorate | undefined {
    if (!key) return undefined;
    const normalized = key.toString().trim().toLowerCase();
    return EGYPTIAN_GOVERNORATES.find(g => g.key === normalized);
}

// Best-effort resolution of a free-text value (as might arrive from an
// older client, or a shopper-typed value) to a canonical governorate key —
// matches against the key itself, and both English/Arabic display names,
// case-insensitively.
export function resolveGovernorateKey(value?: string | null): string | undefined {
    if (!value) return undefined;
    const normalized = value.toString().trim().toLowerCase();
    if (!normalized) return undefined;
    const match = EGYPTIAN_GOVERNORATES.find(g =>
        g.key === normalized ||
        g.nameEn.toLowerCase() === normalized ||
        g.nameAr === value.toString().trim()
    );
    return match?.key;
}
