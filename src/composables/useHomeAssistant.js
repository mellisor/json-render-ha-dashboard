import { ref, readonly } from 'vue';
import {
  createLongLivedTokenAuth,
  createConnection,
  subscribeEntities,
  callService,
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
} from 'home-assistant-js-websocket';

// Module-level singleton — one HA connection per app instance
const entities = ref({});
const connected = ref(false);
const error = ref(null);
const conn = ref(null);

export function useHomeAssistant() {
  async function connect(hassUrl, token) {
    error.value = null;
    try {
      const auth = createLongLivedTokenAuth(hassUrl.replace(/\/$/, ''), token);
      const connection = await createConnection({ auth });

      conn.value = connection;
      connected.value = true;

      subscribeEntities(connection, (updated) => {
        entities.value = updated;
      });

      connection.addEventListener('disconnected', () => {
        connected.value = false;
      });
      connection.addEventListener('reconnected', () => {
        connected.value = true;
      });

      return true;
    } catch (err) {
      if (err === ERR_CANNOT_CONNECT) {
        error.value = 'Cannot connect. Check the URL and make sure HA is reachable.';
      } else if (err === ERR_INVALID_AUTH) {
        error.value = 'Invalid token. Generate a long-lived access token in your HA profile.';
      } else {
        error.value = typeof err === 'number' ? `Connection error (code ${err})` : String(err);
      }
      return false;
    }
  }

  async function callEntityService(domain, service, entityId, data = {}) {
    if (!conn.value) return;
    await callService(conn.value, domain, service, { entity_id: entityId, ...data });
  }

  async function fetchHistory(entityId, hoursBack = 24) {
    const batch = await fetchHistoryBatch([entityId], hoursBack);
    return batch[entityId] ?? [];
  }

  async function fetchHistoryBatch(entityIds, hoursBack = 6) {
    if (!conn.value || entityIds.length === 0) return {};
    const startTime = new Date(Date.now() - hoursBack * 3600 * 1000).toISOString();
    try {
      return await conn.value.sendMessagePromise({
        type: 'history/history_during_period',
        start_time: startTime,
        entity_ids: entityIds,
        minimal_response: true,
        no_attributes: true,
      }) ?? {};
    } catch {
      return {};
    }
  }

  function disconnect() {
    conn.value?.close();
    conn.value = null;
    connected.value = false;
    entities.value = {};
  }

  return {
    entities: readonly(entities),
    connected: readonly(connected),
    error: readonly(error),
    connect,
    disconnect,
    callEntityService,
    fetchHistory,
    fetchHistoryBatch,
  };
}
