import React, { useState } from 'react';

export interface DataSeries {
  name: string;
  color: string;
  data: { timestamp: string; value: number }[];
}

export interface ChartTab {
  id: string;
  label: string;
  series: DataSeries[];
  unit: string;
  threshold?: number;
  thresholdLabel?: string;
}

interface TimeSeriesChartProps {
  title?: string;
  tabs?: ChartTab[];
  series?: DataSeries[];
  unit?: string;
  threshold?: number;
  thresholdLabel?: string;
  height?: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  title,
  tabs,
  series: defaultSeries,
  unit: defaultUnit = '',
  threshold: defaultThreshold,
  thresholdLabel: defaultThresholdLabel = 'Threshold',
  height = 240,
}) => {
  const [activeTabId, setActiveTabId] = useState<string>(tabs && tabs.length > 0 ? tabs[0].id : '');
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    timestamp: string;
    value: number;
    seriesName: string;
    color: string;
  } | null>(null);

  const activeTab = tabs ? tabs.find((t) => t.id === activeTabId) || tabs[0] : null;
  const series = activeTab ? activeTab.series : (defaultSeries || []);
  const unit = activeTab ? activeTab.unit : defaultUnit;
  const threshold = activeTab ? activeTab.threshold : defaultThreshold;
  const thresholdLabel = activeTab ? activeTab.thresholdLabel : defaultThresholdLabel;

  // Filter series with non-empty data
  const validSeries = series.filter((s) => s.data && s.data.length > 0);
  if (validSeries.length === 0) {
    return (
      <div className="chart-card empty-chart" style={{ height }}>
        {tabs && tabs.length > 1 && (
          <div className="chart-tabs-header">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`chart-tab-pill ${activeTabId === t.id ? 'active' : ''}`}
                onClick={() => setActiveTabId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="empty-chart-message">No historical data available</div>
      </div>
    );
  }

  // Determine global min and max values
  let allValues: number[] = [];
  validSeries.forEach((s) => {
    s.data.forEach((d) => {
      if (typeof d.value === 'number' && !isNaN(d.value)) {
        allValues.push(d.value);
      }
    });
  });

  if (threshold !== undefined) {
    allValues.push(threshold);
  }

  if (allValues.length === 0) {
    allValues = [0, 100];
  }

  let minVal = Math.min(...allValues);
  let maxVal = Math.max(...allValues);

  // Add buffer to range
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal - 10);
    maxVal = maxVal + 10;
  } else {
    const pad = (maxVal - minVal) * 0.1;
    minVal = Math.max(0, minVal - pad);
    maxVal = maxVal + pad;
  }

  // Dimensions
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 30;
  const width = 600; // viewBox width

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Time domain from the longest series
  const refSeries = validSeries.reduce((prev, curr) => (curr.data.length > prev.data.length ? curr : prev), validSeries[0]);
  const numPoints = refSeries.data.length;

  const getX = (index: number) => {
    if (numPoints <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (numPoints - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return paddingTop + plotHeight - ((clamped - minVal) / (maxVal - minVal)) * plotHeight;
  };

  // Generate paths
  const seriesPaths = validSeries.map((s) => {
    const points = s.data.map((d, i) => {
      const x = getX(i);
      const y = getY(d.value);
      return `${x},${y}`;
    });
    return {
      name: s.name,
      color: s.color,
      path: `M ${points.join(' L ')}`,
      data: s.data,
    };
  });

  // Threshold Y coordinate
  const thresholdY = threshold !== undefined ? getY(threshold) : null;

  // Format time tick
  const formatTimeTick = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso.slice(-8);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Generate 4-5 X-axis labels
  const xLabels = [];
  if (numPoints > 0) {
    const step = Math.max(1, Math.floor(numPoints / 4));
    for (let i = 0; i < numPoints; i += step) {
      xLabels.push({
        x: getX(i),
        text: formatTimeTick(refSeries.data[i].timestamp),
      });
    }
    // ensure last label is present
    if (numPoints > 1 && (numPoints - 1) % step !== 0) {
      xLabels.push({
        x: getX(numPoints - 1),
        text: formatTimeTick(refSeries.data[numPoints - 1].timestamp),
      });
    }
  }

  // Y-axis grid values
  const yTicks = [
    { y: getY(minVal), val: minVal.toFixed(1) },
    { y: getY(minVal + (maxVal - minVal) * 0.5), val: (minVal + (maxVal - minVal) * 0.5).toFixed(1) },
    { y: getY(maxVal), val: maxVal.toFixed(1) },
  ];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-area">
          {title && <span className="chart-title">{title}</span>}
          {tabs && tabs.length > 1 && (
            <div className="chart-tabs-header">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`chart-tab-pill ${activeTabId === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTabId(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="chart-legend">
          {validSeries.map((s) => (
            <span key={s.name} className="legend-item">
              <span className="legend-color-dot" style={{ backgroundColor: s.color }} />
              <span className="legend-label">{s.name}</span>
            </span>
          ))}
          {threshold !== undefined && (
            <span className="legend-item">
              <span className="legend-color-line" style={{ borderTop: '2px dashed #ef4444' }} />
              <span className="legend-label">{thresholdLabel} ({threshold}{unit})</span>
            </span>
          )}
        </div>
      </div>

      <div className="chart-svg-container" style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          preserveAspectRatio="none"
          style={{ width: '100%', height }}
        >
          {/* Y-axis grid lines and labels */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={t.y}
                x2={width - paddingRight}
                y2={t.y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={t.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Threshold line */}
          {thresholdY !== null && (
            <line
              x1={paddingLeft}
              y1={thresholdY}
              x2={width - paddingRight}
              y2={thresholdY}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Series lines */}
          {seriesPaths.map((sp) => (
            <path
              key={sp.name}
              d={sp.path}
              fill="none"
              stroke={sp.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Interactive invisible hit points */}
          {seriesPaths.map((sp) =>
            sp.data.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.value);
              return (
                <circle
                  key={`${sp.name}-${i}`}
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill={sp.color}
                  opacity={hoveredPoint?.timestamp === d.timestamp && hoveredPoint?.seriesName === sp.name ? 1 : 0}
                  className="chart-point"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      x: (cx / width) * 100,
                      y: (cy / height) * 100,
                      timestamp: d.timestamp,
                      value: d.value,
                      seriesName: sp.name,
                      color: sp.color,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })
          )}

          {/* X-axis labels */}
          {xLabels.map((xl, idx) => (
            <text
              key={idx}
              x={xl.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {xl.text}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="chart-tooltip"
            style={{
              position: 'absolute',
              left: `${hoveredPoint.x}%`,
              top: `${Math.max(5, hoveredPoint.y - 15)}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
            }}
          >
            <div className="tooltip-header">{formatTimeTick(hoveredPoint.timestamp)}</div>
            <div className="tooltip-body" style={{ color: hoveredPoint.color }}>
              {hoveredPoint.seriesName}: {hoveredPoint.value.toFixed(2)} {unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
