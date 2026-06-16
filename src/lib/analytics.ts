// Google Analytics utility
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Initialize Google Analytics
export const initGA = (measurementId: string) => {
  if (typeof window !== 'undefined') {
    // Load gtag script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.gtag = window.gtag || function(...args: unknown[]) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track page views
export const trackPageView = (pagePath: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: pagePath,
    });
  }
};

// Track events
export const trackEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Track user interactions
export const trackUserAction = (action: string, category: string, label?: string, value?: number) => {
  trackEvent('user_action', {
    action,
    category,
    label,
    value,
  });
};

// Track errors
export const trackError = (error: Error, context?: string) => {
  trackEvent('exception', {
    description: error.message,
    fatal: false,
    context,
  });
};

// Track performance
export const trackPerformance = (metric: string, value: number) => {
  trackEvent('performance', {
    metric,
    value,
  });
};