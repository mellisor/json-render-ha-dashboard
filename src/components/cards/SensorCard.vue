<template>
  <div class="card sensor-card" :class="{ unavailable: state === 'unavailable' }">
    <div class="card-header">
      <span class="device-class-icon">{{ deviceIcon }}</span>
    </div>
    <div class="entity-name">{{ name }}</div>
    <div class="card-value">
      <span class="value">{{ displayValue }}</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div class="card-footer">
      <span class="last-changed">{{ lastChanged }}</span>
    </div>
  </div>
</template>

<script setup>
import { inject, computed } from 'vue';
import { formatRelativeTime } from '../../utils/format.js';

const props = defineProps({ entityId: { type: String, required: true }, label: { type: String, default: null } });
const ha = inject('ha');

const entity = computed(() => ha.entities.value[props.entityId]);
const state = computed(() => entity.value?.state ?? 'unavailable');
const attrs = computed(() => entity.value?.attributes ?? {});
const name = computed(() => props.label || attrs.value.friendly_name || props.entityId);
const unit = computed(() => attrs.value.unit_of_measurement ?? '');
const displayValue = computed(() => {
  if (state.value === 'unavailable' || state.value === 'unknown') return '—';
  const n = parseFloat(state.value);
  return isNaN(n) ? state.value : n.toFixed(1);
});
const lastChanged = computed(() => formatRelativeTime(entity.value?.last_changed));

const DEVICE_CLASS_ICONS = {
  temperature: '🌡️',
  humidity: '💧',
  pressure: '📉',
  power: '⚡',
  energy: '🔋',
  voltage: '🔌',
  current: '〰️',
  illuminance: '☀️',
  co2: '🌫️',
  pm25: '🌫️',
  moisture: '💦',
  wind_speed: '🌬️',
  precipitation: '🌧️',
  distance: '📏',
  speed: '💨',
};

const deviceIcon = computed(() => {
  const dc = attrs.value.device_class;
  return DEVICE_CLASS_ICONS[dc] ?? '📊';
});
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 0.15s, border-color 0.15s;
}

.card:hover {
  background: var(--bg-card-hover);
  border-color: #4a535e;
}

.card.unavailable {
  opacity: 0.5;
}

.card-header {
  display: flex;
  align-items: center;
}

.device-class-icon {
  font-size: 16px;
}

.entity-name {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.value {
  font-size: 28px;
  font-weight: 700;
  color: var(--sensor-color);
  line-height: 1;
}

.unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.card-footer {
  margin-top: auto;
}

.last-changed {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
