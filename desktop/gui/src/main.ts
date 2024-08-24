import { createApp } from 'vue'
import './style.css'
import { router } from './router';
import { store, initGlobalEventListener } from "@/app-utils";
import App from './App.vue'

initGlobalEventListener(store);

createApp(App)
  .use(router)
  .mount('#app')
