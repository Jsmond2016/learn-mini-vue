
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
          // init
          isMounted = true;
          rootContainer.innerHTML = "";
          const vnodeTree = rootComponent.render(context);
          mountElement(vnodeTree, rootContainer)
          preVnodeTree = vnodeTree;
        } else {
          console.log('update');
          // update
          const vnodeNewTree = rootComponent.render(context);
          diff(preVnodeTree, vnodeNewTree);
          preVnodeTree = vnodeNewTree;
        }
      })
    },

  }
}