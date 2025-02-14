import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Interaction,
  ModalSubmitInteraction,
  EmbedBuilder,
} from 'discord.js';
import { inngest } from '../inngest';

export const discordClient: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

discordClient.on(Events.InteractionCreate, async (interaction: Interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    try {
      // EXAMPLE: customIds look like: "quote_12345_https://twitter.com/dogeai_gov/status/1882760329685582075"
      // ANOTHER EXAMPLE: "retweet_12345_https://twitter.com/dogeai_gov/status/1882760329685582075"
      // Twitter usernames might have underscores.
      const [action, itemId, ...rest] = interaction.customId.split('_');
      const itemUrl = rest.join('_');

      if (!itemId || !itemUrl) return;

      if (action === 'tag') {
        await inngest.send([
          {
            name: 'tweet.execute',
            data: {
              tweetId: itemId,
              tweetUrl: itemUrl,
              action: 'tag',
            },
          },
        ]);

        const embed = new EmbedBuilder()
          .setTitle('Answering Tag!')
          .setDescription(`Sending to queue: **${itemUrl}**`)
          .setColor(0x00ae86);

        await interaction.reply({
          embeds: [embed],
        });
      } else if (action === 'reply') {
        await inngest.send([
          {
            name: 'tweet.execute',
            data: {
              tweetId: itemId,
              tweetUrl: itemUrl,
              action: 'reply',
            },
          },
        ]);

        const embed = new EmbedBuilder()
          .setTitle('Replying!')
          .setDescription(`Sending to queue: **${itemUrl}**`)
          .setColor(0x00ae86);

        await interaction.reply({
          embeds: [embed],
        });
      } else if (action === 'engage') {
        await inngest.send([
          {
            name: 'tweet.execute.interaction',
            data: {
              tweetId: itemId,
              tweetUrl: itemUrl,
              action: 'reply',
            },
          },
        ]);

        const embed = new EmbedBuilder()
          .setTitle('Engaging!')
          .setDescription(`Sending to queue: **${itemUrl}**`)
          .setColor(0x00ae86);

        await interaction.reply({
          embeds: [embed],
        });
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      if (!interaction.replied) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('An error occurred while handling your request.')
          .setColor(0xff0000);

        await interaction.reply({
          embeds: [errorEmbed],
        });
      }
    }
  }
});
