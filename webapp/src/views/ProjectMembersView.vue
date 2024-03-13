<template>
  <div class="p-5">
    <RequireRole
      v-if="project"
      :accepted="['owner', 'admin']"
      :current="project.role"
    >
      <UiButton
        @click="inviteUsers()"
        primary
        lg
        class="mb-5"
      >
        + Add people
      </UiButton>
    </RequireRole>
    <Table>
      <TableHeader>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
        <TableHead>Actions</TableHead>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="user in members" :key="user._id"
        >
          <TableCell>{{ user.name }}</TableCell>
          <TableCell>{{ user.email }}</TableCell>
          <TableCell>{{ user.role }}</TableCell>
          <TableCell>
            <UiMenu>
              <template #trigger>
                <EllipsisVerticalIcon class="w-5 h-5" />
              </template>
              <UiMenuItem>
                <UiLayout @click="changeMemberRole(user)" horizontal gapSm itemsCenter>
                  <ShieldCheckIcon class="w-5 h-5 text-orange-500"/> Change role
                </UiLayout>
              </UiMenuItem>
              <UiMenuItem>
                <UiLayout horizontal gapSm itemsCenter>
                  <NoSymbolIcon class="w-5 h-5 text-red-500"/> Remove member
                </UiLayout>
              </UiMenuItem>
            </UiMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
  <InviteUserDialog
    v-if="projectId"
    ref="inviteUsersDialog" :projectId="projectId"
  />
  <ChangeMemberRoleDialog
    v-if="projectId && selectedMember"
    ref="changeMemberRoleDialog"
    :member="selectedMember"
    :projectId="projectId"
    @roleUpdate="handleMemberRoleChanged($event)"
  />

</template>
<script lang="ts" setup>
import { computed, watch, ref, onMounted } from 'vue';
import { onBeforeRouteUpdate, useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table/index.js';
import InviteUserDialog from '@/components/InviteUserDialog.vue';
import ChangeMemberRoleDialog from "@/components/ChangeMemberRoleDialog.vue";
import RequireRole from '@/components/RequireRole.vue';
import { ensure } from '@/core';
import type { ProjectMember, RoleType } from '@quickbyte/common';
import { logger, showToast, store, trpcClient } from '@/app-utils';
import { UiButton, UiMenu, UiMenuItem, UiLayout } from "@/components/ui";
import { EllipsisVerticalIcon, NoSymbolIcon, ShieldCheckIcon } from "@heroicons/vue/24/solid";
import { nextTick } from 'process';

const route = useRoute();
const inviteUsersDialog = ref<typeof InviteUserDialog>();
const changeMemberRoleDialog = ref<typeof ChangeMemberRoleDialog>();
const projectId = ref<string>();
const project = computed(() => {
  return store.projects.value.find(p => p._id === projectId.value);
});
const members = ref<ProjectMember[]>([]);

const selectedMemberId = ref<string>();
const selectedMember = computed(() => members.value.find(m => m._id === selectedMemberId.value));

function inviteUsers() {
  inviteUsersDialog.value?.open();
}

function changeMemberRole(member: ProjectMember) {
  selectedMemberId.value = member._id;
  nextTick(() => changeMemberRoleDialog.value?.open());
}

function handleMemberRoleChanged(data: { memberId: string, projectId: string, role: RoleType }) {
  const member = members.value.find(m => m._id === data.memberId);
  if (!member) return;
  member.role = data.role;
}

async function loadDataForRoute(to: RouteLocationNormalizedLoaded) {
  projectId.value = ensure(to.params.projectId) as string;
  try {
    const result = await trpcClient.getProjectMembers.query(projectId.value);
    members.value = result;
  } catch (e: any) {
    logger.error(e.message, e);
    showToast(e.message, 'error');
  }
}

onMounted(async () => await loadDataForRoute(route));
onBeforeRouteUpdate(loadDataForRoute);
</script>