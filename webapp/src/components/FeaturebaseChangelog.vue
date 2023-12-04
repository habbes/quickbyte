<template>
    <li class="pb-3 border-b border-[#131319] lg:border-none lg:pb-0">
      <div data-featurebase-changelog class="text-[#A1A1A1] transition-all duration-200 ease-in text-md md:px-2 hover:text-white hover:cursor-pointer">
        What's new<span id="fb-update-badge"></span>
      </div>
    </li>
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
