import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuleService, category, rtype, rule } from '../../services/rules';
import { BehaviorSubject, combineLatest, of, Subject, merge, filter } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap,  startWith, tap} from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { execService, Table, Connection, Column } from '../../services/exec';


@Component({
  selector: 'app-exec',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './exec.html',
  styleUrl: './exec.css',
})
export class Exec {
  private execService = inject(execService);
  constructor(private cdr: ChangeDetectorRef) {}

  private selectedTableSubject = new BehaviorSubject<Table | null>(null);
  selectedTable$ = this.selectedTableSubject.asObservable();
  private selectedColSubject = new BehaviorSubject<Column | null>(null);

  private selectedConnIdSubject = new BehaviorSubject<number | null>(null);
  selectedConnId$ = this.selectedConnIdSubject.asObservable().pipe(distinctUntilChanged());
  selectedConn: Connection | null = null;
  selectedTable: Table | null = null;
  selectedCol: Column | null = null;
  saveMessage: string | null = null;
  saveMessageType: 'success' | 'error' = 'success';

  private refreshSubject = new Subject<void>();
  private refresh$ = this.refreshSubject.asObservable().pipe(startWith(void 0));
  private refreshAssignedTables$ = new BehaviorSubject<void>(undefined);
  private refreshAvailableTables$ = new BehaviorSubject<void>(undefined);
  private refreshAssignedCols$ = new BehaviorSubject<void>(undefined);
  private refreshAvailableCols$ = new BehaviorSubject<void>(undefined);

  // Listado de conexiones
  conn$ = this.execService.getConnections().pipe(
    catchError((err) => {
      console.error('Error cargando conexiones', err);
      return of<Connection[]>([]);
    })
  );

  // Cambio del filtro
  onConnChange(rawValue: string): void {
    const v = rawValue.trim();
    this.selectedConnIdSubject.next(v === '' ? null : Number(v));
    this.selectedTable = null; // al filtrar, deselecciono (opcional)
  }
// Carga de tablas
  tables$ = combineLatest([
    this.selectedConnId$,
    this.refresh$
  ]).pipe(
    switchMap(([connid]) =>
      this.execService.getTables(connid ?? undefined)
    ),
    catchError(err => {
      console.error('Error cargando tablas', err);
      return of([]);
    })
  );


  // OnClick de la tabla de usuarios para seleccionar
  selectTable(table: Table) {
    this.selectedTable = table;
    this.selectedTableSubject.next(table);
  }

  trackById(_: number, t: Table) {
    return t.tableid;
  }

  tableId$ = this.selectedTableSubject.pipe(
    map(t => t?.tableid)
  );

  // Carga de reglas asignadas a la tabla
  assignedTableRules$ = combineLatest([
    this.selectedTableSubject.pipe(filter((t): t is Table => t !== null)),
    this.refreshAssignedTables$
  ]).pipe(
    switchMap(([table]) =>
      this.execService.getAssignedTableRules(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando reglas asignadas', err);
          return of([]);
        })
      )
    )
  );

  execTableRules$ = combineLatest([
    this.selectedTableSubject.pipe(filter((t): t is Table => t !== null)),
    this.refreshAssignedTables$
  ]).pipe(
    switchMap(([table]) =>
      this.execService.getExecsTable(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando historial', err);
          return of([]);
        })
      )
    )
  );

  execTableRule(rule: rule) {
    if (!this.selectedTable) return;

    const tableid = this.selectedTable.tableid;
    const ruleid = rule.ruleid;

    this.execService.execTableRule(ruleid, tableid).subscribe({
      next: () => {

        this.refreshAssignedTables$.next();
        this.refreshAvailableTables$.next();

      },
      error: (err) => console.error("Error en la ejecución", err)
    });
  }

// Carga de campos
  columns$ = this.selectedTableSubject.pipe(
    filter((table): table is Table => table !== null),
    switchMap((table) =>
      this.execService.getColumns(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando campos', err);
          return of([]);
        })
      )
    )
  );

  // OnClick de la tabla de usuarios para seleccionar
  selectCol(col: Column) {
    this.selectedCol = col;
    this.selectedColSubject.next(col);
  }

  trackByIdCol(_: number, c: Column) {
    return c.columnid;
  }

  // Carga de reglas asignadas a la tabla
  assignedColRules$ = combineLatest([
    this.selectedColSubject.pipe(filter((t): t is Column => t !== null)),
    this.refreshAssignedCols$
  ]).pipe(
    switchMap(([col]) =>
      this.execService.getAssignedColRules(col.columnid).pipe(
        catchError((err) => {
          console.error('Error cargando reglas asignadas', err);
          return of([]);
        })
      )
    )
  );

  execColRules$ = combineLatest([
    this.selectedColSubject.pipe(filter((t): t is Column => t !== null)),
    this.refreshAssignedCols$
  ]).pipe(
    switchMap(([col]) =>
      this.execService.getExecsCol(col.columnid).pipe(
        catchError((err) => {
          console.error('Error cargando historial', err);
          return of([]);
        })
      )
    )
  );

  execColRule(rule: rule) {
    if (!this.selectedCol) return;

    const columnid = this.selectedCol.columnid;
    const ruleid = rule.ruleid;

    this.execService.execColRule(ruleid, columnid).subscribe({
      next: () => {

        this.refreshAssignedCols$.next();
        this.refreshAvailableCols$.next();

      },
      error: (err) => console.error("Error en la ejecución", err)
    });
  }

}
