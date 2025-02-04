import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MODEL_SCHEMA, TABLES } from '../enum/schema.enum';
import { v4 as uuidv4 } from 'uuid';
import { Observable, BehaviorSubject, from, map, catchError, of } from 'rxjs';
import supabase from './supabase-client';
const prefix = '';

@Injectable({
  providedIn: 'root',
})
export class DBHelper {
  private supabase: SupabaseClient = supabase;
  private subscriptions: Map<string, BehaviorSubject<any>> = new Map();

  /**
   * Genera un ID único
   * @returns ID único
   */
  generateId(): string {
    return uuidv4();
  }

  /**
   * Crea un documento en una tabla específica
   * @param collection - Nombre de la tabla
   * @param id - ID del documento
   * @param data - Datos del documento
   * @returns Promise con los datos del documento creado
   */
  async createDocument<T extends TABLES>({
    collection,
    id,
    data,
  }: {
    collection: T;
    id?: string;
    data: MODEL_SCHEMA[T];
  }): Promise<MODEL_SCHEMA[T]> {
    id = id || data.id || this.generateId();
    const { data: createdData, error } = await this.supabase
      .from(prefix + collection)
      .insert([{ ...data, id }])
      .single();

    if (error) throw new Error(error.message);
    return { ...(createdData as MODEL_SCHEMA[T]), id };
  }

  /**
   * Actualiza un documento en una tabla específica
   * @param collection - Nombre de la tabla
   * @param id - ID del documento
   * @param data - Datos del documento
   * @returns Promise con los datos actualizados
   */
  async updateDocument<T extends TABLES>({
    collection,
    id,
    data,
  }: {
    collection: T;
    id: string;
    data: Partial<MODEL_SCHEMA[T]>;
  }): Promise<{ data?: Partial<MODEL_SCHEMA[T]>; error?: any }> {
    const { data: updatedData, error } = await this.supabase
      .from(prefix + collection)
      .update(data)
      .match({ id })
      .single();

    return { data: updatedData as unknown as Partial<MODEL_SCHEMA[T]>, error };
  }

  /**
   * Obtiene un documento por su ID
   * @param collection - Nombre de la tabla
   * @param id - ID del documento
   * @returns Promise con el documento o null si no existe
   */
  async getDocumentById<T extends TABLES>({
    collection,
    id,
  }: {
    collection: T;
    id: string;
  }): Promise<MODEL_SCHEMA[T] | null> {
    const { data, error } = await this.supabase
      .from(prefix + collection)
      .select('*')
      .eq('id', id)
      .single();

    return error ? null : (data as MODEL_SCHEMA[T]);
  }

  getDocumentById$<T extends TABLES>({
    collection,
    id,
  }: {
    collection: T;
    id: string;
  }): Observable<MODEL_SCHEMA[T] | null> {
    return from(
      this.supabase
        .from(prefix + collection)
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Error fetching document:', error);
          return null;
        }
        return data as MODEL_SCHEMA[T];
      }),
      catchError((error) => {
        console.error('Error in getDocumentById$:', error);
        return of(null);
      })
    );
  }

  /**
   * Elimina un documento de una tabla específica
   * @param collection - Nombre de la tabla
   * @param id - ID del documento
   * @returns Promise vacía
   */
  async deleteDocument<T extends TABLES>({
    collection,
    id,
  }: {
    collection: T;
    id: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from(prefix + collection)
      .delete()
      .match({ id });

    if (error) throw new Error(error.message);
  }

  /**
   * Obtener listado dinámico basado en condiciones y opciones
   * @param where Array de condiciones [{ field: string, condition: any, value: any }]
   * @param opts Opciones adicionales { orderBy: [], limit: number }
   * @returns Promise con la lista de documentos
   */
  async getDynamic<T extends TABLES>({
    collection,
    where = [],
    opts = {},
  }: {
    collection: T;
    where?: { field: string; condition: any; value: any }[];
    opts?: {
      orderBy?: { field: string; order: 'asc' | 'desc' }[];
      limit?: number;
    };
  }): Promise<MODEL_SCHEMA[T][]> {
    let query = this.supabase.from(prefix + collection).select('*');

    // Aplicar filtros dinámicos
    where.forEach(({ field, condition, value }) => {
      switch (condition) {
        case '==':
          query = query.eq(field, value);
          break;
        case '!=':
          query = query.neq(field, value);
          break;
        case '>':
          query = query.gt(field, value);
          break;
        case '<':
          query = query.lt(field, value);
          break;
        case '>=':
          query = query.gte(field, value);
          break;
        case '<=':
          query = query.lte(field, value);
          break;
        case 'like':
          query = query.like(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        case 'is':
          query = query.is(field, value);
          break;
        default:
          console.warn(`Condición desconocida: ${condition}`);
          break;
      }
    });

    // Ordenar los resultados
    if (opts.orderBy) {
      opts.orderBy.forEach((order) => {
        query = query.order(order.field, { ascending: order.order === 'asc' });
      });
    }

    // Limitar los resultados
    if (opts.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  getDynamic$<T extends TABLES>({
    subscriptionId,
    collection,
    where = [],
    opts = {},
  }: {
    subscriptionId?: string;
    collection: T;
    where?: { field: string; condition: any; value: any }[];
    opts?: {
      orderBy?: { field: string; order: 'asc' | 'desc' }[];
      limit?: number;
    };
  }): Observable<MODEL_SCHEMA[T][]> {
    const queryKey = `${subscriptionId || ''}-${collection}-${JSON.stringify(
      where
    )}-${JSON.stringify(opts)}`;

    if (this.subscriptions.has(queryKey)) {
      return this.subscriptions.get(queryKey)?.asObservable()!;
    }

    const dataSubject = new BehaviorSubject<MODEL_SCHEMA[T][]>([]);

    // Ejecutar la consulta inicial de manera asíncrona
    const fetchInitialData = async () => {
      try {
        let query = this.supabase.from(prefix + collection).select('*');

        where.forEach(({ field, condition, value }) => {
          switch (condition) {
            case '==':
              query = query.eq(field, value);
              break;
            case '!=':
              query = query.neq(field, value);
              break;
            case '>':
              query = query.gt(field, value);
              break;
            case '<':
              query = query.lt(field, value);
              break;
            case '>=':
              query = query.gte(field, value);
              break;
            case '<=':
              query = query.lte(field, value);
              break;
            case 'like':
              query = query.like(field, value);
              break;
            case 'in':
              query = query.in(field, value);
              break;
            case 'is':
              query = query.is(field, value);
              break;
            default:
              console.warn(`Condición desconocida: ${condition}`);
              break;
          }
        });

        if (opts.orderBy) {
          opts.orderBy.forEach((order) => {
            query = query.order(order.field, {
              ascending: order.order === 'asc',
            });
          });
        }

        if (opts.limit) {
          query = query.limit(opts.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error en la consulta inicial:', error);
          dataSubject.error(error);
          return;
        }

        console.log('Datos iniciales recibidos:', data);
        dataSubject.next(data || []);
      } catch (err) {
        console.error('Error en fetchInitialData:', err);
        dataSubject.error(err);
      }
    };

    // Ejecutar la consulta inicial
    fetchInitialData();

    // Configurar la suscripción en tiempo real
    const channel = this.supabase
      .channel(`table_changes-${queryKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: prefix + collection,
        },
        async (payload: any) => {
          console.log('Cambio en tiempo real detectado:', payload);
          // Recargar los datos completos para mantener la consistencia
          await fetchInitialData();
        }
      )
      .subscribe((status) => {
        console.log(`Supabase channel status: ${status}`);
      });

    // Almacenar la suscripción
    this.subscriptions.set(queryKey, dataSubject);

    // Retornar Observable con limpieza
    return new Observable<MODEL_SCHEMA[T][]>((observer) => {
      const subscription = dataSubject.subscribe(observer);

      return () => {
        console.log('Limpiando suscripción:', queryKey);
        channel.unsubscribe();
        subscription.unsubscribe();
        this.subscriptions.delete(queryKey);
      };
    });
  }

  /**
   * Obtiene datos con joins entre tablas
   * @param collection Tabla principal
   * @param joins Configuración de joins
   * @param where Condiciones de filtrado
   * @param opts Opciones adicionales
   */
  async getWithJoins<T extends TABLES>({
    collection,
    joins,
    where = [],
    opts = {},
  }: {
    collection: T;
    joins: {
      table: TABLES;
      on: { foreignKey: string; primaryKey: string };
      fields?: string[];
    }[];
    where?: { field: string; condition: any; value: any }[];
    opts?: {
      orderBy?: { field: string; order: 'asc' | 'desc' }[];
      limit?: number;
    };
  }) {
    // Construir la consulta select con los joins
    const selectQuery = `*, ${joins
      .map((join) => {
        const fields = join.fields ? join.fields.join(', ') : '*';
        return `${join.on.foreignKey}:${join.table}(${fields})`;
      })
      .join(', ')}`;

    let query = this.supabase.from(prefix + collection).select(selectQuery);

    // Aplicar filtros
    where.forEach(({ field, condition, value }) => {
      switch (condition) {
        case '==':
          query = query.eq(field, value);
          break;
        case '!=':
          query = query.neq(field, value);
          break;
        case '>':
          query = query.gt(field, value);
          break;
        case '<':
          query = query.lt(field, value);
          break;
        case '>=':
          query = query.gte(field, value);
          break;
        case '<=':
          query = query.lte(field, value);
          break;
        case 'like':
          query = query.like(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        case 'is':
          query = query.is(field, value);
          break;
      }
    });

    // Aplicar ordenamiento
    if (opts.orderBy) {
      opts.orderBy.forEach((order) => {
        query = query.order(order.field, { ascending: order.order === 'asc' });
      });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  getWithJoins$<T extends TABLES>({
    subscriptionId,
    collection,
    joins,
    where = [],
    opts = {},
  }: {
    subscriptionId?: string;
    collection: T;
    joins: {
      table: TABLES;
      on: { foreignKey: string; primaryKey: string };
      fields?: string[];
    }[];
    where?: { field: string; condition: any; value: any }[];
    opts?: {
      orderBy?: { field: string; order: 'asc' | 'desc' }[];
      limit?: number;
    };
  }): Observable<any[]> {
    const queryKey = `${subscriptionId || ''}-${collection}-${JSON.stringify(
      joins
    )}-${JSON.stringify(where)}-${JSON.stringify(opts)}`;

    if (this.subscriptions.has(queryKey)) {
      return this.subscriptions.get(queryKey)?.asObservable()!;
    }

    const dataSubject = new BehaviorSubject<any[]>([]);

    // Construir la consulta select con los joins
    const selectQuery = `*, ${joins
      .map((join) => {
        const fields = join.fields ? join.fields.join(', ') : '*';
        return `${join.on.foreignKey}:${join.table}(${fields})`;
      })
      .join(', ')}`;

    // Log para debugging
    console.log('Query construido:', selectQuery);
    console.log('Filtros:', where);

    let query = this.supabase.from(prefix + collection).select(selectQuery);

    // Aplicar filtros
    where.forEach(({ field, condition, value }) => {
      switch (condition) {
        case '==':
          query = query.eq(field, value);
          break;
        case '!=':
          query = query.neq(field, value);
          break;
        case '>':
          query = query.gt(field, value);
          break;
        case '<':
          query = query.lt(field, value);
          break;
        case '>=':
          query = query.gte(field, value);
          break;
        case '<=':
          query = query.lte(field, value);
          break;
        case 'like':
          query = query.like(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        case 'is':
          query = query.is(field, value);
          break;
      }
    });

    // Aplicar ordenamiento
    if (opts.orderBy) {
      opts.orderBy.forEach((order) => {
        query = query.order(order.field, { ascending: order.order === 'asc' });
      });
    }

    // Modificar la ejecución de la consulta
    const fetchData = async () => {
      try {
        console.log('Ejecutando consulta con parámetros:', {
          collection,
          joins,
          where,
          opts,
          selectQuery,
        });

        const { data, error } = await query;
        if (error) {
          console.error('Error en la consulta:', error);
          dataSubject.error(error);
          return;
        }

        console.log(`Datos recibidos para ${collection}:`, data);

        if (!data || data.length === 0) {
          console.warn(
            `No se encontraron datos para la consulta en ${collection}`
          );
        }

        dataSubject.next(data || []);
      } catch (err) {
        console.error('Error inesperado en getWithJoins$:', err);
        dataSubject.error(err);
      }
    };

    // Ejecutar consulta inicial
    fetchData();

    // Modificar la suscripción al canal
    const channel = this.supabase
      .channel(`joins_changes-${queryKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: collection },
        async () => {
          await fetchData();
        }
      )
      .subscribe((status) => {
        console.log(`Estado del canal: ${status}`);
      });

    this.subscriptions.set(queryKey, dataSubject);

    return new Observable((observer) => {
      const subscription = dataSubject.subscribe({
        next: (data) => observer.next(data),
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });

      return () => {
        channel.unsubscribe();
        subscription.unsubscribe();
        this.subscriptions.delete(queryKey);
      };
    });
  }
}
