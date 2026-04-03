import { Component, inject, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { Sponsor, SponsorService } from '../diensten/sponsor';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, AsyncPipe],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  private sponsorService = inject(SponsorService);
  sponsors$: Observable<Sponsor[]> = this.sponsorService.haalAlleSponsorsOp();

  toonKnoppie = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Toon de knop pas als we meer dan 300px naar beneden zijn gescrold
    this.toonKnoppie = window.scrollY > 300;
  }

  naarBoven() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
