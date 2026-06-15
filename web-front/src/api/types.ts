export interface RadarPayload {
  attack: number;
  defense: number;
  midfield: number;
  pace: number;
  technique: number;
  mentality: number;
  macroGdp: number;
  elo: number;
  ei: number;
  semantic: number;
}

export interface RadarComparison {
  home: RadarPayload;
  away: RadarPayload;
}

export interface SemanticAdjustments {
  lineupTheta: number;
  excitementAdj: number;
  narrativeConfidence: number;
}

export interface ScoreLine {
  home: number;
  away: number;
  prob: number;
}

export interface PredictionResult {
  matchId: string;
  wdl: { home: number; draw: number; away: number };
  top3Scores: ScoreLine[];
  ei: number;
  pBoring: number;
  p00: number;
  mu: number;
  nu: number;
  isBoringMatch: boolean;
  semantic: SemanticAdjustments;
  tacticalNarrative: string;
  keyPlayers?: string[];
  boringMatchSafeguard?: {
    isBoringPossible: boolean;
    reason: string;
    actionAdvice: string;
  };
}

export interface LegacyPrediction {
  matchId: string;
  winnerProbability: { home: number; draw: number; away: number };
  excitementRating: number;
  tacticalAnalysis: string;
  keyPlayers: string[];
  boringMatchSafeguard: {
    isBoringPossible: boolean;
    reason: string;
    actionAdvice: string;
  };
  top3Scores?: ScoreLine[];
  semantic?: SemanticAdjustments;
}

export interface SSEPayload {
  matchId: string;
  ei: number;
  lts: number;
  alarmStatus: string;
  threatHistory: number[];
  alarmTrigger?: {
    type: string;
    title: string;
    description: string;
  };
}

export interface SleepGuardAdvice {
  matchId: string;
  shouldEnableSleepGuard: boolean;
  ei: number;
  p00: number;
  message: string;
}
