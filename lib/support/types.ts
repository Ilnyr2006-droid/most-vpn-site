export type SupportSender = "user" | "operator";

export interface SupportConversation {
  id: string;
  visitorId: string;
  userId: string | null;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: SupportSender;
  text: string;
  createdAt: string;
}

export interface SupportSnapshot {
  conversations: SupportConversation[];
  messages: SupportMessage[];
}
