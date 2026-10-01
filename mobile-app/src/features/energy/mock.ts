import type {
  AccountGroup,
  ChatMessage,
  ChatThread,
  ActiveExperiment,
  ExperimentLogItem,
  Suggestion,
  TierInfo,
} from './types';

export const TIERS: TierInfo[] = [
  { name: 'Bậc 1', sub: '0 đến 50 kWh, 1.984 đ', price: 1984, cap: 50, color: '#DEEEBD', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 2', sub: '51 đến 100 kWh, 2.050 đ', price: 2050, cap: 100, color: '#B5E930', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 3', sub: '101 đến 200 kWh, 2.380 đ', price: 2380, cap: 200, color: '#389E1E', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 4', sub: '201 đến 300 kWh, 2.998 đ', price: 2998, cap: 300, color: '#164437', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 5', sub: '301 đến 400 kWh, 3.350 đ', price: 3350, cap: 400, color: '#E5A93C', symbol: '■', pattern: 'solid' },
  { name: 'Bậc 6', sub: 'trên 400 kWh, 3.460 đ', price: 3460, cap: Infinity, color: '#DC2626', symbol: '■', pattern: 'solid' },
];

export const DAILY = [19, 21, 18, 22, 20, 17, 23, 19, 21, 20, 18, 22, 19, 25];

export const MONTH_KWH = DAILY.reduce((a, b) => a + b, 0);
export const DAYS_IN = DAILY.length;
export const DAYS_LEFT = 30 - DAYS_IN;
export const PACE = MONTH_KWH / DAYS_IN;
export const NEXT_I = TIERS.findIndex((t) => t.cap > MONTH_KWH);
export const CURRENT_TIER = TIERS[NEXT_I] ?? TIERS[2];
export const HEADROOM = CURRENT_TIER.cap - MONTH_KWH;

export const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    q: 'Tại sao hóa đơn tăng 35%?',
    a: 'Có hai nguyên nhân cộng dồn trong tuần này. Nhiệt độ ngoài trời trung bình 38,5°C, cao hơn tuần trước 4 độ, khiến máy nén chạy hết công suất lâu hơn 40%. Tổng điện dùng cũng đã vượt 200 kWh, nên phần điện sau đó bị tính theo bậc giá cao hơn.',
    facts: [
      { k: 'Nhiệt độ ngoài trời', v: '38,5 °C' },
      { k: 'Thời gian máy nén chạy', v: '+40%' },
      { k: 'Bậc giá hiện tại', v: 'Bậc 3' },
    ],
    cta: 'Bắt đầu thử nghiệm',
    ctaDesc: '3 ngày ở mức 26,5°C',
  },
  {
    q: 'Tải chạy ngầm của tôi là bao nhiêu?',
    a: 'Từ 02:00 đến 05:00 sáng, công suất nền ổn định ở mức 35 W sau khi loại trừ chu kỳ tủ lạnh. Mức này tiêu tốn khoảng 25 kWh/tháng từ cụm TV và modem wifi, tính theo bậc cao nhất hiện tại (Bậc 3) tương đương khoảng 57.000 đ.',
    facts: [
      { k: 'Công suất chờ', v: '35 W' },
      { k: 'Lãng phí hàng tháng', v: '25 kWh' },
      { k: 'Tính theo Bậc 3', v: '57.000 đ' },
    ],
    cta: '',
  },
  {
    q: 'Làm sao để giữ nguyên bậc điện này?',
    a: 'Bạn đã dùng 284 kWh và còn 16 ngày nữa trong chu kỳ. Để duy trì ở Bậc 3, bạn cần giữ mức dùng 6,4 kWh/ngày so với mức 19,8 kWh hiện tại. Chuyển bình nóng lạnh sang khung giờ 22:00 sẽ bù đắp được khoảng một nửa khoảng cách này.',
    facts: [
      { k: 'Đã dùng đến nay', v: '284 kWh' },
      { k: 'Mức dự phòng', v: '16 kWh' },
      { k: 'Hạn mức hàng ngày', v: '6,4 kWh' },
    ],
    cta: 'Bắt đầu thử nghiệm',
    ctaDesc: '3 ngày ở mức 26,5°C',
  },
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg-0',
    who: 'ai',
    text: 'Chào buổi tối. Công tơ điện của bạn đang hoạt động và đã đồng bộ dữ liệu 30 ngày qua. Hãy hỏi về bất kỳ chỉ số nào để xem chi tiết nguồn gốc.',
    facts: [],
  },
];

export const MOCK_CHAT_THREADS: ChatThread[] = [
  {
    id: 'thread-1',
    title: 'Tại sao hóa đơn tăng 35%?',
    category: 'ĐIỀU HÒA',
    period: 'THG 9',
    timeAgo: '2 giờ trước',
    group: 'today',
    dotColor: '#B5E930',
    messages: [
      {
        id: 't1-m1',
        who: 'me',
        text: 'Tại sao hóa đơn tháng này tăng 35% so với tháng trước?',
      },
      {
        id: 't1-m2',
        who: 'ai',
        text: 'Tháng 9 nóng hơn tháng 8 khoảng 2,4°C, đẩy thời gian chạy điều hòa phòng khách từ 4,8 lên 8,1 giờ mỗi ngày. Lượng điện tăng thêm 98 kWh đã đẩy 42 kWh sang Bậc 4 (3.151 đ/kWh), chiếm 31% mức tăng chi phí.',
        facts: [
          { k: 'THỜI GIAN CHẠY AC', v: '8,1h/ngày (+68%)' },
          { k: 'CHÊNH LỆCH NHIỆT ĐỘ', v: '+2,4°C tb' },
          { k: 'CHUYỂN SANG BẬC 4', v: '42 kWh' },
        ],
        cta: 'Bắt đầu thử nghiệm',
        ctaDesc: 'AC 26°C + quạt',
      },
    ],
  },
  {
    id: 'thread-2',
    title: 'Tải chạy ngầm sau nửa đêm',
    category: 'CHẠY NGẦM',
    period: '30 NGÀY',
    timeAgo: '5 giờ trước',
    group: 'today',
    dotColor: '#4A6B60',
    messages: [
      {
        id: 't2-m1',
        who: 'me',
        text: 'Thiết bị nào đang chạy ngầm sau nửa đêm?',
      },
      {
        id: 't2-m2',
        who: 'ai',
        text: 'Từ 02:00 đến 05:00 sáng, công suất nền duy trì ở 35 W sau khi trừ chu kỳ máy nén tủ lạnh. Lượng điện này tiêu hao khoảng 25 kWh/tháng từ cụm TV và modem mạng, tính theo bậc cận biên (Bậc 3) tương đương khoảng 71.000 đ.',
        facts: [
          { k: 'CÔNG SUẤT CHỜ', v: '35 W' },
          { k: 'TIÊU HAO THÁNG', v: '25 kWh' },
          { k: 'ƯỚC TÍNH CHI PHÍ', v: '71.000 đ' },
        ],
        cta: 'Thử ngắt ổ cắm cụm TV',
      },
    ],
  },
  {
    id: 'thread-3',
    title: 'Khung giờ bật bình nóng lạnh',
    category: 'BÌNH NÓNG LẠNH',
    period: 'THG 8',
    timeAgo: 'Thứ Hai',
    group: 'this_week',
    dotColor: '#B5E930',
    messages: [
      {
        id: 't3-m1',
        who: 'me',
        text: 'Bật bình nóng lạnh vào khung giờ nào tiết kiệm nhất?',
      },
      {
        id: 't3-m2',
        who: 'ai',
        text: 'Bình nóng lạnh gián tiếp của bạn tiêu thụ 2.500 W trong 35 phút mỗi chu kỳ đun. Cài đặt đun trong khoảng 22:00 đến 23:00 sẽ tránh được giờ cao điểm và giảm hao phí nhiệt dự phòng qua đêm trước khi tắm buổi sáng.',
        facts: [
          { k: 'CÔNG SUẤT', v: '2.500 W' },
          { k: 'THỜI GIAN ĐUN', v: '35 phút' },
          { k: 'KHUNG GIỜ TỐI ƯU', v: '22:00–23:00' },
        ],
        cta: 'Hẹn giờ bình nóng lạnh 22:00',
      },
    ],
  },
  {
    id: 'thread-4',
    title: 'Làm sao để giữ nguyên bậc điện này?',
    category: 'HÓA ĐƠN',
    period: 'THG 9',
    timeAgo: 'Chủ Nhật',
    group: 'this_week',
    dotColor: '#2F7A0C',
    messages: [
      {
        id: 't4-m1',
        who: 'me',
        text: 'Làm sao để giữ trong Bậc 3 tháng này?',
      },
      {
        id: 't4-m2',
        who: 'ai',
        text: 'Bạn đã dùng 284 kWh và còn 6 ngày nữa trong chu kỳ. Để ở trong Bậc 3, bạn cần duy trì ngân sách 2,7 kWh/ngày so với mức 4,2 kWh hiện tại. Chuyển bình nóng lạnh sang khung giờ 22:00 sẽ giảm được khoảng một nửa khoảng chênh này.',
        facts: [
          { k: 'ĐÃ DÙNG ĐẾN NAY', v: '284 kWh' },
          { k: 'MỨC DỰ PHÒNG', v: '16 kWh' },
          { k: 'HẠN MỨC NGÀY', v: '2,7 kWh/ngày' },
        ],
        cta: 'Bắt đầu thử nghiệm',
        ctaDesc: '3 ngày ở mức 26,5°C',
      },
    ],
  },
  {
    id: 'thread-5',
    title: 'Tủ lạnh có đóng ngắt quá thường xuyên?',
    category: 'TỦ LẠNH',
    period: 'THG 8',
    timeAgo: '28 Thg 8',
    group: 'earlier',
    dotColor: '#164437',
    messages: [
      {
        id: 't5-m1',
        who: 'me',
        text: 'Tủ lạnh đóng ngắt chu kỳ liên tục trong ngày có bình thường không?',
      },
      {
        id: 't5-m2',
        who: 'ai',
        text: 'Máy nén tủ lạnh đã đóng ngắt 38 lần ngày hôm qua, trung bình chạy 18 phút và nghỉ 20 phút. Chu kỳ này là bình thường với nhiệt độ phòng 32°C, tuy nhiên bụi bẩn bám trên dàn nóng có thể làm tăng tần suất đóng ngắt thêm ~10%.',
        facts: [
          { k: 'CHU KỲ HÀNG NGÀY', v: '38 lần' },
          { k: 'THỜI GIAN CHẠY TB', v: '18 phút' },
          { k: 'ẢNH HƯỞNG BỤI DÀN', v: '+10% tần suất' },
        ],
        cta: 'Ghi nhận kiểm tra dàn nóng',
      },
    ],
  },
  {
    id: 'thread-6',
    title: 'Bếp từ so với nồi cơm điện',
    category: 'BẾP TỪ',
    period: 'THG 8',
    timeAgo: '21 Thg 8',
    group: 'earlier',
    dotColor: '#8CD41C',
    messages: [
      {
        id: 't6-m1',
        who: 'me',
        text: 'Nấu bằng bếp từ hay nồi cơm điện tốn ít điện hơn?',
      },
      {
        id: 't6-m2',
        who: 'ai',
        text: 'Một lần nấu 45 phút trên bếp từ tiêu thụ khoảng 0,85 kWh. Nồi cơm điện chuyên dụng chỉ tiêu thụ 0,32 kWh để nấu cộng thêm 0,04 kWh/h để giữ ấm. Khi nấu các món hạt/cơm, nồi cơm điện tiết kiệm hơn ~60% điện năng so với bếp từ.',
        facts: [
          { k: 'BỮA ĂN BẾP TỪ', v: '0,85 kWh' },
          { k: 'NỒI CƠM ĐIỆN', v: '0,32 kWh' },
          { k: 'TIẾT KIỆM ĐIỆN', v: '~60%' },
        ],
        cta: 'So sánh tải nấu ăn trong Thử nghiệm',
      },
    ],
  },
];

export const DEFAULT_ACTIVE_EXPERIMENT: ActiveExperiment = {
  id: 'exp-active-1',
  deviceId: 'dev-0',
  deviceName: 'Điều hòa',
  title: 'Điều hòa phòng khách 26,5°C kèm quạt thay vì 24°C',
  baselineKwh: 8.2,
  targetKwh: 5.1,
  predictedSavedKwh: 3.1,
  predictedSavedVnd: 85000,
  currentDay: 3,
  totalDays: 7,
  dailyLogs: [
    { day: 1, date: '12/09', kwh: 5.2, runtime: '5h 10p' },
    { day: 2, date: '13/09', kwh: 4.9, runtime: '4h 45p' },
    { day: 3, date: '14/09 (Hôm nay)', kwh: 5.1, runtime: '5h 00p' },
  ],
};

export interface ExperimentTemplate {
  deviceId: string;
  deviceName: string;
  title: string;
  defaultTarget: number;
  minTarget: number;
  maxTarget: number;
  step: number;
  unit: string;
  baselineKwh: number;
  defaultTargetKwh: number;
  calcPrediction: (targetVal: number, extraOption?: boolean) => {
    targetKwh: number;
    savedKwhPerDay: number;
    savedVndPerWeek: number;
    pct: number;
    summary: string;
  };
}

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    deviceId: 'dev-0',
    deviceName: 'Điều hòa',
    title: 'Điều hòa phòng khách kèm quạt',
    defaultTarget: 26.5,
    minTarget: 24.0,
    maxTarget: 29.0,
    step: 0.5,
    unit: '°C',
    baselineKwh: 8.2,
    defaultTargetKwh: 5.1,
    calcPrediction: (targetTemp: number, withFan = true) => {
      const delta = targetTemp - 24;
      const pct = Math.min(50, Math.max(10, Math.round(delta * 7 + (withFan ? 8 : 0))));
      const savedKwh = Math.round(8.2 * (pct / 100) * 10) / 10;
      const targetKwh = Math.round((8.2 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      return {
        targetKwh,
        savedKwhPerDay: savedKwh,
        savedVndPerWeek: savedVnd,
        pct,
        summary: `Tăng nhiệt độ lên ${targetTemp.toFixed(1)}°C ${withFan ? 'kèm quạt gió' : ''} giúp máy nén ngắt nghỉ sớm hơn, giảm ~${pct}% điện năng thiết bị.`,
      };
    },
  },
  {
    deviceId: 'dev-1',
    deviceName: 'Bình nóng lạnh',
    title: 'Chuyển khung giờ & thời gian đun nước',
    defaultTarget: 20,
    minTarget: 15,
    maxTarget: 40,
    step: 5,
    unit: 'phút',
    baselineKwh: 4.8,
    defaultTargetKwh: 3.2,
    calcPrediction: (minutes: number) => {
      const savedKwh = Math.round(((45 - minutes) / 45) * 2.2 * 10) / 10;
      const targetKwh = Math.round((4.8 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      const pct = Math.round((savedKwh / 4.8) * 100);
      return {
        targetKwh,
        savedKwhPerDay: savedKwh,
        savedVndPerWeek: savedVnd,
        pct,
        summary: `Bật bình trước khi tắm ${minutes} phút thay vì cắm liên tục giúp giảm thất thoát nhiệt dư thừa qua đêm.`,
      };
    },
  },
  {
    deviceId: 'dev-2',
    deviceName: 'Bếp từ',
    title: 'Nấu ăn tập trung & điều chỉnh công suất',
    defaultTarget: 35,
    minTarget: 20,
    maxTarget: 60,
    step: 5,
    unit: 'phút',
    baselineKwh: 2.6,
    defaultTargetKwh: 1.8,
    calcPrediction: (minutes: number) => {
      const savedKwh = Math.round(((50 - minutes) / 50) * 1.2 * 10) / 10;
      const targetKwh = Math.round((2.6 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      const pct = Math.round((savedKwh / 2.6) * 100);
      return {
        targetKwh,
        savedKwhPerDay: Math.max(0.1, savedKwh),
        savedVndPerWeek: Math.max(5000, savedVnd),
        pct: Math.max(5, pct),
        summary: 'Chuẩn bị sẵn nguyên liệu và tận dụng nhiệt dư tắt bếp sớm 2-3 phút giúp giảm tiêu thụ điện nấu ăn.',
      };
    },
  },
  {
    deviceId: 'dev-3',
    deviceName: 'Tủ lạnh',
    title: 'Cài đặt nhiệt độ ngăn mát mức tối ưu',
    defaultTarget: 4,
    minTarget: 2,
    maxTarget: 6,
    step: 1,
    unit: '°C',
    baselineKwh: 1.9,
    defaultTargetKwh: 1.4,
    calcPrediction: (temp: number) => {
      const delta = temp - 2;
      const pct = Math.min(35, Math.max(10, Math.round(delta * 6 + 10)));
      const savedKwh = Math.round(1.9 * (pct / 100) * 10) / 10;
      const targetKwh = Math.round((1.9 - savedKwh) * 10) / 10;
      const savedVnd = Math.round(savedKwh * 7 * 2700);
      return {
        targetKwh,
        savedKwhPerDay: savedKwh,
        savedVndPerWeek: savedVnd,
        pct,
        summary: `Cài đặt ngăn mát ở ${temp}°C và sắp xếp thông thoáng giúp luồng khí lưu thông tốt, giảm chu kỳ đóng ngắt lốc lạnh.`,
      };
    },
  },
];

export const MOCK_EXP_LOG: ExperimentLogItem[] = [
  {
    id: 'exp-1',
    title: 'Chuyển bình nóng lạnh sang khung giờ 22:00',
    date: '18 - 25 Thg 8',
    savedVnd: 52000,
    savedKwh: 18.2,
    note: 'Nước vẫn đủ ấm cho buổi sáng',
    good: true,
    emotion: 'comfortable',
  },
  {
    id: 'exp-2',
    title: 'Điều hòa 27°C không bật quạt',
    date: '2 - 5 Thg 8',
    savedVnd: 0,
    savedKwh: 0,
    note: 'Quá nóng vào ban đêm',
    good: false,
    emotion: 'uncomfortable',
  },
  {
    id: 'exp-3',
    title: 'Tủ lạnh: Cài đặt ngăn mát 4°C',
    date: '21 - 28 Thg 7',
    savedVnd: 34000,
    savedKwh: 12.6,
    note: 'Thực phẩm bảo quản tốt, lốc máy chạy êm hơn',
    good: true,
    emotion: 'comfortable',
  },
  {
    id: 'exp-4',
    title: 'Bật máy rửa bát chế độ Eco nửa tải',
    date: '10 - 17 Thg 7',
    savedVnd: 38000,
    savedKwh: 13.4,
    note: 'Chén bát vẫn sạch hoàn toàn',
    good: true,
    emotion: 'neutral',
  },
  {
    id: 'exp-5',
    title: 'Nấu ăn bếp từ khung giờ thấp điểm',
    date: '1 - 7 Thg 7',
    savedVnd: 45000,
    savedKwh: 15.8,
    note: 'Chuẩn bị nguyên liệu sớm hơn',
    good: true,
    emotion: 'comfortable',
  },
];

export const EXP_LOG = MOCK_EXP_LOG;
export const EXP_KEPT = EXP_LOG.filter((l) => l.good).length;
export const EXP_SAVED = EXP_LOG.reduce((s, l) => s + l.savedVnd, 0);

export const ACCOUNT_GROUPS: AccountGroup[] = [
  {
    title: 'THÔNG TIN NHÀ',
    items: [
      { label: 'Số người trong nhà', value: '4 người' },
      { label: 'Biểu phí & nhà cung cấp', value: 'EVN Hà Nội' },
      { label: 'Thiết bị phát hiện', value: '5 thiết bị' },
      { label: 'Cảm biến & hiệu chuẩn', value: 'Bình thường' },
    ],
  },
  {
    title: 'THÔNG BÁO',
    items: [
      { label: 'Cảnh báo nhảy bậc điện', value: 'Bật' },
      { label: 'Cảnh báo tải chờ ban đêm', value: 'Bật' },
      { label: 'Tổng kết tuần', value: 'Chủ nhật' },
    ],
  },
  {
    title: 'QUY ĐỊNH & ĐIỀU KHOẢN',
    items: [
      { label: 'Chính sách bảo mật', value: '' },
      { label: 'Điều khoản sử dụng', value: '' },
      { label: 'Xuất dữ liệu', value: '' },
      { label: 'Phiên bản ứng dụng', value: '1.4.0' },
    ],
  },
];

