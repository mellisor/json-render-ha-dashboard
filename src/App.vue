<template>
  <RouterView />
</template>

<script setup>
import { provide } from 'vue';
import { useHomeAssistant } from './composables/useHomeAssistant.js';

const ha = useHomeAssistant();
provide('ha', ha);
</script>
