document.addEventListener("DOMContentLoaded", () => {

    if (!localStorage.getItem("highScore")) {
        localStorage.setItem("highScore", 0);
    }

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
    loadSprite("leftIcon",  "./assets/images/icons/left.png");
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

    let gamepad     = null;
    let isGamePaused = false;
    let bgMusic     = null;

    function stopMusic()  { if (bgMusic) { bgMusic.stop(); bgMusic = null; } }
    function startMusic() { if (!bgMusic) bgMusic = play("background", { volume: 0.05, loop: true }); }

    onGamepadConnect(gp    => { gamepad = gp; });
    onGamepadDisconnect(() => { gamepad = null; });

    // ─── CHANGE ORIENTATION ───────────────────────────────────────────────────
    scene("changeDeviceOri", () => {
        add([
            text("Please rotate your device or use a tablet/computer", { font: "baifont", width: width() * 0.8 }),
            scale(0.35),
            pos(width() / 2, height() / 2),
            anchor("center"),
            color(80, 40, 0),
        ]);
    });

    // ─── GAME OVER ────────────────────────────────────────────────────────────
    scene("gameover", (score) => {
        stopMusic();

        // dim background
        add([rect(width(), height()), pos(0,0), color(0,0,0), opacity(0.5), z(0)]);

        // panel
        const cx = width() / 2;
        const cy = height() / 2;
        const bColor = rgb(107, 64, 1);
        const fColor = rgb(179, 120, 33);
        add([rect(480, 380), pos(cx, cy), anchor("center"), color(bColor), z(1)]);
        add([rect(460, 360), pos(cx, cy), anchor("center"), color(fColor), z(2)]);

        add([
            text("Game Over", { font: "baifont" }),
            scale(2.0),
            pos(cx, cy - 130),
            anchor("center"),
            color(255, 255, 255),
            z(3),
        ]);

        add([
            text(`Score: ${score}`, { font: "baifont" }),
            scale(1.3),
            pos(cx, cy - 30),
            anchor("center"),
            color(255, 255, 255),
            z(3),
        ]);

        add([
            text(`Best: ${localStorage.getItem("highScore")}`, { font: "baifont" }),
            scale(1.3),
            pos(cx, cy + 40),
            anchor("center"),
            color(255, 255, 220),
            z(3),
        ]);

        // retry button
        loadSprite("retryIcon", "./assets/images/icons/retry.png");
        const retryBtn = add([
            rect(100, 100),
            outline(7),
            pos(cx, cy + 140),
            anchor("center"),
            color(bColor),
            z(3),
            area(),
        ]);
        add([sprite("retryIcon"), pos(cx, cy + 140), anchor("center"), z(4)]);

        retryBtn.onHover(()    => { retryBtn.color = rgb(140, 85, 5); });
        retryBtn.onHoverEnd(() => { retryBtn.color = bColor; });
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

        let gameOver   = false;
        let currentSpr = "capybara";
        let walkTimer  = null;
        let isRotating = false;
        let rotation   = 0;

        function switchSprite() {
            currentSpr = currentSpr === "capybara" ? "capybara2" : "capybara";
            player.use(sprite(currentSpr));
        }
        function startWalkAnim() { if (!walkTimer) walkTimer = setInterval(switchSprite, 120); }
        function stopWalkAnim()  {
            if (walkTimer) { clearInterval(walkTimer); walkTimer = null; }
            player.use(sprite("capybara"));
            currentSpr = "capybara";
        }

        const player = add([
            sprite("capybara"),
            pos(120, height() - FLOOR_H - 60),
            anchor("center"),
            area({ offset: vec2(0, 0), scale: vec2(0.7, 0.8) }),
            body(),
            z(5),
        ]);
        // ── Floor ──
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
            // top border line that follows the segment
            const border = add([
                rect(width() + 4, 5),
                pos(xPos, height() - FLOOR_H - 5),
                color(40, 20, 0),
                z(4),
            ]);
            seg.onUpdate(() => { border.pos.x = seg.pos.x; });
            return seg;
        }
        floorSegs.push(makeFloor(0));
        floorSegs.push(makeFloor(width()));

        let score = 0;
        const scoreLabel = add([
            text("0", { font: "baifont" }),
            scale(1.8),
            pos(width() / 2, 60),
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

        const pauseBtn = add([
            rect(70, 50),
            pos(width() - 20, 20),
            anchor("topright"),
            color(107, 64, 1),
            outline(4),
            z(20),
            area(),
            opacity(0.85),
        ]);
        add([
            text("II", { font: "baifont" }),
            pos(width() - 55, 45),
            anchor("center"),
            color(255, 255, 255),
            z(21),
        ]);

        let pauseObjs = [];

        function togglePause() {
            if (gameOver) return;
            if (isGamePaused) {
                isGamePaused = false;
                pauseObjs.forEach(o => destroy(o));
                pauseObjs = [];
            } else {
                isGamePaused = true;
                const bColor = rgb(107, 64, 1);
                const fColor = rgb(179, 120, 33);
                pauseObjs.push(
                    add([rect(width(), height()), pos(0,0), color(0,0,0), opacity(0.45), z(50)]),
                    add([rect(460, 260), pos(width()/2, height()/2), anchor("center"), color(bColor), z(51)]),
                    add([rect(440, 240), pos(width()/2, height()/2), anchor("center"), color(fColor), z(52)]),
                    add([text("Paused",           { font: "baifont" }), scale(2.0), pos(width()/2, height()/2 - 50), anchor("center"), color(255,255,255), z(53)]),
                    add([text("Press P to resume",{ font: "baifont" }), scale(0.85), pos(width()/2, height()/2 + 50), anchor("center"), color(255,255,220), z(53)])
                );
            }
        }

        pauseBtn.onClick(togglePause);
        onKeyPress("p", togglePause);

        function spawnHazard() {
            if (gameOver) return;
            add([
                sprite("hazard" + (Math.floor(Math.random() * 4) + 1)),
                area({ offset: vec2(0, -10), scale: vec2(0.72, 0.78) }),
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
            wait(0.35, () => go("gameover", score));
        });

        // ── Jump ──
        function jump() {
            if (player.isGrounded()) {
                play("jump", { volume: 0.6 });
                player.jump(JUMP_STR);
                isRotating = true;
                rotation   = 0;
                startWalkAnim();
            }
        }

        onKeyDown("space", jump);
        onKeyDown("up",    jump);

        onKeyDown("left", () => {
            if (player.pos.x > 0) { player.move(-MOVE_SPD, 0); startWalkAnim(); }
        });
        onKeyDown("right", () => {
            if (player.pos.x < width()) { player.move(MOVE_SPD, 0); startWalkAnim(); }
        });
        onKeyRelease("left",  stopWalkAnim);
        onKeyRelease("right", stopWalkAnim);

        onUpdate(() => {
            if (isGamePaused || gameOver) return;

            // scroll floor
            floorSegs.forEach((seg, i) => {
                seg.pos.x -= SCROLL_SPD * dt();
                if (seg.pos.x + width() < 0) {
                    const other = floorSegs[(i + 1) % 2];
                    seg.pos.x = other.pos.x + width();
                }
            });

            // spin on jump
            if (isRotating) {
                player.angle += 11;
                rotation += 11;
                if (rotation >= 360) { player.angle = 0; isRotating = false; }
            }

            if (player.isGrounded() && walkTimer && !isKeyDown("left") && !isKeyDown("right")) {
                stopWalkAnim();
            }

            if (gamepad) {
                const stick = gamepad.getStick("left");
                if (gamepad.isPressed("south")) jump();
                if (Math.abs(stick.x) > 0.15) {
                    const nx = player.pos.x + stick.x * MOVE_SPD * dt();
                    if (nx >= 0 && nx <= width()) { player.move(stick.x * MOVE_SPD, 0); startWalkAnim(); }
                } else {
                    if (!isKeyDown("left") && !isKeyDown("right")) stopWalkAnim();
                }
            }
        });

        if (WURFL.is_mobile) {
            const lBtn = add([sprite("leftIcon"),  pos(80,           height()-110), anchor("center"), area(), z(99), opacity(0.55)]);
            const rBtn = add([sprite("leftIcon"),  pos(250,          height()-110), anchor("center"), area(), z(99), opacity(0.55)]);
            const jBtn = add([sprite("actionIcon"),pos(width()-140,  height()-110), anchor("center"), area(), z(99), opacity(0.55)]);
            rBtn.angle = 180;

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
                if (rHeld && player.pos.x < width()) { player.move( MOVE_SPD, 0); startWalkAnim(); }
                if (!lHeld && !rHeld && !isKeyDown("left") && !isKeyDown("right")) stopWalkAnim();
            });
        }
    });

    scene("menu", () => {
        startMusic();

        const mobile = WURFL.is_mobile;
        const sw = width();
        const sh = height();

        const capyScale = Math.min(sw / 1400, sh / 800) * 0.9;

        const capy = add([
            sprite("CapyBaraM"),
            scale(capyScale),
            pos(sw * 0.18, sh * 0.72),
            anchor("center"),
            z(2),
        ]);

        const lime = add([
            sprite("Lime"),
            scale(capyScale * 0.9),
            pos(0, 0),
            anchor("center"),
            z(3),
        ]);

        // Logo (right side) — scale so it fits vertically
        const logoScale = Math.min(sw / 1400, sh / 700) * (mobile ? 1.1 : 1.0);
        const logoX = mobile ? sw * 0.72 : sw * 0.68;
        const logoY = sh * 0.38;

        const logo = add([
            sprite(mobile ? "hoppibara" : "hoppibara2"),
            scale(logoScale),
            pos(logoX, logoY),
            anchor("center"),
            z(2),
        ]);

        const btnSize = mobile ? 65 : 80;
        const btnX    = logoX;
        const btnY    = logoY + sh * 0.22;

        const playBtn = add([
            rect(btnSize, btnSize),
            pos(btnX, btnY),
            anchor("center"),
            color(179, 120, 33),
            outline(6),
            z(10),
            area(),
        ]);
        add([sprite("playIcon"), pos(btnX, btnY), anchor("center"), z(11), scale(mobile ? 0.9 : 1.0)]);

        add([
            text(`High Score: ${localStorage.getItem("highScore")}`, { font: "baifont" }),
            pos(btnX, btnY + 90),
            scale(1.1),
            anchor("center"),
            color(80, 40, 0),
            z(11),
        ]);

        playBtn.onHover(()    => { playBtn.color = rgb(210, 145, 50); });
        playBtn.onHoverEnd(() => { playBtn.color = rgb(179, 120, 33); });
        playBtn.onClick(() => go("gameplay", false));
        onKeyPress("space", () => go("gameplay", false));

        onUpdate(() => {
            const bob   = Math.sin(time() * 1.8) * 12;
            const angle = 8 + Math.sin(time() * 1.5) * 2;
            capy.pos.y  = sh * 0.72 + bob;
            capy.angle  = angle;

            const sprW  = capy.width  * capyScale;
            const sprH  = capy.height * capyScale;
            const ox = sprW *  0.32;
            const oy = sprH * -0.28;
            const rad = (angle * Math.PI) / 180;
            const rx  = ox * Math.cos(rad) - oy * Math.sin(rad);
            const ry  = ox * Math.sin(rad) + oy * Math.cos(rad);
            lime.pos.x = capy.pos.x + rx;
            lime.pos.y = capy.pos.y + ry + bob;

            if (gamepad && gamepad.isPressed("south")) go("gameplay", false);
        });
    });

    if (WURFL.is_mobile && window.innerWidth <= 550) {
        go("changeDeviceOri");
    } else {
        go("menu");
    }
});
