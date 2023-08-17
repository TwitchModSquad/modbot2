$(function() {
    $("#menu").on("click", function() {
        $("body").toggleClass("sidebar-collapse");
        return false;
    });

    if ($("body").width() <= 600) {
        $("body").addClass("sidebar-collapse");
    }
})
