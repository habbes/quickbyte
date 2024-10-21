<template>
  <div class="flex flex-col fixed w-full min-h-screen text-[#9499ae] text-sm">
  <NavBarBase>
    <template #logo>
      <Logo />
    </template>
    <template #right>
      
    </template>
  </NavBarBase>
  <div class="flex flex-col mx-auto w-[700px] gap-5">
    <UiLayout class=" text-5xl font-bold text-gray-200 text-center mt-10" alignCenter>
      Faster reliable file transfers for large files
    </UiLayout>
    <UiLayout class="text-sm">
      <p>
        The <span class="font-bold">Quickbyte Transfer</span> app lets you download files from shared Quickbyte links or upload
        files directly to your projects. You don't need a Quickbyte account to download shared links. Download
        the Quickbyte Transfer app now for free.
      </p>
    </UiLayout>
    <UiLayout class="gap-2">
      <UiButton primary>Download for Mac (Apple Silicon)</UiButton>
      <UiButton primary>Download for Mac (Intel)</UiButton>
      <UiButton primary>Download for Windows</UiButton>
    </UiLayout>
  </div>
</div>
</template>
<script lang="ts" setup>
import  { UiLayout, UiButton } from "@/components/ui";
import AppShell from '@/components/AppShell.vue'
import NavBarBase from '@/components/NavBarBase.vue';
import Logo from '@/components/Logo.vue';
</script>