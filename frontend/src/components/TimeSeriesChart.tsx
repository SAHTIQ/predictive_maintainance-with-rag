import React, { useState, useMemo } from 'react';

export interface DataPoint {
  timestamp: string;
  value: number;
  annotation?: string;
}

export interface DataSeries {
  name: string;
  color: string;
  data: DataPoint[];
}

export interface ChartTab {
  id: string;
  label: string;
  unit: string;
  threshold?: number;
  thresholdLabel?: string;
  corridorMin?: number;
  corridorMax?: number;
  series: DataSeries[];
}

interface TimeSeriesChartProps {
  title?: string;
  tabs?: ChartTab[];
  series?: DataSeries[];
  unit?: string;
  threshold?: number;
  thresholdLabel?: string;
  corridorMin?: number;
  corridorMax?: number;
  height?: number;
  machineId?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  tabs,
  series: defaultSeries,
  unit: defaultUnit = 'mm/s',
  threshold: defaultThreshold = 4.5,
  thresholdLabel: defaultThresholdLabel = 'Trip Threshold',
  corridorMin: defaultCorridorMin = 1.5,
  corridorMax: defaultCorridorMax = 3.5,
  height = 320,
  machineId = 'TXM-014',
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(tabs && tabs.length > 0 ? tabs[0].id : 'vibration');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'Custom'>('24h');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeTab = tabs ? tabs.find((t) => t.id === activeTabId) || tabs[0] : null;
  const unit = activeTab ? activeTab.unit : defaultUnit;
  const threshold = activeTab?.threshold ?? defaultThreshold;
  const thresholdLabel = activeTab?.thresholdLabel ?? defaultThresholdLabel;
  const corridorMin = activeTab?.corridorMin ?? defaultCorridorMin;
  const corridorMax = activeTab?.corridorMax ?? defaultCorridorMax;

  // Active series
  const activeSeries = useMemo(() => {
    if (activeTab && activeTab.series && activeTab.series.length > 0) {
      return activeTab.series[0];
    }
    if (defaultSeries && defaultSeries.length > 0) {
      return defaultSeries[0];
    }
    return null;
  }, [activeTab, defaultSeries]);

  // Generate or sanitize data points (guaranteed 24 points for 24h)
  const chartData = useMemo(() => {
    const rawData = activeSeries?.data || [];
    if (rawData.length >= 8) {
      return rawData.slice(-24);
    }

    // Synthesize realistic continuous curve based on current metric if sparse
    const baseVal = rawData.length > 0 ? rawData[rawData.length - 1].value : (activeTabId === 'temp' ? 76.5 : activeTabId === 'health' ? 54 : activeTabId === 'rul' ? 22 : 4.8);
    const count = 24;
    const now = Date.now();
    const synth: DataPoint[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const progress = (count - i) / count;
      const isBreach = baseVal > threshold;
      let val = baseVal;

      if (activeTabId === 'vibration') {
        val = isBreach ? 2.4 + progress * (baseVal - 2.4) + Math.sin(i * 0.8) * 0.18 : 2.2 + Math.sin(i * 0.5) * 0.3;
      } else if (activeTabId === 'temp') {
        val = isBreach ? 62 + progress * (baseVal - 62) + Math.cos(i * 0.6) * 1.2 : 58 + Math.sin(i * 0.4) * 2;
      } else if (activeTabId === 'health') {
        val = 88 - progress * (88 - baseVal) + Math.sin(i * 0.5) * 1.5;
      } else if (activeTabId === 'rul') {
        val = 240 - progress * (240 - baseVal);
      }

      synth.push({
        timestamp: new Date(now - i * 3600000).toISOString(),
        value: Math.round(val * 100) / 100,
        annotation: i === 4 && isBreach ? 'Breach Detected' : undefined,
      });
    }
    return synth;
  }, [activeSeries, activeTabId, threshold]);

  // Calculate statistics
  const values = chartData.map((d) => d.value);
  const peakValue = values.length > 0 ? Math.max(...values) : threshold;
  const meanValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : threshold * 0.8;
  const isAlarming = peakValue >= threshold;

  // Chart coordinates calculation for SVG
  const width = 1000;
  const svgHeight = 280;
  const padTop = 35;
  const padBottom = 35;
  const plotHeight = svgHeight - padTop - padBottom;

  const minPlot = Math.min(...values, corridorMin, 0);
  const maxPlot = Math.max(...values, threshold * 1.2, corridorMax * 1.1);
  const range = maxPlot - minPlot || 1;

  const getY = (val: number) => {
    return padTop + plotHeight - ((val - minPlot) / range) * plotHeight;
  };

  const getX = (index: number) => {
    return (index / (chartData.length - 1 || 1)) * (width - 40) + 20;
  };

  // Build SVG Path spline string
  const pathD = useMemo(() => {
    if (chartData.length === 0) return '';
    const points = chartData.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [chartData, minPlot, maxPlot]);

  // Shaded area path
  const areaD = useMemo(() => {
    if (!pathD || chartData.length === 0) return '';
    const lastX = getX(chartData.length - 1);
    const firstX = getX(0);
    const bottomY = svgHeight - padBottom;
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, chartData]);

  // Baseline normal path (flat calm reference)
  const baselineD = useMemo(() => {
    const y = getY(corridorMin + (corridorMax - corridorMin) * 0.5);
    return `M 20 ${y} C 250 ${y - 4}, 500 ${y + 4}, 750 ${y - 3} L 980 ${y}`;
  }, [corridorMin, corridorMax, minPlot, maxPlot]);

  const thresholdY = getY(threshold);
  const corridorTopY = getY(corridorMax);
  const corridorBottomY = getY(corridorMin);
  const corridorHeight = Math.max(8, corridorBottomY - corridorTopY);

  const lastPoint = chartData[chartData.length - 1];
  const lastX = chartData.length > 0 ? getX(chartData.length - 1) : 980;
  const lastY = lastPoint ? getY(lastPoint.value) : thresholdY;

  // Hover or breach inspection callout
  const activeInspectionIndex = hoverIndex !== null ? hoverIndex : chartData.findIndex((d) => d.annotation) !== -1 ? chartData.findIndex((d) => d.annotation) : chartData.length - 1;
  const inspectionPoint = chartData[activeInspectionIndex];
  const inspectionX = inspectionPoint ? getX(activeInspectionIndex) : lastX;
  const inspectionY = inspectionPoint ? getY(inspectionPoint.value) : lastY;

  return (
    <div className="flex flex-col p-5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] gap-4 transition-colors">
      {/* Top Header: Metric Tabs & Time Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Metric Selector Tabs */}
        {tabs && tabs.length > 1 ? (
          <div className="flex items-center gap-1.5 bg-[var(--bg-app)] p-1 rounded-md border border-[var(--border-color)]">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setHoverIndex(null);
                  }}
                  className={`px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                    isActive
                      ? 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-medium border border-[var(--border-color)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--accent-blue)] text-[20px]">show_chart</span>
            <span className="font-mono text-sm text-[var(--text-primary)] font-semibold uppercase tracking-wider">Live Sensor Waveform & Limits</span>
          </div>
        )}

        {/* Time Range & Summary Telemetry Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-[var(--text-secondary)] font-mono text-xs pr-3 border-r border-[var(--border-color)]">
            <div>
              Peak: <strong className={peakValue >= threshold ? 'text-[#EF4444] font-medium' : 'text-[var(--text-primary)]'}>{peakValue.toFixed(2)} {unit}</strong>
            </div>
            <div>
              Average: <strong className="text-[var(--text-primary)] font-medium">{meanValue.toFixed(2)} {unit}</strong>
            </div>
            <div>
              Danger: <span className="font-medium text-[#EF4444]">{threshold.toFixed(2)} {unit}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-app)] p-1 rounded-md border border-[var(--border-color)] font-mono">
            {(['24h', '7d', '30d', 'Custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  timeRange === r
                    ? 'bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-medium border border-[var(--border-color)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                }`}
                type="button"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Legend Strip */}
      <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isAlarming ? 'bg-[#EF4444]' : 'bg-[var(--accent-blue)]'}`}></span>
          <span className="font-medium text-[var(--text-primary)]">Live Sensor Reading</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5" style={{ borderTop: '2px dashed var(--text-muted)' }}></span>
          <span className="text-[var(--text-secondary)] font-normal">Normal 30-Day Average</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.4)]"></span>
          <span className="text-[var(--text-secondary)] font-normal">Safe Range ({corridorMin.toFixed(1)} – {corridorMax.toFixed(1)} {unit})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5" style={{ borderTop: '2px dashed #EF4444' }}></span>
          <span className="text-[var(--text-secondary)] font-normal">Danger Limit ({threshold.toFixed(2)} {unit})</span>
        </div>
      </div>

      {/* High-Precision SVG Telemetry Chart Container */}
      <div
        className="relative w-full rounded-lg bg-[var(--bg-app)] border border-[var(--border-color)] overflow-hidden select-none"
        style={{ height }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox={`0 0 ${width} ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Horizontal Reference Gridlines */}
          {[0.2, 0.4, 0.6, 0.8].map((factor, idx) => {
            const y = padTop + plotHeight * factor;
            return (
              <line
                key={idx}
                x1="0"
                x2={width}
                y1={y}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth="1"
                strokeDasharray={idx === 1 ? '4 4' : undefined}
              />
            );
          })}

          {/* Normal Safe Corridor Zone (flat subtle band) */}
          <rect
            x="0"
            y={corridorTopY}
            width={width}
            height={corridorHeight}
            fill="rgba(34, 197, 94, 0.08)"
          />

          {/* Critical Tolerance Alarm Threshold Line */}
          <line
            x1="0"
            x2={width}
            y1={thresholdY}
            y2={thresholdY}
            stroke="#EF4444"
            strokeDasharray="6 4"
            strokeWidth="1.5"
          />
          <text
            x={width - 24}
            y={thresholdY - 7}
            fill="#EF4444"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fontWeight="600"
            textAnchor="end"
            letterSpacing="0.05em"
          >
            {thresholdLabel.toUpperCase()} ({threshold.toFixed(2)} {unit})
          </text>

          {/* Baseline Calm Reference Path (Dashed Slate Line) */}
          <path
            d={baselineD}
            fill="none"
            stroke="var(--text-muted)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* Shaded Area Under Active Telemetry Line (clean subtle flat fill) */}
          <path d={areaD} fill={isAlarming ? "rgba(239, 68, 68, 0.08)" : "rgba(6, 182, 212, 0.06)"} />

          {/* Live Spline Curve Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isAlarming ? '#EF4444' : 'var(--accent-blue)'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />

          {/* Inspection Point Vertical Guide Line */}
          {inspectionPoint && (
            <>
              <line
                x1={inspectionX}
                x2={inspectionX}
                y1={padTop}
                y2={svgHeight - padBottom}
                stroke="var(--text-muted)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle cx={inspectionX} cy={inspectionY} r="4" fill="var(--text-primary)" stroke="var(--bg-app)" strokeWidth="2" />
            </>
          )}

          {/* Current Live Sensor Node (at the rightmost point) */}
          <circle cx={lastX} cy={lastY} r="4" fill={isAlarming ? '#EF4444' : 'var(--accent-blue)'} />

          {/* Hover interactive trigger overlay across X-axis columns */}
          {chartData.map((d, idx) => {
            const x = getX(idx);
            const colWidth = width / chartData.length;
            return (
              <rect
                key={idx}
                x={x - colWidth / 2}
                y={0}
                width={colWidth}
                height={svgHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Interactive Callout Tooltip pinned above inspection point */}
        {inspectionPoint && (
          <div
            className="absolute p-3 rounded-md bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] pointer-events-none flex flex-col gap-1 min-w-[240px] font-mono text-xs shadow-lg"
            style={{
              left: `${Math.min(84, Math.max(16, (inspectionX / width) * 100))}%`,
              top: '12%',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase font-semibold">
              <span className={`flex items-center gap-1.5 ${inspectionPoint.value >= threshold ? 'text-[#EF4444]' : 'text-[var(--accent-blue)]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${inspectionPoint.value >= threshold ? 'bg-[#EF4444]' : 'bg-[var(--accent-blue)]'}`}></span>
                {inspectionPoint.value >= threshold ? 'Danger Limit Exceeded' : 'Normal Reading'}
              </span>
              <span className="text-[var(--text-secondary)] font-normal">
                {new Date(inspectionPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)] font-mono">
              {machineId} · <span className="text-[var(--accent-blue)]">{inspectionPoint.value.toFixed(2)}</span> {unit}
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {inspectionPoint.value >= threshold ? (
                <span className="text-[#EF4444] font-medium">
                  Exceeded danger limit ({threshold.toFixed(2)} {unit}) by +
                  {(((inspectionPoint.value - threshold) / threshold) * 100).toFixed(1)}%
                </span>
              ) : (
                <span>Within safe range ({corridorMin.toFixed(1)}–{corridorMax.toFixed(1)} {unit})</span>
              )}
            </div>
          </div>
        )}

        {/* X-Axis Timestamps */}
        <div className="absolute bottom-1.5 left-0 right-0 px-4 flex justify-between font-mono text-[10px] text-[var(--text-muted)] font-normal uppercase tracking-wider">
          <span>24h Ago (10:00)</span>
          <span className="hidden sm:inline">18h Ago (16:00)</span>
          <span>12h Ago (22:00)</span>
          <span className="hidden sm:inline">6h Ago (04:00)</span>
          <span>2h Ago (08:00)</span>
          <span className={`font-medium ${isAlarming ? 'text-[#EF4444]' : 'text-[#06B6D4]'}`}>Live</span>
        </div>
      </div>
    </div>
  );
};
