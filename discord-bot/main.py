import discord
import re
import base64
import os

# Fetch token from environment variables
TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
intents.message_content = True 
intents.webhooks = True 

client = discord.Client(intents=intents)

SOURCE_CHANNEL_ID = 1319759650903560315
TARGET_CHANNEL_IDS = [1319759777730920539]

def shift(input_string, shift):
    deobfuscated_string = ""
    for char in input_string:
        deobfuscated_char = chr(ord(char) - shift)
        deobfuscated_string += deobfuscated_char
    return deobfuscated_string

def base64_decode(encoded_data):
    try:
        byte_data = base64.b64decode(encoded_data)
        return byte_data.decode('utf-8')
    except Exception as e:
        print(f"Error in base64 decoding: {e}")
        return None

def verify_string(s):
    s = base64_decode(s)
    if s is None:
        return False
    s = shift(s, 2)
    newmessage = s.splitlines()
    newmessage.remove(newmessage[len(newmessage)-1])
    s = "\n".join(newmessage)

    # Simplified regex pattern for all three games
    pattern = r"^(Adopt Me|Murder Mystery 2|Blade Ball)\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$"
    return re.fullmatch(pattern, s.strip()) is not None

def getnewmessage(s):
    s = base64_decode(s)
    if s is None:
        return ""
    s = shift(s, 2)
    newmessage = s.splitlines()
    newmessage.remove(newmessage[len(newmessage)-1])
    return "\n".join(newmessage)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

@client.event
async def on_message(message):
    if message.author.bot and not message.webhook_id:
        return

    if message.channel.id == SOURCE_CHANNEL_ID:
        if len(message.mentions) > 0 or any(embed for embed in message.embeds):
            return
        
        if verify_string(message.content):
            for target_channel_id in TARGET_CHANNEL_IDS:
                target_channel = client.get_channel(target_channel_id)
                if target_channel is not None:
                    try:
                        content = getnewmessage(message.content)
                        if content:
                            await target_channel.send(content)
                            print(f"Sent message to {target_channel_id}")
                            
                            # Log the sent message to file
                            with open('hits.txt', 'a') as file:
                                file.write(content + "\n")
                    except Exception as e:
                        print(f"Error while sending message to {target_channel_id}: {e}")
        else:
            print("Invalid message format.")

client.run(TOKEN)
