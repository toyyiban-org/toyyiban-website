
import {$, app, system, Cookie, meta, urlUtil, Fetch} from '/js/x.js';
import {XElement, alert} from '/js/x-ui.js';
import '/js/toyyiban-svg.js';

customElements.define('t-header', class extends XElement {
	_create() {
		this.innerHTML = `<header class="flex-row g bg border-b p items-center">
        <a href="/"><img src="/img/logo.svg" style="width:6rem; min-width:6rem; max-width:6rem"/></a>
        <div class="grow text-xl text-center">Toyyiban - An Open Ummah Network</div>
        <button id="hMenuBtn" class="flat hover"><svg class="icon-xl"><use href="#icon-list"></use></svg></button>
        <x-menu hidden id="hMenu" data-float data-cover data-anchor="#hMenuBtn" data-pos="bottom-end" data-cancel>
            <a data-value="home" class="item icon-text"><svg class="icon"><use href="#icon-house-fill"></use></svg> <span>Home</span></a>
            <a data-value="help" class="item icon-text"><svg class="icon"><use href="#icon-question-circle"></use></svg> <span>Help</span></a>
        </x-menu>
        </header>`;

        this.querySelector('x-menu').addEventListener('itemclick', ev => {
            ev.stopPropagation();
            const v = ev.detail.value;
            if (v == 'home') window.location.href = '/';
            else if (v == 'help') window.location.href = '/help';
        });
	}
});


customElements.define('t-footer', class extends XElement {
	_create() {
		this.innerHTML = `<footer class="flex-wrap gx gy-sm items-center justify-center p border-t">
		<p class="whitespace-nowrap">© 2023-${new Date().getFullYear()} toyyiban.org</p>
		<a href="/about">About us</a>
		<a href="/contact">Contact us</a>
        <a href="#" class="item" data-tip="Github"><svg class="icon-lg"><use href="#icon-github"></use></svg></a>
        </footer>`;
	}
});
