import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN !== "https://your-dsn-here") {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new BrowserTracing()],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 0.0,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      if (import.meta.env.DEV) {
        return null;
      }
      return event;
    },
  });
} else {
  console.info("Sentry not initialized: missing VITE_SENTRY_DSN");
}
