#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Telegram Support Bot (Livegram Alternative)
------------------------------------------
This script acts as a Telegram Support Bot.
Any user message is forwarded to the admin, and replies from the admin
are forwarded back to the user instantly.

Required packages:
pip install pyTelegramBotAPI

Run script:
python bot.py
"""

import telebot
import os
import json

# Configuration
BOT_TOKEN = "8767560640:AAGn-ZqD6rjyyARPBBpTKDfA2m520mHbNlU"
ADMIN_CHAT_ID = 8901260078 # Your Admin Chat ID
WELCOME_MESSAGE = """Assalamu Alaikum! Welcome to Autosverify. How can we help you today? Let us know if you have any questions or needs, we are ready to assist you."""

# Mapping data store files
MAPPING_FILE = "message_mapping.json"

# Function to load mapping
def load_mapping():
    if os.path.exists(MAPPING_FILE):
        try:
            with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print("Mapping file reading error:", e)
    return {}

# Function to save mapping
def save_mapping(mapping):
    try:
        with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print("Mapping file writing error:", e)

# Bot initialization
# Load token and admin ID from environment variables if present, otherwise fallback to hardcoded configuration
ENV_BOT_TOKEN = os.environ.get("BOT_TOKEN")
ENV_ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID")
ENV_WELCOME_MESSAGE = os.environ.get("WELCOME_MESSAGE")

FINAL_BOT_TOKEN = ENV_BOT_TOKEN if ENV_BOT_TOKEN else BOT_TOKEN
FINAL_ADMIN_CHAT_ID = ENV_ADMIN_CHAT_ID if ENV_ADMIN_CHAT_ID else ADMIN_CHAT_ID
FINAL_WELCOME_MESSAGE = ENV_WELCOME_MESSAGE if ENV_WELCOME_MESSAGE else WELCOME_MESSAGE

# Safely parse the ADMIN ID to integer
try:
    ADMIN_ID_NUM = int(FINAL_ADMIN_CHAT_ID) if FINAL_ADMIN_CHAT_ID else None
except Exception:
    ADMIN_ID_NUM = None

bot = telebot.TeleBot(FINAL_BOT_TOKEN, parse_mode="Markdown")
msg_mapping = load_mapping()

print("==================================================")
print("🤖 Telegram Support Bot Active!")
print(f"👉 Token: {FINAL_BOT_TOKEN[:10]}...{FINAL_BOT_TOKEN[-6:]}" if FINAL_BOT_TOKEN else "👉 Token: None")
print(f"👉 Admin Chat ID: {ADMIN_ID_NUM}")
print("==================================================")

# Handle all types of messages (Text, Photo, Document, Audio, Video, Voice)
@bot.message_handler(func=lambda message: True, content_types=['text', 'photo', 'document', 'audio', 'video', 'voice'])
def handle_all_messages(message):
    global msg_mapping
    chat_id = message.chat.id
    
    # 1. Handle messages from admin
    if ADMIN_ID_NUM and chat_id == ADMIN_ID_NUM:
        # Check if admin sent direct command like /start, /help, /status
        if message.text:
            text_strip = message.text.strip().lower()
            if text_strip.startswith('/start') or text_strip.startswith('/help') or text_strip.startswith('/status'):
                bot.reply_to(message, "⚡ *Autosverify Support Bot Active!* 🚀\n\n🟢 Systems are running perfectly.\n💬 You can reply directly to any forwarded user message to chat with them instantly! 🛡️")
                return

        # Handle replies to forwarded messages
        if message.reply_to_message:
            replied_msg_id = str(message.reply_to_message.message_id)
            if replied_msg_id in msg_mapping:
                user_to_reply = msg_mapping[replied_msg_id]
                try:
                    # Ensure user ID is formatted as an integer if it's a numeric ID
                    user_to_reply_id = int(user_to_reply) if user_to_reply.isdigit() or (user_to_reply.startswith('-') and user_to_reply[1:].isdigit()) else user_to_reply

                    # Forward message to user based on content type
                    if message.content_type == 'text':
                        bot.send_message(user_to_reply_id, message.text)
                    elif message.content_type == 'photo':
                        bot.send_photo(user_to_reply_id, message.photo[-1].file_id, caption=message.caption)
                    elif message.content_type == 'document':
                        bot.send_document(user_to_reply_id, message.document.file_id, caption=message.caption)
                    elif message.content_type == 'voice':
                        bot.send_voice(user_to_reply_id, message.voice.file_id, caption=message.caption)
                    elif message.content_type == 'video':
                        bot.send_video(user_to_reply_id, message.video.file_id, caption=message.caption)
                    elif message.content_type == 'audio':
                        bot.send_audio(user_to_reply_id, message.audio.file_id, caption=message.caption)
                    
                    print(f"✅ Reply successfully forwarded to user {user_to_reply_id}")
                except Exception as e:
                    bot.reply_to(message, f"❌ Message could not be sent: {str(e)}")
            else:
                bot.reply_to(message, "⚠️ Sorry, the original user of this message was not found in the mapping.")
        else:
            bot.reply_to(message, "💡 Admin, please use the 'Reply' feature to reply to a user message.")
        return

    # 2. Forward user message to admin
    if not ADMIN_ID_NUM:
        print("⚠️ Warning: ADMIN_CHAT_ID is not configured yet.")
        return

    # Format user details
    user_info = f"📥 ✨ *New Message Received* ✨\n\n👤 *Sender:* {message.from_user.first_name} {message.from_user.last_name or ''}\n🆔 *User ID:* \`{chat_id}\`\n"
    if message.from_user.username:
        user_info += f"🔗 *Username:* @{message.from_user.username}\n"
    
    msg_text = message.text or message.caption or ""
    user_info += f"──────────────────────\n💬 *Message:* {msg_text if msg_text else '_[Media or file]_'}"

    try:
        # Forward header details
        info_msg = bot.send_message(ADMIN_ID_NUM, user_info)
        
        # Copy original message to admin
        forwarded_msg = bot.copy_message(ADMIN_ID_NUM, chat_id, message.message_id)
        
        # Store message mapping
        msg_mapping[str(forwarded_msg.message_id)] = str(chat_id)
        msg_mapping[str(info_msg.message_id)] = str(chat_id)
        
        # Prune oldest items if message mapping exceeds 1000 items to prevent file growth (database cleanup)
        if len(msg_mapping) > 1000:
            sorted_keys = sorted(msg_mapping.keys())
            for k in sorted_keys[:200]:
                msg_mapping.pop(k, None)
        
        save_mapping(msg_mapping)
        print(f"📩 Message from {chat_id} forwarded to admin")
        
        # 3. Send welcome message ONLY when user triggers /start or /help command
        is_start_or_help = False
        if message.text:
            text_val = message.text.strip().lower()
            is_start_or_help = text_val.startswith('/start') or text_val.startswith('/help')

        if is_start_or_help and FINAL_WELCOME_MESSAGE:
            try:
                bot.send_message(chat_id, FINAL_WELCOME_MESSAGE)
            except Exception as ar_err:
                print(f"❌ Failed to send welcome message: {ar_err}")
        
    except Exception as e:
        print(f"❌ Failed to forward message to admin: {e}")

# Run bot polling
if __name__ == '__main__':
    try:
        print("🔌 Deleting any active webhooks to ensure polling works perfectly...")
        bot.remove_webhook()
        print("🟢 Bot started polling successfully. Listening for messages...")
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
    except Exception as e:
        print("⚡ Polling Exception:", e)
