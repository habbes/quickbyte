<template>
  <UiRadioList v-model="role">
    <UiRadioListItem value="reviewer">
      <div class="font-semibold">Reviewer</div>
      <div class="font-light text-xs text-gray-500">
        Can view files and comments and post new comments.
      </div>
    </UiRadioListItem>
    <UiRadioListItem value="editor">
      <div class="font-bold">Editor</div>
      <div class="font-light text-xs text-gray-500">
        Can also upload files, update versions, and delete files they uploaded.
      </div>
    </UiRadioListItem>
    <UiRadioListItem value="admin">
      <div class="font-bold">Admin</div>
      <div class="font-light text-xs text-gray-500">
        Can also delete any files and add users to the project.
      </div>
    </UiRadioListItem>
  </UiRadioList>
</template>
<script lang="ts" setup>
import { UiRadioList, UiRadioListItem } from "@/components/ui";
import type { RoleType } from "@quickbyte/common";

const role = defineModel<RoleType>();
</script>