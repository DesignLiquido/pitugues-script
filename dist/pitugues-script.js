"use strict";
var PituguesScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // fontes/pitugues-script.ts
  var pitugues_script_exports = {};
  __export(pitugues_script_exports, {
    PituguesTempoExecucaoNavegador: () => PituguesTempoExecucaoNavegador,
    criarDescritoresSintaticosDom: () => criarDescritoresSintaticosDom,
    extrairImportacoesDeDom: () => extrairImportacoesDeDom,
    extrairMensagemErro: () => extrairMensagemErro,
    normalizarCodigoParaLinhas: () => normalizarCodigoParaLinhas,
    registrarImportacoesDeDomNoAvaliador: () => registrarImportacoesDeDomNoAvaliador
  });
  function normalizarCodigoParaLinhas(codigo) {
    return codigo.split(/\r\n|\r|\n/);
  }
  function extrairMensagemErro(erro) {
    if (erro instanceof Error) {
      return erro.message;
    }
    if (typeof erro === "string") {
      return erro;
    }
    try {
      return JSON.stringify(erro);
    } catch {
      return "Erro desconhecido";
    }
  }
  function extrairImportacoesDeDom(codigo) {
    const simbolosImportados = /* @__PURE__ */ new Set();
    const regexImportacao = /importar\s*\{([\s\S]+?)\}\s*de\s+dom\s*;?/gi;
    const codigoSemImportacoes = codigo.replace(
      regexImportacao,
      (match, simbolosMatch) => {
        var _a;
        const listaDeSimbolos = simbolosMatch.split(",").map((s) => s.trim()).filter(Boolean);
        for (const simbolo of listaDeSimbolos) {
          simbolosImportados.add(simbolo);
        }
        const quebras = ((_a = match.match(/\n/g)) != null ? _a : []).length;
        return "\n".repeat(quebras);
      }
    );
    return {
      codigoSemImportacoes,
      simbolosImportados: [...simbolosImportados]
    };
  }
  function criarDescritoresSintaticosDom() {
    return {
      bind: {
        nome: "bind",
        tipo: "qualquer",
        subElementos: [
          { nome: "alvo", tipo: "qualquer" },
          { nome: "evento", tipo: "texto" },
          { nome: "callback", tipo: "fun\xE7\xE3o" }
        ]
      },
      document: {
        nome: "document",
        tipo: "qualquer",
        subElementos: []
      },
      alert: {
        nome: "alert",
        tipo: "qualquer",
        subElementos: [{ nome: "mensagem", tipo: "qualquer" }]
      }
    };
  }
  function registrarImportacoesDeDomNoAvaliador(avaliadorSintatico, simbolosImportados) {
    if (simbolosImportados.length === 0) {
      return;
    }
    const avaliador = avaliadorSintatico;
    const inicializadorOriginal = avaliador.inicializarPilhaEscopos;
    if (typeof inicializadorOriginal !== "function") {
      throw new Error("Avaliador sintatico nao expoe inicializarPilhaEscopos().");
    }
    const descritoresDom = criarDescritoresSintaticosDom();
    avaliador.inicializarPilhaEscopos = function inicializarPilhaEscoposComDom() {
      var _a;
      inicializadorOriginal.call(this);
      if (!((_a = this.pilhaEscopos) == null ? void 0 : _a.definirInformacoesVariavel)) {
        throw new Error("Avaliador sintatico nao expoe pilhaEscopos.definirInformacoesVariavel().");
      }
      for (const simboloImportado of simbolosImportados) {
        if (!(simboloImportado in descritoresDom)) {
          throw new Error(`Simbolo '${simboloImportado}' nao existe no modulo dom.`);
        }
        this.pilhaEscopos.definirInformacoesVariavel(simboloImportado, descritoresDom[simboloImportado]);
      }
    };
  }
  var PituguesTempoExecucaoNavegador = class {
    constructor() {
      this.tiposScriptsPadrao = ["text/pitugues", "texto/pitugues", "application/pitugues"];
      this.opcoes = {};
      this.contadorScripts = 0;
      this.iniciado = false;
      this.quandoPronto = new Promise((resolve) => {
        this.resolucaoPronta = resolve;
      });
    }
    configurar(opcoes) {
      this.opcoes = {
        ...this.opcoes,
        ...opcoes
      };
    }
    async executar(opcoes) {
      var _a, _b;
      this.configurar(opcoes);
      if (!window.Delegua) {
        throw new Error("window.Delegua nao encontrado. Carregue o UMD da Delegua antes de pitugues-script.");
      }
      const elementosDeScript = this.coletarElementosDeScript();
      const promessasDeFetch = elementosDeScript.map(
        (script) => this.preCarregarScript(script).catch((erro) => ({
          codigo: null,
          idScript: script.id || "__pitugues__desconhecido__",
          hashArquivo: 0,
          origem: script.src || void 0,
          erroRetorno: {
            scriptId: script.id || "__pitugues__desconhecido__",
            origem: script.src || void 0,
            sucesso: false,
            saida: [],
            erros: [{
              etapa: "carregamento",
              mensagem: "Falha inesperada no pre-carregamento.",
              detalhe: extrairMensagemErro(erro)
            }],
            tempoMs: 0
          }
        }))
      );
      const resultados = [];
      for (const promessa of promessasDeFetch) {
        const resultado = await this.executarCodigoPreCarregado(await promessa);
        resultados.push(resultado);
        (_b = (_a = this.opcoes).aoFinalizarScript) == null ? void 0 : _b.call(_a, resultado);
      }
      this.iniciado = true;
      this.resolucaoPronta();
      return resultados;
    }
    async executarCodigo(codigo, opcoes) {
      var _a, _b;
      this.configurar();
      if (!window.Delegua) {
        throw new Error("window.Delegua nao encontrado. Carregue o UMD da Delegua antes de pitugues-script.");
      }
      const idScript = (_a = opcoes == null ? void 0 : opcoes.id) != null ? _a : this.proximoIdScript();
      const hashArquivo = (_b = opcoes == null ? void 0 : opcoes.hashArquivo) != null ? _b : Date.now();
      return this.executarCodigoFonte(codigo, idScript, hashArquivo);
    }
    coletarElementosDeScript() {
      var _a;
      const tiposDeScript = (_a = this.opcoes.tiposDeScript) != null ? _a : this.tiposScriptsPadrao;
      const seletor = tiposDeScript.map((tipo) => `script[type="${tipo}"]`).join(", ");
      const encontrados = Array.from(document.querySelectorAll(seletor));
      if (!this.opcoes.ids || this.opcoes.ids.length === 0) {
        return encontrados;
      }
      const ids = new Set(this.opcoes.ids);
      return encontrados.filter((elemento) => !!elemento.id && ids.has(elemento.id));
    }
    async preCarregarScript(script) {
      var _a, _b, _c;
      const indice = this.contadorScripts++;
      const idScript = script.id || (indice === 0 ? "__pitugues__main__" : `__pitugues__main__${indice}`);
      const hashArquivo = Date.now() + indice;
      (_b = (_a = this.opcoes).aoIniciarScript) == null ? void 0 : _b.call(_a, {
        scriptId: idScript,
        origem: script.src || void 0
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
                    etapa: "carregamento",
                    mensagem: `Falha ao carregar script remoto (${resposta.status} ${resposta.statusText}).`
                  }
                ],
                tempoMs: 0
              }
            };
          }
          const codigoRemoto = await resposta.text();
          return {
            codigo: codigoRemoto,
            idScript,
            hashArquivo,
            origem: script.src
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
                  etapa: "carregamento",
                  mensagem: "Erro ao carregar script remoto.",
                  detalhe: extrairMensagemErro(erro)
                }
              ],
              tempoMs: 0
            }
          };
        }
      }
      return {
        codigo: (_c = script.textContent) != null ? _c : "",
        idScript,
        hashArquivo,
        origem: void 0
      };
    }
    async executarCodigoPreCarregado(preCarregado) {
      if (preCarregado.erroRetorno) {
        return preCarregado.erroRetorno;
      }
      return this.executarCodigoFonte(
        preCarregado.codigo || "",
        preCarregado.idScript,
        preCarregado.hashArquivo,
        preCarregado.origem
      );
    }
    obterClasseRuntime(delegua, chaves) {
      for (const chave of chaves) {
        const classe = delegua[chave];
        if (typeof classe === "function") {
          return classe;
        }
      }
      throw new Error(`Nao foi possivel localizar classe do runtime: ${chaves.join(", ")}`);
    }
    async executarCodigoFonte(codigo, scriptId, hashArquivo, src) {
      const inicio = performance.now();
      const erros = [];
      const saida = [];
      const escrever = (texto) => {
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
        const Lexador = this.obterClasseRuntime(delegua, ["LexadorPitugues", "Lexador"]);
        const AvaliadorSintatico = this.obterClasseRuntime(delegua, [
          "AvaliadorSintaticoPitugues",
          "AvaliadorSintatico"
        ]);
        const Interpretador = this.obterClasseRuntime(delegua, [
          "InterpretadorPitugues",
          "Interpretador"
        ]);
        const lexador = new Lexador();
        const avaliadorSintatico = new AvaliadorSintatico();
        const interpretador = new Interpretador(window.location.pathname, false, escrever);
        registrarImportacoesDeDomNoAvaliador(avaliadorSintatico, importacoesDeDom.simbolosImportados);
        this.registrarImportacoesDeDom(interpretador, importacoesDeDom.simbolosImportados);
        const retornoLexador = lexador.mapear(normalizarCodigoParaLinhas(importacoesDeDom.codigoSemImportacoes), hashArquivo);
        if (retornoLexador.erros.length > 0) {
          erros.push({
            etapa: "lexador",
            mensagem: "Erros encontrados durante o mapeamento lexico.",
            detalhe: retornoLexador.erros
          });
        }
        const retornoAvaliador = await avaliadorSintatico.analisar(retornoLexador, hashArquivo);
        if (retornoAvaliador.erros.length > 0) {
          erros.push({
            etapa: "avaliador",
            mensagem: "Erros encontrados durante a analise sintatica.",
            detalhe: retornoAvaliador.erros
          });
        }
        if (erros.length === 0) {
          const retornoInterpretador = await interpretador.interpretar(retornoAvaliador.declaracoes);
          if (retornoInterpretador.erros.length > 0) {
            erros.push({
              etapa: "interpretador",
              mensagem: "Erros encontrados durante a interpretacao.",
              detalhe: retornoInterpretador.erros
            });
          }
        }
      } catch (erro) {
        erros.push({
          etapa: "tempo-execucao",
          mensagem: "Falha inesperada no tempo de execucao.",
          detalhe: extrairMensagemErro(erro)
        });
      }
      const tempoMs = performance.now() - inicio;
      return {
        scriptId,
        origem: src,
        sucesso: erros.length === 0,
        saida,
        erros,
        tempoMs
      };
    }
    registrarImportacoesDeDom(interpretador, simbolosImportados) {
      if (simbolosImportados.length === 0) {
        return;
      }
      const pilhaEscopos = interpretador.pilhaEscoposExecucao;
      if (!(pilhaEscopos == null ? void 0 : pilhaEscopos.definirVariavel)) {
        throw new Error("Nao foi possivel acessar o escopo global do interpretador para registrar o modulo dom.");
      }
      const simbolosDom = this.criarSimbolosDom(interpretador);
      for (const simboloImportado of simbolosImportados) {
        if (!(simboloImportado in simbolosDom)) {
          throw new Error(`Simbolo '${simboloImportado}' nao existe no modulo dom.`);
        }
        pilhaEscopos.definirVariavel(simboloImportado, simbolosDom[simboloImportado]);
      }
    }
    criarSimbolosDom(interpretador) {
      const deleguaComEstruturas = window.Delegua;
      const criarFuncaoPadrao = (valorAridade, funcao) => {
        if (deleguaComEstruturas.FuncaoPadrao) {
          return new deleguaComEstruturas.FuncaoPadrao(valorAridade, funcao);
        }
        return funcao;
      };
      const bind = criarFuncaoPadrao(3, async (_visitante, alvo, evento, funcao) => {
        const elementoDom = this.resolverElementoDom(alvo);
        if (!elementoDom) {
          return null;
        }
        const nomeEvento = String(this.resolverValorDom(evento));
        const callbackDelegua = this.resolverValorDom(funcao);
        elementoDom.addEventListener(nomeEvento, async (eventoDom) => {
          try {
            if (callbackDelegua && typeof callbackDelegua.chamar === "function") {
              await callbackDelegua.chamar(
                interpretador,
                [eventoDom]
              );
              return;
            }
            if (typeof callbackDelegua === "function") {
              await callbackDelegua(eventoDom);
            }
          } catch (erro) {
            console.error("[pitugues-script] Erro ao executar callback de bind():", erro);
          }
        });
        return null;
      });
      const alerta = criarFuncaoPadrao(1, (_visitante, mensagem) => {
        window.alert(String(this.resolverValorDom(mensagem)));
        return null;
      });
      return {
        bind,
        document: window.document,
        alert: alerta
      };
    }
    resolverValorDom(valor) {
      if (valor && typeof valor === "object" && "valor" in valor) {
        return valor.valor;
      }
      return valor;
    }
    resolverElementoDom(alvo) {
      var _a;
      const alvoResolvido = this.resolverValorDom(alvo);
      if (typeof alvoResolvido === "string") {
        return (_a = document.getElementById(alvoResolvido)) != null ? _a : document.querySelector(alvoResolvido);
      }
      if (alvoResolvido === window.document) {
        return window.document;
      }
      if (alvoResolvido instanceof HTMLElement) {
        return alvoResolvido;
      }
      if (alvoResolvido && typeof alvoResolvido === "object" && "addEventListener" in alvoResolvido && typeof alvoResolvido.addEventListener === "function") {
        return alvoResolvido;
      }
      return null;
    }
    proximoIdScript() {
      const id = this.contadorScripts === 0 ? "__pitugues__main__" : `__pitugues__main__${this.contadorScripts}`;
      this.contadorScripts += 1;
      return id;
    }
    estaIniciado() {
      return this.iniciado;
    }
    deveAutoIniciar() {
      return this.opcoes.autoIniciar !== false;
    }
  };
  var tempoExecucao = new PituguesTempoExecucaoNavegador();
  window.__PITUGUES__ = tempoExecucao;
  window.pitugues = (options) => tempoExecucao.executar(options);
  function tentarAutoExecucao() {
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tentarAutoExecucao);
  } else {
    tentarAutoExecucao();
  }
  return __toCommonJS(pitugues_script_exports);
})();
