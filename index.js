const packageData = require('./package.json');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const token = packageData.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const requester = [];

const functions = {
  add: async (msg) => {
    const chatId = msg.chat.id;
    const input = msg.text.split(" ");

    if (input.length !== 2) {
      bot.sendMessage(chatId, '올바른 주소를 입력해주세요.');
      return;
    }

    // 등록 주소
    const url = input[1];

    // 쿼리 추출
    const start = url.indexOf('(');
    const end = url.lastIndexOf(')');
    const query = url.substring(start, end + 1);

    // API URL
    const apiUrl = `https://api.encar.com/search/car/list/premium?count=true&q=${query}&sr=%7CModifiedDate%7C0%7C299`;

    // API 결과
    const res = await fetch(apiUrl);
    const cars = await res.json();

    // 유저 Index 확인
    const requesterIndex = requester.findIndex(obj => obj.id === chatId);

    if (requesterIndex !== -1) {
      // 기존에 등록한 정보가 있는 경우
      requester[requesterIndex].count = cars.Count;
      requester[requesterIndex].show = false;
      requester[requesterIndex].apiUrl = apiUrl;
      requester[requesterIndex].result = cars.SearchResults;
    } else {
      // 기존에 등록한 정보가 없는 경우
      requester.push({
        'id': chatId,
        'count': cars.Count,
        'show': false,
        'apiUrl': apiUrl,
        'result': cars.SearchResults,
      });
    }

    if(cars.Count === 0) {
      bot.sendMessage(chatId, '등록이 완료되었습니다. 현재 등록된 매물이 없습니다.\n\n*필터링 차량이 총 300대가 넘어가는 경우 신규 차량이 등록됨은 알 수 있으나 List는 출력되지 않습니다.');
    } else {
      // let cnt = 1;
      let message  = `등록이 완료되었습니다. (${cars.Count} 대)\n\n*필터링 차량이 총 300대가 넘어가는 경우 신규 차량이 등록됨은 알 수 있으나 List는 출력되지 않습니다.`;

      // cars.SearchResults.forEach((car) => {
      //   const year = String(car.Year).substring(2, 4);
      //   const month = String(car.Year).substring(4, 6);
        
      //   message += `[${cnt}] ${year}년식 ${month}월 / ${car.Price} 만원`;
      //   if ('LeaseType' in car) { message += ` (${car.LeaseType})`; }
      //   message +=  ` / 주행거리 : ${car.Mileage} / ${car.OfficeCityState}\n\n`;

      //   cnt++;
      // });

      bot.sendMessage(chatId, message);
    }
  },
  check: () => {
    if (requester.length > 0) {
      requester.forEach(async (r) => {
        // API URL
        const apiUrl = r.apiUrl;

        // API 결과
        const res = await fetch(apiUrl);
        const cars = await res.json();

        // 신규 차량
        const newCars = [];

        // 유저 Index 확인
        const requesterIndex = requester.findIndex(obj => obj.id === r.id);

        console.log(r.id, " (", cars.Count, " / ", r.count, ")");

        if(parseInt(cars.Count) - parseInt(r.count) !== 0) {
          if(parseInt(cars.Count) - parseInt(r.count) > 0) {
            // 신규 등록건이 있는 경우
            cars.SearchResults.forEach((current) => {
              let found = false;

              r.result.forEach((last) => {
                if(current.Id === last.Id) {
                  found = true;
                  return;
                }
              });

              if (!found) { newCars.push(current); }
            });

            for(let current of cars.SearchResults) {
              let found = false;

              for(let last of r.result) {
                if(current.Id === last.Id) {
                  found = true;
                  break;
                }
              }

              if (!found) { newCars.push(current); }
            }

            const now = new Date();
            const options = { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };
            const koreanTime = now.toLocaleString('en-US', options);

            let cnt = 1;
            let message  = `${koreanTime} 기준 신규 차량 (${newCars.length} 대)\n\n`;

            if(r.count < 299) {
              newCars.forEach((car) => {
                const year = String(car.Year).substring(2, 4);
                const month = String(car.Year).substring(4, 6);
                
                message += `[${cnt}] ${year}년식 ${month}월 / ${car.Price} 만원`;
                if ('LeaseType' in car) { message += ` (${car.LeaseType})`; }
                message +=  ` / 주행거리 : ${car.Mileage} / ${car.OfficeCityState}\n\n`;
  
                cnt++;
              });
  
              bot.sendMessage(r.id, message);
            } else {
              bot.sendMessage(r.id, message);
            }

            requester[requesterIndex].count = cars.Count;
            requester[requesterIndex].show = false;
            requester[requesterIndex].apiUrl = apiUrl;
            requester[requesterIndex].result = cars.SearchResults;
          } else {
            requester[requesterIndex].count = cars.Count;
          }
        }
      });
    }
  },
}

bot.on('message', (msg) => {
  try {
    if (msg.text.includes("/add")) { functions.add(msg); }
  } catch (err) {
    bot.sendMessage(chatId, `잘못된 요청입니다. 명령어 및 주소를 다시 확인해주세요.`);
    console.log(err);
  }
});

setInterval(functions.check, 300000);