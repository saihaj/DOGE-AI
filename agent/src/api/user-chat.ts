import { Static, Type } from '@sinclair/typebox';

export const UserChatStreamInput = Type.Object({
  id: Type.String(),
  messages: Type.Array(Type.Any()),
  selectedChatModel: Type.String(),
  selectedOrgId: Type.String(),
});
export type UserChatStreamInput = Static<typeof UserChatStreamInput>;
