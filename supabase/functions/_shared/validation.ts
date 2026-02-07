// Shared validation utilities for edge functions
// Uses Zod for schema validation

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Common validation schemas
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format");
export const emailSchema = z.string().email("Invalid email format");
export const uuidSchema = z.string().uuid("Invalid UUID format");
export const positiveIntegerSchema = z.number().int().positive("Must be a positive integer");
export const nonNegativeIntegerSchema = z.number().int().nonnegative("Must be a non-negative integer");
export const centsSchema = z.number().int().nonnegative("Must be a non-negative integer (cents)");

// Validation helper function
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<{ success: true; data: T } | { success: false; error: string; status: number }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { 
        success: false, 
        error: `Validation error: ${errorMessage}`, 
        status: 400 
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Invalid request body", 
      status: 400 
    };
  }
}

// Helper to validate query parameters
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  url: URL
): { success: true; data: T } | { success: false; error: string; status: number } {
  try {
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { 
        success: false, 
        error: `Validation error: ${errorMessage}`, 
        status: 400 
      };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Invalid query parameters", 
      status: 400 
    };
  }
}























