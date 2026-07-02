import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Exec } from './exec';

describe('Exec', () => {
  let component: Exec;
  let fixture: ComponentFixture<Exec>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Exec]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Exec);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
