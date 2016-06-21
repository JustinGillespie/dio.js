/**
 * Surl - Virtual Dom Library
 *
 * @author Sultan Tarimo <https://github.com/sultantarimo>
 */
(function () {
    'use strict';

    /**
     * requestAnimationFrame Polyfill
     */
    (function () {
        // references
        let raf: string = 'requestAnimationFrame',
            caf: string = 'cancelAnimationFrame',
            v: any[]    = ['ms', 'moz', 'webkit'],
            vl: number  = v.length,
            af: string  = 'AnimationFrame',
            lt: number  = 0, 
            // last time
            w: any      = window;

        // normalize vendors
        for (let x = 0; x < vl && !w[raf]; ++x) {
            w[raf] = w[v[x]+'Request'+af];
            w[caf] = w[v[x]+'Cancel'+af]||w[v[x]+'CancelRequest'+af]
        }

        // raf doesn't exist, polyfill it
        if (!w[raf]) {
            w[raf] = function(callback: Function) {
                let currTime   = new Date().getTime(),
                    timeToCall = Math.max(0, 16 - (currTime - lt)),
                    id         = w.setTimeout(function() { 
                                    callback(currTime + timeToCall)
                                 }, timeToCall);

                    lt = currTime + timeToCall;

                return id
            }
        }

        if (!w[caf]) {
            w[caf] = function(id: number) {
                clearTimeout(id)
            }
        }
    }());

    // references
    let namespaces: any = {
            math:  'http://www.w3.org/1998/Math/MathML',
            svg:   'http://www.w3.org/2000/svg',
            xlink: 'http://www.w3.org/1999/xlink'
        };

    /**
     * 'forEach' shortcut
     * @param  {Array|Object} a 
     * @param  {Function}     b
     * @return {Array|Object}
     */
    function each (arg: any[]|any, callback: Function) {
        let index: number = 0,
            name: string;

        // Handle arrays
        if (arg.constructor === Array) {
            let arr: any[]     = arg,
                length: number = arr.length;

            for (; index < length; ++index) {
                if (callback.call(arr[index], arr[index], index, arr) === false) {
                    return arr
                }
            }
        }
        // Handle objects 
        else {
            let obj: any = arg;
            
            for (name in obj) {
                if (callback.call(obj[name], obj[name], name, obj) === false) {
                    return obj
                }
            }
        }
    }

    /**
     * requestAnimationFrame helper
     * @param  {Function} fn  - function to run on each frame update
     * @param  {Number}   fps - frames per second
     * @param  {Object}   raf - object to request animation frame reference
     */
    function raf (callback: Function, fps: number, raf: any) {
        let then = new Date().getTime();
    
        // custom fps, otherwise fallback to 60
        fps = fps || 60;
        let interval = 1000 / fps;
    
        return (function loop(time: number) {
            raf.id    = requestAnimationFrame(loop)

            let now   = new Date().getTime(),
                delta = now - then;
    
            if (delta > interval) {
                then = now - (delta % interval);
                callback(time)
            }
        }(0))
    }

    /**
     * serialize + encode object
     * @param  {Object}  a `object to serialize`
     * @return {String}   serialized object
     * @example
     * // returns 'url=http%3A%2F%2F.com'
     * param({url:'http://.com'})
     */
    function param (arg: any): string {
        let arr: any[] = [];
    
        for (let name in arg) {
            let value = arg[name];
    
            arr.push(typeof value == 'object' ? param(value) : 
                encodeURIComponent(name) + '=' + encodeURIComponent(value))
        }
    
        return arr.join('&')
    }
    
    /**
     * ajax helper
     * @param  {Object}   settings `ajax settings object`
     * @param  {Function} callback `function to run onload`
     * @example
     * // returns xhr Object
     * ajax({url, method, data}, fn(res, err) => {})
     */
    function ajax (settings: {url: string, method: string, data: any, callback: Function}) {
        let xhr      = new XMLHttpRequest(),
            location = window.location,
            url      = settings.url,
            callback = settings.callback,
            method   = settings.method,
            data     = settings.data,
            a        = document.createElement('a');
            a.href   = url;
    
        // is this a CROSS ORIGIN REQUEST check
        let CORS = !(
            a.hostname === location.hostname &&
            a.port === location.port &&
            a.protocol === location.protocol &&
            location.protocol !== 'file:'
        );
            a = null;
    
        xhr.open(method, url, true);
    
        xhr.onerror = function () {
            callback(this, true)
        };
    
        xhr.onload = function () {
            // callback specified
            if (callback) {
                let params: any[], 
                    response: string|Node;
    
                if (this.status >= 200 && this.status < 400) {
                    // determine return data type
                    let type    = xhr.getResponseHeader("content-type"),
                        typeArr = type.split(';');

                        typeArr = type[0].split('/');
                        type    = typeArr[typeArr.length-1];
    
                    // json
                    if (type === 'json') {
                        response = JSON.parse(xhr.responseText)
                    }
                    // html, create dom
                    else if (type === 'html') {
                        response = (new DOMParser()).parseFromString(xhr.responseText, "text/html")
                    }
                    // just text
                    else {
                        response = xhr.responseText
                    }
    
                    params = [response, false]
                } else {
                    params = [this, true]
                }
    
                callback(params[0], params[1])
            }
        }
    
        if (CORS) {
            xhr.withCredentials = true
        }
    
        if (method !== 'GET') {
            // set type of data sent : text/json
            xhr.setRequestHeader(
                'Content-Type', 
                data.constructor === Object ? 'application/json' : 'text/plain'
            )
        }
    
        if (method === 'POST') {
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xhr.send(param(settings))
        } else {
            xhr.send()
        }
    
        return xhr
    }

    /**
     * surl
     * @param  {Element?} parent - optional parent element
     * @return {surl}
     */
    class surl {
        parent: any;
        router: any;
        settings: any;

        constructor (parent: string|Element) {
            let self = this;

            if (parent) {
                self.parent = self.__$(parent);
            }

            self.settings   = { loop: true },
            self.router     = {
                nav: function (url: string) {
                    history.pushState(null, null, url)
                },
                back: function () {
                    history.back()
                },
                foward: function () {
                    (history as any).foward()
                },
                go: function (index: number) {
                    history.go(index)
                },
                destroy: function () {
                    this.routes = {};
                    cancelAnimationFrame(this.raf.id);
                },
                listen: function () {
                    let self      = this,
                        loc       = window.location;
                        self.url  = null;
                        self.raf  = {id: 0};

                    // start listening for a a change in the url
                    raf(function () {
                        let url = loc.href;

                        if (self.url !== url) {
                            self.url = url;
                            self.changed()
                        }
                    }, 60, self.raf)
                },
                on: function (url: string|any, callback: Function) {
                    let self = this,
                        routes: any;

                    // create routes object if it doesn't exist
                    if (!self.routes) {
                        self.routes = {}
                    }

                    // start listening for route changes
                    if (!self.raf) {
                        self.listen()
                    }

                    // normalize args for ({obj}) and (url, callback) styles
                    if (url.constructor !== Object) {
                        let args   = arguments;
                            routes = {};
                            routes[args[0]] = args[1];
                    }
                    else {
                        routes = url;
                    }

                    // assign routes
                    each(routes, function (callback: Function, name: string) {
                        let variables: any[] = [],
                            regex     = /([:*])(\w+)|([\*])/g,
                            // given the following /:user/:id/*
                            pattern = name.replace(regex, function () {
                                        let args = arguments,
                                            id   = args[2];
                                            // 'user', 'id', undefned

                                        // if not a variable 
                                        if (!id) {
                                            return '(?:.*)'
                                        }
                                        // capture
                                        else {
                                            variables.push(id);
                                            return '([^\/]+)'
                                        }
                                    });

                        self.routes[name] = {
                            callback:  callback,
                            pattern:   pattern,
                            variables: variables
                        }
                    })
                },
                changed: function () {
                    let _self = this;

                    each(_self.routes, function (val: {callback: Function, pattern: string, variables: any[]}) {
                        let callback  = val.callback,
                            pattern   = val.pattern,
                            variables = val.variables,
                            url       = _self.url,
                            match: any[];

                        // exec pattern on url
                        match = url.match(new RegExp(pattern));

                        // we have a match
                        if (match) {
                            // create params object to pass to callback
                            // i.e {user: "simple", id: "1234"}
                            let args = match
                                // remove the first(url) value in the array
                                .slice(1, match.length)
                                .reduce(function (args, val, i) {
                                    if (!args) {
                                        args = {}
                                    }
                                    // let name: value
                                    // i.e user: 'simple'
                                    args[variables[i]] = val;
                                    return args
                                }, null);

                            // callback is a function, exec with args
                            if (callback.constructor === Function) {
                                callback(args)
                            }
                            // callback is a component, mount
                            else if (callback.hasOwnProperty('render')) {
                                self.mount(callback, null, args)
                            }
                            // can't process
                            else {
                                throw 'could not find the render method'
                            }
                        }
                    }.bind(this))
                }
            }
        }

        /**
         * Virtual Dom
         * @param  {Element}  a - parent element
         * @param  {Function} b - render function
         * @return {Object}     - vdom object
         */
        __vdom () {
            // events
            function isEventProp (name: string) {
                // checks if the first two characters are on
                return name.substring(0,2) === 'on'
            }
        
            function extractEventName (name: string) {
                // removes the first two characters and converts to lowercase
                return name.substring(2, name.length).toLowerCase()
            }
        
            function addEventListeners (target: Element, props: any) {
                for (let name in props) {
                    if (isEventProp(name)) {
                        // callback
                        let callback = props[name];
        
                        if (callback) {
                            target.addEventListener(extractEventName(name), callback, false)
                        }
                    }
                }
            }
        
            // assign/update/remove props
            function prop (target: any, name: string, value: string|boolean, op: number) {
                if (isEventProp(name)) {
                    return
                }
        
                // remove / add attribute reference
                let attr = (op === -1 ? 'remove' : 'set') + 'Attribute';
        
                // if the target has an attr as a property, 
                // change that aswell
                if (
                    target[name] !== void 0 && 
                    target.namespaceURI !== namespaces['svg']
                ) {
                    target[name] = value
                }

                // set xlink:href attr
                if (name === 'xlink:href') {
                    return target.setAttributeNS(namespaces['xlink'], 'href', value)
                }
        
                // don't set namespace attrs
                // keep the presented dom clean
                if (
                    value !== namespaces['svg'] && 
                    value !== namespaces['math']
                ) {
                    return op === -1 ? target[attr](name) : target[attr](name, value)
                }
            }
        
            function updateElementProp (target: Element, name: string, newVal: string, oldVal: string) {
                if (!newVal) {
                    // -1 : remove prop
                    prop(target, name, oldVal, -1)
                } 
                else if (!oldVal || newVal !== oldVal) {
                    // + 1 : add/update prop
                    prop(target, name, newVal, +1)
                }
            }
        
            function updateElementProps (target: any, newProps: any, oldProps: any) {
                oldProps  = oldProps !== void 0 ? oldProps : {};

                // merge old and new props
                let props: any = {};
                for (let name in newProps) { props[name] = newProps[name] }
                for (let name in oldProps) { props[name] = oldProps[name] }
        
                // compare if props have been added/delete/updated
                // if name not in newProp[name] : deleted
                // if name not in oldProp[name] : added
                // if name in oldProp !== name in newProp : updated
                for (let name in props) {
                    updateElementProp(target, name, newProps[name], oldProps[name])
                }
            }
        
            function setElementProps (target: Element, props: any) {
                for (let name in props) {
                    // initial creation, no checks, just set
                    prop(target, name, props[name], +1)
                }
            }
        
            // create element
            function createElement (node: any): Node {
                // handle text nodes
                if (node.constructor === String) {
                    return document.createTextNode(node)
                }

                let el: Element;

                if (!node.render) {
                    // not a text node 
                    // check if is namespaced
                    if (node.props && node.props.xmlns) {
                        el = document.createElementNS(node.props.xmlns, node.type)
                    } 
                    else {
                        el = document.createElement(node.type)
                    }
                    
                    // diff and update/add/remove props
                    setElementProps(el, node.props);
                    // add events if any
                    addEventListeners(el, node.props);
                    
                    // only map children arrays
                    if (node.children && node.children.constructor === Array) {
                        each(node.children.map(createElement), el.appendChild.bind(el))
                    }
                }
                else {
                    el = node.render.parent
                }
        
                return el
            }
        
        
            // diffing a node
            function changed (node1: any, node2: any) {
                    // diff object type
                let isDiffType  = node1.constructor !== node1.constructor,
                    // diff text content
                    isDiffText  = node1.constructor === String && node1 !== node2,
                    // diff dom type
                    isDiffDom   = node1.type !== node2.type;
        
                return isDiffType || isDiffText || isDiffDom
            }
            
            // validate
            function validate (arg: any) {
                // converts 0 | false to strings
                if (arg !== void 0 && (arg === null || arg === 0 || arg === false)) {
                    arg = arg + ''
                }
        
                return arg
            }
        
            // update
            function update (parent: Node, newNode: any, oldNode?: any, index?: number) {
                index = index ? index : 0;
        
                oldNode = validate(oldNode);
                newNode = validate(newNode);

                // adding to the dom
                if (!oldNode) {
                    parent.appendChild(createElement(newNode))
                } 
                // removing from the dom
                else if (!newNode) {
                    parent.removeChild(parent.childNodes[index])
                }
                // replacing a node
                else if (changed(newNode, oldNode)) {
                    parent.replaceChild(createElement(newNode), parent.childNodes[index])
                }
                // the lookup loop
                else if (newNode.type) {
                    // diff, update props
                    updateElementProps(parent.childNodes[index], newNode.props, oldNode.props);
                    
                    // loop through all children
                    let newLength: number = newNode.children.length,
                        oldLength: number = oldNode.children.length;
        
                    for (let i = 0; i < newLength || i < oldLength; i++) {
                        update(parent.childNodes[index], newNode.children[i], oldNode.children[i], i)
                    }
                }
            }
            
            // vdom object
            class vdom {
                parent: Element;
                fn: Function;
                raf: any;
                old: any;
                
                constructor(parent: any, render: any) {
                    // root reference
                    this.parent = parent,
                    // local copy of dynamic hyperscript reference
                    this.fn = render
                }
                
                // refresh/update dom
                update () {
                    // get latest change
                    let newNode = this.fn(),
                        // get old copy
                        oldNode = this.old;

                    update(this.parent, newNode, oldNode);
                
                    // update old node
                    this.old = newNode
                }
                
                // init mount to dom
                init () {
                    // local copy of static hyperscript refence
                    this.old = this.fn();
                    // initial mount
                    update(this.parent, this.old)
                }
                
                // activate requestAnimationframe loop
                auto (start: boolean) {
                    let self = this;

                    // start
                    if (start) {
                        self.raf = {
                            id:1
                        };

                        // requestAnimationFrame at 60 fps
                        raf(function () {
                            self.update()
                        }, 60, self.raf)
                    }
                    // stop
                    else {
                        // push to the end of the callstack
                        // lets the current update trigger
                        // before stopping
                        setTimeout(function () {
                            cancelAnimationFrame(self.raf.id)
                        }, 0);

                        return self.raf.id
                    }
                }
            }
        
            return vdom
        }

        /**
         * get element
         * @param  {Selector|Element} element - an element or string
         * @return {Element|Void}
         */
        __$ (element: any): Element|void {
            // can't use document, use body instead
            if (element === document) {
                element = element.body
            }
            // query selector if string
            else if (element.constructor === String) {
                element = document.querySelector(element)
            }

            return element && element.nodeType ? element : void 0;
        }

        /**
         * make ajax requests
         * @return {Object} xhr object
         */
        req () {
            let args = arguments,
                settings = {
                    method: 'GET',
                    data: {},
                    callback: function(){},
                    url: ''
                };

            each(args, function (val: any) {
                if (val.constructor === Object) {
                    settings.data = val
                }
                else if (val.constructor === Function) {
                    settings.callback = val
                }
                else if (val.constructor === String) {
                    let type = val.toUpperCase();

                    if (type === 'POST' || type === 'GET') {
                        settings.method = type
                    } 
                    else {
                        settings.url = val
                    }  
                }
            });
            
            // process
            ajax(settings)
        }

        /**
         * initialize 
         * @param {String} id - base component to mount to dom
         */
        mount (cmp: any, element: Element, args: any) {
            let self = this;

            // add parent now
            if (element) {
                self.parent = element
            }

            // has parent to mount to
            if (self.parent) {
                // clear dom
                self.parent.innerHTML = '';
                // add to dom
                self.parent.appendChild(cmp.render.parent)

                // exec __constructor
                if (cmp.__constructor) {
                    cmp.__constructor(args);
                }
            }
            // can't find parent to mount to
            else {
                throw 'the element to mount to does not exist'
            }
        }

        /**
         * create a component
         * @param  {Object} component - component object
         * @return {Object}           - component
         */
        component (cmp: any) {
            // bind the component scope to all functions that are not 'render'
            each(cmp, function(value: any, name: string, obj: any) {
                if (name !== 'render' && value.constructor === Function) {
                    obj[name] = value.bind(cmp)
                }
            })

            // define parent element
            let parent = document.createElement('div');
            
            // add class namespace
            if (cmp.namespace) {
                parent.classList.add(cmp.namespace)
            }

            // initialize render
            if (cmp.render.constructor === Function) {
                // assign parent
                cmp.render = {
                    fn:     cmp.render,
                    parent: parent
                };

                // create and bind render
                cmp.render.fn = cmp.render.fn.bind(cmp);

                // get vdom
                let vdom = this.__vdom();
                // instantiate vdom
                cmp.render = new vdom(cmp.render.parent, cmp.render.fn);
                // initialize                    
                cmp.render.init();

                // activate loop, if settings.loop = true
                if (!!this.settings.loop) {
                    cmp.render.auto(true)
                }
            }

            return cmp
        }
    }

    /**
     * create virtual element : h()
     * @param  {String} type  - Element, i.e: div
     * @param  {Object} props - optional properties
     * @return {Object}       - {type, props, children}
     * @example
     * h('div', {class: 'close'}, 'Text Content')
     * h('div', null, h('h1', 'Text'));
     */
    function hyperscript (type: string, props: any) {
        let len = arguments.length,
            key = 2,
            obj: {children: any[], type: string, props: any} = {type: type, props: props, children: []};

        // insure props is always an object
        if (obj.props === null || obj.props === void 0 || obj.props.constructor !== Object) {
            obj.props = {}
        }

        // check if the type is a special case i.e [type] | div.class | #id
        // and alter the hyperscript
        if (
            obj.type.indexOf('[') !== -1 || 
            obj.type.indexOf('#') !== -1 || 
            obj.type.indexOf('.') !== -1
        ) {
            obj = tag(obj)
        }

        // auto set namespace for svg and math elements
        // we will then check when setting it's children
        // if the parent has a namespace we will set that
        // to the children as well, if you set the
        // xmlns prop we default to that instead of the 
        // svg and math presets
        if (obj.type === 'svg' || obj.type === 'math') {
            // only add the namespace if it's not already set
            if (!obj.props.xmlns) {
                obj.props.xmlns = namespaces[obj.type]
            }
        }

        // construct children
        for (let i = key; i < len; i++) {
            // reference to current layer
            let child = arguments[i];
    
            // if the child is an array go deeper
            // and set the 'arrays children' as children
            if (child && child.constructor === Array) {
                for (let k = 0; k < child.length; k++) {
                    obj.children[(i-key) + k] = set(child[k], obj)
                }
            }
            // deep enough, add this child to children
            else {
                obj.children[i - key] = set(child, obj)
            }
        }

        return obj
    }

    /**
     * convert anything not an array, string or objects to a string
     * @param  {Any} a
     * @return {String|Array|Object}
     */
    function set (arg: any, obj: any) {
        // add obj.prop to children if they are none TextNodes
        if (arg && arg.constructor === Object && obj.props.xmlns) {
            arg.props.xmlns = obj.props.xmlns
        }

        arg = arg !== void 0 && 
            arg !== null && 
            (arg.constructor === Object || 
            arg.constructor === String || 
            arg.constructor === Array) ? 
        
            arg : 
            arg + '';
        // convert the null, and undefined strings to empty strings
        // we don't convert false since that could 
        // be a valid value returned to the client
        arg = arg === 'null' || arg === 'undefined' ? '' : arg;
        return arg
    }

    /**
     * hyperscript tagger
     * @param  {Object} a - object with opt props key
     * @param  {Object} b - tag
     * @return {[Object]} - {props, type}
     * @example
     * // return {type: 'input', props: {id: 'id', type: 'checkbox'}}
     * tag('inpu#id[type=checkbox]')
     */
    function tag (obj: any) {
        let classes: any[] = [], 
            match: any,
            parser = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g,

            // copy obj's props to abstract props and type
            // incase obj.props is empty create new obj
            // otherwise just add to already available object
            // we will add this back to obj.props later
            props = !obj.props ? {} : obj.props,

            // since we use type in a while loop
            // we will be updating obj.type directly
            type = obj.type;

            // set default type to a div
            obj.type = 'div';

        // execute the regex and loop through the results
        while ((match = parser.exec(type))) {
            // no custom prop match
            if (match[1] === '' && match[2]) {
                obj.type = match[2]
            }
            // matches id's - #id
            else if (match[1] === '#') {
                props.id = match[2]
            } 
            // matches classes - div.classname
            else if (match[1] === '.') {
                classes.push(match[2])
            } 
            // matches - [attr=value]
            else if (match[3][0] === '[') {
                let attr = match[6];

                // make sure we have a non null|undefined|false value
                if (attr) {
                    // remove the '[]'
                    attr = attr.replace(/\\(["'])/g, '$1')
                }
                // if attr value is an empty string assign true
                props[match[4]] = attr || true
            }
        }

        // add classes to obj.props if we have any
        if (classes.length > 0) {
            props.class = classes.join(' ')
        }

        // as promised, update props
        obj.props = props;
        
        // done
        return obj
    }

    /**
     * animate component/element
     * 
     * - adds `animating` class to document.body and element passed
     * while animating, removes them when the animation is done.
     *
     * @param  {Element} element   
     * @param  {Array}   transforms 'describe additional transforms'
     * @param  {Number}  duration   'duration of the animation'
     * @param  {String}  className  'class that represents end state animating to'
     * 
     * @return {Void}
     *
     * @example
     * h('.card', {onclick: animate}, h('p', null, a))
     * // or 
     * h('.card', {onclick: animate.bind(400, 'endClassName', '0,0,0,1.2')}, h('p', null, a))
     * // or 
     * animate(target, 'endClassName', 400, ['rotate(25deg)', 'translate(-20px)'])
     */
    function animate() {
        // declare variables
        let args: any[], 
            className: string, 
            duration: number, 
            transform: any[], 
            easing: string, 
            element: any,
            first: any, 
            last: any, 
            invert: any, 
            animation: any, 
            webAnimations: boolean;
            
            first = last = invert = animation = {},
            // assign arguments
            args = Array.prototype.slice.call(arguments);

        for (let i = args.length - 1; i >= 0; i--) {
            let arg = args[i];

            if (arg.constructor === Array) {
                transform = arg.join(' ')
            } 
            else if (arg.constructor === Number) {
                duration = arg
            } 
            else if (arg.constructor === String) {
                if (arg.indexOf(',') !== -1) { 
                    easing = arg 
                }
                else { 
                    className = arg 
                }
            } 
            else if (!!arg.target) {
                element = arg.target
            }
        }

        if (this.constructor === Number) {
            duration = this
        } 
        else if (this.constructor === String) {
            className = this
        } else if (!className) {
            className = 'animation-active';
        }

        // we need an end state class and element to run
        if (!className || !element) {
            return
        }

        // promote element to individual composite layer
        element.style.willChange = 'transform';
        // get first state
        first = element.getBoundingClientRect();
        // assign last state
        element.classList.toggle(className);
        // get last state
        last = element.getBoundingClientRect();
        // get invert values
        invert.x = first.left - last.left;
        invert.y = first.top - last.top;
        invert.sx = first.width / last.width;
        invert.sy = first.height / last.height;

        // animation type
        // if this is set we opt for the more performant
        // web animations api
        if (element.animate && element.animate.constructor === Function) {
            webAnimations = true
        }

        animation.first = 'translate('+invert.x+'px,'+invert.y+'px) translateZ(0)'+' scale('+invert.sx+','+invert.sy+')',
        animation.first = transform ? animation.first + ' ' + transform : animation.first,
        animation.last = 'translate(0,0) translateZ(0) scale(1,1) rotate(0) skew(0)',
        animation.duration = duration ? duration : 200,
        animation.easing = easing ? 'cubic-bezier('+easing+')' : 'cubic-bezier(0,0,0.32,1)',
        element.style.transformOrigin = '0 0';

        // reflect animation state on dom
        element.classList.add('animation-running');
        document.body.classList.add('animation-running');
        document.body.classList.toggle('animation-active');

        // use native web animations api if present
        // presents better performance
        if (webAnimations) {
            let player = element.animate([
                {transform: animation.first},
                {transform: animation.last}
            ], {
                duration: animation.duration,
                easing: animation.easing
            });

            player.addEventListener('finish', onfinish);
        } else {
            element.style.transform = animation.first;
            // trigger repaint 
            element.offsetWidth;
            element.style.transition = 'transform '+animation.duration+'ms '+animation.easing,
            element.style.transform = animation.last;
        }

        // cleanup
        function onfinish(e: Event) {
            if (!webAnimations) {
                // bubbled events
                if (e.target != element) {
                    return
                }
                element.style.transition = null,
                element.style.transform = null;
            }
            element.style.transformOrigin = null,
            element.style.willChange = null;

            element.classList.remove('animation-running');
            document.body.classList.remove('animation-running');
            element.removeEventListener('transitionend', onfinish);
        }

        if (!webAnimations) {
            element.addEventListener('transitionend', onfinish);
        }
    }

    (window as any).surl = surl;
    (window as any).h = hyperscript;
    (window as any).animate = animate;
}())