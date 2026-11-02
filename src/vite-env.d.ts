/// <reference types="vite/client" />
interface TKGrid { w: number; h: number; get(x: number, y: number): string | null }
interface TKTheme { [k: string]: string | number }
interface TKApi {
  THEMES: Record<string, TKTheme>;
  OBJECTS: Record<string, (o?: { ticker?: string }) => TKGrid>;
  draw(ctx: CanvasRenderingContext2D, g: TKGrid, o: Record<string, unknown>): { w: number; h: number };
}
declare const TK: TKApi;
