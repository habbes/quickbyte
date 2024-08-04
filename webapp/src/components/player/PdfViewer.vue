<template>
  <div ref="container" class="overflow-y-auto flex flex-1 justify-center">
    <VuePdfEmbed
      :source="src"
      :width="width"
    />
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";
import VuePdfEmbed from 'vue-pdf-embed';

defineProps<{
  src: string;
}>();

const container = ref<HTMLDivElement>();
const width = ref<number>();

const resizeObserver = new ResizeObserver(( entries) => {
  if (!container.value) {
    return;
  };

  const entry = entries.find(e => e.target === container.value);
  if (!entry) {
    return;
  }

  width.value = entry.contentRect.width;
});

onMounted(() => {
  if (!container.value) {
    return;
  }
  resizeObserver.observe(container.value);
});

onUnmounted(() => {
  resizeObserver.disconnect();
});

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