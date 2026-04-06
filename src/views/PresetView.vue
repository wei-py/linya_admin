<script setup>
import { reactive } from "vue"

import { countryOptions, platformOptions } from "@/constants/preset"

const baseInfo = reactive({
  country: "",
  platform: "",
})
</script>

<template>
  <div class="h-full ">
    <div class="flex h-full gap-1">
      <div class="flex h-full w-[30%] flex-col gap-1">
        <div class=" flex gap-1">
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
        </div>

        <VList class="flex-1 overflow-y-auto">
          <VListItem>
            <VListItemTitle>Item 1</VListItemTitle>
          </VListItem>
        </VList>
      </div>

      <div class=" flex-1 bg-pink-100" />
    </div>
  </div>
</template>
