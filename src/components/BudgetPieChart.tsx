import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { BudgetCategory } from '../types.ts';
import { formatINR } from '../planner.ts';

interface BudgetPieChartProps {
  categories: BudgetCategory[];
  totalBudget: number;
}

// Earthy, refined palette tailored to EventWise AI's aesthetic with high contrast
export const CATEGORY_COLORS: Record<string, string> = {
  'Venue': '#2d4337',               // Deep forest green
  'Catering': '#3b5443',            // Sage forest
  'Decorations': '#9c4f2b',         // Warm terracotta
  'Photography': '#758368',         // Olive green
  'Clothing & makeup': '#b57849',   // Warm amber clay
  'Transport': '#667768',           // Slate sage
  'Invitations & gifts': '#bf8c56', // Ochre
  'Contingency': '#82532e',         // Bronze safety buffer
};

const DEFAULT_FALLBACK_COLOR = '#57554e';

export const BudgetPieChart: React.FC<BudgetPieChartProps> = ({ categories, totalBudget }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalAmount = useMemo(
    () => (totalBudget > 0 ? totalBudget : categories.reduce((sum, c) => sum + c.amount, 0)),
    [categories, totalBudget]
  );

  const width = 240;
  const height = 240;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.58;
  const outerRadius = radius * 0.92;
  const hoverOuterRadius = radius * 0.98;

  const pieData = useMemo(() => {
    const pie = d3
      .pie<BudgetCategory>()
      .value((d) => d.amount)
      .sort(null)
      .padAngle(0.025);

    return pie(categories);
  }, [categories]);

  const regularArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<BudgetCategory>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(4),
    [innerRadius, outerRadius]
  );

  const hoveredArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<BudgetCategory>>()
        .innerRadius(innerRadius - 2)
        .outerRadius(hoverOuterRadius)
        .cornerRadius(5),
    [innerRadius, hoverOuterRadius]
  );

  const activeCategory = hoveredIdx !== null ? categories[hoveredIdx] : null;
  const activePercentage =
    activeCategory && totalAmount > 0
      ? ((activeCategory.amount / totalAmount) * 100).toFixed(1)
      : null;

  return (
    <div
      role="region"
      aria-label="Category distribution donut chart"
      className="flex flex-col items-center"
    >
      {/* SVG Donut / Pie Chart */}
      <div className="relative w-[240px] h-[240px] select-none">
        <svg
          role="img"
          aria-label={`Donut chart showing budget distribution across ${categories.length} categories totaling ${formatINR(totalAmount)}`}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {pieData.map((d, i) => {
              const isHovered = hoveredIdx === i;
              const color = CATEGORY_COLORS[d.data.name] || DEFAULT_FALLBACK_COLOR;
              const pathData = isHovered ? hoveredArc(d) : regularArc(d);

              return (
                <path
                  key={d.data.name}
                  d={pathData || undefined}
                  fill={color}
                  opacity={hoveredIdx !== null && !isHovered ? 0.45 : 1}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    filter: isHovered ? 'drop-shadow(0px 3px 6px rgba(0,0,0,0.25))' : 'none',
                  }}
                />
              );
            })}
          </g>
        </svg>

        {/* Center Readout Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4" aria-hidden="true">
          {activeCategory ? (
            <>
              <span className="text-[10px] uppercase font-bold text-[#9c4f2b] tracking-wider truncate max-w-[110px]">
                {activeCategory.name}
              </span>
              <span className="text-sm font-bold text-[#1f1e1a] font-mono leading-tight">
                {formatINR(activeCategory.amount)}
              </span>
              <span className="text-[10px] text-[#57554e] font-semibold mt-0.5">
                {activePercentage}% share
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase font-bold text-[#57554e] tracking-wider">
                Total Planned
              </span>
              <span className="text-sm font-bold text-[#1f1e1a] font-mono leading-tight">
                {formatINR(totalAmount)}
              </span>
              <span className="text-[9px] text-[#57554e] mt-0.5">
                Hover slice to inspect
              </span>
            </>
          )}
        </div>
      </div>

      {/* Compact Interactive Accessible Legend */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4 w-full text-xs" role="list" aria-label="Budget categories legend">
        {categories.map((c, i) => {
          const isHovered = hoveredIdx === i;
          const color = CATEGORY_COLORS[c.name] || DEFAULT_FALLBACK_COLOR;
          const pct = totalAmount > 0 ? ((c.amount / totalAmount) * 100).toFixed(0) : '0';

          return (
            <button
              type="button"
              key={c.name}
              role="listitem"
              onFocus={() => setHoveredIdx(i)}
              onBlur={() => setHoveredIdx(null)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              aria-label={`${c.name}: ${formatINR(c.amount)} (${pct}% of planned budget)`}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#354c3c] ${
                isHovered ? 'bg-[#f4f2ea] shadow-2xs' : 'hover:bg-[#faf9f4]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                  style={{
                    backgroundColor: color,
                    transform: isHovered ? 'scale(1.25)' : 'scale(1)',
                  }}
                  aria-hidden="true"
                />
                <span
                  className={`text-[11px] truncate ${
                    isHovered ? 'font-bold text-[#1f1e1a]' : 'text-[#33322d]'
                  }`}
                >
                  {c.name}
                </span>
              </div>
              <span className="text-[10px] text-[#57554e] font-mono ml-1 shrink-0 font-medium">
                {pct}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
