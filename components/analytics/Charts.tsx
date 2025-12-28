'use client'

import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'

interface EloHistoryData {
  date: string
  elo: number
  change: number
}

interface WinRateData {
  period: string
  winRate: number
  battles: number
}

interface CategoryData {
  category: string
  score: number
  fullMark: number
}

interface MatchupData {
  opponent: string
  wins: number
  losses: number
  avgScore: number
}

// Custom tooltip styling
const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #3a3a5c',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  labelStyle: { color: '#888' },
  itemStyle: { color: '#fff' },
}

export function EloHistoryChart({ data }: { data: EloHistoryData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={{ stroke: '#2a2a4a' }}
          tickLine={false}
        />
        <YAxis
          domain={['dataMin - 50', 'dataMax + 50']}
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <ReferenceLine y={1000} stroke="#666" strokeDasharray="3 3" label={{ value: 'Starting', fill: '#666', fontSize: 10 }} />
        <Area
          type="monotone"
          dataKey="elo"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#eloGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function WinRateTrendChart({ data }: { data: WinRateData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={{ stroke: '#2a2a4a' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Win Rate']}
        />
        <ReferenceLine y={50} stroke="#666" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="winRate"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#22c55e' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SkillRadarChart({ data }: { data: CategoryData[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke="#2a2a4a" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: '#888', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 10]}
          tick={{ fill: '#666', fontSize: 10 }}
          axisLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#a855f7"
          fill="#a855f7"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export function HeadToHeadChart({ data }: { data: MatchupData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 60, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={{ stroke: '#2a2a4a' }}
          tickLine={false}
        />
        <YAxis
          dataKey="opponent"
          type="category"
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ paddingTop: 10 }} />
        <Bar dataKey="wins" fill="#22c55e" name="Wins" radius={[0, 4, 4, 0]} />
        <Bar dataKey="losses" fill="#ef4444" name="Losses" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreDistributionChart({ data }: { data: { range: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fill: '#888', fontSize: 10 }}
          axisLine={{ stroke: '#2a2a4a' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#888', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        <Bar
          dataKey="count"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ActivityHeatmap({ data }: { data: { day: string; hour: number; battles: number }[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const maxBattles = Math.max(...data.map(d => d.battles))

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(24, 1fr)` }}>
        <div /> {/* Empty corner */}
        {hours.map(hour => (
          <div key={hour} className="text-[10px] text-center text-dark-500">
            {hour % 4 === 0 ? `${hour}:00` : ''}
          </div>
        ))}
        {days.map(day => (
          <div key={day} className="contents">
            <div className="text-xs text-dark-400 pr-2">
              {day}
            </div>
            {hours.map(hour => {
              const cell = data.find(d => d.day === day && d.hour === hour)
              const intensity = cell ? cell.battles / maxBattles : 0
              return (
                <div
                  key={`${day}-${hour}`}
                  className="w-full aspect-square rounded-sm"
                  style={{
                    backgroundColor: intensity > 0
                      ? `rgba(168, 85, 247, ${0.2 + intensity * 0.8})`
                      : '#1a1a2e'
                  }}
                  title={`${day} ${hour}:00 - ${cell?.battles || 0} battles`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
