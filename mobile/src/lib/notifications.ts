// 通知は端末の中で予約する。iOS は予約が64件までなので、近い日の分だけ予約し、
// アプリを開くたび・記録や習慣を変えるたびに予約し直す。できた日・お休みの日の通知は予約しない。
// 通知のボタン（「できた」「1回分を記録」）で、アプリを開かずに記録できる
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { addDays, dayOf, localDateAt, weekdayOf, type Day } from './day';
import { effectiveReminders, isDone, parseTime, type EntryMap, type Habit } from './habit';
import { addToEntry, allEntries, getEntry, getHabit, listHabits, setEntry } from './habits';
import { i18n } from './i18n';
import { isProNow } from './pro';
import { resolveWeekStart, useSettings } from './settings';
import { evaluateUnits, habitOn, hasEnded, isScheduledOn, todayStateOf } from './stats';
import { scheduleWidgetSync } from './widgetSync';

/** 何日先まで予約するか */
const DAYS_AHEAD = 7;
/** iOS の上限（64件）より少し少なくする */
const MAX_SCHEDULED = 60;
const CHANNEL_ID = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function permissionState(): Promise<PermissionState> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/** 許可をお願いする（画面の中のカードから呼ぶ） */
export async function requestPermission(): Promise<PermissionState> {
  try {
    await Notifications.requestPermissionsAsync();
  } catch (e) {
    console.warn('[notifications] request failed', e);
  }
  const state = await permissionState();
  if (state === 'granted') scheduleReschedule();
  return state;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: i18n.t('notifications.channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * その日に、その習慣の通知を出すか。
 * 'due'：やる日でまだできていない。'log'：上限型（記録を忘れないためのお知らせ。まとめ通知の数には入れない）
 */
function wantsReminder(h: Habit, entries: EntryMap | undefined, day: Day, today: Day): 'due' | 'log' | null {
  const map = entries ?? new Map();
  const entry = map.get(day);
  if (entry?.status === 'rest') return null;
  if (day < h.startDay || hasEnded(h, day)) return null;
  if (h.kind === 'limit') return entry ? null : 'log';
  if (isDone(h, entry)) return null;
  const weekStart = resolveWeekStart(useSettings.getState().weekStart);
  if (day === today) return todayStateOf(h, map, today, weekStart) === 'due' ? 'due' : null;
  if (h.schedule.type === 'perWeek' || h.schedule.type === 'perMonth') {
    // いまの週（月）の回数がもう届いていれば、その期間の残りの日には出さない
    const units = evaluateUnits(h, map, today, weekStart);
    const current = units[units.length - 1];
    if (current?.state === 'success' && day <= current.end) return null;
  }
  return isScheduledOn(h, map, day) ? 'due' : null;
}

/**
 * identifier は「ongo.<習慣の ID>.<day>.<番号>」。ウィジェットから記録したときに、その日の通知を消すのに使う
 * （targets/widget/Store.swift の removeReminders）
 */
type Planned = {
  at: Date;
  title: string;
  body: string;
  identifier: string;
  /** 通知のボタンの種類（習慣の通知だけ） */
  category?: string;
  data: Record<string, string>;
};

// ---- 通知のボタン ----

/** 「できた」の習慣の通知 */
const CATEGORY_CHECK = 'ongoCheck';
/** 数値・上限の習慣の通知（1回分を足す） */
const CATEGORY_ADD = 'ongoAdd';
const ACTION_RECORD = 'record';

/**
 * ボタンの種類を登録する（言語やロックの設定が変わったら登録し直す）。
 * アプリのロックをオンにしているときは、端末のロックを解いてから記録する
 */
async function ensureCategories(): Promise<void> {
  const isAuthenticationRequired = useSettings.getState().appLock;
  const options = { opensAppToForeground: false, isAuthenticationRequired, isDestructive: false };
  await Notifications.setNotificationCategoryAsync(CATEGORY_CHECK, [
    { identifier: ACTION_RECORD, buttonTitle: i18n.t('notifications.actionDone'), options },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY_ADD, [
    { identifier: ACTION_RECORD, buttonTitle: i18n.t('notifications.actionAdd'), options },
  ]);
}

const HANDLED_KEY = 'ongo.handledNotificationActions';

/** 同じボタンの操作を二度記録しない（受け取りの処理が二度動くことがあるため） */
async function markHandled(key: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(HANDLED_KEY).catch(() => null);
  const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
  if (list.includes(key)) return false;
  await AsyncStorage.setItem(HANDLED_KEY, JSON.stringify([...list, key].slice(-50))).catch(() => {});
  return true;
}

/** 通知のボタンで記録する：「できた」は、できていなければできたにする（取り消しはしない）。数値・上限は1回分を足す */
async function recordFromNotification(habitId: string, day: string, key: string): Promise<void> {
  if (!(await markHandled(key))) return;
  const raw = getHabit(habitId);
  if (!raw || raw.archivedDay) return;
  // 前の日の通知なら、その日に使っていた決まりで記録する
  const habit = habitOn(raw, day);
  if (habit.kind === 'check') {
    if (getEntry(habitId, day)?.status !== 'done') setEntry(habitId, day, { status: 'done', value: 1 });
  } else {
    addToEntry(habitId, day, habit.step);
  }
  scheduleWidgetSync();
  await rescheduleNotifications();
}

type ResponseLike = {
  actionIdentifier?: unknown;
  notification?: { date?: unknown; request?: { identifier?: unknown; content?: { data?: unknown } } };
};

function handleResponse(response: ResponseLike): void {
  if (response.actionIdentifier !== ACTION_RECORD) return;
  const request = response.notification?.request;
  const data = (request?.content?.data ?? {}) as Record<string, unknown>;
  const { habitId, day } = data;
  if (typeof habitId !== 'string' || typeof day !== 'string') return;
  const key = `${String(request?.identifier)}|${String(response.notification?.date)}`;
  void recordFromNotification(habitId, day, key).catch((e) => console.warn('[notifications] record failed', e));
}

// iOS：アプリが閉じていても、ボタンを押すと裏で起動してここに届く。起動してすぐ受け取れるよう、読み込んだときに登録する
Notifications.addNotificationResponseReceivedListener((response) => handleResponse(response));
// 起動のきっかけになった操作も確かめる（二度記録しないよう markHandled で防ぐ）
Notifications.getLastNotificationResponseAsync()
  .then((response) => {
    if (response) handleResponse(response);
  })
  .catch(() => {});

// Android：アプリが終了しているときは、裏の処理（タスク）に届く
const ACTION_TASK = 'ongo-notification-action';
TaskManager.defineTask<Notifications.NotificationTaskPayload>(ACTION_TASK, async ({ data }) => {
  if (data && typeof data === 'object' && 'actionIdentifier' in data) handleResponse(data as ResponseLike);
});
if (Platform.OS === 'android') {
  Notifications.registerTaskAsync(ACTION_TASK).catch((e) => console.warn('[notifications] task failed', e));
}

export function planNotifications(now: Date): Planned[] {
  const { dayStartHour, summaryEnabled, summaryTime } = useSettings.getState();
  const isPro = isProNow();
  const today = dayOf(now, dayStartHour);
  const habits = listHabits();
  const entries = allEntries();
  const planned: Planned[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const weekday = weekdayOf(day);
    let dueCount = 0;
    for (const habit of habits) {
      const want = wantsReminder(habit, entries.get(habit.id), day, today);
      if (!want) continue;
      if (want === 'due') dueCount += 1;
      for (const [n, r] of effectiveReminders(habit.reminders, isPro).entries()) {
        if (r.days && !r.days.includes(weekday)) continue;
        const { hour, minute } = parseTime(r.time);
        const at = localDateAt(day, hour, minute, dayStartHour);
        if (at > now) {
          planned.push({
            at,
            title: habit.name,
            body: i18n.t(want === 'log' ? 'notifications.logBody' : 'notifications.habitBody'),
            identifier: `ongo.${habit.id}.${day}.${n}`,
            category: habit.kind === 'check' ? CATEGORY_CHECK : CATEGORY_ADD,
            data: { habitId: habit.id, day },
          });
        }
      }
    }
    if (summaryEnabled && dueCount > 0) {
      const { hour, minute } = parseTime(summaryTime);
      const at = localDateAt(day, hour, minute, dayStartHour);
      if (at > now) {
        planned.push({
          at,
          title: i18n.t('notifications.summaryTitle'),
          body: i18n.t('notifications.summaryBody', { count: dueCount }),
          identifier: `ongo.summary.${day}`,
          data: {},
        });
      }
    }
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED);
}

let running: Promise<void> | null = null;
let again = false;

export async function rescheduleNotifications(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        if ((await permissionState()) !== 'granted') {
          await Notifications.cancelAllScheduledNotificationsAsync();
          return;
        }
        await ensureChannel();
        await ensureCategories();
        const planned = planNotifications(new Date());
        await Notifications.cancelAllScheduledNotificationsAsync();
        for (const p of planned) {
          await Notifications.scheduleNotificationAsync({
            identifier: p.identifier,
            content: { title: p.title, body: p.body, data: p.data, categoryIdentifier: p.category },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL_ID },
          });
        }
      } while (again);
    } catch (e) {
      console.warn('[notifications] reschedule failed', e);
    } finally {
      running = null;
    }
  })();
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** 少し待ってから予約し直す（続けて記録したときにまとめる） */
export function scheduleReschedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void rescheduleNotifications();
  }, 600);
}
