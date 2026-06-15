/**
 * Types for the World Cup Tactical Match Hall (世界杯数智战术观赛大厅)
 */

export interface Team {
  name: string;
  flag: string;
  strength: number; // 1-100
  attackStyle: string;
}

export type MatchStatus = 'LIVE' | 'SCHEDULED' | 'FINISHED';

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string; // ISO String or manual representation
  status: MatchStatus;
  score: { home: number; away: number };
  timeElapsed: string; // e.g. "72:15"
  excitementIndex: number; // 0-100
  threatIndex: number; // 0-100 (real-time dynamic threat)
  group: string; // e.g. "Group A"
  alarmSettings?: AlarmSettings;
}

export type WakeupMode = 'AI_TACTICAL' | 'HARDCORE_DND' | 'HIGH_ENERGY';

export interface AlarmSettings {
  enabled: boolean;
  mode: WakeupMode;
  threatThreshold: number; // For AI_TACTICAL mode, trigger when threat meets threshold (e.g. 75)
  highEnergyTriggers: {
    goals: boolean;
    redCard: boolean;
    penalty: boolean;
    varDecisions: boolean;
  };
  ringtone: string; // ringtone sound choice
  vVolume: number; // volume 0-100
  iotSyncEnabled: boolean;
}

export interface IoTDeviceState {
  id: string;
  name: string;
  type: 'LIGHT' | 'TV' | 'AC' | 'AUDIO';
  status: 'ON' | 'OFF';
  intensity: number; // 0-100 (brightness, volume, temperature, ambient level)
  mode: string; // e.g. "Cinematic Green", "Trophy Gold", "Quiet Breath"
}

export interface AIPrediction {
  matchId: string;
  winnerProbability: { home: number; draw: number; away: number };
  excitementRating: number;
  tacticalAnalysis: string;
  keyPlayers: string[];
  boringMatchSafeguard: {
    isBoringPossible: boolean;
    reason: string;
    actionAdvice: string; // e.g. "无剧透3分钟集锦" or "智能降噪入眠"
  };
}

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'TRIGGER' | 'ALARM' | 'IOT';
}
