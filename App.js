import { reactive } from "./core/reactivity/index.js";
import { h } from './core/h.js'

export default {
  render(context) {
    // const div = document.createElement('div');
    // div.innerHTML = context.state.count;
    // return div;
    return h('div',
            { id: 'div-wrapper'},
            [
              h('h1', { id: 'div-test', style: 'color: red; font-size: 24px;', key: `key-${context.state.count}`  }, context.state.count),
              h('span', { class: 'span-str' }, context.state.str),
            ])
  },

  setup() {
    const state = reactive({
      count: 1,
      str: "Hello, World"
    })
    window.state = state;
    return { state };
  }
}