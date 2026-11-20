import { homedir } from "node:os";
import { join } from "node:path";
import type {
  LettaCodeClientOptions,
  PermissionMode,
} from "@letta-ai/letta-agent-sdk";

export interface LettaAcpConfig {
  /** Letta backend client options (local | remote | cloud | cloud-oauth). */
  clientOptions: LettaCodeClientOptions;
  /** Reuse an existing agent instead of creating one on first session. */
  agentId?: string;
  /** Model override for sessions (e.g. "anthropic/claude-sonnet-4"). */
  model?: string;
  /** Resume the configured App Server agent's default instead of creating threads. */
  useDefaultConversation?: boolean;
  /** Delegate all model and reasoning selection to the existing Letta agent. */
  serverModel?: boolean;
  /** One cached client model ID accepted only as another delegation choice. */
  serverModelCompatId?: string;
  /** Session-only SDK tool budget; undefined retains the server's default tools. */
  allowedTools?: string[];
  /** Letta permission mode; tool approvals are forwarded to the ACP client. */
  permissionMode: PermissionMode;
  /** Directory for controller-owned ACP session metadata; null keeps it in memory. */
  sessionRegistryDir?: string | null;
  /** Separates records belonging to different Letta backends. */
  sessionRegistryScope?: string;
  /**
   * Deadline for permission requests raised outside a prompt turn, where the
   * ACP client has no obligation to answer. Defaults to five minutes.
   */
  outOfTurnPermissionTimeoutMs?: number;
  /**
   * How long a turn stays open after the server reports completion while still
   * listing active runs. Defaults to 30 seconds.
   */
  prematureResultGraceMs?: number;
}

const PERMISSION_MODES: PermissionMode[] = [
  "standard",
  "acceptEdits",
  "unrestricted",
];

const BACKENDS = ["local", "remote", "cloud", "cloud-oauth"] as const;
export const DEFAULT_ACP_MODEL = "letta/auto";

function policyFlag(env: Record<string, string | undefined>, name: string): boolean {
  const value = env[name];
  if (value === undefined || value === "0") return false;
  if (value === "1") return true;
  throw new Error(`${name} must be 0 or 1`);
}

function toolBudget(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === "string" && item.trim().length > 0)) {
      return parsed;
    }
  } catch { /* Report the same actionable error for malformed JSON and shapes. */ }
  throw new Error("LETTA_ACP_ALLOWED_TOOLS must be a JSON array of nonempty tool names");
}

/** Also applied by the agent constructor for callers supplying typed config. */
export function validateSessionPolicies(config: LettaAcpConfig): void {
  if ((config.useDefaultConversation || config.serverModel) && !config.agentId?.trim()) {
    throw new Error("Default-conversation and server-model policies require an existing agent (LETTA_AGENT_ID)");
  }
  if (config.useDefaultConversation && config.clientOptions.backend === "cloud") {
    throw new Error("Default-conversation routing is supported only by the App Server backends, not direct cloud");
  }
}

export function configFromEnv(
  env: Record<string, string | undefined> = process.env,
): LettaAcpConfig {
  const backend = env.LETTA_ACP_BACKEND ?? "local";

  let clientOptions: LettaCodeClientOptions;
  let sessionRegistryScope = backend;
  switch (backend) {
    case "local":
      clientOptions = {
        backend: "local",
        appServer: { pinGlobalAgent: false },
      };
      break;
    case "remote": {
      const url = env.LETTA_APP_SERVER_URL ?? "ws://127.0.0.1:4500";
      clientOptions = {
        backend: "remote",
        url,
        authToken: env.LETTA_APP_SERVER_TOKEN,
        pinGlobalAgent: false,
      };
      sessionRegistryScope = `remote:${url}`;
      break;
    }
    case "cloud": {
      const apiKey = env.LETTA_API_KEY;
      if (!apiKey) {
        throw new Error(
          "LETTA_ACP_BACKEND=cloud requires LETTA_API_KEY. " +
            'To use your existing `letta login` session instead, set LETTA_ACP_BACKEND="cloud-oauth".',
        );
      }
      clientOptions = { backend: "cloud", apiKey };
      break;
    }
    case "cloud-oauth":
      sessionRegistryScope = "cloud";
      // Cloud agents authenticated through the letta-code harness rather than
      // an explicit API key: the SDK spawns a local app-server pointed at
      // Letta Cloud, and that harness resolves credentials the same way the
      // CLI does (OS keychain tokens from `letta login`, with automatic
      // refresh, falling back to LETTA_API_KEY when present). Tools still
      // execute on this machine.
      clientOptions = {
        backend: "local",
        appServer: {
          harnessBackend: "api",
          pinGlobalAgent: false,
        },
      };
      break;
    default:
      throw new Error(
        `Unknown LETTA_ACP_BACKEND "${backend}" (expected ${BACKENDS.join(" | ")})`,
      );
  }

  const permissionMode = env.LETTA_ACP_PERMISSION_MODE ?? "standard";
  if (!PERMISSION_MODES.includes(permissionMode as PermissionMode)) {
    throw new Error(
      `Unknown LETTA_ACP_PERMISSION_MODE "${permissionMode}" (expected ${PERMISSION_MODES.join(" | ")})`,
    );
  }

  const serverModel = policyFlag(env, "LETTA_ACP_SERVER_MODEL");
  const config: LettaAcpConfig = {
    clientOptions,
    agentId: env.LETTA_AGENT_ID,
    model: serverModel ? undefined : env.LETTA_ACP_MODEL,
    useDefaultConversation: policyFlag(env, "LETTA_ACP_USE_DEFAULT_CONVERSATION"),
    serverModel,
    serverModelCompatId: env.LETTA_ACP_SERVER_MODEL_COMPAT_ID || undefined,
    allowedTools: toolBudget(env.LETTA_ACP_ALLOWED_TOOLS),
    permissionMode: permissionMode as PermissionMode,
    sessionRegistryDir:
      env.LETTA_ACP_STATE_DIR ?? join(homedir(), ".letta", "letta-acp", "sessions"),
    sessionRegistryScope,
  };
  validateSessionPolicies(config);
  return config;
}
