<template>
  <div class="dashboard-view">
    <!-- Not connected -->
    <ConnectionForm
      v-if="!connected"
      :error="haError"
      :loading="connecting"
      @connect="handleConnect"
    />

    <!-- Connected: entity selector -->
    <EntitySelector
      v-else-if="showSelector"
      :isStreaming="isStreaming"
      :streamError="streamError"
      :initialSelectedIds="lastSelectedEntityIds"
      :canCancel="!!preRedesignSpec"
      @generate="handleGenerate"
      @cancel="cancelRedesign"
    />

    <!-- Connected: dashboard -->
    <template v-else>
      <header class="dash-header">
        <div class="header-left">
          <RouterLink to="/" class="back-btn">← Home</RouterLink>
          <span class="dash-title">{{ dashboardName || (currentDashboardId ? 'Untitled' : 'New Dashboard') }}</span>
        </div>
        <div class="header-right">
          <span class="conn-pill">
            <span class="conn-dot" />Connected
          </span>
          <button v-if="displaySpec" class="btn btn-secondary" @click="openSaveDialog">
            {{ currentDashboardId ? 'Save' : 'Save Dashboard' }}
          </button>
          <button v-if="displaySpec" class="btn btn-secondary" @click="startRedesign">
            Redesign
          </button>
          <button class="btn btn-ghost" @click="handleDisconnect">Disconnect</button>
        </div>
      </header>

      <main class="dash-main">
        <JSONUIProvider v-if="displaySpec" :registry="registry">
          <Renderer :spec="displaySpec" :registry="registry" />
        </JSONUIProvider>
      </main>
    </template>

    <!-- Save dialog -->
    <div v-if="showSaveDialog" class="dialog-overlay" @click.self="showSaveDialog = false">
      <div class="dialog">
        <h3>Save Dashboard</h3>
        <div class="field">
          <label>Name</label>
          <input
            v-model="saveName"
            type="text"
            class="text-input"
            placeholder="My Dashboard"
            autofocus
            @keyup.enter="doSave"
          />
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary" :disabled="!saveName.trim() || saving" @click="doSave">
            {{ saving ? 'Saving…' : 'Save' }}
          </button>
          <button class="btn btn-cancel" @click="showSaveDialog = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUIStream, JSONUIProvider, Renderer } from '@json-render/vue';
import { registry } from '../dashboard/registry.js';
import { buildGenerationPrompt } from '../dashboard/promptBuilder.js';
import { saveDashboard, getDashboard } from '../services/dashboardStore.js';
import ConnectionForm from '../components/ConnectionForm.vue';
import EntitySelector from '../components/EntitySelector.vue';

const route  = useRoute();
const router = useRouter();
const ha     = inject('ha');
const { connected, error: haError, connect, disconnect, entities, fetchHistoryBatch } = ha;

const displaySpec           = ref(null);
const preRedesignSpec       = ref(null);
const isRedesigning         = ref(false);
const lastSelectedEntityIds = ref([]);
const currentDashboardId    = ref(null);
const dashboardName         = ref('');
const connecting            = ref(false);
const showSaveDialog        = ref(false);
const saveName              = ref('');
const saving                = ref(false);

const { send, spec: streamedSpec, isStreaming, error: streamError } = useUIStream({
  api: '/api/generate-ui',
});

const showSelector = computed(() =>
  connected.value && (!displaySpec.value || isRedesigning.value),
);

watch(streamedSpec, (spec) => {
  if (spec) displaySpec.value = spec;
});

watch(isStreaming, (streaming) => {
  if (!streaming && streamedSpec.value) {
    isRedesigning.value = false;
    preRedesignSpec.value = null;
  }
});

onMounted(async () => {
  const id = route.params.id;
  if (id) {
    const saved = await getDashboard(id);
    if (saved) {
      displaySpec.value         = saved.spec;
      lastSelectedEntityIds.value = saved.entityIds ?? [];
      currentDashboardId.value  = saved.id;
      dashboardName.value       = saved.name;
    }
  }
});

watch(connected, (isConnected, wasConnected) => {
  if (wasConnected && !isConnected) {
    router.push('/');
  }
});

async function handleConnect({ url, token }) {
  connecting.value = true;
  await connect(url, token);
  connecting.value = false;
}

function handleDisconnect() {
  disconnect();
  router.push('/');
}

function startRedesign() {
  preRedesignSpec.value = displaySpec.value;
  isRedesigning.value   = true;
}

function cancelRedesign() {
  displaySpec.value   = preRedesignSpec.value;
  preRedesignSpec.value = null;
  isRedesigning.value = false;
}

async function handleGenerate({ entityIds, userPrompt, fromScratch }) {
  lastSelectedEntityIds.value = entityIds;

  if (fromScratch) {
    preRedesignSpec.value = null;
    displaySpec.value     = null;
  }

  const sensorIds    = entityIds.filter(id => id.startsWith('sensor.'));
  const historyData  = sensorIds.length ? await fetchHistoryBatch(sensorIds, 6) : {};
  const historySummaries = {};

  for (const [entityId, records] of Object.entries(historyData)) {
    if (!records?.length) continue;
    const values = records
      .map(r => parseFloat(r.s ?? r.state))
      .filter(v => !isNaN(v));
    if (values.length) {
      historySummaries[entityId] = {
        min:   Math.min(...values).toFixed(1),
        max:   Math.max(...values).toFixed(1),
        avg:   (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
        count: values.length,
        unit:  entities.value[entityId]?.attributes?.unit_of_measurement ?? '',
      };
    }
  }

  const prompt  = buildGenerationPrompt(entityIds, entities.value, userPrompt, historySummaries);
  const context = (!fromScratch && preRedesignSpec.value) ? { previousSpec: preRedesignSpec.value } : undefined;
  send(prompt, context);
}

function openSaveDialog() {
  saveName.value    = dashboardName.value;
  showSaveDialog.value = true;
}

async function doSave() {
  if (!saveName.value.trim() || !displaySpec.value) return;
  saving.value = true;
  try {
    const id = await saveDashboard({
      id:        currentDashboardId.value,
      name:      saveName.value.trim(),
      spec:      displaySpec.value,
      entityIds: lastSelectedEntityIds.value,
    });
    if (!currentDashboardId.value) {
      currentDashboardId.value = id;
      router.replace(`/dashboard/${id}`);
    }
    dashboardName.value  = saveName.value.trim();
    showSaveDialog.value = false;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.dashboard-view {
  min-height: 100vh;
  background: var(--bg-primary);
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.back-btn {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s;
  flex-shrink: 0;
}

.back-btn:hover { color: var(--text-primary); }

.dash-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.conn-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--success);
}

.conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 5px var(--success);
}

.btn-secondary {
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  background: var(--bg-card);
  transition: border-color 0.15s, background 0.15s;
}

.btn-secondary:hover {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.06);
}

.btn-ghost {
  padding: 7px 14px;
  font-size: 13px;
  color: var(--text-muted);
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}

.btn-ghost:hover {
  color: var(--text-primary);
  background: var(--bg-card);
}

.dash-main {
  padding: 24px;
}

/* Save dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px;
  max-width: 360px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dialog h3 {
  font-size: 16px;
  font-weight: 700;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.text-input {
  padding: 9px 12px;
  font-size: 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus { border-color: var(--accent); }

.dialog-actions {
  display: flex;
  gap: 8px;
}

.btn-cancel {
  flex: 1;
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 14px;
  transition: border-color 0.15s;
}

.btn-cancel:hover { border-color: var(--text-secondary); }

.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
