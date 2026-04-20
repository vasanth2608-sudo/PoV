export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
