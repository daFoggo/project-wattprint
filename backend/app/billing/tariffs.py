"""Vietnam retail electricity tariffs as data (no logic). All prices are VND/kWh before VAT.

Which scheme applies depends on the customer, not on a switch:
  * household (sinh hoạt)  -> progressive 6-tier tariff
  * business / production  -> time-of-use (off-peak / normal / peak), mandatory from 25 kVA or
    2,000 kWh/month; below that a customer pays one price equal to the normal-hours price
Households have no time-of-use tariff in force (only a draft amendment of the Electricity Law).

Sources: QĐ 1279/QĐ-BCT (09/05/2025, effective 10/05/2025) for prices; the hours are the schedule
printed on bills since 2019 (`LEGACY_2019`) and the system schedule of QĐ 963/QĐ-BCT (effective
22/04/2026, `QD_963`), whose application to customer bills still needs an amending circular.
VAT is 8% until 31/12/2026 (NQ 204/2025/QH15); the rate is a field so it can change by data.
The 5-tier residential tariff of QĐ 14/2025/QĐ-TTg is not in force yet: add it as another
`TierTariff` when its prices are published.
"""
from dataclasses import dataclass
from datetime import date
from typing import Literal

Period = Literal["offpeak", "normal", "peak"]
Customer = Literal["household", "business", "production"]
Voltage = Literal["lt_6kv", "6_22kv", "22_110kv", "ge_110kv"]
Hours = Literal["legacy", "qd963"]
PERIODS: tuple[Period, ...] = ("offpeak", "normal", "peak")

VAT_RATE = 0.08
SOURCE_1279 = "QĐ 1279/QĐ-BCT (09/05/2025)"
EFFECTIVE_1279 = date(2025, 5, 10)


@dataclass(frozen=True)
class Band:
    name: str
    upto: float | None  # cumulative kWh in the billing month where the band ends; None = open
    price: int


@dataclass(frozen=True)
class TierTariff:
    id: str
    name: str
    source: str
    effective_from: date
    bands: tuple[Band, ...]
    vat_rate: float = VAT_RATE


@dataclass(frozen=True)
class TouTariff:
    id: str
    name: str
    source: str
    effective_from: date
    prices: dict[Period, int]
    vat_rate: float = VAT_RATE

    @property
    def flat_price(self) -> int:
        """Price of a customer below the mandatory threshold (no 3-price meter)."""
        return self.prices["normal"]


Range = tuple[int, int]  # minutes of the day, [start, end)


@dataclass(frozen=True)
class TouSchedule:
    id: str
    name: str
    source: str
    effective_from: date
    peak: tuple[Range, ...]  # Monday to Saturday only; Sunday has no peak
    offpeak: tuple[Range, ...]  # every day


def _m(h: int, m: int = 0) -> int:
    return h * 60 + m


LEGACY_2019 = TouSchedule(
    id="legacy_2019", name="Khung giờ hiện hành trên hóa đơn", source="Bộ Công Thương, từ 2019",
    effective_from=date(2019, 1, 1),
    peak=((_m(9, 30), _m(11, 30)), (_m(17), _m(20))),
    offpeak=((_m(22), _m(24)), (0, _m(4))),
)
QD_963 = TouSchedule(
    id="qd_963", name="Khung giờ QĐ 963/QĐ-BCT", source="QĐ 963/QĐ-BCT (22/04/2026)",
    effective_from=date(2026, 4, 22),
    peak=((_m(17, 30), _m(22, 30)),),
    offpeak=((0, _m(6)),),
)
SCHEDULES: dict[Hours, TouSchedule] = {"legacy": LEGACY_2019, "qd963": QD_963}

RESIDENTIAL_6_TIER = TierTariff(
    id="residential_6_tier", name="Sinh hoạt 6 bậc", source=SOURCE_1279,
    effective_from=EFFECTIVE_1279,
    bands=(Band("Bậc 1", 50, 1984), Band("Bậc 2", 100, 2050), Band("Bậc 3", 200, 2380),
           Band("Bậc 4", 300, 2998), Band("Bậc 5", 400, 3350), Band("Bậc 6", None, 3460)),
)


def _tou(id: str, name: str, off: int, normal: int, peak: int) -> TouTariff:
    return TouTariff(id=id, name=name, source=SOURCE_1279, effective_from=EFFECTIVE_1279,
                     prices={"offpeak": off, "normal": normal, "peak": peak})


# business: from 22 kV up one price set (22–110 kV and ≥110 kV are the same)
BUSINESS: dict[Voltage, TouTariff] = {
    "lt_6kv": _tou("business_lt_6kv", "Kinh doanh dưới 6 kV", 1918, 3152, 5422),
    "6_22kv": _tou("business_6_22kv", "Kinh doanh 6–22 kV", 1829, 3108, 5202),
    "22_110kv": _tou("business_ge_22kv", "Kinh doanh từ 22 kV", 1609, 2887, 5025),
    "ge_110kv": _tou("business_ge_22kv", "Kinh doanh từ 22 kV", 1609, 2887, 5025),
}
PRODUCTION: dict[Voltage, TouTariff] = {
    "lt_6kv": _tou("production_lt_6kv", "Sản xuất dưới 6 kV", 1300, 1987, 3640),
    "6_22kv": _tou("production_6_22kv", "Sản xuất 6–22 kV", 1234, 1899, 3508),
    "22_110kv": _tou("production_22_110kv", "Sản xuất 22–110 kV", 1190, 1833, 3398),
    "ge_110kv": _tou("production_ge_110kv", "Sản xuất từ 110 kV", 1146, 1811, 3266),
}


@dataclass(frozen=True)
class Plan:
    """What a customer is billed with."""
    customer: Customer
    scheme: Literal["tier", "tou"]
    tier: TierTariff | None = None
    tou: TouTariff | None = None
    schedule: TouSchedule | None = None

    @property
    def tariff(self) -> TierTariff | TouTariff:
        return self.tier or self.tou  # type: ignore[return-value]


def resolve(customer: Customer, voltage: Voltage = "lt_6kv", hours: Hours = "legacy") -> Plan:
    if customer == "household":
        return Plan(customer, "tier", tier=RESIDENTIAL_6_TIER)
    table = BUSINESS if customer == "business" else PRODUCTION
    return Plan(customer, "tou", tou=table[voltage], schedule=SCHEDULES[hours])
