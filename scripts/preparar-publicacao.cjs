const fs = require('node:fs');
const path = require('node:path');

const raizProjeto = path.resolve(__dirname, '..');
const caminhoPackageRaiz = path.join(raizProjeto, 'package.json');
const caminhoPackageDist = path.join(raizProjeto, 'dist', 'package.json');
const caminhoReadme = path.join(raizProjeto, 'README.md');
const caminhoLicenca = path.join(raizProjeto, 'LICENSE');

function prepararPublicacao() {
  if (!fs.existsSync(path.join(raizProjeto, 'dist'))) {
    throw new Error('Diretorio dist nao encontrado. Execute yarn empacotar antes de preparar a publicacao.');
  }

  const packageRaiz = JSON.parse(fs.readFileSync(caminhoPackageRaiz, 'utf8'));

  const packagePublicacao = {
    name: packageRaiz.name,
    version: packageRaiz.version,
    description: packageRaiz.description,
    license: packageRaiz.license,
    homepage: packageRaiz.homepage,
    repository: packageRaiz.repository,
    bugs: packageRaiz.bugs,
    funding: packageRaiz.funding,
    keywords: packageRaiz.keywords,
    publishConfig: packageRaiz.publishConfig,
    main: 'pitugues-script.js',
    files: ['pitugues-script.js', 'pitugues-script.min.js', 'README.md', 'LICENSE'],
  };

  fs.writeFileSync(caminhoPackageDist, `${JSON.stringify(packagePublicacao, null, 2)}\n`);
  fs.copyFileSync(caminhoReadme, path.join(raizProjeto, 'dist', 'README.md'));

  if (fs.existsSync(caminhoLicenca)) {
    fs.copyFileSync(caminhoLicenca, path.join(raizProjeto, 'dist', 'LICENSE'));
  }
}

prepararPublicacao();