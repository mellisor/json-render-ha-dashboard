<template>
  <div class="chart-card" :class="{ loading: isLoading, error: hasError }">
    <div class="chart-header">
      <span class="chart-title">{{ name }}</span>
      <div class="chart-controls">
        <div class="control-group">
          <button
            v-for="opt in availablePeriods"
            :key="opt.label"
            class="ctrl-btn"
            :class="{ active: effectivePeriodMs === opt.ms }"
            @click="localPeriodMs = opt.ms"
          >{{ opt.label }}</button>
        </div>
        <div class="control-group">
          <button
            v-for="h in HOUR_OPTIONS"
            :key="h"
            class="ctrl-btn"
            :class="{ active: localHours === h }"
            @click="localHours = h"
          >{{ h }}h</button>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="chart-placeholder">
      <div class="spinner" />
    </div>
    <div v-else-if="hasError" class="chart-placeholder error-text">
      Failed to load history
    </div>
    <div v-else-if="aggregatedData.length === 0" class="chart-placeholder muted">
      No data for this period
    </div>
    <v-chart
      v-else
      class="chart"
      :option="chartOption"
      :autoresize="true"
    />
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, onMounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart, GaugeChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';

use([CanvasRenderer, LineChart, BarChart, GaugeChart, GridComponent, TooltipComponent, DataZoomComponent]);

const HOUR_OPTIONS = [1, 6, 24, 72];

const PERIOD_OPTIONS = [
  { label: 'Raw',  ms: 0 },
  { label: '5m',   ms: 5 * 60 * 1000 },
  { label: '30m',  ms: 30 * 60 * 1000 },
  { label: '1h',   ms: 60 * 60 * 1000 },
  { label: '6h',   ms: 6 * 60 * 60 * 1000 },
  { label: '1d',   ms: 24 * 60 * 60 * 1000 },
];

const PERIOD_LABEL_TO_MS = {
  raw:   0,
  '5min':  5 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1h':    60 * 60 * 1000,
  '6h':    6 * 60 * 60 * 1000,
  '1d':    24 * 60 * 60 * 1000,
};

const props = defineProps({
  entityId:        { type: String, required: true },
  label:           { type: String, default: null },
  chartType:       { type: String, default: 'line' },
  hours:           { type: Number, default: 24 },
  aggregatePeriod: { type: String, default: null },
});

const ha = inject('ha');

const localHours     = ref(props.hours);
const localPeriodMs  = ref(null); // null = auto / follow prop

// Translate the aggregatePeriod prop string to ms once
const propPeriodMs = computed(() =>
  props.aggregatePeriod ? (PERIOD_LABEL_TO_MS[props.aggregatePeriod] ?? null) : null,
);

// Periods that make sense for the current time range (bucket < range / 3)
const availablePeriods = computed(() => {
  const rangeMs = localHours.value * 3600 * 1000;
  return PERIOD_OPTIONS.filter(p => p.ms === 0 || p.ms <= rangeMs / 3);
});

// Auto-select a sensible default based on hours
const autoPeriodMs = computed(() => {
  if (localHours.value <= 6)  return 0;
  if (localHours.value <= 24) return 30 * 60 * 1000;
  return 60 * 60 * 1000;
});

// Priority: user click → prop → auto
const effectivePeriodMs = computed(() =>
  localPeriodMs.value ?? propPeriodMs.value ?? autoPeriodMs.value,
);

// Reset manual period choice when hours changes (auto will re-derive)
watch(localHours, () => { localPeriodMs.value = null; });

const history  = ref([]);
const isLoading = ref(false);
const hasError  = ref(false);

const entity = computed(() => ha.entities.value[props.entityId]);
const attrs  = computed(() => entity.value?.attributes ?? {});
const name   = computed(() => props.label || attrs.value.friendly_name || props.entityId);
const unit   = computed(() => attrs.value.unit_of_measurement ?? '');

// Raw [ms, value] pairs from HA minimal history format
const rawData = computed(() => {
  const points = [];
  for (const p of history.value) {
    const val = parseFloat(p.s);
    if (!isNaN(val)) points.push([p.lu * 1000, val]);
  }
  return points;
});

// Bucket-average the raw data into the chosen period
const aggregatedData = computed(() => {
  const periodMs = effectivePeriodMs.value;
  if (periodMs === 0) return rawData.value;

  const buckets = new Map();
  for (const [ts, val] of rawData.value) {
    const key = Math.floor(ts / periodMs) * periodMs;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(val);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, vals]) => [ts + periodMs / 2, vals.reduce((s, v) => s + v, 0) / vals.length]);
});

const currentValue = computed(() =>
  aggregatedData.value.length ? aggregatedData.value.at(-1)[1] : 0,
);

const COLORS = {
  line:    '#58a6ff',
  area:    'rgba(88, 166, 255, 0.12)',
  grid:    '#30363d',
  text:    '#8b949e',
  tooltip: '#1c2128',
  border:  '#30363d',
};

const chartOption = computed(() =>
  props.chartType === 'gauge' ? gaugeOption.value : lineOption.value,
);

const lineOption = computed(() => ({
  backgroundColor: 'transparent',
  grid: { left: 8, right: 8, top: 8, bottom: 28, containLabel: true },
  tooltip: {
    trigger: 'axis',
    backgroundColor: COLORS.tooltip,
    borderColor: COLORS.border,
    textStyle: { color: '#e6edf3', fontSize: 12 },
    formatter: (params) => {
      const [ts, val] = params[0].data;
      const d = new Date(ts);
      const label = effectivePeriodMs.value >= 86400000
        ? d.toLocaleDateString()
        : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `${label}<br/><b>${val.toFixed(1)}${unit.value}</b>`;
    },
  },
  xAxis: {
    type: 'time',
    axisLine: { lineStyle: { color: COLORS.grid } },
    axisTick: { lineStyle: { color: COLORS.grid } },
    axisLabel: {
      color: COLORS.text,
      fontSize: 11,
      formatter: (val) => {
        const d = new Date(val);
        return localHours.value <= 6
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      },
    },
    splitLine: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: COLORS.text, fontSize: 11, formatter: (v) => `${v}${unit.value}` },
    splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
    axisLine: { show: false },
    axisTick: { show: false },
  },
  series: [{
    type: props.chartType === 'bar' ? 'bar' : 'line',
    data: aggregatedData.value,
    smooth: props.chartType !== 'bar',
    symbol: 'none',
    lineStyle: { color: COLORS.line, width: 2 },
    itemStyle: { color: COLORS.line },
    areaStyle: props.chartType === 'bar' ? undefined : { color: COLORS.area },
  }],
}));

const gaugeOption = computed(() => {
  const val = currentValue.value;
  const min = attrs.value.min ?? 0;
  const max = attrs.value.max ?? (unit.value === '%' ? 100 : Math.max(val * 1.5, 100));
  return {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      min, max,
      radius: '85%',
      progress: { show: true, width: 12, itemStyle: { color: COLORS.line } },
      axisLine: { lineStyle: { width: 12, color: [[1, COLORS.grid]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { color: COLORS.text, fontSize: 10, distance: 16 },
      pointer: { show: false },
      anchor: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 22,
        fontWeight: 700,
        color: '#e6edf3',
        formatter: `{value}${unit.value}`,
        offsetCenter: [0, '20%'],
      },
      data: [{ value: parseFloat(val.toFixed(1)) }],
    }],
  };
});

async function load() {
  isLoading.value = true;
  hasError.value = false;
  try {
    history.value = await ha.fetchHistory(props.entityId, localHours.value);
  } catch {
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);
watch(localHours, load);
</script>

<style scoped>
.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  grid-column: span 2;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.chart-title {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.chart-controls {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  gap: 2px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px;
}

.ctrl-btn {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  color: var(--text-muted);
  transition: all 0.15s;
  white-space: nowrap;
}

.ctrl-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-card);
}

.ctrl-btn.active {
  color: var(--accent);
  background: rgba(31, 111, 235, 0.2);
}

.chart { height: 180px; }

.chart-placeholder {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.muted { color: var(--text-muted); font-size: 13px; }
.error-text { color: var(--danger); font-size: 13px; }

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
