let linkNum = 1;

function removeFile(ele) {
    ele.slideUp(200);
    setTimeout(function() {
        ele.remove();
    }, 200);
    return false;
}

$(function() {
    $("input[name=user]").on("change", function() {
        const input = $(this);
        const user = input.parent().find(".user");
        const type = user.hasClass("twitch") ? "twitch" : "discord";

        if (input.val() === "none") return;

        const newEle = $(`<div class="user ${type}" style="cursor:pointer;display:none;" title="Click to remove"></div>`)

        newEle.on("click", function() {
            $(this).slideUp(200);
        });
        
        newEle.html(user.html()).appendTo($("#users"));
        newEle.append(`<input type="hidden" name="user-${type}[]" value="${input.val()}" />`);

        newEle.slideDown(200);

        $(".no-users").slideUp(200);
        revertUserSelector($(".user-selector"));
    });

    $("#raw-input").on("submit", function() {
        const input = $("#user-raw");
        const newEle = $(`<div style="cursor:pointer;padding:1em;display:none;"><i class="fa-solid fa-user"></i> Raw User: <code>${input.val()}</code><input type="hidden" name="user-raw[]" value="${input.val()}" /></div>`);

        newEle.on("click", function() {
            $(this).slideUp(200);
        });
        
        newEle.appendTo($("#users"));
        newEle.slideDown(200);
        input.val("");

        $(".no-users").slideUp(200);
        return false;
    });

    $(".length-counter .input").on("keyup", function() {
        const input = $(this);
        const len = input.val().length;

        const counter = $(this).parent().find(".length");
        const min = Number(input.attr("minlength"));
        const max = Number(input.attr("maxlength"));

        counter.text(`${len}/${max}`);
        if (len < min || len > max) {
            counter.css("color","red");
        } else counter.css("color","inherit");
    });

    $("#file").on("click", function() {
        const ele = $(`<tr><td><input type="text" class="full" name="file-name-${linkNum}" placeholder="Label" minlength="3" maxlength="64" required="required"></td><td><input type="file" name="file-${linkNum}"></td><td><a href="#" onclick="return removeFile($(this).parent().parent());">Remove</a></td></tr>`);
        $("#files").append(ele);
        linkNum++;
    });

    $("#remote-link").on("click", function() {
        const ele = $(`<tr><td><input type="text" class="full" name="file-name-${linkNum}" placeholder="Label" minlength="3" maxlength="64" required="required"></td><td><input type="text" class="full" name="file-link-${linkNum}" placeholder="Remote URL" maxlength="256" required="required"></td><td><a href="#" onclick="return removeFile($(this).parent().parent());">Remove</a></td></tr>`);
        $("#files").append(ele);
        linkNum++;
    });
});