<template>
	<a
		class="flex items-center gap-2 hover:text-white"
		download
		:href="file.downloadUrl"
		:title="`Download ${humanizeSize(file.size)}`"
	>
		<div v-if="!iconOnly" class="inline-block">
			<span v-if="!noLabel" class="hidden sm:inline">Download </span>
			<span class="whitespace-nowrap">{{ humanizeSize(file.size) }}</span>
		</div>
		<ArrowDownCircleIcon class="h-4 w-4 inline" />
	</a>
</template>
<script lang="ts" setup>
import { humanizeSize } from "@/core";
import { ArrowDownCircleIcon } from "@heroicons/vue/24/outline";

type DownloadableFile = {
	downloadUrl: string;
	size: number;
};

defineProps<{
	file: DownloadableFile;
	/**
	 * When true, only the icon is displayed.
	 */
	iconOnly?: boolean;
	/**
	 * When true, hides the "Download" label
	 * even on larger screens.
	 */
	noLabel?: boolean;
}>();
</script>