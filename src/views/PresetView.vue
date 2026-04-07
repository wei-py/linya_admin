<script setup>
import { storeToRefs } from "pinia"
import { reactive, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import { countryOptions, platformOptions } from "@/constants/preset"
import { usePresetStore } from "@/stores/preset"

const baseInfo = reactive({
  country: "",
  platform: "",
})

const presetStore = usePresetStore()
const { activePreset, activePresetId, presetRecords } = storeToRefs(presetStore)
const route = useRoute()
const router = useRouter()

function syncBaseInfoFromPreset(preset) {
  if (!preset) {
    baseInfo.country = ""
    baseInfo.platform = ""
    return
  }

  baseInfo.country = preset.country
  baseInfo.platform = preset.platform
}

watch(
  () => route.params.presetId,
  (presetId) => {
    const nextId = typeof presetId === "string" ? presetId : ""

    if (!nextId) {
      return
    }

    const target = presetRecords.value.find(item => item.id === nextId)

    if (!target) {
      if (activePresetId.value) {
        void router.replace({
          name: "preset-detail",
          params: { presetId: activePresetId.value },
        })
      }
      else {
        void router.replace({ name: "preset" })
      }
      return
    }

    if (activePresetId.value !== nextId) {
      presetStore.setActivePreset(nextId)
    }
  },
  { immediate: true },
)

watch(
  activePreset,
  (preset) => {
    syncBaseInfoFromPreset(preset)
  },
  { immediate: true },
)

watch(
  activePresetId,
  (nextId) => {
    const routePresetId
      = typeof route.params.presetId === "string" ? route.params.presetId : ""

    if (!nextId) {
      if (routePresetId) {
        void router.replace({ name: "preset" })
      }
      return
    }

    if (routePresetId !== nextId) {
      void router.replace({
        name: "preset-detail",
        params: { presetId: nextId },
      })
    }
  },
  { immediate: true },
)

async function handleAdd() {
  await presetStore.addPresetRecord({
    country: baseInfo.country,
    platform: baseInfo.platform,
  })
}

function handleSelectPreset(item) {
  presetStore.setActivePreset(item.id)
}

async function handleDeletePreset(item) {
  await presetStore.removePresetRecord(item.id)
}
</script>

<template>
  <div class="h-full">
    <div class="flex h-full gap-1">
      <div class="flex h-full w-[15%] flex-col gap-1">
        <div class="flex flex-col gap-1">
          <VAutocomplete
            v-model="baseInfo.country"
            :items="countryOptions"
            label="国家"
            variant="solo-filled"
            clearable
          />
          <VAutocomplete
            v-model="baseInfo.platform"
            :items="platformOptions"
            label="平台"
            variant="solo-filled"
            clearable
          />
          <VBtn class="w-full" variant="tonal" @click="handleAdd"> 添加 </VBtn>
        </div>

        <VList class="flex-1 overflow-y-auto">
          <VListItem
            v-for="item in presetRecords"
            :key="item.id"
            :active="activePresetId === item.id"
            color="primary"
            @click="handleSelectPreset(item)"
          >
            <VListItemTitle>{{ item.country_platform }}</VListItemTitle>
            <template #append>
              <VIcon
                class="
                  cursor-pointer text-slate-400 transition hover:text-red-500
                "
                @click.stop="handleDeletePreset(item)"
              >
                mdi-close
              </VIcon>
            </template>
          </VListItem>
        </VList>
      </div>

      <VCard class="flex-1 p-2">
        <RouterView />
      </VCard>
    </div>
  </div>
</template>

<style scoped>
:deep(.v-input__details) {
  display: none;
}
</style>
