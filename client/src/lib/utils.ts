import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCaseNumber(caseNumber: string | null | undefined): string {
  if (!caseNumber) return "";
  
  // Remove -0 suffix for damage prevention cases
  // 251124001-0 -> 251124001
  // 251124001-1 -> 251124001-1 (keep as is)
  if (caseNumber.endsWith("-0")) {
    return caseNumber.slice(0, -2);
  }
  
  return caseNumber;
}
