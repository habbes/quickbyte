import { createWebHistory, createRouter } from 'vue-router'
import DownloadLinkView from './views/DownloadLinkView.vue';
import TestView from './views/TestView.vue';

const routes = [
  {
    path: '/',
    component: TestView,
  },
  {
    path: '/download',
    name: 'download',
    component: DownloadLinkView
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});