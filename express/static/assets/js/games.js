games = true;

let game = null;

function startSudoku() {
    drawSudoku();
}

function drawSudoku() {
    if (!game.sudoku.board) return;

    game.sudoku.board.forEach((num, i) => {
        if (num === null) return;
        $("#s-" + i).html(`<span class="solved">${num}</span>`);
    });
}

let processing = [];
function processGuessSudoku(guess) {
    if (processing.includes(guess.position)) return;
    processing.push(guess.position);
    const ele = $("#s-" + guess.position);
    const prevSpan = ele.find("span");
    const guessSpan = $(`<span class="guess" style="display:none;"><span class="user">${guess.user.display_name}</span><span class="number">${guess.guess}</span></span>`)
    ele.append(guessSpan);

    prevSpan.fadeOut(200);
    guessSpan.fadeIn(200);

    setTimeout(() => {
        if (guess.result === "correct") {
            guessSpan.addClass("right");
        } else {
            guessSpan.addClass("wrong");
        }
        setTimeout(() => {
            if (guess.result === "correct") {
                prevSpan.text(guess.guess);
                prevSpan.removeClass("unsolved");
                prevSpan.addClass("solved");
            }

            guessSpan.css("opacity", 0);
            prevSpan.fadeIn(200);

            setTimeout(() => {
                processing = processing.filter(x => x !== guess.position);
                guessSpan.remove();
            }, 200);
        }, 4000);
    }, 1000);
}
