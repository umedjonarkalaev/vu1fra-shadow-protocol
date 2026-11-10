/**
 * @fileoverview All 5 hacking puzzle data instances for Chapter 1 (Terminals A, B, C, D, E).
 * Uses fictional brands and .example domains only. Every puzzle ends with a real-life defense tip.
 */

export const CH01_PUZZLES = {
  term_a_phishing: {
    id: 'term_a_phishing',
    type: 'phishing_inspector',
    codexId: 'codex_phishing',
    difficulty: 1,
    topicRu: 'ФИШИНГ И ПОДМЕНА',
    titleRu: 'Терминал A · Почтовый шлюз «Куроганэ»',
    promptRu: 'Отметь 3 признака фальшивого письма от «банка»',
    hintRu: 'Проверь опечатку в домене отправителя (rn вместо m), запугивание блокировкой и несовпадение текста кнопки с адресом href.',
    explanationRu: 'Мошенники использовали домен-двойник (kurogane-trus1.example), искусственную панику («счёт будет заморожен через 15 минут») и подменили реальный адрес ссылки (href вёл на сторонний шлюз).',
    lifeTipRu: 'Никогда не переходи по ссылкам из тревожных писем и СМС. Всегда проверяй реальный домен адреса (href) и заходи в банк только через официальное приложение или закладку.',
    payload: {
      email: {
        from: 'security-alert@kurogane-trus1.example',
        subject: 'СРОЧНО: Ваша пенсионная карта заблокирована через 15 минут!',
        visibleLinkText: 'https://kurogane-trust.example/verify',
        realHref: 'http://login-update-scam.pautina-gate.example/steal-token',
        bodyIntro: 'Уважаемый клиент! Зафиксирован подозрительный перевод. Если вы немедленно не подтвердите код карты по кнопке ниже, все средства будут безвозвратно списаны.',
        bodyFooter: 'Отдел защиты «Куроганэ Траст» (автоматическое уведомление)'
      },
      clues: [
        { id: 'c_domain', labelRu: 'Поддельный домен отправителя (kurogane-trus1.example с единицей вместо t)' },
        { id: 'c_urgency', labelRu: 'Искусственная паника и ультиматум («через 15 минут списание»)' },
        { id: 'c_href', labelRu: 'Текст ссылки выглядит как банк, но реальный href ведёт на чужой сайт' },
        { id: 'c_greeting', labelRu: 'Использование русского языка в теме письма' }
      ],
      correctClueIds: ['c_domain', 'c_urgency', 'c_href']
    }
  },

  term_b_passwords: {
    id: 'term_b_passwords',
    type: 'password_lab',
    codexId: 'codex_passwords',
    difficulty: 2,
    topicRu: 'ПАРОЛИ И КРИПТОГРАФИЯ',
    titleRu: 'Терминал B · Крипто-узел доступа',
    promptRu: 'Собери фразу из 3 слов и декодируй перехваченный ключ',
    hintRu: 'Выбери любые 3 словарных блока для длинной парольной фразы, затем выбери Base64-расшифровку «FLOOR-41-GATE».',
    explanationRu: 'Короткие пароли вроде «123456» или «kurogane2025» перебираются за секунды. Длинная парольная фраза из нескольких слов даёт высокую энтропию, а Base64 — это лишь кодировка, а не шифрование.',
    lifeTipRu: 'Создавай длинные парольные фразы (от 14–16 символов из 3–4 несвязанных слов), храни их в менеджере паролей и обязательно включай двухфакторную аутентификацию (2FA).',
    payload: {
      weakExamples: [
        { pwd: 'password123', crackTimeRu: '0.001 сек (словарь)' },
        { pwd: 'kurogane2025', crackTimeRu: '4 секунды (маска + год)' }
      ],
      wordChips: ['туман', 'фонарь', 'бамбук', 'север', 'камень'],
      requiredChipCount: 3,
      cipherText: 'Токен в конфиге (Base64): RkxPT1ItNDEtR0FURQ==',
      cipherOptions: [
        { id: 'dec_correct', labelRu: 'FLOOR-41-GATE (декодирование Base64)' },
        { id: 'dec_wrong1', labelRu: 'ADMIN-01-ROOT (случайная подстановка)' },
        { id: 'dec_wrong2', labelRu: 'GUEST-99-OPEN (сдвиг Цезаря +1)' }
      ],
      correctCipherId: 'dec_correct'
    }
  },

  term_c_logs: {
    id: 'term_c_logs',
    type: 'log_forensics',
    codexId: 'codex_logs',
    difficulty: 2,
    topicRu: 'СЕТИ И ЖУРНАЛЫ (LOGS)',
    titleRu: 'Терминал C · Журнал авторизации сервера',
    promptRu: 'Отметь 3 подозрительные строки в логах доступа',
    hintRu: 'Ищи 48 неудачных попыток входа подряд, вход в 03:42 ночи и мгновенный прыжок из Нео-Эдо в порт Саппоро за 3 минуты.',
    explanationRu: 'В логах отчётливо видна атака перебора паролей (brute-force), ночной вход под украденной учётной записью и аномалия «невозможного перемещения» (Impossible Travel) между городами за 3 минуты.',
    lifeTipRu: 'Проверяй историю входов и список привязанных устройств в почте, соцсетях и банке. Если видишь незнакомый город или ночной вход — заверши все сессии и смени пароль.',
    payload: {
      entries: [
        {
          id: 'log_1',
          time: '14:10:05',
          user: 'tanaka.m',
          geo: 'Нео-Эдо · Офис 12Э',
          eventRu: 'Штатный вход по смарт-карте (OK)'
        },
        {
          id: 'log_2',
          time: '03:38:11',
          user: 'sato.hr',
          geo: 'Внешний узел 198.51.100.44',
          eventRu: '48 ошибок пароля за 9 сек -> Успешный вход (BRUTE-FORCE)'
        },
        {
          id: 'log_3',
          time: '03:41:02',
          user: 'sato.hr',
          geo: 'Северный порт (800 км от Нео-Эдо)',
          eventRu: 'Вход через 3 минуты из другого региона (IMPOSSIBLE TRAVEL)'
        },
        {
          id: 'log_4',
          time: '03:44:50',
          user: 'sato.hr',
          geo: 'Северный порт · VPN',
          eventRu: 'Массовая выгрузка базы пенсионных анкет (EXPORT_ALL)'
        },
        {
          id: 'log_5',
          time: '09:02:18',
          user: 'ito.sec',
          geo: 'Нео-Эдо · Пост охраны',
          eventRu: 'Проверка утренней смены (OK)'
        }
      ],
      suspiciousIds: ['log_2', 'log_3', 'log_4']
    }
  },

  term_d_terminal: {
    id: 'term_d_terminal',
    type: 'virtual_terminal',
    codexId: 'codex_terminal_fs',
    difficulty: 2,
    topicRu: 'КОНСОЛЬ И ФАЙЛОВАЯ СИСТЕМА',
    titleRu: 'Терминал D · Ядро маршрутизации этажа 41',
    promptRu: 'Используй кнопки команд, чтобы найти и открыть улику «Паутины»',
    hintRu: 'Нажми «ls», затем «grep 41» или «cat spider_41f_manifest.log», после чего нажми «Проверить решение».',
    explanationRu: 'Через базовые команды чтения каталога (ls), поиска по строке (grep) и вывода содержимого (cat) удалось обнаружить манифест маршрутизации звонков синдиката «Паутина» с 41-го этажа.',
    lifeTipRu: 'Не храни пароли, коды восстановления и копии документов в незашифрованных текстовых файлах с очевидными именами на компьютере или в открытых облачных папках.',
    payload: {
      targetFile: 'spider_41f_manifest.log',
      targetKeyword: '41',
      files: {
        'readme.txt': 'Внутренний сервер башни «Куроганэ Траст».',
        'spider_41f_manifest.log': 'УЗЕЛ «ПАУТИНА» // ЭТАЖ 41 // Шлюз SIP-подмены номеров активен. Куратор: ПАУК.'
      },
      commands: [
        {
          cmd: 'whoami',
          outputRu: 'vu1fra (временная сессия аудита)',
          revealsTarget: false
        },
        {
          cmd: 'ls -la',
          outputRu: 'readme.txt   sip_relay.conf   spider_41f_manifest.log',
          revealsTarget: false
        },
        {
          cmd: 'cat readme.txt',
          outputRu: 'Сервер резервного копирования «Куроганэ Траст». Доступ ограничен.',
          revealsTarget: false
        },
        {
          cmd: 'grep "41" *.log',
          outputRu: 'spider_41f_manifest.log: УЗЕЛ «ПАУТИНА» // ЭТАЖ 41 // SIP-шлюз обзвона пенсионеров.',
          revealsTarget: true
        },
        {
          cmd: 'cat spider_41f_manifest.log',
          outputRu: '[УЛИКА] Сеть «Паутина», этаж 41. Подмена исходящего номера на +7-800-xxx. Список операторов и счетов прикреплён.',
          revealsTarget: true
        }
      ]
    }
  },

  term_e_osint: {
    id: 'term_e_osint',
    type: 'osint_scam',
    codexId: 'codex_osint_scam',
    difficulty: 3,
    topicRu: 'СОЦИАЛЬНАЯ ИНЖЕНЕРИЯ И OSINT',
    titleRu: 'Терминал E · Архив звонков главаря «Паук»',
    promptRu: 'Определи приём давления и утечку личных данных (OSINT)',
    hintRu: 'Мошенник запрещает класть трубку и упоминает кличку кота и поликлинику №4 из открытого поста внучки.',
    explanationRu: 'Преступники из «Паутины» заранее изучили открытые посты семьи в соцсетях (OSINT), чтобы назвать точные бытовые детали и вызвать полное доверие, а затем изолировали жертву запретом класть трубку.',
    lifeTipRu: 'Ограничь видимость семейных профилей в соцсетях. Помни: настоящие сотрудники банка или полиции никогда не требуют перевести деньги на «безопасный счёт» и не запрещают перезвонить близким.',
    payload: {
      transcriptRu: 'Голос «Паука»: «Нина Петровна, мы видим вашу карту после визита в поликлинику №4! Даже ваш кот Барсик на аватарке не поможет, если вы сейчас положите трубку — уголовная ответственность за разглашение! Диктуйте код подтверждения!»',
      profileRu: 'Открытый пост внучки в соцсети: «Возила бабушку Нину Петровну в поликлинику №4, всё хорошо! А дома нас ждал пушистый кот Барсик 🐾» (профиль открыт для всех).',
      tacticOptions: [
        { id: 'tac_isolation', labelRu: 'Запрет класть трубку и запугивание «уголовной статьёй»' },
        { id: 'tac_discount', labelRu: 'Предложение новогодней скидки на вклад' },
        { id: 'tac_survey', labelRu: 'Обычный социологический опрос без спешки' }
      ],
      correctTacticId: 'tac_isolation',
      osintOptions: [
        { id: 'osint_post', labelRu: 'Открытый пост внучки с именем бабушки, поликлиникой №4 и кличкой кота' },
        { id: 'osint_weather', labelRu: 'Прогноз погоды в Нео-Эдо на завтра' },
        { id: 'osint_random', labelRu: 'Случайное совпадение без подготовки' }
      ],
      correctOsintId: 'osint_post'
    }
  }
};
