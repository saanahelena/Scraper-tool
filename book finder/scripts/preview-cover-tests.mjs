// Local-only browser fixture. Uses generated SVG artwork, never third-party covers.
import { createServer } from 'vite'
const server = await createServer({
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
  plugins: [{
    name: 'local-cover-tests',
    configureServer(server) {
      server.middlewares.use('/__cover-tests', async (_request, response) => {
        response.setHeader('Content-Type', 'text/html')
        response.end(await server.transformIndexHtml('/__cover-tests', `<!doctype html><html><head><title>Local cover fallback tests</title></head><body>
          <div id="root"></div><script type="module">
          import React from 'react';
          import ReactDOM from 'react-dom/client';
          import BookCover from '/src/components/BookCover.jsx';
          import CoverImage from '/src/components/CoverImage.jsx';
          import '/src/index.css'; import '/src/App.css';
          const h = React.createElement;
          const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="260"><rect width="180" height="260" fill="#ecd3d7"/><text x="20" y="130" fill="#702f45">Local test artwork</text></svg>');
          ReactDOM.createRoot(document.getElementById('root')).render(h('main', { className:'collection' },
            h('h1', {}, 'Local image fallback tests'),
            h('div', {className:'book-list'},
              h('article', {id:'pending',className:'book-card'}, h(BookCover, {cover:{permission_status:'pending', image_url:'https://books.toscrape.com/media/not-requested.jpg'},title:'Pending permission'}), h('h3',{},'Pending: pastel card')),
              h('article', {id:'missing',className:'book-card'}, h(BookCover, {title:'Missing metadata'}), h('h3',{},'Missing: pastel card')),
              h('article', {id:'success',className:'book-card'}, h(CoverImage, {url:svg,title:'Local generated test artwork'}), h('h3',{},'Local artwork: contain')),
              h('article', {id:'failure',className:'book-card'}, h(CoverImage, {url:'/__missing-test-cover.jpg',title:'Broken local test image'}), h('h3',{},'Failed: pastel card'))
            )
          ));
          </script></body></html>`))
      })
    },
  }],
})
await server.listen()
console.log('Local synthetic cover tests: http://127.0.0.1:5175/__cover-tests')
