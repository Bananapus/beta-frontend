import './style.css'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Hello Bananapus!</h1>
    <div>
      <button id="counter" style="display: block; margin: auto" type="button"></button>
    </div>
    <p>
      Welcome to the frontend.
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))
