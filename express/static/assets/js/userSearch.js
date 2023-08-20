$(function() {
    $("input[name=user]").on("change", function() {
        const id = $("input[name=user]").val();
        if (id === "none") {
            $(".large-user-container").fadeOut(200);
        } else {
            window.location.href = "/panel/user/" + id;
        }
    });

    $(".history-popup").on("click", function() {
        const ele = $(this);

        const streamer = ele.attr("data-streamer");
        const chatter = ele.attr("data-chatter");
        const before = ele.attr("data-before");
        const after = ele.attr("data-after");

        window.open(`/panel/chat-history/popup?streamer=${streamer}&chatter=${chatter}&before=${before}&after=${after}`, "Chat History", "width=600,height=400,titlebar=no");

        return false;
    });
});
