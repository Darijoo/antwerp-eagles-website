import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { Sponsor, SponsorService } from '../diensten/sponsor';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class FooterComponent {
  private sponsorService = inject(SponsorService);
  sponsors$: Observable<Sponsor[]> = this.sponsorService.haalAlleSponsorsOp();
}
