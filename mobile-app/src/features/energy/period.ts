/**
 * Dữ liệu demo là một hộ thật đo trong quá khứ (Plegma 101), nên "bây giờ" của dashboard là một
 * mốc cố định trong dữ liệu chứ không phải giờ máy.
 *
 * Mốc là cuối ngày 31/08/2023 (thứ Năm): tháng 8 đủ dữ liệu (357 kWh, ~1,0 triệu đồng, đã chạm Bậc 5).
 * Hộ này vắng nhà 09–19/08 (chỉ tủ lạnh và đồ chờ, ~2,4 kWh/ngày) nên mốc 20/08 cho tổng tháng chỉ
 * 129 kWh (292 nghìn đồng) và so với hôm qua tăng 224%, không đại diện. Ngày 31/08 có đủ 5 nhóm
 * (Khác 49%, Điều hoà 32%, Bình nóng lạnh 10%, Tủ lạnh 8%, Máy giặt 1%); hôm qua (30/08) 20,7 kWh.
 * Mốc là 23:59 để "từ đầu ngày đến giờ" phủ trọn ngày.
 */
export const DEMO_NOW = Date.UTC(2023, 7, 31, 23, 59);

/** Tháng của mốc demo (`YYYY-MM`) và ngày của nó (`YYYY-MM-DD`), theo wall-clock của dữ liệu. */
export const DEMO_MONTH = new Date(DEMO_NOW).toISOString().slice(0, 7);
export const DEMO_DAY = new Date(DEMO_NOW).toISOString().slice(0, 10);
