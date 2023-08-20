$(function() {
    const streamer = $("input[name=streamer]").val();
    const chatter = $("input[name=chatter]").val();

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

    $(".chat-user").on("click", function() {
        const ele = $(this);
        $(`input[name=${ele.attr("data-type")}]`).val(ele.attr("data-id")).trigger("change");
        return false;
    });
})