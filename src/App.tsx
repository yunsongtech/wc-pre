import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Bell, 
  Tv, 
  Lightbulb, 
  Award, 
  Clock, 
  Flame, 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Check, 
  Volume2, 
  ShieldAlert, 
  AlertTriangle, 
  Eye, 
  ArrowRight, 
  Video, 
  Sparkles, 
  Moon, 
  VolumeX, 
  Smartphone,
  Cpu,
  RefreshCw
} from 'lucide-react';
import { mockMatches, defaultIoTDevices } from './mockData';
import { Match, IoTDeviceState, AIPrediction, SystemLog, WakeupMode, AlarmSettings } from './types';

export default function App() {
  // Application state
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match>(mockMatches[0]);
  const [iotDevices, setIotDevices] = useState<IoTDeviceState[]>(defaultIoTDevices);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([
    { id: '1', timestamp: '12:48:10.223', message: '数智战术观赛系统启动成功，全屋IoT就绪。', type: 'INFO' },
    { id: '2', timestamp: '12:49:05.104', message: '阿根廷对阵法国进行中 - 已自动加载AI战术威胁雷达。', type: 'INFO' }
  ]);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'hall' | 'iot' | 'logs'>('hall');
  
  // Predict content state
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loadingPredict, setLoadingPredict] = useState<boolean>(false);
  const [predictionCache, setPredictionCache] = useState<Record<string, AIPrediction>>({});

  // Alarm settings state (for editing)
  const [editingSettings, setEditingSettings] = useState<AlarmSettings | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Live simulation states (for demonstrating Page D: Wake-up / High-Light Alert)
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [threatHistory, setThreatHistory] = useState<number[]>([45, 48, 52, 49, 58, 62, 55, 60, 65, 61, 70, 65]);
  const [currentThreat, setCurrentThreat] = useState<number>(65);
  const [triggerAlert, setTriggerAlert] = useState<{
    show: boolean;
    type: 'GOAL' | 'RED_CARD' | 'DANGER' | 'BORING';
    title: string;
    description: string;
    eventTime: string;
    homeScore: number;
    awayScore: number;
  } | null>(null);

  // Sound play mockup
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Logs helper
  const addLog = (message: string, type: 'INFO' | 'TRIGGER' | 'ALARM' | 'IOT') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setSystemLogs(prev => [
      { id: Date.now().toString(), timestamp, message, type },
      ...prev.slice(0, 49) // Keep last 50 logs
    ]);
  };

  // Pulse simulation for real-time threat update
  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      interval = setInterval(() => {
        // Find if selected match is LIVE
        if (selectedMatch.status === 'LIVE') {
          const delta = Math.floor(Math.random() * 11) - 5; // -5 to +5
          const newThreat = Math.max(10, Math.min(100, currentThreat + delta));
          setCurrentThreat(newThreat);
          setThreatHistory(prev => [...prev.slice(1), newThreat]);

          // Update match in state
          setMatches(prev => prev.map(m => {
            if (m.id === selectedMatch.id) {
              return { ...m, threatIndex: newThreat };
            }
            return m;
          }));

          // Heartbeat visual indicator update
          if (newThreat > 80 && Math.random() > 0.6) {
            addLog(`[威胁雷达] 检测到前场高危进攻，威胁度攀升至 ${newThreat}%。`, 'TRIGGER');
            
            // Check if AI Tactical Alarm is armed and meets threshold
            if (selectedMatch.alarmSettings?.enabled) {
              const alarm = selectedMatch.alarmSettings;
              if (alarm.mode === 'AI_TACTICAL' && newThreat >= alarm.threatThreshold) {
                triggerWakeUpPanel('DANGER', `战术威胁高能预警 (危害度: ${newThreat}%)`, `${selectedMatch.homeTeam.name} 组织禁区撕扯压制，射门概率骤增！`);
              }
            }
          }
        }
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isSimulating, currentThreat, selectedMatch]);

  // Fetch or fall back prediction
  const fetchPrediction = async (match: Match) => {
    setLoadingPredict(true);
    addLog(`正在请求 AI 智能引擎分析 ${match.homeTeam.name} VS ${match.awayTeam.name} 的战术面貌...`, 'INFO');
    
    if (predictionCache[match.id]) {
      setPrediction(predictionCache[match.id]);
      setLoadingPredict(false);
      addLog(`已从智能缓存中加载 ${match.homeTeam.name} 战术大盘数据`, 'INFO');
      return;
    }

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam
        })
      });
      const data = await res.json();
      setPrediction(data);
      setPredictionCache(prev => ({ ...prev, [match.id]: data }));
      addLog(`AI战术复盘解析生成完毕：建议度极高，闷战风险系数判定。`, 'INFO');
    } catch (e) {
      addLog(`智能端接入异常，使用本地高性能战术决策引擎渲染。`, 'INFO');
    } finally {
      setLoadingPredict(false);
    }
  };

  useEffect(() => {
    fetchPrediction(selectedMatch);
    if (selectedMatch.status === 'LIVE') {
      setCurrentThreat(selectedMatch.threatIndex);
    } else {
      setCurrentThreat(0);
    }
  }, [selectedMatch]);

  // Handle Alarm Settings Modal
  const handleOpenSettings = (match: Match) => {
    const defaultSettings: AlarmSettings = match.alarmSettings || {
      enabled: true,
      mode: 'AI_TACTICAL',
      threatThreshold: 75,
      highEnergyTriggers: {
        goals: true,
        redCard: true,
        penalty: true,
        varDecisions: true
      },
      ringtone: 'AI数智唤醒 (Smart Wave)',
      vVolume: 70,
      iotSyncEnabled: true
    };
    setEditingSettings(defaultSettings);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    if (!editingSettings) return;
    
    // Update the local select match
    const updatedMatch = { ...selectedMatch, alarmSettings: editingSettings };
    setSelectedMatch(updatedMatch);
    
    // Update in match schedule list
    setMatches(prev => prev.map(m => {
      if (m.id === selectedMatch.id) {
        return updatedMatch;
      }
      return m;
    }));

    addLog(`「战术闹钟」配置已应用至 ${selectedMatch.homeTeam.name} vs ${selectedMatch.awayTeam.name}. 状态: ${editingSettings.enabled ? '已装载' : '已撤载'} / 唤醒模式: ${editingSettings.mode}`, 'ALARM');
    
    // If IoT sync is enabled and changed, apply light preset
    if (editingSettings.enabled && editingSettings.iotSyncEnabled) {
      applyIotPreset('TACTICAL');
    }

    setIsSettingsOpen(false);
  };

  // Apply IoT Presets
  const applyIotPreset = (type: 'CINEMATIC' | 'TACTICAL' | 'GOLD' | 'SLEEP') => {
    let modeName = '';
    let brightness = 70;
    let targetMsg = '';

    const updated = iotDevices.map(device => {
      let currentDevice = { ...device };
      if (type === 'CINEMATIC') {
        modeName = '绿茵星空 (Green Ambient)';
        brightness = 65;
        targetMsg = '全屋设为沉浸式绿茵观赛模式：灯光渐变为草绿暖色，电视低延时增强。';
        if (device.type === 'LIGHT') { currentDevice.mode = 'Cinematic Green (柔绿护眼)'; currentDevice.intensity = 50; currentDevice.status = 'ON'; }
        if (device.type === 'AUDIO') { currentDevice.mode = 'Stadium Stereo (全消噪巨幕环绕)'; currentDevice.intensity = 70; }
      } else if (type === 'TACTICAL') {
        modeName = '智能战术雷达联动 (Tactical Link)';
        brightness = 75;
        targetMsg = '雷达极速联动：灯管冷调呼吸闪。当禁区具有威胁度时，全屋高精预热。';
        if (device.type === 'LIGHT') { currentDevice.mode = 'Blue Radar (战术深蓝呼吸)'; currentDevice.intensity = 60; currentDevice.status = 'ON'; }
        if (device.type === 'TV') { currentDevice.mode = 'Tactical HUD overlay (战术数据悬浮版)'; }
      } else if (type === 'GOLD') {
        modeName = '大力神杯金辉 (Victory Gold)';
        brightness = 95;
        targetMsg = '高光触发！全域闪烁璀璨金色光辉，电视音量瞬时攀升！';
        if (device.type === 'LIGHT') { currentDevice.mode = 'Trophy Gold Alert (胜利金辉闪烁)'; currentDevice.intensity = 95; currentDevice.status = 'ON'; }
        if (device.type === 'AUDIO') { currentDevice.intensity = 85; }
      } else if (type === 'SLEEP') {
        modeName = '柔暖睡眠辅助 (Sleep Guard)';
        brightness = 15;
        targetMsg = '触发“闷战劝退防打扰”。空调微风调至26℃，音响降噪，光亮降低，进入小憩。';
        if (device.type === 'LIGHT') { currentDevice.mode = 'Sunset Glow (微弱落日金)'; currentDevice.intensity = 15; currentDevice.status = 'ON'; }
        if (device.type === 'AC') { currentDevice.intensity = 26; currentDevice.mode = 'Gentle Breeze (睡眠柔风)'; }
        if (device.type === 'AUDIO') { currentDevice.intensity = 10; currentDevice.status = 'OFF'; }
      }
      return currentDevice;
    });

    setIotDevices(updated);
    addLog(`IoT设备模式重构：[${modeName}]已生效。${targetMsg}`, 'IOT');
  };

  // Page D: Trigger Wakeup alarm mockup (Goal, Red Card, Dangerous Play, Boring Match)
  const triggerWakeUpPanel = (type: 'GOAL' | 'RED_CARD' | 'DANGER' | 'BORING', customTitle?: string, customDesc?: string) => {
    // Determine scores
    let homeS = selectedMatch.score.home;
    let awayS = selectedMatch.score.away;

    if (type === 'GOAL') {
      // Simulate random goal scorer
      if (Math.random() > 0.5) {
        homeS += 1;
      } else {
        awayS += 1;
      }
      // Update match score
      setMatches(prev => prev.map(m => {
        if (m.id === selectedMatch.id) {
          return { ...m, score: { home: homeS, away: awayS } };
        }
        return m;
      }));
      setSelectedMatch(prev => ({ ...prev, score: { home: homeS, away: awayS } }));
    }

    const title = customTitle || (type === 'GOAL' ? '⚽️ GOAL!!! 瞬时破晓唤醒' : type === 'RED_CARD' ? '🟥 突发红牌！战局颠覆警告' : '⚽️ 高能高危进阶警告');
    const description = customDesc || (type === 'GOAL' ? '禁区线上暴力折射，直接砸入网窝死角！极速IoT震颤开启。' : type === 'RED_CARD' ? '主裁判回看VAR，判定战术犯规，出示红牌驱逐出场！' : '前场定位球致命空袭！');

    setTriggerAlert({
      show: true,
      type,
      title,
      description,
      eventTime: selectedMatch.status === 'LIVE' ? selectedMatch.timeElapsed : '15:00 (模拟)',
      homeScore: homeS,
      awayScore: awayS
    });

    addLog(`「智能唤醒」机制触发！类型: ${type} - 联动全屋闪。`, 'ALARM');

    // Light flash triggers
    if (selectedMatch.alarmSettings?.iotSyncEnabled) {
      if (type === 'GOAL') {
        applyIotPreset('GOLD');
      } else if (type === 'BORING') {
        applyIotPreset('SLEEP');
      } else {
        applyIotPreset('TACTICAL');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 bg-pitch-pattern text-slate-100 font-sans relative overflow-hidden flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Absolute background matrix overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" id="grid-overlay"></div>
      
      {/* Scanline futuristic laser bars */}
      <div className="absolute inset-x-0 h-[2px] bg-emerald-500/30 opacity-40 animate-scanline pointer-events-none top-0"></div>

      {/* Header Bar */}
      <header className="relative z-10 border-b border-white/10 glass-panel shrink-0 px-4 py-3" id="main-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Title area with dynamic blink status */}
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Zap className="w-5 h-5 text-emerald-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950 animate-ping"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-950"></div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold tracking-wide text-lg text-white">世界杯数智战术观赛大厅</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold">v1.2 Live</span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Futuristic World Cup AI-Tactical Watchhub & IoT Ambient Orchestrator
              </p>
            </div>
          </div>

          {/* Current system status, simulated time elapsed */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 flex items-center space-x-2 font-mono">
              <Clock className="w-3.5 h-3.5 text-trophy-gold" />
              <span className="text-slate-300">北京时间 (GMT+8)</span>
              <span className="text-trophy-gold font-bold">2026-06-15 20:50</span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 flex items-center space-x-3">
              <span className="text-slate-400 text-[11px]">环境音效模拟:</span>
              <button 
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  addLog(soundEnabled ? '已关闭球场虚拟声级效果' : '已经加载世界杯现场沉浸式噪音声道 (喇叭声、呼喊声模拟音)', 'INFO');
                }}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded transition-all font-mono text-[10px] uppercase ${soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700'}`}
                title="模拟播放世界杯现场嘈杂战吼与氛围音效"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3 h-3 animate-bounce" />
                    <span>立体激扬 ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3 h-3" />
                    <span>静音模拟 OFF</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick reset data button */}
            <button 
              onClick={() => {
                setMatches(mockMatches);
                setSelectedMatch(mockMatches[0]);
                setIotDevices(defaultIoTDevices);
                addLog('重置全站战术矩阵至初始标准状态。', 'INFO');
              }}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition"
              title="复位所有比赛比分、联动设置及IoT设备"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 overflow-hidden relative z-10" id="dashboard-content">
        
        {/* Left Side: Interactive Tactical Area (Tab content inside) */}
        <div className="flex-1 flex flex-col gap-6" id="left-tactical-block">
          
          {/* Quick Realtime Simulator Dashboard - VERY IMPORTANT for Interactive Page D showcase */}
          <section className="glass-panel rounded-xl p-4 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden" id="simulation-panel">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display font-medium text-sm text-emerald-300 tracking-wider">实时战术模拟节点控制器 (Live Events Sim Panel)</h3>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                <span>实时雷达驱动:</span>
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isSimulating ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
                <button 
                  onClick={() => {
                    setIsSimulating(!isSimulating);
                    addLog(isSimulating ? '暂停实时威胁指数的脉冲震荡发生器' : '已恢复秒级实时威胁数据监控系统脉冲', 'INFO');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {isSimulating ? '暂停' : '启动'}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              因赛事属于未来预定，您可通过下方按钮<strong className="text-emerald-400">手动注入比赛核心冲突突发节点</strong>，用以实时测试并极速呼出<strong className="text-emerald-400">「Page D 高能唤醒联动浮窗/全屏闹钟」</strong>：
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                onClick={() => triggerWakeUpPanel('GOAL')}
                className="flex items-center justify-center space-x-2 bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900 text-emerald-300 p-2 rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-transform active:scale-95"
              >
                <span>⚽️ 注入进球事件</span>
              </button>
              <button 
                onClick={() => triggerWakeUpPanel('RED_CARD')}
                className="flex items-center justify-center space-x-2 bg-red-950/80 border border-red-500/40 hover:bg-red-900 text-red-300 p-2 rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-transform active:scale-95"
              >
                <span>🟥 突发红牌事件</span>
              </button>
              <button 
                onClick={() => triggerWakeUpPanel('DANGER', '🔥 实时致命威胁临界 (100%危急)', '阿根廷攻势撕裂。右肋任意球直接射向死角，引发全屋红色探照音浪震颤！')}
                className="flex items-center justify-center space-x-2 bg-blue-950/80 border border-blue-500/40 hover:bg-blue-900 text-blue-300 p-2 rounded-lg text-xs font-semibold transition-transform active:scale-95"
              >
                <span>⚡️ 产生单刀突袭 (95+%)</span>
              </button>
              <button 
                onClick={() => triggerWakeUpPanel('BORING', '💤 [闷战警报] 触发睡眠辅助', '比赛局势陷入深度胶着拉锯，20分钟无打门，为您切换辅助暗光。并备好无剧透3分钟极锦占位符。')}
                className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-lg text-xs font-semibold transition-transform active:scale-95"
              >
                <span>💤 闷局劝退/退避模式</span>
              </button>
            </div>
          </section>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-white/10" id="subtabs">
            <button 
              onClick={() => setActiveTab('hall')}
              className={`flex items-center space-x-2 pb-3 px-4 font-display font-medium text-xs tracking-wider uppercase border-b-2 transition-all ${activeTab === 'hall' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Award className="w-4 h-4" />
              <span>Page A: 战术观赛大厅</span>
            </button>
            <button 
              onClick={() => setActiveTab('iot')}
              className={`flex items-center space-x-2 pb-3 px-4 font-display font-medium text-xs tracking-wider uppercase border-b-2 transition-all ${activeTab === 'iot' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Tv className="w-4 h-4" />
              <span>Page E: IoT 全屋联动控制</span>
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 pb-3 px-4 font-display font-medium text-xs tracking-wider uppercase border-b-2 transition-all ${activeTab === 'logs' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-4 h-4" />
              <span>数智流底座控制台 ({systemLogs.length})</span>
            </button>
          </div>

          {/* Tab Match Hall */}
          {activeTab === 'hall' && (
            <div className="flex flex-col gap-4 animate-fadeIn" id="page-a-content">
              
              {/* Match list grids */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {matches.map((match) => {
                  const isCurSelected = match.id === selectedMatch.id;
                  const isAlarmArmed = match.alarmSettings?.enabled;
                  return (
                    <div 
                      key={match.id}
                      onClick={() => setSelectedMatch(match)}
                      className={`cursor-pointer rounded-xl transition-all relative overflow-hidden flex flex-col ${isCurSelected ? 'bg-slate-900 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-slate-900/50 border border-white/5 hover:border-white/15'}`}
                      id={`match-card-${match.id}`}
                    >
                      {/* Top bar with match group and dynamic alarm armed badge */}
                      <div className="px-3 py-2 bg-black/40 border-b border-white/5 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">{match.group}</span>
                        <div className="flex items-center space-x-1.5">
                          {isAlarmArmed && (
                            <span className="inline-flex items-center text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded">
                              <Bell className="w-2.5 h-2.5 mr-0.5 animate-bounce" />
                              已装载
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${match.status === 'LIVE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : match.status === 'SCHEDULED' ? 'bg-neutral-800 text-slate-300' : 'bg-slate-800 text-slate-400'}`}>
                            {match.status === 'LIVE' ? '🏟️ LIVE' : match.status === 'SCHEDULED' ? '⏰ 未开赛' : '✅ 已完赛'}
                          </span>
                        </div>
                      </div>

                      {/* Main squad showdown */}
                      <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
                        <div className="flex items-center justify-around w-full mb-3">
                          {/* Home Team */}
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-3xl mb-1 filter drop-shadow-sm">{match.homeTeam.flag}</span>
                            <span className="text-xs font-bold text-white max-w-[80px] truncate">{match.homeTeam.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1 font-mono">S:{match.homeTeam.strength}</span>
                          </div>

                          {/* Versus or Score */}
                          <div className="px-2 flex flex-col items-center justify-center">
                            {match.status === 'LIVE' || match.status === 'FINISHED' ? (
                              <div className="text-xl font-bold font-mono tracking-tight text-emerald-400">
                                {match.score.home} - {match.score.away}
                              </div>
                            ) : (
                              <div className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">VS</div>
                            )}
                            
                            {match.status === 'LIVE' && (
                              <span className="text-[10px] text-emerald-400 font-mono mt-1 animate-pulse bg-emerald-500/10 px-1 rounded">
                                {match.timeElapsed}
                              </span>
                            )}
                          </div>

                          {/* Away Team */}
                          <div className="flex flex-col items-center flex-1">
                            <span className="text-3xl mb-1 filter drop-shadow-sm">{match.awayTeam.flag}</span>
                            <span className="text-xs font-bold text-white max-w-[80px] truncate">{match.awayTeam.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1 font-mono">S:{match.awayTeam.strength}</span>
                          </div>
                        </div>

                        {/* Bottom indices preview */}
                        {match.status === 'LIVE' && (
                          <div className="w-full bg-slate-950/60 rounded-lg p-2 flex items-center justify-between text-[11px] font-mono mt-1 border border-white/5">
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] text-slate-400 scale-95 origin-left">瞬时威胁度</span>
                              <span className="text-red-400 font-bold">{match.threatIndex}%</span>
                            </div>
                            <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-red-500 h-full" style={{ width: `${match.threatIndex}%` }}></div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-slate-400 scale-95 origin-right">精彩指数</span>
                              <span className="text-emerald-400 font-bold">{match.excitementIndex}/100</span>
                            </div>
                          </div>
                        )}

                        {match.status === 'SCHEDULED' && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-1 mt-1">
                            暂无战况。可提前配置精算闹钟。
                          </p>
                        )}

                        {match.status === 'FINISHED' && (
                          <div className="w-full bg-slate-950/60 rounded-lg p-1.5 text-center text-[10px] text-slate-400 font-mono mt-1 border border-white/5">
                            对局已终 终盘精彩率: {match.excitementIndex}%
                          </div>
                        )}
                      </div>

                      {/* Action buttons footer */}
                      <div className="px-3 py-2 bg-white/[0.02] border-t border-white/5 flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMatch(match);
                            handleOpenSettings(match);
                          }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 py-1 px-2 rounded text-[11px] flex items-center justify-center space-x-1 border border-white/5 transition"
                        >
                          <Settings className="w-3 h-3 text-trophy-gold" />
                          <span>战术闹钟配置</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Current Match Showcase Detailed Dashboard */}
              <div className="glass-panel rounded-xl p-5 border border-white/10" id="match-central-display">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-4 mb-4 gap-3">
                  <div>
                    <h4 className="text-sm font-semibold tracking-wide text-slate-300 font-mono uppercase">
                      🖥️ 正在监视对局 (Curveillance Display)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      双击上方对阵卡，可以无缝切换至其它赛事智能看盘
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenSettings(selectedMatch)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${selectedMatch.alarmSettings?.enabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700'}`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>
                        闹钟: {selectedMatch.alarmSettings?.enabled ? `已启用 (${selectedMatch.alarmSettings.mode === 'AI_TACTICAL' ? 'AI战术' : '全高能触发'})` : '未装载'}
                      </span>
                    </button>
                    
                    {selectedMatch.status === 'LIVE' && (
                      <div className="flex items-center space-x-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-mono font-bold animate-pulse">
                        <Activity className="w-3.5 h-3.5" />
                        <span>毫秒级数据流更新中</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Showdown central visualization banner */}
                <div className="bg-slate-950/60 rounded-xl p-6 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
                  
                  <div className="flex items-center justify-center gap-12 md:gap-24 relative z-10 w-full">
                    {/* Home Side */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className="text-5xl md:text-6s mb-2 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transform hover:scale-110 transition-transform">
                        {selectedMatch.homeTeam.flag}
                      </div>
                      <h2 className="text-base md:text-lg font-bold text-white tracking-wide">{selectedMatch.homeTeam.name}</h2>
                      <span className="text-[11px] bg-slate-800/80 text-emerald-400 px-2 py-0.5 rounded-full font-mono mt-2 border border-emerald-500/20">
                        战术面: {selectedMatch.homeTeam.attackStyle.split(' ')[0]}
                      </span>
                    </div>

                    {/* Numeric Score and Time elapsed */}
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-mono mb-2">
                        {selectedMatch.group}
                      </div>
                      
                      <div className="text-4xl md:text-5xl font-mono font-bold tracking-wider text-white">
                        {selectedMatch.status === 'LIVE' || selectedMatch.status === 'FINISHED' ? (
                          <>
                            <span className="text-emerald-400 glow-text-green">{selectedMatch.score.home}</span>
                            <span className="text-slate-500 mx-2">:</span>
                            <span className="text-emerald-400 glow-text-green">{selectedMatch.score.away}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-lg uppercase tracking-widest font-display font-light">即将开打</span>
                        )}
                      </div>

                      {selectedMatch.status === 'LIVE' ? (
                        <div className="flex items-center space-x-2.5 mt-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                          <span className="text-sm font-mono text-slate-300">{selectedMatch.timeElapsed}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono mt-3">2026-06-15 23:00 准时开球</span>
                      )}
                    </div>

                    {/* Away Side */}
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className="text-5xl md:text-6s mb-2 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transform hover:scale-110 transition-transform">
                        {selectedMatch.awayTeam.flag}
                      </div>
                      <h2 className="text-base md:text-lg font-bold text-white tracking-wide">{selectedMatch.awayTeam.name}</h2>
                      <span className="text-[11px] bg-slate-800/80 text-emerald-400 px-2 py-0.5 rounded-full font-mono mt-2 border border-emerald-500/20">
                        战术面: {selectedMatch.awayTeam.attackStyle.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Boring Match Safeguard Auxiliary Advice Block integrated right below the score */}
                  {prediction && prediction.boringMatchSafeguard.isBoringPossible && (
                    <div className="mt-6 w-full bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start space-x-3 transition-colors">
                      <div className="p-1 rounded bg-amber-500/10 text-amber-400 shrink-0">
                        <Moon className="w-5 h-5 text-amber-400 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-300">半场闷战退避预警已就绪 (Dull Match Sleep Aux Assist)</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 font-mono px-1 border border-amber-500/20 rounded">AI精算判定</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          对局局势较沉闷({prediction.boringMatchSafeguard.reason})。若未开启高发，将柔和过滤警报不予打扰。可静享<span className="text-amber-400 font-bold">“无剧透3分钟极高能高精集锦”</span>。
                        </p>
                        <div className="mt-3 flex items-center space-x-3">
                          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                            <Video className="w-3.5 h-3.5 text-emerald-400" />
                            <span>集锦预览占位符: <span className="text-emerald-400 font-mono font-semibold">[HIGHTLIGHT_PKG_3MIN.mp4]</span></span>
                          </div>
                          <button 
                            onClick={() => {
                              addLog('正在生成不暴露最终比赛结果的无剧透战术多帧渲染镜头包预览...', 'INFO');
                              alert('已加载【无剧透 3 分钟极清高光点录镜头占位符】，本段视频采用数字隐藏技术，可保护用户深度免除半夜看球高血压，留作醒后极速复盘复盘！');
                            }}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 font-semibold"
                          >
                            提前模拟锁定
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
              
            </div>
          )}

          {/* Tab IoT Control Panel (Page E) */}
          {activeTab === 'iot' && (
            <div className="flex flex-col gap-5 animate-fadeIn" id="page-e-content">
              
              <div className="glass-panel rounded-xl p-5 border border-white/10" id="iot-panel-card">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-3 mb-4 gap-2">
                  <div>
                    <h3 className="font-display font-medium text-base text-white">Page E: IoT 全屋数智观赛联动控制面板</h3>
                    <p className="text-xs text-slate-400 mt-0.5">当赛事出现进球、致命定位球或处于沉闷闷局时，智能协调全屋家电，打造高燃场景</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">一键预设场景极速联动:</span>
                    <div className="flex flex-wrap gap-1">
                      <button 
                        onClick={() => applyIotPreset('CINEMATIC')}
                        className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[11px] px-2.5 py-1 rounded-md border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.1)]"
                      >
                        绿茵星空
                      </button>
                      <button 
                        onClick={() => applyIotPreset('GOLD')}
                        className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-[11px] px-2.5 py-1 rounded-md border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                      >
                        高光金辉
                      </button>
                      <button 
                        onClick={() => applyIotPreset('SLEEP')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded-md border border-white/10"
                      >
                        静柔睡眠
                      </button>
                    </div>
                  </div>
                </div>

                {/* IoT Devices list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {iotDevices.map((device) => {
                    const isLight = device.type === 'LIGHT';
                    const isTV = device.type === 'TV';
                    const isAC = device.type === 'AC';
                    const isAudio = device.type === 'AUDIO';

                    return (
                      <div 
                        key={device.id} 
                        className={`p-4 rounded-xl border transition-all ${device.status === 'ON' ? 'bg-slate-900/80 border-emerald-500/20' : 'bg-slate-950/40 border-white/5 opacity-60'}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-lg ${device.status === 'ON' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                              {isLight && <Lightbulb className="w-4 h-4" />}
                              {isTV && <Tv className="w-4 h-4" />}
                              {isAC && <Smartphone className="w-4 h-4" />}
                              {isAudio && <Volume2 className="w-4 h-4" />}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-200">{device.name}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                模式: <strong className="text-emerald-400">{device.mode}</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const updated = iotDevices.map(d => {
                                if (d.id === device.id) {
                                  const ns = d.status === 'ON' ? 'OFF' : 'ON';
                                  addLog(`[IoT] 切换设备「${d.name}」状态为 ${ns}`, 'IOT');
                                  return { ...d, status: ns };
                                }
                                return d;
                              });
                              setIotDevices(updated);
                            }}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${device.status === 'ON' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}
                          >
                            {device.status === 'ON' ? '● 在线运作' : '○ 已休眠'}
                          </button>
                        </div>

                        {/* Slider bar mockup */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>{isAC ? '目标温度' : '输出强度'}</span>
                            <span className="text-emerald-400 font-bold">{device.intensity}{isAC ? ' ℃' : '%'}</span>
                          </div>
                          
                          <input 
                            type="range" 
                            min={isAC ? "16" : "0"} 
                            max={isAC ? "30" : "100"} 
                            value={device.intensity}
                            disabled={device.status === 'OFF'}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const updated = iotDevices.map(d => {
                                if (d.id === device.id) {
                                  return { ...d, intensity: val };
                                }
                                return d;
                              });
                              setIotDevices(updated);
                            }}
                            className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-30"
                          />
                        </div>

                        {/* Technical connection details */}
                        <div className="mt-3 bg-black/40 rounded p-1.5 text-[9px] text-slate-500 font-mono flex justify-between">
                          <span>端到端延时: &lt;2.1ms</span>
                          <span>通道号: IoT_CH_{device.id.toUpperCase()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-xs text-slate-300 flex items-center space-x-2 justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>系统已连接：观赛大厅正将实时赛事威胁度与睡眠事件直接推送至全屋联动网关。</span>
                  </div>
                  <button 
                    onClick={() => {
                      applyIotPreset('CINEMATIC');
                      alert('成功一键将客厅幻彩氛围灯条、超大激光电视、全域智慧微风空调调至【绿茵星星氛围】，为您奉上沉浸高高对比度观赛体验！');
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-[11px] px-3 py-1 rounded transition-colors"
                  >
                    战术试运转测试
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* System Dynamic Logs Console */}
          {activeTab === 'logs' && (
            <div className="flex flex-col gap-3 animate-fadeIn" id="system-logs-dashboard">
              <div className="glass-panel rounded-xl p-4 border border-white/10 font-mono text-xs flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-white font-bold uppercase tracking-wider text-xs">毫秒级数智流总线日志级调试 (Real-time IoT & Alarm Debug Logs)</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSystemLogs([{ id: '1', timestamp: 'Reset', message: '日志已由管理员清除刷新。', type: 'INFO' }]);
                    }}
                    className="text-[10px] bg-slate-800 text-slate-400 hover:bg-slate-700 px-2 py-0.5 rounded transition"
                  >
                    清空控制台
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[350px] space-y-1.5 pr-2 custom-scrollbar">
                  {systemLogs.map(log => {
                    let color = 'text-slate-300';
                    if (log.type === 'TRIGGER') color = 'text-amber-400 font-semibold';
                    if (log.type === 'ALARM') color = 'text-rose-400 font-bold';
                    if (log.type === 'IOT') color = 'text-cyan-300';
                    return (
                      <div key={log.id} className="flex items-start space-x-2 py-0.5 border-b border-white/[0.02] hover:bg-white/[0.01]">
                        <span className="text-[10px] text-slate-500 shrink-0">{log.timestamp}</span>
                        <span className={`text-[10px] px-1 py-0.1 select-none rounded scale-90 ${
                          log.type === 'TRIGGER' ? 'bg-amber-500/10 text-amber-400' :
                          log.type === 'ALARM' ? 'bg-rose-500/10 text-rose-400' :
                          log.type === 'IOT' ? 'bg-cyan-500/10 text-cyan-400' :
                          'bg-indigo-500/10 text-blue-400'
                        } shrink-0`}>
                          [{log.type}]
                        </span>
                        <span className={`text-[11px] leading-relaxed break-all ${color}`}>{log.message}</span>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-[10px] text-slate-500 border-t border-white/5 pt-2 text-right">
                  System logs trace dynamic threat thresholds, microservice actions, and live score states.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Page B - AI Predictions & Deep Stats Detail */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6" id="right-sidebar">
          
          {/* Page B: Dynamic Threat Monitor & Excitement Index Graph */}
          <section className="glass-panel rounded-xl p-5 border border-white/10 flex flex-col" id="threat-indicator-card">
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="font-display font-medium text-sm text-white tracking-wider">智能数智威胁度与精彩指数</h3>
              </div>
              <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                实时解卦
              </span>
            </div>

            {/* Simulated Live SVG Graph display of danger elements */}
            <div className="mb-4 bg-slate-950/70 rounded-lg p-3 border border-white/5 relative overflow-hidden flex flex-col">
              <div className="absolute top-2 right-2 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded text-[9px] font-mono text-red-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                <span>雷达图谱 (Live wave)</span>
              </div>

              {/* Dynamic threat numerical view */}
              <div className="mb-3">
                <span className="text-[10px] uppercase text-slate-400 font-mono tracking-wider block">实时前场威胁系数:</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-mono font-bold text-red-400 glow-text-emerald-400">
                    {selectedMatch.status === 'LIVE' ? currentThreat : '0'}%
                  </span>
                  <span className="text-xs text-slate-400">
                    {selectedMatch.status === 'LIVE' 
                      ? (currentThreat > 75 ? '🔥 禁区极高危压迫' : currentThreat > 45 ? '⚡ 阵地缠斗对峙' : '🛡️ 中后场控盘') 
                      : '已离线 / 未开赛'}
                  </span>
                </div>
              </div>

              {/* SVG Line chart simulation representing dynamic threat history */}
              <div className="h-24 w-full flex items-end justify-between gap-1.5 px-1 relative">
                {/* SVG Line display on top of column backgrounds */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <div className="w-full h-full bg-[radial-gradient(#10b981_1px,transparent_1px)] bg-[size:10px_10px]"></div>
                </div>

                {selectedMatch.status === 'LIVE' ? threatHistory.map((val, idx) => {
                  const barHeight = val * 0.8; // scaling factor
                  const isHigh = val > 75;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${isHigh ? 'bg-gradient-to-t from-red-600 to-amber-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-t from-emerald-600 to-teal-400'}`} 
                        style={{ height: `${barHeight}%` }}
                      ></div>
                      <span className="absolute -top-5 text-[8px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-1 rounded">
                        {val}%
                      </span>
                    </div>
                  );
                }) : (
                  <div className="w-full flex items-center justify-center text-xs text-slate-500 italic h-full">
                    当前对阵无活跃热图数据
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1 border-t border-white/5 pt-1">
                <span>前15分钟</span>
                <span>当下节点</span>
              </div>
            </div>

            {/* Real-time Game stats breakdown with gorgeous graphics */}
            <div className="space-y-3">
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">精彩指数 (Entertainment Level):</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {selectedMatch.status === 'LIVE' ? selectedMatch.excitementIndex : selectedMatch.status === 'FINISHED' ? selectedMatch.excitementIndex : 'AI待推演'}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full" style={{ width: `${selectedMatch.status === 'LIVE' || selectedMatch.status === 'FINISHED' ? selectedMatch.excitementIndex : 0}%` }}></div>
                </div>
              </div>

              {/* Winner probability generated by Server API */}
              <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                <span className="text-xs text-slate-300 font-mono tracking-wider block mb-2">⚽️ AI 动态胜负格局预测大盘:</span>
                
                {loadingPredict ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <Activity className="w-5 h-5 text-emerald-400 animate-spin" />
                    <span className="text-[11px] text-slate-400">正在生成深度战术概率分布...</span>
                  </div>
                ) : prediction ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>{selectedMatch.homeTeam.name} 胜: {prediction.winnerProbability.home}%</span>
                      <span>平局: {prediction.winnerProbability.draw}%</span>
                      <span>{selectedMatch.awayTeam.name} 胜: {prediction.winnerProbability.away}%</span>
                    </div>
                    
                    {/* Visual Tri-color probability horizontal bar */}
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500" style={{ width: `${prediction.winnerProbability.home}%` }} title="主胜"></div>
                      <div className="bg-slate-500" style={{ width: `${prediction.winnerProbability.draw}%` }} title="平局"></div>
                      <div className="bg-blue-500" style={{ width: `${prediction.winnerProbability.away}%` }} title="客胜"></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-2">
                    无法解析预测。可检查服务端 API 运行环境
                  </div>
                )}
              </div>
            </div>

          </section>

          {/* Tactical Detailed Breakdown Card from Gemini API */}
          <section className="glass-panel rounded-xl p-5 border border-white/10" id="ai-tactics-breakdown-card">
            
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-trophy-gold" />
                <h3 className="font-display font-medium text-sm text-slate-200 tracking-wider">
                  Page B: AI 智能战术指数与硬核复盘
                </h3>
              </div>
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1 border border-emerald-500/20 rounded font-mono font-semibold">
                教练视角
              </span>
            </div>

            {loadingPredict ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-xs text-slate-400 italic">战术参谋部正在对盘口阵型进行万次推算演练...</p>
              </div>
            ) : prediction ? (
              <div className="space-y-4 text-xs">
                {/* AI Review text */}
                <p className="text-slate-200 leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5 whitespace-pre-line">
                  {prediction.tacticalAnalysis}
                </p>

                {/* Key Watchlist players */}
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                  <span className="text-[11px] text-trophy-gold block font-semibold mb-2 uppercase tracking-wider">
                    🎖️ 本局关键战术核能球员 (Key Tactical Stars):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {prediction.keyPlayers.map((player, idx) => (
                      <span 
                        key={idx} 
                        className="bg-emerald-500/10 text-emerald-300 text-[11px] px-2 py-1 rounded border border-emerald-500/20 font-mono tracking-tight"
                      >
                        ⚡️ {player}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    AI提示: 此二人在转换快攻和反越位中被赋予极高战术机动权，当其持球时，页面威胁度极易瞬时飙升！
                  </p>
                </div>

                {/* Boring Safeguard visual advice flag inside Right Column if prediction was loaded */}
                <div className="p-3 bg-neutral-900 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                    <span className="text-slate-300 font-bold">闷战劝退警示级</span>
                    <span className={prediction.boringMatchSafeguard.isBoringPossible ? "text-amber-400" : "text-slate-400"}>
                      {prediction.boringMatchSafeguard.isBoringPossible ? "高风险 (Dull Possible)" : "低风险 (Safe)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    {prediction.boringMatchSafeguard.actionAdvice}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">
                未拉取到智能推算。
              </p>
            )}

          </section>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/10 p-4 shrink-0 bg-neutral-950 flex items-center justify-center text-xs text-slate-500 font-mono">
        <span>© 2026 世界杯数智战术观赛大厅版件 · 基于 AI Studio 全极速多路流联动</span>
      </footer>

      {/* ========================================= */}
      {/* PAGE C: SMART TACTICAL ALARM SETUP MODAL (智能战术闹钟配置页) */}
      {/* ========================================= */}
      {isSettingsOpen && editingSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn" id="page-c-alarm-modal">
          <div className="w-full max-w-lg bg-slate-900 border border-amber-500/35 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-slate-950 to-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-text-gold">
                  <Bell className="w-6 h-6 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Page C: 智能数智战术闹钟精控配置</h3>
                  <p className="text-xs text-amber-500/80 font-mono">
                    装载至: {selectedMatch.homeTeam.name} vs {selectedMatch.awayTeam.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-sm">
              
              {/* Arm switch */}
              <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="font-bold text-white block">装载本场战术闹钟防打扰系统</span>
                  <span className="text-xs text-slate-400">若关闭，系统将处于传统静配状态，不进行实时IoT触发和破晓唤醒。</span>
                </div>
                <button
                  onClick={() => setEditingSettings({ ...editingSettings, enabled: !editingSettings.enabled })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${editingSettings.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                >
                  {editingSettings.enabled ? '● 已部署 ARMED' : '○ 已搁置 DESELECTED'}
                </button>
              </div>

              {editingSettings.enabled && (
                <>
                  {/* Wakeup Mode selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider font-mono">
                      ⚙️ 选择您的专属唤醒模式 (Wake-up Modes):
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      
                      {/* AI Tactical Mode */}
                      <div 
                        onClick={() => setEditingSettings({ ...editingSettings, mode: 'AI_TACTICAL' })}
                        className={`p-3.5 rounded-xl cursor-pointer border transition-all ${editingSettings.mode === 'AI_TACTICAL' ? 'bg-emerald-950/60 border-emerald-500' : 'bg-black/30 border-white/5 hover:bg-black/50'}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-3 h-3 rounded-full ${editingSettings.mode === 'AI_TACTICAL' ? 'bg-emerald-400 animate-ping' : 'bg-slate-700'}`}></span>
                          <span className="font-bold text-slate-200">AI 战术自适应精算唤醒 (AI Tactical Smart)</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          仅在场上出现高威胁进攻、任意球攻门、威胁指数升至您设定的阈值时，才提前发声闪烁唤醒。其余平淡攻守或闷局时让您深度熟睡。
                        </p>
                      </div>

                      {/* Hardcore DND */}
                      <div 
                        onClick={() => setEditingSettings({ ...editingSettings, mode: 'HARDCORE_DND' })}
                        className={`p-3.5 rounded-xl cursor-pointer border transition-all ${editingSettings.mode === 'HARDCORE_DND' ? 'bg-amber-950/50 border-amber-500' : 'bg-black/30 border-white/5 hover:bg-black/50'}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-3 h-3 rounded-full ${editingSettings.mode === 'HARDCORE_DND' ? 'bg-amber-400' : 'bg-slate-700'}`}></span>
                          <span className="font-bold text-slate-200">硬核深度勿扰模式 (Tactical Snoring)</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          彻底杜绝中途无用提示。直到 85 分钟比分仍然平局，或者半场前两队突然爆发极佳机会时极速高能唤醒。闷局时不打扰、零辐射。
                        </p>
                      </div>

                      {/* High-Energy Triggers */}
                      <div 
                        onClick={() => setEditingSettings({ ...editingSettings, mode: 'HIGH_ENERGY' })}
                        className={`p-3.5 rounded-xl cursor-pointer border transition-all ${editingSettings.mode === 'HIGH_ENERGY' ? 'bg-blue-950/60 border-blue-500' : 'bg-black/30 border-white/5 hover:bg-black/50'}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-3 h-3 rounded-full ${editingSettings.mode === 'HIGH_ENERGY' ? 'bg-blue-400' : 'bg-slate-700'}`}></span>
                          <span className="font-bold text-slate-200">高能触发狂啸唤醒 (Full Action)</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          强力对攻模式！凡是有进球、点球、红黄牌、VAR裁决、禁区打门等，全数激活IoT全屋绿茵光效，同步高音量呐喊音效。适合硬核不落下一秒。
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Threat Threshold Slider for AI_TACTICAL mode */}
                  {editingSettings.mode === 'AI_TACTICAL' && (
                    <div className="bg-black/50 rounded-xl p-4 border border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-300 font-bold">设定 AI 触发唤醒危险度阀值:</span>
                        <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{editingSettings.threatThreshold}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="95" 
                        value={editingSettings.threatThreshold}
                        onChange={(e) => setEditingSettings({ ...editingSettings, threatThreshold: parseInt(e.target.value) })}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                      <span className="text-[10px] text-slate-400 leading-normal block">
                        说明: 系统将通过内置多路战术流解算每次禁区传切。当攻击流威胁等级高于该阈值时，自动启动联动呼入系统。推荐设为 <strong className="text-emerald-400">75%</strong>。
                      </span>
                    </div>
                  )}

                  {/* Multi-Trigger configurations for high energy */}
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-slate-300 block mb-2 font-mono uppercase tracking-wider">
                      🎯 事件性极速抓取源设定 (Instant Trigger Sources):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center space-x-2 bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-750">
                        <input 
                          type="checkbox" 
                          checked={editingSettings.highEnergyTriggers.goals} 
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            highEnergyTriggers: { ...editingSettings.highEnergyTriggers, goals: e.target.checked }
                          })}
                          className="accent-emerald-500"
                        />
                        <span className="text-xs text-slate-200">⚽️ 有进球发生</span>
                      </label>

                      <label className="flex items-center space-x-2 bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-750">
                        <input 
                          type="checkbox" 
                          checked={editingSettings.highEnergyTriggers.redCard} 
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            highEnergyTriggers: { ...editingSettings.highEnergyTriggers, redCard: e.target.checked }
                          })}
                          className="accent-emerald-500"
                        />
                        <span className="text-xs text-slate-200">🟥 突发红黄牌</span>
                      </label>

                      <label className="flex items-center space-x-2 bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-750">
                        <input 
                          type="checkbox" 
                          checked={editingSettings.highEnergyTriggers.penalty} 
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            highEnergyTriggers: { ...editingSettings.highEnergyTriggers, penalty: e.target.checked }
                          })}
                          className="accent-emerald-500"
                        />
                        <span className="text-xs text-slate-200">🎯 判罚点球</span>
                      </label>

                      <label className="flex items-center space-x-2 bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-750">
                        <input 
                          type="checkbox" 
                          checked={editingSettings.highEnergyTriggers.varDecisions} 
                          onChange={(e) => setEditingSettings({
                            ...editingSettings,
                            highEnergyTriggers: { ...editingSettings.highEnergyTriggers, varDecisions: e.target.checked }
                          })}
                          className="accent-emerald-500"
                        />
                        <span className="text-xs text-slate-200">📺 VAR介入审查</span>
                      </label>
                    </div>
                  </div>

                  {/* Audio tone selector & Volume */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-mono block">唤醒音感铃声 (Ringtone Aura)</label>
                      <select 
                        value={editingSettings.ringtone}
                        onChange={(e) => setEditingSettings({ ...editingSettings, ringtone: e.target.value })}
                        className="w-full bg-slate-800 border border-white/10 rounded-lg p-2 text-xs text-slate-200"
                      >
                        <option value="高能战区警报 (Zone Alarm)">🚨 高能战区警报 (Zone Alarm)</option>
                        <option value="AI数智唤醒 (Smart Wave)">⚡ AI数智音浪 (Smart Wave)</option>
                        <option value="硬核雷鸣唤醒 (Thunder)">⛈️ 硬核雷鸣唤醒 (Thunder)</option>
                        <option value="无剧透舒缓静音 (Quiet Pure)">💤 无剧透自然舒缓 (Quiet Pure)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                        <span>音响震撼功率:</span>
                        <span className="text-emerald-400 font-bold">{editingSettings.vVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={editingSettings.vVolume}
                        onChange={(e) => setEditingSettings({ ...editingSettings, vVolume: parseInt(e.target.value) })}
                        className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer accent-emerald-400 mt-2"
                      />
                    </div>
                  </div>

                  {/* IoT Linkage Switch */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="iotSyncCheck"
                        checked={editingSettings.iotSyncEnabled} 
                        onChange={(e) => setEditingSettings({ ...editingSettings, iotSyncEnabled: e.target.checked })}
                        className="accent-emerald-500 w-4 h-4 rounded"
                      />
                      <label htmlFor="iotSyncCheck" className="text-xs cursor-pointer text-slate-300">
                        <strong>无防真联动 Page E 全屋 IoT 同步</strong>
                        <span className="block text-[10px] text-slate-400">进球或高危时，氛围灯闪烁并自调节空调/激光电视画面模式</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-end space-x-2">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs"
              >
                取消
              </button>
              <button 
                onClick={handleSaveSettings}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-lg text-xs shadow-lg shadow-emerald-500/20"
              >
                保存智能装载配置
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* PAGE D: REALTIME HIGH-ENERGY TRIGGER POPUP / ALERT (高能触发唤醒浮窗/全屏) */}
      {/* ========================================= */}
      {triggerAlert?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn" id="page-d-wakeup-overlay">
          
          {/* Animated pulsing decorative red / gold light ring depending on trigger theme */}
          <div className={`absolute inset-0 max-w-lg m-auto rounded-full blur-3xl opacity-20 pointer-events-none ${
            triggerAlert.type === 'GOAL' ? 'bg-amber-500 animate-pulse-glow' :
            triggerAlert.type === 'RED_CARD' ? 'bg-red-600 animate-pulse-glow' :
            triggerAlert.type === 'BORING' ? 'bg-indigo-600 animate-pulse-glow' : 'bg-emerald-500 animate-pulse-glow'
          }`}></div>

          <div className={`relative w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl ${
            triggerAlert.type === 'GOAL' ? 'glow-border-green border-2 bg-gradient-to-br from-neutral-900 to-amber-950/80' :
            triggerAlert.type === 'RED_CARD' ? 'glow-border-red border-2 bg-gradient-to-br from-neutral-900 to-red-950/80' :
            'border border-slate-700 bg-neutral-900'
          }`}>
            
            {/* Holographic scanning decoration */}
            <div className="absolute inset-0 bg-pitch-pattern opacity-10 pointer-events-none"></div>

            {/* Red Card/Goal dynamic large logo */}
            <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center relative z-10">
              
              <div className="mb-4">
                {triggerAlert.type === 'GOAL' && (
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400">
                    <Award className="w-10 h-10 text-amber-400 animate-bounce" />
                    <span className="absolute -top-1 -right-1 text-2xl">⚽️</span>
                  </div>
                )}

                {triggerAlert.type === 'RED_CARD' && (
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/40 text-red-500">
                    <ShieldAlert className="w-10 h-10 text-red-500 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                )}

                {triggerAlert.type === 'DANGER' && (
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
                    <Zap className="w-10 h-10 text-emerald-400 animate-pulse" />
                  </div>
                )}

                {triggerAlert.type === 'BORING' && (
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border border-white/10 text-slate-400">
                    <Moon className="w-10 h-10 text-slate-300 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Dynamic notification labels */}
              <span className="text-[10px] bg-white/10 text-slate-300 border border-white/20 px-3 py-1 rounded-full font-mono font-bold tracking-widest uppercase mb-2">
                数智超高速全通唤醒通道 (Latency: &lt;1.8s)
              </span>

              <h2 className="text-xl md:text-3xl font-display font-extrabold text-white tracking-tight uppercase leading-tight mb-2">
                {triggerAlert.title}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-sm mb-6 bg-black/40 p-3 rounded-xl border border-white/5">
                {triggerAlert.description}
              </p>

              {/* Instant score HUD */}
              <div className="bg-slate-950/80 rounded-2xl border border-white/5 p-4 w-full flex items-center justify-around mb-6 relative">
                <div className="flex flex-col items-center">
                  <span className="text-3xl filter drop-shadow">{selectedMatch.homeTeam.flag}</span>
                  <span className="text-xs text-slate-200 mt-1 font-bold">{selectedMatch.homeTeam.name}</span>
                </div>

                <div className="flex flex-col items-center justify-center px-4">
                  <div className="text-2xl md:text-4xl font-mono font-extrabold tracking-widest text-emerald-400 ml-1">
                    {triggerAlert.homeScore} <span className="text-slate-500">:</span> {triggerAlert.awayScore}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 uppercase bg-white/5 px-2 py-0.5 rounded">
                    比赛时间: {triggerAlert.eventTime}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-3xl filter drop-shadow">{selectedMatch.awayTeam.flag}</span>
                  <span className="text-xs text-slate-200 mt-1 font-bold">{selectedMatch.awayTeam.name}</span>
                </div>
              </div>

              {/* Active IoT Sync states representation on wakeup */}
              {selectedMatch.alarmSettings?.iotSyncEnabled && (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-left text-xs mb-6 flex items-start space-x-2.5">
                  <Cpu className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-400 block font-mono">Page E 全屋 IoT 微毫秒自动联动状态:</span>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside mt-1">
                      <li>氛围灯带已转为 <strong>金色闪烁/战术激昂</strong>，空调流速加快。</li>
                      <li>
                        {triggerAlert.type === 'GOAL' && "音箱音量拉至85%爆裂全景环境，还原球场看台掀翻之势！"}
                        {triggerAlert.type === 'RED_CARD' && "灯条红闪高频警用脉冲频闪，确保唤醒！"}
                        {triggerAlert.type === 'BORING' && "温和调暗暖色降噪进入小憩。"}
                        {triggerAlert.type === 'DANGER' && "蓝绿冷酷高频率慢变呼吸，提醒主盯防空间。"}
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Trigger alert close / sleep override */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <button 
                  onClick={() => {
                    const audio = new Audio(); // mockup
                    setTriggerAlert(null);
                    addLog('用户手动解除大屏高能唤醒，系统退回自动雷达监控模式。', 'INFO');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-3 rounded-xl text-xs transition"
                >
                  我知道了，继续监视 (Close Alert)
                </button>
                {triggerAlert.type !== 'BORING' ? (
                  <button 
                    onClick={() => {
                      setTriggerAlert(null);
                      applyIotPreset('SLEEP');
                      addLog('触发睡眠辅助。系统处于静柔降噪保护状态。', 'INFO');
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 font-bold p-3 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    💤 倒床睡，开闷局保护
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setTriggerAlert(null);
                      addLog('触发“无剧透3分钟集锦预览占位符”加载模式。', 'INFO');
                      alert('已在您后台静默推送“无剧透 3分钟极速镜头包”，期待明天清晨唤醒后复盘！');
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 font-bold p-3 rounded-xl text-xs transition"
                  >
                    📺 预定醒后3分钟集锦包
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
