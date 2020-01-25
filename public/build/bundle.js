
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Hero.svelte generated by Svelte v3.16.7 */

    const file = "src/Hero.svelte";

    function create_fragment(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = /*src*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "hero");
    			attr_dev(img, "class", "svelte-ie3lie");
    			add_location(img, file, 5, 4, 78);
    			attr_dev(div, "id", "hero");
    			attr_dev(div, "class", "svelte-ie3lie");
    			add_location(div, file, 4, 0, 58);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self) {
    	let src = "images/starstick.jpg";

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("src" in $$props) $$invalidate(0, src = $$props.src);
    	};

    	return [src];
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hero",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/Footer.svelte generated by Svelte v3.16.7 */

    const file$1 = "src/Footer.svelte";

    function create_fragment$1(ctx) {
    	let footer;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			footer.textContent = "Footer (a Svelte Component)";
    			attr_dev(footer, "class", "svelte-12vqpue");
    			add_location(footer, file$1, 9, 0, 145);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/ReactivityClickCounter.svelte generated by Svelte v3.16.7 */

    const file$2 = "src/ReactivityClickCounter.svelte";

    function create_fragment$2(ctx) {
    	let h2;
    	let t1;
    	let p0;
    	let code;
    	let t4;
    	let button;
    	let t5;
    	let t6;
    	let t7;
    	let t8_value = (/*count*/ ctx[0] === 1 ? "time" : "times") + "";
    	let t8;
    	let t9;
    	let p1;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let p2;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Reactivity";
    			t1 = space();
    			p0 = element("p");
    			code = element("code");
    			code.textContent = `\$: ${"<statement>"}`;
    			t4 = space();
    			button = element("button");
    			t5 = text("clicked ");
    			t6 = text(/*count*/ ctx[0]);
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			p1 = element("p");
    			t10 = text(/*count*/ ctx[0]);
    			t11 = text(" doubled is ");
    			t12 = text(/*doubled*/ ctx[1]);
    			t13 = text(".");
    			t14 = space();
    			p2 = element("p");
    			t15 = text(/*count*/ ctx[0]);
    			t16 = text(" six times is ");
    			t17 = text(/*sixth*/ ctx[2]);
    			t18 = text(".");
    			add_location(h2, file$2, 15, 0, 271);
    			add_location(code, file$2, 17, 4, 299);
    			add_location(p0, file$2, 16, 0, 291);
    			add_location(button, file$2, 19, 0, 336);
    			add_location(p1, file$2, 23, 0, 430);
    			add_location(p2, file$2, 24, 0, 467);
    			dispose = listen_dev(button, "click", /*handleClick*/ ctx[3], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, code);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, t5);
    			append_dev(button, t6);
    			append_dev(button, t7);
    			append_dev(button, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t10);
    			append_dev(p1, t11);
    			append_dev(p1, t12);
    			append_dev(p1, t13);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, p2, anchor);
    			append_dev(p2, t15);
    			append_dev(p2, t16);
    			append_dev(p2, t17);
    			append_dev(p2, t18);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*count*/ 1) set_data_dev(t6, /*count*/ ctx[0]);
    			if (dirty & /*count*/ 1 && t8_value !== (t8_value = (/*count*/ ctx[0] === 1 ? "time" : "times") + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*count*/ 1) set_data_dev(t10, /*count*/ ctx[0]);
    			if (dirty & /*doubled*/ 2) set_data_dev(t12, /*doubled*/ ctx[1]);
    			if (dirty & /*count*/ 1) set_data_dev(t15, /*count*/ ctx[0]);
    			if (dirty & /*sixth*/ 4) set_data_dev(t17, /*sixth*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(p2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let count = 0;

    	function handleClick() {
    		$$invalidate(0, count += 1);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("count" in $$props) $$invalidate(0, count = $$props.count);
    		if ("doubled" in $$props) $$invalidate(1, doubled = $$props.doubled);
    		if ("sixth" in $$props) $$invalidate(2, sixth = $$props.sixth);
    	};

    	let doubled;
    	let sixth;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*count*/ 1) {
    			 $$invalidate(1, doubled = 2 * count);
    		}

    		if ($$self.$$.dirty & /*doubled*/ 2) {
    			 $$invalidate(2, sixth = 3 * doubled);
    		}

    		if ($$self.$$.dirty & /*count*/ 1) {
    			 if (count >= 3) {
    				console.log("count >= 3");
    			}
    		}
    	};

    	return [count, doubled, sixth, handleClick];
    }

    class ReactivityClickCounter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ReactivityClickCounter",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/NestedSimple.svelte generated by Svelte v3.16.7 */

    const file$3 = "src/NestedSimple.svelte";

    // (8:4) {#if age>18}
    function create_if_block(ctx) {
    	let b;

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Im over 18.";
    			add_location(b, file$3, 8, 8, 162);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, b, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(b);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(8:4) {#if age>18}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let if_block = /*age*/ ctx[0] > 18 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("I am a NestedSimple. I am ");
    			t1 = text(/*age*/ ctx[0]);
    			t2 = text(". My name is ");
    			t3 = text(/*name*/ ctx[1]);
    			t4 = text(".\n    ");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "");
    			add_location(div, file$3, 5, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    			append_dev(div, t4);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*age*/ 1) set_data_dev(t1, /*age*/ ctx[0]);
    			if (dirty & /*name*/ 2) set_data_dev(t3, /*name*/ ctx[1]);

    			if (/*age*/ ctx[0] > 18) {
    				if (!if_block) {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { age = 17 } = $$props;
    	let { name } = $$props;
    	const writable_props = ["age", "name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NestedSimple> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("age" in $$props) $$invalidate(0, age = $$props.age);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { age, name };
    	};

    	$$self.$inject_state = $$props => {
    		if ("age" in $$props) $$invalidate(0, age = $$props.age);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    	};

    	return [age, name];
    }

    class NestedSimple extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { age: 0, name: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NestedSimple",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*name*/ ctx[1] === undefined && !("name" in props)) {
    			console.warn("<NestedSimple> was created without expected prop 'name'");
    		}
    	}

    	get age() {
    		throw new Error("<NestedSimple>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set age(value) {
    		throw new Error("<NestedSimple>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<NestedSimple>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<NestedSimple>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/AsynchronousRandomNumber.svelte generated by Svelte v3.16.7 */

    const { Error: Error_1 } = globals;
    const file$4 = "src/AsynchronousRandomNumber.svelte";

    // (29:0) {:catch error}
    function create_catch_block(ctx) {
    	let p0;
    	let t1;
    	let p1;
    	let t2_value = /*error*/ ctx[3].message + "";
    	let t2;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "There's an error:";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(t2_value);
    			add_location(p0, file$4, 29, 2, 581);
    			set_style(p1, "color", "red");
    			add_location(p1, file$4, 30, 2, 608);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 1 && t2_value !== (t2_value = /*error*/ ctx[3].message + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(29:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (27:0) {:then numberPiepResult}
    function create_then_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*numberPiepResult*/ ctx[2] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("The number is ");
    			t1 = text(t1_value);
    			add_location(p, file$4, 27, 2, 524);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 1 && t1_value !== (t1_value = /*numberPiepResult*/ ctx[2] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(27:0) {:then numberPiepResult}",
    		ctx
    	});

    	return block;
    }

    // (25:16)    <p>...waiting</p> {:then numberPiepResult}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...waiting";
    			add_location(p, file$4, 25, 2, 479);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(25:16)    <p>...waiting</p> {:then numberPiepResult}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let button;
    	let t1;
    	let await_block_anchor;
    	let promise_1;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 2,
    		error: 3
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "generate random number";
    			t1 = space();
    			await_block_anchor = empty();
    			info.block.c();
    			add_location(button, file$4, 20, 0, 392);
    			dispose = listen_dev(button, "click", /*handleClick*/ ctx[1], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 1 && promise_1 !== (promise_1 = /*promise*/ ctx[0]) && handle_promise(promise_1, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[2] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function getRandomNumber() {
    	const res = await fetch("/random-number");
    	const text = await res.text();

    	if (res.ok) {
    		return text;
    	} else {
    		throw new Error(text);
    	}
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let promise = getRandomNumber();

    	function handleClick() {
    		$$invalidate(0, promise = getRandomNumber());
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("promise" in $$props) $$invalidate(0, promise = $$props.promise);
    	};

    	return [promise, handleClick];
    }

    class AsynchronousRandomNumber extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AsynchronousRandomNumber",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/EventMouseOver.svelte generated by Svelte v3.16.7 */

    const file$5 = "src/EventMouseOver.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*m*/ ctx[0].x + "";
    	let t1;
    	let t2;
    	let t3_value = /*m*/ ctx[0].y + "";
    	let t3;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("The mouse position is ");
    			t1 = text(t1_value);
    			t2 = text(" x ");
    			t3 = text(t3_value);
    			attr_dev(div, "class", "svelte-ouaahw");
    			add_location(div, file$5, 16, 0, 266);
    			dispose = listen_dev(div, "mousemove", /*handleMousemove*/ ctx[1], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, t3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*m*/ 1 && t1_value !== (t1_value = /*m*/ ctx[0].x + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*m*/ 1 && t3_value !== (t3_value = /*m*/ ctx[0].y + "")) set_data_dev(t3, t3_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let m = { x: 0, y: 0 };

    	function handleMousemove(event) {
    		$$invalidate(0, m.x = event.clientX, m);
    		$$invalidate(0, m.y = event.clientY, m);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("m" in $$props) $$invalidate(0, m = $$props.m);
    	};

    	return [m, handleMousemove];
    }

    class EventMouseOver extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EventMouseOver",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.7 */
    const file$6 = "src/App.svelte";

    function create_fragment$6(ctx) {
    	let t0;
    	let main;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let p0;
    	let t5;
    	let a;
    	let t7;
    	let t8;
    	let p1;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let current;
    	const hero = new Hero({ $$inline: true });
    	const eventmouseover = new EventMouseOver({ $$inline: true });
    	const asynchronousrandomnumber = new AsynchronousRandomNumber({ $$inline: true });
    	const nestedsimple0_spread_levels = [/*personaldata*/ ctx[1]];
    	let nestedsimple0_props = {};

    	for (let i = 0; i < nestedsimple0_spread_levels.length; i += 1) {
    		nestedsimple0_props = assign(nestedsimple0_props, nestedsimple0_spread_levels[i]);
    	}

    	const nestedsimple0 = new NestedSimple({
    			props: nestedsimple0_props,
    			$$inline: true
    		});

    	const nestedsimple1 = new NestedSimple({ $$inline: true });
    	const reactivityclickcounter = new ReactivityClickCounter({ $$inline: true });
    	const simplefooter = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(hero.$$.fragment);
    			t0 = space();
    			main = element("main");
    			h1 = element("h1");
    			t1 = text("Hello ");
    			t2 = text(/*name*/ ctx[0]);
    			t3 = text("!");
    			t4 = space();
    			p0 = element("p");
    			t5 = text("Visit the ");
    			a = element("a");
    			a.textContent = "Svelte tutorial";
    			t7 = text(" to learn how to build Svelte apps.");
    			t8 = space();
    			p1 = element("p");
    			p1.textContent = "Maecenas faucibus mollis interdum. Maecenas faucibus mollis interdum. Donec id elit non mi porta gravida at eget metus. Vestibulum id ligula porta felis euismod semper. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Aenean lacinia bibendum nulla sed consectetur. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.";
    			t10 = space();
    			create_component(eventmouseover.$$.fragment);
    			t11 = space();
    			create_component(asynchronousrandomnumber.$$.fragment);
    			t12 = space();
    			create_component(nestedsimple0.$$.fragment);
    			t13 = space();
    			create_component(nestedsimple1.$$.fragment);
    			t14 = space();
    			create_component(reactivityclickcounter.$$.fragment);
    			t15 = space();
    			create_component(simplefooter.$$.fragment);
    			add_location(h1, file$6, 17, 4, 481);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$6, 18, 17, 521);
    			add_location(p0, file$6, 18, 4, 508);
    			add_location(p1, file$6, 19, 4, 638);
    			attr_dev(main, "class", "svelte-127mqye");
    			add_location(main, file$6, 16, 0, 470);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(hero, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(h1, t3);
    			append_dev(main, t4);
    			append_dev(main, p0);
    			append_dev(p0, t5);
    			append_dev(p0, a);
    			append_dev(p0, t7);
    			append_dev(main, t8);
    			append_dev(main, p1);
    			append_dev(main, t10);
    			mount_component(eventmouseover, main, null);
    			append_dev(main, t11);
    			mount_component(asynchronousrandomnumber, main, null);
    			append_dev(main, t12);
    			mount_component(nestedsimple0, main, null);
    			append_dev(main, t13);
    			mount_component(nestedsimple1, main, null);
    			append_dev(main, t14);
    			mount_component(reactivityclickcounter, main, null);
    			insert_dev(target, t15, anchor);
    			mount_component(simplefooter, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);

    			const nestedsimple0_changes = (dirty & /*personaldata*/ 2)
    			? get_spread_update(nestedsimple0_spread_levels, [get_spread_object(/*personaldata*/ ctx[1])])
    			: {};

    			nestedsimple0.$set(nestedsimple0_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hero.$$.fragment, local);
    			transition_in(eventmouseover.$$.fragment, local);
    			transition_in(asynchronousrandomnumber.$$.fragment, local);
    			transition_in(nestedsimple0.$$.fragment, local);
    			transition_in(nestedsimple1.$$.fragment, local);
    			transition_in(reactivityclickcounter.$$.fragment, local);
    			transition_in(simplefooter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hero.$$.fragment, local);
    			transition_out(eventmouseover.$$.fragment, local);
    			transition_out(asynchronousrandomnumber.$$.fragment, local);
    			transition_out(nestedsimple0.$$.fragment, local);
    			transition_out(nestedsimple1.$$.fragment, local);
    			transition_out(reactivityclickcounter.$$.fragment, local);
    			transition_out(simplefooter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hero, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(eventmouseover);
    			destroy_component(asynchronousrandomnumber);
    			destroy_component(nestedsimple0);
    			destroy_component(nestedsimple1);
    			destroy_component(reactivityclickcounter);
    			if (detaching) detach_dev(t15);
    			destroy_component(simplefooter, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	const personaldata = { age: 23, name: "Pia" };
    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	return [name, personaldata];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: "world"
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
