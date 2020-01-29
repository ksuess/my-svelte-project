
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
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
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
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
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

    // (9:2) {#if age>18}
    function create_if_block(ctx) {
    	let b;

    	const block = {
    		c: function create() {
    			b = element("b");
    			b.textContent = "Im over 18.";
    			add_location(b, file$3, 9, 4, 210);
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
    		source: "(9:2) {#if age>18}",
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
    			t0 = text("I am a NestedSimple component. I am ");
    			t1 = text(/*age*/ ctx[0]);
    			t2 = text(". My name is ");
    			t3 = text(/*name*/ ctx[1]);
    			t4 = text(".\n  ");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "");
    			add_location(div, file$3, 6, 0, 112);
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
    	let { name = undefined } = $$props;
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

    /* src/EventDispatchingComponent.svelte generated by Svelte v3.16.7 */
    const file$6 = "src/EventDispatchingComponent.svelte";

    function create_fragment$6(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Click to say hello with a dispatched event";
    			add_location(button, file$6, 13, 0, 224);
    			dispose = listen_dev(button, "click", /*sayHello*/ ctx[0], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
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

    function instance$5($$self) {
    	const dispatch = createEventDispatcher();

    	function sayHello() {
    		dispatch("componentsmessageevent", { text: "Hello!", color: "orange" });
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [sayHello];
    }

    class EventDispatchingComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EventDispatchingComponent",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/Todos.svelte generated by Svelte v3.16.7 */

    const file$7 = "src/Todos.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[7] = list;
    	child_ctx[8] = i;
    	return child_ctx;
    }

    // (23:0) {:else}
    function create_else_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "nothing to do";
    			add_location(div, file$7, 23, 2, 534);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(23:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (18:0) {#each todos as todo}
    function create_each_block(ctx) {
    	let div;
    	let input0;
    	let t;
    	let input1;
    	let dispose;

    	function input0_change_handler() {
    		/*input0_change_handler*/ ctx[4].call(input0, /*todo*/ ctx[6]);
    	}

    	function input1_input_handler() {
    		/*input1_input_handler*/ ctx[5].call(input1, /*todo*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			input0 = element("input");
    			t = space();
    			input1 = element("input");
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-mal2v9");
    			add_location(input0, file$7, 19, 4, 380);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "What needs to be done?");
    			attr_dev(input1, "class", "svelte-mal2v9");
    			add_location(input1, file$7, 20, 4, 433);
    			attr_dev(div, "class", "todo svelte-mal2v9");
    			add_location(div, file$7, 18, 2, 357);

    			dispose = [
    				listen_dev(input0, "change", input0_change_handler),
    				listen_dev(input1, "input", input1_input_handler)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input0);
    			input0.checked = /*todo*/ ctx[6].done;
    			append_dev(div, t);
    			append_dev(div, input1);
    			set_input_value(input1, /*todo*/ ctx[6].text);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*todos*/ 1) {
    				input0.checked = /*todo*/ ctx[6].done;
    			}

    			if (dirty & /*todos*/ 1 && input1.value !== /*todo*/ ctx[6].text) {
    				set_input_value(input1, /*todo*/ ctx[6].text);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(18:0) {#each todos as todo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let h3;
    	let t1;
    	let t2;
    	let div0;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let button0;
    	let t7;
    	let button1;
    	let dispose;
    	let each_value = /*todos*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    		each_1_else.c();
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Todos";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div0 = element("div");
    			t3 = text(/*remaining*/ ctx[1]);
    			t4 = text(" remaining todos");
    			t5 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Add new";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Clear completed";
    			add_location(h3, file$7, 16, 0, 318);
    			add_location(div0, file$7, 26, 0, 568);
    			add_location(button0, file$7, 29, 2, 616);
    			add_location(button1, file$7, 30, 2, 658);
    			add_location(div1, file$7, 28, 0, 608);

    			dispose = [
    				listen_dev(button0, "click", /*add*/ ctx[2], false, false, false),
    				listen_dev(button1, "click", /*clear*/ ctx[3], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			insert_dev(target, t2, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t3);
    			append_dev(div0, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button0);
    			append_dev(div1, t7);
    			append_dev(div1, button1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todos*/ 1) {
    				each_value = /*todos*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t2.parentNode, t2);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (each_value.length) {
    				if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			} else if (!each_1_else) {
    				each_1_else = create_else_block(ctx);
    				each_1_else.c();
    				each_1_else.m(t2.parentNode, t2);
    			}

    			if (dirty & /*remaining*/ 2) set_data_dev(t3, /*remaining*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let todos = [
    		{ done: false, text: "Doku schreiben" },
    		{ done: false, text: "Tests schreiben" }
    	];

    	function add() {
    		$$invalidate(0, todos = todos.concat({ done: false, text: "" }));
    	}

    	function clear() {
    		$$invalidate(0, todos = todos.filter(t => !t.done));
    	}

    	function input0_change_handler(todo) {
    		todo.done = this.checked;
    		$$invalidate(0, todos);
    	}

    	function input1_input_handler(todo) {
    		todo.text = this.value;
    		$$invalidate(0, todos);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("todos" in $$props) $$invalidate(0, todos = $$props.todos);
    		if ("remaining" in $$props) $$invalidate(1, remaining = $$props.remaining);
    	};

    	let remaining;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*todos*/ 1) {
    			 $$invalidate(1, remaining = todos.filter(t => !t.done).length);
    		}
    	};

    	return [todos, remaining, add, clear, input0_change_handler, input1_input_handler];
    }

    class Todos extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Todos",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/Keypad.svelte generated by Svelte v3.16.7 */
    const file$8 = "src/Keypad.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let t7;
    	let button4;
    	let t9;
    	let button5;
    	let t11;
    	let button6;
    	let t13;
    	let button7;
    	let t15;
    	let button8;
    	let t17;
    	let button9;
    	let t18;
    	let button9_disabled_value;
    	let t19;
    	let button10;
    	let t21;
    	let button11;
    	let t22;
    	let button11_disabled_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "1";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "2";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "3";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "4";
    			t7 = space();
    			button4 = element("button");
    			button4.textContent = "5";
    			t9 = space();
    			button5 = element("button");
    			button5.textContent = "6";
    			t11 = space();
    			button6 = element("button");
    			button6.textContent = "7";
    			t13 = space();
    			button7 = element("button");
    			button7.textContent = "8";
    			t15 = space();
    			button8 = element("button");
    			button8.textContent = "9";
    			t17 = space();
    			button9 = element("button");
    			t18 = text("clear");
    			t19 = space();
    			button10 = element("button");
    			button10.textContent = "0";
    			t21 = space();
    			button11 = element("button");
    			t22 = text("submit");
    			attr_dev(button0, "class", "svelte-el36x5");
    			add_location(button0, file$8, 26, 1, 464);
    			attr_dev(button1, "class", "svelte-el36x5");
    			add_location(button1, file$8, 27, 1, 505);
    			attr_dev(button2, "class", "svelte-el36x5");
    			add_location(button2, file$8, 28, 1, 546);
    			attr_dev(button3, "class", "svelte-el36x5");
    			add_location(button3, file$8, 29, 1, 587);
    			attr_dev(button4, "class", "svelte-el36x5");
    			add_location(button4, file$8, 30, 1, 628);
    			attr_dev(button5, "class", "svelte-el36x5");
    			add_location(button5, file$8, 31, 1, 669);
    			attr_dev(button6, "class", "svelte-el36x5");
    			add_location(button6, file$8, 32, 1, 710);
    			attr_dev(button7, "class", "svelte-el36x5");
    			add_location(button7, file$8, 33, 1, 751);
    			attr_dev(button8, "class", "svelte-el36x5");
    			add_location(button8, file$8, 34, 1, 792);
    			button9.disabled = button9_disabled_value = !/*valuepiep*/ ctx[0];
    			attr_dev(button9, "class", "svelte-el36x5");
    			add_location(button9, file$8, 36, 1, 834);
    			attr_dev(button10, "class", "svelte-el36x5");
    			add_location(button10, file$8, 37, 1, 897);
    			button11.disabled = button11_disabled_value = !/*valuepiep*/ ctx[0];
    			attr_dev(button11, "class", "svelte-el36x5");
    			add_location(button11, file$8, 38, 1, 938);
    			attr_dev(div, "class", "keypad svelte-el36x5");
    			add_location(div, file$8, 25, 0, 442);

    			dispose = [
    				listen_dev(button0, "click", /*select*/ ctx[1](1), false, false, false),
    				listen_dev(button1, "click", /*select*/ ctx[1](2), false, false, false),
    				listen_dev(button2, "click", /*select*/ ctx[1](3), false, false, false),
    				listen_dev(button3, "click", /*select*/ ctx[1](4), false, false, false),
    				listen_dev(button4, "click", /*select*/ ctx[1](5), false, false, false),
    				listen_dev(button5, "click", /*select*/ ctx[1](6), false, false, false),
    				listen_dev(button6, "click", /*select*/ ctx[1](7), false, false, false),
    				listen_dev(button7, "click", /*select*/ ctx[1](8), false, false, false),
    				listen_dev(button8, "click", /*select*/ ctx[1](9), false, false, false),
    				listen_dev(button9, "click", /*clear*/ ctx[2], false, false, false),
    				listen_dev(button10, "click", /*select*/ ctx[1](0), false, false, false),
    				listen_dev(button11, "click", /*submit*/ ctx[3], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(div, t3);
    			append_dev(div, button2);
    			append_dev(div, t5);
    			append_dev(div, button3);
    			append_dev(div, t7);
    			append_dev(div, button4);
    			append_dev(div, t9);
    			append_dev(div, button5);
    			append_dev(div, t11);
    			append_dev(div, button6);
    			append_dev(div, t13);
    			append_dev(div, button7);
    			append_dev(div, t15);
    			append_dev(div, button8);
    			append_dev(div, t17);
    			append_dev(div, button9);
    			append_dev(button9, t18);
    			append_dev(div, t19);
    			append_dev(div, button10);
    			append_dev(div, t21);
    			append_dev(div, button11);
    			append_dev(button11, t22);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*valuepiep*/ 1 && button9_disabled_value !== (button9_disabled_value = !/*valuepiep*/ ctx[0])) {
    				prop_dev(button9, "disabled", button9_disabled_value);
    			}

    			if (dirty & /*valuepiep*/ 1 && button11_disabled_value !== (button11_disabled_value = !/*valuepiep*/ ctx[0])) {
    				prop_dev(button11, "disabled", button11_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { valuepiep = "" } = $$props;
    	const dispatch = createEventDispatcher();
    	const select = num => () => $$invalidate(0, valuepiep += num);
    	const clear = () => $$invalidate(0, valuepiep = "");
    	const submit = () => dispatch("submit");
    	const writable_props = ["valuepiep"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Keypad> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("valuepiep" in $$props) $$invalidate(0, valuepiep = $$props.valuepiep);
    	};

    	$$self.$capture_state = () => {
    		return { valuepiep };
    	};

    	$$self.$inject_state = $$props => {
    		if ("valuepiep" in $$props) $$invalidate(0, valuepiep = $$props.valuepiep);
    	};

    	return [valuepiep, select, clear, submit];
    }

    class Keypad extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, { valuepiep: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Keypad",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get valuepiep() {
    		throw new Error("<Keypad>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set valuepiep(value) {
    		throw new Error("<Keypad>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function createCount() {
        const {subscribe, set, update} = writable(0);

        return {
            subscribe,
            set,
            increment: () => update(n => n + 1),
            decrement: () => update(n => n - 1),
            reset: () => set(0)
        }
    }

    const count = createCount();

    /* src/App.svelte generated by Svelte v3.16.7 */
    const file$9 = "src/App.svelte";

    function create_fragment$9(ctx) {
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
    	let h20;
    	let t12;
    	let div0;
    	let h30;
    	let t13;
    	let t14;
    	let t15;
    	let button0;
    	let t17;
    	let button1;
    	let t19;
    	let button2;
    	let t21;
    	let input;
    	let input_updating = false;
    	let t22;
    	let h21;
    	let t24;
    	let h31;

    	let t25_value = (/*telnr*/ ctx[1]
    	? /*telnr*/ ctx[1]
    	: "Please enter your phone number!") + "";

    	let t25;
    	let t26;
    	let updating_valuepiep;
    	let t27;
    	let div1;
    	let t28;
    	let t29;
    	let t30;
    	let t31;
    	let t32;
    	let t33;
    	let t34;
    	let t35;
    	let t36;
    	let current;
    	let dispose;
    	const hero = new Hero({ $$inline: true });

    	function input_input_handler() {
    		input_updating = true;
    		/*input_input_handler*/ ctx[5].call(input);
    	}

    	function keypad_valuepiep_binding(value) {
    		/*keypad_valuepiep_binding*/ ctx[6].call(null, value);
    	}

    	let keypad_props = {};

    	if (/*telnr*/ ctx[1] !== void 0) {
    		keypad_props.valuepiep = /*telnr*/ ctx[1];
    	}

    	const keypad = new Keypad({ props: keypad_props, $$inline: true });
    	binding_callbacks.push(() => bind(keypad, "valuepiep", keypad_valuepiep_binding));
    	keypad.$on("submit", /*handleSubmit*/ ctx[4]);
    	const todos = new Todos({ $$inline: true });
    	const eventdispatchingcomponent = new EventDispatchingComponent({ $$inline: true });
    	eventdispatchingcomponent.$on("componentsmessageevent", /*componentsmessageevent_handler*/ ctx[7]);
    	const eventmouseover = new EventMouseOver({ $$inline: true });
    	const asynchronousrandomnumber = new AsynchronousRandomNumber({ $$inline: true });
    	const nestedsimple0_spread_levels = [/*personaldata*/ ctx[3]];
    	let nestedsimple0_props = {};

    	for (let i = 0; i < nestedsimple0_spread_levels.length; i += 1) {
    		nestedsimple0_props = assign(nestedsimple0_props, nestedsimple0_spread_levels[i]);
    	}

    	const nestedsimple0 = new NestedSimple({
    			props: nestedsimple0_props,
    			$$inline: true
    		});

    	const nestedsimple1 = new NestedSimple({ props: { name: "Horst" }, $$inline: true });

    	const nestedsimple2 = new NestedSimple({
    			props: { age: 62, name: "Lisa" },
    			$$inline: true
    		});

    	const nestedsimple3 = new NestedSimple({ $$inline: true });
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
    			h20 = element("h2");
    			h20.textContent = "Stores";
    			t12 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			t13 = text("The count is ");
    			t14 = text(/*$count*/ ctx[2]);
    			t15 = space();
    			button0 = element("button");
    			button0.textContent = "+";
    			t17 = space();
    			button1 = element("button");
    			button1.textContent = "-";
    			t19 = space();
    			button2 = element("button");
    			button2.textContent = "reset";
    			t21 = space();
    			input = element("input");
    			t22 = space();
    			h21 = element("h2");
    			h21.textContent = "Bindings";
    			t24 = space();
    			h31 = element("h3");
    			t25 = text(t25_value);
    			t26 = space();
    			create_component(keypad.$$.fragment);
    			t27 = space();
    			div1 = element("div");
    			create_component(todos.$$.fragment);
    			t28 = space();
    			create_component(eventdispatchingcomponent.$$.fragment);
    			t29 = space();
    			create_component(eventmouseover.$$.fragment);
    			t30 = space();
    			create_component(asynchronousrandomnumber.$$.fragment);
    			t31 = space();
    			create_component(nestedsimple0.$$.fragment);
    			t32 = space();
    			create_component(nestedsimple1.$$.fragment);
    			t33 = space();
    			create_component(nestedsimple2.$$.fragment);
    			t34 = space();
    			create_component(nestedsimple3.$$.fragment);
    			t35 = space();
    			create_component(reactivityclickcounter.$$.fragment);
    			t36 = space();
    			create_component(simplefooter.$$.fragment);
    			add_location(h1, file$9, 32, 4, 1033);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$9, 33, 17, 1073);
    			add_location(p0, file$9, 33, 4, 1060);
    			add_location(p1, file$9, 34, 4, 1190);
    			add_location(h20, file$9, 36, 4, 1557);
    			add_location(h30, file$9, 39, 6, 1608);
    			add_location(button0, file$9, 40, 6, 1645);
    			add_location(button1, file$9, 41, 6, 1697);
    			add_location(button2, file$9, 42, 6, 1749);
    			attr_dev(input, "type", "number");
    			add_location(input, file$9, 43, 6, 1801);
    			attr_dev(div0, "class", "component svelte-1pxjdvt");
    			add_location(div0, file$9, 38, 4, 1578);
    			add_location(h21, file$9, 46, 4, 1859);
    			add_location(h31, file$9, 48, 4, 1882);
    			attr_dev(div1, "class", "todos svelte-1pxjdvt");
    			add_location(div1, file$9, 51, 4, 2010);
    			attr_dev(main, "class", "svelte-1pxjdvt");
    			add_location(main, file$9, 31, 0, 1022);

    			dispose = [
    				listen_dev(button0, "click", count.increment, false, false, false),
    				listen_dev(button1, "click", count.decrement, false, false, false),
    				listen_dev(button2, "click", count.reset, false, false, false),
    				listen_dev(input, "input", input_input_handler)
    			];
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
    			append_dev(main, h20);
    			append_dev(main, t12);
    			append_dev(main, div0);
    			append_dev(div0, h30);
    			append_dev(h30, t13);
    			append_dev(h30, t14);
    			append_dev(div0, t15);
    			append_dev(div0, button0);
    			append_dev(div0, t17);
    			append_dev(div0, button1);
    			append_dev(div0, t19);
    			append_dev(div0, button2);
    			append_dev(div0, t21);
    			append_dev(div0, input);
    			set_input_value(input, /*$count*/ ctx[2]);
    			append_dev(main, t22);
    			append_dev(main, h21);
    			append_dev(main, t24);
    			append_dev(main, h31);
    			append_dev(h31, t25);
    			append_dev(main, t26);
    			mount_component(keypad, main, null);
    			append_dev(main, t27);
    			append_dev(main, div1);
    			mount_component(todos, div1, null);
    			append_dev(main, t28);
    			mount_component(eventdispatchingcomponent, main, null);
    			append_dev(main, t29);
    			mount_component(eventmouseover, main, null);
    			append_dev(main, t30);
    			mount_component(asynchronousrandomnumber, main, null);
    			append_dev(main, t31);
    			mount_component(nestedsimple0, main, null);
    			append_dev(main, t32);
    			mount_component(nestedsimple1, main, null);
    			append_dev(main, t33);
    			mount_component(nestedsimple2, main, null);
    			append_dev(main, t34);
    			mount_component(nestedsimple3, main, null);
    			append_dev(main, t35);
    			mount_component(reactivityclickcounter, main, null);
    			insert_dev(target, t36, anchor);
    			mount_component(simplefooter, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);
    			if (!current || dirty & /*$count*/ 4) set_data_dev(t14, /*$count*/ ctx[2]);

    			if (!input_updating && dirty & /*$count*/ 4) {
    				set_input_value(input, /*$count*/ ctx[2]);
    			}

    			input_updating = false;

    			if ((!current || dirty & /*telnr*/ 2) && t25_value !== (t25_value = (/*telnr*/ ctx[1]
    			? /*telnr*/ ctx[1]
    			: "Please enter your phone number!") + "")) set_data_dev(t25, t25_value);

    			const keypad_changes = {};

    			if (!updating_valuepiep && dirty & /*telnr*/ 2) {
    				updating_valuepiep = true;
    				keypad_changes.valuepiep = /*telnr*/ ctx[1];
    				add_flush_callback(() => updating_valuepiep = false);
    			}

    			keypad.$set(keypad_changes);

    			const nestedsimple0_changes = (dirty & /*personaldata*/ 8)
    			? get_spread_update(nestedsimple0_spread_levels, [get_spread_object(/*personaldata*/ ctx[3])])
    			: {};

    			nestedsimple0.$set(nestedsimple0_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hero.$$.fragment, local);
    			transition_in(keypad.$$.fragment, local);
    			transition_in(todos.$$.fragment, local);
    			transition_in(eventdispatchingcomponent.$$.fragment, local);
    			transition_in(eventmouseover.$$.fragment, local);
    			transition_in(asynchronousrandomnumber.$$.fragment, local);
    			transition_in(nestedsimple0.$$.fragment, local);
    			transition_in(nestedsimple1.$$.fragment, local);
    			transition_in(nestedsimple2.$$.fragment, local);
    			transition_in(nestedsimple3.$$.fragment, local);
    			transition_in(reactivityclickcounter.$$.fragment, local);
    			transition_in(simplefooter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hero.$$.fragment, local);
    			transition_out(keypad.$$.fragment, local);
    			transition_out(todos.$$.fragment, local);
    			transition_out(eventdispatchingcomponent.$$.fragment, local);
    			transition_out(eventmouseover.$$.fragment, local);
    			transition_out(asynchronousrandomnumber.$$.fragment, local);
    			transition_out(nestedsimple0.$$.fragment, local);
    			transition_out(nestedsimple1.$$.fragment, local);
    			transition_out(nestedsimple2.$$.fragment, local);
    			transition_out(nestedsimple3.$$.fragment, local);
    			transition_out(reactivityclickcounter.$$.fragment, local);
    			transition_out(simplefooter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hero, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(keypad);
    			destroy_component(todos);
    			destroy_component(eventdispatchingcomponent);
    			destroy_component(eventmouseover);
    			destroy_component(asynchronousrandomnumber);
    			destroy_component(nestedsimple0);
    			destroy_component(nestedsimple1);
    			destroy_component(nestedsimple2);
    			destroy_component(nestedsimple3);
    			destroy_component(reactivityclickcounter);
    			if (detaching) detach_dev(t36);
    			destroy_component(simplefooter, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $count;
    	validate_store(count, "count");
    	component_subscribe($$self, count, $$value => $$invalidate(2, $count = $$value));
    	let { name } = $$props;
    	const personaldata = { age: 23, name: "Pia" };
    	let telnr = "";

    	function handleSubmit() {
    		alert(`submitted pin: ${telnr}`);
    	}

    	const writable_props = ["name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		$count = to_number(this.value);
    		count.set($count);
    	}

    	function keypad_valuepiep_binding(value) {
    		telnr = value;
    		$$invalidate(1, telnr);
    	}

    	const componentsmessageevent_handler = event => alert(`My message: ${event.detail.text} in color ${event.detail.color}`);

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => {
    		return { name, telnr, $count };
    	};

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("telnr" in $$props) $$invalidate(1, telnr = $$props.telnr);
    		if ("$count" in $$props) count.set($count = $$props.$count);
    	};

    	return [
    		name,
    		telnr,
    		$count,
    		personaldata,
    		handleSubmit,
    		input_input_handler,
    		keypad_valuepiep_binding,
    		componentsmessageevent_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
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
