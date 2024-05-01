<template>
  <div class="p-5">
    <UiTable>
      <UiTableHeader>
        <UiTableHead>
          Name
        </UiTableHead>
        <UiTableHead>
          <UiLayout horizontal itemsCenter gapSm>
            <span>Date Created</span>
            <ArrowLongDownIcon
              title="Sorting by newest first"
              v-if="sortDirection < 0"
              @click="toggleSortDirection()"
              class="h-4 w-4 cursor-pointer"
            />
            <ArrowLongUpIcon
              title="Sorting by oldest first"
              v-else
              @click="toggleSortDirection()"
              class="h-4 w-4 cursor-pointer"
            />
          </UiLayout>
        </UiTableHead>
        <UiTableHead>
          Created By
        </UiTableHead>
        <UiTableHead>
          Active
        </UiTableHead>
        <UiTableHead>
          Link
        </UiTableHead>
      </UiTableHeader>
      <UiTableBody>
        <UiTableRow
          v-for="share in sortedShares"
          :key="share._id"
        >
          <UiTableCell>
            {{ share.name }}
          </UiTableCell>
          <UiTableCell>
            {{ DateTime.fromJSDate(share._createdAt).toLocaleString(DateTime.DATETIME_MED) }}
          </UiTableCell>
          <UiTableCell>
            {{ share.creator.name }}
          </UiTableCell>
          <UiTableCell>
            <UiSwitch
              :checked="share.enabled"
              @update:checked="toggleShareEnabled(share)"
            />
          </UiTableCell>
          <UiTableCell>
            <UiLayout
              horizontal
              itemsCenter gapSm
              v-if="share.public"
            >
              <a
                :href="getSharePublicLink(share)" target="_blank"
                class="underline"
                :title="getSharePublicLink(share)"
              >
                Open link
              </a>
              <span @click="copyLink(share)" class="underline cursor-pointer" :title="getSharePublicLink(share)">
                Copy Link
              </span>
            </UiLayout>
            <UiLayout v-else horizontal>
              No public link
            </UiLayout>
          </UiTableCell>
          <UiTableCell>
            <UiMenu>
              <template #trigger>
                <EllipsisVerticalIcon class="h-4 w-4" />
              </template>
              <UiMenuItem @click="requestUpdateShare(share)">
                <UiLayout horizontal itemsCenter gapSm>
                  <Cog6ToothIcon class="h4 w-4" />
                  <span>Settings</span>
                </UiLayout>
              </UiMenuItem>
              <UiMenuItem @click="requestDeleteShare(share)">
                <UiLayout horizontal itemsCenter gapSm>
                  <TrashIcon class="h4 w-4" />
                  <span>Delete</span>
                </UiLayout>
              </UiMenuItem>
            </UiMenu>
          </UiTableCell>
        </UiTableRow>
      </UiTableBody>
    </UiTable>
  </div>
  <ConfirmActionDialog
    ref="deleteDialog"
    v-if="selectedShare"
    :input="selectedShare"
    title="Delete review link"
    actionLabel="Delete"
    :action="deleteShare"
    :actionDanger="true"
    @done="handleShareDeleted($event)"
  >
    <div>
      Are you sure you want to delete the link
      <span class="font-bold">{{ selectedShare.name }}</span>?
    </div>
  </ConfirmActionDialog>
  <ProjectShareUpdateDialog
    ref="updateDialog"
    v-if="selectedShare"
    :share="selectedShare"
    @update="updateLocalShare($event)"
  />
</template>
<script lang="ts" setup>
import { watch, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { DateTime } from 'luxon';
import { useClipboard } from '@vueuse/core';
import {
  EllipsisVerticalIcon,
  ArrowLongDownIcon,
  ArrowLongUpIcon,
  TrashIcon,
  Cog6ToothIcon,
} from "@heroicons/vue/24/outline";
import type { Project, ProjectShare, WithCreator, WithRole } from "@quickbyte/common";
import { trpcClient, wrapError, linkGenerator, store, showToast } from '@/app-utils';
import {
  UiTable,
  UiTableBody,
  UiTableHeader,
  UiTableHead,
  UiTableRow,
  UiTableCell,
  UiMenu,
  UiMenuItem,
  UiLayout,
  UiSwitch
} from "@/components/ui"
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import ProjectShareUpdateDialog from '@/components/project-share/ProjectShareUpdateDialog.vue';
import { ensure } from '@/core';
import { nextTick } from 'process';

const route = useRoute();
const { copy } = useClipboard();
const shares = ref<WithCreator<ProjectShare>[]>([]);
const project = ref<WithRole<Project>|undefined>();
const sortDirection = ref(-1);
const sortedShares = computed(() => {
  const copy = [...shares.value];
  copy.sort((a, b) => sortDirection.value * (a._createdAt.getTime() - b._createdAt.getTime()));
  return copy;
});
const selectedShare = ref<WithCreator<ProjectShare>|undefined>();
const deleteDialog = ref<typeof ConfirmActionDialog>();
const updateDialog = ref<typeof ProjectShareUpdateDialog>();

function toggleSortDirection() {
  sortDirection.value = -1 * sortDirection.value;
}

function getSharePublicLink(share: ProjectShare): string|undefined {
  if (!share.public) {
    return undefined;
  }

  const publicShare = share.sharedWith.find(s => s.type === 'public');
  if (!publicShare) {
    return undefined;
  }

  const link = linkGenerator.getProjectShareLink(share._id, publicShare.code);

  return link;
}

function copyLink(share: ProjectShare) {
  const link = getSharePublicLink(share);
  if (!link) {
    return;
  }

  copy(link);
}

async function toggleShareEnabled(share: WithCreator<ProjectShare>) {
  const originalValue = share.enabled;
  return wrapError(async () => {
    // Perform optimistic updated because we don't show a loading
    // state for this operation
    share.enabled = !originalValue;
    const updatedShare = await trpcClient.updateProjectShare.mutate({
      projectId: share.projectId,
      shareId: share._id,
      enabled: share.enabled
    });

    updateLocalShare(updatedShare);
  }, {
    onError: () => {
      // update failed, undo the local update we made
      // optimistically
      share.enabled = originalValue;
    }
  });
}

async function requestDeleteShare(share: WithCreator<ProjectShare>) {
  selectedShare.value = share;
  nextTick(() => deleteDialog.value?.open());
}

async function deleteShare(share: WithCreator<ProjectShare>) {

  await trpcClient.deleteProjectShare.mutate({
    projectId: ensure(project.value)._id,
    shareId: share._id
  });

  return share;
}

function requestUpdateShare(share: WithCreator<ProjectShare>) {
  selectedShare.value = share;
  nextTick(() => updateDialog.value?.open());
}

function handleShareDeleted(share: WithCreator<ProjectShare>) {
  const index = shares.value.findIndex(s => s._id === share._id);
  if (index === -1) {
    return;
  }

  showToast("Review link deleted successfully.", 'info');

  shares.value.splice(index, 1);
}

function updateLocalShare(updatedShare: ProjectShare) {
  const index = shares.value.findIndex(s => s._id === updatedShare._id);
  if (index === -1) {
    return;
  }
  
  const localShare = shares.value[index];
  shares.value[index] = { ...localShare, ...updatedShare };
}

watch(route, () => {
  wrapError(async () => {
    const projectId = route.params.projectId as string;
    project.value = ensure(store.projects.value.find(p => p._id === projectId));

    shares.value = await trpcClient.getProjectShares.query(projectId);
  });
}, { immediate: true });
</script>