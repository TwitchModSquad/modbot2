function showBan(id) {
    $.get(`/api/twitch/ban/${encodeURIComponent(id)}`, data => {
        if (data.ok) {
            const ban = data.data;
            $(".chatter img").attr("src", ban.chatter.profile_image_url);
            $(".chatter span").text(ban.chatter.display_name);

            $(".streamer img").attr("src", ban.streamer.profile_image_url);
            $(".streamer span").text(ban.streamer.login);

            if (ban.chatHistory.length > 0) {
                let chatHistory = "";
                ban.chatHistory.forEach(chat => {
                    chatHistory += `<div class="chat"><span style="color: ${chat.color ? chat.color : 'var(--secondary-text-color)'};">${chat.chatter.display_name}</span>: ${chat.message}</div>`;
                });
                $("#chat-history code").html(chatHistory);
                $("#chat-history").show();
            } else {
                $("#chat-history").hide();
            }

            if (ban.alsoBannedIn.length > 0) {
                let alsoBannedIn = "";
                ban.alsoBannedIn.forEach(aBan => {
                    alsoBannedIn += parse.user.twitch(aBan.streamer);
                    if (aBan.chatHistory.length > 0) {
                        let chatHistory = "";
                        aBan.chatHistory.forEach(chat => {
                            chatHistory += `<div class="chat"><span style="color: ${chat.color ? chat.color : 'var(--secondary-text-color)'};">${chat.chatter.display_name}</span>: ${chat.message}</div>`;
                        });
                        alsoBannedIn += `Chat History<code class="block">${chatHistory}</code>`;
                    }
                });
                $("#also-banned-in div").html(alsoBannedIn);
                $("#also-banned-in").show();
            } else {
                $("#also-banned-in").hide();
            }

            $(".ban-info").fadeIn(200);
        } else {
            createNotification("Request failed!", data.error, 5000)
        }
    }).fail(function() {
        createNotification("Request failed!", `Failed to retreive ban information for ID ${id}`, 5000)
    });
}

function startWebsocket(uri) {
    const ws = new WebSocket(uri);

    ws.onopen = function() {
        console.log("Opened websocket!");
    }

    ws.onmessage = function(msg) {
        console.log(msg);
    }
}
