import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => {
  const mockLimit = vi.fn(async () => ({
    data: [
      {
        id: "rec-1",
        deal_id: "deal-1",
        match_score: 0.86,
        match_reasons: [{ reason: "Preferred sector", weight: 0.6 }],
        deal: {
          id: "deal-1",
          title: "Fintech Growth Opportunity",
          description: "A compelling investment opportunity in Fintech.",
          sector: "Fintech",
          location: "Accra",
          funding_amount: 2500000,
          funding_type: "equity",
          industry: "Financial Services",
        },
      },
    ],
    error: null,
  }));

  const mockOrder = vi.fn(() => ({ limit: mockLimit }));
  const mockEq = vi.fn(() => ({ order: mockOrder }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockRpc = vi.fn(async () => ({ data: null, error: null }));

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import DealRecommendations from "./DealRecommendations";

const user = { id: "user-1", email: "investor@example.com" } as any;
const supabaseMock = supabase as any;

describe("DealRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a recommendation card after loading", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DealRecommendations user={user} />
      </MemoryRouter>
    );

    expect(screen.getByText(/ai deal recommendations/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Fintech Growth Opportunity/i)).toBeInTheDocument();
      expect(screen.getByText(/86% Match/i)).toBeInTheDocument();
    });

    expect((supabase as any).from).toHaveBeenCalledWith("deal_recommendations");
    expect((supabase as any).rpc).not.toHaveBeenCalled();
  });

  it("refreshes recommendations when the button is clicked", async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DealRecommendations user={user} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Fintech Growth Opportunity/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(supabaseMock.rpc).toHaveBeenCalledWith("refresh_deal_recommendations", {
        investor_uuid: user.id,
      });
    });
  });

  it("generates recommendations when none exist", async () => {
    const emptyResponse = { data: [], error: null };
    const populatedResponse = {
      data: [
        {
          id: "rec-2",
          deal_id: "deal-2",
          match_score: 0.92,
          match_reasons: [{ reason: "Preferred industry", weight: 0.8 }],
          deal: {
            id: "deal-2",
            title: "AI-powered Energy Deal",
            description: "A strong match for your sector preferences.",
            sector: "Energy",
            location: "Lagos",
            funding_amount: 1200000,
            funding_type: "debt",
            industry: "Renewables",
          },
        },
      ],
      error: null,
    };

    supabaseMock.from
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => emptyResponse,
            }),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => populatedResponse,
            }),
          }),
        }),
      }));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DealRecommendations user={user} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(supabaseMock.rpc).toHaveBeenCalledWith("refresh_deal_recommendations", {
        investor_uuid: user.id,
      });
      expect(screen.getByText(/AI-powered Energy Deal/i)).toBeInTheDocument();
    });
  });
});
