declare global {
  interface Env {
    DB: D1Database;
    LEARN_CACHE?: KVNamespace;
    AI?: Ai;
    NEMESIS_AI_GATEWAY_ID?: string;
    CF_AIG_TOKEN?: string;
    CLOUDFLARE_API_TOKEN?: string;
    CODE_COACH_AI_MODEL?: string;
    CLOUDFLARE_ACCOUNT_ID?: string;
    /** Comma-separated learn_uid values allowed to access /learn/admin */
    LEARN_ADMIN_UIDS?: string;
  }

  interface CloudflareEnvironment extends Env {}
}

export {};
