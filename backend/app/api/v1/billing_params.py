"""Query parameters and response pieces shared by the demo endpoints that price consumption."""
from fastapi import Query

from app.billing import engine
from app.billing.tariffs import Customer, Hours, Plan, Voltage, resolve
from app.schemas import billing as s


def plan_params(
    customer: Customer = Query("household", description=(
        "`household` is billed on the 6-tier tariff; `business` and `production` on the "
        "time-of-use tariff")),
    voltage: Voltage = Query("lt_6kv", description="Supply voltage (time-of-use customers only)"),
    hours: Hours = Query("legacy", description=(
        "Time-of-use hours: `legacy` is the schedule on bills since 2019, `qd963` the system "
        "schedule of QĐ 963/QĐ-BCT (22/04/2026)")),
) -> Plan:
    return resolve(customer, voltage, hours)


def tariff_info(plan: Plan) -> s.TariffInfo:
    t = plan.tariff
    return s.TariffInfo(id=t.id, name=t.name, source=t.source, effective_from=t.effective_from,
                        vat_rate=t.vat_rate)


def bill(m: engine.Money) -> s.Bill:
    return s.Bill(subtotal_vnd=m.subtotal, vat_vnd=m.vat, total_vnd=m.total)


def summary(plan: Plan, m: engine.Money) -> s.BillingSummary:
    return s.BillingSummary(customer=plan.customer, scheme=plan.scheme, tariff=tariff_info(plan),
                            bill=bill(m))
