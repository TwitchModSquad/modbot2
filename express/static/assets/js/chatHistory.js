const ENDLESS_LOAD_AT = 1500;

$(function() {
    const streamer = $("input[name=streamer]").val();
    const chatter = $("input[name=chatter]").val();

    function parseMessage(message) {
        const msg = $("<tr></tr>");
        if (streamer === "none") {
            const strElement = $('<td class="channel chat-user" data-type="streamer"></td>')
            strElement.attr("data-id", message.streamer.id);
            strElement.text("#" + message.streamer.login);
            msg.append(strElement);
        }
    
        const date = $('<td class="date"></td>');
        date.text(message.prettyTimeSent);
        msg.append(date);
    
        const msgElem = $('<td class="message"></td>');
        msgElem.text(": " + message.message)
        const chatterLink = $('<a href="#" class="chat-user" data-type="chatter"></a>');
        chatterLink.attr("data-id", message.chatter.id);
        message.badgeUrls.forEach(badge => {
            chatterLink.append(`<img src="${badge.url}" alt="${badge.name}" title="${badge.name}">`);
        });
        const badges = chatterLink.find("img").detach();
        chatterLink.append(badges);
        badges.after(" ");
        const chatterSpan = $("<span></span>");
        chatterSpan.css("color", message.color);
        chatterSpan.text(message.chatter.display_name);
        chatterLink.append(chatterSpan);
        msgElem.prepend(chatterLink);
        msg.append(msgElem);
        wrapNameClicks(msg);
        return msg;
    }

    $("input[name]").on("change", function() {
        const newStreamer = $("input[name=streamer]").val();
        const newChatter = $("input[name=chatter]").val();

        if (streamer === newStreamer && newChatter === chatter) return;

        let queryString = `?streamer=${encodeURIComponent(newStreamer)}&chatter=${encodeURIComponent(newChatter)}`;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("before")) queryString += `&before=${encodeURIComponent(urlParams.get("before"))}`;
        if (urlParams.has("after")) queryString += `&after=${encodeURIComponent(urlParams.get("after"))}`;
        if (urlParams.has("page")) queryString += `&page=${encodeURIComponent(urlParams.get("page"))}`;

        window.location.href = window.location.pathname + queryString;
    });

    function wrapNameClicks(ele) {
        ele.find(".chat-user").on("click", function() {
            const ele = $(this);
            $(`input[name=${ele.attr("data-type")}]`).val(ele.attr("data-id")).trigger("change");
            return false;
        });
    }

    wrapNameClicks($("body"));

    // Endless scroll
    let loading = false;
    window.onscroll = function() {
        // do not continue if there is no last timestamp or if we are already loading
        if (loading) return;
        if (!lastTimestamp) return;

        if ($(document).height() - $(window).height() - $(window).scrollTop() <= ENDLESS_LOAD_AT) {
            loading = true;

            $.get(`/api/twitch/chat?before=${lastTimestamp}&streamer=${streamer === "none" ? "all" : streamer}&chatter=${chatter === "none" ? "all" : chatter}&limit=200`, function(data) {
                if (data.ok) {
                    const messages = data.data;
                    const chatbox = $(".chat tbody");
                    messages.forEach(message => {
                        const msg = parseMessage(message);
                        chatbox.append(msg);
                    })
                    lastTimestamp = data.cursor;
                    loading = false;
                } else {
                    createNotification("Error Loading Chats!", data.error, 5000);
                }
            });
        }
    }

    window.onbeforeunload = function() {
        $(window).scrollTop(0);
    }
})
