/**
 * @fileoverview Chapter 1 static ink-silhouette comic sequences (Intro: 4 panels, Mid: 2 panels, Ending: 3 panels).
 * Every Russian caption is <= 14 words, natural and cinematic.
 */

export const CH01_COMICS = {
  intro: {
    id: 'ch01_intro',
    panels: [
      {
        panelId: 'ch1_intro_1',
        kickerRu: 'НЕО-ЭДО · ПОЛНОЧЬ',
        captionRu: 'В тихой кухне старой женщины раздался поздний телефонный звонок.'
      },
      {
        panelId: 'ch1_intro_2',
        kickerRu: 'ПАУТИНА ЛЖИ',
        captionRu: 'Чужой голос назвался «защитой банка» и прислал фальшивую ссылку.'
      },
      {
        panelId: 'ch1_intro_3',
        kickerRu: 'ПУСТОЙ СЧЁТ',
        captionRu: 'За одну минуту накопления всей её жизни исчезли без следа.'
      },
      {
        panelId: 'ch1_intro_4',
        kickerRu: 'КЛЯТВА ТЕНИ',
        captionRu: 'Синоби VU1FRA смотрит на башню «Куроганэ Траст» и даёт обет.'
      }
    ]
  },
  mid: {
    id: 'ch01_mid',
    panels: [
      {
        panelId: 'ch1_mid_1',
        kickerRu: 'ЭТАЖ 41 · СЛЕД',
        captionRu: 'Взломанный узел раскрыл готовые сценарии психологического давления на стариков.'
      },
      {
        panelId: 'ch1_mid_2',
        kickerRu: 'ХОЗЯИН СЕТИ «ПАУК»',
        captionRu: 'Главарь «Паук» прикрывался украденными личными данными настоящих сотрудников башни.'
      }
    ]
  },
  ending: {
    id: 'ch01_ending',
    panels: [
      {
        panelId: 'ch1_end_1',
        kickerRu: 'ПРОТОКОЛ ПРАВДЫ',
        captionRu: 'Архив звонков и счетов «Паутины» отправлен следователям и журналистам.'
      },
      {
        panelId: 'ch1_end_2',
        kickerRu: 'РАССВЕТ НАД ГОРОДОМ',
        captionRu: 'На рассвете переводы заблокированы, а сбережения возвращаются обманутым людям.'
      },
      {
        panelId: 'ch1_end_3',
        kickerRu: 'ЗАКОН ТЕНИ',
        captionRu: 'Туман редеет над крышами Нео-Эдо. Тень уходит без имени.'
      }
    ]
  }
};
