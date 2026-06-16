import { describe, it, expect } from "vitest";
import {
  ValidationRules,
  validateField,
  validateForm,
  hasFormErrors,
} from "./validation";

describe("Form Validation Utils", () => {
  describe("ValidationRules.email", () => {
    it("should reject empty email", () => {
      expect(ValidationRules.email("")).toBeTruthy();
    });

    it("should reject invalid email format", () => {
      expect(ValidationRules.email("invalid")).toBeTruthy();
      expect(ValidationRules.email("test@")).toBeTruthy();
    });

    it("should accept valid email", () => {
      expect(ValidationRules.email("test@example.com")).toBeNull();
      expect(ValidationRules.email("user.name+tag@example.co.uk")).toBeNull();
    });
  });

  describe("ValidationRules.password", () => {
    it("should reject empty password", () => {
      expect(ValidationRules.password("")).toBeTruthy();
    });

    it("should reject short password", () => {
      expect(ValidationRules.password("Abc123")).toBeTruthy();
    });

    it("should reject password without uppercase", () => {
      expect(ValidationRules.password("abcdef123456")).toBeTruthy();
    });

    it("should reject password without number", () => {
      expect(ValidationRules.password("Abcdefghij")).toBeTruthy();
    });

    it("should accept strong password", () => {
      expect(ValidationRules.password("ValidPassword123")).toBeNull();
    });
  });

  describe("ValidationRules.fullName", () => {
    it("should reject empty name", () => {
      expect(ValidationRules.fullName("")).toBeTruthy();
    });

    it("should reject short name", () => {
      expect(ValidationRules.fullName("A")).toBeTruthy();
    });

    it("should accept valid name", () => {
      expect(ValidationRules.fullName("John Doe")).toBeNull();
    });
  });

  describe("ValidationRules.amount", () => {
    it("should reject zero or negative", () => {
      expect(ValidationRules.amount("0")).toBeTruthy();
      expect(ValidationRules.amount("-100")).toBeTruthy();
    });

    it("should reject non-numeric", () => {
      expect(ValidationRules.amount("abc")).toBeTruthy();
    });

    it("should accept valid amounts", () => {
      expect(ValidationRules.amount("100")).toBeNull();
      expect(ValidationRules.amount(5000)).toBeNull();
    });
  });

  describe("validateField", () => {
    it("should apply multiple rules", () => {
      const rules = [
        (v: string) => !v ? "Required" : null,
        (v: string) => v.length < 3 ? "Too short" : null,
      ];

      expect(validateField("name", "", rules)).toBe("Required");
      expect(validateField("name", "ab", rules)).toBe("Too short");
      expect(validateField("name", "valid", rules)).toBeNull();
    });
  });

  describe("validateForm", () => {
    it("should validate entire form", () => {
      const schema = {
        email: [ValidationRules.email],
        password: [ValidationRules.password],
      };

      const validForm = { email: "test@example.com", password: "ValidPass123" };
      expect(validateForm(validForm, schema)).toEqual({});

      const invalidForm = { email: "invalid", password: "weak" };
      const errors = validateForm(invalidForm, schema);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(errors.email).toBeTruthy();
      expect(errors.password).toBeTruthy();
    });
  });

  describe("hasFormErrors", () => {
    it("should detect errors", () => {
      expect(hasFormErrors({})).toBe(false);
      expect(hasFormErrors({ email: "Invalid email" })).toBe(true);
    });
  });
});
