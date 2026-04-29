import {
  AvaliadorSintaticoPituguesLike,
  ErroExecucaoPituguesInterface,
  ImportacaoDomResolvida,
  InformacaoElementoSintaticoSimplificada,
  InterpretadorPituguesLike,
  LexadorPituguesLike,
  OpcoesPituguesScriptInterface,
  OpcoesTempoExecucaoPituguesInterface,
  PituguesApi,
  ResultadoExecucaoPituguesInterface,
} from './interfaces';
import { ScriptType } from './tipos';

declare global {
  interface Window {
    Delegua: PituguesApi;
    __PITUGUES__?: PituguesTempoExecucaoNavegador;
    pitugues?: (options?: OpcoesTempoExecucaoPituguesInterface) => Promise<ResultadoExecucaoPituguesInterface[]>;
  }
}

export function normalizarCodigoParaLinhas(codigo: string): string[] {
  return codigo.split(/\r\n|\r|\n/);
}

export function extrairMensagemErro(erro: unknown): string {
  if (erro instanceof Error) {
    return erro.message;
  }

  if (typeof erro === 'string') {
    return erro;
  }

  try {
    return JSON.stringify(erro);
  } catch {
    return 'Erro desconhecido';
  }
}

export function extrairImportacoesDeDom(
	codigo: string
): ImportacaoDomResolvida {
	const simbolosImportados = new Set<string>();
	const regexImportacao = /importar\s*\{([\s\S]+?)\}\s*de\s+dom\s*;?/gi;

	const codigoSemImportacoes = codigo.replace(
		regexImportacao,
		(match, simbolosMatch) => {
			const listaDeSimbolos = simbolosMatch
				.split(',')
				.map((s: string) => s.trim())
				.filter(Boolean);

			for (const simbolo of listaDeSimbolos) {
				simbolosImportados.add(simbolo);
			}

			const quebras = (match.match(/\n/g) ?? []).length;

			return '\n'.repeat(quebras);
		}
	);

  return {
    codigoSemImportacoes,
    simbolosImportados: [...simbolosImportados],
  };
}

export function criarDescritoresSintaticosDom(): Record<string, InformacaoElementoSintaticoSimplificada> {
  return {
    bind: {
      nome: 'bind',
      tipo: 'qualquer',
      subElementos: [
        { nome: 'alvo', tipo: 'qualquer' },
        { nome: 'evento', tipo: 'texto' },
        { nome: 'callback', tipo: 'função' },
      ],
    },
    document: {
      nome: 'document',
      tipo: 'qualquer',
      subElementos: [],
    },
    alert: {
      nome: 'alert',
      tipo: 'qualquer',
      subElementos: [{ nome: 'mensagem', tipo: 'qualquer' }],
    },
  };
}

export function registrarImportacoesDeDomNoAvaliador(avaliadorSintatico: unknown, simbolosImportados: string[]): void {
  if (simbolosImportados.length === 0) {
    return;
  }

  const avaliador = avaliadorSintatico as {
    inicializarPilhaEscopos?: () => void;
    pilhaEscopos?: {
      definirInformacoesVariavel: (nome: string, informacoes: InformacaoElementoSintaticoSimplificada) => void;
    };
  };

  const inicializadorOriginal = avaliador.inicializarPilhaEscopos;
  if (typeof inicializadorOriginal !== 'function') {
    throw new Error('Avaliador sintatico nao expoe inicializarPilhaEscopos().');
  }

  const descritoresDom = criarDescritoresSintaticosDom();

  avaliador.inicializarPilhaEscopos = function inicializarPilhaEscoposComDom(this: typeof avaliador) {
    inicializadorOriginal.call(this);

    if (!this.pilhaEscopos?.definirInformacoesVariavel) {
      throw new Error('Avaliador sintatico nao expoe pilhaEscopos.definirInformacoesVariavel().');
    }

    for (const simboloImportado of simbolosImportados) {
      if (!(simboloImportado in descritoresDom)) {
        throw new Error(`Simbolo '${simboloImportado}' nao existe no modulo dom.`);
      }

      this.pilhaEscopos.definirInformacoesVariavel(simboloImportado, descritoresDom[simboloImportado]);
    }
  };
}

class PituguesTempoExecucaoNavegador {
  private readonly tiposScriptsPadrao: ScriptType[] = ['text/pitugues', 'texto/pitugues', 'application/pitugues'];
  private opcoes: OpcoesTempoExecucaoPituguesInterface = {};
  private contadorScripts = 0;
  private iniciado = false;

  public quandoPronto: Promise<void>;
  private resolucaoPronta!: () => void;

  constructor() {
    this.quandoPronto = new Promise<void>((resolve) => {
      this.resolucaoPronta = resolve;
    });
  }

  public configurar(opcoes?: OpcoesTempoExecucaoPituguesInterface): void {
    this.opcoes = {
      ...this.opcoes,
      ...opcoes,
    };
  }

	public async executar(
		opcoes?: OpcoesTempoExecucaoPituguesInterface
	): Promise<ResultadoExecucaoPituguesInterface[]> {
    this.configurar(opcoes);

    if (!window.Delegua) {
      throw new Error('window.Delegua nao encontrado. Carregue o UMD da Delegua antes de pitugues-script.');
    }

		const elementosDeScript = this.coletarElementosDeScript();
		const promessasDeFetch = elementosDeScript.map(
			script => this.preCarregarScript(script).catch((erro) => ({
				codigo: null,
				idScript: script.id || '__pitugues__desconhecido__',
				hashArquivo: 0,
				origem: script.src || undefined,
				erroRetorno: {
					scriptId: script.id || '__pitugues__desconhecido__',
					origem: script.src || undefined,
					sucesso: false,
					saida: [] as string[],
					erros: [{
						etapa: 'carregamento' as const,
						mensagem: 'Falha inesperada no pre-carregamento.',
						detalhe: extrairMensagemErro(erro),
					}],
					tempoMs: 0,
				}
			}))
		);
    const resultados: ResultadoExecucaoPituguesInterface[] = [];

    for (const promessa of promessasDeFetch) {
      const resultado = await this.executarCodigoPreCarregado(await promessa);
      resultados.push(resultado);
      this.opcoes.aoFinalizarScript?.(resultado);
    }

    this.iniciado = true;
    this.resolucaoPronta();
    return resultados;
  }

  public async executarCodigo(
    codigo: string,
    opcoes?: OpcoesPituguesScriptInterface
  ): Promise<ResultadoExecucaoPituguesInterface> {
    this.configurar();

    if (!window.Delegua) {
      throw new Error('window.Delegua nao encontrado. Carregue o UMD da Delegua antes de pitugues-script.');
    }

    const idScript = opcoes?.id ?? this.proximoIdScript();
    const hashArquivo = opcoes?.hashArquivo ?? Date.now();
    return this.executarCodigoFonte(codigo, idScript, hashArquivo);
  }

  private coletarElementosDeScript(): HTMLScriptElement[] {
    const tiposDeScript = this.opcoes.tiposDeScript ?? this.tiposScriptsPadrao;
    const seletor = tiposDeScript.map((tipo) => `script[type=\"${tipo}\"]`).join(', ');
    const encontrados = Array.from(document.querySelectorAll<HTMLScriptElement>(seletor));

    if (!this.opcoes.ids || this.opcoes.ids.length === 0) {
      return encontrados;
    }

    const ids = new Set(this.opcoes.ids);
    return encontrados.filter((elemento) => !!elemento.id && ids.has(elemento.id));
	}

	private async preCarregarScript(script: HTMLScriptElement): Promise<{
    codigo: string | null;
    idScript: string;
    hashArquivo: number;
    origem?: string;
    erroRetorno?: ResultadoExecucaoPituguesInterface;
  }> {
		const indice = this.contadorScripts++;
		const idScript = script.id || (indice === 0
			? '__pitugues__main__'
			: `__pitugues__main__${indice}`
		)
    const hashArquivo = Date.now() + indice;

    this.opcoes.aoIniciarScript?.({
      scriptId: idScript,
      origem: script.src || undefined,
    });

    if (script.src) {
      try {
        const resposta = await fetch(script.src);
        if (!resposta.ok) {
          return {
            codigo: null,
            idScript,
            hashArquivo,
            origem: script.src,
            erroRetorno: {
              scriptId: idScript,
              origem: script.src,
              sucesso: false,
              saida: [],
              erros: [
                {
                  etapa: 'carregamento',
                  mensagem: `Falha ao carregar script remoto (${resposta.status} ${resposta.statusText}).`,
                },
              ],
              tempoMs: 0,
            },
          };
        }

				const codigoRemoto = await resposta.text();

				return {
					codigo: codigoRemoto, idScript, hashArquivo, origem: script.src
				};
      } catch (erro) {
        return {
          codigo: null,
          idScript,
          hashArquivo,
          origem: script.src,
          erroRetorno: {
            scriptId: idScript,
            origem: script.src,
            sucesso: false,
            saida: [],
            erros: [
              {
                etapa: 'carregamento',
                mensagem: 'Erro ao carregar script remoto.',
                detalhe: extrairMensagemErro(erro),
              },
            ],
            tempoMs: 0,
          },
        };
      }
    }

    return {
      codigo: script.textContent ?? '',
      idScript,
      hashArquivo,
      origem: undefined,
    };
  }

  private async executarCodigoPreCarregado(preCarregado: {
    codigo: string | null;
    idScript: string;
    hashArquivo: number;
    origem?: string;
    erroRetorno?: ResultadoExecucaoPituguesInterface;
  }): Promise<ResultadoExecucaoPituguesInterface> {
    if (preCarregado.erroRetorno) {
      return preCarregado.erroRetorno;
		}

    return this.executarCodigoFonte(
      preCarregado.codigo || '',
      preCarregado.idScript,
      preCarregado.hashArquivo,
      preCarregado.origem
    );
  }

  private obterClasseRuntime<T>(delegua: PituguesApi, chaves: string[]): (new (...args: unknown[]) => T) {
    for (const chave of chaves) {
      const classe = (delegua as Record<string, unknown>)[chave];
      if (typeof classe === 'function') {
        return classe as new (...args: unknown[]) => T;
      }
    }

    throw new Error(`Nao foi possivel localizar classe do runtime: ${chaves.join(', ')}`);
  }

  private async executarCodigoFonte(
    codigo: string,
    scriptId: string,
    hashArquivo: number,
    src?: string
  ): Promise<ResultadoExecucaoPituguesInterface> {
    const inicio = performance.now();
    const erros: ErroExecucaoPituguesInterface[] = [];
    const saida: string[] = [];

    const escrever = (texto: string) => {
      const valor = String(texto);
      saida.push(valor);

      if (this.opcoes.saida) {
        this.opcoes.saida(valor, { scriptId });
      } else {
        console.log(valor);
      }
    };

    try {
      const importacoesDeDom = extrairImportacoesDeDom(codigo);
      const delegua = window.Delegua;
      const Lexador = this.obterClasseRuntime<LexadorPituguesLike>(delegua, ['LexadorPitugues', 'Lexador']);
      const AvaliadorSintatico = this.obterClasseRuntime<AvaliadorSintaticoPituguesLike>(delegua, [
        'AvaliadorSintaticoPitugues',
        'AvaliadorSintatico',
      ]);
      const Interpretador = this.obterClasseRuntime<InterpretadorPituguesLike>(delegua, [
        'InterpretadorPitugues',
        'Interpretador',
      ]);

      const lexador = new Lexador();
      const avaliadorSintatico = new AvaliadorSintatico();
      const interpretador = new Interpretador(window.location.pathname, false, escrever);

      registrarImportacoesDeDomNoAvaliador(avaliadorSintatico, importacoesDeDom.simbolosImportados);
      this.registrarImportacoesDeDom(interpretador, importacoesDeDom.simbolosImportados);

      const retornoLexador = lexador.mapear(normalizarCodigoParaLinhas(importacoesDeDom.codigoSemImportacoes), hashArquivo);
      if (retornoLexador.erros.length > 0) {
        erros.push({
          etapa: 'lexador',
          mensagem: 'Erros encontrados durante o mapeamento lexico.',
          detalhe: retornoLexador.erros,
        });
      }

      const retornoAvaliador = await avaliadorSintatico.analisar(retornoLexador, hashArquivo);
      if (retornoAvaliador.erros.length > 0) {
        erros.push({
          etapa: 'avaliador',
          mensagem: 'Erros encontrados durante a analise sintatica.',
          detalhe: retornoAvaliador.erros,
        });
      }

      if (erros.length === 0) {
        const retornoInterpretador = await interpretador.interpretar(retornoAvaliador.declaracoes);
        if (retornoInterpretador.erros.length > 0) {
          erros.push({
            etapa: 'interpretador',
            mensagem: 'Erros encontrados durante a interpretacao.',
            detalhe: retornoInterpretador.erros,
          });
        }
      }
    } catch (erro) {
      erros.push({
        etapa: 'tempo-execucao',
        mensagem: 'Falha inesperada no tempo de execucao.',
        detalhe: extrairMensagemErro(erro),
      });
    }

    const tempoMs = performance.now() - inicio;

    return {
      scriptId,
      origem: src,
      sucesso: erros.length === 0,
      saida,
      erros,
      tempoMs,
    };
  }

  private registrarImportacoesDeDom(interpretador: unknown, simbolosImportados: string[]): void {
    if (simbolosImportados.length === 0) {
      return;
    }

    const pilhaEscopos = (interpretador as { pilhaEscoposExecucao?: { definirVariavel: (nome: string, valor: unknown) => void } })
      .pilhaEscoposExecucao;

    if (!pilhaEscopos?.definirVariavel) {
      throw new Error('Nao foi possivel acessar o escopo global do interpretador para registrar o modulo dom.');
    }

    const simbolosDom = this.criarSimbolosDom(interpretador);

    for (const simboloImportado of simbolosImportados) {
      if (!(simboloImportado in simbolosDom)) {
        throw new Error(`Simbolo '${simboloImportado}' nao existe no modulo dom.`);
      }

      pilhaEscopos.definirVariavel(simboloImportado, simbolosDom[simboloImportado]);
    }
  }

  private criarSimbolosDom(interpretador: unknown): Record<string, unknown> {
    const deleguaComEstruturas = window.Delegua;

    const criarFuncaoPadrao = (valorAridade: number, funcao: (...argumentos: unknown[]) => unknown) => {
      if (deleguaComEstruturas.FuncaoPadrao) {
        return new deleguaComEstruturas.FuncaoPadrao(valorAridade, funcao);
      }

      return funcao;
    };

    const bind = criarFuncaoPadrao(3, async (_visitante: unknown, alvo: unknown, evento: unknown, funcao: unknown) => {
      const elementoDom = this.resolverElementoDom(alvo);
      if (!elementoDom) {
        return null;
      }

      const nomeEvento = String(this.resolverValorDom(evento));
      const callbackDelegua = this.resolverValorDom(funcao);

      elementoDom.addEventListener(nomeEvento, async (eventoDom: Event) => {
        try {
          if (callbackDelegua && typeof (callbackDelegua as { chamar?: unknown }).chamar === 'function') {
            await (callbackDelegua as { chamar: (visitante: unknown, argumentos: unknown[]) => Promise<unknown> }).chamar(
              interpretador,
              [eventoDom]
            );
            return;
          }

          if (typeof callbackDelegua === 'function') {
            await callbackDelegua(eventoDom);
          }
        } catch (erro) {
          console.error('[pitugues-script] Erro ao executar callback de bind():', erro);
        }
      });

      return null;
    });

    const alerta = criarFuncaoPadrao(1, (_visitante: unknown, mensagem: unknown) => {
      window.alert(String(this.resolverValorDom(mensagem)));
      return null;
    });

    return {
      bind,
      document: window.document,
      alert: alerta,
    };
  }

  private resolverValorDom(valor: unknown): unknown {
    if (valor && typeof valor === 'object' && 'valor' in (valor as Record<string, unknown>)) {
      return (valor as { valor: unknown }).valor;
    }

    return valor;
  }

  private resolverElementoDom(alvo: unknown): HTMLElement | Document | null {
    const alvoResolvido = this.resolverValorDom(alvo);

    if (typeof alvoResolvido === 'string') {
      return document.getElementById(alvoResolvido) ?? document.querySelector(alvoResolvido);
    }

    if (alvoResolvido === window.document) {
      return window.document;
    }

    if (alvoResolvido instanceof HTMLElement) {
      return alvoResolvido;
    }

    if (
      alvoResolvido &&
      typeof alvoResolvido === 'object' &&
      'addEventListener' in (alvoResolvido as Record<string, unknown>) &&
      typeof (alvoResolvido as { addEventListener?: unknown }).addEventListener === 'function'
    ) {
      return alvoResolvido as HTMLElement;
    }

    return null;
  }

  private proximoIdScript(): string {
		const id = this.contadorScripts === 0
			? '__pitugues__main__'
			: `__pitugues__main__${this.contadorScripts}`;
		this.contadorScripts += 1;

    return id;
  }

  public estaIniciado(): boolean {
    return this.iniciado;
  }

  public deveAutoIniciar(): boolean {
    return this.opcoes.autoIniciar !== false;
  }
}

const tempoExecucao = new PituguesTempoExecucaoNavegador();

window.__PITUGUES__ = tempoExecucao;
window.pitugues = (options?: OpcoesTempoExecucaoPituguesInterface) => tempoExecucao.executar(options);

function tentarAutoExecucao(): void {
  if (!window.Delegua) {
    return;
  }

  if (tempoExecucao.estaIniciado()) {
    return;
  }

  if (!tempoExecucao.deveAutoIniciar()) {
    return;
  }

  void tempoExecucao.executar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tentarAutoExecucao);
} else {
  tentarAutoExecucao();
}

export {
  PituguesTempoExecucaoNavegador,
  type OpcoesTempoExecucaoPituguesInterface,
  type ResultadoExecucaoPituguesInterface,
  type ErroExecucaoPituguesInterface,
};
