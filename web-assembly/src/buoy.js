



async function entity(pid, cls, identifiers=[]) {
    /*
    Load single or set of entities.
    */
    let q = await query(cls);  // get list of entities
    for (let ii = 0; ii < q.length; ii++) {
        let c = document.createElement("container");
        let e = q[ii];
        if (identifiers.length === 0 || e["@iot.id"] in identifiers) {
            c.setAttribute("class", "container");
            c.appendChild(create(e, cls));
            document.getElementById(pid).appendChild(c);
        }
    }
}


function ancestor(el, cls) {
    while ((el = el.parentNode) && !(el.classList == cls)) {}  // ascend until first instance of class
    return el;
}

function del(e, context) {
    let p = ancestor(e, context);  // find parent of trigger element
    let par = p.parentElement;  // get container element
    par.removeChild(p);
    if (par.childElementCount === 0) {
        par.parentNode.removeChild(par);  // if there are no children, destroy container
    }
}

function move_up(e, context) {
    let p = ancestor(e, context);
    let par = p.parentNode;
    par.insertBefore(p, par.previousSibling);
}


function create(entity, cls) {

    let e = document.createElement("card");
    e.setAttribute("class", "card");

    let prop = [entity["name"]];
    let methods = ["location.href='" + entity["@iot.selfLink"] + "'"];
    let prop_list = list(e, prop, methods, "info-link");
    let options = ["."];
    let links = [""];
    for (let key in entity) {
        if (entity.hasOwnProperty(key) && key.includes("@iot.navigation")) {
            links.push(entity[key]);
            options.push(key.split("@")[0]);
        }
    }
    prop_list.appendChild(dropdown(options, links));

    tools(entity, cls).map((tool) => {
        let item = document.createElement("li");
        let link = document.createElement("a");
        link.appendChild(document.createTextNode(tool[0]));
        link.setAttribute("class", "tool-link");
        link.setAttribute("onclick", tool[1]);
        item.appendChild(link);
        prop_list.appendChild(item);
    });

    e.appendChild(prop_list);
    return e;
}

function tools(entity, cls) {
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




