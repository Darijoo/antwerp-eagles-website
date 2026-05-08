import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AutoSyncService } from './diensten/auto-sync.service';
import { Firestore } from '@angular/fire/firestore';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AutoSyncService, useValue: { probeerAutomatischeSync: () => {} } },
        { provide: Firestore, useValue: {} }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the correct title', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.title()).toEqual('antwerp-eagles-website');
  });
});
