import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Medal } from './medal';

describe('Medal', () => {
  let component: Medal;
  let fixture: ComponentFixture<Medal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Medal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Medal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
