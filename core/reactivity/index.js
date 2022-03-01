
// v4

let currentEffect

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
  // dep.depend();
  currentEffect = null;
}

// const dep = new Dep(10)

// let b;
// effectWatch(() => {
//   b = dep.value + 10
//   console.log('b:', b)
// })

// // 值发生变更
// dep.value = 20




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

export {
  reactive,
  effectWatch
}
