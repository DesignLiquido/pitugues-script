import { ResultadoAvaliadorSintaticoPituguesInterface } from './resultado-avaliador-sintatico-pitugues-interface';
import { ResultadoInterpretadorPituguesInterface } from './resultado-interpretador-pitugues-interface';
import { ResultadoLexadorPituguesInterface } from './resultado-lexador-pitugues-interface';

type Ctor<T> = new (...argumentos: unknown[]) => T;

export interface LexadorPituguesLike {
  mapear(codigo: string[], hashArquivo: number): ResultadoLexadorPituguesInterface;
}

export interface AvaliadorSintaticoPituguesLike {
  analisar(
    retornoLexador: ResultadoLexadorPituguesInterface,
    hashArquivo: number
  ): Promise<ResultadoAvaliadorSintaticoPituguesInterface>;
}

export interface InterpretadorPituguesLike {
  interpretar(declaracoes: unknown[], manterAmbiente?: boolean): Promise<ResultadoInterpretadorPituguesInterface>;
}

export interface PituguesApi {
  LexadorPitugues?: Ctor<LexadorPituguesLike>;
  AvaliadorSintaticoPitugues?: Ctor<AvaliadorSintaticoPituguesLike>;
  InterpretadorPitugues?: Ctor<InterpretadorPituguesLike>;

  Lexador?: Ctor<LexadorPituguesLike>;
  AvaliadorSintatico?: Ctor<AvaliadorSintaticoPituguesLike>;
  Interpretador?: Ctor<InterpretadorPituguesLike>;

  FuncaoPadrao?: new (valorAridade: number, funcao: (...argumentos: unknown[]) => unknown) => unknown;
}