import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuleService, category, rtype, rule } from '../../services/rules';
import { BehaviorSubject, combineLatest, of , Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap,  startWith, tap} from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './rules.html',
  styleUrl: './rules.css',
})
export class Rules {
  private ruleService = inject(RuleService);
  constructor(private cdr: ChangeDetectorRef) {}
  selectedRule: rule | null = null;
  saveMessage: string | null = null;
  saveMessageType: 'success' | 'error' = 'success';

  isNew = false;

  private fb = inject(FormBuilder);

  private refreshSubjectRule = new Subject<void>();
  private refreshRule$ = this.refreshSubjectRule.asObservable().pipe(startWith(void 0));
  private selectedCategoryIdSubject = new BehaviorSubject<number | null>(null);
  selectedCategoryId$ = this.selectedCategoryIdSubject.asObservable().pipe(distinctUntilChanged());
  private selectedTypeIdSubject = new BehaviorSubject<number | null>(null);
  selectedSTypeId$ = this.selectedTypeIdSubject.asObservable().pipe(distinctUntilChanged());

  form = this.fb.group({
    ruleid: [{ value: 0, disabled: true }],
    rulename: ['', Validators.required],
    categoryid: [null as number | null, Validators.required],
    typeid: [null as number | null, Validators.required],
    ruletext: ['', Validators.required],

  });

  // Filtro por categoría
  category$ = this.ruleService.getCategories().pipe(
    catchError((err) => {
      console.error('Error cargando categorías', err);
      return of<category[]>([]);
    })
  );

  onCategoryChange(rawValue: string): void {
    const v = rawValue.trim();
    this.selectedCategoryIdSubject.next(v === '' ? null : Number(v));
    this.selectedRule = null; // al filtrar, deselecciono (opcional)
    console.log(Number(v));
  }

  // Filtro por tipo
  type$ = this.ruleService.getTypes().pipe(
    catchError((err) => {
      console.error('Error cargando tipos', err);
      return of<rtype[]>([]);
    })
  );

  onTypeChange(rawValue: string): void {
    const v = rawValue.trim();
    this.selectedCategoryIdSubject.next(v === '' ? null : Number(v));
    this.selectedRule = null; // al filtrar, deselecciono (opcional)
    console.log(Number(v));
  }

  // Carga de reglas
  rules$ = combineLatest([
    this.selectedCategoryId$,
    this.selectedSTypeId$,
    this.refreshRule$
  ]).pipe(
    switchMap(([categoryId, typeId,]) =>
      this.ruleService.getRules(categoryId ?? undefined, typeId ?? undefined)
    ),
    catchError(err => {
      console.error('Error cargando reglas', err);
      return of([]);
    })
  );


  trackById(_: number, r: rule) {
    return r.ruleid;
  }

  selectRule(rule: rule) {
    this.selectedRule = rule;
    this.isNew = false;

    this.form.patchValue({
      ruleid: rule.ruleid,
      rulename: rule.rulename,
      categoryid: rule.categoryid,
      typeid: rule.typeid,
      ruletext: rule.ruletext,
    });

  };


// Nueva regla
  newRule(): void {
    this.isNew = true;
    this.selectedRule = null;

    this.form.reset({
      ruleid: 0,
      rulename: '',
      categoryid: 0,
      typeid: 0,
      ruletext: '',

    });

  }

  // Muestra los mensajes de control en el formulario
  private showMessage(msg: string, type: 'success' | 'error' = 'success') {
    this.saveMessage = msg;
    this.saveMessageType = type;

    setTimeout(() => {
      this.saveMessage = null;
      this.cdr.detectChanges();
    }, 3000); // 3 segundos
  }

  addorupdaterule(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = {
      rulename: this.form.get('rulename')!.value!,
      categoryid: this.form.get('categoryid')!.value!,
      typeid: this.form.get('typeid')!.value!,
      ruletext: this.form.get( 'ruletext')!.value!,

    };

    if (this.isNew) {
      this.ruleService.createRule(payload).pipe(
        tap(() => {
          this.isNew = false;
          this.refreshSubjectRule.next();
          this.showMessage('Regla creada correctamente');
        })
      ).subscribe();
      return;
    }

    if (!this.selectedRule) return;
    const ruleid = this.selectedRule.ruleid;

    this.ruleService.updateRule(ruleid, payload).subscribe(() => {
      this.refreshSubjectRule.next();
      this.showMessage('Regla actualizada correctamente');
    });
  }

  deleterule(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isNew) {
          this.isNew = false;
          this.refreshSubjectRule.next();
          this.showMessage('Regla descartada');
          return;
    }

    if (!this.selectedRule) return;
    const ruleid = this.selectedRule.ruleid;

    this.ruleService.deleteRule(ruleid).subscribe(() => {
      this.refreshSubjectRule.next();
      this.showMessage('Regla borrada');
    });
  }

  validaterule(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.selectedRule) return;
    const ruleid = this.selectedRule.ruleid;

    this.ruleService.validateRule(ruleid).subscribe(() => {
      this.refreshSubjectRule.next();
      this.showMessage('Proceso de validación realizado');
    });
  }


  aiPrompt: string = '';

// Llamada al LLM
  LLM(): void {
    if (!this.aiPrompt.trim()) return;
    this.ruleService.LLM(this.aiPrompt).subscribe({
      next: (sqlResult: string) => {
        // Actualizamos el editor de regla con el resultado de la llamada al LLM
        this.form.patchValue({
          ruletext: sqlResult
        });
        this.showMessage('Consulta generada por IA');
      },
      error: (err) => {
        console.error('Error generando consulta:', err);
        this.showMessage('Error al contactar con LLM', 'error');
      }
    });
  }

}
