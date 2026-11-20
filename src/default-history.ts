import type {
  LettaCodeSession,
  ListMessagesResult,
  SDKProtocolMessage,
} from "@letta-ai/letta-agent-sdk";

type DefaultHistoryResponse = SDKProtocolMessage & {
  success?: boolean;
  error?: string;
  messages?: ListMessagesResult["messages"];
  next_before?: string | null;
  has_more?: boolean;
};

/**
 * SDK 0.7.2 omits agent_id when reading App Server's agent-scoped `default`.
 * Use its public, initialized transport instead of accessing a private controller
 * or opening a second connection. Install before bootstrapState reads history.
 */
export function qualifyDefaultHistory(session: LettaCodeSession, agentId: string): void {
  const listMessages = session.listMessages.bind(session);
  session.listMessages = async ({ conversationId, ...query } = {}) => {
    if (conversationId && conversationId !== "default") {
      return listMessages({ conversationId, ...query });
    }
    const page = await session.sendCommand<DefaultHistoryResponse>({
      type: "conversation_messages_list",
      conversation_id: "default",
      query: { ...query, agent_id: agentId },
    }, { responseType: "conversation_messages_list_response" });
    if (!page.success) throw new Error(page.error ?? "Default history read failed");
    return { messages: page.messages ?? [], nextBefore: page.next_before, hasMore: page.has_more };
  };
}
