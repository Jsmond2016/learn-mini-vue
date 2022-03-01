# 响应式实现

> 学习笔记，来源于：B站 [阿崔cxr](https://space.bilibili.com/175301983) 老师的公开视频 [手写 mini-vue](https://www.bilibili.com/video/BV1Rt4y1B7sC?p=1)

学习目标：简单实现 Vue3 的响应式

## v1 版本

- 手动赋值的方式更新 b

```js
let a = 10
let b = a + 10
console.log('b: ', b);

// 此时若 改变了 a，那么要获取新的 b 的值，需要重新赋值
a = 20
b = a + 10
console.log('b: ', b);

// result
// b:  20
// b:  30
```

## v2 版本

- 抽离赋值操作；

- 手动触发 update 进行更新

```js
// v2

let a = 10
let b

update()
function update() {
  b = a + 10
  console.log('b: ', b);
}

// 此时若 改变了 a，那么要获取新的 b 的值，需要重新计算
a = 20
update()

// result
// b:  20
// b:  30
```

**疑问：能不能不 手动调用 update 函数实现自动更新呢？**

## v3 版本

使用 Vue3 的 `reactivity` API 实现

- 安装：`yarn add @vue/reactivity `
- 具体代码：

```js
// v3 版本，使用 vue 的 reactive 更新
const { effect, reactive }  = require("@vue/reactivity")

let b
// 声明一个响应式对象
let a = reactive({
  value: 10
})
effect(() => {
  b = a.value + 10;
  console.log('b: ', b);
})

// a 的值每次改变后，会触发 effect 的函数执行
a.value = 20

// result
// b:  20
// b:  30
```

总结：

上面的实现，主要注意 2 个方面：

- 在取值的时候 收集依赖
- 在赋值的时候 触发依赖
- 依赖的值的变化根据响应式自动执行进行变更

## v4 实现简单版的响应式

需求：

- 收集依赖
- 触发依赖

我们使用发布订阅模式：

```js
class Dep {

  // 收集依赖
  depend() {}

  // 触发依赖
  notice() {}

}

function effectWatch() {
  // 收集依赖
}

```

接下来完善细节：

- 收集依赖的细节

```js
// 定义临时 effect，用后还原为 null
let currentEffect

class Dep {

  constructor() {
    // 使用 Set，原因是 依赖不能重复
    this.effects = new Set();
  }

  // 收集依赖
  depend() {
    if (currentEffect) {
      this.effects.add(currentEffect)
    }
  }

  // 触发依赖
  notice() {}

}


function effectWatch(effect) {
  // 收集依赖
  currentEffect = effect;
  dep.depend();
  // 用完后 effect 置为空
  currentEffect = null;
}

const dep = new Dep()
effectWatch(() => {
  console.log('effect-watch')
})

```

- 触发依赖

```js

let currentEffect

class Dep {

  constructor(value) {
    // 使用 Set，原因是 依赖不能重复
    this.effects = new Set();
    this._value = value
  }

  get value() {
    return this._value
  }

  set value(newValue) {
    this._value = newValue
  }

  // 收集依赖
  depend() {
    if (currentEffect) {
      this.effects.add(currentEffect)
    }
  }

  // 触发依赖
  notice() {
    // 触发之前收集到的依赖
    this.effects.forEach((effect) => effect())
  }

}


function effectWatch(effect) {
  // 收集依赖
  currentEffect = effect;
  // 依赖被收集前，需要调用依赖函数
  effect();
  dep.depend();
  currentEffect = null;
}

let b;
const dep = new Dep(10)
effectWatch(() => {
  b = dep.value + 10
  console.log('b:', b)
})

// 值发生变更
dep.value = 20

// result
// b: 20
```

此时发现，`dep.value = 20` 的赋值操作没有触发 effect 更新；

优化一下代码：

```js

let currentEffect

class Dep {

  constructor(value) {
    this.effects = new Set();
    this._value = value
  }

  get value() {
    // 触发收集依赖
    this.depend();
    return this._value
  }

  set value(newValue) {
    this._value = newValue
    // 切记，需要在值更新完成后触发依赖
    this.notice();
  }

  depend() {
    if (currentEffect) {
      this.effects.add(currentEffect)
    }
  }

  notice() {
    this.effects.forEach((effect) => effect())
  }

}


function effectWatch(effect) {
  // 收集依赖
  currentEffect = effect;
  // 依赖被收集前，需要调用依赖函数
  effect();
  dep.depend();
  currentEffect = null;
}


// -------  验证测试 -------------

const dep = new Dep(10)

let b;
effectWatch(() => {
  b = dep.value + 10
  console.log('b:', b)
})

// 值发生变更
dep.value = 20


// result
// b: 20
// b: 30
```

此时，即可完成自动执行依赖更新 `b` 的值；

## 思考

上面，我们自主实现的 `Dep` 实际类似于 `Vue3` 中的 `ref` ，因为当前我们只处理了简单的数据类型 `number`

一般而言，我们会这么用：

- `ref` 用于：`string, number, boolean ...`
- `reactive` 用于: `object ...` 

因此，若要实现 `object` 的响应式，我们还需要继续优化代码，实现 `reactive`

在此之前，需要理解几个问题，对象的取值和赋值操作：

- get 操作： `object.a`
- set 操作：`object.a = 2` 
- proxy 代理的基本使用：

```js
const target = {
    key: 1,
    value: 'ss'
}
const proxyObject = new Proxy(target, {
    get(target, key) {},
    set(target, key, value) {},
})
```



## 实现 reactive

- 设置和收集依赖

```js

// 预设全局 Map
const targetMap = new Map();

function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {

      // 给对象设置 依赖
      let depsMap = targetMap.get(target);
      if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
      }

      // 给对象的 key 依赖
      let dep = depsMap.get(key);
      if (!dep) {
        dep = new Map();
        depsMap.set(key, dep);
      }

      // 收集 设置好的 依赖
      dep.depend();

      // Proxy 和 Reflect 一般一起出现和使用，等价于 target[key]
      return Reflect.get(target, key);
    },
    
    
    set() {}
  })
}

const user = reactive({
  age: 19
})

```

- 抽离 收集依赖

```js
// 抽离 getDep
function getDep(target, key) {
  // 给对象设置 依赖
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  // 给对象的 key 依赖
  let dep = depsMap.get(key);
  if (!dep) {
    // 对于 对象的 key 设置为 响应式
    dep = new Dep();
    depsMap.set(key, dep);
  }
  return dep;
}
```

- 设置值时 触发依赖

```js
// 预设全局 Map
const targetMap = new Map();

function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      // ...
    },
    set(target, key, value) {
      // 触发依赖
      const dep = getDep(target, key)
      const result = Reflect.set(target, key, value)
      // 注意：需要在值被修改后 触发依赖更新，然后返回值
      dep.notice();
      return result;
    }
  })
}
```

- 以上所有代码

```js
let currentEffect = null;
class Dep {
  constructor(value) {
    // 使用 Set，原因是 依赖不能重复
    this.effects = new Set();
    this._value = value
  }

  get value() {
    // 触发收集依赖
    this.depend();
    return this._value
  }

  set value(newValue) {
    this._value = newValue
    // 切记，需要在值更新完成后触发依赖
    this.notice();
  }

  // 收集依赖
  depend() {
    if (currentEffect) {
      this.effects.add(currentEffect)
    }
  }

  // 触发依赖
  notice() {
    // 触发之前收集到的依赖
    this.effects.forEach((effect) => effect())
  }

}

function effectWatch(effect) {
  // 收集依赖
  currentEffect = effect;
  // 依赖被收集前，需要调用依赖函数
  effect();
  currentEffect = null;
}


// ---------------- reactive 相关实现 ----------------------------------


// 抽象 getDep
function getDep(target, key) {
  // 给对象设置 依赖
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  // 给对象的 key 依赖
  let dep = depsMap.get(key);
  if (!dep) {
    // 对于 对象的 key 设置为 响应式
    dep = new Dep();
    depsMap.set(key, dep);
  }
  return dep;
}

// 预设全局 Map
const targetMap = new Map();

function reactive(raw) {

  return new Proxy(raw, {
    get(target, key) {
      // 抽象 dep
      const dep = getDep(target, key);
      // 收集 设置好的 依赖
      dep.depend();

      // Proxy 和 Reflect 一般一起出现和使用，等价于 target[key]
      return Reflect.get(target, key);
    },
    set(target, key, value) {
      // 触发依赖
      // 获取到 de
      const dep = getDep(target, key)
      const result = Reflect.set(target, key, value)
      // 注意：需要在值被修改后 触发依赖更新，然后返回值
      dep.notice();
      return result;
    }
  })
}
```

- 测试验证：

```js
const user = reactive({
  age: 19
})


let double;
effectWatch(() => {
  console.log('---reactive---');
  double = user.age
  console.log('double', double);
})

user.age = 20;

// ---reactive---
// double 19
// ---reactive---
// double 20
```



## 模块化相关

- 导出我们自己实现的 `reactive, effectWatch`

```js
let currentEffect
class Dep {
    // ...
}

function effectWatch(effect) {
  // ...
}

function getDep(target, key) {
  // ...
}

const targetMap = new Map();
function reactive(raw) {
  // ...
}

// ------------------------------------------

export {
  reactive,
  effectWatch
}
```

- 在外部 定义 `index.js` 使用 上面导出的方法

```js
const { effectWatch, reactive }  = require("./core/reactivity")
const user = reactive({
  age: 19
})


let double;
effectWatch(() => {
  console.log('---reactive---');
  double = user.age
  console.log('double', double);
})

user.age = 20;
```

- 执行 `node index.js`  报错

```js
SyntaxError: Unexpected token 'export'
    at wrapSafe (internal/modules/cjs/loader.js:1101:16)
    at Module._compile (internal/modules/cjs/loader.js:1149:27)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1205:10)
    at Module.load (internal/modules/cjs/loader.js:1034:32)
    at Function.Module._load (internal/modules/cjs/loader.js:923:14)
    at Module.require (internal/modules/cjs/loader.js:1074:19)
    at require (internal/modules/cjs/helpers.js:72:18)
    at Object.<anonymous> (D:\Desktop\reactivity\index.js:39:36)
    at Module._compile (internal/modules/cjs/loader.js:1185:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1205:10)
```

我们遇到了 模块化相关的问题，`common.js` 规范中 不支持 `export`  导出

这里有两个方法解决：

- 方法一：统一使用 `common.js` 模块化方式

```js
module.exports = {
  reactive,
  effectWatch
}
```

- 方法二：使用 `es module`

  - 使用 `es module ` 导出 `reactive, effectWatch` 方法

  ```js
  export {
    reactive,
    effectWatch
  }
  ```

  - 新建 `index.html` 文件，使用 `type = module`

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>
    <script type="module" src="index.js"></script>
  
    <h1>hello</h1>
  </body>
  </html>
  ```

  - 修改 `index.js`  文件，**注意**引入文件要加上 后缀 `.js`

  ```js
  import  { effectWatch, reactive } from './core/reactivity/index.js'
  const user = reactive({
    age: 19
  })
  
  
  let double;
  effectWatch(() => {
    console.log('---reactive---');
    double = user.age
    console.log('double', double);
  })
  
  user.age = 20;
  ```

  - 查看控制台结果：

  ```
  ---reactive---
  double 19
  ---reactive---
  double 20
  ```

至此，大功告成；

# 实现 setup、render

## 初级版本

基于上面我们实现的 `reactive, effectWatch`，我们可以简单实现 `setup, render`，代码如下：

- API 简单设计：

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

当前代码的缺点：每次更新 DOM 的时候都摧毁所有的 dom 元素，这样对性能影响很大；

```js
// reset
document.body.innerHTML = ""
```

理想的方式是，数据更新后，视图对应的部分进行 **局部更新**。

## 进阶 setup、render

将上面的代码进行抽离封装，实现类似下面的使用方式：

```js
import App  from './App.js'
import { createApp  } from './core/index.js'

createApp(App).mount(document.querySelector("#app"))
```

- 实现 App.js：主要返回一个 vue 对象

```js
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

- 代码验证：

```js
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



# 实现 虚拟 dom 和 diff

场景：上面我们实现了 setup 和 render，但是有个性能问题：

```js
// ... 
effectWatch(() => {
    rootContainer.innerHTML = "";
    // const ele = rootComponent.render(context);
    // rootContainer.append(ele);
    const vnode = rootComponent.render(context);
    mountElement(vnode, rootContainer)
})
```

每次 dom 更新，这里都是销毁所有 dom 然后重新插入所有 dom；

**我们的目标：实现局部更新，这就要用到 diff 算法；**

在定义 diff 算法之前，我们回想一下我们定义的 vnode 结构：

- tag
- props
- children

因此，diff 算法对比 vnode 差异，也是针对上述的 几个属性进行对比；

对比后如何更新呢？

- tag

```js
el.replaceWith(newEl)
```

- props

```js
// 分为几种情况 去 setAttribute / removeAttribute
// - 修改
// - 新增
// - 删除
```

- children

```js
// children --> 简化的diff，使用暴力解法

// 1. newChidren -> string (oldChildren -> string oldChildren ->array)
// 2. newChildren -> array (oldChildren -> string oldchildren -> array)

```



## 引入 diff 比较

- 修改 `/core/index.js` 文件代码，引入 `diff` 代码：

```js

import { effectWatch } from './reactivity/index.js'
import { mountElement, diff } from './renderer/index.js'
export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      const context = rootComponent.setup();
      let isMounted = false,
          preVnodeTree = null;
      effectWatch(() => {
        if (!isMounted) {
          // 初始化
          isMounted = true;
          rootContainer.innerHTML = "";
          const vnodeTree = rootComponent.render(context);
          mountElement(vnodeTree, rootContainer)
          preVnodeTree = vnodeTree;
        } else {
          console.log('update');
          // dom 更新时，走 diff 算法
          const vnodeNewTree = rootComponent.render(context);
          diff(preVnodeTree, vnodeNewTree);
          preVnodeTree = vnodeNewTree;
        }
      })
    },

  }
}
```

**说明**

- `isMounted` ：为了性能考虑，考虑 DOM 的**挂载和更新** 这两种状态，因此使用 `isMounted` 变量来区分
- `preVnodeTree`：因为考虑到 **更新 DOM 是基于 旧的 DOM** 来进行更新，那必然需要一个变量来存储 **旧 DOM**，因此使用 `preVnodeTree` 来表示旧的 DOM;需要注意的是，每次**挂载完或更新完 DOM 后，需要更新 `preVnodeTree`** 
- `diff` ：更新时，需要**比较和更新 DOM**；因此这里 diff 算法没有返回值，接下来我们来看 diff 算法的实现

## diff 实现细节

> 文件所在位置：`/core/renderer/index.js`

- diff 函数设计：接收 新旧的 vnode，对新旧 vnode 进行比较更新；

```js
// n1 --> old
// n2 --> new
export function diff(n1, n2) {}
```

接下来，我们实现内部的细节：

如上一小节我们提到的，diff 主要更新 vnode 的 3 大属性：`tag, props, children`，我们来一个个实现：

- tag 更新，主要使用了 API `el.replaceWith(newEl)`

```js
// n1 --> old
// n2 --> new
export function diff(n1, n2) {
    console.log('n1-old: ', n1);
    console.log('n2-new: ', n2);

    // tag
    if (n1.tag !== n2.tag) {
        n1.el.replaceWith(document.createElement(n2.tag))
    }
}
```

这行代码还是比较好理解的；

- props 更新：主要是对比 两个对象的 key 和 value 是否一致，以及是否新增或者删除

```js
// 细节注意： 保证 n2 有可挂载的 el
const el = (n2.el = n1.el);

// props 属性如下结构：
// new -> {id: 'foo', class: 'bar', a: 'a' }
// old -> {id: 'foo', class: 'bar1', a: 'a', b: 'b' }
const { props: oldProps } = n1;
const { props: newProps } = n2;

// update / add
if (oldProps && newProps) {
    // 检查新的 props 里面的 key-value 是否一致，不一致则更新；
    // 若 old 没有，则表示为 新增属性，也一样更新；
    Object.keys(newProps).forEach((key) => {
        const newVal = newProps[key]
        const oldVal = oldProps[key]
        if (newVal !== oldVal) {
            el.setAttribute(key, newVal);
        }
    })
}

// delete
if (oldProps) {
    // 检查是否删除属性：旧dom有，新dom 没有，那么移出这个属性
    Object.keys(oldProps).forEach((key) => {
        if (!newProps[key]) {
            el.removeAttribute(key);
        }
    })
}
```

上述代码和注释应该还是比较好理解的，主要分2个步骤处理属性不同问题：更新/新增、删除；

- children 更新：

因为需要判断多种类型，我们先定义一个工具函数判断类型：

```js
function isNumberOrString(value) {
  return ['string', 'number'].includes(typeof value);
}
```

接下来我们看 children 的 diff ，伪代码逻辑为：

- 若 新节点 为 字符串或者数字
  - 若 旧节点 是否为 字符串或者为数字
    - 比较值是否相等，不等则 新值 替换 旧值
  - 若 旧节点 为 数组
    - 则新值替换旧值
- 若 新节点为数组
  - 若 旧节点为 字符串或数字
    - 则将 旧节点的值清空，让它成为空的容器
    - 在容器中挂载 新的节点（数组）
  - 若 旧节点为 数组：**比较两个数组的差异，这里我们使用简化的比较，仅 通过数组的长度比较公共 vnode 的差异，然后再处理长度之外的部分**
    - 获取公共数组的长度 length，遍历每个数组的值，递归 diff
    - 若 新节点的长度大于 length，则表示节点新增，那么从 length 位置开始遍历，挂载新的节点
    - 若 旧节点的长度大于 length，则表示 节点删除，那么从 length 位置开始遍历，在当前节点的父节点中删除旧节点的值

细节实现：

```js
// children -- diff
const { children: newChildren } = n2;
const { children: oldChildren } = n1;

// 都为字符串/数字
if (isNumberOrString(newChildren)) {
    // old
    if (isNumberOrString(oldChildren)) {
        if (newChildren !== oldChildren) {
            el.textContent = newChildren
        }
    } else if(Array.isArray(oldChildren)) {
        el.textContent = newChildren;
    }

} else if (Array.isArray(newChildren)) {
    if (isNumberOrString(oldChildren)) {
        el.innerText = ""
        mountElement(n2, el)
    } else if (Array.isArray(oldChildren)) {
        // new {a, b, c}
        // old {a, b, c, d}
        // 理论上：每个节点都要 diff 去递归比较
        // 事实上，为了简化代码，暂且暴力处理

        // 处理公共的 vnode
        const length = Math.min(newChildren.length, oldChildren.length)
        for (let i=0; i<length; i++) {
            const newVnode = newChildren[i]
            const oldVnode = oldChildren[i]
            diff(oldVnode, newVnode);
        }

        // 节点新增
        // old {a, b, c}
        // new {a, b, c, d}
        if (newChildren.length > length) {
            // 创建节点
            for (let i=length; i < newChildren.length; i++) {
                const newVnode = newChildren[i]
                mountElement(newVnode, el)
            }
        }

        // 节点删除
        // old {a, b, c, d}
        // new {a, b, c}
        if (oldChildren.length > length) {
            for (let i = length; i<oldChildren.length; i++) {
                const oldVnode = oldChildren[i]
                el.parentNode.removeChild(oldVnode.el)
            }
        }
    }
}
```

此时，通过上述代码，我们实现了简化版本的 diff 算法；

上面提到了 `mountElement` 方法，实际上可以认为是基于 vnode 创建 dom ，具体我们回顾一下：

```js
export function mountElement(vnode, container) {
  const { tag, props, children } = vnode;
  // tag
  const el = vnode.el = document.createElement(tag)
  // props
  for (let key in props) {
    const value = props[key]
    el.setAttribute(key, value);
  }
  // children--> string/number
  if (typeof children === 'string' || typeof children === 'number') {
    const textNode = document.createTextNode(children)
    el.appendChild(textNode); 
  } else if (Array.isArray(children)) {
    // 接受的若为 数组
    children.forEach((v) => {
      mountElement(v, el);
    })
  }
  container.appendChild(el);
}
```



至此，diff 算法的细节我们也实现啦~

## 验证

> 打开 chrome 控制台，最右侧倒数第二个工具图标（三个点），我们点击选择 【show console drawer】，或者直接按下 【esc】按钮；目的是方便观察 在 console 控制台更新 state 的时候，视图的 dom 局部更新

- 测试数据准备：

```js
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
              h('h1', 
                { id: 'div-test', style: 'color: red; font-size: 24px;', key: `key-${context.state.count}`  },
                context.state.count
               ),
              h('span',
                { class: 'span-str' }, 
                context.state.str
               ),
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



- 测试一：控制台输入：

```js
state.count ++
```

页面的数据更新，dom 中也不是所有 dom 刷新了，而是含有 `state.count` 的组件局部更新了 

- 测试二：鼠标选中控制面板中 `Elements` 面板中的

```html
<span class="span-str">Hello, World</span>
```

然后我们在控制面板中 `console` 面板中输入：

```js
$0.textContent = "123"
```

此时，我们可以看到，只有上面选中的 `span` 更新了；

至此，我们的简化版 diff 算法实现总算大功告成 

