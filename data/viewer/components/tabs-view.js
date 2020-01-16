class TabsView extends HTMLElement {
  constructor() {
    super();
    this.config = {
      patch: 30, // number of entries on each step request
      timeout: 500 // ms to click the panel on scroll
    };
    const shadow = this.attachShadow({
      mode: 'closed'
    });
    shadow.innerHTML = `
      <style>
        :host {
          --bg-white: #fff;
          --bg-dark: #f3f3f3;
          --border: #cdcdcd;

          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        #tabs-container {
          display: flex;
          background-color: var(--bg-dark);
          padding-top: 2px;
          outline: none;
        }
        #tabs {
          flex: 1;
          white-space: nowrap;
          overflow: auto;
        }
        #tabs > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          cursor: pointer;
          padding: 5px 10px;
          margin-right: -1px;
          border: solid 1px var(--border);
        }
        #tabs > span[data-active="true"] {
          background-color: var(--bg-white);
          border-bottom-color: var(--bg-white);
          padding-top: 7px;
        }
        #extra {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        slot {
          flex: 1;
          white-space: nowrap;
          display: block;
          scroll-snap-type: x mandatory;
          overflow-x: hidden;
          overflow-y: hidden;
          scroll-behavior: auto;
        }
        ::slotted(*) {
          display: inline-block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          scroll-snap-align: center;
        }
      </style>
      <div id="tabs-container" tabindex=-1 title="Ctrl + Number or Command + Number (e.g.: Ctrl + 1 or Command + 1)">
        <div id="tabs"></div>
        <div id="extra"></div>
      </div>
      <slot id="contents"></slot>
    `;
    this.elements = {
      tabs: shadow.getElementById('tabs'),
      contents: shadow.getElementById('contents')
    };
  }
  keypress(e) {
    const meta = e.metaKey || e.ctrlKey;
    if (e.code.startsWith('Digit') && meta) {
      e.preventDefault();
      const input = this.elements.tabs.children[Number(e.key) - 1];
      if (input) {
        input.click();
      }
    }
  }
  navigate(panel) {
    const {tabs} = this.elements;
    for (const i of [...tabs.children]) {
      i.dataset.active = panel.tab === i;
      if (panel.tab === i) {
        i.scrollIntoView();
      }
    }
    // focus the panel
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => panel.click(), this.config.timeout);
  }
  connectedCallback() {
    const {tabs, contents} = this.elements;
    // keypress
    this.addEventListener('keydown', this.keypress);
    // tabs on click

    tabs.addEventListener('click', e => {
      const panel = e.target.panel;
      if (panel) {
        panel.scrollIntoView();
      }
    });
    // resize
    const resize = new ResizeObserver(() => {
      for (const i of [...tabs.children]) {
        if (i.dataset.active === 'true') {
          i.click();
        }
      }
    });
    resize.observe(this);
    // observe
    const observe = entries => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRect.width) {
          this.navigate(e.target);
        }
      }
    };
    const observer = new IntersectionObserver(observe, {
      root: this,
      threshold: 0.9
    });
    // slot change
    contents.addEventListener('slotchange', () => {
      for (const panel of contents.assignedElements().filter(p => !p.tab)) {
        observer.observe(panel);
        const span = document.createElement('span');
        span.textContent = panel.title || 'unknown';
        span.panel = panel;
        panel.tab = span;
        tabs.appendChild(span);
      }
    });
  }
}
window.customElements.define('tabs-view', TabsView);
