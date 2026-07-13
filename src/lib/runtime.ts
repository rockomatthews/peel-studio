export function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function paidFlowReadiness() {
  const required = [
    "OPENAI_API_KEY",
    "BLOB_READ_WRITE_TOKEN",
    "DATABASE_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "PRINTIFY_API_TOKEN",
    "PRINTIFY_SHOP_ID",
    "PRINTIFY_BLUEPRINT_ID",
    "PRINTIFY_PRINT_PROVIDER_ID",
    "PRINTIFY_VARIANT_ID",
  ] as const;

  const missing = required.filter((name) => !process.env[name]);
  return { ready: missing.length === 0, missing };
}

export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
