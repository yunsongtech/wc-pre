import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini AI with proper User-Agent header
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
    try {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log("Successfully initialized Gemini AI Client.");
    } catch (e) {
      console.error("Error initializing Gemini AI:", e);
    }
  }
  return ai;
}

// REST API for tactical match predictions utilizing Gemini API
app.post("/api/predict", async (req, res) => {
  const { matchId, homeTeam, awayTeam } = req.body;

  if (!homeTeam || !awayTeam) {
    return res.status(400).json({ error: "Missing squad properties 'homeTeam' or 'awayTeam'" });
  }

  const client = getGeminiClient();

  if (client) {
    try {
      const prompt = `You are an elite tactical coach and World Cup strategist. Analyze the match between ${homeTeam.name} and ${awayTeam.name}.
Home Team Info: Attack Style: ${homeTeam.attackStyle}, Strength: ${homeTeam.strength}/100.
Away Team Info: Attack Style: ${awayTeam.attackStyle}, Strength: ${awayTeam.strength}/100.
Generate a comprehensive, engaging tactical prediction including winner probabilities (percentages for home, draw, away summing up to 100), key tactical analysis in Chinese, match excitement index (0 to 100), key players to watch, and a "Boring Match Safeguard" suggestion: whether this match might turn into a boring stalemate, the tactical reason why, and actionable advice for spectators who might want to configure a sleep alarm with a '3-minute non-spoiler highlight preview' placeholder. Output strictly valid JSON conforming to the structured schema.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              winnerProbability: {
                type: Type.OBJECT,
                properties: {
                  home: { type: Type.INTEGER, description: "Home team victory probability" },
                  draw: { type: Type.INTEGER, description: "Draw probability" },
                  away: { type: Type.INTEGER, description: "Away team victory probability" }
                },
                required: ["home", "draw", "away"]
              },
              excitementRating: { type: Type.INTEGER, description: "Match quality index from 0 to 100" },
              tacticalAnalysis: { type: Type.STRING, description: "150-word deep coach-style analysis in Chinese" },
              keyPlayers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Top 2-3 influential star players key to this tactical layout"
              },
              boringMatchSafeguard: {
                type: Type.OBJECT,
                properties: {
                  isBoringPossible: { type: Type.BOOLEAN, description: "Whether a defensive low-event match is likely" },
                  reason: { type: Type.STRING, description: "Tactical reason in Chinese" },
                  actionAdvice: { type: Type.STRING, description: "Action advice for sleep alarm / high-energy triggers in Chinese" }
                },
                required: ["isBoringPossible", "reason", "actionAdvice"]
              }
            },
            required: ["winnerProbability", "excitementRating", "tacticalAnalysis", "keyPlayers", "boringMatchSafeguard"]
          }
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json({ matchId, ...parsed });
      }
    } catch (e) {
      console.error("Gemini prediction generation failed, using high-quality fallback helper:", e);
    }
  }

  // High quality tactical fallback if API key is not setup or fails
  console.log("Using smart static tactical prediction simulation fallback.");
  const sumstrength = homeTeam.strength + awayTeam.strength;
  const homeProb = Math.round((homeTeam.strength / sumstrength) * 60 + 15);
  const awayProb = Math.round((awayTeam.strength / sumstrength) * 60);
  const drawProb = 100 - homeProb - awayProb;

  // Let's create specific realistic responses based on strengths
  const isHighStakes = homeTeam.strength > 85 && awayTeam.strength > 85;
  const excitementRating = isHighStakes ? 92 : Math.round(55 + Math.random() * 30);
  const isBoringPossible = homeTeam.attackStyle.includes("防守") || awayTeam.attackStyle.includes("防守") || excitementRating < 70;

  const samplePlayersMap: Record<string, string[]> = {
    "阿根廷": ["梅西 (Lionel Messi)", "劳塔罗 (Lautaro Martínez)"],
    "法国": ["姆巴佩 (Kylian Mbappé)", "格列兹曼 (Antoine Griezmann)"],
    "巴西": ["维尼修斯 (Vinícius Júnior)", "罗德里戈 (Rodrygo)"],
    "英格兰": ["凯恩 (Harry Kane)", "贝林厄姆 (Jude Bellingham)"],
    "克罗地亚": ["莫德里奇 (Luka Modrić)", "科瓦契奇 (Mateo Kovačić)"],
    "摩洛哥": ["阿什拉夫 (Achraf Hakimi)", "齐耶赫 (Hakim Ziyech)"],
    "德国": ["维尔茨 (Florian Wirtz)", "穆西亚拉 (Jamal Musiala)"],
    "西班牙": ["尼科·威廉姆斯 (Nico Williams)", "亚马尔 (Lamine Yamal)"]
  };

  const homePlayers = samplePlayersMap[homeTeam.name] || [`${homeTeam.name}核心1`, `${homeTeam.name}核心2`];
  const awayPlayers = samplePlayersMap[awayTeam.name] || [`${awayTeam.name}核心1`, `${awayTeam.name}核心2`];

  const fallbackPrediction = {
    matchId,
    winnerProbability: { home: homeProb, draw: drawProb, away: awayProb },
    excitementRating,
    tacticalAnalysis: `【主帅战术复盘】${homeTeam.name}依托传统 ${homeTeam.attackStyle} 体系，在主场展现出极高的空间压制力。然而，${awayTeam.name} 采取的 ${awayTeam.attackStyle} 打法将针对性切断中路组织节点。这将是典型的主控与反击拉锯战。关键在于两边路对肋部空间的渗透保护。预计前30分钟双方会进行高强度防守博弈，若无法早早打破僵局，中圈附近的阵型压迫将决定生死。`,
    keyPlayers: [...homePlayers.slice(0, 1), ...awayPlayers.slice(0, 1)],
    boringMatchSafeguard: {
      isBoringPossible,
      reason: isBoringPossible 
        ? "双方阵型收缩，中后场防线轮转紧密，落位防守扎实，大概率陷入半场攻防拉锯和边路无效传中。" 
        : "两队进攻渴望极高，阵型拉得很开，高位压迫和快速转换交替出现，难以形成持续沉闷闷局。",
      actionAdvice: isBoringPossible 
        ? "「闷战劝退警报已就绪」：若半场无进球且威胁度低，战术闹钟自动切换至“深度睡眠辅助”模式，调暗床头灯，待80分钟或进球事件瞬间高能唤醒，并提供“无剧透3分钟集锦预览占位符”以便醒后复盘。" 
        : "「高能对攻预警」：节奏极快，推荐开启“高能触发”唤醒，任何一次禁区内射门或定位球将同步全屋红闪光效并拉高10%电视音量破晓唤醒！"
    }
  };

  res.json(fallbackPrediction);
});

// Setup Vite Dev server or Serve static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve HTML fallback for single-page applications
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static bundle from 'dist' directory.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`World Cup Tactical Server is fully operational on http://localhost:${PORT}`);
  });
}

startServer();
