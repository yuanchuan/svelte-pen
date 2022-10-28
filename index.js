if (typeof customElements !== 'undefined') {
  const resourceCache = {};
  let rollup;
  let svelte;

  class SveltePen extends HTMLElement {
    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
      this.id = 'svelte-pen-' + Math.random();
      this.version = this.getAttribute('version') || '3.52.0';
    }
    connectedCallback() {
      this.init();
    }
    async init() {
      let template = this.querySelector('textarea') || this.querySelector('template');
      if (!template) {
        return false;
      }
      const meta = {
        id: this.id,
        version: this.version,
        resourceCache: resourceCache,
      }
      if (!rollup) {
        rollup = (await import('https://unpkg.com/@rollup/browser@3.2.3/dist/es/rollup.browser.js')).rollup;
      }
      const bundle = await rollup({
        input: 'main.js',
        plugins: [transformInputSource(template, meta)]
      });

      let output = (await bundle.generate({ format: 'esm' })).output[0].code;
      let url = URL.createObjectURL(new Blob([output], { type: 'application/javascript' }));

      let Component = (await import(url)).default;
      if (Component) {
        new Component({ target: this.root });
      }
    }
  }
  if (!customElements.get('svelte-pen')) {
    customElements.define('svelte-pen', SveltePen);
  }

  function isSvelteModule(name) {
    return name && (name === 'svelte' || name.startsWith('svelte/'));
  }

  function isCodePenModule(name) {
    let matchedHead = name.startsWith('https://codepen.io/') || name.startsWith('/');
    let matchedTail = name.endsWith('.svelte');
    return matchedHead && matchedTail;
  }

  function resolve(name) {
    if (isSvelteModule(name)) {
      return name;
    }
    if (/^\./.test(name) || /^index\./.test(name)) {
      return 'svelte/' + name
        .replace(/\/index\.mjs$/, '')
        .replace(/^\.\//, '')
        .replace(/^(\.\.\/)+/, '')
        .replace(/^\.\.\//, '');
    }
    return name;
  }

  function transformInputSource(element, meta) {
    return {
      name: 'input-source',
      resolveId(name) {
        if (isCodePenModule(name)) {
          return name;
        }
        if (name === 'main.js') {
          return name;
        }
        name = resolve(name);
        if (isSvelteModule(name)) {
          return name;
        }
        return null;
      },
      async load(dep) {
        if (dep === 'main.js') {
          return getMainSource(element, meta);
        }
        if (isCodePenModule(dep)) {
          return await getCodePenSource(dep);
        }
        if (isSvelteModule(dep)) {
          return await getModuleSource(dep, meta)
        }
        return null;
      },
      async transform(code, dep) {
        if (isCodePenModule(dep)) {
          if (!svelte) {
            svelte = (await import(`https://unpkg.com/svelte@${meta.version}/compiler.mjs`));
          }
          return svelte.compile(code).js;
        }
        return null;
      }
    }
  }

  async function getModuleSource(name, meta) {
    if (name === 'svelte') {
      name == '/';
    } else {
      name = name.replace('svelte/', '/');
    }
    if (meta.resourceCache[name]) {
      return meta.resourceCache[name];
    }
    let text = await (await fetch(`https://unpkg.com/svelte@${meta.version}${name}/index.mjs`)).text();
    return meta.resourceCache[name] = text;
  }

  function getElementValue(element) {
    let tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') return element.value;
    return element.innerHTML;
  }

  async function getMainSource(element, meta) {
    if (!svelte) {
      svelte = (await import(`https://unpkg.com/svelte@${meta.version}/compiler.mjs`));
    }
    try {
      let html = getElementValue(element);
      let result = svelte.compile(html);
      return result.js.code;
    } catch (e) {
      return '';
    }
  }

  async function getCodePenSource(name) {
    name = name.replace(/\.svelte$/, '.html');
    let html = await (await fetch(name)).text();
    let template = document.createElement('template');
    template.innerHTML = html;
    let innerTemplate =
      template.content.querySelector('svelte-pen template') ||
      template.content.querySelector('svelte-pen textarea');
    if (!innerTemplate) return '';
    return getElementValue(innerTemplate);
  }
}
