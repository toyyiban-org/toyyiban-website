/* X User Interface */
import * as pop_ from 'https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.6.1/+esm';
import {$, $$, app, system, Cookie, meta, reg, TimeUtil, StrUtil, resizeImage} from '/js/x.js';
import '/js/x-svg.js';

export const pop = pop_;

export function scroll(state) {
	if (!state) {
		if (window.innerWidth > document.documentElement.clientWidth) document.documentElement.classList.add('noscroll');
	}
	else document.documentElement.classList.remove('noscroll');
}

/* TOOLTIP */
(() => {
	const tipEl = document.createElement('p');
	tipEl.className = 'tooltip';
	document.body.append(tipEl);
	let timer = {el: null, tip: null};

	document.addEventListener('mousemove', ev => {
		clearTimeout(timer.el);
		timer.el = setTimeout(() => {
			const el = document.elementFromPoint(ev.clientX, ev.clientY);
			if (el) {
				const tip = el.dataset.tip;
				if (!tip) return;
				tipEl.textContent = tip;
				pop.computePosition(el, tipEl, {
					placement: el.dataset.tipPos || 'bottom',
					middleware: [pop.offset(5), pop.flip(), pop.shift({padding: 10})],
				  }).then(({x, y}) => {
					Object.assign(tipEl.style, {left: `${x}px`, top: `${y}px`});
				});
				tipEl.classList.add('scale-1');
				clearTimeout(timer.tip);
				timer.tip = setTimeout(() => { tipEl.classList.remove('scale-1'); }, 2000);
			}
		}, 500);
	});

	document.addEventListener('click', () => {
		clearTimeout(timer.el);
		tipEl.classList.remove('scale-1');
	});
})();

/* ALERT */
const alertEl = document.createElement('section');
alertEl.className = 'alert-group';
document.body.append(alertEl);

export function alert(content, state, duration) {
	const el = document.createElement('p');
	el.className = `alert ${state || 'neutral'}`;
	el.innerHTML = content;
	alertEl.append(el);
	setTimeout(() => alertEl.removeChild(el), duration || 2000);
}


/* CUSTOM ELEMENTS
- XElement a tiny wrapper to stabilize custom elements
*/
reg.dataset = {}; // for use with custom components

export const nextId = (function() {
	var nextIdx = 0;
	return function(prefix) {
		return(prefix + '-' + nextIdx++);
	}
})();

export const nextLayer = (function() {
	var z = 50000;
	var step = 100;
	return function() {
		z += step;
		return z;
	}
})();

export class XElement extends HTMLElement {
	// static observedAttributes = ['title']; // setup attribute to observe

	constructor() { // element created without attributes and children <my-element
		super();
		if (this._init) this._init();
	}

	connectedCallback() {
		if (!this._created) {
			if (this._create) this._create();
			this.created = true;
		}
		if (this._attach) this._attach();
	}

	disconnectedCallback() { if (this._detach) this._detach(); }
	adoptedCallback() { if (this._adopt) this._adopt(); }

	attributeChangedCallback(name, o, n) {
		if (this._attr) this._attr(name, n);
	}

	set data(v) { this._data = v; } //allow to attach any data types
	get data() { this._data; }
}


customElements.define('x-div', class extends XElement {});


const panelOrigin = { // panel transform-origin
	'top': 'bottom center',
	'top-start': 'bottom left',
	'top-end': 'bottom right',
	'right': 'left center',
	'right-start': 'top left',
	'right-end': 'bottom left',
	'bottom': 'top center',
	'bottom-start': 'top left',
	'bottom-end': 'top right',
	'left': 'right center',
	'left-start': 'top right',
	'left-end': 'bottom right'
};

export class XPanel extends XElement {
	_init() {
		this.evOpen = new Event('open');
		this.evClose = new Event('close');
		this.timeout = null;
	}

	_create() {
		const self = this;
		if (!this.dataset.id) this.dataset.id = nextId('x-panel');
		this.classList.add('panel');
		this.tabIndex = -1;

		if (this.dataset.float !== undefined) {
			this.classList.add('float');
			if (!this.dataset.pos) this.dataset.pos = 'bottom-start';

			if (this.dataset.cover !== undefined) {
				const el = document.createElement('div');
				el.className = `cover ${(this.dataset.coverDim !== undefined)?'dim':''}`;
				el.tabIndex = -1;
				if (this.dataset.blocking === undefined) {
					el.addEventListener('click', ev => {
						ev.stopPropagation();
						self.close()
					});
				}
				this.parentElement.prepend(el);
				this.coverEl = el;
			}
		}
		this.removeAttribute('hidden');
	}

	get anchor() {
		const v = this.dataset.anchor;
		return (typeof v === 'string')? $(v) : v;
	}

	get isOpen() { return (this.style.scale == '1'); }

	onEscape(ev) {
		ev.stopPropagation();
		if (ev.key === 'Escape' || ev.code === 'Escape') this.close();
	}

	toggle() {
		if (this.isOpen) this.close();
		else this.open();
	}

	open(par={}) {
		this.removeAttribute('hidden'); // temp fix
		if (this.dataset.float === undefined) return;
		if (!this.closeStyle) this.closeStyle = this.style.scale;

		this.z = nextLayer();
		this.style.zIndex = this.z + '';
		if (this.coverEl) {
			this.coverEl.style.zIndex = (this.z-10) + '';
			this.coverEl.classList.add('visible', 'opacity-1');
			if (this.dataset.noScroll !== undefined) scroll(false);
	
			if (this.dataset.cancel !== undefined) this.coverEl.addEventListener('keydown', this.onEscape);
			else this.coverEl.removeEventListener('keydown', this.onEscape);
		}

		const a = this.anchor;
		if (a) {
			const self = this;
			pop.computePosition(a, this, {
				placement: this.dataset.pos,
				middleware: [pop.offset(self.dataset.offset || 3), pop.flip(), pop.shift({crossAxis:true})],
			}).then(({x, y, placement}) => {
				const s = self.style;
				s.left = `${x}px`; s.top = `${y}px`;
				s.transformOrigin = panelOrigin[placement];
				self.style.scale = '1';
			});

		} else this.style.scale = '1';

		if (this.dataset.cancel !== undefined) this.addEventListener('keydown', this.onEscape);
		else this.removeEventListener('keydown', this.onEscape);

		if (par.duration) {
			this.timeout = setTimeout(() => this.close(), par.duration);
		} else if (this.timeout) clearTimeout(this.timeout);

		if (this.dataset.focus !== undefined) {
			if (this.dataset.focus != 'none') {
				const el = this.querySelector(this.dataset.focus);
				if (el) el.focus();
			}
		} else this.focus();

		this.dispatchEvent(this.evOpen);
	}

	updatePos() {
		const self = this;
		pop.computePosition(this.anchor, this, {
			placement: this.dataset.pos,
			middleware: [pop.offset(self.dataset.offset || 3), pop.flip(), pop.shift({crossAxis:true})],
		}).then(({x, y}) => {
			const s = self.style;
			self.style.left = `${x}px`; self.style.top = `${y}px`;
		});
	}

	close() {
		if (this.dataset.float === undefined) return;
		if (this.timeout) clearTimeout(this.timeout);
		if (this.coverEl) {
			this.coverEl.classList.remove('visible', 'opacity-1');
			if (this.dataset.noScroll !== undefined) scroll(true);
		}
		this.style.scale = this.closeStyle;
		this.dispatchEvent(this.evClose);
	}
};
customElements.define('x-panel', XPanel);


export class XModal extends XPanel {
	_create() {
		this.dataset.float = '';
		this.dataset.cover = '';
		this.dataset.coverDim = '';
		super._create();
		this.classList.remove('float');
		this.classList.add('modal');

		if (this.dataset.close !== undefined) {
			const el = document.createElement('button');
			el.className = 'flat float-tr text-link';
			el.innerHTML = '<svg class="icon"><use href="#icon-x-lg"></use></svg>';
			const self = this;
			el.addEventListener('click', ev => {
				ev.stopPropagation();
				self.close();
			});
			this.prepend(el);
		}
	}

	open(par={}) {
		const self = this;
		if (this.returnValue === undefined) this.returnValue = 'cancel'; // default
		super.open(par);
		if (par.focus) {
			const el = this.querySelector(par.focus);
			if (el) el.focus();
		}

		if (par.preOpen) par.preOpen(this);

		return new Promise((resolve) => {
			this.addEventListener('close', () => resolve(self.returnValue));
			self.resolver = resolve;
		});
	}
};
customElements.define('x-modal', XModal);


customElements.define('x-modal-basic', class extends XModal {
	_create() {
		super._create();
		this.dataset.cancel = '';
		const menuA = nextId('menu-anchor');

		this.innerHTML = `<section class="header title-bar" hidden>
			<p class="title grow font-bold text-s px py-sm"></p>
			<button class="hMenu flat hover" data-id="${menuA}"><svg class="icon"><use href="#icon-three-dots"></use></svg></button>
			<button class="close flat hover"><svg class="icon"><use href="#icon-x-lg"></use></svg></button>
			<x-menu hidden data-float data-cover data-anchor="[data-id='${menuA}']" data-pos="bottom-end" data-cancel></x-menu>
		</section>
		<section class="content"></section>
		<section class="action flex-row g items-center w-full justify-end px pb"></section>`;

		this.headerEl = this.querySelector('.header');
		this.titleEl = this.querySelector('.title');
		this.closeEl = this.querySelector('.close');
		this.menuBtnEl = this.querySelector('.hMenu');
		this.contentEl = this.querySelector('.content');
		this.actionEl = this.querySelector('.action');
		this.menuEl = this.querySelector('x-menu');

		const self = this;
		this.closeEl.addEventListener('click', ev => {
			ev.stopPropagation();
			self.close();
		});
		this.menuBtnEl.addEventListener('click', ev => {
			ev.stopPropagation();
			self.menuEl.open();
		});
		this.menuEl.addEventListener('itemclick', ev => {
			ev.stopPropagation();
			if (self.resolver) self.resolver(ev.detail.value);
			self.close();
		});
	}

	open(par={}) {
		const self = this;
		this.returnValue = 'cancel';

		this.closeEl.show(par.close || this.dataset.close !== undefined);
		this.titleEl.innerHTML = par.title || '';

		if (par.menu) {
			this.menuBtnEl.show(true);
			this.menuEl.empty();
			for (const m of par.menu) {
				let el = null;
				if (m.el) {
					if (typeof m.el === 'string') {
						el = document.createElement('div');
						el.innerHTML = m.el;
						el = el.firstChild;
					}
				} else {
					el = document.createElement('div');
					el.className = 'item icon-text';
					el.dataset.value = m.value;
					let h = '';
					if (m.icon) h += `<svg class="icon"><use href="#icon-${m.icon}"></use></svg>`;
					if (m.label) h += `<span>${m.label}</span>`;
					el.innerHTML = h;
				}
				this.menuEl.append(el);
			}

		} else this.menuBtnEl.show(false);

		if (par.title || par.menu || par.close || this.dataset.close !== undefined) this.headerEl.show(true);
		else this.headerEl.show(false);

		this.actionEl.empty();
		if (par.action) {
			for (const k in par.action) {
				const el = document.createElement('button');
				el.value = k;
				el.textContent = par.action[k];
				el.addEventListener('click', () => {
					self.returnValue = k;
					self.close();
				});
				this.actionEl.append(el);
			}
			this.actionEl.show(true);
		} else this.actionEl.show(false);

		if (par.message) par.content = `<p class="p">${par.message}</p>`;

		if (par.content) {
			if (typeof par.content === 'string') this.contentEl.innerHTML = par.content;
			else {
				this.contentEl.empty();
				this.contentEl.append(par.content);
			}
		}

		return super.open(par);
		// const el = this.contentEl.querySelector('input');
		// if (el) el.focus();
	}

	close() {
		this.menuEl.close();
		super.close();
	}
});


(() => { // default modal
	const el = document.createElement('x-modal-basic');
	el.id = 'hModal';
	document.body.append(el);
})();


customElements.define('x-menu', class extends XPanel {
	_create() {
		this.classList.add('menu');
		super._create();
		this.sub = null; // active sub

		const self = this;
		this.addEventListener('click', ev => {
			ev.stopPropagation();
			let item = ev.target.closest('[data-value]');
			if (item) {
				self.dispatchEvent(new CustomEvent('itemclick', {detail: {value: item.dataset.value}}));
				self.closeAll();

			} else {
				item = ev.target.closest('[data-sub]');
				if (item) {
					const m = $(`[data-id="${item.dataset.sub}"]`);
					if (!m) return;
					self.closeSub();

					if (!item.dataset.id) item.dataset.id = nextId('x-menu-item');
					m.dataset.anchor = `[data-id="${item.dataset.id}"]`;
					m.open();
					self.activeSub = m;
				}
			}
		});
	}

	closeSub() {
		if (this.activeSub) {
			this.activeSub.close();
			this.activeSub = null;
		}
	}

	closeAll() {
		$$('x-menu').forEach(e => {
			e.activeSub = null;
			e.close();
		});
	}

	close() {
		this.closeSub();
		super.close();
	}
});


customElements.define('x-human-time', class extends XElement {

	_create() {
		this._value = this.dataset.value;
		this._from = this.dataset.from;
		this._to = this.dataset.to;
		this.generate();
	}

	generate() {
		let ret = null;
		const f = this.dataset.format;
		if (f == 'since') {
			if (this._value) ret = TimeUtil.humanSince(this._value);

		} else if (f == 'duration') {
			if (this._from || this._to) ret = TimeUtil.humanDuration(this._from, this._to);

		} else if (f == 'days-between') {
			if (this._from || this._to) ret = TimeUtil.daysBetween(this._from, this._to);
			if (ret == 1) ret += ' day';
			else if (ret > 1) ret += ' days'; 

		} else if (f == 'days-left') {
			if (this._value) ret = TimeUtil.daysLeft(this._value);
			if (ret == 1) ret += ' day';
			else if (ret > 1) ret += ' days'; 
		}

		this.textContent = ret || this._value || this.textContent;
	}

	set value(v) { this._value = v; this.generate(); }
	set range(v) {
		this._from = v.form; this._from = v.form;
		this.generate();
	}

	get value() { return this._value; }
});


customElements.define('x-human-number', class extends XElement {

	_create() {
		this._value = this.dataset.value;
		this._from = this.dataset.from;
		this._dp = null; // decimal places
		let v =  this.dataset.decimals;
		if (v) {
			v = v.split(',');
			this._dp = {
				minimumFractionDigits: (v[0]) ? parseInt(v[0]) : undefined,
				maximumFractionDigits: (v[1]) ? parseInt(v[1]) : parseInt(v[0])
			}
		}
		this.generate();
	}

	generate() {
		const f = this.dataset.format;
		let ret = (typeof this._value === 'string')? parseFloat(this._value) : this._value;
		if (this._dp) ret = ret.toLocaleString(undefined, this._dp);
		else if (this._value) ret = ret.toLocaleString();

		if (f == 'percent') ret += '%';
		this.textContent = ret || this._value || '0';
	}

	set value(v) { this._value = v; this.generate(); }
	get value() { return this._value; }
});


customElements.define('x-tag-group', class extends XElement {
	_create() {
		this.classList.add('tag-group', 'text-sm');
	}

	add(...tags) {
		const url = this.dataset.url;
		let h = '';
		for (const t of tags) {
			h += `<a class="tag" aria-label="${t}" ${(url)? 'href="'+url.replace('{TAG}', t)+'"' :''}>${t}</a>`;
		}
		this.innerHTML += h;
	}
});


customElements.define('x-tag-input', class extends XElement {
	_create() {
		this.className += ' flex-col justify-center';
		this.innerHTML = `<a class="w-full">Add tag</a>
		<x-tag-group hidden class="w-full"></x-tag-group>
		<input type="text" enterkeyhint="done" placeholder="eg: halal-food" class="w-full" hidden>`;

		this.addEl = this.querySelector('a');
		this.groupEl = this.querySelector('x-tag-group');
		this.inputEl = this.querySelector('input');

		const self = this;
		this.addEl.addEventListener('click', ev => {
			ev.preventDefault();
			self.editMode(true);
		});

		this.groupEl.addEventListener('click', ev => {
			ev.preventDefault();
			self.editMode(true);
		});

		this.inputEl.addEventListener('keyup', ev => {
			if (ev.key === 'Enter' || ev.code === 'Enter') {
				ev.preventDefault();
				self.editMode(false);
			}
		});
	}

	editMode(state) {
		if (state) {
			this.groupEl.show(false);
			this.addEl.show(false);
			this.inputEl.show(true);
			this.inputEl.focus();

		} else {
			this.inputEl.show(false);
			this.cleanTags();
			const s = this.inputEl.value;
			if (!s) {
				this.addEl.show(true);
				this.groupEl.show(false);
			} else {
				this.addEl.show(false);
				this.groupEl.empty();
				this.groupEl.add(...s.split(' '));
				this.groupEl.show(true);
			}
		}
	}

	cleanTags() {
		let s = this.inputEl.value.toLowerCase().trim();
		if (s) {
			let arr = s.split(/\s+/);
			arr = arr.map(v => { return v.replace(/[^a-z0-9]+/g,'-'); });
			arr = arr.filter(v => (v.length > 2 && v != '-'));
			s = [...new Set(arr)].join(' ');
		}
		this.inputEl.value = s;
	}

	get tags() {
		this.cleanTags();
		const v = this.inputEl.value;
		return (v) ? v.split(' ') : [];
	}

	set tags(s) {
		this.inputEl.value = (s) ? s.join(' ') : '';
		this.cleanTags();
		this.editMode(false);
	}
});


customElements.define('x-progress-bar', class extends XElement {
	_create() {
		this.classList.add('progress-bar');
		const el = document.createElement('div');
		el.className = 'bar';
		this.append(el);
		this.barEl = el;
		this.hasLabel = (this.dataset.label !== undefined);
		this.update();
	}

	set progress(v) {
		if (v) this.dataset.progress = v;
		this.update();
	}

	update() {
		if (!this.barEl) return;
		const pc = (this.dataset.progress)? parseInt(this.dataset.progress) : 0;
		this.barEl.style.setProperty('--percent', pc +'%');
	}
});


customElements.define('x-progress-ring', class extends XElement {
	_create() {
		this.classList.add('progress-ring');
		this.hasLabel = (this.dataset.label !== undefined);
		this.update();
	}

	set progress(v) {
		if (v) this.dataset.progress = v;
		this.update();
	}

	update() {
		const pc = (this.dataset.progress)? parseInt(this.dataset.progress) : 0;
		this.style.background = "conic-gradient(var(--progress, var(--green)) calc(" + pc + "%), var(--ring, var(--bg-b)) 0deg)";
		if (this.hasLabel) this.dataset.label = pc + '%';
	}
});


customElements.define('x-carousel', class extends XElement {
	_init() { this.count = 1; }

	_create() {
		this.classList.add('carousel');
		this.innerHTML = `<div class="slides"></div>
		<nav class="flex-wrap g justify-center"></nav>`;
	}

	add(...slides) {
		const sEl = this.querySelector('.slides');
		const nEl = this.querySelector('nav');
		const sId = (this.id) ? this.id : 'x-carousel';

		for (let el of slides) {
			if (typeof el === 'string') {
				const t = document.createElement('div');
				t.className = 'my-auto';
				t.innerHTML = el;
				el = t;
			}
			el.id = `${sId}-slide-${this.count}`;
			sEl.append(el);

			el = document.createElement('a');
			el.setAttribute('tab-index', '0');
			el.href = `#${sId}-slide-${this.count}`;
			nEl.append(el);
			this.count++;
		}
	}
});


customElements.define('x-result', class extends XElement {

	_init() {
		this.evMore = new Event('moreclick');
	}

	_create() {
		this.classList.add('flex-col', 'g', 'w-full');

		this._hasMore = false;
		let el =this.querySelector('[data-content]');
		if (!el) {
			el = document.createElement('section');
			el.dataset.content='';
			el.classList.add('w-full', 'flex-col', 'g-sm');
			this.append(el);
		}
		this.contentEl = el;

		el =this.querySelector('[data-empty]');
		if (!el) {
			el = document.createElement('p');
			el.dataset.empty='';
			el.classList.add('italic');
			el.textContent = this.dataset.emptyText || 'It seems there is nothing here.';
			this.append(el);
		}
		this.emptyEl = el;

		el =this.querySelector('[data-more]');
		if (!el) {
			el = document.createElement('a');
			el.dataset.more='';
			el.classList.add('text-sm', 'font-bold');
			el.textContent = this.dataset.moreText || 'Show more';
			this.append(el);
		}
		this.moreEl = el;

		this.contentEl.show(false);
		this.emptyEl.show(false);
		this.moreEl.show(false);
		this.moreEl.addEventListener('click', ev => this.dispatchEvent(this.evMore));
	}

	refresh() {
		if (this.contentEl.children.length) {
			this.contentEl.show(true);
			this.emptyEl.show(false);

		} else {
			this.emptyEl.show(true);
			this.contentEl.show(false);
		}
	}

	set hasMore(state) {
		this._hasMore = state;
		this.moreEl.show(state);
	}

	get hasMore() { return this._hasMore; }

	clearResult() {
		this.emptyEl.show(true);
		this.contentEl.show(false);
		this.moreEl.show(false);
		this._hasMore = false;
	}
});


customElements.define('x-media-input', class extends XElement {
	_create() { // TODO, support for audio and video?
		this.classList.add('media-input');
		const id = nextId('mediaInput');
		const types = (this.dataset.type || 'image').split(',');
		const accept = types.map(e => {
			if (e == 'image') return 'image/png,image/jpeg';
			else if (e == 'audio') return 'audio/mpeg,audio/aac';
			else if (e == 'video') return 'video/mp4';
		}).join(',').split(',');

		this.innerHTML = `<div class="flex-row g items-center">
		<svg class="icon-lg"><use href="#icon-upload"></use></svg>
		<p class="flex-col text-sm">
			<span>Drop and drop file,</span> <span>or click to select</span>
		</p></div>
		<input type="file" id="${id}" accept="${accept.join(',')}"/>`;

		const maxW = parseInt(this.dataset.maxwidth || 0);
		const maxH = parseInt(this.dataset.maxheight || 0);
		const avgColor = (this.dataset.avgcolor !== undefined);

		const self = this;
		this.inputEl = this.querySelector('input');
		this.inputEl.addEventListener('dragenter', () => this.classList.add('drag'));
		this.inputEl.addEventListener('dragleave', () => this.classList.remove('drag'));
		this.inputEl.addEventListener('drop', () => this.classList.remove('drag'));
		this.inputEl.addEventListener('change', async ev => {
			const f = ev.target.files[0];
			if (!f || !accept.includes(f.type)) return;
			let m = {
                mediaType: f.type,
				url: URL.createObjectURL(f),
				name: StrUtil.sanitizeFN(f.name).join('.')
            };

			if (f.type.startsWith('image/') && (maxW || maxH)) {
				const r = await resizeImage (m.url, maxW, maxH, avgColor);
				m = {...m, ...r};
			} else if (f.type.startsWith('audio/')) {
				m.content = await StrUtil.toBase64(f);
			}

			self.dispatchEvent(new CustomEvent('selected', { detail: {media: m} }));
		});
	}
});


customElements.define('x-media-input-group', class extends XElement {
	_init() { this._media = []; }

	_create() {
		this.classList.add('media-input-group');
		const types = (this.dataset.type || 'image').split(',');
		let label = this.dataset.label;
		if (!label) label = types.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');

		this.limit = parseInt(this.dataset.limit || 0);
		this.imageLimit = parseInt(this.dataset.imageLimit || 0);
		this.audioLimit = parseInt(this.dataset.audioLimit || 0);
		this.innerHTML = `<fieldset><legend class="label-text">${label}</legend>
		<x-media-input data-type="${this.dataset.type || 'image'}"
		data-maxwidth="${this.dataset.maxwidth}"
		data-maxheight="${this.dataset.maxheight}"
		${(this.dataset.avgcolor !== undefined)? 'data-avgcolor':''}></x-media-input>
		</fieldset>`;

		const self = this;
		this.querySelector('x-media-input').addEventListener('selected', ev => {
			const m = ev.detail.media;
			if (self._media .some(e => (e.name && e.name == m.name))) {
				self.dispatchEvent(new CustomEvent('alert', {
					detail: {msg: 'File already added', state: 'danger'}
				}));
				return;
			}

			let limitM = null;
			if (this.limit && self._media.length >= this.limit) limitM = `Only ${self.limit} files allowed`;
			if (this.imageLimit && m.mediaType.startsWith('image/')) {
				const len = self._media.filter(e => e.mediaType.startsWith('image/')).length;
				if (len >= this.imageLimit) limitM = `Only ${self.imageLimit} images allowed`;
			}
			if (this.audioLimit && m.mediaType.startsWith('audio/')) {
				const len = self._media.filter(e => e.mediaType.startsWith('audio/')).length;
				if (len >= this.audioLimit) limitM = `Only ${self.audioLimit} audio allowed`;
			}

			if (limitM) {
				self.dispatchEvent(new CustomEvent('alert', {
					detail: {msg: `${limitM}, remove unused to make space`, state: 'danger'}
				}));
				return;
			}
			this._media .push(m);
			this.generate();
			self.dispatchEvent(new CustomEvent('itemadded', { detail: {media: m} }));
		});
	}

	get media () { return this._media ; }
	set media (v) {
		this._media  = v;
		this.generate();
	}

	generate() {
		const self = this;
		const p = this.querySelector('fieldset');
		this.querySelectorAll('.item').forEach(e => e.remove());
		for (const v of this._media ) {
			const el = document.createElement('div');
			el.className = 'item';
			el.setAttribute('draggable', 'true');
			el.dataset.tip = v.name;
			el.dataset.name = v.name;
			el.innerHTML = `<svg class="icon-lg float-action event-auto"><use href="#icon-dash"></use></svg>
			<img loading="lazy" src="${v.url}"
			onerror="this.onerror=null; this.src='/img/def-${(v.mediaType.startsWith('audio/'))? 'audio':'image'}.svg'" />`;
			p.append(el);

			el.addEventListener('click', () => {
				const m = self._media.find(e => e.name === el.dataset.name);
				self.dispatchEvent(new CustomEvent('itemclick', { detail: {media: m} }));
			});

			el.querySelector('.float-action').addEventListener('click', ev => {
				ev.stopPropagation();
				const i = self._media.findIndex(e => e.name === el.dataset.name);
				if (i != -1) {
					self._media.splice(i, 1);
					self.dispatchEvent(new CustomEvent('itemremoved', { detail: {media: self._media[i]} }));
					self.generate();
				}
			});
		}
	}
});


export class XDrawer extends XElement {
	_create() {
		this.classList.add('drawer');
		if (!system.isWide) {
			this.tabIndex = -1;

			const el = document.createElement('div');
			el.innerHTML = `<div class="flex-row items-center g py-xs pr-xs">
			<p class="grow pl text-lg">${this.dataset.title || ''}</p>
			<button class="flat hover"><svg class="icon"><use href="#icon-x-lg"></use></svg></button></div>`;

			const self = this;
			el.querySelector('button').addEventListener('click', () => self.close());
			this.prepend(el.firstChild);

			if (this.dataset.cover !== undefined) {
				const el = document.createElement('div');
				el.className = 'cover dim';
				el.tabIndex = -1;

				el.addEventListener('click', ev => {
					ev.stopPropagation();
					self.close()
				});

				this.parentElement.prepend(el);
				this.coverEl = el;
			}
		}
		this.removeAttribute('hidden');
	}

	open() {
		if (system.isWide) return;
		this.z = nextLayer();
		this.style.zIndex = this.z + '';
		this.dataset.open = '';

		if (this.coverEl) {
			this.coverEl.style.zIndex = (this.z-10) + '';
			this.coverEl.classList.add('visible', 'opacity-1');
		}
	}

	close() {
		if (system.isWide) return;
		delete this.dataset.open;
		if (this.coverEl) { this.coverEl.classList.remove('visible', 'opacity-1'); }
	}
};
customElements.define('x-drawer', XDrawer);


customElements.define('x-button-group', class extends XElement {
	_create() {
		const self = this;
		this.classList.add('button-group');
		this.addEventListener('click', ev =>{
			const el = ev.target.closest('button');
			if (el && el.dataset.value && el.dataset.selected === undefined) {
				self.selected = el.dataset.value;
				self.dispatchEvent(new CustomEvent('itemclick', {detail: {value: el.dataset.value}}));				
			}
		});
	}

	set selected(v) {
		this.querySelectorAll('button').forEach(e => delete e.dataset.selected);
		if (!v) return;
		const el = this.querySelector(`[data-value="${v}"]`);
		if (el) el.dataset.selected = '';
	}

	get selected() {
		const el = this.querySelector(`[data-selected]`);
		return el.dataset.value || '';
	}
});


customElements.define('x-tab', class extends XElement {
	_create() {
		if (!this.dataset.id) this.dataset.id = nextId('x-tab'); // for menu anchor
		this.classList.add('tab');
		this.querySelectorAll('[data-value]').forEach(el => el.classList.add('item'));

		let el = document.createElement('div');
		el.className = 'icon-text text-b';
		el.dataset.more = '';
		el.innerHTML = '1 more...';
		this.append(el);
		el.show(false);
		this.moreEl = el;

		el = document.createElement('div');
		el.className = 'filler';
		this.append(el);
		this.fillEl = el;

		const self = this;
		this.addEventListener('click', ev => {
			ev.stopPropagation();
			const el = ev.target.closest('[data-value]');
			if (el) {
				if (el.dataset.disabled !== undefined) return;
				if (el.dataset.selected !== undefined) return;
				self.setSelect(el.dataset.value);
				self.dispatchEvent(new CustomEvent('itemclick', {detail: {value: el.dataset.value}}));
			}
		});
		this.adjust();
	}

	adjust() {
		const els = [...this.querySelectorAll('[data-value]')];
		if (!els.length) return;
		let pw = this.getBoundingClientRect().width;
		const ws = els.map(el => el.getBoundingClientRect().width); //.reduce((a,b) => a+b);

		let aw = ws.reduce((a,b) => a+b);
		if (aw < pw) {
			this.moreEl.show(false);
			if (this.fillEl.getBoundingClientRect().width + aw > pw) this.fillEl.show(false);
			return;
		}

		this.fillEl.show(false);
		if (!this.menuEl) {
			const self = this;
			const el = document.createElement('x-menu');
			el.dataset.float = '';
			el.dataset.cover = '';
			el.dataset.anchor =  `[data-id="${this.dataset.id}"] > [data-more]`;
			this.append(el);
			this.menuEl = el;
			this.menuEl.addEventListener('itemclick', ev => {
				self.switchTab(ev.detail.value);
				self.setSelect(ev.detail.value);
				self.dispatchEvent(new CustomEvent('itemclick', {detail: {value: ev.detail.value}}));
			});
		}

		this.moreEl.addEventListener('click', () => this.menuEl.open());
		pw -= this.moreEl.getBoundingClientRect().width;

		let out = false;
		let cw = 0;
		for (let i=0; i<ws.length; i++) {
			cw += ws[i];
			if (cw >= pw) out = true;
			if (out) this.menuEl.appendChild(this.removeChild(els[i]));
		}
		this.moreEl.innerHTML = this.menuEl.children.length +' more...';
	}

	switchTab(v) {
		let el = this.menuEl.querySelector(`[data-value="${v}"]`);
		let el2 = this.querySelector('*:nth-last-child(1 of [data-value])');
		if (!el || !el2) return;
		this.menuEl.removeChild(el);
		this.removeChild(el2);
		el.appendBefore(this.moreEl);
		this.menuEl.appendChild(el2);
		el2.classList.add('item');
	}

	setSelect(v) {
		this.querySelectorAll('[data-selected]').forEach(e => { delete e.dataset.selected; });
		if (v) {
			const el = this.querySelector(`[data-value="${v}"]`);
			if (el) el.dataset.selected = '';
		}
	}
});


customElements.define('x-flex-field', class extends XElement {
	_create() {
		this.classList.add('flex-col', 'g');
		this.innerHTML = `<div class="hFields flex-col g" hidden></div>
		<button class="hAdd flat hover text-s"><svg class="icon"><use href="#icon-plus"></use></svg><span>Add field</span></button>
		<x-menu class="hMenu" hidden data-float data-cover data-pos="bottom-end" data-cancel>
			<a class="item" data-value="delete">
			<svg class="icon"><use href="#icon-x"></use></svg>
			<span class="text">Delete field</span>
			</a>
			<a class="item" data-value="markdown">
			<svg class="icon"><use href="#icon-pencil-square"></use></svg>
			<span class="text">Markdown editor</span>
			</a>
		</x-menu>`;

		this.fEl = this.querySelector('.hFields');
		this.querySelector('.hAdd').addEventListener('click', async ev => this._addSelect());

		const self = this;
		this.mEl = this.querySelector('.hMenu');
		this.mEl.addEventListener('itemclick', ev => {
			const el = self.fEl.querySelector(`[data-field="${this.mEl.dataset.field}"]`);
			if (ev.detail.value == 'delete') {
				el.remove(); self.showFields();

			} else if (ev.detail.value == 'markdown') {
				const name = this.mEl.dataset.field;
				let c = document.createElement('div');
				c.innerHTML = `<x-markdown-edit data-field="${name}" data-type="markdown"
				data-title="${name}" data-editor-minheight="7rem"></x-markdown-edit>`;
				c = c.firstChild;
				const src = el.querySelector('.field input').value.trim();
				el.querySelector('.field').replaceWith(c);
				c.source = src;
				c.media = self.media;
				el.dataset.type = 'editor';
			}
		});
	}

	async _addSelect() {
		const r = await hModal.open({title:'New field', content: `
		<div class="flex-col g p">
			<div class="field w-full">
				<input type="text" class="w-full" maxlength="20" required placeholder=" "/>
				<label>Name *</label>
			</div>
		</div>`,
		action: {cancel:'Cancel', ok:'Ok'}});
		if (r != 'ok') return;
		const name = hModal.contentEl.querySelector('input').value.trim();
		this.add(name);
	}

	add(name, md) {
		if (!name) {
			this.dispatchEvent(new CustomEvent('alert', {
				detail: {msg: 'Name must not empty', state: 'danger'}
			})); return;
		}

		const el = document.createElement('div');
		el.dataset.id = nextId('flex-field');
		el.dataset.field = name;
		el.className = 'flex-row g-xs';

		let h = '';
		if (md) {
			el.dataset.type = 'editor';
			h = `<x-markdown-edit data-field="${name}" data-type="markdown"
			data-title="${name}" data-editor-minheight="7rem"></x-markdown-edit>`;

		} else {
			el.dataset.type = 'input';
			h = `<div class="field w-full">
			<input data-type="text" type="text" class="w-full" placeholder=" "/>
			<label>${name}</label></div>`;
		}

		h += `<button class="hMenu flat hover"><svg class="icon"><use href="#icon-three-dots-vert"></use></svg></button>`;
		el.innerHTML = h;
		this.fEl.append(el);
		const self = this;
		el.querySelector('button.hMenu').addEventListener('click', () => {
			self.mEl.dataset.anchor = `[data-id="${el.dataset.id}"] button.hMenu`;
			self.mEl.dataset.field = name;
			self.mEl.querySelector('[data-value="markdown"]').show((el.dataset.type=='input')? true:false);
			self.mEl.open();
		});

		this.showFields();
		return el;
	}

	showFields() { this.fEl.show((this.fEl.children.length)? true:false); }

	clearAll() { this.fEl.empty(); this.showFields(); }

	get data() {
		const d = {};
		this.fEl.querySelectorAll('[data-field]').forEach(el => {
			if (el.dataset.type == 'input') {
				d[el.dataset.field] = el.querySelector('input').value.trim();
			} else if (el.dataset.type == 'markdown') {
				const [text, _] = el.data;
				d[el.dataset.field] = text;
			}
		});
		return d;
	}

	set data(d) {
		for (const k in d) {
			let el = this.fEl.querySelector(`[data-field="${k}"]`);
			const isMulti = d[k].includes('\n');
			if (!el) el = this.add(k, isMulti);
			if (isMulti) {
				const c = el.querySelector('x-markdown-edit');
				c.source = d[k];
				c.media = this.media;
			}
			else el.querySelector('input').value = d[k];
		}
	}
});


customElements.define('x-editable-input', class extends XElement {
	_create() {
		console.log(this.childElementCount)
		const ch = this.children;
		this.editEl = this.querySelector('input') || this.querySelector('select');
		this.viewEl = this.querySelector('[data-view') || ch[0];

		const self = this;
		ch[0].addEventListener('click', ev => {
			ev.stopPropagation();
			self.editMode(true);
		});

		this.editEl.addEventListener('blur', () => { self.editMode(false) });

		if (this.editEl.tagName == 'INPUT') {
			this.editEl.addEventListener('keyup', ev => {
				if (ev.key === 'Enter' || ev.code === 'Enter') {
					this.viewEl.innerHTML = this.editEl.value.trim();
					self.editMode(false);
				} else if (ev.key === 'Escape' || ev.code === 'Escape') self.editMode(false);
			});
		}


	}

	editMode(state) {
		const ch = this.children;
		ch[0].show(!(!!state));
		ch[1].show(!!state);
		if (state) this.editEl.focus();
	}
});


customElements.define('x-persist-indicator', class extends XElement {
	_create() {
		this.innerHTML = `<button class="flat hover icon-text free-action">
		<svg class="icon"><use href="#icon-cloud-upload"></use></svg></button>`;
		this.btnEl = this.querySelector('button');
		this.svgEl = this.querySelector('svg');
		this.saved(true);
	}

	saved(state, tip) {
		const c = this.svgEl.classList;
		if (state) {
			c.remove('text-red'); c.add('text-b');
			this.btnEl.dataset.tip = tip || 'No unsaved changes';
		} else {
			c.remove('text-b'); c.add('text-red');
			this.btnEl.dataset.tip = tip || 'Changes not saved';
		}
	}
});


customElements.define('x-audio-player', class extends XElement {
	_create() {
		this.classList.add('audio-player');
		this.innerHTML = `<audio></audio>
		<div class="flex-row gap-xs border rounded-xl items-center">
			<button class="hPlay flat" data-tip="Play"><svg class="icon-xl"><use href="#icon-play-fill"></use></svg></button>
			<button class="hPause flat" data-tip="Pause" hidden><svg class="icon-xl"><use href="#icon-pause-fill"></use></svg></button>
			<span class="hTitle text-sm text-b">Audio</span>
		</div>`;
		this.audioEl = this.querySelector('audio');
		this.playEl = this.querySelector('.hPlay');
		this.pauseEl = this.querySelector('.hPause');
		this.titleEl = this.querySelector('.hTitle');
		if (this.dataset.src) this.src = this.dataset.src;
		if (this.dataset.title) this.title = this.dataset.title;

		const self = this;
		this.playEl.addEventListener('click', () => { self.audioEl.play(); self.resetBtn(); });
		this.pauseEl.addEventListener('click', () => { self.audioEl.pause(); self.resetBtn(); });
		this.resetBtn();
	}

	resetBtn() {
		if (!this.audioEl.paused) {
			//playing
			this.playEl.show(false); this.pauseEl.show(true);
		} else {
			this.playEl.show(true); this.pauseEl.show(false);
		}
	}

	set src(v) { this.audioEl.src = v }
	set title(v) { this.titleEl.textContent = v || 'Audio' }
});
