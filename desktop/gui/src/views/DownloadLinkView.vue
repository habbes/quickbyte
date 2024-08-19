<template>
  <div>
    <h1>Download</h1>
    <div>
      <label>
        <span>Enter link:</span>
        <input type="text" v-model="link" />
      </label>
      <div>
        <button type="button" @click="fetchLink()">Start</button>
      </div>
      <pre>
        {{ log }}
      </pre>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api";
import { trpcClient } from "../app-utils/index.js";

const link = ref<string>('http://localhost:5173/share/oEmxse-TDmz84AFR5R4nQw/ZdEkHATyq4jfr8QvIZCG_Q');
const log = ref('');

async function fetchLink() {
  try {

    "http://localhost:5173/share/oEmxse-TDmz84AFR5R4nQw/ZdEkHATyq4jfr8QvIZCG_Q";
    const segments = link.value.split('/');
    const shareId = segments.at(-2)!;
    const code = segments.at(-1)!;

    console.log('sharedId', shareId);
    console.log('code', code);
    log.value = `shareId ${shareId}, code ${code}`;
    // const args = {
    //   shareId,
    //   code
    // };
    // const result = await trpcClient.getProjectShareItems.query(args);
    const result = await trpcClient.getAllProjectShareFilesForDownload.query({
      shareId,
      shareCode: code
    });
    log.value += `\nResult\n${JSON.stringify(result, null, 2)}`;

    await invoke('download_share', { files: result.files });
  }
  catch (e: any) {
    log.value += `\nError ${e}`;
  }
}
</script>