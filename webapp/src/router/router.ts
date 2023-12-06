import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DownloadView from '../views/DownloadView.vue'
import UploadView from '../views/UploadView.vue';
import PaymentView from '../views/PaymentView.vue';
import TransactionView from '../views/TransactionView.vue';
import SettingsView from '@/views/SettingsView.vue';
import BillingView from '@/views/BillingView.vue';
import PlayerView from '@/views/PlayerView.vue';
import TransfersView from '@/views/TransfersView.vue';
import TransferView from '@/views/TransferView.vue';
import AppView from '@/views/AppView.vue';

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
          name: 'appHome',
          component: AppView,
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
            },
            {
              path: 'transaction/:transactionId',
              name: 'transaction',
              component: TransactionView
            },
            {
              path: 'transfers',
              name: 'transfers',
              component: TransfersView
            },
            {
              path: 'transfers/:transferId',
              name: 'transfer',
              component: TransferView
            },
            {
              path: 'settings',
              name: 'settings',
              component: SettingsView,
              children: [
                {
                  path: 'billing',
                  name: 'billing',
                  component: BillingView
                }
              ]
            }
          ]
        }
      ]
    },
    {
      path: '/d/:downloadId',
      name: 'download',
      component: DownloadView
    },
    {
      path: '/player/:downloadId',
      name: 'player',
      component: PlayerView
    }
  ]
})

export { router }
