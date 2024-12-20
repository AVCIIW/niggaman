package main

import (
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/joho/godotenv"
)

var (
	Token              string
	SourceChannelID    string
	TargetChannelIDs   []string
)

func init() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	Token = os.Getenv("DISCORD_TOKEN")
	SourceChannelID = os.Getenv("SOURCE_CHANNEL_ID")
	TargetChannelIDs = []string{os.Getenv("TARGET_CHANNEL_IDS")}
}

func shift(input string, shift int) string {
	var result strings.Builder
	for _, char := range input {
		result.WriteRune(char - rune(shift))
	}
	return result.String()
}

func base64Decode(encodedData string) (string, error) {
	decodedData, err := base64.StdEncoding.DecodeString(encodedData)
	if err != nil {
		return "", err
	}
	return string(decodedData), nil
}

func verifyString(s string) bool {
	decoded, err := base64Decode(s)
	if err != nil {
		log.Println("Error decoding base64:", err)
		return false
	}

	shifted := shift(decoded, 2)

	// Regex patterns
	patterns := []string{
		`^Adopt Me\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$`,
		`^Murder Mystery 2\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$`,
		`^Blade Ball\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?://pastebin\.com/[^\s]+|Error)$`,
	}

	for _, pattern := range patterns {
		match, _ := regexp.MatchString(pattern, shifted)
		if match {
			return true
		}
	}
	return false
}

func getNewMessage(s string) string {
	decoded, err := base64Decode(s)
	if err != nil {
		log.Println("Error decoding base64:", err)
		return ""
	}

	shifted := shift(decoded, 2)
	lines := strings.Split(shifted, "\n")
	// Remove the last line, assuming it's not necessary
	if len(lines) > 0 {
		lines = lines[:len(lines)-1]
	}
	return strings.Join(lines, "\n")
}

func onMessage(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Avoid bot's own messages
	if m.Author.ID == s.State.User.ID {
		return
	}

	// If message is in source channel
	if m.ChannelID == SourceChannelID {
		// If the message should be forwarded
		if verifyString(m.Content) {
			for _, targetChannelID := range TargetChannelIDs {
				targetChannel, err := s.State.Channel(targetChannelID)
				if err != nil {
					log.Printf("Error getting channel: %v\n", err)
					continue
				}

				// Send the message to the target channel
				err = s.ChannelMessageSend(targetChannel.ID, getNewMessage(m.Content))
				if err != nil {
					log.Printf("Error sending message: %v\n", err)
				} else {
					// Log the message content to hits.txt
					file, err := os.OpenFile("hits.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
					if err != nil {
						log.Println("Error opening file:", err)
						continue
					}
					defer file.Close()

					_, err = file.WriteString(getNewMessage(m.Content) + "\n")
					if err != nil {
						log.Println("Error writing to file:", err)
					}
					log.Printf("Message sent to %s\n", targetChannelID)
				}
			}
		} else {
			log.Println("Fake hit detected")
		}
	}
}

func main() {
	// Create a new Discord session using the provided bot token
	dg, err := discordgo.New("Bot " + Token)
	if err != nil {
		log.Fatalf("error creating Discord session: %v", err)
	}

	// Register the message handler
	dg.AddMessageCreate(onMessage)

	// Open a websocket connection to Discord and begin listening
	err = dg.Open()
	if err != nil {
		log.Fatalf("error opening connection to Discord: %v", err)
	}

	// Wait for a signal to stop
	fmt.Println("Bot is now running. Press CTRL+C to exit.")
	select {}
}
