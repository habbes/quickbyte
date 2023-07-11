<template>
  <div class="flex flex-col min-h-screen">
    <header class="flex flex-row justify-between items-center h-20 px-4 py-7">
      <div id="logo" class="text-white text-lg relative" style="font-family: 'Orbit'">
        Quickbyte <span class="badge badge-primary font-sans text-xs relative top-[-10px] left-[-10px]">Preview</span>
      </div>
      <div v-if="user">
        <!-- Hey, {{ user.name }} -->
        <details class="dropdown dropdown-end">
          <summary class="m-1 btn btn-sm btn-ghost text-white inline-flex items-center">
            {{ user.name }}
            <div class="avatar placeholder">
              <div class="bg-primary-focus text-neutral-content rounded-full w-8">
                <span class="text-xs">{{ user.name[0] }}</span>
              </div>
            </div>
          </summary>
          <ul class="p-2 shadow menu dropdown-content z-[1] bg-base-100 rounded-box w-52">
            <li><a @click="auth.signOut()">Sign out</a></li>
          </ul>
        </details>
      </div>
    </header>
    <router-view></router-view>
  </div>
</template>
<script lang="ts" setup>
import { watch } from 'vue';
import { useUser, auth, initAuth, initUserData } from "@/app-utils";

const user = useUser();
initAuth();

watch(user, async () => {
  if (!user.value) return;

  console.log('User update, refreshing data');
  await initUserData();
});
</script>