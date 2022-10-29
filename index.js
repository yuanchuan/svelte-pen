if (typeof customElements !== 'undefined' && !customElements.get('svelte-pen')) {
  const resourceCache = {};
  let rollup;
  let svelte;

  customElements.define('svelte-pen', class SveltePen extends HTMLElement {
    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
      this.version = this.getAttribute('version') || '3.52.0';
    }
    connectedCallback() {
      this.init();
    }
    disconnectedCallback() {
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
        this.component = new Component({ target: this.root });
      }
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
          return svelte.compile(code).js;
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
      name == '/';
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
    try {
      let html = getTemplateValue(element);
      let result = svelte.compile(html);
      return result.js.code;
    } catch (e) {
      return '';
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
