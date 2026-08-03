import { proxyTestProvider } from "@/lib/ai/proxy";
import type { ProviderProfile, ProviderTestResult } from "./types";

export async function testProvider(
  p: ProviderProfile,
): Promise<ProviderTestResult> {
  const result = await proxyTestProvider({
    data: {
      baseUrl: p.baseUrl,
      apiKey: p.apiKey ?? "",
      model: p.defaultModel,
    },
  });
  return result;
}
