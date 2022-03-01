# 实现 setup、render

## 初级版本

基于上篇文章 [手写 mini-vue-1 响应式的实现](https://juejin.cn/post/7069760792572198925) 我们实现的 `reactive, effectWatch`，接下来我们来简单实现 `setup, render`，代码如下：

- API 简单设计和使用方式：

```js
const App = {
    render(context) {}
    setup() {}
}

// use
App.render(App.setup())
```

- 细节实现：

```javascript
// ----------实现 setup render ----------------
import  { effectWatch, reactive } from './core/reactivity/index.js'

const App = {
  render(context) {
    effectWatch(() => {
      // reset
      document.body.innerHTML = ""

      const div = document.createElement('div');
      div.innerHTML = context.state.count;

      // root
      document.body.append(div);
    })
  },
  setup() {
    const state = reactive({
      count: 0
    })
    // 使用 window，方便我们在控制台验证响应式
    window.state = state;
    return { state }
  }  
}

App.render(App.setup())
```

在浏览器打开后，在控制台执行：

```js
state.count ++
```

我们可以看到页面中的视图发生了更新！

**当前代码的缺点：每次更新 DOM 的时候都摧毁所有的 dom 元素，这样对性能影响很大；**

```js
// reset
document.body.innerHTML = ""
```

理想的方式是，数据更新后，视图对应的部分的 DOM 进行 **局部更新**。

## 进阶 setup、render

将上面的代码进行抽离封装，实现类似下面的使用方式：

```js
// 文件路径 /index.js

import App  from './App.js'
import { createApp  } from './core/index.js'

createApp(App).mount(document.querySelector("#app"))
```

- 实现 App.js：主要返回一个 vue 对象

```js
//  文件路径 /App.js
import { reactive } from "./core/reactivity/index.js";

export default {
  render(context) {
    const div = document.createElement('div');
    div.innerHTML = context.state.count;
    return div;
  },

  setup() {
    const state = reactive({
      count: 1,
    })
    window.state = state;
    return { state };
  }
}
```

这里的代码和上面我们初步定义的 `App` 实现一致；

区别：`render` 返回的是和数据绑定一起的数据视图节点；【将挂载到根节点】 这一步骤抽离出去；

- 实现 `createApp` ，当前主要做了挂载和更新的操作；

```js
//  文件路径 /core/index.js
import { effectWatch } from './reactivity/index.js'

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const context = rootComponent.setup();
      effectWatch(() => {
        rootContainer.innerHTML = "";
        const ele = rootComponent.render(context);
        rootContainer.append(ele);
      })
    },

  }
}
```

- 验证：在 chrome 控制台输入：`state.count ++` 即可看到视图上的 `count` 变化了；



## 实现 h 函数

分析 虚拟 dom / node 结构，主要为以下部分：

- tagName
- props
- children

```js
//  文件路径 /core/h.js
// 创建虚拟节点 vnode
export function h(tag, props, children) {
  return {
    tag,
    props,
    children
  }
}
```



## 使用 h 函数创建 虚拟节点

- 修改 `App.js` 文件，使用 `h` 函数；

```js
//  文件路径 /App.js
import { reactive } from "./core/reactivity/index.js";
import { h } from './core/h.js'

export default {
  render(context) {
    // const div = document.createElement('div');
    // div.innerHTML = context.state.count;
    // return div;
    // 使用 h 函数创建 虚拟 node 
    return h('div', {color: 'red'}, context.state.count)
  },

  setup() {
    const state = reactive({
      count: 1,
    })
    window.state = state;
    return { state };
  }
}
```



因为 ` render` 方法返回的不是真实的 DOM 节点了，那么此时，在 `createApp` 函数中，就不是直接挂在真实的 DOM 节点了，这里将分为 2 步骤：

- 转换 vnode 成为真实的 dom
- 将 dom 挂在到 container 上

```js
//  文件路径 /core/index.js
import { effectWatch } from './reactivity/index.js'
import { mountElement } from './renderer/index.js'
export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const context = rootComponent.setup();
      effectWatch(() => {
        rootContainer.innerHTML = "";
        // const ele = rootComponent.render(context);
        // rootContainer.append(ele);
        const vnode = rootComponent.render(context);
        mountElement(vnode, rootContainer)
      })
    },
  }
}
```



到了这一步，我们需要实现 vnode 转换成真实 dom 的函数 `mountElement` ，它的 主要作用就是分析 vnode  中的几个属性：

- tag 标签名
- props 标签的属性
- children 标签内含有的子 dom 节点

分析各种各样的可能性，转换成真实的 dom， 简要代码为：

```js
export function mountElement(vnode, container) {
    const { tag, props, children } = vnode;
    // ... if ... else...
}
```

详细实现：

```js
//  文件路径 /core/renderer/index.js
export function mountElement(vnode, container) {
  const { tag, props, children } = vnode;

  // tag
  const el = document.createElement(tag)

  // props

  for (let key in props) {
    const value = props[key]
    el.setAttribute(key, value);
  }

  // children-初步判断 string 和 number 类型
  if (typeof children === 'string' || typeof children === 'number') {
    
    const textNode = document.createTextNode(children)
    el.appendChild(textNode); 

    // 接受的若为 数组，则 递归处理，需要注意，传入的 container 是 el，不是外部的 container；
  } else if (Array.isArray(children)) {
    children.forEach((v) => {
      mountElement(v, el);
    })
  }

  container.appendChild(el);
}
```

- 测试数据验证：

```js
//  文件路径 /App.js
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
              h('h1', { id: 'div-test', style: 'color: red; font-size: 24px;'  }, context.state.count),
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
```

此时，在浏览器中可以看到我们写的 vnode 被渲染在了页面上；

手动在控制台 更新 `state` 可以看到视图也随之更新；

```js
state.str = "Hello, JavaScript"
state.count ++
```