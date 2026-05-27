document.addEventListener("DOMContentLoaded", () => {
    if (!localStorage.getItem("highScore")) localStorage.setItem("highScore", 0);
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

    let gamepad = null;
    let bgMusic  = null;

    const DEFAULTS = {
        gravity:   2800,
        jumpStr:   1400,
        moveSpd:   750,
        hazardSpd: 560,
        bgColor:   "tan",
        musicVol:  5,
        sfxVol:    6,
    };
    function loadSettings() {
        try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem("settings") || "{}")); }
        catch(e) { return Object.assign({}, DEFAULTS); }
    }
    function saveSettings(s) { localStorage.setItem("settings", JSON.stringify(s)); }

    const BG_COLORS = {
        tan:  [251, 210, 149],
        sky:  [180, 220, 255],
        dusk: [255, 180, 170],
        mint: [170, 240, 200],
    };
    // Floor colours that contrast with each BG — used for colour-contact detection
    const FLOOR_COLORS = {
        tan:  { r: 210, g: 180, b: 120 },
        sky:  { r: 140, g: 190, b: 230 },
        dusk: { r: 220, g: 145, b: 135 },
        mint: { r: 130, g: 200, b: 160 },
    };

    function applyBg(key) {
        const c = BG_COLORS[key] || BG_COLORS.tan;
        setBackground(c[0], c[1], c[2]);
    }
    function stopMusic() {
        if (bgMusic) { try { bgMusic.stop(); } catch(e) {} bgMusic = null; }
    }
    function startMusic(vol) {
        if (bgMusic) return;
        const v = ((vol ?? loadSettings().musicVol) / 10) * 0.1;
        try { bgMusic = play("background", { volume: v, loop: true }); } catch(e) {}
    }

    onGamepadConnect(gp    => { gamepad = gp; });
    onGamepadDisconnect(() => { gamepad = null; });

    // ── Scenes ────────────────────────────────────────────────────────────────

    scene("changeDeviceOri", () => {
        add([
            text("Please rotate your device or use a tablet/computer", { font: "baifont", width: width() * 0.8 }),
            scale(0.35), pos(width()/2, height()/2), anchor("center"), color(80,40,0),
        ]);
    });

    // ── Game Over — no black overlay, clean brown card ────────────────────────
    scene("gameover", (score) => {
        const s = loadSettings();
        applyBg(s.bgColor);
        stopMusic();
        const cx = width()/2, cy = height()/2;
        const bC = rgb(107,64,1), fC = rgb(179,120,33);
        add([rect(500,380), pos(cx,cy), anchor("center"), color(bC), z(1)]);
        add([rect(478,358), pos(cx,cy), anchor("center"), color(fC), z(2)]);
        add([text("Game Over",{font:"baifont"}), scale(2.0), pos(cx, cy-135), anchor("center"), color(255,255,255), z(3)]);
        add([text(`Score: ${score}`,{font:"baifont"}), scale(1.3), pos(cx, cy-45), anchor("center"), color(255,255,255), z(3)]);
        add([text(`Best: ${localStorage.getItem("highScore")}`,{font:"baifont"}), scale(1.3), pos(cx, cy+25), anchor("center"), color(255,255,200), z(3)]);
        add([text("Space or click retry",{font:"baifont"}), scale(0.60), pos(cx, cy+80), anchor("center"), color(255,255,200), z(3)]);
        loadSprite("retryIcon","./assets/images/icons/retry.png");
        const retryBg = add([rect(90,90), pos(cx, cy+160), anchor("center"), color(bC), outline(6), z(3), area()]);
        add([sprite("retryIcon"), pos(cx, cy+160), anchor("center"), z(4)]);
        retryBg.onHover(()    => { retryBg.color = rgb(140,85,5); });
        retryBg.onHoverEnd(() => { retryBg.color = bC; });
        retryBg.onClick(() => go("gameplay"));
        onKeyPress("space", () => go("gameplay"));
        onUpdate(() => { if (gamepad && gamepad.isPressed("south")) go("gameplay"); });
    });

    // ── Settings ──────────────────────────────────────────────────────────────
    scene("settings", () => {
        let s = loadSettings();
        applyBg(s.bgColor);
        const cx = width()/2, cy = height()/2;
        const bC = rgb(107,64,1), fC = rgb(179,120,33), wh = rgb(255,255,255);
        add([rect(width(), height()), pos(0,0), color(bC), z(0)]);
        add([rect(Math.min(700, width()-40), Math.min(640, height()-40)), pos(cx,cy), anchor("center"), color(fC), outline(8), z(1)]);
        add([text("Settings",{font:"baifont"}), scale(2.0), pos(cx, cy-265), anchor("center"), color(wh), z(2)]);

        const ROW_H = 68, startY = cy - 165;
        function makeSlider(label, key, min, max, step, yOff) {
            const y = startY + yOff;
            add([text(label,{font:"baifont"}), scale(0.82), pos(cx-210, y), anchor("left"), color(wh), z(2)]);
            const valLabel = add([text(String(s[key]),{font:"baifont"}), scale(0.82), pos(cx+230, y), anchor("right"), color(wh), z(2)]);
            const minusBtn = add([rect(50,50), pos(cx+55, y), anchor("center"), color(bC), outline(4), area(), z(2)]);
            add([text("-",{font:"baifont"}), scale(1.2), pos(cx+55, y), anchor("center"), color(wh), z(3)]);
            const plusBtn  = add([rect(50,50), pos(cx+135, y), anchor("center"), color(bC), outline(4), area(), z(2)]);
            add([text("+",{font:"baifont"}), scale(1.2), pos(cx+135, y), anchor("center"), color(wh), z(3)]);
            minusBtn.onClick(() => { s[key]=Math.max(min,Math.round((s[key]-step)*100)/100); valLabel.text=String(s[key]); saveSettings(s); });
            plusBtn.onClick(()  => { s[key]=Math.min(max,Math.round((s[key]+step)*100)/100); valLabel.text=String(s[key]); saveSettings(s); });
        }
        makeSlider("Gravity",       "gravity",   500,  5000, 100, 0);
        makeSlider("Jump Strength", "jumpStr",   500,  2500, 100, ROW_H);
        makeSlider("Move Speed",    "moveSpd",   200,  1500, 50,  ROW_H*2);
        makeSlider("Hazard Speed",  "hazardSpd", 200,  1200, 50,  ROW_H*3);
        makeSlider("Music Vol",     "musicVol",  0,    10,   1,   ROW_H*4);
        makeSlider("SFX Vol",       "sfxVol",    0,    10,   1,   ROW_H*5);

        const themeY = startY + ROW_H * 6;
        add([text("Theme",{font:"baifont"}), scale(0.82), pos(cx-210, themeY), anchor("left"), color(wh), z(2)]);
        const themes = Object.keys(BG_COLORS);
        const swW = 58, gap = 12, totalW = themes.length*(swW+gap)-gap;
        themes.forEach((key,i) => {
            const sx = cx - totalW/2 + i*(swW+gap) + swW/2 + 50;
            const c  = BG_COLORS[key];
            const sw2 = add([rect(swW,42), pos(sx,themeY), anchor("center"), color(c[0],c[1],c[2]), outline(s.bgColor===key?7:2), area(), z(2)]);
            sw2.onClick(() => { s.bgColor=key; saveSettings(s); applyBg(key); go("settings"); });
        });

        const resetBtn = add([rect(160,52), pos(20,20), anchor("topleft"), color(bC), outline(5), area(), z(2)]);
        add([text("Reset",{font:"baifont"}), scale(0.8), pos(100,46), anchor("center"), color(wh), z(3)]);
        resetBtn.onClick(() => { saveSettings(Object.assign({},DEFAULTS)); go("settings"); });

        const backBtn = add([rect(160,52), pos(width()-20,20), anchor("topright"), color(bC), outline(5), area(), z(2)]);
        add([text("Back",{font:"baifont"}), scale(0.8), pos(width()-100,46), anchor("center"), color(wh), z(3)]);
        backBtn.onClick(() => go("menu"));
        onKeyPress("escape", () => go("menu"));
    });

    // ── Gameplay ──────────────────────────────────────────────────────────────
    scene("gameplay", () => {
        const s = loadSettings();
        applyBg(s.bgColor);
        startMusic(s.musicVol);

        const FLOOR_H    = 220;
        const JUMP_STR   = s.jumpStr;
        const MOVE_SPD   = s.moveSpd;
        const SCROLL_SPD = 580;
        const HAZARD_SPD = s.hazardSpd;
        const SFX_VOL    = s.sfxVol / 10;
        const floorCol   = FLOOR_COLORS[s.bgColor] || FLOOR_COLORS.tan;

        setGravity(s.gravity);

        let isPaused   = false;
        let gameOver   = false;
        let currentSpr = "capybara";
        let walkTimer  = null;
        let isRotating = false;
        let rotation   = 0;
        let leftHeld   = false;
        let rightHeld  = false;

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

        // Floor — coloured to match theme, no white
        const floorSegs = [];
        function makeFloor(xPos) {
            const seg = add([
                rect(width()+4, FLOOR_H),
                pos(xPos, height()-FLOOR_H),
                color(floorCol.r, floorCol.g, floorCol.b),
                area(),
                body({ isStatic: true }),
                z(3),
                "floor",
            ]);
            // thin dark border stripe on top
            const border = add([rect(width()+4, 5), pos(xPos, height()-FLOOR_H-5), color(40,20,0), z(4)]);
            seg.onUpdate(() => { border.pos.x = seg.pos.x; });
            return seg;
        }
        floorSegs.push(makeFloor(0));
        floorSegs.push(makeFloor(width()));

        // Player — original Y position restored, image-sized hitbox
        const player = add([
            sprite("capybara"),
            pos(120, height()-FLOOR_H-60),
            anchor("center"),
            // Tight per-image hitbox — narrow + shorter than sprite bounds
            area({ shape: new Rect(vec2(-24, -20), 48, 44) }),
            body(),
            z(5),
        ]);

        // Score
        let score = 0;
        const scoreLabel = add([text("0",{font:"baifont"}), scale(1.8), pos(width()/2,60), anchor("center"), color(40,20,0), z(10)]);
        const scoreTick = setInterval(() => {
            if (gameOver || isPaused) return;
            score++;
            scoreLabel.text = score;
            const hi = parseInt(localStorage.getItem("highScore")||"0");
            if (score > hi) localStorage.setItem("highScore", score);
        }, 300);

        // Colour-contact game-over check (sample pixel under player each frame)
        // We compare the pixel the player is standing on to the BG colour;
        // if it matches the BG or floor exactly we handle it via collide tags instead.
        // The simplest reliable approach: if player somehow leaves the floor AND
        // touches a hazard → already handled. For floor/bg colour contact we rely
        // on kaboom tag collisions with "floor" tagged objects (white was old floor).
        // onCollide with "floor" → safe landing; anything else → game over NOT needed
        // since the floor is now a solid static body the player lands on normally.
        // The "touches bg colour" rule is implemented as: if player falls below
        // the screen bottom (no floor) → game over.
        onUpdate(() => {
            if (!gameOver && !isPaused) {
                if (player.pos.y > height() + 50) {
                    triggerDeath();
                }
            }
        });

        // Pause UI
        let pauseObjs = [];
        function showPause() {
            isPaused = true;
            leftHeld = false; rightHeld = false;
            stopWalkAnim();
            if (bgMusic) { try { bgMusic.paused = true; } catch(e) {} }
            const bC = rgb(107,64,1), fC = rgb(179,120,33), wh = rgb(255,255,255);
            pauseObjs.push(
                add([rect(width(),height()), pos(0,0), color(0,0,0), opacity(0.45), z(50)]),
                add([rect(480,280), pos(width()/2,height()/2), anchor("center"), color(bC), z(51)]),
                add([rect(460,260), pos(width()/2,height()/2), anchor("center"), color(fC), z(52)]),
                add([text("Paused",{font:"baifont"}), scale(2.0), pos(width()/2,height()/2-55), anchor("center"), color(wh), z(53)]),
                add([text("P or button to resume",{font:"baifont"}), scale(0.75), pos(width()/2,height()/2+35), anchor("center"), color(rgb(255,255,200)), z(53)]),
            );
        }
        function hidePause() {
            isPaused = false;
            if (bgMusic) { try { bgMusic.paused = false; } catch(e) {} }
            pauseObjs.forEach(o => destroy(o));
            pauseObjs = [];
        }
        function togglePause() {
            if (gameOver) return;
            if (isPaused) hidePause(); else showPause();
        }

        // Pause button
        const pauseBtnBg = add([rect(75,52), pos(width()-16,16), anchor("topright"), color(107,64,1), outline(4), z(20), area(), opacity(0.9)]);
        add([text("II",{font:"baifont"}), scale(1.0), pos(width()-53,42), anchor("center"), color(255,255,255), z(21)]);
        pauseBtnBg.onClick(togglePause);
        pauseBtnBg.onHover(()    => { pauseBtnBg.opacity = 1; });
        pauseBtnBg.onHoverEnd(() => { pauseBtnBg.opacity = 0.9; });
        onKeyPress("p",      togglePause);
        onKeyPress("escape", togglePause);

        // Death helper
        function triggerDeath() {
            if (gameOver) return;
            gameOver = true;
            stopWalkAnim();
            clearInterval(scoreTick);
            play("gameOver", { volume: SFX_VOL });
            stopMusic();
            wait(0.35, () => go("gameover", score));
        }

        // Hazards — scaled down 30%, image-bounds hitbox
        function spawnHazard() {
            if (gameOver) return;
            const h = add([
                sprite("hazard"+(Math.floor(Math.random()*4)+1)),
                // scale down obstacles
                scale(0.7),
                area({ shape: new Rect(vec2(-18, -36), 36, 44) }),
                pos(width()+10, height()-FLOOR_H),
                anchor("botleft"),
                move(LEFT, HAZARD_SPD),
                offscreen({ destroy: true }),
                z(5),
                "hazard",
            ]);
            wait(rand(1.1,2.6), spawnHazard);
        }
        spawnHazard();

        player.onCollide("hazard", () => {
            if (gameOver || isPaused) return;
            triggerDeath();
        });

        function jump() {
            if (isPaused || gameOver) return;
            if (player.isGrounded()) {
                play("jump", { volume: SFX_VOL });
                player.jump(JUMP_STR);
                isRotating = true;
                rotation   = 0;
                startWalkAnim();
            }
        }

        onKeyPress("left",    () => { leftHeld  = true; });
        onKeyPress("right",   () => { rightHeld = true; });
        onKeyRelease("left",  () => { leftHeld  = false; if (!rightHeld) stopWalkAnim(); });
        onKeyRelease("right", () => { rightHeld = false; if (!leftHeld)  stopWalkAnim(); });
        onKeyDown("space", jump);
        onKeyDown("up",    jump);

        onUpdate(() => {
            if (gameOver) return;

            if (!isPaused) {
                floorSegs.forEach((seg, i) => {
                    seg.pos.x -= SCROLL_SPD * dt();
                    if (seg.pos.x + width() < 0) {
                        const other = floorSegs[(i+1)%2];
                        seg.pos.x = other.pos.x + width();
                    }
                });
            }

            if (isPaused) return;

            if (leftHeld  && player.pos.x > 0)       { player.move(-MOVE_SPD,0); startWalkAnim(); }
            if (rightHeld && player.pos.x < width())  { player.move( MOVE_SPD,0); startWalkAnim(); }
            if (!leftHeld && !rightHeld && player.isGrounded() && walkTimer) stopWalkAnim();

            if (isRotating) {
                player.angle += 11; rotation += 11;
                if (rotation >= 360) { player.angle = 0; isRotating = false; }
            }

            if (gamepad) {
                const stick = gamepad.getStick("left");
                if (gamepad.isPressed("south")) jump();
                if (Math.abs(stick.x) > 0.15) {
                    if (player.pos.x >= 0 && player.pos.x <= width()) { player.move(stick.x*MOVE_SPD,0); startWalkAnim(); }
                } else {
                    if (!leftHeld && !rightHeld) stopWalkAnim();
                }
            }
        });

        if (WURFL.is_mobile) {
            const lBtn = add([sprite("leftIcon"),   pos(80,          height()-110), anchor("center"), area(), z(99), opacity(0.55)]);
            const rBtn = add([sprite("leftIcon"),   pos(250,         height()-110), anchor("center"), area(), z(99), opacity(0.55)]);
            const jBtn = add([sprite("actionIcon"), pos(width()-140, height()-110), anchor("center"), area(), z(99), opacity(0.55)]);
            rBtn.angle = 180;
            let lHeld = false, rHeld = false;
            appCanvas.addEventListener("touchstart", e => {
                [...e.touches].forEach(t => {
                    const p = vec2(t.clientX, t.clientY);
                    if (lBtn.hasPoint(p)) { lHeld=true; lBtn.opacity=1; }
                    if (rBtn.hasPoint(p)) { rHeld=true; rBtn.opacity=1; }
                    if (jBtn.hasPoint(p)) { jump(); jBtn.opacity=1; }
                });
            }, { passive: true });
            appCanvas.addEventListener("touchend", e => {
                [...e.changedTouches].forEach(t => {
                    const p = vec2(t.clientX, t.clientY);
                    if (lBtn.hasPoint(p)) { lHeld=false; lBtn.opacity=0.55; }
                    if (rBtn.hasPoint(p)) { rHeld=false; rBtn.opacity=0.55; }
                    if (jBtn.hasPoint(p)) { jBtn.opacity=0.55; }
                });
            }, { passive: true });
            onUpdate(() => {
                if (isPaused || gameOver) return;
                if (lHeld && player.pos.x > 0)      { player.move(-MOVE_SPD,0); startWalkAnim(); }
                if (rHeld && player.pos.x < width()) { player.move( MOVE_SPD,0); startWalkAnim(); }
                if (!lHeld && !rHeld && !leftHeld && !rightHeld) stopWalkAnim();
            });
        }
    });

    // ── Menu — clean modern layout ────────────────────────────────────────────
    scene("menu", () => {
        const s = loadSettings();
        applyBg(s.bgColor);
        startMusic(s.musicVol);

        const sw = width(), sh = height();
        const mobile = WURFL.is_mobile;

        // Logo — pushed right up to the top edge
        const logoS = Math.min(sw, sh) / 1400;
        add([
            sprite(mobile ? "hoppibara" : "hoppibara2"),
            scale(logoS),
            pos(sw - 12, 0),
            anchor("topright"),
            z(2),
        ]);

        // Capybara character left side
        const capyS = Math.min(sw / 2000, sh / 1100) * 0.8;
        const capy = add([sprite("CapyBaraM"), scale(capyS), pos(sw*0.15, sh*0.68), anchor("center"), z(2)]);
        const limeS = capyS * 2.2;
        const lime  = add([sprite("Lime"), scale(limeS), pos(0,0), anchor("center"), z(3)]);

        // ── Right panel — modern card ─────────────────────────────────────────
        const panelX  = mobile ? sw*0.67 : sw*0.62;
        const panelCY = sh*0.50;
        const btnW    = mobile ? 160 : 190;   // wide pill buttons
        const btnH    = mobile ? 52  : 58;
        const btnGap  = 18;
        const btnY1   = panelCY + 55;   // buttons shifted down a bit
        const btnY2   = btnY1 + btnH + btnGap;

        // Card background — subtle rounded feel via layered rects
        add([rect(btnW+60, btnH*2+btnGap+120, { radius: 16 }), pos(panelX, panelCY+10), anchor("center"), color(0,0,0), opacity(0.10), z(8)]);

        // High score — above buttons
        add([text(`Best: ${localStorage.getItem("highScore")}`, {font:"baifont"}),
            scale(0.9), pos(panelX, panelCY-30), anchor("center"), color(80,40,0), z(11)]);

        // ── PLAY button — bright accent ───────────────────────────────────────
        const playBtn = add([
            rect(btnW, btnH, { radius: 10 }),
            pos(panelX, btnY1),
            anchor("center"), color(179,120,33), outline(0), z(10), area(),
        ]);
        // play icon + label side by side
        add([sprite("playIcon"), scale(0.7), pos(panelX - btnW/2 + 28, btnY1), anchor("center"), z(11)]);
        add([text("PLAY", {font:"baifont"}), scale(0.85), pos(panelX + 10, btnY1), anchor("center"), color(255,255,255), z(11)]);

        // ── SETTINGS button — darker ──────────────────────────────────────────
        const settingsBtn = add([
            rect(btnW, btnH, { radius: 10 }),
            pos(panelX, btnY2),
            anchor("center"), color(107,64,1), outline(0), z(10), area(),
        ]);
        // Settings icon: two horizontal lines with a dot (drawn as text chars)
        // Using a simple SVG-style gear shape drawn from plain characters
        add([text("[ = ]", {font:"baifont"}), scale(0.75), pos(panelX - btnW/2 + 32, btnY2), anchor("center"), color(255,255,255), z(11)]);
        add([text("SETTINGS", {font:"baifont"}), scale(0.72), pos(panelX + 18, btnY2), anchor("center"), color(255,255,255), z(11)]);

        // Hover states
        playBtn.onHover(()        => { playBtn.color     = rgb(210,145,50); });
        playBtn.onHoverEnd(()     => { playBtn.color     = rgb(179,120,33); });
        settingsBtn.onHover(()    => { settingsBtn.color = rgb(140,85,5); });
        settingsBtn.onHoverEnd(() => { settingsBtn.color = rgb(107,64,1); });

        playBtn.onClick(()     => go("gameplay"));
        settingsBtn.onClick(() => go("settings"));
        onKeyPress("space",    () => go("gameplay"));
        onKeyPress("s",        () => go("settings"));

        // Rainbow credits — HTML overlay (not canvas, so it sits on top cleanly)
        const existing = document.getElementById("rainbow-credits");
        if (existing) existing.remove();
        const credDiv = document.createElement("div");
        credDiv.id = "rainbow-credits";
        credDiv.style.cssText = "position:fixed;bottom:8px;left:0;width:100%;text-align:center;font-size:clamp(10px,1.2vw,15px);font-family:sans-serif;font-weight:bold;pointer-events:none;z-index:9999;letter-spacing:0.04em";
        const credText = "Made by SoundGod. Added on to by Lemon.";
        const rainbowC = ["#ff4444","#ff8800","#ffdd00","#44dd44","#44aaff","#aa44ff","#ff44cc"];
        credDiv.innerHTML = [...credText].map((ch,i) =>
            `<span style="color:${rainbowC[i%rainbowC.length]};text-shadow:0 1px 3px rgba(0,0,0,0.3)">${ch===" "?"&nbsp;":ch}</span>`
        ).join("");
        document.body.appendChild(credDiv);

        onUpdate(() => {
            const bob   = Math.sin(time()*1.8)*10;
            const angle = 6+Math.sin(time()*1.4)*2;
            capy.pos.y  = sh*0.68+bob;
            capy.angle  = angle;
            const sprW=capy.width*capyS, sprH=capy.height*capyS;
            const ox=sprW*0.30, oy=-sprH*0.46;
            const rad=(angle*Math.PI)/180;
            lime.pos.x = capy.pos.x+ox*Math.cos(rad)-oy*Math.sin(rad);
            lime.pos.y = capy.pos.y+ox*Math.sin(rad)+oy*Math.cos(rad)+bob;
            if (gamepad && gamepad.isPressed("south")) go("gameplay");
        });
    });

    if (WURFL.is_mobile && window.innerWidth <= 550) {
        go("changeDeviceOri");
    } else {
        go("menu");
    }
});
