<template>
  <div class="card bg-base-100 w-96">
    <div class="card-body">
      <div v-if="currentTransaction.status === 'success'">
        <div class="flex flex-col justify-center items-center">
          <div class="text-xl text-success font-bold">Thank You!</div>
          <CheckCircleIcon class="text-success w-16 h-16" />
        </div>

        <div class="mt-2 mb-4 border-t border-t-gray-200 border-dashed"></div>

        <div class="flex justify-between text-gray-500 text-xs mb-2">
          <div>Transaction ID</div>
          <div>{{ transaction._id }}</div>
        </div>
        <div class="flex justify-between text-gray-500 text-xs mb-2">
          <div>Amount</div>
          <div>{{ transaction.currency }} {{ transaction.amount }}</div>
        </div>
        <template v-if="transaction.subscription">
          <div class="flex justify-between text-gray-500 text-xs mb-2">
            <div>Plan</div>
            <div>{{ transaction.plan?.displayName || transaction.subscription.planName }}</div>
          </div>
          <div class="flex justify-between text-gray-500 text-xs mb-2">
            <div>Next renewal</div>
            <div>{{ transaction.subscription.renewsAt && new Date(transaction.subscription.renewsAt).toLocaleDateString() }}</div>
          </div>
        </template>

        <div class="mt-4 mb-2 border-t border-t-gray-200 border-dashed"></div>

        <div class="text-center mt-5">
          <router-link :to="homeRoute" class="btn btn-sm">Back Home</router-link>
        </div>
      </div>

      <div v-else-if="currentTransaction.status === 'failed'">
        <div class="flex flex-col justify-center items-center">
          <div class="text-xl text-error font-bold">Payment Failed!</div>
          <FaceFrownIcon class="text-error w-16 h-16" />
        </div>

        <div v-if="transaction.error" class="mt-4 text-sm">
          {{ transaction.error }} This is an error. Please try again or contact support.
        </div>
        <div v-else class="mt-4 text-sm">
          If issues persists, please contact support at <b>support@quickbyte.io</b>
        </div>

        <div class="mt-2 mb-4 border-t border-t-gray-200 border-dashed"></div>

        <div class="flex justify-between text-gray-500 text-xs mb-2">
          <div>Transaction ID</div>
          <div>{{ transaction._id }}</div>
        </div>
        <div class="flex justify-between text-gray-500 text-xs mb-2">
          <div>Amount</div>
          <div>{{ transaction.currency }} {{ transaction.amount }}</div>
        </div>

        <div class="mt-4 mb-2 border-t border-t-gray-200 border-dashed"></div>

        <div class="text-center mt-5">
          <router-link :to="homeRoute" class="btn btn-sm">Back Home</router-link>
        </div>
      </div>

      <div v-else-if="currentTransaction.status === 'cancelled'">
        <div class="flex flex-col justify-center items-center">
          <div class="text-xl font-bold">Payment Cancelled!</div>
          <ExclamationCircleIcon class="w-16 h-16" />
        </div>

        <div class="mt-2 mb-2 border-t border-t-gray-200 border-dashed"></div>

        <div class="text-center mt-5">
          <router-link :to="homeRoute" class="btn btn-sm">Back Home</router-link>
        </div>
      </div>

      <div v-else-if="currentTransaction.status === 'pending'">
        <div class="flex flex-col justify-center items-center">
          <div class="text-xl text-warning font-bold">Payment being processed.</div>
          <ArrowPathIcon class="w-16 h-16 text-warning" />
        </div>

        <div class="mt-4 text-sm">
          Your payment is being processed. Check the status again in a few moments.
        </div>

        <div class="mt-2 mb-4 border-t border-t-gray-200 border-dashed"></div>

        <div class="flex justify-between text-gray-500 text-xs mb-2">
          <div>Transaction ID</div>
          <div>{{ transaction._id }}</div>
        </div>
        <div class="flex justify-between text-gray-500 text-xs mb-2">
          <div>Amount</div>
          <div>{{ transaction.currency }} {{ transaction.amount }}</div>
        </div>

        <div class="mt-4 mb-2 border-t border-t-gray-200 border-dashed"></div>

        <div class="flex justify-between items-center">
          <Button sm primary @click="verifyTransaction()" :loading="loading">Check Status</Button>
          <router-link :to="homeRoute" class="btn btn-sm">Back Home</router-link>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { apiClient, showToast, store, tryUpdateAccountSubscription } from '@/app-utils';
import { type VerifyTransansactionResult, ensure } from '@/core';
import { ref } from 'vue';
import { CheckCircleIcon, FaceFrownIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';
import { RouterLink } from 'vue-router';
import Button from '@/components/Button.vue';
import { logger } from '@azure/storage-blob';

const props = defineProps<{
  transaction: VerifyTransansactionResult
}>();

const user = ensure(store.userAccount.value);

const currentTransaction = ref(props.transaction);
const loading = ref(false);
// TODO: it's more maintainable to foward to the home /
// route. But for some reason, that leads to a blank page.
// So for now we just hardcode the home links to the upload view.
const homeRoute = { name: 'upload' };

async function verifyTransaction() {
  try {
    loading.value = true;
    currentTransaction.value = await apiClient.getTransaction(user.account._id, currentTransaction.value._id);

    tryUpdateAccountSubscription(currentTransaction.value.subscription);
  }
  catch (e: any) {
    logger.error(e);
    showToast(e.message, 'error');
  }
  finally {
    loading.value = false;
  }
}
</script>