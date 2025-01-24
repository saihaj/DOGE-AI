import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import {
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Guild,
} from 'discord.js';
import client from './bot';
import { SERVER_ID, APPROVED_CHANNEL_ID, REJECTED_CHANNEL_ID } from './const';

const app = express();
app.use(express.json());

// -------------------- APPROVED ENDPOINT --------------------
app.post('/approved', async (req: Request, res: Response) => {
  try {
    const { id, url: originalUrl } = req.body;
    if (!id || !originalUrl) {
      return res
        .status(400)
        .json({ error: 'Request body must contain id and url' });
    }
    // Validate that id is a number
    const numId = Number(id);
    if (isNaN(numId)) {
      return res.status(400).json({ error: 'id must be a number' });
    }

    const url = originalUrl.replace('twitter.com', 'vxtwitter.com');

    const guild: Guild = await client.guilds.fetch(SERVER_ID);
    const channel = await guild.channels.fetch(APPROVED_CHANNEL_ID);

    if (!channel || !(channel instanceof TextChannel)) {
      return res
        .status(404)
        .json({ error: 'Approved channel not found or not a text channel' });
    }

    await channel.send(`**Accepted**: ${url}`);

    return res.status(200).json({ message: 'Approved message sent!' });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'An error occurred while sending approved message' });
  }
});

// -------------------- REJECTED ENDPOINT --------------------
app.post('/rejected', async (req: Request, res: Response) => {
  try {
    const { id, url: originalUrl, reason } = req.body;
    if (!id || !originalUrl || !reason) {
      return res.status(400).json({
        error: 'Request body must contain id, url, and reason',
      });
    }
    // Validate that id is a number
    const numId = Number(id);
    if (isNaN(numId)) {
      return res.status(400).json({ error: 'id must be a number' });
    }

    const url = originalUrl.replace('twitter.com', 'vxtwitter.com');

    const guild: Guild = await client.guilds.fetch(SERVER_ID);
    const channel = await guild.channels.fetch(REJECTED_CHANNEL_ID);

    if (!channel || !(channel instanceof TextChannel)) {
      return res
        .status(404)
        .json({ error: 'Rejected channel not found or not a text channel' });
    }

    // EXAMPLE FORMAT: quote_{id}_{url} or retweet_{id}_{url}
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`quote_${id}_${url}`)
        .setLabel('Quote')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`retweet_${id}_${url}`)
        .setLabel('Retweet')
        .setStyle(ButtonStyle.Secondary),
    );

    await channel.send({
      content: `**Rejected**: ${url}\n**Reason**: ${reason}`,
      components: [row],
    });

    return res.status(200).json({ message: 'Rejected message sent!' });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'An error occurred while sending rejected message' });
  }
});

export default app;
