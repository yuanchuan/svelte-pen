if (typeof customElements !== 'undefined') {
  const resourceCache = {};
  let rollup;
  let compile;

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
      let template = this.querySelector('template');
      if (!template) {
        console.warn('Please put source code inside the <template> tag.');
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
        if (isSvelteModule(dep)) {
          return await getModuleSource(dep, meta)
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

  async function getMainSource(element, meta) {
    if (!compile) {
      compile = (await import(`https://unpkg.com/svelte@${meta.version}/compiler.mjs`)).compile;
    }
    try {
      let { js } = compile(element.innerHTML);
      return js.code;
    } catch (e) {
      return '';
    }
  }
}
