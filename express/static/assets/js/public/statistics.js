const COLORS = ["blue", "yellow", "red", "purple"];

$(function() {
    setInterval(() => {
        let curElem = $(".statistic.active");
        let nextElem = curElem.next();
        if (nextElem.length === 0) {
            nextElem = $($(".statistics .statistic")[0]);
        }

        curElem.addClass("out").removeClass("active");
        nextElem.show().addClass("active");

        COLORS.forEach(function(color) {
            $(".statistics").removeClass(color);
        });

        $(".statistics").addClass(nextElem.attr("data-color"));

        setTimeout(() => {
            curElem.hide();
            curElem.removeClass("out");
        }, 300);
    }, 3000);
});