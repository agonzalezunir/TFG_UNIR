import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { medalService, Table, Connection, medallion } from '../../services/medal';
import { BehaviorSubject, combineLatest, of, Subject, merge, filter } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap,  startWith, tap} from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-medal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './medal.html',
  styleUrl: './medal.css',
})
export class Medal {
  private medalService = inject(medalService);
  constructor(private cdr: ChangeDetectorRef) {}

  private selectedTableSubject = new BehaviorSubject<Table | null>(null);
  selectedTable$ = this.selectedTableSubject.asObservable();

  private selectedConnIdSubject = new BehaviorSubject<number | null>(null);
  selectedConnId$ = this.selectedConnIdSubject.asObservable().pipe(distinctUntilChanged());
  selectedConn: Connection | null = null;
  selectedTable: Table | null = null;
  saveMessage: string | null = null;
  saveMessageType: 'success' | 'error' = 'success';

  private refreshSubject = new Subject<void>();
  private refresh$ = this.refreshSubject.asObservable().pipe(startWith(void 0));

  // Listado de conexiones
  conn$ = this.medalService.getConnections().pipe(
    catchError((err) => {
      console.error('Error cargando conexiones', err);
      return of<Connection[]>([]);
    })
  );

  // Cambio del filtro
  onConnChange(rawValue: string): void {
    const v = rawValue.trim();
    this.selectedConnIdSubject.next(v === '' ? null : Number(v));
    this.selectedTable = null;
  }
// Carga de tablas
  tables$ = combineLatest([
    this.selectedConnId$,
    this.refresh$
  ]).pipe(
    switchMap(([connid]) =>
      this.medalService.getTables(connid ?? undefined)
    ),
    catchError(err => {
      console.error('Error cargando tablas', err);
      return of([]);
    })
  );


  // Selección de la tabla
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

// Carga de campos
  columns$ = this.selectedTableSubject.pipe(
    filter((table): table is Table => table !== null),
    switchMap((table) =>
      this.medalService.getColumns(table.tableid).pipe(
        catchError((err) => {
          console.error('Error cargando campos', err);
          return of([]);
        })
      )
    )
  );

  // Listado de medallones
  medallions$ = this.medalService.getMedallions().pipe(
    catchError((err) => {
      console.error('Error cargando conexiones', err);
      return of<medallion[]>([]);
    })
  );


  assignMedallion(t: Table, IdValue: string) {
    const Id = IdValue === '' ? null : Number(IdValue);

    this.medalService.updateTableMedallion(t.tableid, Id).subscribe({
      next: () => {
        console.log('Asignación actualizada correctamente');
      },
      error: (err) => {
        console.error('Error al asignar medallón', err);

      }
    });
  }

}
