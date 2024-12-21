const { Client, Intents } = require('discord.js');
const fs = require('fs');
const base64 = require('base-64');
const { DISCORD_TOKEN } = process.env; // Discord token from environment variable

// Define the bot client with necessary intents
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});

const SOURCE_CHANNEL_ID = '1319759650903560315';
const TARGET_CHANNEL_IDS = ['1319759777730920539'];

// De-obfuscates the string by shifting the characters
function shift(inputString, shift) {
  let deobfuscatedString = '';
  for (let char of inputString) {
    let deobfuscatedChar = String.fromCharCode(char.charCodeAt(0) - shift);
    deobfuscatedString += deobfuscatedChar;
  }
  return deobfuscatedString;
}

// Base64 decoding function
function base64Decode(encodedData) {
  return base64.decode(encodedData);
}

// Verifies the string based on patterns
function verifyString(s) {
  s = base64Decode(s);
  s = shift(s, 2);
  let newMessage = s.split('\n');
  newMessage.pop(); // Remove last line

  s = newMessage.join('\n');

  const pattern1 = /^Adopt Me\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com[^\s]+|Error)$/;
  const pattern2 = /^Murder Mystery 2\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com[^\s]+|Error)$/;
  const pattern3 = /^Blade Ball\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com[^\s]+|Error)$/;

  return pattern1.test(s) || pattern2.test(s) || pattern3.test(s);
}

// Extracts the message and applies de-obfuscation
function getNewMessage(s) {
  s = base64Decode(s);
  s = shift(s, 2);
  let newMessage = s.split('\n');
  newMessage.pop(); // Remove last line
  return newMessage.join('\n');
}

// Log bot in
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Listen for incoming messages
client.on('messageCreate', async (message) => {
  if (message.author.bot && !message.webhookId) {
    return;
  }

  if (message.channel.id === SOURCE_CHANNEL_ID) {
    let shouldForward = false;

    if (message.mentions.users.size > 0) {
      return;
    }

    let embedsAmount = 0;
    message.embeds.forEach(() => {
      embedsAmount += 1;
    });

    if (embedsAmount > 0) {
      return;
    }

    if (verifyString(message.content)) {
      shouldForward = true;
    }

    if (shouldForward) {
      for (let targetChannelId of TARGET_CHANNEL_IDS) {
        const targetChannel = await client.channels.fetch(targetChannelId);

        if (targetChannel) {
          try {
            if (message.content) {
              const newMessage = getNewMessage(message.content);
              await targetChannel.send(newMessage);
              console.log(`Sent to ${targetChannelId}`);

              // Log message to a file
              fs.appendFileSync('hits.txt', `${newMessage}\n`);
            }
          } catch (e) {
            console.error(`Error sending to ${targetChannelId}: ${e}`);
          }
        }
      }
    } else {
      console.log('Fake hit');
    }
  }
});

// Log the bot in using the token from the environment variable
client.login(DISCORD_TOKEN);
