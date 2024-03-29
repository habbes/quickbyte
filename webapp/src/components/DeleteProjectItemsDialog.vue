<template>
  <UiDialog ref="dialog" :title="'Delete items'">
    <div v-if="items.length === 1">Are you sure you want to delete "<span class="font-bold">{{ name }}</span>"?</div>
    <div v-else>Are you sure you want to delete <span class="font-bold">{{ items.length }} items</span>?</div>
    <template #actions>
      <div class="flex gap-2">
        <UiButton @click="close()">Cancel</UiButton>
        <UiButton @click="deleteItems()" danger>Delete</UiButton>
      </div>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup>
import { UiDialog, UiButton } from "@/components/ui";
import type { Folder, ProjectItemType, ProjectItem } from "@quickbyte/common";
import { computed, ref } from "vue";
import { logger, showToast, trpcClient } from "@/app-utils";
import { pluralize } from "@/core";

type DeleteEvent = {
  deletedCount: number;
  requestedItems: Array<{
    _id: string,
    type: ProjectItemType
  }>
};

const props = defineProps<{
  items: ProjectItem[];
  projectId: string;
}>();

const emit = defineEmits<{
  (e: 'delete', data: DeleteEvent): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const name = computed(() => props.items.length === 1 ? props.items[0].name : undefined)

function open() {
  if (!props.items.length) {
    return;
  }

  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

async function deleteItems() {
  try {
    const result = await trpcClient.deleteProjectItems.mutate({
      items: props.items.map(item => ({ id: item._id, type: item.type })),
      projectId: props.projectId
    });

    emit('delete', {
      deletedCount: result.deletedCount,
      requestedItems: props.items.map(i => ({ _id: i._id, type: i.type }))
    });

    if (props.items.length === 1 && result.deletedCount === 1) {
      showToast(`'${props.items[0].name}' deleted successfully.`, 'info');
    } else {
      showToast(`${result.deletedCount} ${pluralize('item', result.deletedCount)} deleted successfully.`, 'info');
    }

    close();
  } catch (e: any) {
    showToast(e.message, 'error');
    logger?.error(e.message, e);
  }
}
</script>