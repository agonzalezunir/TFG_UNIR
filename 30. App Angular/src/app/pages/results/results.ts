import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuleService, category, rtype, rule } from '../../services/rules';
import { BehaviorSubject, combineLatest, of, Subject, merge, filter, take } from 'rxjs';
import { catchError, distinctUntilChanged, map, switchMap,  startWith, tap} from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { resultService, results, results_hist } from '../../services/results';
import { Connection } from '../../services/exec';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';


@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, BaseChartDirective],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class Results {
  private resultService = inject(resultService);
  constructor(private cdr: ChangeDetectorRef) {}

  private selectedCategoryIdSubject = new BehaviorSubject<number | null>(null);
  selectedCategoryId$ = this.selectedCategoryIdSubject.asObservable().pipe(distinctUntilChanged());

  ngOnInit(): void {

    this.category$.pipe(

      filter(categories => categories && categories.length > 0),
      // Sólo nos interesa la primera emisión al arrancar
      take(1)
    ).subscribe(categories => {
      const primeraCategoriaId = categories[0].categoryid;
      this.selectedCategoryIdSubject.next(primeraCategoriaId);
    });
  }

  // Listado de resultados
  results$ = this.resultService.getresults().pipe(
    catchError((err) => {
      console.error('Error cargando resultados', err);
      return of<results[]>([]);
    })
  );

  // Listado de resultados de volúmenes
  resultsvolumes$ = this.resultService.getresultsvolumes().pipe(
    catchError((err) => {
      console.error('Error cargando resultados', err);
      return of<results[]>([]);
    })
  );

  // Histórico de calidad
  resultshist$ = this.resultService.getresultshistory().pipe(
    catchError((err) => {
      console.error('Error cargando histórico', err);
      return of<results_hist[]>([]);
    })
  );

  // Histórico de volúmenes
  resultsvolumeshist$ = this.resultService.getresultsvolumeshistory().pipe(
    catchError((err) => {
      console.error('Error cargando históricos', err);
      return of<results_hist[]>([]);
    })
  );

  // Filtro por categoría
  category$ = this.resultService.getCategories().pipe(
    catchError((err) => {
      console.error('Error cargando categorías', err);
      return of<category[]>([]);
    })
  );

  // Histórico de calidad por categoría

  resultshistcat$ = this.selectedCategoryId$.pipe(
      filter((id): id is number => id !== null && !isNaN(id)),
      switchMap((id: number) =>
      this.resultService.getresultscategory(id).pipe(
        catchError((err) => {
          console.error('Error cargando el histórico por categoría', err);
          return of([]);
        })
      )
    )
  );

  resultsexeccat$ = this.selectedCategoryId$.pipe(

    filter((id): id is number => id !== null && !isNaN(id)),
    switchMap((id: number) =>
      this.resultService.getexecscategory(id).pipe(
        catchError((err) => {
          console.error('Error cargando el histórico por categoría', err);
          return of([]);
        })
      )
    )
  );

  readonly DAMA_DIMENSIONS = ['Accuracy', 'Completeness', 'Consistency', 'Validity', 'Uniqueness', 'Timeliness', 'Calidad total'];
  readonly DAMA_VOLUMES = ['Volume', 'Distinct'];
  readonly MEDALLIONS = ['Bronze', 'Silver', 'Gold'];

// Transformamos los datos planos a un formato tipo matriz
  dataMatrix$ = this.results$.pipe(
    map(results => {
      return this.DAMA_DIMENSIONS.map(dim => ({
        dimension: dim,
        values: this.MEDALLIONS.map(med => {
          const found = results.find(r => r.category === dim && r.medallion === med);
          return { medallion: med, value: found ? (found.value * 100) : 0 }; // Normalización a 0-100
        })
      }));
    })
  );

  getScoreColor(value: number): string {
    if (value < 40) return 'color-red';
    if (value < 60) return 'color-orange';
    if (value < 80) return 'color-yellow';
    return 'color-green';
  }

  dataMatrix2$ = this.resultsvolumes$.pipe(
    map(results => {
      return this.DAMA_VOLUMES.map(dim => ({
        dimension: dim,
        values: this.MEDALLIONS.map(med => {
          const found = results.find(r => r.category === dim && r.medallion === med);
          return { medallion: med, value: found ? (found.value ) : 0 };
        })
      }));
    })
  );


  // Gráficos
  chartOptions: ChartOptions = { responsive: true, maintainAspectRatio: false };

  // Transformación del histórico para el gráfico
  chartData$ = this.resultshist$.pipe(
    map(data => {
      // Obtener fechas únicas
      const labels = [...new Set(data.map(d => `${d.dia}/${d.mes}/${d.anio}`))];

      // Mapear datos por medallón
      const datasets = this.MEDALLIONS.map(m => ({
        label: m,
        data: labels.map(label => {
          const [d, m_, a_] = label.split('/').map(Number);
          return data.find(x => x.medallion === m && x.dia === d && x.mes === m_ && x.anio=== a_)?.value || 0;
        }),
        borderColor: this.getMedallionColor(m),
        tension: 0.3
      }));

      return { labels, datasets };
    })
  );

  chartDataVol$ = this.resultsvolumeshist$.pipe(
    map(data => {
      const labels = [...new Set(data.map(d => `${d.dia}/${d.mes}/${d.anio}`))];
      const datasets = this.MEDALLIONS.map(m => ({
        label: m,
        data: labels.map(label => {
          const [d, m_, a_] = label.split('/').map(Number);
          return data.find(x => x.medallion === m && x.dia === d && x.mes === m_ && x.anio===a_)?.value || 0;
        }),
        borderColor: this.getMedallionColor(m),
        tension: 0.3
      }));

      return { labels, datasets };
    })
  );

  chartDataCat$ = this.resultshistcat$.pipe(
    map(data => {
      const labels = [...new Set(data.map(d => `${d.dia}/${d.mes}/${d.anio}`))];
      const datasets = this.MEDALLIONS.map(m => ({
        label: m,
        data: labels.map(label => {
          const [d, m_, a_] = label.split('/').map(Number);
          return data.find(x => x.medallion === m && x.dia === d && x.mes === m_ && x.anio=== a_)?.value || 0;
        }),
        borderColor: this.getMedallionColor(m),
        tension: 0.3
      }));

      return { labels, datasets };
    })
  );

// Helper para colores
  getMedallionColor(medallion: string): string {
    switch(medallion) {
      case 'Gold': return '#FFD700';
      case 'Silver': return '#C0C0C0';
      case 'Bronze': return '#CD7F32';
      default: return '#000';
    }
  }

  onCategoryChange(value: string): void {
    const categoryId = value ? Number(value) : null;
    this.selectedCategoryIdSubject.next(categoryId);
  }

}
