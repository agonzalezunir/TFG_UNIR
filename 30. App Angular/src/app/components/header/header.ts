import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppInfoService } from '../../services/appinfo';
import { AuthService} from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {
  private appInfo = inject(AppInfoService);
  private auth = inject(AuthService);
  appInfo$ = this.appInfo.getAppInfo();
  logout(): void {
    this.auth.logout();
  }
}
