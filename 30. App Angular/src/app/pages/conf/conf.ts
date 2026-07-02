import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfService, User, UserStatus, Connection } from '../../services/conf';
import { BehaviorSubject, combineLatest, of , Subject, merge } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap,  startWith, tap} from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-conf',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './conf.html',
  styleUrls: ['./conf.css'],
})
export class Conf {
  private confService = inject(ConfService);
  constructor(private cdr: ChangeDetectorRef) {}
  private selectedStatusIdSubject = new BehaviorSubject<number | null>(null);
  selectedStatusId$ = this.selectedStatusIdSubject.asObservable().pipe(distinctUntilChanged());
  selectedUser: User | null = null;
  selectedConn: Connection | null = null;
  saveMessage: string | null = null;
  saveMessageType: 'success' | 'error' = 'success';
  saveMessageConn: string | null = null;
  saveMessageConnType: 'success' | 'error' = 'success';

  isNew = false;
  isNewConn = false;

  private fb = inject(FormBuilder);

  private readonly STATUS_ACTIVE = 1;
  private readonly STATUS_DISABLED = 2;
  private readonly STATUS_DELETED = 3;

  private refreshSubject = new Subject<void>();
  private refresh$ = this.refreshSubject.asObservable().pipe(startWith(void 0));

  private refreshSubjectConn = new Subject<void>();
  private refreshConn$ = this.refreshSubjectConn.asObservable().pipe(startWith(void 0));

  profiles$ = this.confService.getProfiles();

  form = this.fb.group({
    userid: [{ value: 0, disabled: true }],
    username: ['', Validators.required],
    name: ['', Validators.required],
    profileid: [null as number | null, Validators.required],
    userstatus: [{ value: '', disabled: true }],
    password: ['', Validators.required],
  });


// Nuevo usuario
  newUser(): void {
    this.isNew = true;
    this.selectedUser = null;

    this.form.reset({
      userid: 0,
      username: '',
      name: '',
      profileid: null,
      userstatus: 'Activo',
      password: '',
    });


  }

  // Listado de usuarios
  users$ = merge(
    this.selectedStatusId$.pipe(map(() => void 0)),
    this.refresh$
  ).pipe(
    switchMap(() => this.selectedStatusId$.pipe(startWith(this.selectedStatusIdSubject.value))),
    switchMap((statusid) =>
      this.confService.getUsers(statusid ?? undefined).pipe(
        catchError((err) => {
          console.error('Error cargando usuarios', err);
          return of<User[]>([]);
        })
      )
    )
  );

  // Listado de posibles estados
  statuses$ = this.confService.getUsersStatuses().pipe(
    catchError((err) => {
      console.error('Error cargando estados', err);
      return of<UserStatus[]>([]);
    })
  );

  // Cambio del filtro
  onStatusChange(rawValue: string): void {
    const v = rawValue.trim();
    this.selectedStatusIdSubject.next(v === '' ? null : Number(v));
    this.selectedUser = null; // al filtrar, deselecciono (opcional)
  }

  // OnClick de la tabla de usuarios para seleccionar
  selectUser(user: User) {
    this.selectedUser = user;
    this.isNew = false;

    this.form.patchValue({
      userid: user.userid,
      username: user.username,
      name: user.name,
      profileid: user.profileid,
      userstatus: user.userstatus,
      password: user.password
    });

    console.log('isNew after click:', this.isNew);
  }

  trackById(_: number, u: User) {
    return u.userid;
  }
  // Botón de guardar datos
  saveAndActivate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = {
      username: this.form.get('username')!.value!,
      name: this.form.get('name')!.value!,
      profileid: this.form.get('profileid')!.value!,
      profilename: '',
      password: this.form.get('password')!.value!
    };

    if (this.isNew) {
      this.confService.createUser(payload).pipe(
        tap(() => {
          this.isNew = false;
          this.refreshSubject.next();
          this.showMessage('Usuario creado correctamente');
        })
      ).subscribe();
      return;
    }

    if (!this.selectedUser) return;
    const userid = this.selectedUser.userid;

    this.confService.updateUser(userid, payload).pipe(
      switchMap(() => this.confService.setUserStatus(userid, this.STATUS_ACTIVE)),
    ).subscribe(() => {
      this.refreshSubject.next();
      this.showMessage('Usuario actualizado correctamente');
    });
  }
  // Deshabilita un usuario (no permitimos borrado)
  disableUser(): void {
    if (!this.selectedUser) return;
    const userid = this.selectedUser.userid;

    this.confService.setUserStatus(userid, this.STATUS_DISABLED).pipe(
      tap(() => this.refreshSubject.next()),
    ).subscribe();
  }

  logicalDeleteUser(): void {
    if (!this.selectedUser) return;
    const userid = this.selectedUser.userid;

    this.confService.setUserStatus(userid, this.STATUS_DELETED).pipe(
      tap(() => this.refreshSubject.next()),
    ).subscribe();
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

  // Formulario de conexiones
  formconn = this.fb.group({
    connectionid: [{ value: 0, disabled: true }],
    connectionname: ['', Validators.required],
    server: ['', Validators.required],
    port: [null as number | null, Validators.required],
    database: ['', Validators.required],
    user: ['', Validators.required],
    password: ['', Validators.required],
    status: [{value:'', disabled: true}],
  });
  // Listado de conexiones
  connections$ = combineLatest([
    this.refreshConn$,
    this.refresh$
  ]).pipe(
    // switchMap cancela la petición anterior si llega un nuevo refresh$
    switchMap(([selected, _]) => {
      return this.confService.getConnections().pipe(
        catchError((err) => {
          console.error('Error cargando conexiones', err);
          return of([]);
        })
      );
    })
  );

  trackByIdConn(_: number, u: Connection) {
    return u.connectionid;
  }
  // OnClick de selección de conexiones
  selectConnection(Conn: Connection) {
    this.selectedConn = Conn;
    this.isNewConn = false;

    this.formconn.patchValue({
      connectionid: Conn.connectionid,
      connectionname: Conn.connectionname,
      server: Conn.server,
      port: Conn.port,
      database: Conn.database,
      user: Conn.user,
      password: Conn.password,
      status: Conn.status,

    });


  }

  // Nueva conexión
  newConn(): void {
    this.isNewConn = true;
    this.selectedConn = null;

    this.formconn.reset({
      connectionid: 0,
      connectionname: '',
      server: '',
      port:0,
      database: '',
      user: '',
      password: '',
    });


  }

  // Guardar conexión
  saveConnection(): void {

    if (this.formconn.invalid) {
      this.formconn.markAllAsTouched();
      this.showMessageConn('Rellene todos los campos', 'error');
      return;
    }


    const payload = {
      connectionname: this.formconn.get('connectionname')!.value!,
      server: this.formconn.get('server')!.value!,
      database: this.formconn.get('database')!.value!,
      port: this.formconn.get('port')!.value!,
      user: this.formconn.get('user')!.value!,
      password: this.formconn.get('password')!.value!
    };

    if (this.isNewConn) {
      this.confService.createConn(payload).pipe(
        tap(() => {
          this.isNewConn = false;
          this.refreshSubjectConn.next();
          this.showMessageConn('Conexión creada correctamente');
        })
      ).subscribe();
      return;
    }

    if (!this.selectedConn) return;
    const connectionid = this.selectedConn.connectionid;

    this.confService.updateConn(connectionid, payload).pipe(

    ).subscribe(() => {
      this.refreshSubjectConn.next();
      this.showMessageConn('Conexión actualizada correctamente');
    });
  }

  // Muestra los mensajes de control en el formulario de conexiones
  private showMessageConn(msg: string, type: 'success' | 'error' = 'success') {
    this.saveMessageConn = msg;
    this.saveMessageConnType = type;

    setTimeout(() => {
      this.saveMessageConn = null;
      this.cdr.detectChanges();
    }, 3000); // 3 segundos
  }

  // Borrar conexión
  deleteConnection(): void {

    if (!this.selectedConn) return;
    const connectionid = this.selectedConn.connectionid;

    this.confService.deleteConn(connectionid).pipe(

    ).subscribe(() => {
      this.selectedConn=null;
      this.refreshSubjectConn.next();
      this.showMessageConn('Conexión borrada correctamente');
    });
  }

  // Testear conexión
  testConnection(): void {
    if (!this.selectedConn) return;

    const connectionid = this.selectedConn.connectionid;

    this.confService.testConn(connectionid).subscribe({
      next: (res) => {
        if (res.ok) {
          this.showMessageConn('Conexión comprobada correctamente');
          this.selectedConn = null;
          this.refreshSubjectConn.next();
        } else {
          this.selectedConn = null;
          this.refreshSubjectConn.next();
          this.showMessageConn('Error de conexión','error');
        }
      },
      error: (err) => {
        this.showMessageConn('Error de conexión', 'error');
      }
    });
  }

  // Extracción de metadata
  extractMetadataConnection(): void {
    if (!this.selectedConn) return;

    const connectionid = this.selectedConn.connectionid;

    this.confService.extractMetadataConn(connectionid).subscribe({
      next: (res) => {
        if (res.ok) {
          this.showMessageConn('Metadata extraída correctamente');
          this.selectedConn = null;
          this.refreshSubjectConn.next();
        } else {
          this.selectedConn = null;
          this.refreshSubjectConn.next();
          this.showMessageConn('Error de conexión','error');
        }
      },
      error: (err) => {
        this.showMessageConn('Error de conexión', 'error');
      }
    });
  }

}
