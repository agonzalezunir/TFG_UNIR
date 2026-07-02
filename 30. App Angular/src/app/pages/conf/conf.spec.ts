import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Conf } from './conf';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';

describe('Conf', () => {
  let component: Conf;
  let fixture: ComponentFixture<Conf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Conf, CommonModule, ReactiveFormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Conf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
