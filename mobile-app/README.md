# WattPrint - Mobile App

Mobile app that turns a household electricity meter into a per-device breakdown. One whole-home
sensor feeds NILM (non-intrusive load monitoring) to show which appliances cost money and when,
prices usage with Vietnam's tiered / TOU tariff, and adds a RAG Generative Copilot that explains the
numbers and suggests low-burden behaviour experiments.

The backend is an **external FastAPI service** (`backend/`); this folder is the Expo client. All HTTP requests go
through `src/lib/api-client.ts` using `EXPO_PUBLIC_API_URL`.

## Stack

- **Framework**: Expo SDK 57 (React Native 0.86, React 19)
- **Routing**: Expo Router (file-based routing)
- **Styling**: NativeWind 5 (Tailwind CSS v4)
- **State & Data Fetching**: TanStack React Query v5
- **Type Safety**: TypeScript 6

## Cài đặt & Khởi động nhanh (Quick Start)

```bash
# 1. Cài đặt dependencies (dùng pnpm)
pnpm install

# 2. Cấu hình biến môi trường
cp .env.example .env
# Mặc định kết nối local backend:
# EXPO_PUBLIC_API_URL=http://localhost:8001/api/v1

# 3. Khởi động Metro bundler
pnpm start
```

## Phát triển trên thiết bị thật qua USB Debugging (Android)

Khi kết nối điện thoại Android qua cáp USB và bật **USB Debugging**:

### 1. Reverse Port Forwarding
Chạy lệnh ADB để điện thoại truy cập trực tiếp Metro (`8081`) và Backend (`8001`) trên máy tính qua cáp USB:

```powershell
adb reverse tcp:8081 tcp:8081    # Metro Bundler
adb reverse tcp:8001 tcp:8001    # FastAPI Backend
```
*(Lưu ý: Nếu rút cáp cắm lại, hãy chạy lại lệnh trên).*

### 2. Khởi chạy ứng dụng
- **Cách 1 (Nhanh nhất - qua Dev Client)**:
  1. Chạy `pnpm start`.
  2. Mở ứng dụng **WattPrint** trên điện thoại (hoặc nhấn `a` trong terminal Metro).
- **Cách 2 (Build lại native APK nếu sửa native plugins / config)**:
  ```powershell
  pnpm android
  ```

### 3. Fast Refresh & Dev Menu
- **Mở Dev Menu trên điện thoại**:
  - Gõ phím `m` trong terminal Metro, hoặc chạy lệnh:
    ```powershell
    adb shell input keyevent 82
    ```
  - Kiểm tra dòng **Fast Refresh** đang ở chế độ **Enabled**.
- **Reload thủ công**: Gõ phím `r` trong terminal Metro.
- **Xóa cache khi sửa config/styles**:
  ```powershell
  pnpm start --clear
  ```

## Kiểm tra Code (Quality Checks)

```bash
pnpm lint        # expo lint (ESLint)
pnpm typecheck   # tsc --noEmit (TypeScript check)
```

## Cấu trúc thư mục (Structure)

```text
src/
├── app/              # Expo Router pages & navigation layouts (_layout.tsx, index.tsx, ...)
├── components/       # Reusable shared UI components (card, themed-view, tabs...)
├── constants/        # Theme tokens, colors, layout constants
├── features/         # Domain slices (energy, copilot) - types, api, mock data, hooks
├── hooks/            # Custom React hooks (useColorScheme, useTheme...)
├── lib/              # Core utilities (apiClient, tokenStorage, env)
├── screens/          # Page composition screens
└── utils/            # Helper formatters (format-currency, ...)
```

Xem thêm hướng dẫn thiết kế và quy chuẩn mã nguồn tại [`AGENTS.md`](AGENTS.md) và [`DESIGN.md`](DESIGN.md).
