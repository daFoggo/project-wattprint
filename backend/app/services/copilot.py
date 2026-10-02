"""Copilot: a small set of questions answered from the household's own series.

There is no language model. A question is matched to one *intent* (a suggestion chip, or keywords
in free text) and each intent is a function over the same queries the other demo endpoints use, so
every number in an answer can be found elsewhere in the API. A question that matches nothing gets
an honest answer listing what can be asked.
"""
import unicodedata
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import text as sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.tariffs import Plan
from app.schemas import copilot as s
from app.services import billing as billing_svc
from app.services import demo as demo_svc
from app.services import experiments as experiments_svc
from app.services import insights as insights_svc
from app.services import usage as usage_svc

MODELLED = usage_svc.MODELLED
NIGHT_HOURS = (2, 4)  # 02:00-04:59, when people are asleep and the fridge is the main load
BASE_DAYS = 14


@dataclass(frozen=True)
class Ctx:
    session: AsyncSession
    hid: uuid.UUID
    asof: datetime
    plan: Plan
    names: dict[str, str]

    def name(self, key: str) -> str:
        return self.names.get(key, key)


def vn(x: float, digits: int = 1) -> str:
    return f"{x:,.{digits}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def hm(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    return f"{h} giờ {m:02d} phút" if h else f"{m} phút"


def fact(label: str, value: str) -> s.Fact:
    return s.Fact(label=label, value=value)


def _month_label(at: datetime) -> str:
    return f"THÁNG {at.month}"


def _signed_pct(now: float, before: float) -> str:
    return f"{round(100 * (now - before) / before):+d}%" if before > 0 else "—"


async def _by_appliance(ctx: Ctx, p: usage_svc.Period, have=None) -> dict[str, float]:
    """kWh per appliance; from half-hour rows the caller already has, else a query."""
    rows = usage_svc.energy_rows(have, p) if have is not None \
        else await demo_svc.energy(ctx.session, ctx.hid, p.start, p.until)
    return {r["name"]: r["energy_wh"] / 1000 for r in rows if r["kind"] == "appliance"}


def _marginal_price(ctx: Ctx, kwh_to_date: float) -> int:
    """Price of the next kWh before VAT: the band the month has reached, or the normal-hours
    price on time of use."""
    plan = ctx.plan
    if plan.scheme == "tier":
        bands = plan.tier.bands
        band = next((b for b in bands if b.upto is None or kwh_to_date < b.upto), bands[-1])
        return band.price
    return plan.tou.prices["normal"]


def _vat(ctx: Ctx) -> float:
    return 1 + ctx.plan.tariff.vat_rate


# -------------------------------------------------------------------------------- intents
async def bill_change(ctx: Ctx) -> s.Answer:
    cur = usage_svc.period_of("month", ctx.asof)
    prev = usage_svc.previous_of(cur)
    now = await usage_svc.priced(ctx.session, ctx.hid, cur, ctx.plan)
    before = await usage_svc.priced(ctx.session, ctx.hid, prev, ctx.plan)
    a_now = await _by_appliance(ctx, cur, now.rows)
    a_before = await _by_appliance(ctx, prev, before.rows)
    delta = {k: a_now.get(k, 0) - a_before.get(k, 0) for k in MODELLED}
    top = max(MODELLED, key=lambda k: abs(delta[k]))
    cost_now, cost_before = now.cost.money.total, before.cost.money.total
    more = cost_now > cost_before
    pct = round(100 * (cost_now - cost_before) / cost_before) if cost_before else 0
    text = (f"Tiền điện {cur.start.month:02d}/{cur.start.year} tạm tính {vn(cost_now, 0)} đ, "
            f"{'cao' if more else 'thấp'} hơn {vn(abs(cost_now - cost_before), 0)} đ "
            f"({abs(pct)}%) so với cùng kỳ tháng trước. ")
    if a_before.get(top, 0) > 0:
        runs = {}
        for label, p in (("now", cur), ("before", prev)):
            found = (await insights_svc.runs(ctx.session, ctx.hid, p.start, p.until)).get(top, [])
            runs[label] = sum(r.minutes for r in found)
        text += (f"Thay đổi lớn nhất là {ctx.name(top)}: {'tăng' if delta[top] > 0 else 'giảm'} "
                 f"{vn(abs(delta[top]))} kWh ({_signed_pct(a_now[top], a_before[top])})")
        if runs["now"] and runs["before"]:
            text += f", chạy {hm(runs['now'])} so với {hm(runs['before'])}"
        text += "."
    facts = [
        fact("Điện đến nay", f"{vn(now.cost.kwh)} kWh"),
        fact("Cùng kỳ tháng trước", f"{vn(before.cost.kwh)} kWh"),
        fact("Tiền điện (gồm VAT)", f"{vn(cost_now, 0)} đ"),
        fact(f"{ctx.name(top)} so với tháng trước", f"{delta[top]:+.1f} kWh".replace(".", ",")),
    ]
    action = s.Action(kind="experiment", appliance=top, label=f"Thử bớt điện {ctx.name(top).lower()}") \
        if top in ("AC", "WaterHeater") and delta[top] > 0 else None
    return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="bill_change",
                    question="Vì sao tiền điện khác tháng trước?", category="HÓA ĐƠN",
                    period=_month_label(cur.start), text=text, facts=facts, action=action)


async def tier_budget(ctx: Ctx) -> s.Answer:
    month = billing_svc.month_start(ctx.asof)
    b = await billing_svc.month_bill(ctx.session, ctx.hid, month, ctx.asof, ctx.plan)
    left = b.days_in_month - b.days_elapsed
    if ctx.plan.scheme != "tier":
        total = sum(b.tou_kwh.values()) or 1.0
        share = round(100 * b.tou_kwh["peak"] / total)
        price = ctx.plan.tou.prices["peak"]
        return s.Answer(
            household_id=ctx.hid, asof=ctx.asof, intent="tier_budget",
            question="Làm sao để giảm tiền điện giờ cao điểm?", category="HÓA ĐƠN",
            period=_month_label(month),
            text=f"Giờ cao điểm chiếm {share}% điện tháng này, giá {vn(price, 0)} đ/kWh. Dời bớt "
                 "phụ tải sang giờ thường hoặc thấp điểm là cách giảm tiền điện nhanh nhất.",
            facts=[fact("Điện giờ cao điểm", f"{vn(b.tou_kwh['peak'])} kWh"),
                   fact("Tỷ trọng cao điểm", f"{share}%"),
                   fact("Giá cao điểm", f"{vn(price, 0)} đ/kWh")])
    st, bands = b.status, ctx.plan.tier.bands
    name = bands[st.band_index].name
    if st.headroom_kwh is None:
        text = f"Bạn đang ở {name}, bậc cao nhất của biểu giá nên không còn bậc nào để vượt."
        facts = [fact("Bậc hiện tại", name), fact("Đã dùng đến nay", f"{vn(b.kwh_to_date)} kWh")]
    else:
        nxt = bands[st.next_index].name
        days_left = round(left)
        budget = st.headroom_kwh / days_left if days_left >= 1 else None
        text = (f"Bạn đã dùng {vn(b.kwh_to_date, 0)} kWh, đang ở {name}; còn {vn(st.headroom_kwh, 0)} "
                f"kWh là sang {nxt} (đắt hơn {st.step_pct}%). ")
        if st.cross_day is None:
            text += (f"Với mức {vn(b.pace)} kWh/ngày hiện tại, bạn sẽ không chạm {nxt} trong "
                     "tháng này.")
        elif budget is not None:
            text += (f"Còn {days_left} ngày nữa, để giữ nguyên bậc bạn cần dùng không quá "
                     f"{vn(budget)} kWh/ngày, so với mức {vn(b.pace)} kWh/ngày hiện tại.")
        facts = [fact("Bậc hiện tại", name), fact("Đã dùng đến nay", f"{vn(b.kwh_to_date)} kWh"),
                 fact(f"Còn đến {nxt}", f"{vn(st.headroom_kwh)} kWh"),
                 fact("Mức dùng mỗi ngày", f"{vn(b.pace)} kWh")]
        if budget is not None:
            facts.append(fact("Hạn mức mỗi ngày", f"{vn(budget)} kWh"))
    return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="tier_budget",
                    question="Làm sao để giữ nguyên bậc điện?", category="HÓA ĐƠN",
                    period=_month_label(month), text=text, facts=facts,
                    action=s.Action(kind="experiment", appliance="AC",
                                    label="Thử bớt giờ chạy điều hoà"))


async def standby(ctx: Ctx) -> s.Answer:
    start = ctx.asof - timedelta(days=BASE_DAYS)
    q = sql(
        """
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY r.power_w) AS w, count(*) AS n
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE d.parent_id = :hid AND d.name = 'Other' AND r.time >= :start AND r.time < :end
          AND extract(hour FROM r.time) BETWEEN :h0 AND :h1
        """)
    row = (await ctx.session.execute(q, {"hid": ctx.hid, "start": start, "end": ctx.asof,
                                         "h0": NIGHT_HOURS[0], "h1": NIGHT_HOURS[1]})).mappings().one()
    month = billing_svc.month_start(ctx.asof)
    if not row["n"] or row["w"] is None:
        return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="standby",
                        question="Tải chạy nền của nhà tôi là bao nhiêu?", category="CHẠY NỀN",
                        period=f"{BASE_DAYS} NGÀY", text="Chưa có đủ dữ liệu ban đêm để ước tính.",
                        facts=[])
    watts = float(row["w"])
    kwh_month = watts * 24 * 30 / 1000
    b = await billing_svc.month_bill(ctx.session, ctx.hid, month, ctx.asof, ctx.plan)
    price = _marginal_price(ctx, b.kwh_to_date) * _vat(ctx)
    cost = kwh_month * price
    text_ = (f"Từ 02:00 đến 05:00, phần điện ngoài các thiết bị đã nhận diện (điều hoà, bình nóng "
             f"lạnh, tủ lạnh, máy giặt) ổn định quanh {vn(watts, 0)} W trong {BASE_DAYS} ngày qua. "
             f"Nếu kéo dài cả ngày, đó là khoảng {vn(kwh_month, 0)} kWh/tháng, tương đương "
             f"{vn(cost, 0)} đ theo giá bậc hiện tại.")
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="standby",
        question="Tải chạy nền của nhà tôi là bao nhiêu?", category="CHẠY NỀN",
        period=f"{BASE_DAYS} NGÀY", text=text_,
        facts=[fact("Công suất nền ban đêm", f"{vn(watts, 0)} W"),
               fact("Điện nền mỗi tháng", f"{vn(kwh_month, 0)} kWh"),
               fact("Quy ra tiền (gồm VAT)", f"{vn(cost, 0)} đ")])


async def top_appliance(ctx: Ctx) -> s.Answer:
    cur = usage_svc.period_of("month", ctx.asof)
    now = await usage_svc.priced(ctx.session, ctx.hid, cur, ctx.plan)
    rows = await demo_svc.energy(ctx.session, ctx.hid, cur.start, cur.until)
    kwh = {r["name"]: r["energy_wh"] / 1000 for r in rows if r["kind"] == "appliance"}
    house = now.cost.kwh or 1.0
    ranked = sorted(MODELLED, key=lambda k: kwh.get(k, 0), reverse=True)
    top = ranked[0]
    other = max(house - sum(kwh.get(k, 0) for k in MODELLED), 0)
    text_ = (f"{ctx.name(top)} dùng nhiều điện nhất tháng này: {vn(kwh.get(top, 0))} kWh, chiếm "
             f"{round(100 * kwh.get(top, 0) / house)}% điện cả nhà, tương ứng "
             f"{vn(now.cost.per_device.get(top, 0), 0)} đ. ")
    second = ranked[1]
    text_ += (f"Tiếp theo là {ctx.name(second).lower()} với {vn(kwh.get(second, 0))} kWh. "
              f"Phần còn lại ({vn(other, 0)} kWh) là các thiết bị chưa nhận diện riêng.")
    facts = [fact(ctx.name(k), f"{vn(kwh.get(k, 0))} kWh · {round(100 * kwh.get(k, 0) / house)}%")
             for k in ranked if kwh.get(k, 0) > 0]
    action = s.Action(kind="experiment", appliance=top, label=f"Thử bớt điện {ctx.name(top).lower()}") \
        if top in ("AC", "WaterHeater") else None
    return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="top_appliance",
                    question="Thiết bị nào tốn điện nhất?", category="THIẾT BỊ",
                    period=_month_label(cur.start), text=text_, facts=facts, action=action)


async def _runs(ctx: Ctx, key: str, p: usage_svc.Period):
    return (await insights_svc.runs(ctx.session, ctx.hid, p.start, p.until)).get(key, [])


async def ac_runtime(ctx: Ctx) -> s.Answer:
    cur = usage_svc.period_of("month", ctx.asof)
    prev = usage_svc.previous_of(cur)
    runs, before = await _runs(ctx, "AC", cur), await _runs(ctx, "AC", prev)
    minutes, minutes_b = sum(r.minutes for r in runs), sum(r.minutes for r in before)
    kwh = sum(r.energy_wh for r in runs) / 1000
    days = max(cur.elapsed / timedelta(days=1), 1e-9)
    if not runs:
        return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="ac_runtime",
                        question="Điều hoà chạy bao lâu rồi?", category="ĐIỀU HOÀ",
                        period=_month_label(cur.start),
                        text="Điều hoà chưa chạy lần nào trong tháng này.", facts=[])
    longest = max(runs, key=lambda r: r.minutes)
    avg_w = kwh * 1000 / (minutes / 60)
    text_ = (f"Tháng này điều hoà đã chạy {len(runs)} lượt, tổng {hm(minutes)} "
             f"(trung bình {vn(minutes / 60 / days)} giờ/ngày) và dùng {vn(kwh)} kWh. ")
    if minutes_b:
        text_ += f"Cùng kỳ tháng trước là {hm(minutes_b)}. "
    text_ += (f"Lượt dài nhất {hm(longest.minutes)} ({longest.start:%d/%m %H:%M}–{longest.end:%H:%M}); "
              f"khi chạy máy ăn khoảng {vn(avg_w, 0)} W.")
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="ac_runtime",
        question="Điều hoà chạy bao lâu rồi?", category="ĐIỀU HOÀ", period=_month_label(cur.start),
        text=text_,
        facts=[fact("Tổng thời gian chạy", hm(minutes)),
               fact("Cùng kỳ tháng trước", hm(minutes_b) if minutes_b else "—"),
               fact("Công suất khi chạy", f"{vn(avg_w, 0)} W"),
               fact("Điện tiêu thụ", f"{vn(kwh)} kWh")],
        action=s.Action(kind="experiment", appliance="AC", label="Thử bớt giờ chạy điều hoà"))


async def heater_timing(ctx: Ctx) -> s.Answer:
    cur = usage_svc.period_of("month", ctx.asof)
    runs = await _runs(ctx, "WaterHeater", cur)
    if not runs:
        return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="heater_timing",
                        question="Bình nóng lạnh hay bật lúc nào?", category="BÌNH NÓNG LẠNH",
                        period=_month_label(cur.start),
                        text="Bình nóng lạnh chưa bật lần nào trong tháng này.", facts=[])
    by_hour = Counter(r.start.hour for r in runs)
    hours = [h for h, _ in by_hour.most_common(2)]
    kwh = sum(r.energy_wh for r in runs) / 1000
    minutes = sum(r.minutes for r in runs)
    text_ = (f"Tháng này bình nóng lạnh bật {len(runs)} lượt, thường bắt đầu lúc "
             f"{' và '.join(f'{h:02d}h' for h in sorted(hours))}; mỗi lượt trung bình "
             f"{hm(round(minutes / len(runs)))} và tổng cộng dùng {vn(kwh)} kWh.")
    if ctx.plan.scheme == "tou":
        peak = sum(1 for r in runs if _is_peak(ctx, r.start))
        text_ += f" Có {peak}/{len(runs)} lượt bắt đầu trong giờ cao điểm."
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="heater_timing",
        question="Bình nóng lạnh hay bật lúc nào?", category="BÌNH NÓNG LẠNH",
        period=_month_label(cur.start), text=text_,
        facts=[fact("Số lượt bật", str(len(runs))),
               fact("Giờ bật phổ biến", ", ".join(f"{h:02d}h" for h in sorted(hours))),
               fact("Tổng thời gian", hm(minutes)), fact("Điện tiêu thụ", f"{vn(kwh)} kWh")],
        action=s.Action(kind="experiment", appliance="WaterHeater",
                        label="Thử bớt giờ bật bình nóng lạnh"))


def _is_peak(ctx: Ctx, at: datetime) -> bool:
    from app.billing import engine
    return engine.classify(at.replace(tzinfo=None), ctx.plan.schedule) == "peak"


async def fridge_cycles(ctx: Ctx) -> s.Answer:
    cur = usage_svc.period_of("month", ctx.asof)
    prev = usage_svc.previous_of(cur)
    runs, before = await _runs(ctx, "Fridge", cur), await _runs(ctx, "Fridge", prev)
    days = max(cur.elapsed / timedelta(days=1), 1e-9)
    if not runs:
        return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="fridge_cycles",
                        question="Tủ lạnh có hoạt động bình thường không?", category="TỦ LẠNH",
                        period=_month_label(cur.start), text="Chưa ghi nhận chu kỳ nào.", facts=[])
    per_day = len(runs) / days
    per_day_b = len(before) / max(prev.elapsed / timedelta(days=1), 1e-9) if before else None
    avg_min = sum(r.minutes for r in runs) / len(runs)
    kwh_day = sum(r.energy_wh for r in runs) / 1000 / days
    text_ = (f"Máy nén tủ lạnh chạy trung bình {vn(per_day, 0)} chu kỳ/ngày, mỗi chu kỳ "
             f"{vn(avg_min, 0)} phút, tiêu thụ {vn(kwh_day, 2)} kWh/ngày. ")
    if per_day_b:
        d = round(100 * (per_day - per_day_b) / per_day_b)
        text_ += (f"Tháng trước là {vn(per_day_b, 0)} chu kỳ/ngày"
                  f"{' (tương đương)' if abs(d) < 10 else f' (tháng này {d:+d}%)'}.")
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="fridge_cycles",
        question="Tủ lạnh có hoạt động bình thường không?", category="TỦ LẠNH",
        period=_month_label(cur.start), text=text_,
        facts=[fact("Chu kỳ mỗi ngày", vn(per_day, 0)), fact("Thời gian mỗi chu kỳ", f"{vn(avg_min, 0)} phút"),
               fact("Điện mỗi ngày", f"{vn(kwh_day, 2)} kWh")])


async def forecast(ctx: Ctx) -> s.Answer:
    month = billing_svc.month_start(ctx.asof)
    b = await billing_svc.month_bill(ctx.session, ctx.hid, month, ctx.asof, ctx.plan)
    prev = usage_svc.previous_of(usage_svc.period_of("month", ctx.asof))
    last_whole = usage_svc.Period("month", prev.start, prev.end, prev.end)
    last = await usage_svc.priced(ctx.session, ctx.hid, last_whole, ctx.plan)
    last_total = last.cost.money.total
    text_ = (f"Với mức dùng {vn(b.pace)} kWh/ngày đến nay, cả tháng sẽ vào khoảng "
             f"{vn(b.forecast_kwh, 0)} kWh, tiền điện khoảng {vn(b.forecast.total, 0)} đ (gồm VAT). ")
    if last_total:
        diff = b.forecast.total - last_total
        text_ += (f"Tháng trước trả {vn(last_total, 0)} đ, nghĩa là dự báo "
                  f"{'cao' if diff > 0 else 'thấp'} hơn {vn(abs(diff), 0)} đ.")
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="forecast",
        question="Cuối tháng tôi sẽ phải trả bao nhiêu?", category="HÓA ĐƠN",
        period=_month_label(month), text=text_,
        facts=[fact("Dự báo cả tháng", f"{vn(b.forecast_kwh, 0)} kWh"),
               fact("Dự báo tiền điện", f"{vn(b.forecast.total, 0)} đ"),
               fact("Tháng trước", f"{vn(last_total, 0)} đ" if last_total else "—")])


async def saving_plan(ctx: Ctx) -> s.Answer:
    """The levers worth pulling, each priced from the appliance's own measured power."""
    month = billing_svc.month_start(ctx.asof)
    items = await experiments_svc.templates(ctx.session, ctx.hid, ctx.asof, ctx.plan, ctx.names)
    levers = []
    for t in items:
        if not t.available:
            continue
        per_day = t.slider.default * t.kwh_per_day_per_unit
        levers.append((t, per_day * 30, per_day * 30 * t.vnd_per_kwh))
    levers.sort(key=lambda x: x[2], reverse=True)
    if not levers:
        return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="saving_plan",
                        question="Xây dựng kế hoạch tiết kiệm", category="TIẾT KIỆM",
                        period=_month_label(month),
                        text="Các thiết bị đã nhận diện dùng quá ít để có gì đáng cắt giảm.",
                        facts=[])
    total_kwh, total_vnd = sum(x[1] for x in levers), sum(x[2] for x in levers)
    steps = "; ".join(
        f"{t.title.lower()} {t.slider.default} {t.unit_label} (khoảng {vn(kwh, 0)} kWh, "
        f"{vn(vnd, 0)} đ mỗi tháng)" for t, kwh, vnd in levers)
    text_ = (f"Từ số liệu {experiments_svc.SPEC['AC']['lookback']} ngày gần nhất, các việc đáng làm "
             f"theo thứ tự: {steps}. Làm đủ thì tiết kiệm khoảng {vn(total_kwh, 0)} kWh, tức "
             f"{vn(total_vnd, 0)} đ mỗi tháng (đã gồm VAT). Mỗi mức đều tính từ công suất đo được "
             "của thiết bị; bạn có thể kiểm chứng bằng một thử nghiệm.")
    top = levers[0][0]
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="saving_plan",
        question="Xây dựng kế hoạch tiết kiệm", category="TIẾT KIỆM", period=_month_label(month),
        text=text_,
        facts=[fact(f"{t.name}: {t.slider.default} {t.unit_label}", f"−{vn(vnd, 0)} đ/tháng")
               for t, _, vnd in levers] + [fact("Tổng có thể tiết kiệm", f"{vn(total_vnd, 0)} đ/tháng")],
        action=s.Action(kind="experiment", appliance=top.appliance,
                        label=f"Thử: {top.title.lower()}"))


async def month_compare(ctx: Ctx) -> s.Answer:
    """The last few months side by side: energy, cost and the month's biggest appliance."""
    rows = []
    for back in range(4):
        p = usage_svc.period_of("month", ctx.asof, -back)
        pr = await usage_svc.priced(ctx.session, ctx.hid, p, ctx.plan)
        if pr.cost.kwh <= 0:
            continue
        kwh = await _by_appliance(ctx, p, pr.rows)
        top = max(MODELLED, key=lambda k: kwh.get(k, 0))
        rows.append((p, pr.cost.kwh, pr.cost.money.total, top))
    if len(rows) < 2:
        return s.Answer(household_id=ctx.hid, asof=ctx.asof, intent="month_compare",
                        question="So sánh tiêu thụ các tháng", category="SO SÁNH",
                        period="CÁC THÁNG", text="Chưa đủ nhiều tháng có dữ liệu để so sánh.",
                        facts=[])
    cur, prev = rows[0], rows[1]
    hi = max(rows, key=lambda r: r[1])
    part = "" if cur[0].complete else f" (đến ngày {cur[0].until.day - 1 if cur[0].until.hour == 0 and cur[0].until.minute == 0 else cur[0].until.day})"
    text_ = (f"Tháng {cur[0].start.month} dùng {vn(cur[1], 0)} kWh{part}, "
             f"{'ít' if cur[1] < prev[1] else 'nhiều'} hơn tháng {prev[0].start.month} "
             f"({vn(prev[1], 0)} kWh) {vn(abs(cur[1] - prev[1]), 0)} kWh. "
             f"Tháng dùng nhiều nhất trong {len(rows)} tháng gần nhất là tháng {hi[0].start.month} "
             f"với {vn(hi[1], 0)} kWh, thiết bị dẫn đầu là {ctx.name(hi[3]).lower()}.")
    return s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="month_compare",
        question="So sánh tiêu thụ các tháng", category="SO SÁNH", period="CÁC THÁNG",
        text=text_,
        facts=[fact(f"Tháng {p.start.month}/{p.start.year}", f"{vn(kwh, 0)} kWh · {vn(cost, 0)} đ")
               for p, kwh, cost, _ in rows])


async def unknown(ctx: Ctx, question: str) -> s.Answer:
    res = s.Answer(
        household_id=ctx.hid, asof=ctx.asof, intent="unknown", question=question,
        category="CHUNG", period="",
        text="Tôi chỉ trả lời được những câu hỏi tính từ số liệu điện của nhà bạn: tiền điện và "
             "bậc giá, dự báo cuối tháng, thiết bị tốn điện nhất, điều hoà, bình nóng lạnh, tủ "
             "lạnh và tải chạy nền. Bạn thử chọn một câu gợi ý bên dưới nhé.", facts=[])
    return res.model_copy(update={"follow_ups": follow_ups(res, ctx.plan)})


INTENTS = {
    "bill_change": bill_change, "tier_budget": tier_budget, "standby": standby,
    "top_appliance": top_appliance, "ac_runtime": ac_runtime, "heater_timing": heater_timing,
    "fridge_cycles": fridge_cycles, "forecast": forecast, "saving_plan": saving_plan,
    "month_compare": month_compare,
}

# (intent, question, category) in the order a customer of that tariff needs them
_COMMON = [
    ("bill_change", "Vì sao tiền điện khác tháng trước?", "HÓA ĐƠN"),
    ("saving_plan", "Xây dựng kế hoạch tiết kiệm", "TIẾT KIỆM"),
    ("month_compare", "So sánh tiêu thụ các tháng", "SO SÁNH"),
    ("tier_budget", "Làm sao để giữ nguyên bậc điện?", "HÓA ĐƠN"),
    ("forecast", "Cuối tháng tôi sẽ phải trả bao nhiêu?", "HÓA ĐƠN"),
    ("top_appliance", "Thiết bị nào tốn điện nhất?", "THIẾT BỊ"),
    ("ac_runtime", "Điều hoà chạy bao lâu rồi?", "ĐIỀU HOÀ"),
    ("standby", "Tải chạy nền của nhà tôi là bao nhiêu?", "CHẠY NỀN"),
    ("heater_timing", "Bình nóng lạnh hay bật lúc nào?", "BÌNH NÓNG LẠNH"),
    ("fridge_cycles", "Tủ lạnh có hoạt động bình thường không?", "TỦ LẠNH"),
]


def suggestions(plan: Plan) -> list[s.Suggestion]:
    out = []
    for intent, question, category in _COMMON:
        if intent == "tier_budget" and plan.scheme == "tou":
            question = "Làm sao để giảm tiền điện giờ cao điểm?"
        out.append(s.Suggestion(intent=intent, question=question, category=category))
    return out


# What is worth asking after each answer. The first entries are the natural next step; the answer's
# own subject (`device` below) comes first when the answer names a particular appliance.
FOLLOW = {
    "bill_change": ["{device}", "saving_plan", "tier_budget", "month_compare"],
    "tier_budget": ["saving_plan", "forecast", "ac_runtime", "heater_timing"],
    "standby": ["saving_plan", "top_appliance", "forecast"],
    "top_appliance": ["{device}", "saving_plan", "standby", "bill_change"],
    "ac_runtime": ["saving_plan", "bill_change", "top_appliance", "forecast"],
    "heater_timing": ["saving_plan", "standby", "top_appliance", "bill_change"],
    "fridge_cycles": ["standby", "top_appliance", "forecast", "saving_plan"],
    "forecast": ["tier_budget", "saving_plan", "month_compare", "bill_change"],
    "saving_plan": ["ac_runtime", "heater_timing", "tier_budget", "forecast"],
    "month_compare": ["bill_change", "top_appliance", "forecast", "saving_plan"],
}
DEVICE_INTENT = {"AC": "ac_runtime", "WaterHeater": "heater_timing"}


def follow_ups(res: s.Answer, plan: Plan) -> list[s.Suggestion]:
    """Up to 3 next questions for `res`: related to what it said, never the one just answered."""
    by_intent = {x.intent: x for x in suggestions(plan)}
    plan_order = FOLLOW.get(res.intent) or [x.intent for x in suggestions(plan)]
    device = DEVICE_INTENT.get(res.action.appliance) if res.action else None
    out: list[s.Suggestion] = []
    for intent in plan_order:
        intent = device if intent == "{device}" else intent
        if not intent or intent == res.intent or intent not in by_intent:
            continue
        if by_intent[intent] not in out:
            out.append(by_intent[intent])
    return out[:3]


# ---------------------------------------------------------------------------- free text
def _plain(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower().replace("đ", "d"))
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


KEYWORDS: dict[str, tuple[str, ...]] = {
    "saving_plan": ("ke hoach", "tiet kiem", "giam tien", "cat giam"),
    "month_compare": ("cac thang", "so sanh", "theo thang", "tung thang"),
    "tier_budget": ("bac", "giu nguyen", "han muc", "vuot", "cao diem"),
    "forecast": ("du bao", "cuoi thang", "phai tra", "se tra", "bao nhieu tien"),
    "bill_change": ("hoa don", "tien dien", "thang truoc", "tang", "khac"),
    "standby": ("chay nen", "chay ngam", "standby", "dem", "cho"),
    "top_appliance": ("nhieu nhat", "ton dien nhat", "thiet bi nao", "an dien"),
    "ac_runtime": ("dieu hoa", "may lanh", "chay bao lau"),
    "heater_timing": ("nong lanh", "binh nong", "nuoc nong"),
    "fridge_cycles": ("tu lanh",),
}


def classify(question: str) -> str:
    q = _plain(question)
    scores = {k: sum(1 for w in words if w in q) for k, words in KEYWORDS.items()}
    # an appliance named in the question decides before the generic bill words do
    for k in ("ac_runtime", "heater_timing", "fridge_cycles"):
        if scores[k]:
            return k
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] else "unknown"


async def answer(ctx: Ctx, question: str | None, intent: str | None) -> s.Answer:
    if intent and intent != "unknown":
        res = await INTENTS[intent](ctx)
        return res.model_copy(update={"follow_ups": follow_ups(res, ctx.plan)})
    question = (question or "").strip()
    found = classify(question) if question else "unknown"
    if found == "unknown":
        return await unknown(ctx, question)
    res = await INTENTS[found](ctx)
    return res.model_copy(update={"question": question, "follow_ups": follow_ups(res, ctx.plan)})
