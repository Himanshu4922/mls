/**
 * Climate Risk card from HomeAtlasUI's property Overview tab.
 *
 * The reference uses ClimateCheck sample projections (heat / precipitation /
 * flood for 2050). There is no live climate feed yet, so these scores match
 * that prototype rather than a property-specific API.
 */

type RiskLevel = "Low" | "Medium" | "High";

interface ClimateRiskItem {
  risk: string;
  level: RiskLevel;
  desc: string;
  tone: string;
}

const LEVEL_TONE: Record<RiskLevel, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-orange-100 text-orange-700",
  High: "bg-red-100 text-red-700",
};

const RISKS: ClimateRiskItem[] = [
  {
    risk: "Heat Risk",
    level: "Medium",
    desc: "Around 2050, projected 10 extremely hot days/year above 31°C.",
    tone: LEVEL_TONE.Medium,
  },
  {
    risk: "Precipitation Risk",
    level: "Medium",
    desc: "Heavy rainfall projected to increase by 12mm to 87mm annually by 2050.",
    tone: "bg-blue-100 text-blue-700",
  },
  {
    risk: "Flood Risk",
    level: "Low",
    desc: "This property has a 3% chance of flooding over the next 25 years.",
    tone: LEVEL_TONE.Low,
  },
];

export function ClimateRisk() {
  return (
    <section className="rounded-2xl border border-line p-4 sm:p-6">
      <h2 className="mb-1 text-[18px] font-semibold text-ink">Climate Risk</h2>
      <p className="mb-4 text-[13px] text-ink-muted">
        Projected hazards for this property by 2050
      </p>
      <div className="space-y-3">
        {RISKS.map((item) => (
          <div
            key={item.risk}
            className="flex items-start gap-3 rounded-xl bg-surface-alt p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-ink">{item.risk}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.tone}`}
                >
                  {item.level}
                </span>
              </div>
              <p className="text-[12px] text-ink-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-subtle">Source: ClimateCheck</p>
    </section>
  );
}
