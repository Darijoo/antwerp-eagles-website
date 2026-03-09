import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NieuwsArtikel } from './nieuws-artikel';

describe('NieuwsArtikel', () => {
  let component: NieuwsArtikel;
  let fixture: ComponentFixture<NieuwsArtikel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NieuwsArtikel],
    }).compileComponents();

    fixture = TestBed.createComponent(NieuwsArtikel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
