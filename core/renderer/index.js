


function isNumberOrString(value) {
  return ['string', 'number'].includes(typeof value);
}

// n1 --> old
// n2 --> new
export function diff(n1, n2) {
  console.log('n1-old: ', n1);
  console.log('n2-new: ', n2);

  // tag
  if (n1.tag !== n2.tag) {
    n1.el.replaceWith(document.createElement(n2.tag))
  } else {
    // 细节注意： 保证 n2 有可挂载的 el
   const el = (n2.el = n1.el);

    // props
    // new -> {id: 'foo', class: 'bar', a }
    // old -> {id: 'foo', class: 'bar1', a, b}
    const { props: oldProps } = n1;
    const { props: newProps } = n2;

    // update / add
    if (oldProps && newProps) {
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
      Object.keys(oldProps).forEach((key) => {
        if (!newProps[key]) {
          el.removeAttribute(key);
        }
      })
    }


    // children -- diff
    const { children: newChildren } = n2;
    const { children: oldChildren } = n1;

    // 都为字符串
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

  }
}



export function mountElement(vnode, container) {
  const { tag, props, children } = vnode;

  // tag
  const el = vnode.el = document.createElement(tag)

  // props

  for (let key in props) {
    const value = props[key]
    el.setAttribute(key, value);
  }

  // children-string
  if (typeof children === 'string' || typeof children === 'number') {
    
    const textNode = document.createTextNode(children)
    el.appendChild(textNode); 

    // 接受的若为 数组
  } else if (Array.isArray(children)) {
    children.forEach((v) => {
      mountElement(v, el);
    })
  }

  container.appendChild(el);
}