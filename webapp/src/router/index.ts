import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DownloadView from '../views/DownloadView.vue'
import UploadView from '../views/UploadView.vue';
import PaymentView from '../views/PaymentView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      children: [
        {
          path: '',
          name: 'upload',
          component: UploadView
        },
        {
          path: 'pay',
          name: 'pay',
          component: PaymentView
        }
      ]
    },
    {
      path: '/d/:downloadId',
      name: 'download',
      component: DownloadView
    },
  ]
})

export default router
