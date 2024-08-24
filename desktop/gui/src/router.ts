import { createWebHistory, createRouter } from 'vue-router'
import DownloadLinkView from './views/DownloadLinkView.vue';
import HomeView from '@/views/HomeView.vue';
import ProjectView from "@/views/ProjectView.vue";
import LoginView from "@/views/LoginView.vue";
import TransfersView from "@/views/TransfersView.vue";
import TransferView from "@/views/TransferView.vue";

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
    path: '/project',
    name: 'project',
    component: ProjectView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/transfers',
    name: 'transfers',
    component: TransfersView
  },
  {
    path: '/transfers/:id',
    name: 'transfer',
    component: TransferView
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});