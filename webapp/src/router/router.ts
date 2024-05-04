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
import ProjectsView from '@/views/ProjectsView.vue';
import ProjectView from '@/views/ProjectView.vue';
import ProjectMediaView from '@/views/ProjectMediaView.vue';
import ProjectMembersView from '@/views/ProjectMembersView.vue';
import ProjectReviewLinksView from '@/views/ProjectReviewLinksView.vue';
import ProjectSettingsView from '@/views/project-settings/ProjectSettingsView.vue';
import InviteView from '@/views/InviteView.vue';
import LoginView from '@/views/auth/LoginView.vue';
import SignupView from '@/views/auth/SignupView.vue';
import PasswordResetView from '@/views/auth/PasswordResetView.vue';
import ProjectShareView from '@/views/ProjectShareView.vue';
import ProjectShareListView from "@/views/ProjectShareListView.vue";
import ProjectSharePlayerView from '@/views/ProjectSharePlayerView.vue';

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
              name: 'projects',
              component: ProjectsView
            },
            {
              path: 'upload',
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
              path: 'projects/:projectId',
              name: 'project',
              component: ProjectView,
              children: [
                {
                  path: ':folderId?',
                  name: 'project-media',
                  component: ProjectMediaView
                },
                {
                  path: 'members',
                  name: 'project-members',
                  component: ProjectMembersView
                },
                {
                  path: 'shared-links',
                  name: 'project-shared-links',
                  component: ProjectReviewLinksView
                },
                {
                  path: 'settings',
                  name: 'project-settings',
                  component: ProjectSettingsView
                }
              ]
            },
            {
              path: 'projects/:projectId/player/:mediaId',
              name: 'player',
              component: PlayerView
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
      path: '/auth/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/auth/signup',
      name: 'signup',
      component: SignupView
    },
    {
      path: '/auth/password-reset',
      name: 'password-reset',
      component: PasswordResetView
    },
    {
      path: '/d/:downloadId',
      name: 'download',
      component: DownloadView
    },
    {
      path: '/i/:inviteId',
      name: 'invite',
      component: InviteView
    },
    {
      path: '/share/:shareId/:code',
      component: ProjectShareView,
      children: [
        {
          path: ':folderId?',
          name: 'project-share',
          component: ProjectShareListView
        },
        {
          path: 'player/:mediaId',
          name: 'project-share-player',
          component: ProjectSharePlayerView
        }
      ]
    }
  ]
})

export { router }
