<template>
  <div class="card generic-card" :class="{ unavailable: isUnavailable }">
    <div class="entity-name">{{ name }}</div>
    <div class="state-value">{{ displayState }}</div>
    <div class="last-changed">{{ lastChanged }}</div>
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
const isUnavailable = computed(() => state.value === 'unavailable');
const unit = computed(() => attrs.value.unit_of_measurement ?? '');
const displayState = computed(() => unit.value ? `${state.value} ${unit.value}` : state.value);
const lastChanged = computed(() => formatRelativeTime(entity.value?.last_changed));
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: background 0.15s;
}

.card:hover {
  background: var(--bg-card-hover);
}

.card.unavailable {
  opacity: 0.5;
}

.entity-name {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.state-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.last-changed {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: auto;
}
</style>
