import { Match, IoTDeviceState } from './types';

export const mockMatches: Match[] = [
  {
    id: 'wc-01',
    homeTeam: {
      name: '阿根廷',
      flag: '🇦🇷',
      strength: 92,
      attackStyle: '传控渗透 & 前场逼抢 (Tiki-Taka)'
    },
    awayTeam: {
      name: '法国',
      flag: '🇫🇷',
      strength: 94,
      attackStyle: '防守反击 & 高速边路推进 (Explosive Counter)'
    },
    startTime: '2026-06-15T20:00:00Z',
    status: 'LIVE',
    score: { home: 1, away: 1 },
    timeElapsed: '72:15',
    excitementIndex: 88,
    threatIndex: 65,
    group: '决赛组 (Finals)',
    alarmSettings: {
      enabled: true,
      mode: 'HIGH_ENERGY',
      threatThreshold: 75,
      highEnergyTriggers: {
        goals: true,
        redCard: true,
        penalty: true,
        varDecisions: true
      },
      ringtone: '高能战区警报 (Zone Alarm)',
      vVolume: 80,
      iotSyncEnabled: true
    }
  },
  {
    id: 'wc-02',
    homeTeam: {
      name: '巴西',
      flag: '🇧🇷',
      strength: 90,
      attackStyle: '桑巴桑攻 & 肋部撕扯 (Samba Offensive)'
    },
    awayTeam: {
      name: '西班牙',
      flag: '🇪🇸',
      strength: 91,
      attackStyle: '极致控球 & 高位回旋 (Absolute Possession)'
    },
    startTime: '2026-06-15T23:00:00Z',
    status: 'SCHEDULED',
    score: { home: 0, away: 0 },
    timeElapsed: '00:00',
    excitementIndex: 0,
    threatIndex: 0,
    group: '半决赛 B (Semi Final B)',
    alarmSettings: {
      enabled: false,
      mode: 'AI_TACTICAL',
      threatThreshold: 80,
      highEnergyTriggers: {
        goals: true,
        redCard: false,
        penalty: true,
        varDecisions: false
      },
      ringtone: 'AI数智唤醒 (Smart Wave)',
      vVolume: 50,
      iotSyncEnabled: true
    }
  },
  {
    id: 'wc-03',
    homeTeam: {
      name: '克罗地亚',
      flag: '🇭🇷',
      strength: 84,
      attackStyle: '稳固防守 & 三中场韧性纠缠 (Gritty Defensive Block)'
    },
    awayTeam: {
      name: '摩洛哥',
      flag: '🇲🇦',
      strength: 85,
      attackStyle: '低位防守 & 局部合围机动 (Low-Block Defending)'
    },
    startTime: '2026-06-14T18:00:00Z',
    status: 'FINISHED',
    score: { home: 0, away: 0 },
    timeElapsed: '90:00',
    excitementIndex: 42,
    threatIndex: 12,
    group: '小组赛 A 轮 (Group A)',
    alarmSettings: {
      enabled: false,
      mode: 'HARDCORE_DND',
      threatThreshold: 90,
      highEnergyTriggers: {
        goals: true,
        redCard: true,
        penalty: true,
        varDecisions: true
      },
      ringtone: '硬核雷鸣唤醒 (Thunder)',
      vVolume: 90,
      iotSyncEnabled: false
    }
  }
];

export const defaultIoTDevices: IoTDeviceState[] = [
  {
    id: 'iot-light',
    name: '客厅幻彩氛围灯条 (RGB Strip)',
    type: 'LIGHT',
    status: 'ON',
    intensity: 60,
    mode: 'Cinematic Green (绿茵星空)'
  },
  {
    id: 'iot-tv',
    name: '巨幕超激光电视 (UHD TV)',
    type: 'TV',
    status: 'ON',
    intensity: 75,
    mode: 'Live Sports Mode (臻享体育音效)'
  },
  {
    id: 'iot-ac',
    name: '全域智慧微风空调 (Wind AC)',
    type: 'AC',
    status: 'ON',
    intensity: 22, // temperature in °C
    mode: 'Tactical Sync (战术温度联动)'
  },
  {
    id: 'iot-audio',
    name: '全景声多通道音响 (Soundbar)',
    type: 'AUDIO',
    status: 'ON',
    intensity: 45,
    mode: 'Stadium Ambient (沉浸球场啸声)'
  }
];
