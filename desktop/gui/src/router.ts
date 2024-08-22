import { createWebHistory, createRouter } from 'vue-router'
import DownloadLinkView from './views/DownloadLinkView.vue';
import UploadView from './views/UploadView.vue';
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
  },
  {
    path: '/upload',
    name: 'upload',
    component: UploadView
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});