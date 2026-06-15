import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import type { RadarComparison } from '../api/types';

interface Props {
  data: RadarComparison;
  homeName: string;
  awayName: string;
}

export default function TeamRadarChart({ data, homeName, awayName }: Props) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const keys: (keyof typeof data.home)[] = [
      'attack',
      'defense',
      'midfield',
      'pace',
      'technique',
      'mentality',
      'macroGdp',
      'elo',
      'ei',
      'semantic',
    ];
    return keys.map((key) => ({
      subject: t(`radar.${key}`),
      home: Math.round(data.home[key]),
      away: Math.round(data.away[key]),
    }));
  }, [data, t]);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
          <Radar
            name={homeName}
            dataKey="home"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.25}
          />
          <Radar
            name={awayName}
            dataKey="away"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.15}
            strokeDasharray="4 4"
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
