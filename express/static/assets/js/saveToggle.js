const formCache = {};

const updateForm = function(form) {
    formCache[form.attr("id")] = form.serializeArray();
}

const checkForm = function(form) {
    let changed = false;

    if (!form.attr("id")) return;

    const ser = form.serializeArray();
    const prevSer = formCache[form.attr("id")];

    if (!prevSer) {
        changed = true;
    }

    for (let i = 0; i < ser.length; i++) {
        if (changed) break;

        const opt = ser[i];
        const prevOpt = prevSer.find(x => x.name === opt.name);
        if (prevOpt) {
            if (prevOpt.value === opt.value) {
                continue;
            }
        }
        changed = true;
    }

    for (let i = 0; i < prevSer.length; i++) {
        if (changed) break;

        const prevOpt = prevSer[i];
        const opt = ser.find(x => x.name === prevOpt.name);
        if (opt) {
            if (opt.value === prevOpt.value) {
                continue;
            }
        }
        changed = true;
    }

    if (changed) {
        form.find("button[type=submit]").attr("disabled", null);
        form.find("input[type=submit]").attr("disabled", null);
    } else {
        form.find("button[type=submit]").attr("disabled", "disabled");
        form.find("input[type=submit]").attr("disabled", "disabled");
    }
}

let nextId = 0;
function addForm(form) {
    let id = form.attr("id");
    if (!id) {
        id = `form-save-${++nextId}`;
        form.attr("id", id);
    }

    if (form.attr("data-ignoresave")) {
        console.log("Ignoring form updates on #" + id);
        return;
    }

    console.log("Checking for form updates on #" + id)

    updateForm(form);
    form.find("input").change(function() {
        const form = $(this).closest("form");
        if (form) {
            checkForm(form);
        }
    });
}

$(function() {
    $("form").each(function (i, form) {
        form = $(form);

        addForm(form);
    });
});
