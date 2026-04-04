import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UniformService, UniformOnderdeel } from '../diensten/uniform';

@Component({
  selector: 'app-uniform-gids',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './uniform-gids.html',
  styleUrl: './uniform-gids.scss',
})
export class UniformGids implements OnInit {
  private uniformService = inject(UniformService);
  private cdr = inject(ChangeDetectorRef);

  onderdelen: UniformOnderdeel[] = [];
  geselecteerdOnderdeel: UniformOnderdeel | null = null;

  ngOnInit() {
    this.uniformService.haalAlleOnderdelenOp().subscribe((data) => {
      this.onderdelen = data;
      // Selecteer standaard het eerste item als de lijst is geladen
      if (data.length > 0 && !this.geselecteerdOnderdeel) {
        this.geselecteerdOnderdeel = data[0];
      }
      this.cdr.detectChanges();
    });
  }

  selecteerOnderdeel(onderdeel: UniformOnderdeel) {
    this.geselecteerdOnderdeel = onderdeel;
  }
}
