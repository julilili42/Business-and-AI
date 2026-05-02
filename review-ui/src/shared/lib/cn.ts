import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind-aware classNames helper.
 *
 * Combines clsx's conditional API with tailwind-merge's conflict
 * resolution — so `cn("p-2", condition && "p-4")` correctly yields
 * `p-4` rather than both classes fighting each other.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
