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
      mb-6 flex flex-col gap-4 border-b border-[#c6c6c6] pb-5 md:flex-row
      md:items-end md:justify-between
    "
  >
    <div>
      <div class="text-xs font-medium tracking-[0.01em] text-[#525252]">
        {{ eyebrow ?? "Workspace" }}
      </div>
      <h1
        class="
          mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-[#161616]
        "
      >
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-2 max-w-3xl text-sm leading-6 text-[#525252]"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="status"
      class="
        inline-flex items-center border border-[#c6c6c6] bg-[#f4f4f4] px-3
        py-1 text-xs font-medium text-[#525252]
      "
    >
      {{ status }}
    </div>
  </div>
</template>
