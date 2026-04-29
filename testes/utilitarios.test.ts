import {
  criarDescritoresSintaticosDom,
  extrairImportacoesDeDom,
  extrairMensagemErro,
  normalizarCodigoParaLinhas,
  registrarImportacoesDeDomNoAvaliador,
} from '../fontes/pitugues-script';

describe('Utilitarios do runtime Pitugues', () => {
  it('normaliza quebras de linha em formato de vetor', () => {
    const codigo = 'linha1\r\nlinha2\rlinha3\nlinha4';

    expect(normalizarCodigoParaLinhas(codigo)).toEqual(['linha1', 'linha2', 'linha3', 'linha4']);
  });

  it('extrai mensagem de Error', () => {
    expect(extrairMensagemErro(new Error('falhou'))).toBe('falhou');
  });

  it('retorna texto recebido diretamente', () => {
    expect(extrairMensagemErro('erro direto')).toBe('erro direto');
  });

  it('serializa objetos desconhecidos como JSON', () => {
    expect(extrairMensagemErro({ codigo: 500, detalhe: 'quebra' })).toBe('{"codigo":500,"detalhe":"quebra"}');
  });

  it('extrai importacao de dom e preserva o restante do codigo', () => {
		const codigo = [
			'importar { bind, document, alert } de dom',
			'escreva("ok")'
		].join('\n');
    const resultado = extrairImportacoesDeDom(codigo);

    expect(resultado.simbolosImportados).toEqual(['bind', 'document', 'alert']);
		expect(normalizarCodigoParaLinhas(resultado.codigoSemImportacoes)).toEqual(
			['', 'escreva("ok")']
		);
	});

  it('preserva quantidade de linhas ao remover importacao multi-linha', () => {
    const codigo = [
      'importar {',
      '  bind,',
			'  document,',
      '  alert',
      '} de dom',
      'escreva("ok")',
    ].join('\n');
		const resultado = extrairImportacoesDeDom(codigo);

    expect(resultado.simbolosImportados).toEqual(['bind', 'document', 'alert']);
		expect(normalizarCodigoParaLinhas(resultado.codigoSemImportacoes)).toEqual(
			['', '', '', '', '', 'escreva("ok")']
		);
  });

  it('consolida simbolos repetidos de dom sem duplicar', () => {
    const codigo = [
      'importar { bind, document } de dom',
      'importar { document, alert } de dom',
      'escreva("ok")',
    ].join('\n');

    const resultado = extrairImportacoesDeDom(codigo);

    expect(resultado.simbolosImportados).toEqual(['bind', 'document', 'alert']);
  });

  it('cria descritores sintaticos para os simbolos de dom', () => {
    const descritores = criarDescritoresSintaticosDom();

    expect(Object.keys(descritores)).toEqual(['bind', 'document', 'alert']);
    expect(descritores.bind.subElementos).toHaveLength(3);
    expect(descritores.alert.subElementos).toHaveLength(1);
  });

  it('injeta simbolos de dom no avaliador sintatico durante a inicializacao dos escopos', () => {
    const definicoes: Array<{ nome: string; tipo: string }> = [];
    const avaliadorSimulado = {
      pilhaEscopos: {
        definirInformacoesVariavel: (nome: string, informacoes: { tipo: string }) => {
          definicoes.push({ nome, tipo: informacoes.tipo });
        },
      },
      inicializarPilhaEscopos() {
        // Simula comportamento minimo do avaliador real.
      },
    };

    registrarImportacoesDeDomNoAvaliador(avaliadorSimulado, ['bind', 'alert']);
    avaliadorSimulado.inicializarPilhaEscopos();

    expect(definicoes).toEqual([
      { nome: 'bind', tipo: 'qualquer' },
      { nome: 'alert', tipo: 'qualquer' },
    ]);
  });
});
