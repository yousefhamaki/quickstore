/** Escapes regex metacharacters in raw user input before it's interpolated
 * into a RegExp — without this, input containing e.g. "(" or "*" throws,
 * and pathological input could cause a slow regex scan. */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive substring match across every EN+AR field (+ tags) a
 * user's words could plausibly appear in. Used both by /support's own
 * search box and as the chatbot's typo-tolerant fallback when MongoDB's
 * stemmed $text search comes up empty (a single transposed/missing letter
 * is a total miss for $text, but still matches here). */
export function buildArticleRegexOr(search: string): any[] {
    const regex = new RegExp(escapeRegex(search), 'i');
    return [
        { title: regex }, { summary: regex }, { content: regex },
        { titleAr: regex }, { summaryAr: regex }, { contentAr: regex },
        { tags: regex },
    ];
}

/**
 * Normalizes common Arabic spelling variants that are semantically
 * identical but literally different characters — MongoDB's $text index
 * has no Arabic-aware stemming (default_language is "english", the only
 * option $text ships with; Arabic isn't one of its supported stemmer
 * languages), so e.g. "إنستاباي" and "انستاباي" — the same word, hamza
 * written vs. omitted, a routine, common spelling variation — are totally
 * different tokens to it and to a plain substring match. Cheap to fix here
 * since fuzzy matching already runs entirely client-side.
 */
function normalizeArabic(text: string): string {
    return text
        .replace(/[إأآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىي]/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/[ً-ْ]/g, ''); // strip tashkeel/diacritics
}

/** Classic edit distance — small enough to not need a dependency for it. */
function levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[a.length][b.length];
}

/**
 * Last-resort fallback for genuine misspellings a substring/stem search
 * can't catch (transposed/wrong letters, e.g. "intsapay" vs "instapay" —
 * not a substring of each other, so both $text and regex miss it entirely).
 * Only worth doing client-side because the corpus is small (a few dozen
 * articles) — fetches just {_id, title, titleAr, tags} and fuzzy-matches
 * each query word against each candidate word, tolerating up to ~30% of
 * the word's length in edit distance (never less than 1, so short words
 * still get one typo's worth of slack).
 */
export function fuzzyMatchArticles<T extends { _id: any; title: string; titleAr?: string; tags?: string[] }>(
    query: string,
    candidates: T[],
    limit = 3
): T[] {
    const queryWords = normalizeArabic(query.toLowerCase()).split(/\s+/).filter((w) => w.length >= 3);
    if (queryWords.length === 0) return [];

    const scored = candidates
        .map((candidate) => {
            const candidateWords = normalizeArabic([candidate.title, candidate.titleAr || '', ...(candidate.tags || [])]
                .join(' ')
                .toLowerCase())
                .split(/\s+/)
                .filter((w) => w.length >= 3);

            let matches = 0;
            for (const qw of queryWords) {
                const tolerance = Math.max(1, Math.floor(qw.length * 0.3));
                if (candidateWords.some((cw) => levenshtein(qw, cw) <= tolerance)) matches++;
            }
            return { candidate, matches };
        })
        .filter((r) => r.matches > 0)
        .sort((a, b) => b.matches - a.matches);

    return scored.slice(0, limit).map((r) => r.candidate);
}
