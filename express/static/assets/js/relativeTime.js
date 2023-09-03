function calculateRelativeTime(timestamp) {
    const timeSince = Math.floor((Date.now() - timestamp)/1000);
    if (timeSince > 2628000) {
        const time = Math.floor(timeSince / 2628000);
        return `${time} month${time === 1 ? "" : "s"} ago`;
    } else if (timeSince > 86400) {
        const time = Math.floor(timeSince / 86400);
        return `${time} day${time === 1 ? "" : "s"} ago`;
    } else if (timeSince > 3600) {
        const time = Math.floor(timeSince / 3600);
        return `${time} hour${time === 1 ? "" : "s"} ago`;
    } else if (timeSince > 60) {
        const time = Math.floor(timeSince / 60);
        return `${time} minute${time === 1 ? "" : "s"} ago`;
    } else {
        return `${timeSince} second${timeSince === 1 ? "" : "s"} ago`;
    }
}

function refreshRelativeTime() {
    $(".relative-time").each(function() {
        const ele = $(this);
        const relative = calculateRelativeTime(new Date(ele.attr("data-timestamp")).getTime());
        ele.text(relative);
    });
}

$(function() {
    setInterval(refreshRelativeTime, 1000);
    refreshRelativeTime();
})