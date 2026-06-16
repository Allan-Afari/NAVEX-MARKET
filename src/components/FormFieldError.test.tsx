import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormFieldError } from "./FormFieldError";

describe("FormFieldError Component", () => {
  it("should not render when error is empty", () => {
    render(<FormFieldError error="" touched={true} />);
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  it("should not render when touched is false", () => {
    render(<FormFieldError error="This field is required" touched={false} />);
    expect(screen.queryByText("This field is required")).not.toBeInTheDocument();
  });

  it("should render error message when touched and error exists", () => {
    render(<FormFieldError error="This field is required" touched={true} />);
    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("should have correct styling classes", () => {
    render(<FormFieldError error="Error message" touched={true} />);
    const errorElement = screen.getByText("Error message");
    expect(errorElement).toHaveClass("text-xs", "text-destructive");
  });
});
