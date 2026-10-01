import type { CSSProperties } from "react";
import capacityNotesUrl from "../../CAPACITY_ASSUMPTIONS.md?url";
import { capacityMetric } from "./component-brief.js";

export function CapacityBrief({ caption, assumed }: { caption: string; assumed: boolean }) {
  const metric = capacityMetric(caption);
  const hitRate = metric?.memory ? caption.match(/([\d.]+)% hits/i)?.[1] : undefined;
  const status = metric ? metric.percent > 100 ? "Over budget" : metric.percent === 100 ? "At capacity"
    : assumed && !metric.memory && metric.percent > 50 ? "Below spare-capacity target"
    : `${100 - metric.percent}% free` : undefined;
  const warning = metric && (metric.percent >= 100 || (assumed && !metric.memory && metric.percent > 50));
  return <section className={`capacity-brief${warning ? " capacity-brief--warning" : ""}`} aria-label="Capacity summary">
    <header><span>{metric?.label ?? "Workload"}</span><small>{assumed ? "Assumed · not measured" : "Capacity annotation"}</small></header>
    {metric ? <>
      <div className="capacity-brief__value"><strong>{metric.used}</strong><span>/ {metric.budget} {metric.unit}</span><b>{metric.percent}%</b></div>
      <div className="capacity-brief__track" role="meter" aria-label={`${metric.label}: ${metric.percent}% of budget`}
        aria-valuemin={0} aria-valuemax={Math.max(100, metric.percent)} aria-valuenow={metric.percent}
        aria-valuetext={`${metric.percent}% used; ${status}`} style={{ "--capacity-used": `${Math.min(100, metric.percent)}%` } as CSSProperties}>
        <span />{assumed && !metric.memory ? <i title="50% peak-load target" /> : null}
      </div>
      <div className="capacity-brief__status"><span>{status}</span><span>{hitRate ? `${hitRate}% cache hits` : assumed && !metric.memory ? "Target: ≥50% free" : ""}</span></div>
    </> : <p className="capacity-brief__caption">{caption}</p>}
    {metric && /flash|failover|overload|DOWN|first limit|2×/i.test(caption) ? <details className="capacity-brief__scenarios"><summary>Surge & failure assumptions</summary><p>{caption}</p></details> : null}
    {assumed ? <a className="capacity-brief__source" href={capacityNotesUrl} download="CAPACITY_ASSUMPTIONS.md">Assumptions & calculations (.md) ↗</a> : null}
  </section>;
}

export function CapacityReference() {
  return <a className="capacity-brief__source" href={capacityNotesUrl} download="CAPACITY_ASSUMPTIONS.md">Assumptions & calculations (.md) ↗</a>;
}
