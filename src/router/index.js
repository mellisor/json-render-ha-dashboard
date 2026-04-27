import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView      from '../views/HomeView.vue';
import DashboardView from '../views/DashboardView.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',              component: HomeView },
    { path: '/dashboard/new', component: DashboardView },
    { path: '/dashboard/:id', component: DashboardView },
  ],
});
