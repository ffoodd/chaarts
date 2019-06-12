module.exports = {
  paths: {
      root: './',
      docs: './docs/',
      src: './src/',
      node: './node_modules/',
      live: 'http://localhost:3000/'
  },
  test: {
      all: './docs/*.html',
      css: './chaarts.min.css',
      live: 'http://localhost:3000/index.html',
      home: './docs/index.html'
  },
  files: [
    './src/favicon.ico',
    './src/.htaccess',
    './src/humans.txt',
    './src/fonts/*.{woff,woff2}'
  ],
  browsers: [
    'last 1 versions',
    'not dead'
  ],
  babel: {
      presets: ['@babel/env']
  },
  csso: {
    sourceMap: false
  },
  purge: {
    content: ['./docs/*.html']
  },
  nunjucks: {
    path: './src/templates/'
  },
  svgo: {
    plugins: [{
      removeUnknownsAndDefaults: false
    }]
  },
  axe: {
    saveOutputIn: 'axe.json',
    folderOutputReport: 'reports',
    urls: ['./docs/*.html']
  },
  stylelint: {
    failAfterError: false,
    reporters: [{
      formatter: 'string',
      console: true
    }]
  },
  travis: {
    stylelint: {
      failAfterError: true,
      reporters: [{
        formatter: 'string',
        console: true
      }]
    }
  }
}
