/* X Core */
export const VERSION = 2024.02;

export const app = {}; // App cfg / registry
export const reg = {}; // Common registry

/* ALIAS */
export const $ = document.querySelector.bind(document);
export const $$ = document.querySelectorAll.bind(document);


/* COOKIE */
export class Cookie {

	static set(name, val, maxAge) {
		if (!maxAge) maxAge = 2147483647; // maximum
		document.cookie = name + '=' + encodeURIComponent(val) + '; max-age=' + maxAge + '; path=/';
	}

	static get(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return decodeURIComponent(c.substring(nameEQ.length,c.length));
		}
		return null;
	}

	static empty() {
		for (let i=0; i < arguments.length; i++)
			document.cookie = arguments[i] +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	}
}

/* SYSTEM */
export const system = {
	isWide: (window.matchMedia('(max-width: 767px)').matches) ? false : true,
	mode: Cookie.get('systemMode'),
	touchScreen: false,		// touchscreen and/or mouse support (mobile,pc)
	touchOnly: false		// touchscreen only (mobile)
};
system.isDev = (system.mode == 'dev') ? true : false;
if (window.matchMedia('(any-pointer: coarse)').matches) system.touchScreen = true;
if (window.matchMedia('(pointer: coarse)').matches) system.touchOnly = true;

export class System {
	static vw() {
		return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
	}

	static vh() {
		return Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
	}
}


/* META */
export const meta = {
	'tags': []
};
let els = $$('meta[name*="x."]');
for (let i=0; i<els.length; i++) {
	const n = els[i].name.replace('x.', '');
	let v = els[i].content;
	if (n == 'tags') v = v.replace(/\s+/g, ' ').split(' ');
	meta[n] = v;
}
if (!meta.page) meta.page = new URL(window.location.href).pathname.split('/').filter(Boolean).pop();


/* THEME */
export class Theme {
	static change(name) {
		document.documentElement.setAttribute('data-theme', name);
	}

	static toggle(name) {
		const el = document.documentElement;
		if (el.hasAttribute('data-theme')) el.removeAttribute('data-theme');
		else el.setAttribute('data-theme', name);
	}

	static set cache(name) {
		Cookie.set('theme', name);
	}

	static get cache() {
		return Cookie.get('theme');
	}

	static auto(device) {
		const cache = Cookie.get('theme');
		if (cache) Theme.change(cache);
		else if (device && window.matchMedia('(prefers-color-scheme: dark)')) Theme.change('dark');        
	}
}


/* LANGUAGE */
export const lingua = {
	eng: {
		'std-greet': 'Marhaba'
	},
	msa: {
		'std-greet': 'Apa khabar?'
	}
};

export class Lingua {
	static get(name, lang) {
		return lingua[lang][name] || lingua['eng'][name] || name;
	}
}


/* ELEMENT */
Element.prototype.appendBefore = function(node) {
	node.parentNode.insertBefore(this, node);
}, false;

Element.prototype.appendAfter = function(node) {
	node.parentNode.insertBefore(this, node.nextSibling);
}, false;

Element.prototype.empty = function() {
	while (this.firstChild) { this.removeChild(this.firstChild); }
};

Element.prototype.show = function(state) {
	if (state) this.removeAttribute('hidden');
	else this.setAttribute('hidden', '');
};

Element.prototype.toggleShow = function() {
	if (this.hasAttribute('hidden')) this.removeAttribute('hidden');
	else this.setAttribute('hidden', '');
};

Element.prototype.removeClassPrefix = function(prefix) {
	this.classList.remove(...[...this.classList].filter(e => e.startsWith(prefix)));
};

Element.prototype.scrollIntoViewEx = function(pos) {
	setTimeout(() => this.scrollIntoView({behavior:'smooth', block: pos || 'start'}), 100);
};

Element.prototype.swapWith = function(target) {
    const after = target.nextElementSibling;
	const p = target.parentNode;
	if (this === after) {
		p.insertBefore(this, target);
	} else {
		this.replaceWith(target);
		p.insertBefore(this, after);
	}
};

Element.prototype.partiallyVisible = function() {
	const r = this.getBoundingClientRect();
	const h = (window.innerHeight || document.documentElement.clientHeight);
	const w = (window.innerWidth || document.documentElement.clientWidth);
	const vert = (r.top <= h) && ((r.top + r.height) >= 0);
	const horiz = (r.left <= w) && ((r.left + r.width) >= 0);
	return (vert && horiz);
}

Element.prototype.fullyVisible = function() {
	const r = this.getBoundingClientRect();
	const h = (window.innerHeight || document.documentElement.clientHeight);
	const w = (window.innerWidth || document.documentElement.clientWidth);
	return ((r.left >= 0)
		&& (r.top >= 0)
		&& ((r.left + r.width) <= w)
		&& ((r.top + r.height) <= h)
	);
}


/* STRING */
export class StrUtil {
	static dashToCamel(v) {
		return v.replace(/-./g, (m) => m[1].toUpperCase());
	}

	static camelToDash(v) {
		return v.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
	}

	static toBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result.replace('data:', '').replace(/^.+,/, '')); // strip DataURL
			reader.onerror = err => reject(err);
		});
	}

	static toRelativeUrl(url) {
		return url.substring(new URL(url).origin.length); // from full URL to relative url (without host and domain)
	}

	static isNumber(n) {
		return (typeof(n) === 'number' || typeof(n) === "string" && n.trim() !== '') && !isNaN(n);
	}

	static slugify(v) {
		return v
			.toString()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9 -]/g, '')
			.trim()
			.replace(/\s+/g, '-');
	}

	static sanitizeFN(fn) {
		const d = fn.lastIndexOf('.');
		const name = fn.substring(0, d).toLowerCase().replace(/[^a-z0-9-]+/gi, '-');
		const ext = fn.substring(d + 1);
		return [name, ext];
	}

	static escapeRE(str) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	  
	static replaceAll(str, find, replace) {
		return str.replace(new RegExp(StrUtil.escapeRE(find), 'g'), replace);
	}
}

export class ObjUtil {
	static filterEmpty(o) {
		return Object.assign({},
			...Object.entries(o).filter(([k,v]) => (v)).map(([k,v]) => ({[k]:v}))
		);
	}
}

export class asyncUtil {
	static waitFor(key, func, sleep) {
		let i = setInterval(function() {
			if (reg[key]) {clearInterval(i); func(); }
		}, sleep || 50);
	}

	static waitUntil(cond, func, sleep) {
		let i = setInterval(function() {
			if (cond()) {clearInterval(i); func(); }
		}, sleep || 50);
	}
}


/* TIME */
export const timeUtil = {
	day: 24 * 60 * 60    // H * M * S
}
timeUtil.week = timeUtil.day * 7;

export class TimeUtil {
	static sleep(time) {
		return new Promise(resolve => {
			setTimeout(() => { resolve(); }, time);
		});
	}

	static humanSince(date, simple) { // time breakdown from moment.js
		const now = new Date(Date.now());
		if (typeof date === 'string') date = new Date(date);
		const diff = Math.round((now - date) / 1000); // diff in seconds

		if (diff < 45) return (simple)? diff+'s ago' : 'few seconds ago';
		else if (diff < 90) return (simple)? '1m ago' : 'a minute ago';
		else if (diff < 2700) return `${Math.round(diff/60)}${(simple)?'m':' minutes'} ago`; // <45m
		else if (diff < 5400) return (simple)? '1h ago' : 'an hour ago'; // <90m
		else if (diff < 79200) return `${Math.round(diff/3600)}${(simple)?'h':' hours'} ago`; // <22h
		else if (diff < 129600) return (simple)? '1d ago' : 'a day ago'; // <36h
		else if (diff < 2246400) return `${Math.round(diff/86400)}${(simple)?'d':' days'} ago`; // <26d
		else if (diff < 3974400) return (simple)? '1mo ago' : 'a month ago'; // <46d
		else if (diff < 27648000) return `${Math.round(diff/2629800)}${(simple)?'mo':' months'} ago`; // < 320d
		else if (diff < 47347200) return (simple)? '1y ago' : 'a year ago'; // < 548d
		else return `${Math.round(diff/31556952)}${(simple)?'y':' years'} ago`;
	}

	static humanDuration(from, to) {
		if (!from) from = new Date(Date.now());
		if (!to) to = new Date(Date.now());
		if (typeof from === 'string') from = new Date(from);
		if (typeof to === 'string') to = new Date(to);
		const diff = Math.round((to - from) / 1000); // diff in seconds
		if (diff < 1) return null;

		const y = Math.floor(diff / 31536000);
		const mo = Math.floor((diff % 31536000) / 2628000);
		const d = Math.floor(((diff % 31536000) % 2628000) / 86400);
		const h = Math.floor((diff % (3600 * 24)) / 3600);
		const m = Math.floor((diff % 3600) / 60);
		const s = Math.floor(diff % 60);

		return [
			y > 0 ? y + (y === 1 ? ' year' : ' years') : null,
			mo > 0 ? mo + (mo === 1 ? ' month' : ' months') : null,
			d > 0 ? d + (d === 1 ? ' day' : ' days') : null,
			h > 0 ? h + (h === 1 ? ' hour' : ' hours') : null,
			m > 0 ? m + (m === 1 ? ' minute' : ' minutes') : null,
			s > 0 ? s + (s === 1 ? ' second' : ' seconds') : null
		].filter(n => n).slice(0, 2).join(' and ') || null;
	}

	static daysBetween(from, to) {
		const day = timeUtil.day * 1000; // ms
		if (typeof from === 'string') from = new Date(from);
		if (typeof to === 'string') to = new Date(to);
		if (!to) to = new Date(Date.now());
		return Math.round(Math.ceil((to - from) / day));
	}

	static daysLeft(dt) {
		const day = timeUtil.day * 1000; // ms
		if (typeof dt === 'string') dt = new Date(dt);
		const now = new Date(Date.now());
		let left = Math.round(Math.ceil((dt - now) / day));
		return (left < 0) ? 0 : Math.abs(left);
	}

	// https://webreflection.medium.com/using-the-input-datetime-local-9503e7efdce
	static toDatetimeLocal(local) {
		let date = new Date(local);
		const ten = (i) => { return (i < 10 ? '0' : '') + i; };
		return date.getFullYear() + '-' +
		ten(date.getMonth() + 1) + '-' +
		ten(date.getDate()) + 'T' +
		ten(date.getHours()) + ':' +
		ten(date.getMinutes()) + ':' + 
		ten(date.getSeconds());
	}

	static toTimeStamp(date) { // convert date to unix timestamp
		if (!date) date = new Date(Date.now());
		else if (typeof date === 'string') date = new Date(date);
		return Math.floor(date.getTime() / 1000)
	}
}


/* URL */
export const urlUtil = {
	params: new URLSearchParams(window.location.search),
	relative: window.location.pathname + window.location.search,
	isValid: url => {
		try {
		  url = new URL(url);
		  return url.protocol === 'http:' || url.protocol === 'https:';
		} catch (_) { return false; }
	},
	isEmail: addr => { return /^\S+@\S+\.\S+$/.test(addr); }
}

export class RebuildUrl {
	constructor(url) {
		this.url = new URL(url || window.location);
	}

	del(...params) {
		for (let i=0; i< params.length; i++) this.url.searchParams.delete(params[i]);
		return this;
	}

	set(name, val) {
		if (typeof val !== 'undefined') this.url.searchParams.set(name, val);    
		else this.url.searchParams.delete(name); // auto remove
		return this;
	}

	reset(...params) {
		if (!params.length) params = ['o', 'a'] // remove offset and after cursors
		this.del(...params);
		return this;
	}

	resetAll() {
		this.url.search = '';
		return this;
	}

	toString() { return this.url.toString(); }
	forward() { window.location.href = this.url.toString(); }
	replace() { window.location.replace(this.url.toString()); }
}


/* FETCHER */
export class Fetch {

	static async api(url, body, retCode) {
		return fetch(url, {
			method: "POST",
			headers: {"Content-Type": "application/json;charset=utf-8"},
			body: JSON.stringify(body)
		})
		.then(resp => {
			if (!resp.ok) {
				throw (retCode) ? resp.status : resp.text();
			}
			return resp.json();
		})
		.catch(err => {
			err.then(err => { console.log('API Error:', err) });
			throw err;
		});
	}

	static async jsonMany(...urls) {
		return await Promise.all(
		urls.map(url => fetch(url).then(
			(resp) => resp.json()
		)));
	}

}


/* GEO */
export class Geo {
	static getCoord() {
		return new Promise( (resolve, reject) => {
			navigator.geolocation.getCurrentPosition(
				pos => resolve(pos.coords), err => reject(err)
			);
		});
	}

	static isCoord(txt) {
		if (txt) {
		  const a = txt.split(',');
		  if (a.length == 2 && StrUtil.isNumber(a[0]) && StrUtil.isNumber(a[1])) return true;
		}
		return false;
	}

}

/* MAP */
export class Map {
	static embedGMap(el, q) {
		q = q.trim();
		if (!q) return;
		if (typeof el === 'string') el = $(el);
		el.empty();
		el.className += ' overflow-hidden max-w-full border border-gray rounded';
	
		const dEl = document.createElement('div');
		dEl.innerHTML =`<iframe style="height:100%;width:100%;border:0" frameborder="0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
			src="https://www.google.com/maps/embed/v1/place?key=AIzaSyB2YOX6q6VFG8q3R7gB2agIpTo49PNF8qo&q=${encodeURIComponent(q)}"></iframe>`
		el.append(dEl.firstChild);
		el.show(true);
	}
}


/* AUTORUN */
export class Autorun {

	constructor(asyncFn, delayMs) {
		this.asyncFn = asyncFn;
		this.delayMs = delayMs;
		this.running = false;
	}

	async cycle(forced) {
		await this.asyncFn();
		await this.delay(this.delayMs);
		if (!forced && this.running) this.cycle();
	}

	start() {
		if (this.running) return;
		this.running = true;
		this.cycle();
	}

	stop() {
		if (this.running) this.running = false;
	}

	forceExecution = function () {
		if (this.running) this.cycle(true);
	}

	delay = function (ms) {
		return new Promise(res => setTimeout(() => res(1), ms));
	}
}


/* IMAGE */
export async function resizeImage(url, maxWidth, maxHeight, avgColor) {
    const contentType = 'image/jpeg';
    const quality = 0.8;

    return new Promise(resolve => {
        const img = new Image();
        img.src = url;
        img.onerror = function() { URL.revokeObjectURL(this.src); };
        img.onload = function() {
            URL.revokeObjectURL(this.src);

            //calc dimensions
            let w = img.width, h = img.height;
            if (w > h) {
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
            } else {
                if (h > maxHeight) {
                w = Math.round((w * maxHeight) / h);
                h = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            const dataUrl = canvas.toDataURL(contentType, quality);            
            const result = {
                mediaType: contentType,
                content: dataUrl.split(',')[1] //base64
            };

            if (avgColor) {
                const rgb = {r: 0, g: 0, b: 0};
                let count = 0;
                const d = ctx.getImageData(0, 0, w, h).data;

                for (let i=0; i < d.length; i += 4) {
                    rgb.r += d[i];
                    rgb.g += d[i + 1];
                    rgb.b += d[i + 2];
                    count++;
                }
                rgb.r = Math.floor(rgb.r / count);
                rgb.g = Math.floor(rgb.g / count);
                rgb.b = Math.floor(rgb.b / count);
                result.averageColor = rgb;
            }

            fetch(dataUrl).then(res => res.blob()).then(blob => {
                result.url = URL.createObjectURL(blob);
                resolve(result);
            });
        };
    });
};
