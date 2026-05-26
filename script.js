document.addEventListener("DOMContentLoaded", () => {

    if (!localStorage.getItem("highScore")) {
        localStorage.setItem("highScore", 0);
    }

    console.log("%c Welcome to Hoppibara", "font-size: 55px; color: #6b4001; font-weight: bold;");
    console.log("%c A revival of Goodgis's original game. Remake by SOUNDGOD. Art by Pig55.", "font-size: 16px;");

    const appCanvas = document.getElementById("app");

    kaboom({
        canvas: appCanvas,
        background: [251, 210, 149],
        width: window.innerWidth,
        height: window.innerHeight,
        crisp: true,
    });

    loadSprite("capybara",  "./assets/images/capybara.png");
    loadSprite("capybara2", "./assets/images/capybara2.png");
    loadSprite("hazard1",   "./assets/images/hazards/hazard1.png");
    loadSprite("hazard2",   "./assets/images/hazards/hazard2.png");
    loadSprite("hazard3",   "./assets/images/hazards/hazard3.png");
    loadSprite("hazard4",   "./assets/images/hazards/hazard4.png");
    loadSprite("tileSprite","./assets/images/tile.png");
    loadSprite("leftIcon",  "./assets/images/icons/left.png");
    loadSprite("rightIcon", "./assets/images/icons/right.png");
    loadSprite("actionIcon","./assets/images/icons/jump.png");
    loadSprite("Lime",      "./assets/images/menu/Lime.png");
    loadSprite("CapyBaraM", "./assets/images/menu/capybara.png");
    loadSprite("hoppibara", "./assets/images/menu/hoppibara.png");
    loadSprite("hoppibara2","./assets/images/menu/hoppibara1.png");
    loadSprite("playIcon",  "./assets/images/menu/playIcon.png");
    loadSound("jump",       "./assets/audio/jump.mp3");
    loadSound("gameOver",   "./assets/audio/loss.mp3");
    loadSound("background", "./assets/audio/background.mp3");
    loadFont("baifont",     "./assets/fonts/bai.ttf");

    let gamepad = null;
    let isGamePaused = false;
    let bgMusic = null;

    function stopMusic() {
        if (bgMusic) { bgMusic.stop(); bgMusic = null; }
    }

    function startMusic() {
        if (!bgMusic) {
            bgMusic = play("background", { volume: 0.05, loop: true });
        }
    }

    onGamepadConnect(gp    => { gamepad = gp; });
    onGamepadDisconnect(() => { gamepad = null; });

    scene("changeDeviceOri", () => {
        add([
            text("Please rotate your device or use a tablet/computer", { font: "baifont", width: width() * 0.8 }),
            scale(0.35),
            pos(width() / 2, height() / 2),
            anchor("center"),
            color(80, 40, 0),
        ]);
    });

    scene("gameover", (score) => {
        stopMusic();

        add([
            text("Game Over", { font: "baifont" }),
            scale(2.4),
            pos(width() / 2, height() / 2 - 230),
            anchor("center"),
            color(80, 40, 0),
        ]);

        const W = 440, H = 220, BORDER = 10;
        const bColor = rgb(107, 64, 1);
        const fColor = rgb(179, 120, 33);

        add([rect(W + BORDER * 2, H + BORDER * 2), pos(width() / 2, height() / 2), anchor("center"), color(bColor)]);
        add([rect(W, H), pos(width() / 2, height() / 2), anchor("center"), color(fColor)]);

        add([
            text(`Your Score: ${score}`, { font: "baifont" }),
            scale(1.2),
            pos(width() / 2, height() / 2 - 30),
            anchor("center"),
            color(255, 255, 255),
        ]);

        add([
            text(`Best Score: ${localStorage.getItem("highScore")}`, { font: "baifont" }),
            scale(1.2),
            pos(width() / 2, height() / 2 + 30),
            anchor("center"),
            color(255, 255, 255),
        ]);

        loadSprite("retryIcon", "./assets/images/icons/retry.png");

        const retryBtn = add([
            rect(90, 90),
            outline(7),
            pos(width() / 2, height() / 2 + 190),
            anchor("center"),
            color(fColor),
            z(10),
            area(),
        ]);
        add([sprite("retryIcon"), pos(width() / 2, height() / 2 + 190), anchor("center"), z(20)]);

        retryBtn.onClick(() => go("gameplay", true));

        onUpdate(() => {
            if (gamepad && gamepad.isPressed("south")) go("gameplay", true);
        });
    });

    scene("gameplay", (isRestart) => {
        isGamePaused = false;

        if (!isRestart) startMusic();

        setGravity(2800);

        const FLOOR_H    = 220;
        const JUMP_STR   = 1400;
        const MOVE_SPD   = 750;
        const SCROLL_SPD = 580;
        const HAZARD_SPD = 560;

        let gameOver     = false;
        let currentSpr   = "capybara";
        let walkTimer    = null;
        let isRotating   = false;
        let rotation     = 0;

        function switchSprite() {
            currentSpr = currentSpr === "capybara" ? "capybara2" : "capybara";
            player.use(sprite(currentSpr));
        }

        function startWalkAnim() {
            if (!walkTimer) walkTimer = setInterval(switchSprite, 120);
        }

        function stopWalkAnim() {
            if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
            player.use(sprite("capybara"));
            currentSpr = "capybara";
        }

        const player = add([
            sprite("capybara"),
            pos(120, 100),
            anchor("center"),
            area({ scale: vec2(0.65) }),
            body(),
            z(5),
        ]);

        const floorSegs = [];

        function makeFloor(xPos) {
            const seg = add([
                rect(width() + 4, FLOOR_H),
                pos(xPos, height() - FLOOR_H),
                color(255, 255, 255),
                area(),
                body({ isStatic: true }),
                z(3),
            ]);
            add([
                rect(width() + 4, 5),
                pos(xPos, height() - FLOOR_H - 5),
                color(40, 20, 0),
                z(4),
                {
                    update() { this.pos.x = seg.pos.x; }
                }
            ]);
            return seg;
        }

        floorSegs.push(makeFloor(0));
        floorSegs.push(makeFloor(width()));

        onUpdate(() => {
            if (isGamePaused || gameOver) return;

            floorSegs.forEach((seg, i) => {
                seg.pos.x -= SCROLL_SPD * dt();
                if (seg.pos.x + width() < 0) {
                    const other = floorSegs[(i + 1) % 2];
                    seg.pos.x = other.pos.x + width();
                }
            });

            if (isRotating) {
                player.angle += 11;
                rotation += 11;
                if (rotation >= 360) {
                    player.angle = 0;
                    isRotating = false;
                }
            }

            if (player.isGrounded() && walkTimer && !isKeyDown("left") && !isKeyDown("right")) {
                stopWalkAnim();
            }

            if (gamepad) {
                const stick = gamepad.getStick("left");
                if (gamepad.isPressed("south")) jump();
                if (Math.abs(stick.x) > 0.15) {
                    const nx = player.pos.x + stick.x * MOVE_SPD * dt();
                    if (nx >= 0 && nx <= width()) {
                        player.move(stick.x * MOVE_SPD, 0);
                        startWalkAnim();
                    }
                } else {
                    if (!isKeyDown("left") && !isKeyDown("right")) stopWalkAnim();
                }
            }
        });

        function jump() {
            if (player.isGrounded()) {
                play("jump", { volume: 0.6 });
                player.jump(JUMP_STR);
                isRotating = true;
                rotation = 0;
                startWalkAnim();
            }
        }

        onKeyDown("space", jump);
        onKeyDown("up",    jump);

        onKeyDown("left", () => {
            if (player.pos.x > 0) {
                player.move(-MOVE_SPD, 0);
                startWalkAnim();
            }
        });

        onKeyDown("right", () => {
            if (player.pos.x < width()) {
                player.move(MOVE_SPD, 0);
                startWalkAnim();
            }
        });

        onKeyRelease("left",  stopWalkAnim);
        onKeyRelease("right", stopWalkAnim);

        let score = 0;
        const scoreLabel = add([
            text("0", { font: "baifont" }),
            scale(1.8),
            pos(width() / 2, 70),
            anchor("center"),
            color(40, 20, 0),
            z(10),
        ]);

        const scoreTick = setInterval(() => {
            if (gameOver || isGamePaused) return;
            score++;
            scoreLabel.text = score;
            const hi = parseInt(localStorage.getItem("highScore") || "0");
            if (score > hi) localStorage.setItem("highScore", score);
        }, 300);

        function spawnHazard() {
            if (gameOver) return;
            add([
                sprite("hazard" + (Math.floor(Math.random() * 4) + 1)),
                area({ scale: vec2(0.55) }),
                pos(width() + 10, height() - FLOOR_H),
                anchor("botleft"),
                move(LEFT, HAZARD_SPD),
                offscreen({ destroy: true }),
                z(5),
                "hazard",
            ]);
            wait(rand(1.1, 2.6), spawnHazard);
        }

        spawnHazard();

        player.onCollide("hazard", () => {
            if (gameOver) return;
            gameOver = true;
            clearInterval(scoreTick);
            play("gameOver", { volume: 0.3 });
            stopMusic();
            wait(0.4, () => go("gameover", score));
        });

        let pauseObjs = [];

        onKeyPress("p", () => {
            if (isGamePaused) {
                isGamePaused = false;
                pauseObjs.forEach(o => destroy(o));
                pauseObjs = [];
            } else {
                isGamePaused = true;
                const bColor = rgb(107, 64, 1);
                const fColor = rgb(179, 120, 33);
                pauseObjs.push(
                    add([rect(width(), height()), pos(0, 0), color(0, 0, 0), opacity(0.45), z(50)]),
                    add([rect(460, 230), pos(width() / 2, height() / 2), anchor("center"), color(bColor), z(51)]),
                    add([rect(440, 210), pos(width() / 2, height() / 2), anchor("center"), color(fColor), z(52)]),
                    add([text("Paused", { font: "baifont" }), scale(2.2), pos(width() / 2, height() / 2 - 30), anchor("center"), color(255, 255, 255), z(53)]),
                    add([text("Press P to resume", { font: "baifont" }), scale(0.9), pos(width() / 2, height() / 2 + 60), anchor("center"), color(255, 255, 220), z(53)])
                );
            }
        });

        if (WURFL.is_mobile) {
            const btnOpts = (x, y, spr) => [
                sprite(spr),
                pos(x, y),
                anchor("center"),
                area(),
                z(99),
                opacity(0.55),
            ];

            const lBtn = add(btnOpts(80,  height() - 110, "leftIcon"));
            const rBtn = add([sprite("leftIcon"), pos(250, height() - 110), anchor("center"), area(), z(99), opacity(0.55)]);
            rBtn.angle = 180;
            const jBtn = add(btnOpts(width() - 140, height() - 110, "actionIcon"));

            let lHeld = false, rHeld = false;

            appCanvas.addEventListener("touchstart", e => {
                [...e.touches].forEach(t => {
                    const p = vec2(t.clientX, t.clientY);
                    if (lBtn.hasPoint(p)) { lHeld = true; lBtn.opacity = 1; }
                    if (rBtn.hasPoint(p)) { rHeld = true; rBtn.opacity = 1; }
                    if (jBtn.hasPoint(p)) { jump(); jBtn.opacity = 1; }
                });
            }, { passive: true });

            appCanvas.addEventListener("touchend", e => {
                [...e.changedTouches].forEach(t => {
                    const p = vec2(t.clientX, t.clientY);
                    if (lBtn.hasPoint(p)) { lHeld = false; lBtn.opacity = 0.55; }
                    if (rBtn.hasPoint(p)) { rHeld = false; rBtn.opacity = 0.55; }
                    if (jBtn.hasPoint(p)) { jBtn.opacity = 0.55; }
                });
            }, { passive: true });

            onUpdate(() => {
                if (isGamePaused || gameOver) return;
                if (lHeld && player.pos.x > 0)      { player.move(-MOVE_SPD, 0); startWalkAnim(); }
                if (rHeld && player.pos.x < width()) { player.move(MOVE_SPD,  0); startWalkAnim(); }
                if (!lHeld && !rHeld) stopWalkAnim();
            });
        }
    });

    scene("menu", () => {
        startMusic();

        const mobile = WURFL.is_mobile;
        const btnX   = mobile ? width() - 300 : width() - 620;
        const btnY   = height() / 2 + 50;

        add([
            sprite("CapyBaraM"),
            scale(0.8),
            pos(-50, height() / 2 + 170),
            anchor("center"),
            { update() { this.angle = 8 + Math.sin(time() * 1.5) * 2; } }
        ]);

        add([sprite("Lime"), pos(350, height() / 2 - 180), anchor("center")]);

        add([
            sprite(mobile ? "hoppibara" : "hoppibara2"),
            pos(mobile ? width() - 300 : width() - 650, height() / 2 - (mobile ? 200 : 330)),
            anchor("center"),
        ]);

        const playBtn = add([
            rect(mobile ? 65 : 80, mobile ? 65 : 80),
            pos(btnX, btnY),
            anchor("center"),
            color(179, 120, 33),
            outline(6),
            z(10),
            area(),
        ]);
        add([sprite("playIcon"), pos(btnX, btnY), anchor("center"), z(11)]);

        add([
            text(`High Score: ${localStorage.getItem("highScore")}`, { font: "baifont" }),
            pos(btnX, btnY + 200),
            scale(1.3),
            anchor("center"),
            color(80, 40, 0),
            z(11),
        ]);

        playBtn.onHover(() => { playBtn.color = rgb(210, 145, 50); });
        playBtn.onHoverEnd(() => { playBtn.color = rgb(179, 120, 33); });
        playBtn.onClick(() => go("gameplay", false));

        onKeyPress("space", () => go("gameplay", false));

        onUpdate(() => {
            if (gamepad && gamepad.isPressed("south")) go("gameplay", false);
        });
    });

    if (WURFL.is_mobile && window.innerWidth <= 550) {
        go("changeDeviceOri");
    } else {
        go("menu");
    }
});
