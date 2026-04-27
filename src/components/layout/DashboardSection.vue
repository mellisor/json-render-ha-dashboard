<template>
  <section class="dashboard-section">
    <h2 class="section-title">
      <span v-if="icon" class="section-icon">{{ icon }}</span>
      {{ title }}
    </h2>
    <slot />
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: '' },
});
</script>

<style scoped>
.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.section-icon {
  font-size: 16px;
}
</style>
