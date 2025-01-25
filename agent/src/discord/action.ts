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
  DISCORD_REJECTED_CHANNEL_ID,
  DISCORD_SERVER_ID,
} from '../const';

export async function approvedTweet({ tweetUrl }: { tweetUrl: string }) {
  const url = tweetUrl.replace('x.com', 'vxtwitter.com');
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_APPROVED_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Approved channel not found or not a text channel');
  }

  await channel.send(`**Accepted**: ${url}`);
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
  const url = tweetUrl.replace('x.com', 'vxtwitter.com');
  const guild = await discordClient.guilds.fetch(DISCORD_SERVER_ID);
  const channel = await guild.channels.fetch(DISCORD_REJECTED_CHANNEL_ID);

  if (!channel || !(channel instanceof TextChannel)) {
    throw Error('Rejection channel not found or not a text channel');
  }

  // EXAMPLE FORMAT: quote_{tweetId}_{url} or retweet_{tweetId}_{url}
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`quote_${tweetId}_${url}`)
      .setLabel('Quote')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`retweet_${tweetId}_${url}`)
      .setLabel('Retweet')
      .setStyle(ButtonStyle.Secondary),
  );

  await channel.send({
    content: `**Rejected**: ${url}\n**Reason**: ${reason}`,
    components: [row],
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
  });
}
