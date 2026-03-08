import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // <-- 1. Importeer RouterLink

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink], // <-- 2. Voeg hem toe aan de imports!
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {}
