<template>
  <UiDialog ref="dialog" :title="title">
    <UiLayout :gap="4" v-if="state === 'creating'">
      <UiLayout>
        <UiTextInput fullWidth v-model="name" />
      </UiLayout>

      <UiLayout horizontal class="border-b border-b-gray-200">
        <div v-for="page in pages" :key="page.name" @click="activePage = page.name"
          class="inline-flex px-4 py-2 cursor-pointer" :class="{
            'text-black': activePage === page.name,
            'text-gray-500': activePage !== page.name,
            'border-b-2': activePage === page.name,
            'border-b-gray-700': activePage === page.name
          }">
          {{ page.title }}
        </div>
      </UiLayout>

      <UiLayout v-if="activePage === 'shareWith'" :gap="3">
        <div class="text-xs text-gray-500">
          Here you can share project files with external reviewers.
        </div>
        <UiLayout gapSm>
          <div class="font-bold">
            Add people
          </div>
          <UiTextInput fullWidth v-model="recipientsRaw" label="Email addresses of people to add"
            placeholder="john.doe@mailer.com,jane.done@mailer.com" :hasError="!!emailError" />
          <div v-if="emailError" class="text-xs text-error">
            {{ emailError }}
          </div>
          <div v-if="recipients.length && !emailError" class="text-xs text-gray-500">
            Each recipient will receive an email with a unique link to access the project.
          </div>
        </UiLayout>
        <UiLayout v-if="initialShare && initialRecipients.length" gapSm>
          <div class="text-xs">Currently shared with</div>
          <div class="flex flex-wrap gap-1">
            <span
              class="text-xs bg-slate-300 py-1 px-2 rounded-md"
              v-for="recipient in initialRecipients" :key="recipient.email"
            >
              {{ recipient.email }}
            </span>
          </div>
        </UiLayout>
        <UiLayout gapSm>
          <div class="font-bold">
            Public link
          </div>
          <UiLayout horizontal justifyBetween>
            Generate public link
            <UiCheckbox :checked="isPublic" @update:checked="isPublic = $event" />
          </UiLayout>
          <div v-if="isPublic" class="text-xs text-gray-500">
            A public link will be generated that you can share with anyone.
          </div>
        </UiLayout>
      </UiLayout>

      <UiLayout v-else="activePage === 'settings'" :gap="3">
        <UiLayout gapSm>
          <div class="text-lg">
            Expiry
          </div>
          <UiLayout horizontal justifyBetween itemsCenter>
            <span>Enable link expiry</span>
            <UiCheckbox :checked="hasExpiryDate" @update:checked="hasExpiryDate = $event" />
          </UiLayout>
          <UiLayout v-if="hasExpiryDate">
            <UiDateTimeInput label="Expiry Date" v-model="expiryDate" :min="minExpiryDate" :error="expiryDateError" />
          </UiLayout>
        </UiLayout>
        <UiLayout gapSm>
          <div class="text-lg">
            Passphrase protection
          </div>
          <UiLayout horizontal justifyBetween itemsCenter>
            <span>Enable passphrase protection</span>
            <UiCheckbox :checked="hasPassword" @update:checked="hasPassword = $event" />
          </UiLayout>
          <UiLayout v-if="hasPassword">
            <UiTextInput v-model="password" fullWidth :type="'password'" placeholder="Enter passphrase" />
            <div class="text-xs text-gray-500">
              You have to manually share this passphrase with the reviewers.
            </div>
          </UiLayout>
        </UiLayout>
        <UiLayout gapSm>
          <div class="text-lg">
            Permissions
          </div>
          <UiLayout>
            <UiLayout horizontal justifyBetween itemsCenter>
              <span>Allow downloads</span>
              <UiCheckbox :checked="allowDownloads" @update:checked="allowDownloads = $event" />
            </UiLayout>
          </UiLayout>
          <UiLayout>
            <UiLayout horizontal justifyBetween itemsCenter>
              <span>Allow comments</span>
              <UiCheckbox :checked="allowComments" @update:checked="allowComments = $event" />
            </UiLayout>
            <div class="text-xs text-gray-500 w-[90%]">
              Reviewers will only be able to see their comments and replies to their comments.
            </div>
          </UiLayout>
          <UiLayout>
            <UiLayout horizontal justifyBetween itemsCenter>
              <div>
                <span>Show all versions</span>
              </div>
              <UiCheckbox :checked="showAllVersions" @update:checked="showAllVersions = $event" />
            </UiLayout>
            <div class="text-xs text-gray-500 w-[90%]">
              Should reviewers be able to see all versions of a file or just the current version?
            </div>
          </UiLayout>

        </UiLayout>
      </UiLayout>

      <UiLayout horizontal justifyEnd gapSm>
        <UiButton @click="close()">
          Cancel
        </UiButton>
        <UiButton primary :disabled="!isValid" @click="executeAction()">
          {{ actionLabel }}
        </UiButton>
      </UiLayout>
    </UiLayout>

    <UiLayout v-else-if="state === 'done' && createdShare" gapSm>
      <UiLayout horizontal gapSm itemsCenter class="bg-green-200 p-2 rounded-md">
        <CheckCircleIcon class="h-8 w-8 text-green-600" />
        <span class="text-green-700">
          The project assets have been successfully shared.
        </span>
      </UiLayout>
      <UiLayout v-if="createdShare.sharedWith.some(s => s.type === 'invite')">
        An email has been sent to each person you added.
      </UiLayout>
      <UiLayout v-if="publicLink" class="text-xs" gapSm>
        <div class="text-sm font-bold">Public Link</div>
        <p>
          Copy and share the <a class="link" :href="publicLink" target="_blank">public link</a>
          with anyone else you want to grant access to the shared items:
        </p>
        <div class="relative" @click="copyLink()">
          <div class="text-nowrap overflow-auto border p-2 rounded-md">
            {{ publicLink }}
          </div>
        </div>
      </UiLayout>
      <UiLayout v-if="createdShare.hasPassword" class="text-xs" gapSm>
        <div class="text-sm font-bold">
          Password protection
        </div>
        <p>
          This review link is password protected. Remember to share the password
          with everyone you share the link with.
        </p>
      </UiLayout>


      <UiLayout horizontal justifyEnd gapSm class="mt-4">
        <UiButton v-if="publicLink" @click="copyLink">Copy Link</UiButton>
        <UiButton primary @click="handleDone()">
          Done
        </UiButton>
      </UiLayout>
    </UiLayout>
  </UiDialog>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { DateTime } from "luxon";
import { CheckCircleIcon } from '@heroicons/vue/24/outline';
import {
  UiDialog, UiLayout, UiTextInput, UiButton, UiCheckbox, UiDateTimeInput
} from "@/components/ui";
import { isEmail } from "@quickbyte/common";
import type { ProjectShareItemRef, ProjectShare, ProjectShareInviteCode } from "@quickbyte/common";
import { wrapError, linkGenerator } from "@/app-utils";
import { useClipboard } from "@vueuse/core";
import type { ProjectShareActionArgs } from './project-share-args.js';

type State = 'creating' | 'done';

const props = defineProps<{
  projectId: string;
  defaultName: string;
  initialShare?: ProjectShare;
  title: string;
  items: ProjectShareItemRef[]
  actionLabel: string;
  action: (args: ProjectShareActionArgs) => Promise<ProjectShare>;
}>();

const emit = defineEmits<{
  (e: 'done', result: ProjectShare): unknown;
}>();

defineExpose({ open, close });

const { copy } = useClipboard();
const state = ref<State>('creating');

const dialog = ref<typeof UiDialog>();
const name = ref(props.defaultName);
const isPublic = ref(props.initialShare ? props.initialShare.public : true);
const recipientsRaw = ref('');
const recipients = computed(() => {
  const trimmed = recipientsRaw.value.trim();
  if (!trimmed) return [];
  return trimmed.split(/[,;\s]/g).filter(email => email).map(email => ({ email: email }));
});

const initialRecipients = computed<ProjectShareInviteCode[]>(() =>
  props.initialShare?
    props.initialShare.sharedWith
    .filter(s => s.type === 'invite')
    .map(s => {
      if (s.type !== 'invite') {
        // We don't expect this error to ever occur due to the filter already removing irrelevant types.
        // We do this so that compiler can also see that all returned objects are guaranteed
        // to have type === invite
        throw new Error(`Expected share target recipient with type invite but got '${s.type}'`);
      }

      return s;
    })
    : []);


const emailError = computed(() => {
  const invalidEmail = recipients.value.find(r => !isEmail(r.email));
  if (!invalidEmail) {
    return undefined;
  }

  return `'${invalidEmail.email}' is not a valid email`;
});

const hasExpiryDate = ref(props.initialShare ? !!(props.initialShare.expiresAt) : false);

const minExpiryDate = new Date();
// defult expiry date 7 days from now. This is arbitrary.
const expiryDate = ref(
  (props.initialShare?.expiresAt)
  || DateTime.now().plus({ days: 7 }).toJSDate()
);
const expiryDateError = computed(() => {
  if (hasExpiryDate.value && expiryDate.value <= new Date()) {
    return `The expiry date must be in the future.`;
  }

  return undefined;
});

const hasPassword = ref(props.initialShare ? props.initialShare.hasPassword : false);
const password = ref<string | undefined>(undefined);

const allowDownloads = ref(props.initialShare ? !!(props.initialShare.allowDownload) : true);
const allowComments = ref(props.initialShare ? !!(props.initialShare.allowComments) : false);
const showAllVersions = ref(props.initialShare ? !!(props.initialShare.showAllVersions) : false);
const createdShare = ref<ProjectShare | undefined>();
const publicLink = computed(() => {
  if (props.initialShare && props.initialShare.public) {
    const initialCode = props.initialShare.sharedWith.find(s => s.type === 'public')?.code;
    if (initialCode) {
      return linkGenerator.getProjectShareLink(props.initialShare._id, initialCode);
    }
  }

  if (!createdShare.value) {
    return;
  }

  if (!createdShare.value.public) {
    return;
  }

  const publicCode = createdShare.value.sharedWith.find(s => s.type === 'public');
  if (!publicCode) {
    return;
  }

  return linkGenerator.getProjectShareLink(createdShare.value._id, publicCode.code);
});

const isValid = computed(() =>
  name.value
  && (isPublic.value || recipients.value.length > 0 || props.initialShare)
  && (!emailError.value)
  && (!expiryDateError.value)
);

const activePage = ref('shareWith');
const pages = [
  {
    name: 'shareWith',
    title: 'Share with'
  },
  {
    name: 'settings',
    title: 'Settings'
  }
];

function copyLink() {
  if (!publicLink.value) {
    return;
  }

  copy(publicLink.value);
}

function open() {
  state.value = 'creating';
  name.value = props.defaultName;

  activePage.value = 'shareWith';
  hasPassword.value = props.initialShare ? props.initialShare.hasPassword : false;
  recipientsRaw.value = '';
  password.value = undefined;
  hasExpiryDate.value = props.initialShare ? !!(props.initialShare.expiresAt) : false;
  allowComments.value = props.initialShare ? !!(props.initialShare.allowComments) : false;
  allowDownloads.value = props.initialShare ? !!(props.initialShare.allowDownload) : true;
  createdShare.value = undefined;
  dialog.value?.open();
}

function handleDone() {
  if (createdShare.value) {
    emit('done', createdShare.value);
  }

  close();
}

function close() {
  dialog.value?.close();
}

function executeAction() {
  wrapError(async () => {
    if (!isValid.value) return;

    const args: ProjectShareActionArgs = {
      projectId: props.projectId,
      name: name.value,
      expiresAt: hasExpiryDate.value ? expiryDate.value! : undefined,
      allowComments: allowComments.value,
      allowDownload: allowDownloads.value,
      showAllVersions: showAllVersions.value,
      hasPassword: hasPassword.value,
      password: hasPassword && password.value ? password.value : undefined,
      public: isPublic.value,
      recipients: recipients.value,
      items: props.items
    };

    const result = await props.action(args);

    state.value = 'done';
    createdShare.value = result;
  })
}
</script>