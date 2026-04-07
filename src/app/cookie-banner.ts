import { Component, OnInit, inject } from '@angular/core';
import { Analytics, setAnalyticsCollectionEnabled } from '@angular/fire/analytics';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.scss'
})
export class CookieBanner implements OnInit {
  toonBanner = false;
  
  // We halen Analytics op (indien beschikbaar) om het écht uit te kunnen zetten
  private analytics = inject(Analytics, { optional: true });

  ngOnInit() {
    // Controleer of de bezoeker al eerder een keuze heeft gemaakt
    const consent = localStorage.getItem('eagles_cookie_consent');
    
    if (!consent) {
      this.toonBanner = true;
      // Bij twijfel: zet tracking tijdelijk uit totdat ze akkoord gaan (Strenge AVG-regel)
      if (this.analytics) setAnalyticsCollectionEnabled(this.analytics, false);
    } else if (consent === 'rejected' && this.analytics) {
      // Zorg dat het uit blijft als ze vorige keer geweigerd hebben
      setAnalyticsCollectionEnabled(this.analytics, false);
    }
  }

  accepteer() {
    localStorage.setItem('eagles_cookie_consent', 'accepted');
    if (this.analytics) setAnalyticsCollectionEnabled(this.analytics, true); // Tracking AAN
    this.toonBanner = false;
  }

  weiger() {
    localStorage.setItem('eagles_cookie_consent', 'rejected');
    if (this.analytics) setAnalyticsCollectionEnabled(this.analytics, false); // Tracking UIT
    this.toonBanner = false;
  }
}