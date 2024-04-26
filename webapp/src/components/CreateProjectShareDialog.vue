<template>
  <UiDialog
    ref="dialog"
    :title="title"
  >
    <UiLayout :gap="4">
      <UiLayout>
        <UiTextInput fullWidth v-model="name" />
      </UiLayout>
      
      <UiLayout horizontal
        class="border-b border-b-gray-200"
      >
        <div 
          v-for="page in pages"
          :key="page.name"
          @click="activePage = page.name"
          class="inline-flex px-4 py-2 cursor-pointer"
          :class="{
            'text-black': activePage === page.name,
            'text-gray-500': activePage !== page.name,
            'border-b-2': activePage === page.name,
            'border-b-gray-700': activePage === page.name
          }"
        >
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
          <UiTextInput
            fullWidth
            v-model="recipientsRaw"
            label="Email addresses of people to add"
            placeholder="john.doe@mailer.com,jane.done@mailer.com"
            :hasError="!!emailError"
          />
          <div v-if="emailError" class="text-xs text-error">
            {{ emailError }}
          </div>
          <div v-if="recipients.length && !emailError" class="text-xs text-gray-500">
            Each recipient will receive an email with a unique link to access the project.
          </div>
        </UiLayout>
        <UiLayout gapSm>
          <div class="font-bold">
            Public link
          </div>
          <UiLayout horizontal justifyBetween>
            Generate public link
            <UiCheckbox :checked="isPublic" @update:checked="isPublic = $event"/>
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
            <UiDateTimeInput
              label="Expiry Date"
              v-model="expiryDate"
              :min="minExpiryDate"
              :error="expiryDateError"
            />
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
              You have to manually share this passphrase with the intended recipients.
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
              Allow people with link to add comments to files. They will only be able
              to see their comments and replies to their comments.
            </div>
          </UiLayout>
          <UiLayout>
            <UiLayout horizontal justifyBetween itemsCenter>
              <span>Show all versions</span>
              <UiCheckbox :checked="showAllVersions" @update:checked="showAllVersions = $event" />
            </UiLayout>
            <div class="text-xs text-gray-500 w-[90%]">
              Choose whether people with the link should see all versions
              of each file, or just the preferred version.
            </div>
          </UiLayout>
          
        </UiLayout>
      </UiLayout>

      <UiLayout horizontal justifyEnd gapSm>
        <UiButton
          @click="close()"
        >
          Cancel
        </UiButton>
        <UiButton
          primary
          :disabled="!isValid"
        >
          Share
        </UiButton>
      </UiLayout>
    </UiLayout>
    
  </UiDialog>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";
import { DateTime } from "luxon";
import { UiDialog, UiLayout, UiTextInput, UiButton, UiCheckbox, UiDateTimeInput } from "@/components/ui";
import { pluralize } from "@/core";
import { isEmail, type ProjectItem } from "@quickbyte/common";


const props = defineProps<{
  projectId: string;
  items: ProjectItem[]
}>();

defineExpose({ open, close });

const title = computed(() =>
  `Share ${props.items.length} ${pluralize('item', props.items.length)}`
);

const dialog = ref<typeof UiDialog>();
const name = ref('');
const isPublic = ref(true);
const recipientsRaw = ref('');
const recipients = computed(() => {
  const trimmed = recipientsRaw.value.trim();
  if (!trimmed) return [];
  return trimmed.split(/[,;\s]/g).filter(email => email).map(email => ({ email: email }));
});


const emailError = computed(() => {
  const invalidEmail = recipients.value.find(r => !isEmail(r.email));
  if (!invalidEmail) {
    return undefined;
  }

  return `'${invalidEmail.email}' is not a valid email`;
});

const hasExpiryDate = ref(false);

const minExpiryDate = new Date();
// defult expiry date 7 days from now. This is arbitrary.
const expiryDate = ref(
  DateTime.now().plus({ days: 7 }).toJSDate()
);
const expiryDateError = computed(() => {
  if (hasExpiryDate.value && expiryDate.value <= new Date()) {
    return `The expiry date must be in the future.`;
  }

  return undefined;
});

const hasPassword = ref(false);
const password = ref<string|undefined>(undefined);
const allowDownloads = ref(false);
const allowComments = ref(false);
const showAllVersions = ref(false);


const isValid = computed(() =>
  name.value
  && (isPublic.value || recipients.value.length > 0)
  && (!emailError.value)
  && (!expiryDateError.value)
);


function open() {
  name.value =  props.items.length === 1 ?
    props.items[0].name : 
    `Review Link - ${new Date().toLocaleDateString()}`;
  
  dialog.value?.open();
}

function close() {
  dialog.value?.close();
}

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
</script>