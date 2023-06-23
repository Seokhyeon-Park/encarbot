const packageData = require('./package.json');
const TelegramBot = require('node-telegram-bot-api');

const token = packageData.TOKEN;
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  console.log(msg.text)

  bot.sendMessage(chatId, 'Received your message');
});