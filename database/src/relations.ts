import { relations } from 'drizzle-orm/relations';
import { bill, billVector, user, chat, message, messageVector } from './schema';

export const billVectorRelations = relations(billVector, ({ one }) => ({
  bill: one(bill, {
    fields: [billVector.bill],
    references: [bill.id],
  }),
}));

export const billRelations = relations(bill, ({ many }) => ({
  billVectors: many(billVector),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(user, {
    fields: [chat.user],
    references: [user.id],
  }),
  messages: many(message),
}));

export const userRelations = relations(user, ({ many }) => ({
  chats: many(chat),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
  chat: one(chat, {
    fields: [message.chat],
    references: [chat.id],
  }),
  messageVectors: many(messageVector),
}));

export const messageVectorRelations = relations(messageVector, ({ one }) => ({
  message: one(message, {
    fields: [messageVector.message],
    references: [message.id],
  }),
}));
