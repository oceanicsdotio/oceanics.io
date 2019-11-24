let MAPBOX = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';
let MAPBOX_STYLE = 'mapbox://styles/oceanicsdotio/cjnoaz4rf13ly2sla2keyuarx';

class Context {

    constructor() {
        this.service = "api/";
        this.host = "http://localhost/";
    }

    static async query(url) {
        /*
        Make an asynchronous request to the API server.
        */
        let response = await fetch(url).then(function(response) {
                return response.json();  // parse response as JSON
            });
        return response["value"];  // API responses have "value" key for payload
    }

    url(cls, identity=null) {
        /*
        Convenience method to create basic formatted URL for getting a collection of single resource
         */
        let url = this.host + this.service + cls;
        if (identity !== null) {
            url += ("(" + String(identity) + ")");
        }
        return url;
    }


    async menu() {
        /*
        Generate an entity expansion menu from a database query.
        */
        let p = document.getElementById("sub-menu");

        let entries = ["."];
        let methods = [`Context.entity('sub-menu', '${this.url("Ingress", 0)}')`];
        console.log(methods);
        p.appendChild(Tree.list(p, entries, methods, "tool-link"));

        let data = await Context.query(this.host + this.service + "?extension=sensing");
        p.appendChild(this.dropdown(data));
    }

    dropdown(data, query="value") {
        /*
        Create a drop down menu with the given options. Keys and values are identical.
         */
        let options = [];
        let links = [];
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                let cls = key.split("-")[0];
                options.push(cls);
                links.push(this.host + this.service + cls)
            }
        }
        let onchange = "Context.entity('content', this.value);";
        let drop = Dropdown.create(options, links, query, onchange);
        let form = Dropdown.form(drop, this.service);
        return document.createElement("li").appendChild(form);
    }

    static async entity(pid, cls, identifiers=[]) {
        /*
        Load single or set of entities.
        */
        let q = await Context.query(cls);  // get list of entities
        for (let ii = 0; ii < q.length; ii++) {
            let c = document.createElement("container");
            let e = q[ii];
            if (identifiers.length === 0 || e["@iot.id"] in identifiers) {
                c.setAttribute("class", "container");
                c.appendChild(Card.create(e, cls));
                document.getElementById(pid).appendChild(c);
            }
        }
    }

    static async expand(e) {
        /*
        Load all entities of single type attached to a single parent.
         */
        let p = Tree.ancestor(e, "container");
        let result = await Context.query(e.value);

        let cls = e.value.split("/")[1];
        for (let ii = 0; ii < result.length; ii++) {
            let c = Card.create(result[ii], cls);
            p.appendChild(c);
            if (cls.includes("Datastreams")) {
                Card.canvas(c);
            }
        }
    }


    async token() {
         /*
         Fetch an authorization token.
          */
        let token = await fetch(this.host + 'auth/token');
        console.log(token)
    }

    static account() {
        /*
        Stub for user authorization.
         */
    }

}


class Tree {

    static ancestor(el, cls) {
        while ((el = el.parentNode) && !(el.classList == cls)) {}  // ascend until first instance of class
        return el;
    }

    static del(e, context) {
        let p = Tree.ancestor(e, context);  // find parent of trigger element
        let par = p.parentElement;  // get container element
        par.removeChild(p);
        if (par.childElementCount === 0) {
            par.parentNode.removeChild(par);  // if there are no children, destroy container
        }
    }

    static move_up(e, context) {
        let p = Tree.ancestor(e, context);
        let par = p.parentNode;
        par.insertBefore(p, par.previousSibling);
    }

    static listItem(each, cls, method) {
        let item = document.createElement("li");
        let link = document.createElement("a");
        link.appendChild(document.createTextNode(each));
        link.setAttribute("class", cls);
        link.setAttribute("onclick", method);
        item.appendChild(link);
        return item
    }

    static list(p, items, methods, cls) {
        let ul = document.createElement("ul");
        for (let ii = 0; ii < items.length; ii++) {
            ul.appendChild(Tree.listItem(items[ii], cls, methods[ii]));
        }
        return ul;
    }
}

class Card {

    static navLinks(entity) {
        let options = [];
        let links = [];
        for (let key in entity) {
            if (entity.hasOwnProperty(key) && key.includes("@iot.navigation")) {
                links.push(entity[key]);
                options.push(key.split("@")[0]);
            }
        }
        return {
            "options": options,
            "links": links
        };
    }


    static create(entity, cls) {

        let e = document.createElement("card");
        e.setAttribute("class", "card");

        let prop = [];
        let methods = [];

        prop.push(entity["name"]);
        methods.push("location.href='" + entity["@iot.selfLink"] + "'");

        let prop_list = Tree.list(e, prop, methods, "info-link");

        let options = ["$expand"];
        let links = [""];
        let nav = Card.navLinks(entity);
        options = options.concat(nav["options"]);
        links = links.concat(nav["links"]);

        let tools = Card.tools(entity, cls);

        console.log({
            "marker": "Create tools",
            "cls": cls,
            "entity": entity,
            "tools": tools
        });

        prop_list.appendChild(Card.dropdown(options, links));

        for (let ii = 0; ii < tools.length; ii++) {
            let item = document.createElement("li");
            let link = document.createElement("a");
            link.appendChild(document.createTextNode(tools[ii][0]));
            link.setAttribute("class", "tool-link");
            link.setAttribute("onclick", tools[ii][1]);
            item.appendChild(link);
            prop_list.appendChild(item);
        }

        e.appendChild(prop_list);
        return e;
    }

    static tools(entity, cls) {
        /*
        Create tools for card.
        */
        let tools = [];

        tools.push(['Remove', 'Tree.del(this, "card")']); //

        if (cls.includes("Datastream")) {
            tools.push(["Plot", 'Card.canvas(Tree.ancestor(this, "card"))']);
            tools.push(["Up", 'Tree.move_up(this, "card")']);
        }

        if (cls.includes("Thing")) {
            tools.push(["Clone", 'Context.query("content", "Thing", 1)']);
        }

        if (cls.includes("Location")) {
            let geo = entity["location"].toString();
            tools.push(["Map", 'Card.map(Tree.ancestor(this, "card")).flyTo({center:[' + geo + ']});']);
        }

        return tools;
    }

    static dropdown(options, values, query="$expand", cls="Things") {
        /*
        Create a drop-down form to expand related entities.
        */
        let action = "/api/" + cls;
        let onchange = "Context.expand(this);";
        let drop = Dropdown.create(options, values, query, onchange);
        let form = Dropdown.form(drop, action);
        return document.createElement("li").appendChild(form);
    }

    static canvas(p) {
        /*
        Start a WebGL context in parent container.
         */
        let np = 1024;
        let pixh = 50;
        start(p, np, pixh);
    }

    static map(p) {
        /*
        Add Mapbox WebGL context.
         */
        let e = document.getElementById("map");
        if (e) {
            e.parentNode.removeChild(e);
        }
        else {
            let e = document.createElement("div");
            e.setAttribute("id", "map");
            p.appendChild(e);
            mapboxgl.accessToken = MAPBOX;
            return new mapboxgl.Map({
              container: 'map',
              style: MAPBOX_STYLE,
              center: [-69.0, 44.0],
              zoom: 10
            });
        }
    }
}


class Dropdown {

    static form(drop, action, method="get") {
        /*
        Create a form using a drop-down menu
         */
        let f = document.createElement("form");
        f.action = action;
        f.method = method;
        f.target = "_blank";  // do not refresh window
        f.appendChild(drop);
        return f;
    }


    static create(options, values, query, onchange) {
        /*
        Create a drop-down menu
         */
        let select = document.createElement("select");
        select.setAttribute("onchange", onchange);
        select.setAttribute("name", query);

        for (let ii = 0; ii < options.length; ii++) {
            let option = document.createElement("option");
            option.appendChild(document.createTextNode(options[ii]));
            option.setAttribute("value", values[ii]);
            select.appendChild(option);
        }
        return select
    }
}

let app = new Context();