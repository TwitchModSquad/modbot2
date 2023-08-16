function comma(num) {
    if (!num) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function createNotification(heading, description, expireIn) {
    let notif = $(`<section class="notification" style="display: none;"><h2>${heading}</h2>${description}</section>`);
    $(".notifications").append(notif);
    notif.slideDown(300);

    let active = true;
    function close() {
        if (active) {
            active = false;
            notif.slideUp(300);
            setTimeout(() => {
                notif.remove();
            }, 300);
        }
    }

    if (expireIn)
        setTimeout(close, expireIn);
    
    return close;
}

const parse = {
    user: {
        twitch: function(user) {
            return `<div class="user twitch">
                <img src="${user.profile_image_url}" alt="Profile picture for ${user.display_name}">
                <div class="info">
                    <h3 class="username">${user.display_name}${user.broadcaster_type === "partner" ? ` <img src="/assets/images/badges/twitch/partner.png" alt="Partner badge">` : ""}</h3>
                    <div class="data">
                        <span class="id">${user.id}</span>
                        ${user.follower_count ? `
                        &bullet;
                        <span class="followers">${comma(user.follower_count)} follower${user.follower_count === 1 ? "" : "s"}</span>
                        ` : ""}
                    </div>
                </div>
            </div>`;
        }
    }
}