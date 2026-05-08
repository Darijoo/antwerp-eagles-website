import { TestBed } from '@angular/core/testing';
import { NieuwsService } from './nieuws';
import { Firestore } from '@angular/fire/firestore';

describe('NieuwsService', () => {
  let service: NieuwsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NieuwsService,
        { provide: Firestore, useValue: {} }
      ]
    });
    service = TestBed.inject(NieuwsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
