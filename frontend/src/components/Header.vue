<template>
  <div class="header-title" style="flex: 0 1 auto; min-width: 0;">
    <span
      class="header-link"
      style="cursor: default; padding: 4px 8px; border-radius: 3px; display: inline-flex; align-items: center; gap: 8px;"
    >
      <img
        :src="ASSETS.logo"
        alt="WolfMind"
        style="height: 24px; width: 24px;"
      />
      WolfMind
    </span>

    <span
      style="
        width: 2px;
        height: 16px;
        background: #666;
        margin: 0 16px;
        display: inline-block;
        vertical-align: middle;
      "
    />

    <span
      style="
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 700;
        color: #111827;
        background: #f5f5f5;
        border: 1px solid #e5e7eb;
        border-radius: 3px;
        letter-spacing: 0.5px;
        white-space: nowrap;
      "
    >
      {{ phaseText }}
    </span>

    <span
      style="
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 700;
        color: #111827;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 3px;
        letter-spacing: 0.5px;
        white-space: nowrap;
      "
    >
      {{ statusText }}
    </span>

    <button
      type="button"
      :disabled="!onStartGame || startDisabled"
      @click="onStartGame && onStartGame()"
      style="
        margin-left: 12px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        border-radius: 6px;
        border: 1px solid #111827;
        background: #111827;
        color: #ffffff;
        white-space: nowrap;
      "
      :style="{
        background: startDisabled ? '#f3f4f6' : '#111827',
        color: startDisabled ? '#6b7280' : '#ffffff',
        cursor: !onStartGame || startDisabled ? 'not-allowed' : 'pointer'
      }"
    >
      {{ startLabel }}
    </button>

    <button
      type="button"
      :disabled="!onStopGame || stopDisabled"
      @click="onStopGame && onStopGame()"
      style="
        margin-left: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        border-radius: 6px;
        border: 1px solid #111827;
        background: #ffffff;
        color: #111827;
        white-space: nowrap;
      "
      :style="{
        background: stopDisabled ? '#f3f4f6' : '#ffffff',
        color: stopDisabled ? '#6b7280' : '#111827',
        cursor: !onStopGame || stopDisabled ? 'not-allowed' : 'pointer'
      }"
    >
      {{ stopLabel }}
    </button>

    <button
      type="button"
      :disabled="!onExportLog || exportLogDisabled"
      @click="onExportLog && onExportLog()"
      style="
        margin-left: 12px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        border-radius: 6px;
        border: 1px solid #111827;
        background: #ffffff;
        color: #111827;
        white-space: nowrap;
      "
      :style="{
        background: exportLogDisabled ? '#f3f4f6' : '#ffffff',
        color: exportLogDisabled ? '#6b7280' : '#111827',
        cursor: !onExportLog || exportLogDisabled ? 'not-allowed' : 'pointer'
      }"
    >
      {{ exportLogLabel }}
    </button>

    <button
      type="button"
      :disabled="!onExportExperience || exportExperienceDisabled"
      @click="onExportExperience && onExportExperience()"
      style="
        margin-left: 8px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.5px;
        border-radius: 6px;
        border: 1px solid #111827;
        background: #ffffff;
        color: #111827;
        white-space: nowrap;
      "
      :style="{
        background: exportExperienceDisabled ? '#f3f4f6' : '#ffffff',
        color: exportExperienceDisabled ? '#6b7280' : '#111827',
        cursor: !onExportExperience || exportExperienceDisabled ? 'not-allowed' : 'pointer'
      }"
    >
      {{ exportExperienceLabel }}
    </button>
  </div>
</template>

<script setup>
import { ASSETS } from "../config/constants";

defineProps({
  statusText: { type: String, default: "等待连接" },
  phaseText: { type: String, default: "准备中" },
  onStartGame: { type: Function, default: null },
  startDisabled: { type: Boolean, default: false },
  startLabel: { type: String, default: "开始游戏" },
  onStopGame: { type: Function, default: null },
  stopDisabled: { type: Boolean, default: false },
  stopLabel: { type: String, default: "终止游戏" },
  onExportLog: { type: Function, default: null },
  exportLogDisabled: { type: Boolean, default: false },
  exportLogLabel: { type: String, default: "导出日志" },
  onExportExperience: { type: Function, default: null },
  exportExperienceDisabled: { type: Boolean, default: false },
  exportExperienceLabel: { type: String, default: "导出经验" },
});
</script>
