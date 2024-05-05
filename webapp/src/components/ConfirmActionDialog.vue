<template>
  <UiDialog ref="dialog" :title="title">
    <div>
      <slot>
        {{ message }}
      </slot>
    </div>
    <template #actions>
      <div class="flex gap-2">
        <UiButton @click="close()">Cancel</UiButton>
        <UiButton
          @click="executeAction()"
          :primary="!actionDanger"
          :danger="actionDanger"
          :disabled="loading"
        >{{ actionLabel }}</UiButton>
      </div>
    </template>
  </UiDialog>
</template>
<script lang="ts" setup generic="TInput, TResult">
import { ref } from "vue";
import { UiDialog, UiButton } from "@/components/ui";
import { wrapError } from "@/app-utils";

const props = defineProps<{
  title: string;
  message?: string;
  actionLabel: string;
  actionDanger?: boolean;
  input: TInput;
  action: (value: TInput) => Promise<TResult>
}>();

const emit = defineEmits<{
  (e: 'done', result: TResult): void;
  (e: 'error', error: Error): void;
}>();

defineExpose({ open, close });

const dialog = ref<typeof UiDialog>();
const loading = ref(false);

function close() {
  dialog.value?.close();
}

function open() {
  dialog.value?.open();
}

function executeAction() {
  wrapError(async () => {
    loading.value = true;
    const result = await props.action(props.input);
    close();
    emit('done', result);
  }, {
    onError: error => emit('error', error),
    finally: () => loading.value = false
  });
}
</script>