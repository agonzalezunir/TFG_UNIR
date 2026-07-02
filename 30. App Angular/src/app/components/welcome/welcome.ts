import {Component, inject} from '@angular/core';
import {AppInfoService} from '../../services/appinfo';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome',
  imports: [CommonModule],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {
  private appInfo = inject(AppInfoService);
  appInfo$ = this.appInfo.getAppInfo();
}
