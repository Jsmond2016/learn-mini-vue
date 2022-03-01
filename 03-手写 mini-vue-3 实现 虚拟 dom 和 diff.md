# 实现 虚拟 dom 和 diff

基于前面 2 篇文章

- [手写 mini-vue-1 响应式的实现](https://juejin.cn/post/7069760792572198925)
- [手写 mini-vue-2 实现 setup、render](https://juejin.cn/post/7070052244065878024)


我们分别实现了 `reactive, effectWatch, setup, render`

但是有个性能问题：

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

// 1. newChidren -> string (oldChildren -> string oldChildren -> array)
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
      let isMounted = false, preVnodeTree = null;
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

上述代码和注释应该还是比较好理解的，主要分2个步骤处理属性不同问题：**更新/新增、删除**；

- children 更新：

因为需要判断多种类型，我们先定义一个工具函数判断类型：

```js
function isNumberOrString(value) {
  return ['string', 'number'].includes(typeof value);
}
```

接下来我们看 children 的 diff ，**伪代码逻辑**为：

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

上面提到了 `mountElement` 方法，它是做什么的？

实际上可以认为是 **基于 vnode 创建 dom**，具体我们回顾一下：

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

> 打开 chrome 控制台，点击最右侧倒数第二个工具图标（三个点），我们点击选择 【show console drawer】，
> 
> 或者直接键盘左上角按下 【Esc】；
>
> **目的是方便同时使用 console 面板和 Elements 面板，观察控制台更新 state 的时候，视图的 dom 局部更新**

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
