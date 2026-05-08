import { TestBed } from '@angular/core/testing';
import { TeamService } from './team';
import { Firestore } from '@angular/fire/firestore';

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TeamService,
        { provide: Firestore, useValue: {} }
      ]
    });
    service = TestBed.inject(TeamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
