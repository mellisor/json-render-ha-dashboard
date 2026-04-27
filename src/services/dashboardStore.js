const DB_NAME = 'ha-dashboard';
const DB_VERSION = 1;
const STORE = 'dashboards';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t   = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function getAllDashboards() {
  const db   = await openDB();
  const rows = await tx(db, 'readonly', s => s.getAll());
  return rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getDashboard(id) {
  const db = await openDB();
  return tx(db, 'readonly', s => s.get(Number(id)));
}

export async function saveDashboard({ id, name, spec, entityIds }) {
  const db  = await openDB();
  const now = new Date().toISOString();
  if (id) {
    return tx(db, 'readwrite', s => s.put({ id: Number(id), name, spec, entityIds, updatedAt: now }));
  }
  return tx(db, 'readwrite', s => s.add({ name, spec, entityIds, createdAt: now, updatedAt: now }));
}

export async function deleteDashboard(id) {
  const db = await openDB();
  return tx(db, 'readwrite', s => s.delete(Number(id)));
}
