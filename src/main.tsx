import "./lib/offline-mode";
import "./lib/sentry";
import "./lib/analytics-init";
import "./lib/i18n";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<ErrorBoundary />}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);
