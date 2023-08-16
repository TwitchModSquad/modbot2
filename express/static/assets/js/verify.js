$(function() {

    $("form.verify").on("submit", function() {
        $.get(`/auth/verify/${encodeURIComponent($("#streamer").val())}`).then(data => {
            if (data.ok) {
                console.log(data)
                alert("OK!");
            } else {
                alert(data.error);
            }
        }, console.error);
        return false;
    });

});