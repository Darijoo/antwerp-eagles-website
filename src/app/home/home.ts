import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// 1. De blauwdruk voor een nieuwsbericht
interface NieuwsBericht {
  id: number;
  datum: string;
  titel: string;
  samenvatting: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  // 2. Ons test-lijstje met nieuws (dit komt later uit je CMS!)
  laatsteNieuws: NieuwsBericht[] = [
    {
      id: 1,
      datum: '13 Jan 2026',
      titel: 'Baseball try-outs U12 en U15',
      samenvatting:
        'Ben je 9 tot 15 jaar oud en wil je graag baseball uitproberen? Doe mee aan onze indoor jeugdtrainingen in sporthal Koninklijk Atheneum Berchem.',
    },
    {
      id: 2,
      datum: '5 Dec 2025',
      titel: 'Aansluitingsaanvraag 2026',
      samenvatting:
        'De licenties van vorig jaar zijn vervallen. Vraag nu je nieuwe licentie voor het huidige seizoen aan via het online formulier.',
    },
    {
      id: 3,
      datum: '8 Sep 2025',
      titel: 'Antwerp Eagles BD3-A promoveert!',
      samenvatting:
        'Het Antwerp Eagles A-team heeft zich met een overtuigende overwinning verzekerd van promotie naar Division 2. Proficiat aan het team!',
    },
  ];
}
