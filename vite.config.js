import {defineConfig} from 'vite'

export default defineConfig({
  build: {
    target: 'esnext', //browsers can handle the latest ES features
    rollupOptions: {
      input: {
        main: 'index.html',
        projects: 'projects.html',
        contact: 'contact.html'
        // add one line per page you have, e.g.:
        // about: 'about.html',
      },
    },
  }
}) 
