import { describe, expect, test } from "bun:test";
import { configFromEnv, DEFAULT_ACP_MODEL } from "../src/config.js";

describe("ACP agent defaults", () => {
  test("keeps the session model unset and disables global pinning by default", () => {
    const config = configFromEnv({});

    expect(config.agentId).toBeUndefined();
    expect(config.model).toBeUndefined();
    expect(DEFAULT_ACP_MODEL).toBe("letta/auto");
    expect(config.clientOptions).toEqual({
      backend: "local",
      appServer: { pinGlobalAgent: false },
    });
  });

  test("preserves explicit agent and model overrides", () => {
    const config = configFromEnv({
      LETTA_AGENT_ID: "agent-existing",
      LETTA_ACP_MODEL: "anthropic/claude-sonnet-4",
    });

    expect(config.agentId).toBe("agent-existing");
    expect(config.model).toBe("anthropic/claude-sonnet-4");
  });

  test("disables global pinning for remote and cloud-oauth app servers", () => {
    expect(
      configFromEnv({ LETTA_ACP_BACKEND: "remote" }).clientOptions,
    ).toMatchObject({
      backend: "remote",
      pinGlobalAgent: false,
    });
    expect(
      configFromEnv({ LETTA_ACP_BACKEND: "cloud-oauth" }).clientOptions,
    ).toEqual({
      backend: "local",
      appServer: {
        harnessBackend: "api",
        pinGlobalAgent: false,
      },
    });
  });

  test("parses opt-in policies without retaining a startup model override", () => {
    const config = configFromEnv({
      LETTA_AGENT_ID: "agent-existing",
      LETTA_ACP_USE_DEFAULT_CONVERSATION: "1",
      LETTA_ACP_SERVER_MODEL: "1",
      LETTA_ACP_MODEL: "stale/model-high",
      LETTA_ACP_SERVER_MODEL_COMPAT_ID: "cached-model-high",
      LETTA_ACP_ALLOWED_TOOLS: '["Read","mcp__example__*"]',
    });
    expect(config).toMatchObject({
      useDefaultConversation: true,
      serverModel: true,
      serverModelCompatId: "cached-model-high",
      allowedTools: ["Read", "mcp__example__*"],
    });
    expect(config.model).toBeUndefined();
  });

  test("rejects invalid policy switches and tool budgets", () => {
    for (const key of ["LETTA_ACP_USE_DEFAULT_CONVERSATION", "LETTA_ACP_SERVER_MODEL"]) {
      expect(() => configFromEnv({ [key]: "true" })).toThrow(key);
      expect(() => configFromEnv({ [key]: "1" })).toThrow("existing agent");
    }
    for (const value of ['not-json', '{}', '[null]', '[""]', '["  "]']) {
      expect(() => configFromEnv({ LETTA_ACP_ALLOWED_TOOLS: value })).toThrow("LETTA_ACP_ALLOWED_TOOLS");
    }
    expect(configFromEnv({ LETTA_ACP_ALLOWED_TOOLS: '[]' }).allowedTools).toEqual([]);
    expect(configFromEnv({ LETTA_ACP_SERVER_MODEL: "0" }).serverModel).toBe(false);
  });
});
