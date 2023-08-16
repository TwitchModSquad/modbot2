$(function() {

    $("form.add-user").on("submit", function() {
        const streamer = $("#streamer").val().toLowerCase();
        const closeNotification = createNotification(`Verifying moderator status in channel #${streamer}...`,`Please wait! This may take a couple seconds to retrieve.`);
        $.get(`/auth/verify/${encodeURIComponent(streamer)}`).then(data => {
            closeNotification();
            if (data.ok) {
                createNotification("Streamer added!", `You were verified as a moderator in the channel #${streamer}!`, 5000);
                $(".streamers").append(`<label class="user-selector"><input type="hidden" name="users[]" value="${data.streamer.id}"><input type="checkbox" name="listen-${data.streamer.id}"${data.streamer.chat_listen ? ` checked="checked"` : ""}>${parse.user.twitch(data.streamer)}</label>`);
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
        return false;
    });

});