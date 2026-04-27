<template>
  <div class="card binary-card" :class="{ triggered: isOn, unavailable: isUnavailable }">
    <div class="card-header">
      <span class="device-icon">{{ deviceIcon }}</span>
      <span class="pulse" v-if="isOn" />
    </div>
    <div class="entity-name">{{ name }}</div>
    <div class="card-footer">
      <span class="badge" :class="isUnavailable ? 'badge-unavailable' : isOn ? 'badge-on' : 'badge-off'">
        {{ displayState }}
      </span>
      <span class="last-changed">{{ lastChanged }}</span>
    </div>
  </div>
</template>

<script setup>
import { inject, computed } from 'vue';
import { formatRelativeTime } from '../../utils/format.js';

const props = defineProps({ entityId: { type: String, required: true } });
const ha = inject('ha');

const entity = computed(() => ha.entities.value[props.entityId]);
const state = computed(() => entity.value?.state ?? 'unavailable');
const attrs = computed(() => entity.value?.attributes ?? {});
const name = computed(() => attrs.value.friendly_name || props.entityId);
const isOn = computed(() => state.value === 'on');
const isUnavailable = computed(() => state.value === 'unavailable' || state.value === 'unknown');
const lastChanged = computed(() => formatRelativeTime(entity.value?.last_changed));

const DEVICE_CLASS_CONFIG = {
  motion:      { icon: '👁️',  onLabel: 'detected',  offLabel: 'clear' },
  door:        { icon: '🚪',  onLabel: 'open',      offLabel: 'closed' },
  window:      { icon: '🪟',  onLabel: 'open',      offLabel: 'closed' },
  garage_door: { icon: '🏠',  onLabel: 'open',      offLabel: 'closed' },
  smoke:       { icon: '🔥',  onLabel: 'detected',  offLabel: 'clear' },
  moisture:    { icon: '💧',  onLabel: 'wet',       offLabel: 'dry' },
  lock:        { icon: '🔒',  onLabel: 'unlocked',  offLabel: 'locked' },
  plug:        { icon: '🔌',  onLabel: 'plugged in', offLabel: 'unplugged' },
  connectivity:{ icon: '📶',  onLabel: 'connected', offLabel: 'disconnected' },
  battery:     { icon: '🔋',  onLabel: 'normal',    offLabel: 'low' },
  presence:    { icon: '👤',  onLabel: 'home',      offLabel: 'away' },
};

const deviceConfig = computed(() => {
  const dc = attrs.value.device_class;
  return DEVICE_CLASS_CONFIG[dc] ?? { icon: '❓', onLabel: 'on', offLabel: 'off' };
});

const deviceIcon = computed(() => deviceConfig.value.icon);

const displayState = computed(() => {
  if (isUnavailable.value) return 'unavailable';
  return isOn.value ? deviceConfig.value.onLabel : deviceConfig.value.offLabel;
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
}

.card.triggered {
  border-color: #4a4a1a;
}

.card.unavailable {
  opacity: 0.5;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-icon {
  font-size: 20px;
}

.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--warning);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.4); }
}

.entity-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.last-changed {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
