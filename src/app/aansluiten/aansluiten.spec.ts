import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Aansluiten } from './aansluiten';

describe('Aansluiten', () => {
  let component: Aansluiten;
  let fixture: ComponentFixture<Aansluiten>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aansluiten]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Aansluiten);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
