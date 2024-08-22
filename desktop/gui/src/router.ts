import { createWebHistory, createRouter } from 'vue-router'
import DownloadLinkView from './views/DownloadLinkView.vue';
import HomeView from '@/views/HomeView.vue';
import ProjectView from "@/views/ProjectView.vue";
import LoginView from "@/views/LoginView.vue";

const routes = [
  {
    path: '/',
    name: 'home',
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
  },
  {
    path: '/project',
    name: 'project',
    component: ProjectView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});