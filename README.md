# HA Dashboard

An AI-generated Home Assistant dashboard built with Vue 3 and [json-render](https://github.com/vercel-labs/json-render). Select your entities, describe what you want, and Claude generates the dashboard layout in real-time.

## How it works

1. Connect to your Home Assistant instance with a long-lived access token
2. Select which entities to include and optionally write custom instructions
3. Claude generates a dashboard layout as a streaming JSON spec, rendered progressively
4. Refine the existing dashboard or regenerate from scratch at any time

Entity states are kept live via the Home Assistant WebSocket API. Chart cards fetch historical data from the same connection using `history/history_during_period`.

## Stack

- **Vue 3** — UI framework
- **json-render** (`@json-render/vue`) — JSON-driven component rendering with Claude as the spec generator
- **Apache ECharts** (`vue-echarts`) — charts with time-series aggregation
- **home-assistant-js-websocket** — real-time entity state and history
- **Anthropic SDK** — Claude API for dashboard generation (server-side, streamed)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Anthropic API key:

```
ANTHROPIC_API_KEY=your_key_here
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), enter your Home Assistant URL and a long-lived access token (HA profile → Long-Lived Access Tokens → Create Token).

## Card types

| Card | Used for |
|------|----------|
| `SensorCard` | Numeric sensor readings |
| `ChartCard` | Historical time-series charts (line, bar, gauge) |
| `ToggleCard` | Lights, switches, covers, fans — click to toggle |
| `BinaryCard` | Binary sensors with state-aware labels |
| `GenericCard` | Fallback for any other entity |

### ChartCard options

- **Chart type** — `line` (default), `bar`, `gauge`
- **Time range** — 1h, 6h, 24h, 72h
- **Aggregation** — Raw, 5m, 30m, 1h, 6h, 1d (auto-selected based on range; adjustable in the card header)

## Architecture

The Vite dev server hosts a `POST /api/generate-ui` route (via `configureServer` in `vite.config.js`) that:

1. Receives the entity list prompt and current spec from the client
2. Builds the json-render system prompt from the component catalog
3. Calls Claude, streaming JSONL patch lines back to the client
4. The client's `useUIStream` hook applies RFC 6902 patches progressively, rendering the dashboard as it arrives

For production deployment a separate Node.js server is needed to handle the API route.

## Project structure

```
src/
├── App.vue                        # Root: connection state, generation flow
├── composables/
│   └── useHomeAssistant.js        # WebSocket singleton: entities, history, service calls
├── dashboard/
│   ├── catalog.js                 # json-render component catalog (Zod schemas)
│   ├── registry.js                # Maps catalog entries to Vue SFCs
│   └── promptBuilder.js           # Builds the generation prompt from entity list + history
├── components/
│   ├── ConnectionForm.vue
│   ├── EntitySelector.vue         # Entity picker with search, domain grouping, refine/scratch toggle
│   └── cards/
│       ├── SensorCard.vue
│       ├── ChartCard.vue          # ECharts with aggregation
│       ├── ToggleCard.vue
│       ├── BinaryCard.vue
│       └── GenericCard.vue
└── utils/format.js
```
