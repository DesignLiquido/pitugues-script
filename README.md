# pitugues-script

Runtime em TypeScript para executar Pitugues em tags `<script>` de HTML, no estilo de inicializacao do Brython.

## Requisitos

- Node.js 18+
- Yarn 1.x

## Instalacao

```bash
yarn
```

## Scripts

```bash
yarn typecheck
yarn empacotar
yarn empacotar:min
yarn watch
yarn testes
yarn testes:watch
yarn preparar-github-pages
yarn publicar-github-pages:dry-run
yarn publicar-github-pages
yarn publicar-npm:dry-run
yarn publicar-npm
```

## Uso basico

1. Gere o bundle do runtime:

```bash
yarn empacotar
```

2. Inclua o UMD da Delegua e o runtime compilado na pagina:

```html
<script src="./node_modules/@designliquido/delegua/umd/delegua.js"></script>
<script src="./dist/pitugues-script.js"></script>

<script type="text/pitugues" id="programa">
escreva("Ola, mundo!")
</script>

<script>
	window.pitugues({ ids: ["programa"] });
</script>
```

## API global

O runtime expoe:

- `window.pitugues(options?)`: executa scripts Pitugues encontrados na pagina.
- `window.__PITUGUES__`: instancia do runtime.

Opcoes principais de `window.pitugues()`:

- `ids: string[]`: executa somente scripts com IDs especificos.
- `tiposDeScript: ('text/pitugues' | 'texto/pitugues' | 'application/pitugues')[]`: tipos de script aceitos.
- `saida(texto, info)`: callback para capturar saida de `escreva()` ou `imprima()`.
- `autoIniciar: boolean`: controla auto-execucao no carregamento.
- `aoIniciarScript(info)` / `aoFinalizarScript(resultado)`: hooks de ciclo de vida.

## Publicacao no npm

1. Atualize a versao em package.json para a release que sera publicada.
2. Faca login no npm com `npm login`.
3. Valide o artefato final com `yarn publicar-npm:dry-run`.
4. Publique com `yarn publicar-npm`.

O comando de publicacao gera automaticamente um package.json enxuto em dist, copia README.md e LICENSE, e publica apenas o artefato pronto para consumo no navegador.

## Publicacao no GitHub Pages

Use o comando `yarn publicar-github-pages`.

Para validar localmente o artefato do Pages antes de publicar:

```bash
yarn publicar-github-pages:dry-run
npx http-server site -p 8080 -c-1 -o /index.html
```

O comando de publicacao envia apenas o conteudo de site para a branch `gh-pages`.
O comando `publicar-github-pages:dry-run` nao faz a publicacao; ele apenas reconstrui o artefato local em site.

## Exemplo pronto

Veja [index.html](index.html) para um exemplo completo com captura de saida em DOM.
