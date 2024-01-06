<template>
  <div>
    <button
      @click="inviteUsers()"
      class="btn btn-primary btn-sm mb-5"
    >
      + Add people
    </button>
    <Table>
      <TableHeader>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Role</TableHead>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="user in users" :key="user._id"
        >
          <TableCell>{{ user.user.name }}</TableCell>
          <TableCell>{{ user.user.email }}</TableCell>
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
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table/index.js';
import InviteUserDialog from '@/components/InviteUserDialog.vue';
import { ensure } from '@/core';

const inviteUsersDialog = ref<typeof InviteUserDialog>();
const projectId = ref<string>();
const route = useRoute();

onMounted(async () => {
  projectId.value = ensure(route.params.projectId) as string;
});

function inviteUsers() {
  inviteUsersDialog.value?.open();
}

const users = [
  {
    _id: '1',
    user: {
      _id: '1',
      name: 'Test H',
      email: 'testh@gmail.com'
    },
    role: 'editor',
    resourceType: 'project',
  },
  {
    _id: '2',
    user: {
      _id: '2',
      name: 'Tom Clancy',
      email: 'tom@gmail.com'
    },
    role: 'reviewer',
    resourceType: 'project'
  }
]
</script>