// Global Ambient Type Definitions for Cloudflare Pages Functions & D1 Database

export {};

declare global {
  interface D1Result<T = any> {
    results?: T[];
    success: boolean;
    meta: any;
    error?: string;
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = any>(colName?: string): Promise<T | null>;
    all<T = any>(): Promise<D1Result<T>>;
    run<T = any>(): Promise<D1Result<T>>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec<T = any>(query: string): Promise<D1Result<T>>;
  }

  type EventContext<Env, P extends string, Data> = {
    request: Request;
    functionPath: string;
    waitUntil: (promise: Promise<any>) => void;
    next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    env: Env;
    params: Record<P, string | string[]>;
    data: Data;
  };

  type PagesFunction<
    Env = unknown,
    Params extends string = any,
    Data extends Record<string, unknown> = Record<string, unknown>
  > = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;
}
