<template>
  <div class="overflow-y-auto justify-center">
    <VuePdfEmbed
      :source="src"
    />
  </div>
</template>
<script lang="ts" setup>
import {} from "vue";
import VuePdfEmbed from 'vue-pdf-embed';

defineProps<{
  src: string;
}>();

</script>
<style scoped>
.vue-pdf-embed {
  margin: 0 auto;
}

.vue-pdf-embed__page {
  margin-bottom: 8px;
  box-shadow: 0 2px 8px 4px rgba(0, 0, 0, 0.1);
}
</style>