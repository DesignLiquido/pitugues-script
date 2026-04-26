import { PituguesTempoExecucaoNavegador } from '../fontes/pitugues-script';

describe('PituguesTempoExecucaoNavegador', () => {
  it('inicia com auto inicio habilitado por padrao', () => {
    const tempoExecucao = new PituguesTempoExecucaoNavegador();

    expect(tempoExecucao.deveAutoIniciar()).toBe(true);
  });

  it('respeita opcao de desabilitar auto inicio', () => {
    const tempoExecucao = new PituguesTempoExecucaoNavegador();

    tempoExecucao.configurar({ autoIniciar: false });

    expect(tempoExecucao.deveAutoIniciar()).toBe(false);
  });

  it('lanca erro ao executar sem UMD da Delegua carregado', async () => {
    const tempoExecucao = new PituguesTempoExecucaoNavegador();

    // @ts-expect-error ajuste explicito para cenario de teste.
    window.Delegua = undefined;

    await expect(tempoExecucao.executarCodigo('escreva(1)')).rejects.toThrow(
      'window.Delegua nao encontrado. Carregue o UMD da Delegua antes de pitugues-script.'
    );
  });
});