import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Interaction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  EmbedBuilder,
} from 'discord.js';
import { sendInngestRequest } from './utils';
import { MAX_TWEET_LENGTH } from './const';
const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    try {
      // EXAMPLE: customIds look like: "quote_12345_https://twitter.com/dogeai_gov/status/1882760329685582075"
      // ANOTHER EXAMPLE: "retweet_12345_https://twitter.com/dogeai_gov/status/1882760329685582075"
      // Twitter usernames might have underscores.
      const [action, itemId, ...rest] = interaction.customId.split('_');
      const itemUrl = rest.join('_');

      if (!itemId || !itemUrl) return;

      if (action === 'quote') {
        const encodedUrl = encodeURIComponent(itemUrl);
        const modal = new ModalBuilder()
          .setCustomId(`quote_modal_${itemId}_${encodedUrl}`)
          .setTitle('Quote Tweet')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('quote_text')
                .setLabel('Quote topic')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(MAX_TWEET_LENGTH),
            ),
          );

        await interaction.showModal(modal);
      } else if (action === 'retweet') {
        await sendInngestRequest({
          type: 'retweet',
          itemId: Number(itemId),
          itemUrl,
        });

        const originalMessage = interaction.message;
        if (originalMessage) {
          await originalMessage.edit({
            content: `${originalMessage.content}\n\n**Retweeted**: ${itemUrl}`,
            components: originalMessage.components,
          });
        }

        const retweetEmbed = new EmbedBuilder()
          .setTitle('Retweet Sent!')
          .setDescription(`Sending retweet for queue: **${itemUrl}**`)
          .setColor(0x00ae86);

        await interaction.reply({
          embeds: [retweetEmbed],
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

  // Handle modal submissions
  else if (interaction.isModalSubmit()) {
    const modalInteraction = interaction as ModalSubmitInteraction;
    try {
      const [modalType, modalKeyword, itemId, ...rest] =
        modalInteraction.customId.split('_');
      if (modalType === 'quote' && modalKeyword === 'modal') {
        const encodedUrl = rest.join('_');

        const itemUrl = decodeURIComponent(encodedUrl);
        const quoteText =
          modalInteraction.fields.getTextInputValue('quote_text');

        await sendInngestRequest({
          type: 'quote',
          itemId: Number(itemId),
          itemUrl,
          text: quoteText,
        });

        const originalMessage = modalInteraction.message;
        if (originalMessage) {
          await originalMessage.edit({
            content: `${originalMessage.content}\n\n**Quoted**: "${quoteText}"`,
            components: originalMessage.components,
          });
        }

        const quoteEmbed = new EmbedBuilder()
          .setTitle('Quote Tweet Sent!')
          .setDescription(
            `Sending quote for queue: **${itemUrl}** "${quoteText}"`,
          )
          .setColor(0x00ae86);

        await modalInteraction.reply({
          embeds: [quoteEmbed],
        });
      }
    } catch (error) {
      console.error('Error handling modal submission:', error);
      if (!modalInteraction.replied) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('An error occurred while submitting your quote.')
          .setColor(0xff0000);

        await modalInteraction.reply({
          embeds: [errorEmbed],
        });
      }
    }
  }
});

export default client;
