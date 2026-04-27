<template>
  <div class="selector-screen">
    <div class="selector-header">
      <div>
        <h2>{{ canCancel ? 'Redesign dashboard' : 'Choose entities to include' }}</h2>
        <p class="subtitle">{{ totalSelected }} of {{ totalEntities }} entities selected</p>
      </div>
      <div class="header-actions">
        <label v-if="canCancel" class="scratch-toggle">
          <input type="checkbox" v-model="fromScratch" />
          Start from scratch
        </label>
        <button v-if="canCancel" class="btn btn-cancel" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-primary generate-btn" :disabled="totalSelected === 0 || isStreaming" @click="generate">
          {{ isStreaming ? 'Generating…' : canCancel && !fromScratch ? 'Refine' : 'Generate Dashboard' }}
        </button>
      </div>
    </div>

    <div v-if="isStreaming" class="stream-status">
      <div class="spinner" />
      <span>Claude is designing your dashboard…</span>
    </div>

    <div v-if="streamError" class="error-msg">{{ streamError.message }}</div>

    <div class="prompt-bar">
      <label class="prompt-label">Custom instructions <span class="optional">(optional)</span></label>
      <textarea
        v-model="userPrompt"
        class="prompt-input"
        placeholder="e.g. Use gauge charts for temperatures. Group all lights together first."
        rows="2"
      />
    </div>

    <div class="search-bar">
      <input
        v-model="search"
        type="search"
        placeholder="Search entities…"
        class="search-input"
        autofocus
      />
    </div>

    <div class="domain-list">
      <div v-for="(items, domain) in filteredGroupedEntities" :key="domain" class="domain-group">
        <div class="domain-header" @click="toggleDomain(domain)">
          <label class="domain-label">
            <input
              type="checkbox"
              :checked="isDomainFullySelected(domain)"
              :indeterminate="isDomainPartiallySelected(domain)"
              @change.stop="setDomainAll(domain, $event.target.checked)"
              @click.stop
            />
            <span class="domain-icon">{{ DOMAIN_CONFIG[domain]?.icon ?? '📦' }}</span>
            <span class="domain-name">{{ DOMAIN_CONFIG[domain]?.label ?? domain }}</span>
            <span class="domain-count">{{ selectedInDomain(domain) }}/{{ items.length }}</span>
          </label>
          <span class="chevron" :class="{ open: openDomains.has(domain) }">›</span>
        </div>

        <div v-if="openDomains.has(domain)" class="entity-list">
          <label v-for="entity in items" :key="entity.entityId" class="entity-row">
            <input
              type="checkbox"
              :checked="selected.has(entity.entityId)"
              @change="toggleEntity(entity.entityId)"
            />
            <span class="entity-name">{{ entity.name }}</span>
            <span class="entity-state" :class="stateClass(entity)">{{ entity.displayState }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue';

const emit = defineEmits(['generate', 'cancel']);
const props = defineProps({
  isStreaming:        { type: Boolean, default: false },
  streamError:        { type: Error,   default: null },
  initialSelectedIds: { type: Array,   default: () => [] },
  canCancel:          { type: Boolean, default: false },
});

const DOMAIN_CONFIG = {
  light:         { icon: '💡', label: 'Lights' },
  switch:        { icon: '🔌', label: 'Switches' },
  sensor:        { icon: '📊', label: 'Sensors' },
  binary_sensor: { icon: '👁️', label: 'Binary Sensors' },
  climate:       { icon: '🌡️', label: 'Climate' },
  cover:         { icon: '🪟', label: 'Covers' },
  fan:           { icon: '🌀', label: 'Fans' },
  media_player:  { icon: '🎵', label: 'Media Players' },
  input_boolean: { icon: '🔘', label: 'Toggles' },
};

const HIDDEN_DOMAINS = new Set([
  'automation', 'scene', 'script', 'zone', 'person', 'device_tracker',
  'sun', 'weather', 'update', 'number', 'select', 'text', 'button',
]);

const DOMAIN_PRIORITY = Object.fromEntries(Object.keys(DOMAIN_CONFIG).map((k, i) => [k, i]));

const ha = inject('ha');

const groupedEntities = computed(() => {
  const groups = {};
  for (const [entityId, entity] of Object.entries(ha.entities.value)) {
    const domain = entityId.split('.')[0];
    if (HIDDEN_DOMAINS.has(domain)) continue;
    if (!groups[domain]) groups[domain] = [];
    const attrs = entity.attributes ?? {};
    const unit = attrs.unit_of_measurement ?? '';
    groups[domain].push({
      entityId,
      name: attrs.friendly_name || entityId,
      displayState: unit ? `${entity.state} ${unit}` : entity.state,
      state: entity.state,
    });
  }
  // Sort domains by priority, then alphabetically within each domain
  return Object.fromEntries(
    Object.entries(groups)
      .sort(([a], [b]) => (DOMAIN_PRIORITY[a] ?? 99) - (DOMAIN_PRIORITY[b] ?? 99))
      .map(([domain, items]) => [
        domain,
        items.sort((a, b) => a.name.localeCompare(b.name)),
      ]),
  );
});

const selected = ref(new Set(props.initialSelectedIds));
const openDomains = ref(new Set());
const search = ref('');
const userPrompt = ref('');
const fromScratch = ref(false);

const filteredGroupedEntities = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return groupedEntities.value;
  const result = {};
  for (const [domain, items] of Object.entries(groupedEntities.value)) {
    const matched = items.filter(
      e => e.name.toLowerCase().includes(q) || e.entityId.toLowerCase().includes(q),
    );
    if (matched.length) result[domain] = matched;
  }
  return result;
});

const totalEntities = computed(() =>
  Object.values(groupedEntities.value).reduce((n, items) => n + items.length, 0),
);
const totalSelected = computed(() => selected.value.size);

function visibleInDomain(domain) {
  return filteredGroupedEntities.value[domain] ?? [];
}

function selectedInDomain(domain) {
  return visibleInDomain(domain).filter(e => selected.value.has(e.entityId)).length;
}

function isDomainFullySelected(domain) {
  const items = visibleInDomain(domain);
  return items.length > 0 && items.every(e => selected.value.has(e.entityId));
}

function isDomainPartiallySelected(domain) {
  const items = visibleInDomain(domain);
  const n = items.filter(e => selected.value.has(e.entityId)).length;
  return n > 0 && n < items.length;
}

function toggleEntity(entityId) {
  const next = new Set(selected.value);
  if (next.has(entityId)) next.delete(entityId);
  else next.add(entityId);
  selected.value = next;
}

function setDomainAll(domain, checked) {
  const next = new Set(selected.value);
  for (const e of visibleInDomain(domain)) {
    if (checked) next.add(e.entityId);
    else next.delete(e.entityId);
  }
  selected.value = next;
}

function toggleDomain(domain) {
  const next = new Set(openDomains.value);
  if (next.has(domain)) next.delete(domain);
  else next.add(domain);
  openDomains.value = next;
}

// Auto-expand domains that have search matches
watch(search, (q) => {
  if (!q.trim()) return;
  const next = new Set(openDomains.value);
  for (const domain of Object.keys(filteredGroupedEntities.value)) next.add(domain);
  openDomains.value = next;
});

function stateClass(entity) {
  if (entity.state === 'on') return 'state-on';
  if (entity.state === 'off') return 'state-off';
  if (entity.state === 'unavailable') return 'state-unavailable';
  return '';
}

function generate() {
  emit('generate', {
    entityIds: [...selected.value],
    userPrompt: userPrompt.value,
    fromScratch: fromScratch.value,
  });
}
</script>

<style scoped>
.selector-screen {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.selector-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

h2 {
  font-size: 20px;
  font-weight: 700;
}

.subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.scratch-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.scratch-toggle input {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.btn-cancel {
  padding: 10px 16px;
  font-size: 15px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  transition: border-color 0.15s, color 0.15s;
}

.btn-cancel:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.generate-btn {
  white-space: nowrap;
  font-size: 15px;
  padding: 10px 20px;
  flex-shrink: 0;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.stream-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #0d1f33;
  border: 1px solid var(--accent-dim);
  border-radius: 8px;
  color: var(--accent);
  font-size: 14px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-msg {
  font-size: 13px;
  color: var(--danger);
  background: #2a1010;
  border: 1px solid #5a1a1a;
  border-radius: 6px;
  padding: 10px 12px;
}

.prompt-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prompt-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.optional {
  font-weight: 400;
  color: var(--text-muted);
}

.prompt-input {
  width: 100%;
  padding: 9px 14px;
  font-size: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
  line-height: 1.5;
  font-family: inherit;
}

.prompt-input:focus {
  border-color: var(--accent);
}

.prompt-input::placeholder {
  color: var(--text-muted);
}

.search-bar {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 9px 14px;
  font-size: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--accent);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.domain-group {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.domain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.domain-header:hover {
  background: var(--bg-card);
}

.domain-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
}

.domain-icon { font-size: 16px; }

.domain-name {
  font-weight: 600;
  font-size: 14px;
}

.domain-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 4px;
}

.chevron {
  font-size: 18px;
  color: var(--text-muted);
  transition: transform 0.2s;
  display: inline-block;
}

.chevron.open {
  transform: rotate(90deg);
}

.entity-list {
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.entity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 36px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid #1a1f26;
}

.entity-row:last-child {
  border-bottom: none;
}

.entity-row:hover {
  background: var(--bg-card);
}

.entity-name {
  flex: 1;
  color: var(--text-primary);
}

.entity-state {
  font-size: 12px;
  color: var(--text-muted);
}

.state-on { color: var(--on-color); }
.state-off { color: var(--off-color); }
.state-unavailable { color: var(--danger); }

input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}
</style>
