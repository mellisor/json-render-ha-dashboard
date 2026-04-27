<template>
  <div class="connection-screen">
    <div class="connection-card">
      <div class="logo">🏠</div>
      <h1>HA Dashboard</h1>
      <p class="subtitle">Connect to your Home Assistant instance</p>

      <form @submit.prevent="handleSubmit" class="form">
        <div class="field">
          <label for="ha-url">Home Assistant URL</label>
          <input
            id="ha-url"
            v-model="url"
            type="url"
            placeholder="http://homeassistant.local:8123"
            autocomplete="url"
            required
          />
        </div>

        <div class="field">
          <label for="ha-token">
            Long-Lived Access Token
            <a class="help-link" href="#" @click.prevent="showTokenHelp = !showTokenHelp">?</a>
          </label>
          <input
            id="ha-token"
            v-model="token"
            type="password"
            placeholder="eyJ0eXAiOiJKV1QiLCJhbGci..."
            autocomplete="current-password"
            required
          />
          <p v-if="showTokenHelp" class="help-text">
            In Home Assistant: Profile → Long-Lived Access Tokens → Create Token
          </p>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button type="submit" class="btn btn-primary submit-btn" :disabled="loading">
          {{ loading ? 'Connecting…' : 'Connect' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  error: { type: String, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['connect']);

const url = ref(localStorage.getItem('ha-url') ?? '');
const token = ref(localStorage.getItem('ha-token') ?? '');
const showTokenHelp = ref(false);

function handleSubmit() {
  localStorage.setItem('ha-url', url.value);
  localStorage.setItem('ha-token', token.value);
  emit('connect', { url: url.value, token: token.value });
}
</script>

<style scoped>
.connection-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-primary);
}

.connection-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo {
  font-size: 48px;
  margin-bottom: 4px;
}

h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.help-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-secondary);
  text-decoration: none;
}

.help-text {
  font-size: 12px;
  color: var(--accent);
  background: #0d1f33;
  border: 1px solid #1f6feb;
  border-radius: 6px;
  padding: 8px 10px;
}

.error-msg {
  font-size: 13px;
  color: var(--danger);
  background: #2a1010;
  border: 1px solid #5a1a1a;
  border-radius: 6px;
  padding: 10px 12px;
}

.submit-btn {
  width: 100%;
  justify-content: center;
  padding: 10px;
  font-size: 15px;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
