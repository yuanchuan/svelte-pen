if (typeof customElements !== 'undefined' && !customElements.get('svelte-pen')) {
  const resourceCache = {};
  let rollup;
  let svelte;

  customElements.define('svelte-pen', class extends HTMLElement {
    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
      this.version = this.getAttribute('svelte:version') || '3.52.0';
      this.setInitialStyle();
    }
    connectedCallback() {
      this.init();
    }
    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
      }
      if (this.component && this.component.$destroy) {
        this.component.$destroy();
      }
    }
    async init() {
      let template =
        this.querySelector(':scope > textarea') ||
        this.querySelector(':scope > template');
      if (!template) {
        return false;
      }
      const meta = {
        version: this.version,
        resourceCache: resourceCache,
      }
      if (!rollup) {
        rollup = await getRollup();
      }
      const bundle = await rollup({
        input: 'main.js',
        plugins: [transformInputSource(template, meta)]
      });

      let output = (await bundle.generate({ format: 'esm' })).output[0].code;
      let url = URL.createObjectURL(new Blob([output], { type: 'application/javascript' }));

      let Component = (await import(url)).default;
      if (Component) {
        try {
          this.component = new Component({
            target: this.root,
            props: this.getAttributeMapping()
          });
        } catch (e) {
          console.warn(e);
        }
      }
      this.watchAttributes();
    }
    setInitialStyle() {
      this.root.innerHTML = `
        <style>:host { display: contents }</style>
      `;
    }
    getAttributeMapping() {
      let mapping = {};
      for (let name of this.getAttributeNames()) {
        if (!/^svelte:/.test(name)) {
          mapping[name] = this.getAttribute(name);
        }
      }
      return mapping;
    }
    watchAttributes() {
      this.observer = new MutationObserver(mutationList => {
        if (!this.component) {
          return false;
        }
        for (let {type, attributeName: name} of mutationList) {
          if (type === 'attributes' && !/^svelte:/.test(name)) {
            this.component.$set({ [name]: this.getAttribute(name) });
          }
        }
      });
      this.observer.observe(this, { attributes: true });
    }
  });

  async function getSvelte(version) {
    return await import(`https://unpkg.com/svelte@${version}/compiler.mjs`);
  }

  async function getSvelteModule(version, name) {
    return await (await fetch(`https://unpkg.com/svelte@${version}${name}/index.mjs`)).text();
  }

  async function getRollup() {
    return (await import('https://unpkg.com/@rollup/browser@3.2.3/dist/es/rollup.browser.js')).rollup;
  }

  function isMainSource(name) {
    return name === 'main.js';
  }

  function isSvelteModule(name) {
    return name && (name === 'svelte' || name.startsWith('svelte/'));
  }

  function isCodepenHost() {
    let hostname = location.hostname;
    return hostname === 'codepen.io' || hostname === 'cdpn.io';
  }

  function isCodePenModule(name) {
    let matchedHead = name.startsWith('https://codepen.io/');
    let matchedHost = name.startsWith('/') && isCodepenHost();
    let matchedTail = name.endsWith('.svelte');
    return (matchedHead || matchedHost) && matchedTail;
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

  function printError(e) {
    console.warn(`(${e.code}) ${e.message}: Line ${e.start.line}, column ${e.start.column}. \n\n${e.frame}`);
  }

  function transformInputSource(element, meta) {
    return {
      name: 'input-source',
      resolveId(name) {
        if (isMainSource(name)) {
          return name;
        }
        if (isCodePenModule(name)) {
          return name;
        }
        name = resolve(name);
        if (isSvelteModule(name)) {
          return name;
        }
        return null;
      },
      async load(dep) {
        if (isMainSource(dep)) {
          return getMainSource(element, meta);
        }
        if (isCodePenModule(dep)) {
          return await getCodePenSource(dep, meta);
        }
        if (isSvelteModule(dep)) {
          return await getModuleSource(dep, meta)
        }
        return null;
      },
      async transform(code, dep) {
        if (isCodePenModule(dep)) {
          if (!svelte) {
            svelte = await getSvelte(meta.version);
          }
          try {
            return svelte.compile(code).js;
          } catch (e) {
            printError(e);
          }
        }
        return null;
      }
    }
  }

  function getTemplateValue(element) {
    let tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea') return element.value;
    return element.innerHTML;
  }

  async function getModuleSource(name, meta) {
    if (name === 'svelte') {
      name = '/';
    } else {
      name = name.replace('svelte/', '/');
    }
    if (meta.resourceCache[name]) {
      return meta.resourceCache[name];
    }
    let text = getSvelteModule(meta.version, name);
    return meta.resourceCache[name] = text;
  }

  async function getMainSource(element, meta) {
    if (!svelte) {
      svelte = await getSvelte(meta.version);
    }
    let html = getTemplateValue(element);
    try {
      return svelte.compile(html).js.code;
    } catch (e) {
      printError(e);
      return 'export default null';
    }
  }

  async function getCodePenSource(name, meta) {
    name = name.replace(/\.svelte$/, '.html');
    if (meta.resourceCache[name]) {
      return meta.resourceCache[name];
    }
    let html = await (await fetch(name)).text();
    let template = document.createElement('template');
    let source = '';
    template.innerHTML = html;
    let innerTemplate =
      template.content.querySelector('svelte-pen > textarea') ||
      template.content.querySelector('svelte-pen > template');
    if (innerTemplate) {
      source = getTemplateValue(innerTemplate);
    }
    if (source) {
      meta.resourceCache[name] = source;
    }
    return source;
  }
}
