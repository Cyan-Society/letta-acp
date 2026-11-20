# Existing Letta agents in OpenBot

These opt-in policies port the private runtime protections into TypeScript source.
They do not modify a Letta App Server installation or migrate existing agent data.
Keep a verified backup before attaching a persistent agent to any new client.

## Build and configure

This branch is based on upstream `v0.1.11` (`51974915c7084af4edaed08eee6ecb565b66a8ad`)
and pins `@letta-ai/letta-agent-sdk` to `0.7.2`. Dependency upgrades require a
separate continuity check. Use Node >=22.19.0 and the repository's Bun toolchain:

```bash
bun install --frozen-lockfile
bun run check
```

Configure the custom ACP adapter to execute `node /absolute/path/to/dist/index.js`.
Set the following environment variables using the intended agent's identity:

```json
{
  "LETTA_ACP_BACKEND": "remote",
  "LETTA_APP_SERVER_URL": "ws://127.0.0.1:4500",
  "LETTA_AGENT_ID": "agent-existing",
  "LETTA_ACP_USE_DEFAULT_CONVERSATION": "1",
  "LETTA_ACP_SERVER_MODEL": "1",
  "LETTA_ACP_PERMISSION_MODE": "standard"
}
```

The ID above is an example. Supply authentication through the client's approved
secret mechanism or an existing credential-reading launcher; do not commit tokens.
Both policies require an existing agent ID and fail before agent creation when
it is missing. The default-conversation policy targets local/remote App Server
semantics. Direct `cloud` is rejected for this policy; Cloud and `cloud-oauth`
behavior has not been verified by this port.

## Conversation identity

With default routing enabled, `session/new` resumes the configured agent's
existing default. `session/load` with `default` does the same and replays up to
200 recent history messages. The initialized agent ID and conversation ID must
match the configured agent and `default`; an error stops the request with no
create-conversation fallback. Default history reads carry the agent ID through
the SDK's public command transport, including bootstrap history.

`session/list` advertises the configured default as a routing shortcut; it is
not a live existence check. Explicitly loading a numbered historical conversation
still resumes that thread. Earlier threads are not deleted or merged.

OpenBot can retain its own displayed transcript. That transcript is not evidence
of the Letta conversation receiving the next message. Creating a new OpenBot chat
with this adapter resumes the same Letta default, so those chats share Letta-side
history. Adapter sessions for the same conversation displace their earlier SDK
session; concurrent use from multiple clients needs separate validation.

Starting and loading never clears history. Explicit commands such as `/clear`
still have their ordinary harness meaning and are not disabled by this policy.

## Model and reasoning ownership

With server model control enabled, change the effective model and reasoning in
Letta. The adapter omits startup model overrides, advertises **Use Letta server
settings**, and acknowledges that choice without a model-update request. Other
ACP model selections are rejected; reasoning options are not exposed. `/model`
explains the policy without sending a model update or an LLM turn. Permission
mode controls continue to work independently.

If OpenBot has cached a previous selection, set `LETTA_ACP_SERVER_MODEL_COMPAT_ID`
to that exact adapter-level model ID (without the client provider prefix). The
adapter labels it as a second delegation choice. Selecting it does not restore
that old model or reasoning level. This is compatibility, not two-way sync or a
readout of the current effective server model. Prefer the canonical delegation
choice once the client refreshes its catalog.

Without full server model control, default sessions with no client MCP servers
are treated as read-only model discovery: startup overrides and interactive
model writes are blocked there. This is an OpenBot discovery heuristic, not an
ACP guarantee. Enable `LETTA_ACP_SERVER_MODEL=1` to protect normal sessions too.

## Optional tool budget

`LETTA_ACP_ALLOWED_TOOLS` accepts a JSON array of SDK tool names or supported MCP
wildcards. For example, `["Read","mcp__example__*"]` limits that session's tool
exposure. This does not edit the agent's saved tool configuration or memory;
the SDK applies its session allowlist when sending turns. Unset retains the SDK
default. An explicit `[]` remains an empty allowlist. Choose tools for the
intended agent rather than copying another agent's private configuration.

When a budget is explicitly set, harness `execute_command` slash commands are
blocked, including `/init`, `/doctor`, `/remember`, and `/toolset`. SDK 0.7.2 cannot
forward the allowlist through that path, and some commands start full agent
turns. Run those commands in Letta instead. Normal prompts still carry the
budget; `/model` and permission controls keep their separate policies.

## Verification and adoption

The deterministic suite uses the real adapter and pinned SDK with an isolated
App Server double. It checks fresh default resumes, reload/history replay,
history qualification, failure without replacement, model guards in discovery
and MCP sessions, cached selection compatibility, permissions, and tool budgets.
The upstream suite also covers ordinary separate threads, prompts, and acpx.

Tests against a double and a package initialize check do not establish a live
OpenBot reply, an actual Letta model change, a machine reboot, crash recovery,
or live Cloud behavior. This source port leaves the working installation in
place. Before adoption, verify the saved launcher, repeat backend no-prompt
checks with before/after data inventories, then separately validate an authorized
end-to-end turn. Keep the old launcher/runtime available for rollback.

The fork's credentialed live CI jobs are opt-in with the repository variable
`LETTA_ACP_RUN_LIVE_TESTS=1` and the appropriate provider secrets. They create test
agents and consume provider credits. Ordinary PR validation runs only the
deterministic suite, typecheck, build, and packaged consumer check.
