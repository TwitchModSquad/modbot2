google.charts.load('current', {'packages':['corechart', 'bar', 'line']});

google.charts.setOnLoadCallback(drawChart);

let ws;

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
            ws.sendJson({type: "ready"})
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
    }
}
