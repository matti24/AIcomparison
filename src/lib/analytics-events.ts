export const ANALYTICS_EVENTS = [
  "page_view",
  "search_performed",
  "search_no_results",
  "model_viewed",
  "comparison_created",
  "comparison_viewed",
  "outbound_click",
  "calculator_used",
  "newsletter_subscribed",
  "finder_completed",
  "pro_upgrade_clicked",
  "api_waitlist_joined",
  "account_created",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
