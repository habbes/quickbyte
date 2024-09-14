import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './style.css'
import { router } from './router';
import { store, initGlobalEventListener } from "@/app-utils";
import App from './App.vue'

initGlobalEventListener(store);

createApp(App)
  .use(VueQueryPlugin)
  .use(router)
  .mount('#app')
