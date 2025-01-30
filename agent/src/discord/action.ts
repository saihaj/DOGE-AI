import {
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { discordClient } from './client';
import {
  DISCORD_APPROVED_CHANNEL_ID,
  DISCORD_ERROR_LOG_CHANNEL_ID,
  DISCORD_LOCAL_TWEETS_CHANNEL_ID,
  DISCORD_REJECTED_CHANNEL_ID,
  DISCORD_SERVER_ID,
} from '../const';

export async function approvedTweetEngagement({
  tweetUrl,
  longOutput,
  refinedOutput,
}: {
  tweetUrl: string;
  longOutput: string;
  refinedOutput: string;
}) {
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_APPROVED_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Approved channel not found or not a text channel');
  }

  await channel.send({
    content: `${tweetUrl}\n\n**Long output**: ${longOutput}\n\n **Refined output**: ${refinedOutput}`,
    allowedMentions: { parse: [] },
  });
}

export async function approvedTweetReply({ tweetUrl }: { tweetUrl: string }) {
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_APPROVED_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Approved channel not found or not a text channel');
  }

  await channel.send({
    content: `**Accepted**: ${tweetUrl}`,
    allowedMentions: { parse: [] },
  });
}

export async function rejectedTweet({
  tweetUrl,
  tweetId,
  reason,
}: {
  tweetId: string;
  tweetUrl: string;
  reason: string;
}) {
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_REJECTED_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Rejection channel not found or not a text channel');
  }

  // EXAMPLE FORMAT: quote_{tweetId}_{url} or retweet_{tweetId}_{url}
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_${tweetId}_${tweetUrl}`)
      .setLabel('Quote')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`retweet_${tweetId}_${tweetUrl}`)
      .setLabel('Retweet')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `**Rejected**: ${tweetUrl}\n**Reason**: ${reason}`,
    components: [row],
    allowedMentions: { parse: [] },
  });
}

export async function reportFailureToDiscord({ message }: { message: string }) {
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_ERROR_LOG_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Rejection channel not found or not a text channel');
  }
  await channel.send({
    content: message,
    allowedMentions: { parse: [] },
  });
}

export async function sendDevTweet({
  tweetUrl,
  question,
  response,
  longOutput,
}: {
  tweetUrl: string;
  question: string;
  response: string;
  longOutput?: string;
}) {
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_LOCAL_TWEETS_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Rejection channel not found or not a text channel');
  }

  const content = [
    `**Tweet**: ${tweetUrl}`,
    `**User**: ${question}`,
    longOutput ? `**Long output**: ${longOutput}` : '',
    `**DOGEai**: ${response}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  await channel.send({
    content: content,
    allowedMentions: { parse: [] }, // Prevents unfurling
  });
}
