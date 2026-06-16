import { initGA } from './analytics';

// Initialize Google Analytics if measurement ID is provided
if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
  initGA(import.meta.env.VITE_GA_MEASUREMENT_ID);
}