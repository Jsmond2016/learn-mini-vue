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

基于上述需求，代码实现，下面是简单的 API 设计

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









