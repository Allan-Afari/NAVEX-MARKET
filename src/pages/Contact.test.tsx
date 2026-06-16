import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({ error: null })),
    },
  },
}));

vi.mock("@/components/landing/Navbar", () => ({ default: () => <div>Navbar</div> }));
vi.mock("@/components/landing/Footer", () => ({ default: () => <div>Footer</div> }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Contact from "./Contact";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const mockedSupabase = supabase as any;
const mockedToast = toast as any;

describe("Contact page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the contact form", () => {
    render(<Contact />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it("shows an error when required fields are missing", async () => {
    const { container } = render(<Contact />);

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(mockedToast.error).toHaveBeenCalledWith("Please fill in all fields");
    });
  });

  it("submits the form and calls the Supabase email function", async () => {
    render(<Contact />);

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: "Hello" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "I have a question." } });

    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("send-email-notification", expect.any(Object));
      expect(mockedToast.success).toHaveBeenCalledWith("Message sent! We'll get back to you soon.");
    });
  });
});
