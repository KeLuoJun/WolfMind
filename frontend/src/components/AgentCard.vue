<template>
  <div
    v-if="agent"
    :style="{
      position: 'absolute',
      top: '16px',
      left: '16px',
      right: '16px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.5)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      zIndex: 1000,
      animation: isClosing ? 'slideUp 0.2s ease-out forwards' : 'slideDown 0.25s ease-out',
    }"
  >
    <div style="padding: 16px; display: flex; gap: 16px; align-items: center;">
      <img
        v-if="agent.avatar"
        :src="agent.avatar"
        :alt="displayName"
        style="width: 56px; height: 56px; object-fit: contain; border-radius: 12px; background: #f3f4f6;"
      />
      <div style="min-width: 200px;">
        <div style="font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.025em; line-height: 1.2;">{{ displayName }}</div>
        <div style="display: flex; gap: 8px; margin-top: 4px; align-items: center;">
             <span style="font-size: 12px; font-weight: 600; color: #4b5563; background: #f3f4f6; padding: 2px 8px; border-radius: 6px;">{{ role }}</span>
             <span style="font-size: 12px; color: #6b7280;">{{ alignmentLabel }}</span>
        </div>
      </div>
      <div
        :style="{
          marginLeft: 'auto',
          padding: '6px 12px',
          borderRadius: '9999px',
          background: alive ? '#dcfce7' : '#fee2e2',
          border: alive ? '1px solid #bbf7d0' : '1px solid #fecaca',
          fontSize: '12px',
          fontWeight: 600,
          color: alive ? '#15803d' : '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }"
      >
        <span :style="{
            display: 'block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: alive ? '#16a34a' : '#ef4444'
        }"></span>
        {{ alive ? 'Active' : 'Eliminated' }}
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
