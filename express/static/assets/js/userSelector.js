let updateTimeout = null;

const blankUser = `<div class="user ::type">
<img src="/assets/images/blank-profile.webp" alt="Blank profile picture">
<div class="info">
    <h3 class="username">Select a Profile</h3>
    Click to select a profile
</div>
</div>`;

function openUserSelector() {
    $(".user-selector .close").click();
    const selector = $(this).parent().parent();
    selector.find(".search-box").show();
    selector.find(".search-box-results").hide();
    selector.find(".user").hide();
    selector.find("input[type=search]").focus();
}

function closeUserSelector(selector) {
    if (updateTimeout) clearTimeout(updateTimeout);
    selector.find(".search-box").hide();
    selector.find(".user").show();
    selector.find("input[type=search]").val("");
    selector.find(".search-box-results").html("");
}

function updateUser(selector, user, type) {
    const element = $(parse.user[type](user));
    element.on("click", openUserSelector);
    selector.find(".user").replaceWith(element);
    selector.find("input[type=hidden]").val(user.id).trigger("change");
    closeUserSelector(selector);
}

function updateUserSelector(selector) {
    const input = selector.find("input[type=search]");
    const query = input.val();
    updateTimeout = null;

    if (query.length < 3) return;

    $.get(`/api/user/search/${encodeURIComponent(query)}?type=${selector.attr("data-type")}`).then(data => {
        if (!data.ok) {
            createNotification("An error occurred!", data.error, 5000);
            return;
        }
        const resultsDiv = selector.find(".search-box-results");
        resultsDiv.html("");
        data.data.twitchResults.forEach(result => {
            const element = $(parse.user.twitch(result));
            element.on("click", function() {
                updateUser(selector, result, "twitch");
            })
            resultsDiv.append(element);
        });
        data.data.discordResults.forEach(result => {
            const element = $(parse.user.discord(result));
            element.on("click", function() {
                updateUser(selector, result, "discord");
            })
            resultsDiv.append(element);
        });
        if (resultsDiv.html() === "") resultsDiv.html("<small>No results found!</small>");
        resultsDiv.show();
    }, err => {
        console.error(err);
        createNotification("An error occurred!", "Unknown error. Please check the console and report this!", 5000);
    });
}

function updateUserSelectorTimeout(e) {
    const selector = $(this).parent().parent().parent().parent();

    if (e?.keyCode === 27) {
        closeUserSelector(selector);
        return;
    }

    if (updateTimeout) clearTimeout(updateTimeout);

    updateTimeout = setTimeout(function() {
        updateUserSelector(selector);
    }, 3000);
}

function revertUserSelector(selector) {
    const element = $(blankUser.replace("::type", selector.attr("data-type")));
    element.on("click", openUserSelector);
    selector.find(".user").replaceWith(element);
    closeUserSelector(selector);
    selector.find("input[type=hidden]").val("none").trigger("change");
}

$(function() {
    $(".user-selector .user").on("click", openUserSelector);
    $(".user-selector .close").on("click", function() {
        closeUserSelector($(this).parent().parent().parent().parent());
        return false;
    });
    $(".user-selector .revert").on("click", function() {
        revertUserSelector($(this).parent().parent().parent().parent());
        return false;
    });
    $(".user-selector input[type=search]").on("keyup", updateUserSelectorTimeout);
    $(".user-selector .search-box").on("submit", function() {
        updateUserSelector($(this).parent().parent());
        return false;
    })
});
