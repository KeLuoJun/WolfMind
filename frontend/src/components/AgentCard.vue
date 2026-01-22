<template>
  <div
    v-if="agent"
    :style="{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      background: '#ffffff',
      borderBottom: '2px solid #000000',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      animation: isClosing ? 'slideUp 0.2s ease-out forwards' : 'slideDown 0.25s ease-out',
    }"
  >
    <div style="padding: 12px; display: flex; gap: 12px; align-items: center;">
      <img
        v-if="agent.avatar"
        :src="agent.avatar"
        :alt="displayName"
        style="width: 52px; height: 52px; object-fit: contain;"
      />
      <div style="min-width: 220px;">
        <div style="font-size: 16px; font-weight: 800; color: #000000;">{{ displayName }}</div>
        <div style="font-size: 12px; font-weight: 800; color: #111827;">身份：{{ role }}</div>
        <div style="font-size: 12px; color: #374151;">{{ alignmentLabel }}</div>
      </div>
      <div
        :style="{
          marginLeft: 'auto',
          padding: '6px 10px',
          border: '2px solid #000000',
          background: '#fafafa',
          fontSize: '12px',
          fontWeight: 800,
          color: alive ? '#16a34a' : '#ef4444',
        }"
      >
        {{ alive ? '存活' : '出局' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  agent: { type: Object, default: null },
  isClosing: { type: Boolean, default: false },
});

const displayName = computed(() => props.agent?.name || props.agent?.id || "");
const role = computed(() => props.agent?.role || "未知身份");
const alignment = computed(() => props.agent?.alignment || "unknown");
const alignmentLabel = computed(() =>
  alignment.value === "werewolves" ? "狼人阵营" : alignment.value === "villagers" ? "好人阵营" : "未知阵营"
);
const alive = computed(() => props.agent?.alive !== false);
</script>

<style scoped>
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-20px); }
}
</style>
