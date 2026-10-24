"use client";
import { displayDate, num } from "@/lib/client";
import { useI18n } from "./providers";
import { useEffect, useRef, useState } from "react";
export function AttendanceChart({
  points,
}: {
  points: { week: string; attendance: number | null }[];
}) {
  const { locale, t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(260, Math.floor(entries[0].contentRect.width))),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const height = 200,
    left = 42,
    right = 14,
    top = 14,
    bottom = 32;
  const x = (i: number) =>
    left + (i * (width - left - right)) / Math.max(1, points.length - 1);
  const y = (v: number) => top + ((100 - v) * (height - top - bottom)) / 100;
  const segments: string[] = [];
  let segment = "";
  points.forEach((p, i) => {
    if (p.attendance === null) {
      if (segment) segments.push(segment);
      segment = "";
    } else {
      segment += `${segment ? " L" : "M"}${x(i)},${y(p.attendance)}`;
    }
  });
  if (segment) segments.push(segment);
  return (
    <div className="chart-frame" ref={container}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("attendanceTrend")}
      >
        <title>{t("attendanceTrend")}</title>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={width - right}
              y1={y(v)}
              y2={y(v)}
              className="chart-grid"
            />
            <text x={left - 10} y={y(v) + 4} textAnchor="end">
              {num(v, locale)}%
            </text>
          </g>
        ))}
        {segments.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            className="chart-line"
            strokeWidth="2.5"
          />
        ))}
        {points.map((p, i) => (
          <g key={p.week}>
            {p.attendance !== null && (
              <circle
                cx={x(i)}
                cy={y(p.attendance)}
                r="3"
                className="chart-dot"
              >
                <title>
                  {displayDate(p.week, locale)}: {num(p.attendance, locale, 1)}%
                </title>
              </circle>
            )}
            {(width < 480
              ? i === 0 ||
                i === Math.floor((points.length - 1) / 2) ||
                i === points.length - 1
              : i % 2 === 0 || i === points.length - 1) && (
              <text
                x={x(i)}
                y={height - 8}
                textAnchor={
                  i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
                }
              >
                {displayDate(p.week, locale, {
                  year: undefined,
                  month: "short",
                  day: "numeric",
                })}
              </text>
            )}
          </g>
        ))}
      </svg>
      <details className="chart-data">
        <summary>{t("details")}</summary>
        <table>
          <thead>
            <tr>
              <th>{t("week")}</th>
              <th className="numeric">{t("attendance")}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.week}>
                <td>{displayDate(p.week, locale)}</td>
                <td className="numeric">
                  {num(p.attendance, locale, 1)}
                  {p.attendance === null ? "" : "%"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
