// ============================================================================
// SIMPLE CHART COMPONENT
// Basic chart implementation without external dependencies
// ============================================================================

import React, { useMemo } from 'react';
import { formatCurrency, formatAge } from '../../utils/formatters';

interface ChartDataPoint {
  year: number;
  age: number;
  value: number;
  label: string;
}

interface SimpleLineChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  title?: string;
  valueFormatter?: (value: number) => string;
  showDots?: boolean;
  color?: string;
  fillColor?: string;
  showGrid?: boolean;
  className?: string;
}

export function SimpleLineChart({
  data,
  width = 800,
  height = 300,
  title,
  valueFormatter = formatCurrency,
  showDots = false,
  color = '#4F46E5',
  fillColor = 'rgba(79, 70, 229, 0.1)',
  showGrid = true,
  className = ''
}: SimpleLineChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return { x, y, ...point };
    });

    // Create SVG path
    const pathData = points.reduce((path, point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
    }, '');

    // Create fill area path
    const fillPath = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    return {
      points,
      pathData,
      fillPath,
      minValue,
      maxValue,
      padding,
      chartWidth,
      chartHeight
    };
  }, [data, width, height]);

  if (!chartData) {
    return (
      <div className={`bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ width, height }}>
        <p className="text-gray-500">Ingen data att visa</p>
      </div>
    );
  }

  const { points, pathData, fillPath, minValue, maxValue, padding, chartWidth, chartHeight } = chartData;

  // Generate grid lines
  const gridLines = showGrid ? Array.from({ length: 5 }, (_, i) => {
    const y = padding + (i / 4) * chartHeight;
    const value = maxValue - (i / 4) * (maxValue - minValue);
    return { y, value };
  }) : [];

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>}
      
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {showGrid && gridLines.map((line, index) => (
          <g key={index}>
            <line
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <text
              x={padding - 10}
              y={line.y + 4}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {valueFormatter(line.value)}
            </text>
          </g>
        ))}

        {/* Fill area */}
        <path
          d={fillPath}
          fill={fillColor}
          stroke="none"
        />

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
            className="cursor-pointer"
          >
            <title>{point.label}: {valueFormatter(point.value)}</title>
          </circle>
        ))}

        {/* X-axis labels */}
        {points.filter((_, index) => index % Math.ceil(points.length / 8) === 0).map((point, index) => (
          <text
            key={index}
            x={point.x}
            y={height - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {formatAge(point.age)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// Bar chart component
interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  title?: string;
  valueFormatter?: (value: number) => string;
  horizontal?: boolean;
  className?: string;
}

export function SimpleBarChart({
  data,
  width = 600,
  height = 300,
  title,
  valueFormatter = formatCurrency,
  horizontal = false,
  className = ''
}: BarChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const maxValue = Math.max(...data.map(d => Math.abs(d.value)));
    const barSpacing = 10;
    const barWidth = (chartWidth - barSpacing * (data.length - 1)) / data.length;

    const bars = data.map((item, index) => {
      const barHeight = Math.abs(item.value) / maxValue * chartHeight;
      const x = padding + index * (barWidth + barSpacing);
      const y = item.value >= 0 
        ? padding + chartHeight - barHeight
        : padding + chartHeight;
      
      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        color: item.color || '#4F46E5',
        ...item
      };
    });

    return { bars, padding, chartWidth, chartHeight, maxValue };
  }, [data, width, height]);

  if (!chartData) {
    return (
      <div className={`bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ width, height }}>
        <p className="text-gray-500">Ingen data att visa</p>
      </div>
    );
  }

  const { bars, padding, chartHeight } = chartData;

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>}
      
      <svg width={width} height={height}>
        {/* Zero line */}
        <line
          x1={padding}
          y1={padding + chartHeight}
          x2={width - padding}
          y2={padding + chartHeight}
          stroke="#374151"
          strokeWidth="1"
        />

        {/* Bars */}
        {bars.map((bar, index) => (
          <g key={index}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              fill={bar.color}
              className="hover:opacity-80 cursor-pointer"
            >
              <title>{bar.label}: {valueFormatter(bar.value)}</title>
            </rect>
            
            {/* Label */}
            <text
              x={bar.x + bar.width / 2}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Pie chart component
interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
  title?: string;
  valueFormatter?: (value: number) => string;
  showLabels?: boolean;
  className?: string;
}

export function SimplePieChart({
  data,
  size = 300,
  title,
  valueFormatter = formatCurrency,
  showLabels = true,
  className = ''
}: PieChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + Math.abs(item.value), 0);
    const radius = (size - 40) / 2;
    const centerX = size / 2;
    const centerY = size / 2;

    let currentAngle = -Math.PI / 2; // Start at top

    const slices = data.map((item, index) => {
      const angle = (Math.abs(item.value) / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      // Label position
      const labelAngle = startAngle + angle / 2;
      const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle);
      const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle);

      currentAngle = endAngle;

      return {
        pathData,
        labelX,
        labelY,
        color: item.color || `hsl(${index * 360 / data.length}, 70%, 50%)`,
        percentage: (Math.abs(item.value) / total) * 100,
        ...item
      };
    });

    return { slices, total };
  }, [data, size]);

  if (!chartData) {
    return (
      <div className={`bg-gray-50 rounded-lg flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <p className="text-gray-500">Ingen data att visa</p>
      </div>
    );
  }

  const { slices } = chartData;

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>}
      
      <svg width={size} height={size}>
        {slices.map((slice, index) => (
          <g key={index}>
            <path
              d={slice.pathData}
              fill={slice.color}
              className="hover:opacity-80 cursor-pointer"
            >
              <title>{slice.label}: {valueFormatter(slice.value)} ({slice.percentage.toFixed(1)}%)</title>
            </path>
            
            {showLabels && slice.percentage > 5 && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                className="text-xs fill-white font-medium pointer-events-none"
              >
                {slice.percentage.toFixed(0)}%
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-1 gap-2">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center text-sm">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-gray-700">
              {slice.label}: {valueFormatter(slice.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
