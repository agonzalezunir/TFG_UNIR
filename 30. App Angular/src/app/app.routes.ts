import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Home } from './pages/home/home';
import { Welcome } from './components/welcome/welcome';
import { AuthGuard } from './guards/auth.guard';
import {Conf} from './pages/conf/conf';
import {Medal} from './pages/medal/medal';
import {Rules} from './pages/rules/rules';
import {Assign} from './pages/assign/assign';
import {Exec} from './pages/exec/exec';
import {Results} from './pages/results/results';


export const routes: Routes = [
  { path: '', component: Login },
  { path: 'home', component: Home,  canActivate: [AuthGuard],
    children : [
      { path: '', pathMatch: 'full', redirectTo: 'welcome' },
      { path: 'welcome', component: Welcome, canActivate: [AuthGuard] },
      { path: 'conf', component: Conf, canActivate: [AuthGuard] },
      { path: 'medal', component: Medal, canActivate: [AuthGuard] },
      { path: 'rules', component: Rules, canActivate: [AuthGuard] },
      { path: 'assign', component: Assign, canActivate: [AuthGuard] },
      { path: 'exec', component: Exec, canActivate: [AuthGuard] },
      { path: 'results', component: Results, canActivate: [AuthGuard] },
    ]
  },


];
