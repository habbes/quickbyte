<template>
  <main>
    <button data-featurebase-changelog>
      Changelog<span id="fb-update-badge"></span>
    </button>
  </main>
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
  win.Featurebase("initialize_changelog_widget", {
    organization: "quickbyte", // Replace this with your featurebase organization name
    // placement: "bottom", // Choose between right, left, top, bottom placement (Optional if fullscreenPopup is enabled)
    theme: "light", // Choose between dark or light theme
    fullscreenPopup: true, // Optional - Open a fullscreen announcement of the new feature to the user
    // usersName: "John" // Optional - Show the users name in the welcome message for the fullscreen popup
  });
});
</script>
