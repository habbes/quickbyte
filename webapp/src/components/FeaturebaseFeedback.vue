<template>
</template>
<script setup lang="ts">
import { onMounted, onBeforeMount } from "vue";

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
  win.Featurebase("initialize_portal_widget", {
    organization: 'quickbyte', // required
    placement: 'right', // optional
    fullScreen: false, // optional
    initialPage: 'MainView', // optional (MainView, RoadmapView, CreatePost, PostsView, ChangelogView)
  });
});
</script>

