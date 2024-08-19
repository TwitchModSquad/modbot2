function toggleChannelActions() {
    const channel = $(this).closest(".action-channel");
    channel.toggleClass("closed");
    channel.find(".action-body").slideToggle(250);
}

function submitActionForm(form) {
    const checkboxInputs = form.find("input[type=checkbox]");
    const textInputs = form.find("input[type=text]");

    const data = {};
    checkboxInputs.each((i,input) => {
        data[$(input).attr("name")] = input.checked;
    });

    textInputs.each((i,input) => {
        input = $(input);
        data[input.attr("name")] = input.val();
    });

    const id = form.find("input[name=id]").attr("value");
    const guildId = form.find("input[name=guildId]").attr("value");
    const name = form.find(".name").first().text();

    const closeNotif = createNotification("Updating Actions...", "Updating actions in channel #" + name);
    $.ajax(`/api/discord/${guildId}/channel/${id}/actions`, {
        method: "POST",
        dataType: "json",
        contentType: "application/json",
        data: JSON.stringify(data),
        success: function(data) {
            closeNotif();
            if (data.ok) {
                createNotification("Success!", "Successfully updated actions in #" + name, 5000);
                updateForm(form);
                checkForm(form);
            } else {
                createNotification("Error while updating actions!", data.error, 5000);
            }
        },
        error: function(data) {
            closeNotif();
            createNotification("Error while updating actions!", "Please contact an administrator.", 5000);
        },
    });
}

function deleteActionChannel(form) {
    const id = form.find("input[name=id]").attr("value");
    const guildId = form.find("input[name=guildId]").attr("value");
    const name = form.find(".name").first().text();

    const closeNotif = createNotification("Deleting action channel...", "Deleting action channel #" + name);
    $.ajax(`/api/discord/${guildId}/channel/${id}`, {
        method: "DELETE",
        success: function(data) {
            closeNotif();
            if (data.ok) {
                createNotification("Success!", "Successfully deleted action channel #" + name, 5000);
                form.slideUp(250);
                setTimeout(() => {
                    form.remove();
                }, 250);
            } else {
                createNotification("Error while deleting action channel!", data.error, 5000);
            }
        },
        error: function(data) {
            closeNotif();
            createNotification("Error while deleting action channel!", "Please contact an administrator.", 5000);
        },
    });
}

function updateActions(form) {
    const count = form.find(".action-section > .form-group > input:checked").length;
    const max = form.find(".action-section > .form-group > input").length;
    form.find(".action-counter span.count").text(count);
    form.find(".action-counter span.max").text(max);
}

$(function() {
    $("#active-community").click(function() {
        $("#community-dropdown").toggleClass("open");
    });

    $(".action-channel .action-header").click(toggleChannelActions);

    $(".action-channel input[type=checkbox]").change(function() {
        const form = $(this).closest("form");
        updateActions(form);
    });

    $(".action-channel").each((i, form) => {
        updateActions($(form));
    });

    $("#commands").submit(function() {
        const form = $(this);
        const checkboxInputs = form.find("input[type=checkbox]");

        const data = {};
        checkboxInputs.each((i,input) => {
            data[$(input).attr("name")] = input.checked;
        });

        const id = form.find("input[name=id]").attr("value");
        const name = form.find("input[name=name]").attr("value");

        const closeNotif = createNotification("Updating Commands...", "Updating commands in guild " + name);

        $.ajax(`/api/discord/${id}/commands`, {
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(data) {
                closeNotif();
                if (data.ok) {
                    createNotification("Success!", "Successfully updated commands in " + name, 5000);
                    updateForm(form);
                    checkForm(form);
                } else {
                    createNotification("Error while updating commands!", data.error, 5000);
                }
            },
            error: function(data) {
                closeNotif();
                createNotification("Error while updating commands!", "Please contact an administrator.", 5000);
            },
        });

        return false;
    });

    $(".action-channel").submit(function() {
        submitActionForm($(this));
        return false;
    });

    $(".delete-action-channel").click(function() {
        deleteActionChannel($(this).closest("form"));
        return false;
    });

    $("#add-channel").submit(function () {
        const clone = $("#channel-form-new").clone();

        const id = $("#new-channel").val();
        const name = $(`#new-channel option[value=${id}]`).text().replace(/#/g, "");
        
        clone.html(clone.html().replace(/:id/g, id));
        clone.attr("data-ignoresave", null);
        clone.attr("id", `channel-form-${id}`)
        clone.find(".name").text(name);

        clone.find(".action-header").click(toggleChannelActions);

        clone.submit(function() {
            submitActionForm($(this));
            return false;
        });

        clone.find(".delete-action-channel").click(function() {
            deleteActionChannel($(this).closest("form"));
            return false;
        });

        clone.find("input[type=checkbox]").change(function() {
            const form = $(this).closest("form");
            updateActions(form);
        });

        addForm(clone);
        updateForm(clone);

        $(`#new-channel option[value=${id}]`).remove();
        $("#action-channels").prepend(clone);

        return false;
    });
});
