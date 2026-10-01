/**
 * Subscription plans. Payments are not active: checkout only works once Stripe
 * is configured (see README "Billing"). Until then the UI collects a waitlist.
 */
export const PLANS = {
  free: {
    name: "Free",
    monthly: 0,
    yearly: 0,
    description: "Everything you need to research and compare models.",
    features: ["Full model database", "Side-by-side comparisons (up to 4)", "Basic API cost calculator", "Favorites saved in your browser", "Weekly AI Model Brief"],
  },
  pro: {
    name: "Pro",
    // Planned launch pricing, editable here. Shown as planned until billing is live.
    monthly: 12,
    yearly: 120,
    description: "For developers and teams who choose and monitor models for production.",
    features: ["Advanced filtering & saved views", "Saved comparisons", "Unlimited favorites & watchlists, synced", "Release & pricing-change email alerts", "Pricing history charts", "Advanced benchmark explorer", "Export comparisons to CSV", "Developer research tools"],
  },
} as const;

export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY && process.env.STRIPE_PRICE_PRO_YEARLY);
}
