// ============================================================================
// INTERACTIVE CHARTS COMPONENT
// Real charts using Canvas API for better performance
// ============================================================================

import React, { useRef, useEffect, useState } from 'react';
import { formatCurrency, formatAge } from '../../utils/formatters';

interface ChartDataPoint {
  year: number;
  age: number;
  value: number;
  label: string;
}

interface LineChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  title?: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  fillColor?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function InteractiveLineChart({
  data,
  width = 800,
  height = 300,
  title,
  valueFormatter = formatCurrency,
  color = '#4F46E5',
  fillColor = 'rgba(79, 70, 229, 0.1)',
  showGrid = true,
  showTooltip = true,
  className = ''
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const minValue = Math.min(...data.map(d => d.value));
    const maxValue = Math.max(...data.map(d => d.value));
    const valueRange = maxValue - minValue || 1;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      
      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxValue - (i / 5) * (maxValue - minValue);
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(valueFormatter(value), padding - 10, y + 4);
      }
      
      // Reset line dash
      ctx.setLineDash([]);
    }

    // Calculate points
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return { x, y, ...point };
    });

    // Draw fill area
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw main line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    // Draw points
    points.forEach(point => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X-axis labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    const labelStep = Math.ceil(data.length / 8);
    data.forEach((point, index) => {
      if (index % labelStep === 0) {
        const x = padding + (index / (data.length - 1)) * chartWidth;
        ctx.fillText(formatAge(point.age), x, height - padding + 20);
      }
    });

    // Store points for tooltip
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    function handleMouseMove(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Find closest point
      let closestPoint = null;
      let minDistance = Infinity;

      points.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2)
        );
        if (distance < minDistance && distance < 20) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      if (closestPoint && showTooltip) {
        setTooltip({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          content: `${formatAge(closestPoint.age)}: ${valueFormatter(closestPoint.value)}`
        });
      } else {
        setTooltip(prev => ({ ...prev, visible: false }));
      }
    }

    function handleMouseLeave() {
      setTooltip(prev => ({ ...prev, visible: false }));
    }

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [data, width, height, color, fillColor, showGrid, showTooltip, valueFormatter]);

  if (data.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg flex items-center justify-center ${className}`} 
           style={{ width, height }}>
        <p className="text-gray-500">Ingen data att visa</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border p-4 relative ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>}
      
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        style={{ width, height }}
      />

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-2 py-1 rounded text-sm pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// Multi-line chart for comparing different metrics
interface MultiLineChartProps {
  datasets: Array<{
    label: string;
    data: ChartDataPoint[];
    color: string;
    fillColor?: string;
  }>;
  width?: number;
  height?: number;
  title?: string;
  valueFormatter?: (value: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

export function MultiLineChart({
  datasets,
  width = 800,
  height = 300,
  title,
  valueFormatter = formatCurrency,
  showGrid = true,
  showLegend = true,
  className = ''
}: MultiLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || datasets.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Find global min/max across all datasets
    const allValues = datasets.flatMap(dataset => dataset.data.map(d => d.value));
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // Y-axis labels
        const value = maxValue - (i / 5) * (maxValue - minValue);
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(valueFormatter(value), padding - 10, y + 4);
      }
      
      ctx.setLineDash([]);
    }

    // Draw each dataset
    datasets.forEach((dataset, datasetIndex) => {
      if (dataset.data.length === 0) return;

      const points = dataset.data.map((point, index) => {
        const x = padding + (index / (dataset.data.length - 1)) * chartWidth;
        const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
        return { x, y, ...point };
      });

      // Draw fill area if specified
      if (dataset.fillColor) {
        ctx.fillStyle = dataset.fillColor;
        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.lineTo(points[points.length - 1].x, height - padding);
        ctx.closePath();
        ctx.fill();
      }

      // Draw line
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      // Draw points
      points.forEach(point => {
        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

    // X-axis labels (use first dataset for reference)
    if (datasets[0]?.data.length > 0) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      const labelStep = Math.ceil(datasets[0].data.length / 8);
      datasets[0].data.forEach((point, index) => {
        if (index % labelStep === 0) {
          const x = padding + (index / (datasets[0].data.length - 1)) * chartWidth;
          ctx.fillText(formatAge(point.age), x, height - padding + 20);
        }
      });
    }

  }, [datasets, width, height, showGrid, valueFormatter]);

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>}
      
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        style={{ width, height }}
      />

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4">
          {datasets.map((dataset, index) => (
            <div key={index} className="flex items-center text-sm">
              <div 
                className="w-4 h-0.5 mr-2" 
                style={{ backgroundColor: dataset.color }}
              />
              <span className="text-gray-700">{dataset.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-2 py-1 rounded text-sm pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// Simple bar chart for categorical data
interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
  title?: string;
  valueFormatter?: (value: number) => string;
  horizontal?: boolean;
  className?: string;
}

export function InteractiveBarChart({
  data,
  width = 600,
  height = 300,
  title,
  valueFormatter = formatCurrency,
  horizontal = false,
  className = ''
}: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = 80;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const maxValue = Math.max(...data.map(d => Math.abs(d.value)));
    const minValue = Math.min(...data.map(d => d.value));
    const hasNegative = minValue < 0;

    if (horizontal) {
      // Horizontal bars
      const barHeight = chartHeight / data.length * 0.8;
      const barSpacing = chartHeight / data.length * 0.2;

      data.forEach((item, index) => {
        const barWidth = Math.abs(item.value) / maxValue * chartWidth;
        const y = padding + index * (barHeight + barSpacing);
        const x = hasNegative ? 
          (item.value >= 0 ? width / 2 : width / 2 - barWidth) :
          padding;

        ctx.fillStyle = item.color || '#4F46E5';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Label
        ctx.fillStyle = '#374151';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(item.label, padding - 10, y + barHeight / 2 + 4);

        // Value
        ctx.textAlign = 'left';
        ctx.fillText(
          valueFormatter(item.value), 
          x + barWidth + 5, 
          y + barHeight / 2 + 4
        );
      });
    } else {
      // Vertical bars
      const barWidth = chartWidth / data.length * 0.8;
      const barSpacing = chartWidth / data.length * 0.2;

      data.forEach((item, index) => {
        const barHeight = Math.abs(item.value) / maxValue * chartHeight;
        const x = padding + index * (barWidth + barSpacing);
        const y = hasNegative ?
          (item.value >= 0 ? height / 2 - barHeight : height / 2) :
          height - padding - barHeight;

        ctx.fillStyle = item.color || '#4F46E5';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Label
        ctx.fillStyle = '#374151';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(x + barWidth / 2, height - padding + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.fillText(item.label, 0, 0);
        ctx.restore();
      });
    }

    // Zero line for charts with negative values
    if (hasNegative) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(width / 2, padding);
        ctx.lineTo(width / 2, height - padding);
      } else {
        ctx.moveTo(padding, height / 2);
        ctx.lineTo(width - padding, height / 2);
      }
      ctx.stroke();
    }

  }, [data, width, height, horizontal, valueFormatter]);

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>}
      
      <canvas
        ref={canvasRef}
        style={{ width, height }}
      />
    </div>
  );
}
