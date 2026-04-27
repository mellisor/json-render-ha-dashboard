<template>
  <div>
    <!-- Not connected -->
    <ConnectionForm
      v-if="!connected"
      :error="error"
      :loading="connecting"
      @connect="handleConnect"
    />

    <!-- Connected -->
    <template v-else>
      <header class="app-header">
        <div class="header-left">
          <span class="header-logo">🏠</span>
          <h1 class="header-title">HA Dashboard</h1>
          <span class="connection-dot" :class="connected ? 'online' : 'offline'" />
        </div>
        <div class="header-right">
          <span class="entity-count">{{ entityCount }} entities</span>
          <button v-if="displaySpec && !isRedesigning" class="btn btn-danger" @click="startRedesign">Redesign</button>
          <button class="btn btn-danger" @click="handleDisconnect">Disconnect</button>
        </div>
      </header>

      <main>
        <!-- Entity loading -->
        <div v-if="!hasEntities" class="loading-state">
          <div class="spinner" />
          <p>Loading entities…</p>
        </div>

        <!-- Entity selector: first time or redesign -->
        <EntitySelector
          v-else-if="showSelector"
          :is-streaming="isStreaming"
          :stream-error="streamError"
          :initial-selected-ids="lastSelectedEntityIds"
          :can-cancel="!!displaySpec"
          @generate="handleGenerate"
          @cancel="cancelRedesign"
        />

        <!-- Streaming with no spec yet (first generation) -->
        <div v-else-if="isStreaming && !displaySpec" class="loading-state">
          <div class="spinner" />
          <p>Designing your dashboard…</p>
        </div>

        <!-- Dashboard — rendered from displaySpec, streaming badge while updating -->
        <JSONUIProvider v-else :registry="registry">
          <Renderer :spec="displaySpec" :registry="registry" />
          <div v-if="isStreaming" class="streaming-badge">Generating…</div>
        </JSONUIProvider>
      </main>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, provide } from 'vue';
import { Renderer, JSONUIProvider, useUIStream } from '@json-render/vue';
import ConnectionForm from './components/ConnectionForm.vue';
import EntitySelector from './components/EntitySelector.vue';
import { useHomeAssistant } from './composables/useHomeAssistant.js';
import { registry } from './dashboard/registry.js';
import { buildGenerationPrompt } from './dashboard/promptBuilder.js';

const ha = useHomeAssistant();
const { entities, connected, error } = ha;

provide('ha', ha);

const connecting = ref(false);

const hasEntities = computed(() => Object.keys(entities.value).length > 0);
const entityCount = computed(() => Object.keys(entities.value).length);

const {
  spec: streamedSpec,
  isStreaming,
  error: streamError,
  send,
  clear,
} = useUIStream({ api: '/api/generate-ui' });

// displaySpec is what the Renderer shows — updated from streamedSpec as patches arrive,
// but not cleared when entering redesign mode so Cancel can restore it.
const displaySpec       = ref(null);
const isRedesigning     = ref(false);
const lastSelectedEntityIds = ref([]);

watch(streamedSpec, (s) => { if (s) displaySpec.value = s; });

const showSelector = computed(
  () => isRedesigning.value || (!displaySpec.value && !isStreaming.value),
);

function startRedesign() {
  isRedesigning.value = true;
}

function cancelRedesign() {
  isRedesigning.value = false;
}

async function handleGenerate({ entityIds, userPrompt, fromScratch }) {
  lastSelectedEntityIds.value = entityIds;
  isRedesigning.value = false;

  const sensorIds = entityIds.filter(id => id.split('.')[0] === 'sensor');
  const historySummaries = {};

  if (sensorIds.length > 0) {
    const raw = await ha.fetchHistoryBatch(sensorIds, 6);
    for (const [entityId, points] of Object.entries(raw)) {
      const values = points.map(p => parseFloat(p.s)).filter(v => !isNaN(v));
      if (values.length === 0) continue;
      const sum = values.reduce((s, v) => s + v, 0);
      historySummaries[entityId] = {
        min: Math.min(...values).toFixed(1),
        max: Math.max(...values).toFixed(1),
        avg: (sum / values.length).toFixed(1),
        count: values.length,
      };
    }
  }

  const refining = !fromScratch && !!displaySpec.value;
  const context  = refining ? { previousSpec: displaySpec.value } : undefined;

  // Only wipe the display when starting fresh — refinement streams patches onto the live spec
  if (!refining) {
    clear();
    displaySpec.value = null;
  }

  const prompt = buildGenerationPrompt(entityIds, entities.value, userPrompt, historySummaries);
  await send(prompt, context);
}

async function handleConnect({ url, token }) {
  connecting.value = true;
  await ha.connect(url, token);
  connecting.value = false;
}

function handleDisconnect() {
  ha.disconnect();
  clear();
  displaySpec.value = null;
  isRedesigning.value = false;
  lastSelectedEntityIds.value = [];
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo { font-size: 22px; }

.header-title {
  font-size: 16px;
  font-weight: 700;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.connection-dot.online {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.connection-dot.offline {
  background: var(--danger);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.entity-count {
  font-size: 13px;
  color: var(--text-muted);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 60vh;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.streaming-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--accent-dim);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 99px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  animation: pulse-badge 1.5s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
