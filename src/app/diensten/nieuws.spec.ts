import { TestBed } from '@angular/core/testing';

import { Nieuws } from './nieuws';

describe('Nieuws', () => {
  let service: Nieuws;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Nieuws);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
