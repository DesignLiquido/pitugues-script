import { ScriptType } from '../tipos';
import { ResultadoExecucaoPituguesInterface } from './resultado-execucao-pitugues-interface';

export interface OpcoesTempoExecucaoPituguesInterface {
  ids?: string[];
  tiposDeScript?: ScriptType[];
  autoIniciar?: boolean;
  saida?: (texto: string, info: { scriptId: string }) => void;
  aoIniciarScript?: (info: { scriptId: string; origem?: string }) => void;
  aoFinalizarScript?: (resultado: ResultadoExecucaoPituguesInterface) => void;
}