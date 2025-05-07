console.log('Starting the bot...');
require('./server.js');

require('dotenv').config();
const Enmap = require("enmap");
const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const faqMap = new Enmap({ name: "faq" });

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('addfaq')
      .setDescription('Save a message content as a FAQ tag.')
      .addStringOption(option =>
        option.setName('tag').setDescription('Tag name').setRequired(true))
      .addStringOption(option =>
        option.setName('message_id').setDescription('Message ID to fetch').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('faq')
      .setDescription('Reply with a saved FAQ.')
      .addStringOption(option =>
        option.setName('tag').setDescription('Tag name').setRequired(true).setAutocomplete(true)),

    new SlashCommandBuilder()
      .setName('removefaq')
      .setDescription('Remove a saved FAQ by tag.')
      .addStringOption(option =>
        option.setName('tag').setDescription('Tag name').setRequired(true).setAutocomplete(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('listfaq')
      .setDescription('List all saved FAQ tags with a preview.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ];

  for (const guild of client.guilds.cache.values()) {
    await guild.commands.set(commands);
    console.log(`🔧 Registered commands in ${guild.name}`);
  }
});

client.on('interactionCreate', async interaction => {
  // Autocomplete handler
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused();
    const choices = faqMap.keyArray();
    const filtered = choices.filter(tag =>
      tag.toLowerCase().includes(focused.toLowerCase())
    );

    const MAX_NAME_LENGTH = 100;
    const SEPARATOR = ': ';

    const results = filtered.slice(0, 25).map(tag => {
      let content = faqMap.get(tag);
      if (!content) return null;

      content = content.replace(/\s+/g, ' ').trim();

      const shortTag = tag.slice(0, 50);
      const maxContentLength = MAX_NAME_LENGTH - (shortTag.length + SEPARATOR.length);
      let shortContent = content.slice(0, maxContentLength);

      if (content.length > maxContentLength) {
        shortContent = shortContent.slice(0, maxContentLength - 3) + '...';
      }

      return {
        name: `${shortTag}${SEPARATOR}${shortContent}`,
        value: tag
      };
    }).filter(Boolean);

    await interaction.respond(results);
    return;
  }

  if (!interaction.isCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'addfaq') {
    const tag = interaction.options.getString('tag');
    const messageId = interaction.options.getString('message_id');

    try {
      const message = await interaction.channel.messages.fetch(messageId);
      faqMap.set(tag, message.content);
      await interaction.reply({
        content: `✅ Saved FAQ under tag: \`${tag}\``,
        ephemeral: true
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Failed to fetch the message. Please check the ID and try again.',
        ephemeral: true
      });
    }
  }

  if (commandName === 'faq') {
    const tag = interaction.options.getString('tag');
    const content = faqMap.get(tag);

    if (content) {
      await interaction.channel.send(content);
      await interaction.reply({
        content: `✅ Sent FAQ under tag: \`${tag}\``,
        ephemeral: true
      });
    } else {
      await interaction.reply({ content: '❌ Tag not found.', ephemeral: true });
    }
  }

  if (commandName === 'removefaq') {
    const tag = interaction.options.getString('tag');

    if (faqMap.has(tag)) {
      faqMap.delete(tag);
      await interaction.reply({
        content: `🗑️ Removed FAQ \`${tag}\``,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: '❌ Tag not found.',
        ephemeral: true
      });
    }
  }

  if (commandName === 'listfaq') {
    const tags = faqMap.keyArray();
    if (tags.length === 0) {
      return interaction.reply({
        content: '❌ No FAQs saved.',
        ephemeral: true
      });
    }

    const list = tags.map(tag => {
      let content = faqMap.get(tag).replace(/\s+/g, ' ').trim();
      if (content.length > 65) content = content.slice(0, 65) + '...';
      return `• **${tag}**: ${content}`;
    }).join('\n');

    await interaction.reply({ content: list.slice(0, 2000), ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
