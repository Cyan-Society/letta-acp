# Existing-agent continuity and server settings

Port the tested private adapter policies into maintainable TypeScript on a separate branch based on upstream `v0.1.11`. Keep SDK `0.7.2` pinned; an SDK upgrade is separate work. Do not change the running integration or send any live agent turns.

## Approach

Use opt-in, typed adapter configuration and environment variables, retaining upstream behavior when unset. This source implementation replaces repeated edits to generated package files. Upgrading directly to current upstream would combine the port with an unverified SDK change, so it is excluded. The user approved the separate tested-version branch and creating `Cyan-Society/letta-acp` as its destination.

## Behavior

- `LETTA_ACP_USE_DEFAULT_CONVERSATION=1` requires an existing App Server agent. New ACP sessions and explicit `default` reloads resume that agent's default; failure never creates an agent or replacement conversation. Explicit numbered history still loads. Verify the returned agent/default pair and qualify default history with the agent ID through the SDK's public command API.
- `LETTA_ACP_SERVER_MODEL=1` requires an existing agent and ignores startup model overrides. Offer a stable delegation choice; optionally accept one explicitly configured cached model ID as another delegation choice. Block model and reasoning changes through session config and `/model`. No synchronization of displayed effective values is claimed.
- Default-session discovery without MCP tools blocks model writes even without the full server-model policy. Document this client-specific heuristic; the full policy is the protection for normal sessions.
- `LETTA_ACP_ALLOWED_TOOLS` is a JSON string array passed as a session-only SDK tool budget. No personal agent ID, tools, token, or workspace is hardcoded.
- Failed bootstrap/history reads close their SDK session. Existing permission behavior and upstream defaults remain covered.

## Verification

Use the real adapter and pinned SDK with an isolated fake App Server transport. Cover default creation/reload/listing, qualified history, failure without fallback, unexpected routing, startup and interactive model-write prevention, delegation aliases, permission controls, and tool budgets. Run the complete suite, typecheck, build, and a packaged stdio initialize smoke test. Review the branch before publication; keep the working installation unchanged. Live agent turns, actual model switches, reboots, and crash recovery remain outside this port.
