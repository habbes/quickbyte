<template>
  <UiMenuItem v-if="!areMultipleItemsSelected" @click="$emit('download')">
    <UiLayout horizontal itemsCenter gapSm>
      <ArrowDownTrayIcon class="w-4 h-4" />
      <span v-if="!areMultipleItemsSelected">Download</span>
      <span v-else>Download {{ totalSelectedItems }} {{ pluralize('item', totalSelectedItems!) }}</span>
    </UiLayout>
  </UiMenuItem>
  <UiMenuItem
    @click="$emit('selectAll')"
    v-if="totalSelectedItems"
  >
    <UiLayout horizontal itemsCenter gapSm>
      <DocumentPlusIcon class="w-4 h-4" />
      Select all
    </UiLayout>
  </UiMenuItem>
  <UiMenuItem
    @click="$emit('unselectAll')"
    v-if="totalSelectedItems"
  >
    <UiLayout horizontal itemsCenter gapSm>
      <DocumentMinusIcon class="w-4 h-4" />
      Unselect all
    </UiLayout>
  </UiMenuItem>
</template>
<script lang="ts" setup>
import { UiMenuItem, UiLayout } from "@/components/ui";
import { ArrowDownTrayIcon, DocumentPlusIcon, DocumentMinusIcon } from '@heroicons/vue/24/outline';
import { computed } from "vue";
import { pluralize } from "@/core";

const props = defineProps<{
totalSelectedItems?: number;
}>();

defineEmits<{
(e: 'download'): unknown;
(e: 'selectAll'): unknown;
(e: 'unselectAll'): unknown;
}>();

const areMultipleItemsSelected = computed(() =>
Boolean(props.totalSelectedItems && props.totalSelectedItems > 1));
</script>