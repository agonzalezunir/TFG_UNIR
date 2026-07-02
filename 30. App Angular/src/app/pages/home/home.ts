import { Component } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Sidebar, Header, RouterOutlet ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
