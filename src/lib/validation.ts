/**
 * Standardized form validation utilities
 * Ensures consistent error handling across the app
 */

export interface FormError {
  [key: string]: string;
}

export const ValidationRules = {
  email: (value: string): string | null => {
    if (!value.trim()) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Please enter a valid email address.";
    return null;
  },

  password: (value: string, minLength = 8): string | null => {
    if (!value) return "Password is required.";
    if (value.length < minLength) return `Password must be at least ${minLength} characters.`;
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(value)) return "Password must contain at least one number.";
    return null;
  },

  fullName: (value: string): string | null => {
    if (!value.trim()) return "Full name is required.";
    if (value.trim().length < 2) return "Full name must be at least 2 characters.";
    return null;
  },

  title: (value: string, minLength = 3): string | null => {
    if (!value.trim()) return "Title is required.";
    if (value.trim().length < minLength) return `Title must be at least ${minLength} characters.`;
    return null;
  },

  description: (value: string, minLength = 10): string | null => {
    if (!value.trim()) return "Description is required.";
    if (value.trim().length < minLength) return `Description must be at least ${minLength} characters.`;
    return null;
  },

  location: (value: string): string | null => {
    if (!value.trim()) return "Location is required.";
    return null;
  },

  amount: (value: string | number, minValue = 1): string | null => {
    if (!value || Number(value) <= 0) return `Amount must be greater than ${minValue - 1}.`;
    if (isNaN(Number(value))) return "Please enter a valid number.";
    return null;
  },

  percentage: (value: string | number): string | null => {
    if (value === "" || value === null || value === undefined) return "Percentage is required.";
    const num = Number(value);
    if (isNaN(num)) return "Please enter a valid number.";
    if (num < 0 || num > 100) return "Percentage must be between 0 and 100.";
    return null;
  },

  url: (value: string): string | null => {
    if (!value.trim()) return null; // URLs are often optional
    try {
      new URL(value);
      return null;
    } catch {
      return "Please enter a valid URL.";
    }
  },

  phone: (value: string): string | null => {
    if (!value.trim()) return "Phone number is required.";
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(value)) return "Please enter a valid phone number.";
    return null;
  },

  required: (value: string | number | boolean | null | undefined, fieldName = "This field"): string | null => {
    if (!value && value !== 0 && value !== false) return `${fieldName} is required.`;
    return null;
  },

  minLength: (value: string, min: number, fieldName = "This field"): string | null => {
    if (!value) return null;
    if (value.length < min) return `${fieldName} must be at least ${min} characters.`;
    return null;
  },

  maxLength: (value: string, max: number, fieldName = "This field"): string | null => {
    if (!value) return null;
    if (value.length > max) return `${fieldName} must be no more than ${max} characters.`;
    return null;
  },

  match: (value: string, compareValue: string, fieldName = "Fields"): string | null => {
    if (value !== compareValue) return `${fieldName} do not match.`;
    return null;
  },
};

/**
 * Validate a single form field
 */
export const validateField = (
  fieldName: string,
  value: any,
  rules: Array<(val: any) => string | null>
): string | null => {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
};

/**
 * Validate entire form object
 */
export const validateForm = (
  formData: Record<string, any>,
  validationSchema: Record<string, Array<(val: any) => string | null>>
): FormError => {
  const errors: FormError = {};

  for (const [fieldName, rules] of Object.entries(validationSchema)) {
    const error = validateField(fieldName, formData[fieldName], rules);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
};

/**
 * Clear errors for a specific field
 */
export const clearFieldError = (errors: FormError, fieldName: string): FormError => {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
};

/**
 * Check if form has any errors
 */
export const hasFormErrors = (errors: FormError): boolean => {
  return Object.keys(errors).length > 0;
};
