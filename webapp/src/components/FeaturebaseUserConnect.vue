<template></template>
<script setup lang="ts">
import { onMounted, onBeforeMount } from "vue";
import { type UserAccount } from '@/core';
import { logger } from "@/app-utils";

const props = defineProps<{
  user: UserAccount;
}>();

onBeforeMount(() => {
  const script = document.createElement("script");
  script.src = "https://do.featurebase.app/js/sdk.js";
  script.id = "featurebase-sdk";
  document.head.appendChild(script);
});

onMounted(() => {
  const win: any = window;

  if (typeof win.Featurebase !== "function") {
    win.Featurebase = function () {
      (win.Featurebase.q = win.Featurebase.q || []).push(arguments);
    };
  }
  win.Featurebase(
        "identify",
        {
          // Each 'identify' call should include an "organization" property,
          // which is your Featurebase board's name before the ".featurebase.app".
          organization: "quickbyte",
          
          // Required. Replace with your customers data.
          email: props.user.email,
          name: props.user.name,
          id: props.user._id,
          
          // Optional
          // profilePicture:
          //   "https://example.com/images/yourcustomer.png"
        },
        (err: any) => {
          // Callback function. Called when identify completed.
          if (err) {
            logger.error(err);
          } else {
          }
        }
      );

});
</script>