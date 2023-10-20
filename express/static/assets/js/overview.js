google.charts.load('current', {'packages':['corechart', 'bar', 'line']});

google.charts.setOnLoadCallback(drawChart);

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

function startGame(data) {
    $("body").addClass("game-active");
    $(`.game`).addClass("game-fade");
    setTimeout(function() {
        $(".game-fade").hide();
        $(".game-fade").removeClass("game-fade");
    }, 200);
    game = data.startGame;
    if (data.gameType === "wos") {
        $(".game-wos").show();
        $(".game-wos").removeClass("game-fade");
    } else if (data.gameType === "sudoku") {
        startSudoku();
        $(".game-sudoku").show().removeClass("game-fade");
    }
}

function resumeGame(newGame) {
    if (game) return;
    game = newGame;

    if (game.gameType === "wos") {
        $(".game-wos").addClass("game-fade");
        $(".game-wos").show();
        $(".game-wos").removeClass("game-fade");
    } else if (game.gameType === "sudoku") {
        drawSudoku();
        $(".game-sudoku").addClass("game-fade");
        $(".game-sudoku").show();
        $(".game-sudoku").removeClass("game-fade");
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

            if (games) {
                ws.send(JSON.stringify({
                    type: "addScope",
                    scope: ["game"],
                }));
            }
        }, 100);
    }

    ws.onclose = function() {
        setTimeout(() => {
            drawChart();
        }, 1000);
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

        if (json?.startGame) {
            startGame(json.startGame);
        }

        if (json?.resumeGame) {
            resumeGame(json.resumeGame);
        }

        if (json?.endGame) {
            $(".game").addClass("game-fade")
            setTimeout(() => {
                $(".game").hide();
                $(".game").removeClass("game-fade");
            }, 200);
        }

        if (json?.sudokuAnswer) {
            processGuessSudoku(json.sudokuAnswer);
        }

        if (json?.remainingSudoku) {
            let remainingHtml = "";
            json.remainingSudoku.forEach((r, i) => {
                remainingHtml += `<div${r === 0 ? ` style="opacity: 0;"` : ""}><div class="number">${i+1}</div><div class="remaining">${r}</div></div>`
            });
            $(".remaining-sudoku").html(remainingHtml);
        }

        if (json?.leaderboardUpdate) {
            let leaderboardString = "";
            json.leaderboardUpdate.forEach(rec => {
                leaderboardString += `<tr><td><div class="small-user"><img src="${rec.user.profile_image_url}" /> ${rec.user.display_name}</div></td><td>${rec.score}</td></tr>`;
            });
            $(".leaderboard tbody").html(leaderboardString);
        }

        if (json.hasOwnProperty("botListening")) {
            if (json.botListening) {
                $(".bot-not-listening").fadeOut(200);
            } else {
                $(".bot-not-listening").fadeIn(200);
            }
        }
    }
}
