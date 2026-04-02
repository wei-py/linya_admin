<script setup>
defineProps({
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  eyebrow: {
    type: String,
    default: 'Workspace',
  },
})
</script>

<template>
  <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <div class="text-xs uppercase tracking-[0.3em] text-teal-700/70">
        {{ eyebrow ?? 'Workspace' }}
      </div>
      <h1 class="mt-2 text-3xl font-semibold text-slate-900">
        {{ title }}
      </h1>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {{ description }}
      </p>
    </div>
    <div class="rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-700/20">
      Excel + Tauri Ready
    </div>
  </div>
</template>
