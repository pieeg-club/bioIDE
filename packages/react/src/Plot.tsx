import { useEffect, useRef } from "react";
import type { PlotSpec } from "@bioide/core";

const COLORS = ["#6cb6ff", "#8ed39a", "#e2c37a", "#f08888", "#c4a7ff"];

function draw(canvas: HTMLCanvasElement, spec: PlotSpec): void {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 120;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 8, right: 10, bottom: 22, left: 36 };
  const innerW = Math.max(1, width - pad.left - pad.right);
  const innerH = Math.max(1, height - pad.top - pad.bottom);
  const values = spec.series.flatMap((row) => row.values);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1e-6);
  const span = max - min || 1;
  const yOf = (value: number) => pad.top + innerH - ((value - min) / span) * innerH;

  ctx.fillStyle = "#14171b";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2c313a";
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  ctx.strokeStyle = "#2a3038";
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + innerH);
  ctx.lineTo(pad.left + innerW, pad.top + innerH);
  ctx.stroke();

  ctx.fillStyle = "#7d8692";
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.textAlign = "right";
  ctx.fillText(max.toFixed(2), pad.left - 4, pad.top + 8);
  ctx.fillText(min.toFixed(2), pad.left - 4, pad.top + innerH);

  const count = Math.max(...spec.series.map((row) => row.values.length), 1);

  if (spec.kind === "bar") {
    const groups = count;
    const gap = 6;
    const groupW = innerW / groups;
    const barW = Math.max(4, (groupW - gap) / spec.series.length);
    spec.series.forEach((row, seriesIndex) => {
      ctx.fillStyle = COLORS[seriesIndex % COLORS.length];
      row.values.forEach((value, index) => {
        const x = pad.left + index * groupW + seriesIndex * barW + gap / 2;
        const y = yOf(value);
        const zero = yOf(0);
        const top = Math.min(y, zero);
        const h = Math.max(1, Math.abs(zero - y));
        ctx.fillRect(x, top, barW, h);
      });
    });
  } else {
    spec.series.forEach((row, seriesIndex) => {
      if (!row.values.length) return;
      ctx.strokeStyle = COLORS[seriesIndex % COLORS.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      row.values.forEach((value, index) => {
        const x = pad.left + (count === 1 ? innerW / 2 : (index / (count - 1)) * innerW);
        const y = yOf(value);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  ctx.fillStyle = "#8b929c";
  ctx.textAlign = "center";
  const labels = spec.labels ?? spec.series[0]?.values.map((_, index) => String(index));
  if (labels?.length) {
    const step = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach((label, index) => {
      if (index % step !== 0 && index !== labels.length - 1) return;
      const x =
        spec.kind === "bar"
          ? pad.left + (index + 0.5) * (innerW / count)
          : pad.left + (count === 1 ? innerW / 2 : (index / (count - 1)) * innerW);
      ctx.fillText(label, x, height - 6);
    });
  }
}

export function Plot({ spec }: { spec: PlotSpec }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const render = () => draw(canvas, spec);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [spec]);

  return (
    <figure className="bioide-plot">
      <figcaption>{spec.title}</figcaption>
      <canvas ref={ref} className="bioide-plot-canvas" />
    </figure>
  );
}
