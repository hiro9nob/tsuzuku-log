// レビューのお願いは1回だけ。最初の習慣を完了した直後に出す（docs/tsuzuku-log-concept.md「UI/UXの原則」11）
// 節目のお祝いと同じ日には重ねない（12）
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Alert, AppState } from 'react-native';

import type { Day } from './day';
import { i18n } from './i18n';
import { STORE_NAME } from './links';

const ASKED_KEY = 'ongo.reviewAsked';
const ASKED_DAY_KEY = 'ongo.reviewAskedDay';
const CELEBRATED_KEY = 'ongo.lastCelebrationDay';

/** 記録の帯やお祝いの画面が閉じきってから出す（閉じている途中だと iOS で出ないことがある） */
const WAIT_MS = 900;

/** 確かめている途中か、もう出したか（続けて完了したときに二重に出さない） */
let busy = false;
let askedDay: Day | null = null;
let celebratedDay: Day | null = null;

// 同じ日に重ねないための日付を、起動したときに読んでおく
void AsyncStorage.multiGet([ASKED_DAY_KEY, CELEBRATED_KEY])
  .then(([[, asked], [, celebrated]]) => {
    askedDay ??= asked;
    celebratedDay ??= celebrated;
  })
  .catch(() => {});

/** その日にレビューのお願いを出したか（出した日は節目のお祝いを出さない） */
export function reviewAskedOn(today: Day): boolean {
  return askedDay === today;
}

export function noteCelebrationShown(today: Day): void {
  celebratedDay = today;
  void AsyncStorage.setItem(CELEBRATED_KEY, today).catch(console.error);
}

/** 習慣を完了したあとに呼ぶ。まだ頼んでいなければ、少し待ってから1回だけ頼む */
export function askReviewAfterFirstCompletion(today: Day): void {
  if (busy || celebratedDay === today) return;
  busy = true;
  setTimeout(() => {
    ask(today)
      .then((shown) => {
        // 出したときは、この起動のあいだは busy のままにする
        if (!shown) busy = false;
      })
      .catch((e) => {
        console.error(e);
        busy = false;
      });
  }, WAIT_MS);
}

async function ask(today: Day): Promise<boolean> {
  if (AppState.currentState !== 'active') return false;
  const asked = await AsyncStorage.getItem(ASKED_KEY).catch(() => '1');
  if (asked === '1' || celebratedDay === today) return false;
  if (!(await StoreReview.hasAction().catch(() => false))) return false;
  // 待っているあいだに節目のお祝いが出たら、同じ日には重ねない
  if (celebratedDay === today || AppState.currentState !== 'active') return false;

  askedDay = today;
  await AsyncStorage.multiSet([
    [ASKED_KEY, '1'],
    [ASKED_DAY_KEY, today],
  ]).catch(console.error);
  const t = i18n.t.bind(i18n);
  Alert.alert(
    t('reviewPrompt.title'),
    t('reviewPrompt.body', { store: STORE_NAME }),
    [
      { text: t('reviewPrompt.later'), style: 'cancel' },
      { text: t('reviewPrompt.support'), onPress: () => StoreReview.requestReview().catch(console.error) },
    ],
    { cancelable: true },
  );
  return true;
}
