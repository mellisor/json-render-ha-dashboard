<template>
  <div class="dashboard-root">
    <slot />
  </div>
</template>

<style scoped>
.dashboard-root {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}
</style>
