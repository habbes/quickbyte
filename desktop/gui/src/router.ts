import { createWebHistory, createRouter } from 'vue-router'
import DownloadLinkView from './views/DownloadLinkView.vue';
import UploadView from './views/UploadView.vue';
import HomeView from '@/views/HomeView.vue';

const routes = [
  {
    path: '/',
    component: HomeView,
  },
  {
    path: '/download',
    name: 'download-link',
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