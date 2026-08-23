import type { ContactQuality, ElectrodeHealth, SignalHealth } from "@bioide/core";

export function SignalHealthPanel({ health }: { health: SignalHealth }) {
  if (health.source === "idle") {
    return (
      <section className="bioide-health bioide-health-idle">
        <span>no stream</span>
        <span>start mock or connect a board to check rate and electrode contact</span>
      </section>
    );
  }

  const packetTarget = health.source === "mock" ? 12 : 8;
  const rateLabel = `${health.packetHz.toFixed(1)} Hz packets · ${health.sampleRate} Hz ADC`;
  const statusLabel =
    health.status === "ok"
      ? health.healthy
        ? "healthy"
        : "check contacts"
      : health.status;

  return (
    <section className={`bioide-health bioide-health-${health.status}`}>
      <div className="bioide-health-row">
        <span className={`bioide-pill bioide-pill-${health.healthy ? "ok" : "warn"}`}>
          {statusLabel}
        </span>
        <span>
          {health.source} · {health.device || "board"}
        </span>
        <span>{rateLabel}</span>
        <span>jitter {health.jitterMs.toFixed(0)} ms</span>
        <span>age {health.ageMs} ms</span>
      </div>
      <div className="bioide-electrodes">
        {health.electrodes.map((ch) => (
          <ElectrodeChip key={ch.index} electrode={ch} />
        ))}
      </div>
      <p className="bioide-health-hint">
        Packet rate should stay near {packetTarget}+ Hz. Flat = lost contact. Noisy / clipped =
        movement, loose gel, or a saturated channel.
      </p>
    </section>
  );
}

function ElectrodeChip({ electrode }: { electrode: ElectrodeHealth }) {
  return (
    <span
      className={`bioide-electrode bioide-electrode-${electrode.contact}`}
      title={titleFor(electrode)}
    >
      <b>Ch{electrode.index + 1}</b>
      <em>{labelFor(electrode.contact)}</em>
      <small>{electrode.rms.toFixed(1)} µV</small>
    </span>
  );
}

function labelFor(contact: ContactQuality): string {
  if (contact === "ok") return "ok";
  if (contact === "flat") return "flat";
  if (contact === "noisy") return "noisy";
  return "clip";
}

function titleFor(electrode: ElectrodeHealth): string {
  return `Ch ${electrode.index + 1}: ${electrode.contact} · RMS ${electrode.rms.toFixed(1)} µV · P-P ${electrode.pp.toFixed(1)} µV`;
}
