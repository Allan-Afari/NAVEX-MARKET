import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/integrations/supabase/client", () => {
  const session = {
    user: {
      id: "user-1",
      email: "test@example.com",
      user_metadata: { role: "business", full_name: "Test User" },
    },
    access_token: "test-token",
  };

  const tableData: Record<string, any> = {
    deals: [
      {
        id: "deal-1",
        title: "Test Opportunity",
        description: "A sample opportunity",
        industry: "Technology",
        sector: "Technology",
        location: "Accra, Ghana",
        funding_amount: 50000,
        funding_type: "equity",
        expected_return: "20% IRR over 3 years",
        stage: "seed",
        is_featured: false,
        created_by: "user-1",
        created_at: new Date().toISOString(),
      },
    ],
    profiles: [{ id: "user-1" }],
    subscriptions: [
      {
        id: "sub-1",
        tier: "pro",
        status: "active",
        amount: 150,
        currency: "GHS",
        paystack_reference: "ref-123",
        started_at: new Date().toISOString(),
        expires_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
    featured_listing_payments: [
      {
        id: "fp-1",
        deal_id: "deal-1",
        amount: 50,
        currency: "GHS",
        paystack_reference: "ref-456",
        status: "paid",
        created_at: new Date().toISOString(),
      },
    ],
    agreement_signatures: [
      { agreement_id: "agr-1", signer_id: "user-1" },
    ],
    agreements: [
      {
        id: "agr-1",
        title: "Test Agreement",
        status: "draft",
        content: { investor_name: "Test Investor", business_name: "Test Business" },
        created_at: new Date().toISOString(),
        created_by: "user-1",
      },
    ],
  };

  const builderFor = (table: string) => {
    const data = tableData[table] ?? [];
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      or: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      single: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })),
      then: (onFulfilled: any, onRejected: any) =>
        Promise.resolve({ data, error: null }).then(onFulfilled, onRejected),
      catch: (onRejected: any) => Promise.resolve({ data, error: null }).catch(onRejected),
    };
    return builder;
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session } }),
        onAuthStateChange: vi.fn(() => {
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
      from: vi.fn((table: string) => builderFor(table)),
    },
  };
});
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import Marketplace from "./Marketplace";
import Billing from "./Billing";
import Agreements from "./Agreements";

const renderWithQuery = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("Updated pages smoke tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Marketplace and shows opportunity listing", async () => {
    renderWithQuery(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Marketplace />
      </MemoryRouter>
    );

    expect(await screen.findByText("Investment Opportunities")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("Search by title, industry, or location...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Test Opportunity")).toBeInTheDocument();
    });
  });

  it("renders Billing and displays current plan", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Billing />
      </MemoryRouter>
    );

    expect(await screen.findByText("Billing & Payments")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/pro/i)).toBeInTheDocument();
      expect(screen.getByText(/Change Plan|Upgrade/i)).toBeInTheDocument();
    });
  });

  it("renders Agreements and loads user-scoped agreements", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Agreements />
      </MemoryRouter>
    );

    expect(await screen.findByText("Agreements")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Test Agreement")).toBeInTheDocument();
    });
  });
});
