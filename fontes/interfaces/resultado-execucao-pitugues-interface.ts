import { ErroExecucaoPituguesInterface } from './erro-execucao-pitugues-interface';

export interface ResultadoExecucaoPituguesInterface {
  scriptId: string;
  origem?: string;
  sucesso: boolean;
  saida: string[];
  erros: ErroExecucaoPituguesInterface[];
  tempoMs: number;
}