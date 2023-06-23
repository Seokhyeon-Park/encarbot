const packageData = require('./package.json');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const token = packageData.TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text.includes("/add")) {
    const url = msg.text.split(" ");

    console.log(url);

    if(url.length !== 2) {
      bot.sendMessage(chatId, '올바른 주소를 입력해주세요.');
      return;
    }


    // 아래 regex를 "("" << 갯수 찾아서 ")" 가변으로 생성.
    // const regex = /\((.*?)\)\)\)/;
    // const matches = regex.exec(url[1]);
    // const query = matches[0];

    // const apiUrl = `http://api.encar.com/search/car/list/premium?count=true&q=${query}&sr=%7CModifiedDate%7C0%7C20`;

    // const res = await fetch(apiUrl);
    // const cars = await res.json();

    // console.log(cars);
  }

  // bot.sendMessage(chatId, 'Received your message');
});