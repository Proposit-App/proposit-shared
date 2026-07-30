// Cap on a moderation report's optional free-text note. The note lands in an
// unbounded Postgres `text` column and, unlike the argument and claim fields,
// has never had a length limit applied anywhere — so this is the first bound
// on it. Sized well above any plausible report so no realistic note is
// rejected, while still ruling out a single request persisting megabytes.
export const MODERATION_REPORT_NOTE_MAX_LEN = 5_000
