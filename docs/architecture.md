# WorldCup Oracle & Wake 架构说明

## 目录结构

```
wc-pre/
├── cmd/server/          # Go HTTP 入口
├── cmd/tools/predict/   # CLI 预测验证
├── internal/
│   ├── adapter/         # World Bank / Wikimedia / FM CSV
│   ├── engine/          # ELO / Poisson / EI / LTS
│   ├── semantic/        # DeepSeek JSON float 层
│   ├── service/         # 业务编排
│   ├── api/             # HTTP 路由与 handlers
│   ├── live/mock/       # Mock WebSocket 赛事流
│   └── notification/    # 语音外呼 stub
├── data/                # CSV / JSON / fixtures
├── web-front/           # React + Vite 前端
└── docs/                # 需求与设计文档
```

## 开发启动

```bash
# 终端 1：Go 后端
go run ./cmd/server

# 终端 2：前端
cd web-front && npm run dev
```

前端 `http://localhost:3000`，API 代理至 `http://localhost:8080`。

## 环境变量

| 变量 | 说明 |
|---|---|
| `ADDR` | Go 监听地址，默认 `:8080` |
| `DATA_DIR` | 数据目录，默认 `data` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key，空则 deterministic fallback |
| `MOCK_LIVE` | `true` 启用 mock 赛事 WebSocket |
| `API_BACKEND_URL` | 前端 dev proxy 目标 |

## API 列表

| Method | Path | 说明 |
|---|---|---|
| GET | `/healthz` | 健康检查 |
| GET | `/api/v1/matches` | 比赛列表 |
| GET | `/api/v1/matches/{id}` | 单场详情 |
| POST | `/api/v1/matches/{id}/predict` | 预测结果 |
| GET | `/api/v1/matches/{id}/radar` | 10 维雷达数据 |
| GET | `/api/v1/sse/matches/{id}` | SSE 实时 LTS/EI |
| GET | `/api/v1/ws/matches/{id}/live` | WebSocket mock 事件 |
| GET | `/api/v1/alarms/sleep-guard/{matchId}` | 睡眠保护评估 |
| POST | `/api/v1/iot/wakeup-action` | IoT 唤醒（mock） |
| POST | `/api/predict` | 遗留兼容端点 |

## 数据流

FM CSV → TeamProfile → Engine(Poisson/EI) → Semantic(DeepSeek θ) → API → 前端 Radar/SSE

## Docker

```bash
docker build -t wc-pre-api .
docker run -p 8080:8080 -v ./data:/data wc-pre-api
```

前端仍使用 `npm run dev` 本地调试。
