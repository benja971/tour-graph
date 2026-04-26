// src/main.ts
import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'

mount(App, { target: document.getElementById('app')! })

// Register service worker for notifications + offline
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({ immediate: true })
    })
    .catch(err => console.warn('[pwa] register failed', err))
}
