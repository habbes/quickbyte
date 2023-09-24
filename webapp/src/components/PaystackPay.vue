<template>
  <button class="btn" @click="pay()">Pay</button>
</template>
<script lang="ts" setup>
import PaystackPop from '@paystack/inline-js';

const paystack = PaystackPop.setup({
  email: 'habyhabbes@gmail.com',
  amount: 200,
  key: 'pk_test_8ba227926e373e40d95dd721b307130f9bbfc3bf',
  plan: 'PLN_kaperxeyhecphkl'
});

function pay() {
  paystack.openIframe();
}
</script>