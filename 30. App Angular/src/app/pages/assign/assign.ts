import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuleService, category, rtype, rule } from '../../services/rules';
import { BehaviorSubject, combineLatest, of, Subject, merge, filter } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap,  startWith, tap} from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { assignService, Table, Connection, Column } from '../../services/assign';

@Component({
  selector: 'app-assign',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assign.html',
  styleUrl: './assign.css',
})
export class Assign {
  private assignService = inject(assignService);
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
  conn$ = this.assignService.getConnections().pipe(
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
      this.assignService.getTables(connid ?? undefined)
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
      this.assignService.getAssignedTableRules(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando reglas asignadas', err);
          return of([]);
        })
      )
    )
  );

// Carga de reglas disponibles a la tabla
  availableTableRules$ = combineLatest([
    this.selectedTableSubject.pipe(filter((t): t is Table => t !== null)),
    this.refreshAvailableTables$
  ]).pipe(
    switchMap(([table]) =>
      this.assignService.getAvailableTableRules(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando reglas disponibles', err);
          return of([]);
        })
      )
    )
  );

  assignTableRule(rule: rule) {
    if (!this.selectedTable) return;

    const tableid = this.selectedTable.tableid;
    const ruleid = rule.ruleid;

    this.assignService.assignToTable(tableid, ruleid).subscribe({
      next: () => {

        this.refreshAssignedTables$.next();
        this.refreshAvailableTables$.next();

      },
      error: (err) => console.error("Error en la asignación", err)
    });
  }

  deassignTableRule(rule: rule) {
    if (!this.selectedTable) return;

    const tableid = this.selectedTable.tableid;
    const ruleid = rule.ruleid;

    this.assignService.deassignFromTable(tableid, ruleid).subscribe({
      next: () => {

        this.refreshAssignedTables$.next();
        this.refreshAvailableTables$.next();

      },
      error: (err) => console.error("Error en la desasignación", err)
    });
  }

// Carga de campos
  columns$ = this.selectedTableSubject.pipe(
    filter((table): table is Table => table !== null),
    switchMap((table) =>
      this.assignService.getColumns(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando campos', err);
          return of([]);
        })
      )
    )
  );

  // OnClick de la tabla de campos para seleccionar
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
      this.assignService.getAssignedColRules(col.columnid).pipe(
        catchError((err) => {
          console.error('Error cargando reglas asignadas', err);
          return of([]);
        })
      )
    )
  );

// Carga de reglas disponibles a la tabla
  availableColRules$ = combineLatest([
    this.selectedColSubject.pipe(filter((t): t is Column => t !== null)),
    this.refreshAvailableCols$
  ]).pipe(
    switchMap(([col]) =>
      this.assignService.getAvailableColRules(col.columnid).pipe(
        catchError((err) => {
          console.error('Error cargando reglas disponibles', err);
          return of([]);
        })
      )
    )
  );

  assignColRule(rule: rule) {
    if (!this.selectedCol) return;

    const columnid = this.selectedCol.columnid;
    const ruleid = rule.ruleid;

    this.assignService.assignToCol(columnid, ruleid).subscribe({
      next: () => {

        this.refreshAssignedCols$.next();
        this.refreshAvailableCols$.next();

      },
      error: (err) => console.error("Error en la asignación", err)
    });
  }

  deassignColRule(rule: rule) {
    if (!this.selectedCol) return;

    const columnid = this.selectedCol.columnid;
    const ruleid = rule.ruleid;

    this.assignService.deassignFromCol(columnid, ruleid).subscribe({
      next: () => {

        this.refreshAssignedCols$.next();
        this.refreshAvailableCols$.next();

      },
      error: (err) => console.error("Error en la desasignación", err)
    });
  }

}
