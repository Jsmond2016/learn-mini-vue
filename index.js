// let a = 10
// let b = a + 10
// console.log('b: ', b);

// // 此时若 改变了 a，那么要获取新的 b 的值，需要重新计算
// a = 20
// b = a + 10
// console.log('b: ', b);

// v2

// let a = 10
// let b

// update()
// function update() {
//   b = a + 10
//   console.log('b: ', b);
// }

// // 此时若 改变了 a，那么要获取新的 b 的值，需要重新计算
// a = 20
// update()


// v3 版本，使用 vue 的 reactive 更新
// const { effect, reactive }  = require("./core/reactivity")

// let b
// let a = reactive({
//   value: 10
// })
// effect(() => {
//   b = a.value + 10;
//   console.log('b: ', b);
// })
// a.value = 20

// const { effectWatch, reactive }  = require("./core/reactivity")
// import  { effectWatch, reactive } from './core/reactivity/index.js'
// const user = reactive({
//   age: 19
// })


// let double;
// effectWatch(() => {
//   console.log('---reactive---');
//   double = user.age
//   console.log('double', double);
// })

// user.age = 20;


// ----------实现 setup render ----------------
// import  { effectWatch, reactive } from './core/reactivity/index.js'

// const App = {
//   // template -> render
//   render(context) {
//     effectWatch(() => {
//       // reset
//       document.body.innerHTML = ""

//       const div = document.createElement('div');
//       div.innerHTML = context.state.count;

//       // root
//       document.body.append(div);
//     })
//   },
//   setup() {
//     const state = reactive({
//       count: 0
//     })
//     window.state = state;
//     return { state }
//   }  
// }

// App.render(App.setup())



// ----


import App  from './App.js'
import { createApp  } from './core/index.js'

createApp(App).mount(document.querySelector("#app"))









