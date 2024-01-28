google.charts.load('current', {'packages':['corechart', 'bar', 'line']});

google.charts.setOnLoadCallback(drawChart);

function getCookie(cname) {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

let ws;

let mostRecentFollow = null;

const mostActiveOptions = {
    chartArea: {
        width: '100%',
        height: '100%',
        backgroundColor: "transparent",
    },
    legend: {
        position: "bottom",
    },
    vAxis: {
        minValue: 0,
    },
    annotations: {
        textStyle: {
            color: "white",
        },
    },
    backgroundColor: "transparent",
    isStacked: true,
}

const hourlyStatsOptions = {
    chartArea: {
        width: '100%',
        height: '100%',
        backgroundColor: "transparent",
    },
    series: {
        0: {axis: "Messages"},
        1: {axis: "Punishments"},
    },
    axes: {
        y: {
            Messages: {label: "Messages"},
            Punshments: {label: "Punishments"},
        }
    },
    annotations: {
        textStyle: {
            color: "white",
        },
    },
    backgroundColor: "transparent",
}

function formatNumberSmall(num) {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    } else {
        return comma(num);
    }
}

function drawChart() {
    const mostActiveChart = new google.charts.Bar(document.getElementById('most-active-channels'));
    const hourlyStatsChart = new google.charts.Line(document.getElementById('hourly-stats'));

    ws = new WebSocket(WS_URI);

    ws.sendJson = function(msg) {
        ws.send(JSON.stringify(msg));
    }

    ws.onopen = function() {
        setTimeout(() => {
            ws.sendJson({type: "authenticate", session: getCookie("session")});
            ws.sendJson({type: "ready"});

            if (window.obsstudio) {
                ws.sendJson({
                    type: "addScope",
                    scope: ["scene","chat","follow","subscription"],
                });
            }
        }, 50);
    }

    ws.onmessage = function(e) {
        let json;
        try {
            json = JSON.parse(e.data);
        } catch(e) {
            console.error(e);
        }

        if (!json) return;

        if (json?.mostActiveChannels) {
            const data = google.visualization.arrayToDataTable(
                [
                    ["Channel", "Messages", "Bans", "Timeouts", {role: "annotation"}],
                    ...json.mostActiveChannels
                        .map(x => [x.channel, x.messages, x.bans, x.timeouts, ""])
                ]
            );
            mostActiveChart.draw(data, google.charts.Bar.convertOptions(mostActiveOptions));
        }

        if (json?.hourlyActivity) {
            json.hourlyActivity.forEach(activity => {
                activity[0] = new Date(activity[0]);
            });
            const data = google.visualization.arrayToDataTable(
                [
                    ["Hour", "Messages", "Bans", "Timeouts"],
                    ...json.hourlyActivity,
                ]
            );
            hourlyStatsChart.draw(data, google.charts.Line.convertOptions(hourlyStatsOptions));
        }

        if (json?.general) {
            $("#messages").text(formatNumberSmall(json.general.messages));
            $("#bans").text(formatNumberSmall(json.general.bans));
            $("#timeouts").text(formatNumberSmall(json.general.timeouts));
            $("#streamers").text(formatNumberSmall(json.general.streamers));
        }

        if (json?.memberStreams) {
            let htmlOutput = "";
            json.memberStreams.forEach(function (a) {
                htmlOutput += `<div class="stream"><img src="${a.user.profile_image_url}"><div class="content"><h3>${a.title}</h3><span>${a.game.name.replace(" ", "&nbsp;")}</span> &bullet; <span>!s&nbsp;${a.user.login}</span> &bullet; <span>${comma(a.viewers)}&nbsp;viewer${a.viewers === 1 ? "" : "s"}</span></div></div>`;
            });
            $("#member-streams").html(htmlOutput);
            $("#live-member-count").text(comma(json.memberStreams.length));
        }

        if (json?.recentFollowers && json.recentFollowers.length > 0) {
            if (json.recentFollowers[0].user.id !== mostRecentFollow?.id) {
                mostRecentFollow = json.recentFollowers[0].user;

                let htmlOutput = "";
                json.recentFollowers.forEach(function(f) {
                    htmlOutput += `<div class="small-user"><div><img src="${f.user.profile_image_url}"> ${f.user.display_name}</div><div class="relative-time" data-timestamp="${new Date(f.date).toString()}"></div></div>`;
                });
                $("#follows").html(htmlOutput);
            }
        }

        if (json?.recentSubscriptions && json.recentSubscriptions.length > 0) {
            let htmlOutput = "";
            json.recentSubscriptions.forEach(function (s) {
                htmlOutput += `<div class="small-user"><div><img src="${s.user.profile_image_url}"> ${s.user.display_name}</div><div class="tier">Tier ${s.tier}</div></div>`;
            });
            $("#subscriptions").html(htmlOutput);
        }

        if (window.obsstudio) {
            if (json?.changeScene) {
                window.obsstudio.setCurrentScene(json.changeScene);
            }

            if (json?.message) {
                console.log(json.message);
            }
        }
    }
}
