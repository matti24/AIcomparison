/** Public site origin, safe for both server and client code (no trailing slash). */
export function siteUrlClient() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const SITE_NAME = "AI Compare";

/**
 * Operator details for legal pages. Fill these in before launch; null values
 * render as visible placeholders so nothing is invented.
 */
export const LEGAL = {
  companyName: process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME || null,
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || null,
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  governingLaw: process.env.NEXT_PUBLIC_LEGAL_JURISDICTION || null,
  effectiveDate: "2026-10-01",
};
