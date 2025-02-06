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

const DISCORD_MESSAGE_LENGTH_LIMIT = 2000;

export async function approvedTweetEngagement({
  replyTweetUrl,
  sentTweetUrl,
  longOutput,
  refinedOutput,
  sent,
}: {
  /** Tweet we are replying to */
  replyTweetUrl: string;
  /** Tweet we sent */
  sentTweetUrl: string;
  longOutput?: string;
  refinedOutput?: string;
  sent: string;
}) {
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_APPROVED_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Approved channel not found or not a text channel');
  }

  const content = [
    `**Replied To**: ${replyTweetUrl}`,
    `**Sent Tweet**: ${sentTweetUrl}`,
    longOutput ? `**Long output**: ${longOutput}` : null,
    refinedOutput ? `**Refined output**: ${refinedOutput}` : null,
    `**DOGEai**: ${sent}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (content.length > DISCORD_MESSAGE_LENGTH_LIMIT) {
    const contentShortened = [
      `**Replied To**: ${replyTweetUrl}`,
      `**Sent Tweet**: ${sentTweetUrl}`,
      `**DOGEai**: ${sent}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    await channel.send({
      content: contentShortened,
      allowedMentions: { parse: [] },
    });
    return;
  }

  await channel.send({
    content: content,
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
  refinedOutput,
}: {
  tweetUrl: string;
  question: string;
  response: string;
  refinedOutput?: string;
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
    refinedOutput ? `**Refined output**: ${refinedOutput}` : '',
    `**DOGEai**: ${response}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (content.length > DISCORD_MESSAGE_LENGTH_LIMIT) {
    const contentShortened = [
      `**Tweet**: ${tweetUrl}`,
      longOutput ? `**Long output**: ${longOutput}` : '',
      refinedOutput ? `**Refined output**: ${refinedOutput}` : '',
      `**DOGEai**: ${response}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    await channel.send({
      content: contentShortened,
      allowedMentions: { parse: [] },
    });
    return;
  }

  await channel.send({
    content: content,
    allowedMentions: { parse: [] }, // Prevents unfurling
  });
}
