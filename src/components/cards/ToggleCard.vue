<template>
  <div
    class="card toggle-card"
    :class="{ on: isOn, unavailable: isUnavailable }"
    @click="toggle"
    role="button"
    :aria-pressed="isOn"
    :aria-label="name"
  >
    <div class="card-header">
      <span class="entity-icon">{{ entityIcon }}</span>
      <span class="toggle-indicator" :class="isOn ? 'on' : 'off'" />
    </div>
    <div class="entity-name">{{ name }}</div>
    <div class="card-footer">
      <span class="badge" :class="isUnavailable ? 'badge-unavailable' : isOn ? 'badge-on' : 'badge-off'">
        {{ isUnavailable ? 'unavailable' : isOn ? 'on' : 'off' }}
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

const domain = computed(() => props.entityId.split('.')[0]);

const DOMAIN_ICONS = {
  light: '💡',
  switch: '🔌',
  input_boolean: '🔘',
  cover: '🪟',
  fan: '🌀',
};

const entityIcon = computed(() => DOMAIN_ICONS[domain.value] ?? '⚡');

async function toggle() {
  if (isUnavailable.value) return;
  const service = isOn.value ? 'turn_off' : 'turn_on';
  await ha.callEntityService('homeassistant', service, props.entityId);
}
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
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  user-select: none;
}

.card:hover:not(.unavailable) {
  background: var(--bg-card-hover);
  border-color: #4a535e;
}

.card.on {
  border-color: #2a4a30;
}

.card.on:hover {
  border-color: #3a6a40;
}

.card.unavailable {
  opacity: 0.5;
  cursor: default;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entity-icon {
  font-size: 20px;
}

.toggle-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.toggle-indicator.on {
  background: var(--on-color);
  box-shadow: 0 0 6px var(--on-color);
}

.toggle-indicator.off {
  background: var(--off-color);
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
