<template>
    <UiMenuItem v-if="!areMultipleItemsSelected" @click="$emit('rename')">
      <UiLayout horizontal itemsCenter gapSm>
        <PencilIcon class="w-4 h-4" />
        <span>Rename</span>
      </UiLayout>
    </UiMenuItem>
    <UiMenuItem @click="$emit('move')">
      <UiLayout horizontal itemsCenter gapSm>
        <ArrowRightCircleIcon class="w-4 h-4" />
        <span v-if="!areMultipleItemsSelected">Move to...</span>
        <span v-else>Move {{ totalSelectedItems }} {{ pluralize('item', totalSelectedItems!) }} to...</span>
      </UiLayout>
    </UiMenuItem>
    <UiMenuItem @click="$emit('delete')">
      <UiLayout horizontal itemsCenter gapSm>
        <TrashIcon class="w-4 h-4" />
        <span v-if="!areMultipleItemsSelected">Delete</span>
        <span v-else>Delete {{ totalSelectedItems }} {{ pluralize('item', totalSelectedItems!) }}</span>
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
import { PencilIcon, TrashIcon, ArrowRightCircleIcon, DocumentPlusIcon, DocumentMinusIcon } from '@heroicons/vue/24/outline';
import { computed } from "vue";
import { pluralize } from "@/core";

const props = defineProps<{
  totalSelectedItems?: number;
}>();

defineEmits<{
  (e: 'rename'): unknown;
  (e: 'delete'): unknown;
  (e: 'move'): unknown;
  (e: 'selectAll'): unknown;
  (e: 'unselectAll'): unknown;
}>();

const areMultipleItemsSelected = computed(() =>
  Boolean(props.totalSelectedItems && props.totalSelectedItems > 1));
</script>