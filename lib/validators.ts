import { z } from "zod";
import { defaultPrompts } from "@/lib/prompts";

export const createEventSchema = z.object({
  adminPassword: z.string().min(1),
  title: z.string().min(2).max(120),
  date: z.string().optional(),
  description: z.string().max(500).optional(),
  photoTarget: z.coerce.number().int().min(1).max(200).default(25),
  promptsEnabled: z.coerce.boolean().default(true),
  promptsText: z.string().optional(),
});

export function parsePrompts(text?: string): string[] {
  const items = (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return items.length > 0 ? items : defaultPrompts;
}
