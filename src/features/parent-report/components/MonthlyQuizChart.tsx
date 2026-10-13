'use client';
// src/features/parent-report/components/MonthlyQuizChart.tsx
// Interactive Recharts BarChart comparing monthly average quiz scores on ParentHubPage.

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Award, Target } from 'lucide-react';
import type { MonthlySnapshot } from '@/features/parent-report/queries.student';

interface MonthlyQuizChartProps {
  snapshots: MonthlySnapshot[];
}

interface ChartDatum {
  monthYear: string;
  shortLabel: string;
  fullLabel: string;
  avgQuizScore: number;
  attendanceRate: number;
  topicsCompleted: number;
  totalScheduled: number;
  attendedCount: number;
}

function formatShortMonth(monthYear: string, fallbackLabel: string): string {
  const parts = monthYear.split('-');
  if (parts.length === 2) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      const d = new Date(year, month, 1);
      const shortMo = d.toLocaleDateString('id-ID', { month: 'short' });
      const shortYr = String(year).slice(-2);
      return `${shortMo} '${shortYr}`;
    }
  }
  return fallbackLabel.slice(0, 3);
}

function getBarFill(score: number): string {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 70) return '#6366f1'; // indigo-500
  if (score > 0) return '#f59e0b';   // amber-500
  return '#cbd5e1';                  // slate-300
}

export function MonthlyQuizChart({ snapshots }: MonthlyQuizChartProps) {
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(6);

  // Reverse chronologically so oldest is on the left and current month is on the right
  const chartData = useMemo<ChartDatum[]>(() => {
    const sliced = snapshots.slice(0, rangeMonths).reverse();
    return sliced.map((s) => ({
      monthYear: s.monthYear,
      shortLabel: formatShortMonth(s.monthYear, s.monthLabel),
      fullLabel: s.monthLabel,
      avgQuizScore: s.avgQuizScore,
      attendanceRate: s.attendanceRate,
      topicsCompleted: s.topicsCompleted,
      totalScheduled: s.totalScheduled,
      attendedCount: s.attendedCount,
    }));
  }, [snapshots, rangeMonths]);

  const stats = useMemo(() => {
    const activeMonths = chartData.filter((d) => d.avgQuizScore > 0);
    const overallAvg =
      activeMonths.length > 0
        ? Math.round(
            activeMonths.reduce((acc, item) => acc + item.avgQuizScore, 0) /
              activeMonths.length
          )
        : 0;
    const bestMonth =
      activeMonths.length > 0
        ? activeMonths.reduce((best, item) =>
            item.avgQuizScore > best.avgQuizScore ? item : best
          )
        : null;

    // Delta between the last two active months
    let trendDelta: number | null = null;
    if (activeMonths.length >= 2) {
      const latest = activeMonths[activeMonths.length - 1].avgQuizScore;
      const prev = activeMonths[activeMonths.length - 2].avgQuizScore;
      trendDelta = latest - prev;
    }

    return { overallAvg, bestMonth, trendDelta, activeCount: activeMonths.length };
  }, [chartData]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="w-4 h-4" />
            <span>Analisis Performa Akademik</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white mt-0.5">
            Perbandingan Rata-Rata Kuis Bulanan
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Tren capaian nilai kuis bulanan siswa dibandingkan terhadap batas kelulusan topik (70%)
          </p>
        </div>

        {/* Interactive segmented filter */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRangeMonths(6)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              rangeMonths === 6
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            6 Bulan
          </button>
          <button
            type="button"
            onClick={() => setRangeMonths(12)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              rangeMonths === 12
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            12 Bulan
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Rata-Rata ({rangeMonths} Bulan)
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black font-mono tabular-nums text-zinc-900 dark:text-white">
                {stats.overallAvg > 0 ? `${stats.overallAvg}%` : '—'}
              </span>
              {stats.trendDelta !== null && (
                <span
                  className={`text-xs font-bold font-mono tabular-nums ${
                    stats.trendDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {stats.trendDelta >= 0 ? `+${stats.trendDelta}%` : `${stats.trendDelta}%`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Capaian Tertinggi
            </p>
            <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
              {stats.bestMonth
                ? `${stats.bestMonth.avgQuizScore}% · ${stats.bestMonth.shortLabel}`
                : 'Belum ada data'}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Standar Kelulusan
            </p>
            <p className="text-sm font-black text-zinc-900 dark:text-white">
              Min. 70% <span className="text-xs font-normal text-zinc-500">per topik</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
            barCategoryGap="24%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e4e4e7"
            />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: '#e4e4e7' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 70, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const item = payload[0].payload as ChartDatum;
                return (
                  <div className="rounded-xl bg-zinc-900 text-white px-3.5 py-2.5 shadow-xl border border-zinc-700 text-xs">
                    <p className="font-bold text-zinc-100 mb-1">{item.fullLabel}</p>
                    <div className="space-y-1 text-zinc-300">
                      <p className="flex items-center justify-between gap-4">
                        <span>Rata-rata Kuis:</span>
                        <span className="font-mono font-bold text-white">
                          {item.avgQuizScore > 0 ? `${item.avgQuizScore}%` : 'Belum ada kuis'}
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-4">
                        <span>Topik Lulus:</span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {item.topicsCompleted} topik
                        </span>
                      </p>
                      <p className="flex items-center justify-between gap-4">
                        <span>Kehadiran:</span>
                        <span className="font-mono font-semibold text-cyan-300">
                          {item.attendedCount}/{item.totalScheduled} sesi ({item.attendanceRate}%)
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={70}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Target 70%',
                position: 'insideTopRight',
                fill: '#6366f1',
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <Bar
              dataKey="avgQuizScore"
              name="Rata-Rata Kuis"
              radius={[8, 8, 0, 0]}
              maxBarSize={44}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.monthYear}
                  fill={getBarFill(entry.avgQuizScore)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span>Sangat Baik (≥80%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
            <span>Lulus (70–79%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span>Perlu Latihan (&lt;70%)</span>
          </span>
        </div>
        <span>Garis putus-putus menunjukkan batas kelulusan 70%</span>
      </div>
    </div>
  );
}
