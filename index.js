const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');


const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

const client = new Client({ checkUpdate: false });

const { token, prefix, ownerId } = config;
const autoMessages = new Map();
const activeCodes = new Set();
const helpDescriptions = {
  am: 'Usage: .am <channel id or channel ping> <message> <time in seconds>\nSets an automatic message in the specified channel.',
  listam: 'Usage: .listam\nLists all active automatic messages.',
  info: 'Usage: .info <code>\nShows details about the automatic message with the specified code.',
  stop: 'Usage: .stop <code>\nStops the automatic message with the specified code.',
  edit: 'Usage: .edit <time/message> <code> <new time/message>\nEdits the time or message of the automatic message with the specified code.',
  help: 'Usage: .help\nShows all available commands.',
  helpinfo: 'Usage: .helpinfo <command>\nShows detailed information about the specified command.'
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

function startAutoMessage(autoMsg) {
  autoMsg.interval = setInterval(() => {
    const guild = client.guilds.cache.get(autoMsg.guildId);
    if (!guild) return;
    const targetChannel = guild.channels.cache.find(ch => ch.name === autoMsg.channelName);
    if (targetChannel) {
      targetChannel.send(autoMsg.msgContent).catch(err => console.error(err));
    }
  }, autoMsg.duration * 1000);
}

client.on('messageCreate', async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  if (message.author.id !== ownerId) {
    return; 
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'am') {
    const channelArg = args.shift();
    const duration = parseInt(args.pop(), 10);
    const msgContent = args.join(' ');

    const channel = message.mentions.channels.first() || client.channels.cache.get(channelArg);
    if (!channel) {
      return message.reply('Invalid channel specified.');
    }

    const guildId = channel.guild.id;
    const channelName = channel.name;
    const code = Math.random().toString(36).substr(2, 4);
    const autoMsg = { guildId, channelName, msgContent, duration, interval: null };
    activeCodes.add(code);

    startAutoMessage(autoMsg);

    autoMessages.set(code, autoMsg);
    const targetChannel = channel.guild.channels.cache.find(ch => ch.name === channelName);
    if (targetChannel) {
      targetChannel.send(msgContent);
    }
    message.reply(`Auto message set with code: ${code}`);
  } else if (command === 'listam') {
    if (activeCodes.size === 0) {
      return message.reply('No active auto messages.');
    }
    message.reply(`Active auto message codes: ${Array.from(activeCodes).join(', ')}`);
  } else if (command === 'info') {
    const code = args[0];
    const autoMsg = autoMessages.get(code);
    if (!autoMsg) {
      return message.reply('Invalid code.');
    }
    const guild = client.guilds.cache.get(autoMsg.guildId);
    if (!guild) {
      return message.reply('Invalid guild ID.');
    }
    const targetChannel = guild.channels.cache.find(ch => ch.name === autoMsg.channelName);
    message.reply(`Channel: ${targetChannel ? targetChannel.toString() : autoMsg.channelName}\nDuration: ${autoMsg.duration}s`);
  } else if (command === 'stop') {
    const code = args[0];
    const autoMsg = autoMessages.get(code);
    if (!autoMsg) {
      return message.reply('Invalid code.');
    }
    clearInterval(autoMsg.interval);
    autoMessages.delete(code);
    activeCodes.delete(code);
    message.reply(`Stopped auto message with code: ${code}`);
  } else if (command === 'edit') {
    const editType = args.shift();
    const code = args.shift();
    const newValue = args.join(' ');
    const autoMsg = autoMessages.get(code);
    if (!autoMsg) {
      return message.reply('Invalid code.');
    }
    if (editType === 'time') {
      const newDuration = parseInt(newValue, 10);
      if (isNaN(newDuration)) {
        return message.reply('Invalid duration.');
      }
      clearInterval(autoMsg.interval);
      autoMsg.duration = newDuration;
      startAutoMessage(autoMsg);
      message.reply(`Updated duration for code: ${code} to ${newDuration}s`);
    } else if (editType === 'message') {
      autoMsg.msgContent = newValue;
      message.reply(`Updated message for code: ${code}`);
    } else {
      message.reply('Invalid edit type. Use "time" or "message".');
    }
  } else if (command === 'help') {
    const helpMessage = Object.entries(helpDescriptions)
      .map(([cmd, desc]) => `.${cmd} ${desc.split('\n\n')[0]}`)
      .join('\n\n');
    message.reply(`Available commands:\n${helpMessage}`);
  } else if (command === 'helpinfo') {
    const cmd = args[0];
    if (helpDescriptions[cmd]) {
      message.reply(helpDescriptions[cmd]);
    } else {
      message.reply('Unknown command.');
    }
  }
});

client.login(token);
