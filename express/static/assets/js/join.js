function joinCommunity(name, friendlyName) {
    const closeNotification = createNotification(`Joining Community ${friendlyName}!`, "We're attempting to add you to the community. Please don't refresh the page!");
    $.get(`/auth/join/${encodeURIComponent(name)}`).then(data => {
        closeNotification();
        if (data.ok) {
            createNotification("Success!", `You were successfully added to the community: ${friendlyName}`, 5000);
        } else {
            createNotification("An error occurred!", data.error, 5000);
        }
        $("#streamer").val("");
        $("#streamer").focus();
    }, err => {
        console.error(err);
        closeNotification();
        createNotification("An error occurred!", "Unknown error. Please check the console and report this!", 5000);
    });
}

$(function() {
    $(".join.tms").on("click", function() {
        joinCommunity("tms", "The Mod Squad");
        return false;
    });
    $(".join.tlms").on("click", function() {
        joinCommunity("tlms", "The Little Mod Squad");
        return false;
    });
    $(".join.cl").on("click", function() {
        joinCommunity("cl", "Community Lobbies");
        return false;
    });
});
