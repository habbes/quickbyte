<template>
  <div class="min-h-screen bg-base-100 sm:bg-inherit">
    <div class="bg-base-100 border-b border-b-base-200 p-5 sm:rounded-t-md">
      <h2 class="text-3xl">Billing</h2>
    </div>
    <template v-if="subscription">
      <div class="bg-base-100 p-5 border-b border-b-base-200 gap-3 flex flex-col">
        <div class="text-gray-500">Your current plan</div>
        <div>
          <div class="text-lg font-semibold mb-2">
            {{ subscription.plan.displayName }}
          </div>
          <div>
            <ul class="list-disc list-inside text-sm">
              <li>Max transfer size: {{ humanizeSize(subscription.plan.maxTransferSize) }}</li>
              <li>Max storage size: {{ humanizeSize(subscription.plan.maxStorageSize) }}</li>
              <li v-if="subscription.plan.maxTransferValidity">
                Max transfer validity: {{ subscription.plan.maxTransferValidity }} days
              </li>
            </ul>
          </div>
        </div>
        <div v-if="subscription.renewsAt" class="text-gray-500 text-sm">
          Your subscription will automatically renew on:
          <span class="font-semibold">
            {{ new Date(subscription.renewsAt).toLocaleDateString() }}
          </span>
        </div>
        <div v-else-if="subscription.expiresAt" class="text-gray-500 text-sm">
          Your current subscription is valid until
          <span class="font-semibold">
            {{  new Date(subscription.expiresAt).toLocaleDateString() }}
          </span>
        </div>
      </div>

      <div class="bg-base-100 p-5 sm:rounded-b-md" v-if="subscription.willRenew">
        <h3 class="text-md mb-2">Manage card</h3>
        <div class="text-xs text-gray-500 max-w-md">
          Click the button below to update your payment card or cancel your subscription.
          <br>
          When you cancel your current subscription, it will continue to be active
          until {{ new Date(subscription.expiresAt!).toLocaleDateString() }}, but
          will not be renewed therafter. After the subscription expires, you will
          lose ability to transfer files until you activate another subscription.
        </div>
        <div class="mt-3">
          <Button sm :loading="loading" @click="getManagementUrl()">Manage card</Button>
        </div>
      </div>
      <div v-else class="bg-base-100 p-5 sm:rounded-b-md">
        <div>
          This subscription will not be renewed automatically because it was cancelled.
        </div>
        <div>
          After the subscription expires you will lose the ability to transfer files
          until you purchase another subscription. 
        </div>
      </div>
    </template>
    <template v-else>
      <div class="bg-base-100 p-5 border-b border-b-base-200 gap-3 flex flex-col sm:rounded-b-md">
        <div>
          You don't have an active subscription. Without a subscription,
          you cannot transfer files. To purchase a subscription, click the button below.
        </div>
        <div>
          <!-- <router-link :to="{ name: 'pay' }" class="btn btn-primary">Get a Subscription</router-link> -->
           <UiButton primary @click="planDialog?.open()">
              Get a Subscription
           </UiButton>
        </div>
      </div>
    </template>
    <SubscriptionPlansDialog ref="planDialog" />
  </div>
</template>
<script lang="ts" setup>
import {} from 'vue-router';
import { ref } from 'vue';
import { apiClient, logger, showToast, store } from '@/app-utils';
import { ensure, humanizeSize } from '@/core';
import Button from '@/components/Button.vue';
import { SubscriptionPlansDialog } from '@/components/subscriptions';
import { UiButton } from "@/components/ui";

const planDialog = ref<typeof SubscriptionPlansDialog>();
const account = ensure(store.currentAccount.value);
const subscription = account.subscription;
const loading = ref(false);

async function getManagementUrl() {
  try {
    if (!subscription) {
      return;
    }

    loading.value = true;
    const result = await apiClient.getSubscriptionManagementUrl(account._id, subscription._id);
    if (result.link) {
      window.open(result.link, '_blank');
    } else {
      showToast('Card management not applicable for this subscription.', 'info');
    }
  } catch (e: any) {
    showToast(e.message, 'error');
    logger.error(e);
  } finally {
    loading.value = false;
  }
}
</script>