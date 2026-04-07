import { Component, AfterViewInit, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-over-ons',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './over-ons.html',
  styleUrl: './over-ons.scss',
})
export class OverOns implements AfterViewInit {
  @ViewChildren('timelineItem') timelineItems!: QueryList<ElementRef>;

  ngAfterViewInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // Animateerverzoek stoppen zodra hij zichtbaar is
        }
      });
    }, { threshold: 0.2 }); // Trigger de animatie als 20% van het element in beeld is

    this.timelineItems.forEach(item => observer.observe(item.nativeElement));
  }
}
