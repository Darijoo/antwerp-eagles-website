import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface NieuwsBericht {
  id: number;
  datum: string;
  titel: string;
  volledigeTekst: string; // Hier is de tekst veel langer!
}

@Component({
  selector: 'app-nieuws-artikel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nieuws-artikel.html',
  styleUrl: './nieuws-artikel.scss',
})
export class NieuwsArtikel implements OnInit {
  route = inject(ActivatedRoute); // Dit helpt ons de URL te lezen
  actueelBericht: NieuwsBericht | undefined;

  // We zetten de data hier even opnieuw in, maar dan met de volledige tekst.
  // (Later, met een CMS, haal je dit allemaal uit je database!)
  alleNieuws: NieuwsBericht[] = [
    {
      id: 1,
      datum: '13 Jan 2026',
      titel: 'Baseball try-outs U12 en U15',
      volledigeTekst:
        'Ben je 9 tot 15 jaar oud en wil je graag baseball uitproberen? Dan kan je blijvend deelnemen aan de try-outs tijdens onze indoor jeugdtrainingen in sporthal Koninklijk Atheneum Berchem. Neem je sportkleren mee en wij zorgen voor de handschoenen en knuppels! Voor meer info, stuur een mailtje naar de jeugdcoördinator.',
    },
    {
      id: 2,
      datum: '5 Dec 2025',
      titel: 'Aansluitingsaanvraag 2026',
      volledigeTekst:
        'Beste leden, de licenties van dit jaar vervallen op 31 december. Je bent enkel speelgerechtigd en verzekerd indien je een geldige licentie voor het lopende kalenderjaar hebt. Gebruik het online formulier voor je aanvraag. Let wel: je licentie wordt pas verwerkt wanneer zowel het ingevulde formulier als de betaling zijn ontvangen.',
    },
    {
      id: 3,
      datum: '8 Sep 2025',
      titel: 'Antwerp Eagles BD3-A promoveert!',
      volledigeTekst:
        'Het Antwerp Eagles A-team baseball heeft zich op zaterdag met een overtuigende overwinning uit tegen Zottegem Bebops verzekerd van promotie naar Division 2. Dit is de 2e promotie op rij, na het behalen van de divisie titel vorig jaar. Een gigantisch applaus voor coach Oscar Riera en alle spelers!',
    },
  ];

  ngOnInit() {
    // 1. Haal het ID uit de adresbalk (bijv. de '1' uit /nieuws/1)
    const idUitUrl = Number(this.route.snapshot.paramMap.get('id'));

    // 2. Zoek het bericht in onze lijst dat ditzelfde ID heeft
    this.actueelBericht = this.alleNieuws.find((bericht) => bericht.id === idUitUrl);
  }
}
