<template>
  <div class="p-5">
    <RequireRole
      v-if="project"
      :accepted="['owner', 'admin']"
      :current="project.role"
    >
      <button
        @click="inviteUsers()"
        class="btn btn-primary btn-sm mb-5"
      >
        + Add people
      </button>
    </RequireRole>
    <Table>
      <TableHeader>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="user in members" :key="user._id"
        >
          <TableCell>{{ user.name }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
          <TableCell>{{ user.role }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
  <InviteUserDialog
    v-if="projectId"
    ref="inviteUsersDialog" :projectId="projectId"
  />
</template>
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, onBeforeRouteUpdate } from 'vue-router';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table/index.js';
import InviteUserDialog from '@/components/InviteUserDialog.vue';
import RequireRole from '@/components/RequireRole.vue';
import { ensure } from '@/core';
import type { ProjectMember } from '@quickbyte/common';
import { logger, showToast, store, trpcClient } from '@/app-utils';

const inviteUsersDialog = ref<typeof InviteUserDialog>();
const projectId = ref<string>();
const project = computed(() => {
  return store.projects.value.find(p => p._id === projectId.value);
});
const members = ref<ProjectMember[]>([]);

onBeforeRouteUpdate(async (to) => {
  projectId.value = ensure(to.params.projectId) as string;
  try {
    const result = await trpcClient.getProjectMembers.query(projectId.value);
    members.value = result;
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
});

function inviteUsers() {
  inviteUsersDialog.value?.open();
}
</script>