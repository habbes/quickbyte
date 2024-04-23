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
          <div class="font-bold">
            Expiry
          </div>
          <UiLayout horizontal justifyBetween itemsCenter>
            <span>Enable link expiry</span>
            <UiCheckbox :checked="hasExpiryDate" @update:checked="hasExpiryDate = $event" />
          </UiLayout>
          <UiLayout v-if="hasExpiryDate">
            <input type="datetime-local" :value="expiryDateString" @change="handleExpiryDateChange($event)"/>
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
import { UiDialog, UiLayout, UiTextInput, UiButton, UiCheckbox } from "@/components/ui";
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
const expiryDate = ref(DateTime.now());
const expiryDateString = computed(() =>
  expiryDate.value.toFormat("yyyy-MM-dd'T'T"))

const isValid = computed(() =>
  name.value
  && (isPublic.value || recipients.value.length > 0)
  && (!emailError.value)
);

function handleExpiryDateChange(event: Event) {
  const rawValue = (event.target as HTMLInputElement).value;
  const date = DateTime.fromFormat(rawValue, "yyyy-MM-dd'T'T");
  // @ts-ignore
  expiryDate.value = date;
}


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