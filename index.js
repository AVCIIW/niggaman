const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const atob = require('atob');  // Base64 decoding (use 'atob' for Node.js)
const TOKEN = process.env.BOT_TOKEN;

// Create a new client instance with the necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Webhooks
  ]
});

// Constants for the channel IDs
const SOURCE_CHANNEL_ID = '1319759650903560315';
const TARGET_CHANNEL_IDS = ['1319759777730920539'];

// Function to shift characters (similar to Python's shift)
function shift(inputString, shift) {
  let deobfuscatedString = '';
  for (let char of inputString) {
    deobfuscatedString += String.fromCharCode(char.charCodeAt(0) - shift);
  }
  return deobfuscatedString;
}

// Base64 decoding function
function base64Decode(encodedData) {
  return atob(encodedData);
}

// Function to verify the string format
function verifyString(s) {
  s = base64Decode(s);
  s = shift(s, 2);
  const newmessage = s.split('\n').slice(0, -1).join('\n'); // Removing the last line

  const pattern = /^(Adopt Me|Murder Mystery 2|Blade Ball)\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com\/[^\s]+|Error)$/;

  return pattern.test(newmessage);
}

// Function to get the modified message
function getNewMessage(s) {
  s = base64Decode(s);
  s = shift(s, 2);
  const newmessage = s.split('\n').slice(0, -1).join('\n'); // Removing the last line
  return newmessage;
}

// Event when the bot is ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Event when a message is received
client.on('messageCreate', async (message) => {
  if (message.author.bot && !message.webhookId) {
    return;
  }

  if (message.channel.id === SOURCE_CHANNEL_ID) {
    let shouldForward = false;

    // Check if the message mentions anyone
    if (message.mentions.users.size > 0) {
      return;
    }

    // Check if the message has any embeds
    if (message.embeds.length > 0) {
      return;
    }

    // Verify if the message content is valid
    if (verifyString(message.content)) {
      shouldForward = true;
    }

    if (shouldForward) {
      for (const targetChannelId of TARGET_CHANNEL_IDS) {
        const targetChannel = await client.channels.fetch(targetChannelId);

        if (targetChannel) {
          try {
            if (message.content) {
              const newMessage = getNewMessage(message.content);
              await targetChannel.send(newMessage);
              console.log(`Sent to ${targetChannelId}`);

              // Append to the file
              fs.appendFileSync('hits.txt', newMessage + '\n');
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

// Login the bot
client.login(TOKEN);
