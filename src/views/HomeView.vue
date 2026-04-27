<template>
  <div class="home">
    <header class="home-header">
      <div class="header-left">
        <span class="logo">🏠</span>
        <h1>HA Dashboard</h1>
      </div>
      <div class="header-right">
        <span v-if="connected" class="conn-pill connected">
          <span class="conn-dot" />Connected
        </span>
        <span v-else class="conn-pill">
          <span class="conn-dot offline" />Not connected
        </span>
        <RouterLink to="/dashboard/new" class="btn btn-primary">
          + New Dashboard
        </RouterLink>
      </div>
    </header>

    <main class="home-main">
      <div v-if="loading" class="empty-state">
        <div class="spinner" />
      </div>

      <div v-else-if="dashboards.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h2>No saved dashboards</h2>
        <p>Connect to Home Assistant and generate your first dashboard.</p>
        <RouterLink to="/dashboard/new" class="btn btn-primary">Get started</RouterLink>
      </div>

      <div v-else>
        <h2 class="section-heading">Saved dashboards</h2>
        <div class="dashboard-grid">
          <!-- New dashboard card -->
          <RouterLink to="/dashboard/new" class="new-card">
            <span class="new-icon">+</span>
            <span>New dashboard</span>
          </RouterLink>

          <!-- Saved dashboard cards -->
          <div v-for="d in dashboards" :key="d.id" class="dash-card">
            <div class="dash-card-body" @click="open(d.id)">
              <div class="dash-name">{{ d.name }}</div>
              <div class="dash-meta">
                <span class="meta-chip">{{ d.entityIds?.length ?? 0 }} entities</span>
                <span class="dash-date">{{ formatDate(d.updatedAt) }}</span>
              </div>
            </div>
            <div class="dash-card-actions">
              <button class="btn-action open-btn" @click="open(d.id)">Open</button>
              <button class="btn-action delete-btn" @click.stop="confirmDelete(d)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Delete confirm dialog -->
    <div v-if="deleteTarget" class="dialog-overlay" @click.self="deleteTarget = null">
      <div class="dialog">
        <h3>Delete "{{ deleteTarget.name }}"?</h3>
        <p>This cannot be undone.</p>
        <div class="dialog-actions">
          <button class="btn btn-danger-solid" @click="doDelete">Delete</button>
          <button class="btn btn-cancel" @click="deleteTarget = null">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllDashboards, deleteDashboard } from '../services/dashboardStore.js';

const router     = useRouter();
const ha         = inject('ha');
const connected  = ha.connected;

const dashboards  = ref([]);
const loading     = ref(true);
const deleteTarget = ref(null);

onMounted(async () => {
  dashboards.value = await getAllDashboards();
  loading.value = false;
});

function open(id) {
  router.push(`/dashboard/${id}`);
}

function confirmDelete(d) {
  deleteTarget.value = d;
}

async function doDelete() {
  await deleteDashboard(deleteTarget.value.id);
  dashboards.value = dashboards.value.filter(d => d.id !== deleteTarget.value.id);
  deleteTarget.value = null;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: var(--bg-primary);
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
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

.logo { font-size: 22px; }

h1 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.conn-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.conn-pill.connected { color: var(--success); }

.conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--off-color);
}

.conn-pill.connected .conn-dot {
  background: var(--success);
  box-shadow: 0 0 5px var(--success);
}

.conn-dot.offline { background: var(--off-color); }

.home-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 28px;
}

.section-heading {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 50vh;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon { font-size: 48px; }

.empty-state h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state p {
  font-size: 14px;
  color: var(--text-secondary);
  max-width: 320px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.new-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 40px 20px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: border-color 0.15s, color 0.15s;
  min-height: 140px;
}

.new-card:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.new-icon {
  font-size: 28px;
  font-weight: 300;
}

.dash-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s;
}

.dash-card:hover {
  border-color: #4a535e;
}

.dash-card-body {
  padding: 20px;
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dash-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.dash-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-chip {
  font-size: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 99px;
  padding: 2px 8px;
  color: var(--text-secondary);
}

.dash-date {
  font-size: 12px;
  color: var(--text-muted);
}

.dash-card-actions {
  display: flex;
  border-top: 1px solid var(--border);
}

.btn-action {
  flex: 1;
  padding: 10px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  transition: background 0.15s, color 0.15s;
  border-right: 1px solid var(--border);
}

.btn-action:last-child { border-right: none; }

.open-btn {
  color: var(--accent);
}

.open-btn:hover { background: rgba(88, 166, 255, 0.08); }

.delete-btn { color: var(--text-muted); }
.delete-btn:hover { color: var(--danger); background: rgba(248, 81, 73, 0.08); }

/* Dialog */
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
  gap: 10px;
}

.dialog h3 { font-size: 16px; font-weight: 700; }
.dialog p  { font-size: 13px; color: var(--text-secondary); }

.dialog-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-danger-solid {
  flex: 1;
  padding: 9px 16px;
  background: var(--danger);
  color: #fff;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  transition: opacity 0.15s;
}

.btn-danger-solid:hover { opacity: 0.85; }

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

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
