<template>
  <div>Project view</div>
</template>
<script lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";
import { store } from "@/app-utils";

const router = useRouter();

// TODO: use a different hook, maybe onBeforeRouteEnter
watch(() => store.user, () => {
  if (!store.user.value) {
    router.push({ name: "login" });
  }
});
</script>