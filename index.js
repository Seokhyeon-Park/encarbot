const fs = require('fs');
const packageData = require('./package.json');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const token = packageData.TOKEN;
const bot = new TelegramBot(token, { polling: true });

let requester = [];

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

    // 데이터 식별번호
    const code = Math.floor(Math.random() * 90000000) + 10000000;

    // 신규 등록
    requester.push({
      'code': code,
      'id': chatId,
      'count': cars.Count,
      'apiUrl': apiUrl,
      'result': cars.SearchResults,
    });

    // 데이터 저장
    functions.save(requester);

    if (cars.Count === 0) {
      bot.sendMessage(chatId, '등록이 완료되었습니다. 현재 등록된 매물이 없습니다.\n\n*필터링 차량이 총 300대가 넘어가는 경우 신규 차량이 등록됨은 알 수 있으나 List는 출력되지 않습니다.');
    } else {
      bot.sendMessage(chatId, `등록이 완료되었습니다. (${cars.Count} 대)\n\n*필터링 차량이 총 300대가 넘어가는 경우 신규 차량이 등록됨은 알 수 있으나 List는 출력되지 않습니다.`);
    }
  },
  check: () => {
    if (requester.length > 0) {
      requester.forEach(async (r) => {
        // 시간
        const now = new Date();
        const options = { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const koreanTime = now.toLocaleString('en-US', options);

        // API URL
        const apiUrl = r.apiUrl;

        // API 결과
        const res = await fetch(apiUrl);
        const cars = await res.json();

        // 신규 차량
        const newCars = [];

        // 유저 Index 확인
        const requesterIndex = requester.findIndex(obj => obj.apiUrl === r.apiUrl);

        console.log(koreanTime, " ( 신규 : ", cars.Count, " / 기존 : ", r.count, " )");

        const newCarsCnt = parseInt(cars.Count) - parseInt(r.count);

        if (newCarsCnt !== 0) {
          if (newCarsCnt > 0) {
            // 신규 등록건이 있는 경우
            for (let current of cars.SearchResults) {
              let found = false;

              for (let last of r.result) {
                if (current.Id === last.Id) {
                  found = true;
                  break;
                }
              }

              if (!found) { newCars.push(current); }
            }

            let cnt = 1;
            let message = `${koreanTime} ${cars.SearchResults[0].Model} 신규 등록 차량 (${newCarsCnt} 대 / 총 ${cars.Count} 대)\n\n`;

            if (r.count < 299) {
              newCars.forEach((car) => {
                const year = String(car.Year).substring(2, 4);
                const month = String(car.Year).substring(4, 6);

                message += `[${cnt}] ${year}년식 ${month}월 / ${car.Price} 만원`;
                if ('LeaseType' in car) { message += ` (${car.LeaseType})`; }
                message += ` / 주행거리 : ${car.Mileage} / ${car.OfficeCityState} / http://www.encar.com/dc/dc_cardetailview.do?pageid=fc_carsearch&listAdvType=normal&carid=${car.Id}\n\n`;

                cnt++;
              });

              bot.sendMessage(r.id, message);
            } else {
              bot.sendMessage(r.id, message);
            }

            requester[requesterIndex].count = cars.Count;
            requester[requesterIndex].apiUrl = apiUrl;
            requester[requesterIndex].result = cars.SearchResults;
          } else if(newCarsCnt < 0 ) {
            let message = `${koreanTime} ${cars.SearchResults[0].Model} 판매된 차량 (${Math.abs(newCarsCnt)} 대 / 총 ${cars.Count} 대)\n\n`;
            bot.sendMessage(r.id, message);

            requester[requesterIndex].count = cars.Count;
          } else {
            requester[requesterIndex].count = cars.Count;
          }
        }
      });

      // 데이터 저장
      functions.save(requester);
    }
  },
  list: (msg) => {
    const chatId = msg.chat.id;
    let message = '';

    for (const ind in requester) {
      if (requester[ind].id === chatId) {
        message += `[code : ${requester[ind].code}] ${requester[ind].result[0].Model}\n`;
      }
    };

    if (message === '') {
      bot.sendMessage(chatId, '추가한 차량이 없습니다.');
    } else {
      bot.sendMessage(chatId, message);
    }
  },
  delete: (msg) => {
    const chatId = msg.chat.id;
    const input = msg.text.split(" ");

    if (input.length !== 2) {
      bot.sendMessage(chatId, '올바른 코드를 입력해주세요.');
      return;
    }

    // 선택 코드
    const code = input[1];

    for (const ind in requester) {
      if (String(requester[ind].code) === String(code)) {
        requester.splice(ind, 1);
      }
    };

    // 데이터 저장
    functions.save(requester);

    functions.list(msg);
  },
  save: (data) => {
    const filePath = './requester.txt';

    fs.writeFile(filePath, JSON.stringify(data), (err) => {
      if (err) {
        console.error('데이터 저장 중 오류 발생:', err);
        return;
      }
      console.log('데이터가 성공적으로 저장되었습니다.');
    });
  },
  load: () => {
    const filePath = './requester.txt';

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('데이터 불러오기 중 오류 발생:', err);
        return;
      }

      // 기존 데이터 병합
      const parsedData = JSON.parse(data);

      requester = parsedData;
    });
  },
  help: (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '[명령어]\n/add (encar url)\n[역할]\n알람을 받을 차량을 추가\n[사용법]\n엔카 PC 사이트에서 조건을 선택하여 필터링한 후 해당 URL(주소)를 (encar url) 자리에 붙여넣기 (단 괄호는 제거하고 주소만 입력)');
    bot.sendMessage(chatId, '[명령어]\n/list\n[역할]\n본인이 추가한 차량 목록을 보여줌\n[특이사항]\n필터 조건이 여러 차종인 경우 (예를 들면 현대 자동차 모든 차량을 필터링한 경우) 해당 차종 중 무작위 한대의 차종 이름을 표시함');
    bot.sendMessage(chatId, '[명령어]\n/delete (code)\n[역할]\n등록한 차량 목록 중 특정 차종을 제거\n[사용법]\n/list를 입력하여 제거할 차량의 code를 복사(8자리 숫자)하여 /delete (code)의 (code)자리에 붙여넣기 (단 괄호는 제거하고 숫자만 입력)');
  },
}

bot.on('message', (msg) => {
  try {
    if (msg.text.includes("/add") || msg.text.includes("/ADD")) { functions.add(msg); }
    if (msg.text.includes("/list") || msg.text.includes("/LIST")) { functions.list(msg); }
    if (msg.text.includes("/delete") || msg.text.includes("/DELETE")) { functions.delete(msg); }
    if (msg.text.includes("/help") || msg.text.includes("/HELP")) { functions.help(msg); }
  } catch (err) {
    bot.sendMessage(chatId, `잘못된 요청입니다. 명령어 및 주소를 다시 확인해주세요.`);
    console.log(err);
  }
});

// 기존 데이터 불러오기
functions.load();

// 매물 확인
setInterval(functions.check, 300000);