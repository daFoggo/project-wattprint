import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { DEFAULT_ALERT_PREFS, type AlertPrefs } from './alert-prefs';
import { askCopilot, type CopilotAnswer, type CopilotIntent, type ExperimentAppliance } from './api';
import type {
  ActiveExperiment,
  BubbleDevice,
  ChatMessage,
  ChatThread,
  EmotionType,
  ExperimentLogItem,
  UnitMode,
  UsageTab,
} from './types';

const STORAGE_KEY = 'wattprint.assistant.v1';
export const NEW_THREAD_TITLE = 'Cuộc hội thoại mới';
export const GREETING =
  'Xin chào. Tôi trả lời bằng số liệu điện của chính nhà bạn: tiền điện và bậc giá, dự báo cuối tháng, thiết bị tốn điện nhất, điều hoà, bình nóng lạnh, tủ lạnh và tải chạy nền. Bạn muốn xem gì?';
/** Câu hỏi của các cuộc hội thoại mẫu: trả lời thật từ backend khi mở app lần đầu. */
const EXAMPLE_INTENTS: CopilotIntent[] = ['saving_plan', 'month_compare', 'top_appliance'];
const FAILED_TEXT = 'Chưa lấy được câu trả lời từ máy chủ. Kiểm tra kết nối rồi hỏi lại nhé.';

/** Những gì giữ lại giữa các lần mở app: cuộc hội thoại, thử nghiệm đang chạy và đã xong. */
interface Persisted {
  threads: ChatThread[];
  activeExperiment: ActiveExperiment | null;
  experimentLogs: ExperimentLogItem[];
  alertPrefs: AlertPrefs;
  /** Đã tạo sẵn các cuộc hội thoại mẫu chưa (chỉ làm một lần, trừ khi xoá dữ liệu trên máy). */
  seeded: boolean;
}

interface EnergyStoreValue {
  // Kỳ xem và đơn vị dùng chung giữa Trang chủ / Tiêu thụ
  unit: UnitMode;
  toggleUnit: () => void;
  usageTab: UsageTab;
  setUsageTab: (tab: UsageTab) => void;
  selectedDeviceIndex: number;
  setSelectedDeviceIndex: (index: number) => void;
  /** Thiết bị đang xem chi tiết; màn `usage/device` đọc từ đây. */
  activeDeviceDetail: BubbleDevice | null;
  setActiveDeviceDetail: (device: BubbleDevice | null) => void;

  // Tài khoản
  alertPrefs: AlertPrefs;
  setAlertPref: (key: keyof AlertPrefs, value: boolean) => void;
  /** Xoá cuộc hội thoại, thử nghiệm và công tắc thông báo đã lưu trên máy. */
  resetLocalData: () => void;

  // Trợ lý AI
  threads: ChatThread[];
  createThread: () => string;
  /** Hỏi trong một cuộc hội thoại. `intent` cho câu gợi ý, bỏ trống thì trợ lý tự hiểu `text`. */
  askInThread: (threadId: string, input: { text: string; intent?: CopilotIntent }) => Promise<void>;
  /** Mở cuộc hội thoại có sẵn câu hỏi và câu trả lời (vd từ thẻ gợi ý ở trang Tiêu thụ). */
  openInsightThread: (question: string, answer: string) => string;

  // Thử nghiệm
  /** Thiết bị mà trợ lý đề nghị thử; màn Thử nghiệm mở sẵn tờ tạo với thiết bị này. */
  experimentDraft: ExperimentAppliance | null;
  setExperimentDraft: (appliance: ExperimentAppliance | null) => void;
  activeExperiment: ActiveExperiment | null;
  experimentLogs: ExperimentLogItem[];
  startExperiment: (exp: ActiveExperiment) => void;
  endExperiment: (
    emotion: EmotionType,
    result: { savedKwh: number; savedVnd: number; days: number; dateRange: string }
  ) => void;
}

const EnergyStoreContext = createContext<EnergyStoreValue | null>(null);

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function aiMessage(a: CopilotAnswer): ChatMessage {
  return {
    id: uid('ai'),
    who: 'ai',
    text: a.text,
    facts: a.facts.map((f) => ({ k: f.label, v: f.value })),
    action: a.action,
  };
}

export function EnergyStoreProvider({ children }: PropsWithChildren) {
  const [unit, setUnit] = useState<UnitMode>('kwh');
  const [usageTab, setUsageTab] = useState<UsageTab>('week');
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);
  const [activeDeviceDetail, setActiveDeviceDetail] = useState<BubbleDevice | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [experimentDraft, setExperimentDraft] = useState<ExperimentAppliance | null>(null);
  const [activeExperiment, setActiveExperiment] = useState<ActiveExperiment | null>(null);
  const [experimentLogs, setExperimentLogs] = useState<ExperimentLogItem[]>([]);
  const [alertPrefs, setAlertPrefs] = useState<AlertPrefs>(DEFAULT_ALERT_PREFS);
  const [seeded, setSeeded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Khôi phục khi mở app. Câu trả lời đang chờ của lần trước không còn ai đợi nên đánh dấu lỗi.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const saved = JSON.parse(raw) as Partial<Persisted>;
        setThreads(
          (saved.threads ?? []).map((t) => ({
            ...t,
            messages: t.messages.map((m) =>
              m.state === 'pending' ? { ...m, state: 'failed' as const, text: FAILED_TEXT } : m
            ),
          }))
        );
        // bản lưu của kiểu thử nghiệm một thiết bị (chưa có `actions`) không dùng được nữa
        const exp = saved.activeExperiment;
        setActiveExperiment(exp && Array.isArray(exp.actions) ? exp : null);
        setExperimentLogs((saved.experimentLogs ?? []).filter((l) => Array.isArray(l.devices)));
        setAlertPrefs({ ...DEFAULT_ALERT_PREFS, ...saved.alertPrefs });
        setSeeded(saved.seeded ?? (saved.threads?.length ?? 0) > 0);
      })
      .catch(() => {})
      .finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const data: Persisted = { threads, activeExperiment, experimentLogs, alertPrefs, seeded };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [hydrated, threads, activeExperiment, experimentLogs, alertPrefs, seeded]);

  // Lần đầu (hoặc sau khi xoá dữ liệu): tạo vài cuộc hội thoại mẫu bằng câu trả lời thật của backend
  useEffect(() => {
    if (!hydrated || seeded) return;
    let alive = true;
    Promise.allSettled(EXAMPLE_INTENTS.map((intent) => askCopilot({ intent }))).then((results) => {
      if (!alive) return;
      const now = Date.now();
      const made: ChatThread[] = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const a = r.value;
        made.push({
          id: uid('thread'),
          title: a.question,
          category: a.category,
          period: a.period,
          updatedAt: now - i * 1000, // giữ đúng thứ tự khi xếp theo thời gian
          messages: [{ id: uid('me'), who: 'me', text: a.question }, aiMessage(a)],
        });
      });
      if (made.length === 0) return; // không có mạng: thử lại ở lần mở sau
      setThreads((prev) => [...prev, ...made]);
      setSeeded(true);
    });
    return () => {
      alive = false;
    };
  }, [hydrated, seeded]);

  const setAlertPref = useCallback(
    (key: keyof AlertPrefs, value: boolean) => setAlertPrefs((prev) => ({ ...prev, [key]: value })),
    []
  );

  const resetLocalData = useCallback(() => {
    setThreads([]);
    setActiveExperiment(null);
    setExperimentLogs([]);
    setExperimentDraft(null);
    setAlertPrefs(DEFAULT_ALERT_PREFS);
    setSeeded(false); // tạo lại các cuộc hội thoại mẫu
  }, []);

  const toggleUnit = useCallback(() => setUnit((prev) => (prev === 'kwh' ? 'cost' : 'kwh')), []);

  const createThread = useCallback((): string => {
    const id = uid('thread');
    const thread: ChatThread = {
      id,
      title: NEW_THREAD_TITLE,
      category: 'CHUNG',
      period: '',
      updatedAt: Date.now(),
      messages: [{ id: uid('ai'), who: 'ai', text: GREETING, facts: [] }],
    };
    setThreads((prev) => [thread, ...prev]);
    return id;
  }, []);

  const openInsightThread = useCallback((question: string, answer: string): string => {
    const id = uid('thread');
    const thread: ChatThread = {
      id,
      title: question,
      category: 'TIÊU THỤ',
      period: '',
      updatedAt: Date.now(),
      messages: [
        { id: uid('me'), who: 'me', text: question },
        { id: uid('ai'), who: 'ai', text: answer, facts: [] },
      ],
    };
    setThreads((prev) => [thread, ...prev]);
    return id;
  }, []);

  const askInThread = useCallback(
    async (threadId: string, input: { text: string; intent?: CopilotIntent }) => {
      const text = input.text.trim();
      if (!text) return;
      const pendingId = uid('ai');
      const patch = (fn: (t: ChatThread) => ChatThread) =>
        setThreads((prev) => prev.map((t) => (t.id === threadId ? fn(t) : t)));

      patch((t) => ({
        ...t,
        updatedAt: Date.now(),
        messages: [
          ...t.messages,
          { id: uid('me'), who: 'me', text },
          { id: pendingId, who: 'ai', text: '', state: 'pending' },
        ],
      }));

      try {
        const answer = await askCopilot(input.intent ? { intent: input.intent } : { question: text });
        patch((t) => {
          const first = t.title === NEW_THREAD_TITLE;
          return {
            ...t,
            title: first ? text : t.title,
            category: answer.intent === 'unknown' ? t.category : answer.category,
            period: answer.intent === 'unknown' ? t.period : answer.period,
            updatedAt: Date.now(),
            messages: t.messages.map((m) => (m.id === pendingId ? { ...aiMessage(answer), id: pendingId } : m)),
          };
        });
      } catch {
        patch((t) => ({
          ...t,
          messages: t.messages.map((m) =>
            m.id === pendingId ? { id: pendingId, who: 'ai', text: FAILED_TEXT, state: 'failed' } : m
          ),
        }));
      }
    },
    []
  );

  const startExperiment = useCallback((exp: ActiveExperiment) => {
    setActiveExperiment(exp);
    setExperimentDraft(null);
  }, []);

  const endExperiment = useCallback<EnergyStoreValue['endExperiment']>(
    (emotion, result) => {
      setActiveExperiment((current) => {
        if (current) {
          const item: ExperimentLogItem = {
            id: uid('exp'),
            title: current.title,
            devices: current.actions.map((a) => a.name),
            dateRange: result.dateRange,
            days: result.days,
            savedKwh: result.savedKwh,
            savedVnd: result.savedVnd,
            emotion,
          };
          setExperimentLogs((prev) => [item, ...prev]);
        }
        return null;
      });
    },
    []
  );

  const value = useMemo<EnergyStoreValue>(
    () => ({
      unit,
      toggleUnit,
      usageTab,
      setUsageTab,
      selectedDeviceIndex,
      setSelectedDeviceIndex,
      activeDeviceDetail,
      setActiveDeviceDetail,
      alertPrefs,
      setAlertPref,
      resetLocalData,
      threads,
      createThread,
      askInThread,
      openInsightThread,
      experimentDraft,
      setExperimentDraft,
      activeExperiment,
      experimentLogs,
      startExperiment,
      endExperiment,
    }),
    [
      unit,
      toggleUnit,
      usageTab,
      selectedDeviceIndex,
      activeDeviceDetail,
      alertPrefs,
      setAlertPref,
      resetLocalData,
      threads,
      createThread,
      askInThread,
      openInsightThread,
      experimentDraft,
      activeExperiment,
      experimentLogs,
      startExperiment,
      endExperiment,
    ]
  );

  return <EnergyStoreContext.Provider value={value}>{children}</EnergyStoreContext.Provider>;
}

export function useEnergyStore(): EnergyStoreValue {
  const value = useContext(EnergyStoreContext);
  if (!value) {
    throw new Error('useEnergyStore must be used within an EnergyStoreProvider');
  }
  return value;
}
