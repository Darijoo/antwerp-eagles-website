import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniformGids } from './uniform-gids';

describe('UniformGids', () => {
  let component: UniformGids;
  let fixture: ComponentFixture<UniformGids>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniformGids]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UniformGids);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
