export type ProviderKind = "openai-compatible" | "local-agent";

export interface ProviderProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  kind: ProviderKind;
  createdAt: number;
}

export interface ProviderTestResult {
  ok: boolean;
  latencyMs: number;
  status?: number;
  modelDetected?: string;
  message: string;
}
