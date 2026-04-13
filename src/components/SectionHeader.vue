<script setup>
defineProps({
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  eyebrow: {
    type: String,
    default: "Workspace",
  },
  status: {
    type: String,
    default: "",
  },
})
</script>

<template>
  <div
    class="
      mb-5 flex flex-col gap-3 border-b border-[#c6c6c6] pb-4 md:flex-row
      md:items-end md:justify-between
    "
  >
    <div>
      <div class="text-xs font-medium text-[#525252]">
        {{ eyebrow ?? "Workspace" }}
      </div>
      <h1 class="mt-1.5 text-2xl font-semibold text-[#161616]">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-1.5 max-w-3xl text-sm leading-6 text-[#525252]"
      >
        {{ description }}
      </p>
    </div>
    <div v-if="status" class="workspace-badge">
      {{ status }}
    </div>
  </div>
</template>
