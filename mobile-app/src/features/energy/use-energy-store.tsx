import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import {
  CURRENT_TIER,
  DAYS_LEFT,
  DEFAULT_ACTIVE_EXPERIMENT,
  HEADROOM,
  INITIAL_CHAT,
  MOCK_CHAT_THREADS,
  MOCK_EXP_LOG,
  MOCK_SUGGESTIONS,
  MONTH_KWH,
  PACE,
} from './mock';
import type {
  ActiveExperiment,
  BreakdownView,
  BubbleDevice,
  ChatMessage,
  ChatThread,
  CustomerType,
  EmotionType,
  ExperimentLogItem,
  ExperimentState,
  Range,
  TariffPlan,
  UnitMode,
  UsageTab,
} from './types';

interface EnergyStoreValue {
  // Legacy / Common
  range: Range;
  tariff: TariffPlan;
  setRange: (range: Range) => void;
  setTariff: (tariff: TariffPlan) => void;

  // Unit toggle (kWh ⇄ VND)
  unit: UnitMode;
  toggleUnit: () => void;

  // Usage Screen State
  usageTab: UsageTab;
  setUsageTab: (tab: UsageTab) => void;
  breakdownView: BreakdownView;
  setBreakdownView: (view: BreakdownView) => void;
  selectedDeviceIndex: number;
  setSelectedDeviceIndex: (index: number) => void;
  selectedUsageBar: number;
  setSelectedUsageBar: (index: number) => void;
  activeDeviceDetail: BubbleDevice | null;
  setActiveDeviceDetail: (device: BubbleDevice | null) => void;
  customerType: CustomerType;
  setCustomerType: (type: CustomerType) => void;
  chartBreakdown: 'tou' | 'tier';
  setChartBreakdown: (mode: 'tou' | 'tier') => void;

  // Copilot Chat State
  threads: ChatThread[];
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  createThread: (title?: string) => string;
  sendChatMessageToThread: (threadId: string, text: string) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (query: string) => void;

  // Experiment State
  experimentState: ExperimentState;
  setExperimentState: (state: ExperimentState) => void;
  experimentTemp: number;
  setExperimentTemp: React.Dispatch<React.SetStateAction<number>>;
  activeExperiment: ActiveExperiment | null;
  setActiveExperiment: (exp: ActiveExperiment | null) => void;
  experimentLogs: ExperimentLogItem[];
  startExperiment: (exp: ActiveExperiment) => void;
  endExperiment: (emotion: EmotionType) => void;
}

const EnergyStoreContext = createContext<EnergyStoreValue | null>(null);

export function EnergyStoreProvider({ children }: PropsWithChildren) {
  const [range, setRange] = useState<Range>('week');
  const [tariff, setTariff] = useState<TariffPlan>('tiered');
  const [unit, setUnit] = useState<UnitMode>('kwh');
  const [usageTab, setUsageTab] = useState<UsageTab>('week');
  const [breakdownView, setBreakdownView] = useState<BreakdownView>('bubble');
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);
  const [selectedUsageBar, setSelectedUsageBar] = useState<number>(3);
  const [activeDeviceDetail, setActiveDeviceDetail] = useState<BubbleDevice | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>('home');
  const [chartBreakdown, setChartBreakdown] = useState<'tou' | 'tier'>('tier');
  const [threads, setThreads] = useState<ChatThread[]>(MOCK_CHAT_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [experimentState, setExperimentState] = useState<ExperimentState>('running');
  const [experimentTemp, setExperimentTemp] = useState<number>(26.5);
  const [activeExperiment, setActiveExperiment] = useState<ActiveExperiment | null>(DEFAULT_ACTIVE_EXPERIMENT);
  const [experimentLogs, setExperimentLogs] = useState<ExperimentLogItem[]>(MOCK_EXP_LOG);

  const startExperiment = useCallback((exp: ActiveExperiment) => {
    setActiveExperiment(exp);
    setExperimentState('running');
  }, []);

  const endExperiment = useCallback((emotion: EmotionType) => {
    if (activeExperiment) {
      const savedVnd = activeExperiment.predictedSavedVnd;
      const savedKwh = Math.round(activeExperiment.predictedSavedKwh * activeExperiment.currentDay * 10) / 10;
      const newLogItem: ExperimentLogItem = {
        id: `exp-${Date.now()}`,
        title: activeExperiment.title,
        date: 'Hôm nay (3 ngày)',
        savedVnd,
        savedKwh,
        good: emotion !== 'uncomfortable',
        emotion,
        note: emotion === 'comfortable' ? 'Thoải mái, sinh hoạt bình thường' : emotion === 'neutral' ? 'Bình thường, quen dần' : 'Bất tiện, cần điều chỉnh',
      };
      setExperimentLogs((prev) => [newLogItem, ...prev]);
    }
    setActiveExperiment(null);
    setExperimentState('summary');
  }, [activeExperiment]);

  const toggleUnit = () => {
    setUnit((prev) => (prev === 'kwh' ? 'cost' : 'kwh'));
  };

  const createThread = useCallback((title?: string): string => {
    const newId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: title || 'Cuộc hội thoại mới',
      category: 'CHUNG',
      period: 'HÔM NAY',
      timeAgo: 'Vừa xong',
      group: 'today',
      dotColor: '#B5E930',
      messages: [
        {
          id: `msg-${Date.now()}`,
          who: 'ai',
          text: 'Chào buổi tối. Công tơ điện của bạn đang hoạt động và đã đồng bộ dữ liệu 30 ngày qua. Hãy hỏi về bất kỳ chỉ số nào để xem chi tiết nguồn gốc.',
          facts: [],
        },
      ],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    return newId;
  }, []);

  const sendChatMessageToThread = useCallback((threadId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      who: 'me',
      text: trimmed,
    };

    const hit = MOCK_SUGGESTIONS.find((s) => s.q.toLowerCase() === trimmed.toLowerCase());
    const budget = HEADROOM / DAYS_LEFT;

    let aiMsg: ChatMessage;
    if (hit) {
      let ansText = hit.a;
      let facts = Array.isArray(hit.facts) ? hit.facts : [];

      if (hit.a === 'TIER_ANSWER') {
        ansText = `Bạn đã dùng ${MONTH_KWH} kWh và còn ${DAYS_LEFT} ngày nữa trong chu kỳ. Để duy trì ở ${CURRENT_TIER.name.toLowerCase()}, bạn cần giữ mức dùng ${budget.toFixed(1)} kWh/ngày so với mức ${PACE.toFixed(1)} hiện tại. Chuyển bình nóng lạnh sang khung giờ 22:00 sẽ bù đắp được khoảng một nửa khoảng cách này.`;
        facts = [
          { k: 'Đã dùng đến nay', v: `${MONTH_KWH} kWh` },
          { k: 'Mức dự phòng', v: `${HEADROOM} kWh` },
          { k: 'Hạn mức ngày', v: `${budget.toFixed(1)} kWh` },
        ];
      } else if (hit.a === 'PHANTOM_ANSWER') {
        const W = 35;
        const kwh = (W * 24 * 30) / 1000;
        const vnd = kwh * CURRENT_TIER.price;
        ansText = `Từ 02:00 đến 05:00 sáng, công suất nền ổn định ở mức ${W} W sau khi loại trừ chu kỳ tủ lạnh. Mức này tiêu tốn khoảng ${kwh.toFixed(0)} kWh/tháng từ cụm TV và modem wifi, tính theo bậc cận biên (${CURRENT_TIER.name.toLowerCase()}), tương đương khoảng ${Math.round(vnd).toLocaleString('vi-VN')} đ.`;
        facts = [
          { k: 'Công suất chờ', v: `${W} W` },
          { k: 'Lãng phí hàng tháng', v: `${kwh.toFixed(0)} kWh` },
          { k: `Tính theo ${CURRENT_TIER.name}`, v: `${Math.round(vnd).toLocaleString('vi-VN')} đ` },
        ];
      }

      aiMsg = {
        id: `ai-${Date.now() + 1}`,
        who: 'ai',
        text: ansText,
        facts,
        cta: hit.cta,
        ctaDesc: hit.ctaDesc,
      };
    } else {
      aiMsg = {
        id: `ai-${Date.now() + 1}`,
        who: 'ai',
        text: 'Tôi đã đối chiếu số liệu với công tơ, thời tiết và biểu phí EVN hiện hành. Không có yếu tố đơn lẻ nào trong 30 ngày qua giải thích cho sự chênh lệch này, mức biến động vẫn nằm trong giới hạn bình thường.',
        facts: [
          { k: 'Số ngày đồng bộ', v: '30' },
          { k: 'Độ tin cậy', v: 'Trung bình' },
        ],
      };
    }

    setThreads((prev) =>
      prev.map((th) => {
        if (th.id === threadId) {
          const isNewInquiry = th.title === 'Cuộc hội thoại mới' || th.title === 'New inquiry';
          const newTitle = isNewInquiry ? trimmed : th.title;
          let newCategory = th.category;
          let newDotColor = th.dotColor;
          if (isNewInquiry) {
            const lower = trimmed.toLowerCase();
            if (lower.includes('bill') || lower.includes('tier') || lower.includes('bậc') || lower.includes('hóa đơn')) {
              newCategory = 'HÓA ĐƠN';
              newDotColor = '#2F7A0C';
            } else if (lower.includes('ac') || lower.includes('air') || lower.includes('điều hòa')) {
              newCategory = 'ĐIỀU HÒA';
              newDotColor = '#B5E930';
            } else if (lower.includes('phantom') || lower.includes('standby') || lower.includes('chạy ngầm') || lower.includes('chờ')) {
              newCategory = 'CHẠY NGẦM';
              newDotColor = '#4A6B60';
            } else if (lower.includes('water') || lower.includes('heat') || lower.includes('nóng lạnh')) {
              newCategory = 'BÌNH NÓNG LẠNH';
              newDotColor = '#B5E930';
            } else if (lower.includes('fridge') || lower.includes('tủ lạnh')) {
              newCategory = 'TỦ LẠNH';
              newDotColor = '#164437';
            } else if (lower.includes('cook') || lower.includes('bếp')) {
              newCategory = 'BẾP TỪ';
              newDotColor = '#8CD41C';
            }
          }
          return {
            ...th,
            title: newTitle,
            category: newCategory,
            dotColor: newDotColor,
            timeAgo: 'Vừa xong',
            messages: [...th.messages, userMsg, aiMsg],
          };
        }
        return th;
      })
    );
  }, []);

  const sendChatMessage = useCallback((query: string) => {
    if (activeThreadId) {
      sendChatMessageToThread(activeThreadId, query);
    }
    const trimmed = query.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      who: 'me',
      text: trimmed,
    };

    const hit = MOCK_SUGGESTIONS.find((s) => s.q.toLowerCase() === trimmed.toLowerCase());
    const budget = HEADROOM / DAYS_LEFT;

    let aiMsg: ChatMessage;
    if (hit) {
      let text = hit.a;
      let facts = Array.isArray(hit.facts) ? hit.facts : [];

      if (hit.a === 'TIER_ANSWER') {
        text = `Bạn đã dùng ${MONTH_KWH} kWh và còn ${DAYS_LEFT} ngày nữa trong chu kỳ. Để duy trì ở ${CURRENT_TIER.name.toLowerCase()}, bạn cần giữ mức dùng ${budget.toFixed(1)} kWh/ngày so với mức ${PACE.toFixed(1)} hiện tại. Chuyển bình nóng lạnh sang khung giờ 22:00 sẽ bù đắp được khoảng một nửa khoảng cách này.`;
        facts = [
          { k: 'Đã dùng đến nay', v: `${MONTH_KWH} kWh` },
          { k: 'Mức dự phòng', v: `${HEADROOM} kWh` },
          { k: 'Hạn mức ngày', v: `${budget.toFixed(1)} kWh` },
        ];
      } else if (hit.a === 'PHANTOM_ANSWER') {
        const W = 35;
        const kwh = (W * 24 * 30) / 1000;
        const vnd = kwh * CURRENT_TIER.price;
        text = `Từ 02:00 đến 05:00 sáng, công suất nền ổn định ở mức ${W} W sau khi loại trừ chu kỳ tủ lạnh. Mức này tiêu tốn khoảng ${kwh.toFixed(0)} kWh/tháng từ cụm TV và modem wifi, tính theo bậc cận biên (${CURRENT_TIER.name.toLowerCase()}), tương đương khoảng ${Math.round(vnd).toLocaleString('vi-VN')} đ.`;
        facts = [
          { k: 'Công suất chờ', v: `${W} W` },
          { k: 'Lãng phí hàng tháng', v: `${kwh.toFixed(0)} kWh` },
          { k: `Tính theo ${CURRENT_TIER.name}`, v: `${Math.round(vnd).toLocaleString('vi-VN')} đ` },
        ];
      }

      aiMsg = {
        id: `ai-${Date.now() + 1}`,
        who: 'ai',
        text,
        facts,
        cta: hit.cta,
        ctaDesc: hit.ctaDesc,
      };
    } else {
      aiMsg = {
        id: `ai-${Date.now() + 1}`,
        who: 'ai',
        text: 'Tôi đã đối chiếu số liệu với công tơ, thời tiết và biểu phí EVN hiện hành. Không có yếu tố đơn lẻ nào trong 30 ngày qua giải thích cho sự chênh lệch này, mức biến động vẫn nằm trong giới hạn bình thường.',
        facts: [
          { k: 'Số ngày đồng bộ', v: '30' },
          { k: 'Độ tin cậy', v: 'Trung bình' },
        ],
      };
    }

    setChatMessages((prev) => [...prev, userMsg, aiMsg]);
  }, [activeThreadId, sendChatMessageToThread]);

  const value = useMemo<EnergyStoreValue>(
    () => ({
      range,
      tariff,
      setRange,
      setTariff,
      unit,
      toggleUnit,
      usageTab,
      setUsageTab,
      breakdownView,
      setBreakdownView,
      selectedDeviceIndex,
      setSelectedDeviceIndex,
      selectedUsageBar,
      setSelectedUsageBar,
      activeDeviceDetail,
      setActiveDeviceDetail,
      customerType,
      setCustomerType,
      chartBreakdown,
      setChartBreakdown,
      threads,
      activeThreadId,
      setActiveThreadId,
      createThread,
      sendChatMessageToThread,
      chatMessages,
      sendChatMessage,
      experimentState,
      setExperimentState,
      experimentTemp,
      setExperimentTemp,
      activeExperiment,
      setActiveExperiment,
      experimentLogs,
      startExperiment,
      endExperiment,
    }),
    [
      range,
      tariff,
      unit,
      usageTab,
      breakdownView,
      selectedDeviceIndex,
      selectedUsageBar,
      activeDeviceDetail,
      customerType,
      chartBreakdown,
      threads,
      activeThreadId,
      createThread,
      sendChatMessageToThread,
      chatMessages,
      sendChatMessage,
      experimentState,
      experimentTemp,
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

