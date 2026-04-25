import "server-only";

/**
 * Thin dispatcher in front of the various provider SDKs. Tools call
 * runChat({ modelRef, ... }) without caring which provider runs.
 *
 * Only OpenAI is implemented; Anthropic / Google / xAI return a structured
 * "not enabled" error so the UI can surface the missing-provider state
 * cleanly. The website never installs an SDK we don't have keys for.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type RunChatInput = {
  modelRef: string; // "{providerId}:{endpoint}"
  messages: ChatMessage[];
  maxTokens?: number;
  // For headlines mode where we need a JSON-shaped response.
  responseFormat?: "text" | "json";
};

export type RunChatResult =
  | { ok: true; text: string; usage?: { input: number; output: number } }
  | { ok: false; reason: string };

export async function runChat(input: RunChatInput): Promise<RunChatResult> {
  const [providerId, endpoint] = splitModelRef(input.modelRef);
  if (!providerId || !endpoint) {
    return { ok: false, reason: "Invalid modelRef — expected 'provider:endpoint'" };
  }

  switch (providerId) {
    case "openai":
      return runOpenAI({ ...input, endpoint });
    case "anthropic":
      return {
        ok: false,
        reason: "Anthropic provider isn't wired up on the website yet.",
      };
    case "google":
      return {
        ok: false,
        reason: "Google provider isn't wired up on the website yet.",
      };
    case "xai":
      return {
        ok: false,
        reason: "xAI provider isn't wired up on the website yet.",
      };
    default:
      return { ok: false, reason: `Unknown provider: ${providerId}` };
  }
}

function splitModelRef(ref: string): [string, string] {
  const idx = ref.indexOf(":");
  if (idx < 0) return ["", ""];
  return [ref.slice(0, idx), ref.slice(idx + 1)];
}

async function runOpenAI(
  input: RunChatInput & { endpoint: string },
): Promise<RunChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "OPENAI_API_KEY is not set on the website." };
  }

  const body: Record<string, unknown> = {
    model: input.endpoint,
    messages: input.messages,
  };
  if (input.maxTokens) body.max_tokens = input.maxTokens;
  if (input.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return {
      ok: false,
      reason: `OpenAI ${res.status}: ${err.slice(0, 300) || res.statusText}`,
    };
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return {
    ok: true,
    text,
    usage: json.usage
      ? {
          input: json.usage.prompt_tokens ?? 0,
          output: json.usage.completion_tokens ?? 0,
        }
      : undefined,
  };
}
