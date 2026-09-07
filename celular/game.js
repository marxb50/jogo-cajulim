/**
 * TURMA DO CAJULIM - JOGO DE PLATAFORMA 2D RETRÔ
 * Baseado no Roteiro Oficial da Coleta Seletiva:
 * Fase 1: Pega o Lixo
 * Fase 2: Caminhão de Lixo vai ao Transbordo
 * Fase 3: Caminhão Coletor joga na Carreta
 * Fase 4: Carreta leva para o Aterro
 * Fase 5: Aterro Sanitário
 */

const VIRTUAL_WIDTH = 960;
const VIRTUAL_HEIGHT = 540;
const GRAVITY = 1450;
const PLAYER_SPEED = 280;
const PLAYER_ACCEL = 1250;
const PLAYER_FRICTION = 0.83;
const JUMP_FORCE = -550;
const JUMP_HOLD_BOOST = -420;
const MAX_FALL_SPEED = 760;

// Vehicle Physics for Phase 2 (Caminhão)
const TRUCK_SPEED = 400;
const TRUCK_ACCEL = 800;
const TRUCK_FRICTION = 0.88;
const TRUCK_JUMP = -480;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.currentPhase = 1; // 1: Pega o Lixo, 2: Caminhão ao Transbordo
        this.assets = {};
        this.loadedCount = 0;
        this.totalAssets = 0;
        this.assetsReady = false;

        this.keys = { left: false, right: false, jump: false, jumpHeld: false, down: false, up: false };
        this.camera = { x: 0, y: 0 };
        this.particles = [];
        this.floatingTexts = [];

        this.state = 'TITLE'; // TITLE, PLAYING, LEVEL_CLEAR, GAME_OVER
        this.score = 0;
        this.lives = 3;
        this.timeLeft = 300;
        this.timerAccumulator = 0;
        this.trashCollected = 0;
        this.totalTrash = 6;
        this.recyclablesCollected = 0;
        this.totalRecyclables = 9;

        // Phase 2 specific stats
        this.biodieselCollected = 0;
        this.totalBiodiesel = 5;
        this.wrenchesCollected = 0;
        this.totalWrenches = 4;
        this.turboBoost = 1.0;
        this.turboTimer = 0;

        this.tipText = '';
        this.tipTimer = 0;

        this.levelClearTimer = 0;
        this.gameOverTimer = 0;
        this.cutscene = {
            active: false,
            type: null,
            step: 0,
            timer: 0,
            textProgress: 0,
            textSpeed: 42,
            flashTimer: 0,
            shakeTimer: 0,
            animTime: 0,
            cloudX: 0
        };

        this.player = {
            x: 80, y: 350, vx: 0, vy: 0, w: 48, h: 76,
            grounded: false, facing: 1, animState: 'idle',
            animFrame: 0, animTimer: 0, coyoteTimer: 0,
            jumpBuffer: 0, collectTimer: 0, invulnerableTimer: 0,
            isDead: false, skidTimer: 0
        };

        this.levelWidth = 4300;
        this.levelHeight = 540;
        this.platforms = [];
        this.items = [];
        this.blocks = [];
        this.decorations = [];
        this.hazards = []; // cones, oil slicks
        this.truck = null;
        this.transbordoFacility = null;
        this.lives = this.currentPhase === 6 ? 5 : 3;

        this.lastTime = performance.now();

        this.loadAssets();
        this.initControls();
    }

    loadAssets() {
        const imageList = {
            // Player Sprites (Cleaned without pedestal)
            'p_portrait': 'assets/player/cajulim_portrait.png',
            'p_walk_0': 'assets/player/walk_0.png',
            'p_walk_1': 'assets/player/walk_1.png',
            'p_walk_2': 'assets/player/walk_2.png',
            'p_walk_3': 'assets/player/walk_3.png',
            'p_walk_4': 'assets/player/walk_4.png',
            'p_walk_5': 'assets/player/walk_5.png',
            'p_walk_6': 'assets/player/walk_6.png',
            'p_walk_7': 'assets/player/walk_7.png',
            'p_walk_8': 'assets/player/walk_8.png',
            'p_jump_0': 'assets/player/jump_0.png',
            'p_jump_1': 'assets/player/jump_1.png',
            'p_jump_2': 'assets/player/jump_2.png',
            'p_jump_3': 'assets/player/jump_3.png',
            'p_idle_0': 'assets/player/idle_0.png',
            'p_idle_1': 'assets/player/idle_1.png',
            'p_idle_2': 'assets/player/idle_2.png',
            'p_idle_3': 'assets/player/idle_3.png',
            'p_collect_0': 'assets/player/collect_0.png',
            'p_collect_1': 'assets/player/collect_1.png',
            'p_win': 'assets/player/win.png',

            // Phase 1 Items & Blocks
            'item_trash_bag': 'assets/items/trash_bag_pixel.png',
            'item_soda_can': 'assets/items/soda_can.png',
            'item_pet_bottle': 'assets/items/pet_bottle.png',
            'item_glass_bottle': 'assets/items/glass_bottle.png',
            'item_paper_box': 'assets/items/paper_box.png',
            'item_star': 'assets/items/star.png',
            'tile_grass': 'assets/scenery/tile_grass.png',
            'tile_dirt': 'assets/scenery/tile_dirt.png',
            'block_brick': 'assets/scenery/block_brick.png',
            'block_recycle': 'assets/scenery/block_recycle.png',
            'block_question': 'assets/scenery/block_question.png',

            // Scenery
            'sc_tree': 'assets/scenery/tree.png',
            'sc_bush': 'assets/scenery/bush.png',
            'sc_bush_flowers': 'assets/scenery/bush_flowers.png',
            'sc_cloud': 'assets/scenery/cloud.png',
            'sc_signpost': 'assets/scenery/signpost.png',
            'sc_truck': 'assets/scenery/truck.png',

            // Phase 2 Assets (Road, Obstacles & Transbordo)
            'tile_road': 'assets/scenery/tile_road.png',
            'tile_road_sub': 'assets/scenery/tile_road_sub.png',
            'obs_cone': 'assets/scenery/cone.png',
            'obs_oil': 'assets/scenery/oil_slick.png',
            'tl_red': 'assets/scenery/traffic_light_red.png',
            'tl_yellow': 'assets/scenery/traffic_light_yellow.png',
            'tl_green': 'assets/scenery/traffic_light_green.png',
            'item_biodiesel': 'assets/items/biodiesel.png',
            'item_wrench': 'assets/items/wrench.png',
            'sc_city_bg': 'assets/scenery/city_bg.png',
            'sc_transbordo': 'assets/scenery/transbordo_facility.png',

            // Phase 3 Assets (Transbordo Interior, Carreta & Supervisor)
            'sc_transbordo_interior': 'assets/scenery/transbordo_interior.png',
            'sc_carreta': 'assets/scenery/carreta_transbordo.png',
            'p_supervisor': 'assets/scenery/cajulim_supervisor.png',
            'sc_truck_chassis': 'assets/scenery/truck_chassis.png',
            'sc_truck_bed': 'assets/scenery/truck_bed.png',

            // Phase 4 Assets (Dunes Highway, Articulated Carreta & Aterro Gate)
            'sc_dunes_bg': 'assets/scenery/dunes_bg.png',
            'sc_carreta_cab': 'assets/scenery/carreta_cab.png',
            'sc_carreta_trailer': 'assets/scenery/carreta_trailer.png',
            'sc_aterro_gate': 'assets/scenery/aterro_gate.png',

            // Phase 5 Assets (Aterro Sanitário & Usina Verde)
            'sc_aterro_complex_bg': 'assets/scenery/aterro_complex_bg.png',
            'sc_trator_compactador': 'assets/scenery/trator_compactador.png',
            'sc_biogas_plant': 'assets/scenery/biogas_plant.png',
            'sc_lagoa_aerador': 'assets/scenery/lagoa_aerador.png',

            // Institutional Visual Identity Assets
            'ui_parnamirim_logo': 'assets/ui/parnamirim_logo.png',

            // Cinematic Cutscene High-Res Arcade Images
            'cs_landfill_aerial': 'assets/cutscenes/cs_landfill_aerial.jpg',
            'cs_villain_mecha': 'assets/cutscenes/cs_villain_mecha.jpg',
            'cs_villain_laugh': 'assets/cutscenes/cs_villain_laugh.jpg',
            'cs_barao_service': 'assets/cutscenes/cs_barao_service.jpg',
            'cs_barao_sweep': 'assets/cutscenes/cs_barao_sweep.jpg',
            'cs_cajulim_celebration': 'assets/cutscenes/cs_cajulim_celebration.jpg'
        };

        const keys = Object.keys(imageList);
        this.totalAssets = keys.length;
        keys.forEach(key => {
            const img = new Image();
            img.src = imageList[key] + '?v=4.0';
            img.onload = () => {
                this.assets[key] = img;
                this.loadedCount++;
                if (this.loadedCount >= this.totalAssets) this.onAllAssetsLoaded();
            };
            img.onerror = () => {
                this.loadedCount++;
                if (this.loadedCount >= this.totalAssets) this.onAllAssetsLoaded();
            };
        });
    }

    onAllAssetsLoaded() {
        this.assetsReady = true;
        this.initLevel();
        if (typeof window !== 'undefined' && window.location) {
            const params = new URLSearchParams(window.location.search || '');
            if (params.get('phase') === '2') {
                this.switchPhase(2);
                if (params.get('pos')) {
                    this.player.x = parseFloat(params.get('pos'));
                    this.camera.x = Math.max(0, this.player.x - 200);
                }
            } else if (params.get('phase') === '3') {
                this.switchPhase(3);
                if (params.get('truck')) {
                    this.currentTruckIndex = parseInt(params.get('truck'), 10) || 1;
                }
                if (params.get('state')) {
                    this.phase3State = params.get('state');
                    if (this.phase3State === 'TIMING_GAME') {
                        this.player.x = this.dockTargetX;
                        this.timingNeedlePos = 50;
                        this.currentTruckIndex = 2;
                    } else if (this.phase3State === 'DUMPING') {
                        this.player.x = this.dockTargetX;
                        this.dumpAngle = 25;
                        this.trailerLoad = 15.0;
                        this.dumpProgress = 50;
                        this.currentTruckIndex = 2;
                    } else if (this.phase3State === 'TRUCK_EXIT') {
                        this.player.x = 180;
                        this.dumpAngle = 0;
                        this.currentTruckIndex = 2;
                    }
                }
            } else if (params.get('phase') === '4') {
                this.switchPhase(4);
                if (params.get('pos')) {
                    this.player.x = parseFloat(params.get('pos'));
                    this.camera.x = Math.max(0, this.player.x - 280);
                }
                if (params.get('speed')) {
                    this.speedKmh = parseFloat(params.get('speed'));
                }
            } else if (params.get('phase') === '5') {
                this.switchPhase(5);
                if (params.get('state')) {
                    this.phase5State = params.get('state');
                    if (this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
                        this.compactionProgress = 100;
                        if (this.compactionZones) this.compactionZones.forEach(z => z.comp = 100);
                        this.player.x = 490;
                        this.camera.x = 0;
                    } else if (this.phase5State === 'BIOGAS_GENERATION') {
                        this.compactionProgress = 100;
                        this.player.x = 2450;
                        this.camera.x = 2050;
                    } else if (this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
                        this.compactionProgress = 100;
                        this.biogasPowerMW = 10.0;
                        this.player.x = 2450;
                        this.camera.x = 2050;
                    } else if (this.phase5State === 'CHORUME_TREATMENT') {
                        this.compactionProgress = 100;
                        this.biogasPowerMW = 10.0;
                        this.player.x = 3600;
                        this.player.w = 48;
                        this.player.h = 76;
                        this.camera.x = 3360;
                    } else if (this.phase5State === 'LAB_ANALYSIS') {
                        this.compactionProgress = 100;
                        this.biogasPowerMW = 10.0;
                        this.chorumeTreated = 100;
                        this.player.x = 4980;
                        this.player.w = 48;
                        this.player.h = 76;
                        this.camera.x = 4240;
                    } else if (this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
                        this.compactionProgress = 100;
                        this.biogasPowerMW = 10.0;
                        this.chorumeTreated = 100;
                        this.labSampleTested = true;
                        this.player.x = 5080;
                        this.player.w = 48;
                        this.player.h = 76;
                        this.camera.x = 4240;
                    }
                }
            } else if (params.get('phase') === '6') {
                this.switchPhase(6);
                if (params.get('state')) {
                    this.phase6State = params.get('state');
                }
                if (params.get('hp') && this.boss) {
                    this.boss.hp = parseInt(params.get('hp'), 10);
                }
            }

            if (params.get('cutscene') === 'phase5_to_6') {
                this.switchPhase(5);
                const step = parseInt(params.get('step') || '0', 10);
                this.startCutscene('PHASE5_TO_6');
                this.cutscene.step = step;
                if (params.get('instant') === '1') {
                    this.cutscene.textProgress = 999;
                }
            } else if (params.get('cutscene') === 'ending') {
                this.switchPhase(6);
                const step = parseInt(params.get('step') || '0', 10);
                this.startCutscene('GRAND_ENDING');
                this.cutscene.step = step;
                if (params.get('instant') === '1') {
                    this.cutscene.textProgress = 999;
                }
            }
            if (params.get('cutscene') && params.get('animTime')) {
                this.cutscene.animTime = parseFloat(params.get('animTime'));
            }
            if (params.get('autowin') === '1') {
                this.startGame();
                if (this.currentPhase === 6) {
                    if (this.boss) {
                        this.boss.hp = 0;
                        this.boss.state = 'DEFEATED';
                    }
                    this.score = 15000;
                    this.levelClear();
                } else if (this.currentPhase === 5) {
                    this.compactionProgress = 100;
                    if (this.compactionZones) this.compactionZones.forEach(z => z.comp = 100);
                    this.soilCoverProgress = 100;
                    this.biogasPowerMW = 10.0;
                    this.chorumeTreated = 100;
                    this.labSampleTested = true;
                    this.score = 8500;
                    this.levelClear();
                } else if (this.currentPhase === 4) {
                    this.cargoStability = 95;
                    this.cargoWeight = 30000;
                    this.score = 4200;
                    this.player.x = 4380;
                    this.camera.x = Math.max(0, this.player.x - 280);
                    this.levelClear();
                } else {
                    this.trashCollected = this.totalTrash;
                    this.recyclablesCollected = 6;
                    this.score = 2600;
                    this.camera.x = 3100;
                    this.player.x = 3680;
                    this.player.y = 384;
                    this.levelClear();
                }
            } else if (params.get('autostart') === '1') {
                this.startGame();
                if (params.get('pos')) {
                    this.player.x = parseFloat(params.get('pos'));
                    this.camera.x = Math.max(0, this.player.x - 200);
                }
                if (params.get('walk') === '1') {
                    this.keys.right = true;
                    this.player.facing = 1;
                    this.player.vx = 80;
                    this.player.animState = 'walk';
                    this.player.animFrame = 1;
                }
                if (params.get('jump') === '1') {
                    this.player.isGrounded = false;
                    this.player.vy = -180;
                    this.player.animState = 'jump';
                    this.player.animFrame = 1;
                    this.player.y = 330;
                }
            }
        }
    }

    toggleFullscreen() {
        if (typeof document === 'undefined') return;
        try {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            if (!isFs) {
                const target = document.getElementById('arcadeContainer') || document.documentElement;
                if (target.requestFullscreen) {
                    target.requestFullscreen().catch(() => {
                        if (document.documentElement && document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen().catch(() => {});
                        }
                    });
                } else if (target.webkitRequestFullscreen) {
                    target.webkitRequestFullscreen();
                } else if (target.mozRequestFullScreen) {
                    target.mozRequestFullScreen();
                } else if (target.msRequestFullscreen) {
                    target.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
            }
        } catch (e) {
            console.log("Fullscreen toggle info:", e);
        }
    }

    initControls() {
        if (typeof window === 'undefined') return;

        window.addEventListener('keydown', (e) => {
            // CRITICAL FIX 2: Prevent Space and Arrows from scrolling page down!
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            if (window.soundManager) window.soundManager.resume();
            if (e.repeat) return;

            if (this.state === 'CUTSCENE') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.advanceCutscene();
                    return;
                }
                if (e.code === 'Escape' || e.code === 'KeyS') {
                    this.skipCutscene();
                    return;
                }
            }
            if (this.state === 'TITLE') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.startGame();
                    return;
                }
            }
            if (this.state === 'LEVEL_CLEAR') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.nextPhase();
                    return;
                }
            }
            if (this.state === 'GAME_OVER') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.restartLevel();
                    return;
                }
            }

            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': this.keys.left = true; break;
                case 'ArrowRight': case 'KeyD': this.keys.right = true; break;
                case 'ArrowDown': case 'KeyS': this.keys.down = true; break;
                case 'ArrowUp': case 'KeyW': case 'KeyK': case 'KeyZ': case 'KeyJ': case 'Space':
                    this.keys.up = true;
                    this.keys.jump = true;
                    this.keys.jumpHeld = true;
                    this.keyboardJumpHeld = true;
                    this.player.jumpBuffer = 0.15;
                    if (this.currentPhase === 2 && window.soundManager) window.soundManager.playHorn();
                    break;
                case 'KeyF':
                    this.toggleFullscreen();
                    break;
                case 'KeyM':
                    if (window.soundManager) {
                        const m = window.soundManager.toggleMute();
                        this.showTip(m ? 'Áudio Mudo' : 'Áudio Ativado');
                    }
                    break;
                case 'KeyR': this.restartLevel(); break;
                case 'Enter':
                    if (this.state === 'TITLE') {
                        this.toggleFullscreen();
                        this.startGame();
                    } else if (this.state === 'LEVEL_CLEAR') {
                        this.nextPhase();
                    } else if (this.state === 'GAME_OVER') {
                        this.restartLevel();
                    }
                    break;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': this.keys.left = false; break;
                case 'ArrowRight': case 'KeyD': this.keys.right = false; break;
                case 'ArrowDown': case 'KeyS': this.keys.down = false; break;
                case 'ArrowUp': case 'KeyW': case 'KeyK': case 'KeyZ': case 'KeyJ': case 'Space':
                    this.keys.up = false;
                    this.keyboardJumpHeld = false;
                    if (!this.gamepadJumpHeld) {
                        this.keys.jump = false;
                        this.keys.jumpHeld = false;
                    }
                    break;
            }
        });

        this.initMobileTouchControls();
        this.canvas.addEventListener('click', (e) => {
            if (window.soundManager) window.soundManager.resume();
            if (this.state === 'TITLE') {
                this.startGame();
                return;
            }
            if (this.state === 'LEVEL_CLEAR') {
                this.nextPhase();
                return;
            }
            if (this.state === 'GAME_OVER') {
                this.restartLevel();
                return;
            }
            if (this.state === 'CUTSCENE') {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = VIRTUAL_WIDTH / rect.width;
                const scaleY = VIRTUAL_HEIGHT / rect.height;
                const clickX = (e.clientX - rect.left) * scaleX;
                const clickY = (e.clientY - rect.top) * scaleY;

                // Check skip button in top-right (x: 770 to 945, y: 12 to 50)
                if (clickX >= 770 && clickX <= 945 && clickY >= 12 && clickY <= 50) {
                    this.skipCutscene();
                } else {
                    this.advanceCutscene();
                }
                return;
            }
            if (this.currentPhase === 5 && this.state === 'PLAYING') {
                this.handlePhase5Click(e);
            }
        });

        this.canvas.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.toggleFullscreen();
        });

        const updateFullscreenUI = () => {
            if (typeof document === 'undefined') return;
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            const topBtn = document.getElementById('btnTopFullscreen');
            const bottomBtn = document.getElementById('btnBottomFullscreen');
            if (topBtn) {
                topBtn.innerHTML = isFs ? '🗗 SAIR TELA CHEIA (F)' : '⛶ TELA CHEIA (F)';
            }
            if (bottomBtn) {
                bottomBtn.innerHTML = isFs ? '🗗 Sair Tela Cheia (F)' : '⛶ Tela Cheia (F)';
            }
        };
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('fullscreenchange', updateFullscreenUI);
            document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
            document.addEventListener('mozfullscreenchange', updateFullscreenUI);
            document.addEventListener('MSFullscreenChange', updateFullscreenUI);
        }

        const bindTouch = (id, keyName) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = (e) => {
                e.preventDefault();
                if (window.soundManager) window.soundManager.resume();
                if (this.state === 'TITLE') {
                    this.toggleFullscreen();
                    this.startGame();
                }
                if (keyName === 'jump') {
                    this.keys.jump = true; this.keys.jumpHeld = true;
                    this.player.jumpBuffer = 0.15;
                    if (this.currentPhase === 2 && window.soundManager) window.soundManager.playHorn();
                } else { this.keys[keyName] = true; }
            };
            const end = (e) => {
                e.preventDefault();
                if (keyName === 'jump') {
                    this.keys.jump = false; this.keys.jumpHeld = false;
                } else { this.keys[keyName] = false; }
            };
            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        };
        bindTouch('btnLeft', 'left');
        bindTouch('btnRight', 'right');
        bindTouch('btnJump', 'jump');
    }

    switchPhase(phaseNum) {
        this.currentPhase = phaseNum;
        const p1 = document.getElementById('pillStage1');
        const p2 = document.getElementById('pillStage2');
        const p3 = document.getElementById('pillStage3');
        const p4 = document.getElementById('pillStage4');
        const p5 = document.getElementById('pillStage5');
        const p6 = document.getElementById('pillStage6');
        if (p1) { if (phaseNum === 1) p1.classList.add('active'); else p1.classList.remove('active'); }
        if (p2) { if (phaseNum === 2) p2.classList.add('active'); else p2.classList.remove('active'); }
        if (p3) { if (phaseNum === 3) p3.classList.add('active'); else p3.classList.remove('active'); }
        if (p4) { if (phaseNum === 4) p4.classList.add('active'); else p4.classList.remove('active'); }
        if (p5) { if (phaseNum === 5) p5.classList.add('active'); else p5.classList.remove('active'); }
        if (p6) { if (phaseNum === 6) p6.classList.add('active'); else p6.classList.remove('active'); }

        this.initLevel();
        this.state = 'PLAYING';
        if (window.soundManager) {
            window.soundManager.startMusic(phaseNum === 6 ? 'boss' : 'stage');
        }
        if (phaseNum === 6) {
            this.lives = 5;
            this.showTip('Fase 6: O Grande Chefão! Suba nos andaimes e pule no Mecha-Trator do Barão do Entulho!', 5.5);
        } else if (phaseNum === 5) {
            this.showTip('Fase 5: Aterro Sanitário & Usina Verde! Compacte os resíduos, ligue o biogás e trate o chorume!', 5.0);
        } else if (phaseNum === 4) {
            this.showTip('Fase 4: Carreta ao Aterro! Mantenha 40-75 km/h nas dunas para não balançar o lixo!', 5.0);
        } else if (phaseNum === 3) {
            this.showTip('Fase 3: Joga na Carreta! Manobre até a doca e acione o pistão para descarregar!', 4.5);
        } else if (phaseNum === 2) {
            this.showTip('Fase 2: Caminhão de Lixo vai ao Transbordo! Dirija com cuidado até a Estação!', 4.5);
        } else {
            this.showTip('Fase 1: Pega o Lixo! Colete os sacos e recicláveis até o caminhão!', 4.0);
        }
    }

    nextPhase() {
        if (this.currentPhase === 1) {
            this.switchPhase(2);
        } else if (this.currentPhase === 2) {
            this.switchPhase(3);
        } else if (this.currentPhase === 3) {
            this.switchPhase(4);
        } else if (this.currentPhase === 4) {
            this.switchPhase(5);
        } else if (this.currentPhase === 5) {
            this.switchPhase(6);
        } else {
            this.restartLevel();
        }
    }

    startGame() {
        this.state = 'PLAYING';
        if (window.soundManager) {
            window.soundManager.startMusic(this.currentPhase === 6 ? 'boss' : 'stage');
        }
        if (this.currentPhase === 1) {
            this.showTip('Fase 1: Pega o Lixo! Colete os sacos e recicláveis até o caminhão!', 4.0);
        } else if (this.currentPhase === 2) {
            this.showTip('Fase 2: Caminhão de Lixo vai ao Transbordo! Transporte a carga até a Estação!', 4.0);
        } else if (this.currentPhase === 3) {
            this.showTip('Fase 3: Joga na Carreta! Manobre até a doca e acione o pistão para descarregar!', 4.5);
        } else if (this.currentPhase === 4) {
            this.showTip('Fase 4: Carreta ao Aterro! Mantenha 40-75 km/h nas dunas para não balançar o lixo!', 5.0);
        } else if (this.currentPhase === 5) {
            this.showTip('Fase 5: Aterro Sanitário & Usina Verde! Compacte os resíduos, ligue o biogás e trate o chorume!', 5.0);
        } else if (this.currentPhase === 6) {
            this.showTip('Fase 6: O Grande Chefão! Suba nos andaimes e pule no Mecha-Trator do Barão do Entulho!', 5.5);
        }
    }

    initLevel() {
        this.platforms = [];
        this.items = [];
        this.blocks = [];
        this.decorations = [];
        this.hazards = [];
        this.truck = null;
        this.transbordoFacility = null;
        this.lives = this.currentPhase === 6 ? 5 : 3;

        if (this.currentPhase === 1) {
            this.initPhase1();
        } else if (this.currentPhase === 2) {
            this.initPhase2();
        } else if (this.currentPhase === 3) {
            this.initPhase3();
        } else if (this.currentPhase === 4) {
            this.initPhase4();
        } else if (this.currentPhase === 5) {
            this.initPhase5();
        } else if (this.currentPhase === 6) {
            this.initPhase6();
        }

        const vm = document.getElementById('victoryModal');
        if (vm) vm.classList.add('hidden');
        const gm = document.getElementById('gameOverModal');
        if (gm) gm.classList.add('hidden');
    }

    initPhase1() {
        const GROUND_Y = 460;
        this.levelWidth = 4300;

        // Ground segments with PITS:
        const groundSegments = [
            { x1: 0, x2: 760 },
            { x1: 920, x2: 1640 },
            { x1: 1920, x2: 2640 },
            { x1: 3000, x2: 4300 }
        ];
        groundSegments.forEach(seg => {
            this.platforms.push({ x: seg.x1, y: GROUND_Y, w: seg.x2 - seg.x1, h: 80, type: 'ground' });
        });

        // Stepping stone platforms across pits
        this.platforms.push({ x: 1710, y: 380, w: 140, h: 32, type: 'floating' });
        this.platforms.push({ x: 2690, y: 380, w: 120, h: 32, type: 'floating' });
        this.platforms.push({ x: 2850, y: 380, w: 120, h: 32, type: 'floating' });

        // Elevated Platforms & Hills
        this.platforms.push({ x: 440, y: 350, w: 144, h: 32, type: 'floating' });
        this.platforms.push({ x: 1140, y: 390, w: 192, h: 32, type: 'floating' });
        this.platforms.push({ x: 1220, y: 320, w: 144, h: 32, type: 'floating' });
        this.platforms.push({ x: 1380, y: 260, w: 120, h: 32, type: 'floating' });
        this.platforms.push({ x: 2150, y: 360, w: 160, h: 32, type: 'floating' });
        this.platforms.push({ x: 2360, y: 280, w: 160, h: 32, type: 'floating' });

        // Steps before truck
        this.platforms.push({ x: 3350, y: 410, w: 96, h: 32, type: 'floating' });
        this.platforms.push({ x: 3460, y: 360, w: 96, h: 32, type: 'floating' });
        this.platforms.push({ x: 3570, y: 310, w: 96, h: 32, type: 'floating' });

        // Interactive blocks (centered textures)
        this.blocks = [
            { x: 260, y: 310, w: 48, h: 48, type: 'recycle', hit: false, content: 'soda_can' },
            { x: 308, y: 310, w: 48, h: 48, type: 'brick', hit: false },
            { x: 356, y: 310, w: 48, h: 48, type: 'question', hit: false, content: 'star' },
            { x: 404, y: 310, w: 48, h: 48, type: 'brick', hit: false },
            { x: 1040, y: 310, w: 48, h: 48, type: 'recycle', hit: false, content: 'pet_bottle' },
            { x: 1088, y: 310, w: 48, h: 48, type: 'brick', hit: false },
            { x: 2040, y: 310, w: 48, h: 48, type: 'recycle', hit: false, content: 'paper_box' },
            { x: 2280, y: 220, w: 48, h: 48, type: 'recycle', hit: false, content: 'glass_bottle' }
        ];

        // 9 Garbage Bags (6 required)
        this.items.push(
            { id: 1, x: 300, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 2, x: 620, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 3, x: 1100, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 4, x: 1540, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 5, x: 2200, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 6, x: 3150, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 7, x: 1260, y: 320 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' },
            { id: 8, x: 1760, y: 380 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' },
            { id: 9, x: 3590, y: 310 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' }
        );

        // Recyclables
        this.items.push(
            { id: 10, x: 180, y: GROUND_Y - 38, type: 'soda_can', points: 100, name: 'Latinha (Metal/Amarelo)' },
            { id: 11, x: 1420, y: 260 - 38, type: 'soda_can', points: 100, name: 'Latinha (Metal/Amarelo)' },
            { id: 12, x: 840, y: 330, type: 'pet_bottle', points: 100, name: 'Garrafa PET (Plástico/Vermelho)' },
            { id: 13, x: 2200, y: 360 - 42, type: 'pet_bottle', points: 100, name: 'Garrafa PET (Plástico/Vermelho)' },
            { id: 14, x: 620, y: GROUND_Y - 36, type: 'paper_box', points: 100, name: 'Caixa (Papelão/Azul)' },
            { id: 15, x: 3120, y: GROUND_Y - 36, type: 'paper_box', points: 100, name: 'Caixa (Papelão/Azul)' },
            { id: 16, x: 1540, y: GROUND_Y - 42, type: 'glass_bottle', points: 100, name: 'Garrafa (Vidro/Verde)' },
            { id: 17, x: 2750, y: 320, type: 'star', points: 300, name: 'Bandeira de Parnamirim' },
            { id: 18, x: 2900, y: 270, type: 'star', points: 300, name: 'Bandeira de Parnamirim' }
        );

        // Scenery
        this.decorations = [
            { x: 120, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 620, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 1000, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 1500, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 2050, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 2520, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 3200, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 50, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 230, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 420, y: GROUND_Y - 48, w: 60, h: 48, type: 'bush' },
            { x: 1100, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 1350, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 2250, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 3050, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 80, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Bem-vindo ao Bairro! Recolha o lixo e entregue no caminhão!' },
            { x: 700, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'ATENÇÃO: Buraco à frente! Pule com ESPACO!' },
            { x: 1880, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Dica da Cajulina: O plástico descartado corretamente vira novos produtos!' },
            { x: 2950, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Quase lá! O Caminhão da Coleta Seletiva está logo à frente!' }
        ];

        // Green truck goal
        this.truck = { x: 3740, y: GROUND_Y - 170, w: 360, h: 180 };

        this.player.x = 80;
        this.player.y = 350;
        this.player.w = 48;
        this.player.h = 76;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.isDead = false;
        this.player.animState = 'idle';

        this.trashCollected = 0;
        this.totalTrash = 6;
        this.recyclablesCollected = 0;
        this.totalRecyclables = 9;
        this.timeLeft = 300;
        this.timerAccumulator = 0;
    }

    initPhase2() {
        const ROAD_Y = 460;
        this.levelWidth = 4600;

        // Highway Road segments with bridge gaps / potholes:
        const roadSegments = [
            { x1: 0, x2: 980 },
            { x1: 1160, x2: 2100 },
            { x1: 2320, x2: 3100 },
            { x1: 3300, x2: 4600 }
        ];
        roadSegments.forEach(seg => {
            this.platforms.push({ x: seg.x1, y: ROAD_Y, w: seg.x2 - seg.x1, h: 80, type: 'road' });
        });

        // Elevated highway ramps / overpasses
        this.platforms.push({ x: 1300, y: 390, w: 260, h: 32, type: 'overpass' });
        this.platforms.push({ x: 2450, y: 390, w: 280, h: 32, type: 'overpass' });
        this.platforms.push({ x: 3450, y: 390, w: 240, h: 32, type: 'overpass' });

        // Road Traffic Lights (Semáforos) replacing cones!
        this.trafficLights = [
            { x: 850, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 3.5, waited: false, passed: false },
            { x: 1950, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 4.0, waited: false, passed: false },
            { x: 2850, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 3.5, waited: false, passed: false },
            { x: 3700, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 3.0, waited: false, passed: false }
        ];

        // Road Hazards (Oil slicks)
        this.hazards = [
            { x: 1400, y: ROAD_Y - 18, w: 60, h: 18, type: 'oil' },
            { x: 2400, y: ROAD_Y - 18, w: 60, h: 18, type: 'oil' },
            { x: 3200, y: ROAD_Y - 18, w: 60, h: 18, type: 'oil' }
        ];

        // Collectibles on the highway: Biodiesel jerrycans, repair wrenches, stars
        this.items = [
            { id: 201, x: 320, y: ROAD_Y - 40, type: 'biodiesel', points: 200, name: 'Biodiesel Verde (Turbo)' },
            { id: 202, x: 700, y: ROAD_Y - 40, type: 'biodiesel', points: 200, name: 'Biodiesel Verde (Turbo)' },
            { id: 203, x: 1400, y: 390 - 40, type: 'biodiesel', points: 200, name: 'Biodiesel Verde (Turbo)' },
            { id: 204, x: 2550, y: 390 - 40, type: 'biodiesel', points: 200, name: 'Biodiesel Verde (Turbo)' },
            { id: 205, x: 3500, y: 390 - 40, type: 'biodiesel', points: 200, name: 'Biodiesel Verde (Turbo)' },

            { id: 206, x: 600, y: ROAD_Y - 36, type: 'wrench', points: 150, name: 'Chave de Reparo (+Vida)' },
            { id: 207, x: 1650, y: ROAD_Y - 36, type: 'wrench', points: 150, name: 'Chave de Reparo (+Vida)' },
            { id: 208, x: 2900, y: ROAD_Y - 36, type: 'wrench', points: 150, name: 'Chave de Reparo (+Vida)' },
            { id: 209, x: 3750, y: ROAD_Y - 36, type: 'wrench', points: 150, name: 'Chave de Reparo (+Vida)' },

            { id: 210, x: 1070, y: 330, type: 'star', points: 300, name: 'Bandeira de Parnamirim' },
            { id: 211, x: 2210, y: 330, type: 'star', points: 300, name: 'Bandeira de Parnamirim' },
            { id: 212, x: 3200, y: 330, type: 'star', points: 300, name: 'Bandeira de Parnamirim' }
        ];

        // Highway road signs & urban scenery
        this.decorations = [
            { x: 150, y: ROAD_Y - 70, w: 56, h: 70, type: 'sign', text: 'RODOVIA MUNICIPAL: Destino Estação de Transbordo (4km)' },
            { x: 920, y: ROAD_Y - 70, w: 56, h: 70, type: 'sign', text: 'ATENÇÃO: Buraco na pista à frente! Use turbo e pule!' },
            { x: 2020, y: ROAD_Y - 70, w: 56, h: 70, type: 'sign', text: 'DICA: O transbordo otimiza viagens e reduz poluição!' },
            { x: 3220, y: ROAD_Y - 70, w: 56, h: 70, type: 'sign', text: 'REDUZA A VELOCIDADE: Balança e Portão do Transbordo a 500m!' }
        ];

        // Estação de Transbordo Facility at the end of highway
        this.transbordoFacility = { x: 3950, y: ROAD_Y - 220, w: 380, h: 240 };

        // Player is now the Truck!
        this.player.x = 80;
        this.player.y = ROAD_Y - 65;
        this.player.w = 96;
        this.player.h = 60;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.isDead = false;
        this.player.animState = 'truck';

        this.biodieselCollected = 0;
        this.totalBiodiesel = 5;
        this.wrenchesCollected = 0;
        this.totalWrenches = 4;
        this.turboBoost = 1.0;
        this.turboTimer = 0;
        this.timeLeft = 300;
        this.timerAccumulator = 0;
    }

    initPhase3() {
        this.levelWidth = 960;
        this.camera.x = 0;
        this.camera.y = 0;

        // Player (Caminhão Coletor)
        this.player.w = 120;
        this.player.h = 68;
        this.player.x = 60;
        this.player.y = 242; // Upper deck surface y = 310
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.facing = 1;
        this.player.isDead = false;
        this.player.animState = 'truck';

        // Platforms
        this.platforms = [
            { x: 0, y: 310, w: 480, h: 230, type: 'concrete_deck' },
            { x: 480, y: 470, w: 480, h: 70, type: 'pit_ground' }
        ];

        // 4 Trucks Fleet System
        this.currentTruckIndex = 1; // 1, 2, 3, 4
        this.totalTrucks = 4;
        this.truckCapacity = 7.5; // tons per truck (4 x 7.5t = 30.0t)
        this.truckDumped = 0; // 0 to 7.5t for current truck
        this.trailerLoad = 0; // 0 to 30.0t total in carreta
        this.totalTrailerCapacity = 30; // 30 tons

        // Phase 3 State Machine:
        // 'TRUCK_ENTER' -> 'DOCKING' -> 'ALIGNED' -> 'TIMING_GAME' -> 'DUMPING' -> 'TRUCK_EXIT' -> 'COMPACTING' -> 'COMPLETE'
        this.phase3State = 'DOCKING';
        this.dockTargetX = 345;
        this.dockDistance = 9.5; // meters
        this.dockAlignedTimer = 0;
        this.dockBeepTimer = 0;
        this.alignedTimer = 0;
        this.exitTimer = 0;

        // Timing Gauge Minigame:
        this.timingNeedlePos = 15; // 0 to 100, 50 is center
        this.timingNeedleDir = 1; // +1 or -1
        this.timingResult = null; // null, 'PERFECT', 'GOOD', 'MISS'
        this.timingResultTimer = 0;
        this.dumpSpeedMultiplier = 1.0;

        // Dumping & Hydraulic System
        this.dumpAngle = 0; // 0 to 42 degrees
        this.dumpProgress = 0; // 0 to 100%
        this.dumpParticleTimer = 0;
        this.hydraulicSoundTimer = 0;
        this.roundDumpTarget = 0; // How much waste to dump this round
        this.roundDumped = 0; // How much waste dumped during current round
        this.tarpCoverProgress = 0; // 0 to 100%
        this.phase3CompleteTimer = 0;

        // Carreta de Transbordo
        this.carreta = {
            x: 500,
            y: 310,
            w: 440,
            h: 172
        };

        // Cajulim Supervisor on catwalk
        this.supervisor = {
            x: 80,
            y: 79,
            w: 72,
            h: 96,
            cheer: false
        };

        this.timeLeft = 300;
        this.timerAccumulator = 0;
    }

    getDuneHeight(x) {
        if (x <= 400) return 390;
        if (x >= 3970 && x < 4070) {
            // Rampa subindo na balança
            const t = (x - 3970) / 100;
            return 390 - t * 14;
        }
        if (x >= 4070 && x <= 4280) {
            // Plataforma elevada da balança rodoviária
            return 376;
        }
        if (x > 4280 && x <= 4340) {
            // Rampa de descida após o portão
            const t = (x - 4280) / 60;
            return 376 + t * 14;
        }
        if (x > 4340) return 390;
        if (x >= 3920) return 390;
        const taperIn = Math.min(1, Math.max(0, (x - 400) / 280));
        const taperOut = Math.min(1, Math.max(0, (3920 - x) / 280));
        const taper = Math.min(taperIn, taperOut);

        const wave = Math.sin(x * 0.0022) * 58 +
                     Math.sin(x * 0.0055) * 34 +
                     Math.sin(x * 0.0120) * 14;
        return 390 - wave * taper;
    }

    getDuneAngle(x) {
        const dx = 10;
        const y1 = this.getDuneHeight(x - dx);
        const y2 = this.getDuneHeight(x + dx);
        return Math.atan2(y2 - y1, dx * 2);
    }

    getDuneCurvature(x) {
        const dx = 20;
        const y1 = this.getDuneHeight(x - dx);
        const y0 = this.getDuneHeight(x);
        const y2 = this.getDuneHeight(x + dx);
        return (y1 + y2 - 2 * y0) / (dx * dx);
    }

    initPhase4() {
        this.levelWidth = 4600;
        this.camera.x = 0;
        this.camera.y = 0;

        // Player is the Tractor Cab
        this.player.w = 115;
        this.player.h = 70;
        this.player.x = 80;
        this.player.y = this.getDuneHeight(80) - 52;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.facing = 1;
        this.player.isDead = false;
        this.player.animState = 'carreta';

        // Articulated 30t Semi-Trailer
        this.trailer = {
            x: this.player.x - 185,
            y: this.getDuneHeight(this.player.x - 185) - 58,
            w: 230,
            h: 82,
            bounceY: 0,
            bounceVy: 0,
            angle: 0
        };

        // Driving Physics & Cargo Management
        this.speedKmh = 0;
        this.cargoStability = 100;
        this.cargoWeight = 30000;
        this.freioMotorActive = false;
        this.tracaoReduzidaActive = false;
        this.retarderTimer = 0;
        this.airPuffTimer = 0;
        this.rattleTimer = 0;
        this.excessSpeedWarnTimer = 0;
        this.stallTipTimer = 0;

        // Weigh Station (Balança ANTT & Portão do Aterro)
        this.scaleWeighed = false;
        this.scaleTimer = 0;
        this.gateAngle = 0;
        this.scaleReading = 'AGUARDANDO...';
        this.speedWarnTimer = 0;

        this.lostTrashParticles = [];
        this.airPuffs = [];

        // Collectibles on the dunes highway
        this.items = [
            // Biodiesel cans (+250 pts, +5% stability)
            { id: 401, x: 780, y: this.getDuneHeight(780) - 36, type: 'biodiesel', points: 250, name: 'Biodiesel B20 Verde' },
            { id: 402, x: 1580, y: this.getDuneHeight(1580) - 36, type: 'biodiesel', points: 250, name: 'Biodiesel B20 Verde' },
            { id: 403, x: 2380, y: this.getDuneHeight(2380) - 36, type: 'biodiesel', points: 250, name: 'Biodiesel B20 Verde' },
            { id: 404, x: 3180, y: this.getDuneHeight(3180) - 36, type: 'biodiesel', points: 250, name: 'Biodiesel B20 Verde' },
            { id: 405, x: 3780, y: this.getDuneHeight(3780) - 36, type: 'biodiesel', points: 250, name: 'Biodiesel B20 Verde' },

            // Golden Flags on thrilling dune crests (+500 pts)
            { id: 406, x: 1140, y: this.getDuneHeight(1140) - 62, type: 'star', points: 500, name: 'Bandeira de Parnamirim' },
            { id: 407, x: 2060, y: this.getDuneHeight(2060) - 62, type: 'star', points: 500, name: 'Bandeira de Parnamirim' },
            { id: 408, x: 2840, y: this.getDuneHeight(2840) - 62, type: 'star', points: 500, name: 'Bandeira de Parnamirim' },

            // Cargo Tie-Down Straps / Repair Wrenches (+200 pts, +15% stability)
            { id: 409, x: 1860, y: this.getDuneHeight(1860) - 36, type: 'wrench', points: 200, name: 'Cinta de Amarração (+15% Estabilidade)' },
            { id: 410, x: 3480, y: this.getDuneHeight(3480) - 36, type: 'wrench', points: 200, name: 'Cinta de Amarração (+15% Estabilidade)' }
        ];

        // Semáforos de Trânsito ao longo da Rodovia das Dunas (Fase 4)
        this.trafficLights = [
            { x: 1050, y: this.getDuneHeight(1050) - 96, w: 48, h: 96, state: 'RED', timer: 3.5, waited: false, passed: false },
            { x: 2150, y: this.getDuneHeight(2150) - 96, w: 48, h: 96, state: 'RED', timer: 3.5, waited: false, passed: false },
            { x: 3150, y: this.getDuneHeight(3150) - 96, w: 48, h: 96, state: 'RED', timer: 3.0, waited: false, passed: false }
        ];

        // Estado da Balança ANTT e Rampa
        this.scaleAutoBraking = false;
        this.scaleWeightDisplay = 0;
        this.scaleFinishedTimer = 0;

        // Educational road signs along the coastal highway
        this.decorations = [
            { x: 260, y: 390 - 70, w: 56, h: 70, type: 'sign', text: 'RODOVIA DAS DUNAS: Transporte Pesado ao Aterro Sanitário (4.5 km)' },
            { x: 720, y: this.getDuneHeight(720) - 70, w: 56, h: 70, type: 'sign', text: 'ATENÇÃO: Mantenha entre 40 e 75 km/h para não balançar a carga!' },
            { x: 1380, y: this.getDuneHeight(1380) - 70, w: 56, h: 70, type: 'sign', text: 'DESCIDA ÍNGREME: Acione o Freio Motor [S ou SETA BAIXO]!' },
            { x: 2220, y: this.getDuneHeight(2220) - 70, w: 56, h: 70, type: 'sign', text: 'SUBIDA PESADA NA AREIA: Engate Tração 6x4 Reduzida [W ou ESPACO]!' },
            { x: 3340, y: this.getDuneHeight(3340) - 70, w: 56, h: 70, type: 'sign', text: 'REDUZA: Balança Rodoviária ANTT e Portão do Aterro a 600m (Máx 20 km/h)!' }
        ];

        this.timeLeft = 300;
        this.timerAccumulator = 0;
    }

    initPhase5() {
        this.levelWidth = 5200;
        this.camera.x = 0;
        this.camera.y = 0;

        // Player starts as the Compactor Tractor ("Pata de Carneiro") in Sector 1
        this.player.w = 140;
        this.player.h = 80;
        this.player.x = 180;
        this.player.y = 380;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing = 1;
        this.player.grounded = true;
        this.player.animState = 'tractor';
        this.player.isDead = false;

        // Phase 5 State Machine:
        // 'COMPACTING' (Trator Aterrando) -> 'COMPACTING_WAIT_ADVANCE' -> 'BIOGAS_GENERATION' (Pressão) -> 'BIOGAS_WAIT_ADVANCE' -> 'CAJULIM_LAGOONS' (Cajulim) -> 'CAJULIM_WAIT_ADVANCE' -> 'COMPLETE'
        this.phase5State = 'COMPACTING';

        // Sector 1: Célula Dupla & Jazida de Argila (x: 0 to 1750)
        // 4 Zonas de Compactação independentes que o jogador precisa rolar:
        this.compactionZones = [
            { id: 'A', name: 'Célula Norte (Esq)', x1: 170, x2: 480, comp: 0 },
            { id: 'B', name: 'Célula Norte (Dir)', x1: 480, x2: 810, comp: 0 },
            { id: 'C', name: 'Célula Sul (Base)',  x1: 850, x2: 1120, comp: 0 },
            { id: 'D', name: 'Célula Sul (Rampa)', x1: 1120, x2: 1400, comp: 0 }
        ];
        this.compactionProgress = 0; // Média das 4 zonas (0 a 100%)
        this.soilCoverProgress = 0;   // 0 a 100%
        this.bladeLowered = false;
        this.bladeLoweredState = false;
        this.clayLoaded = 0; // Quantidade de argila carregada na lâmina (0 a 100%)
        this.tractorEngineSoundTimer = 0;
        this.tractorBladeSoundTimer = 0;

        // Sector 2: Usina de Biogás 10.0 MW & Purgador de Condensado (x: 1750 to 3350)
        this.biogasPressure = 50; // Alvo: 45 - 68 kPa
        this.biogasPowerMW = 0.0;  // Alvo expandido: 10.0 MW!
        this.flareFlameScale = 0.6;
        this.turbineSpinAngle = 0;
        this.flareLit = false;
        this.valvePosition = 50;   // 0 a 100
        this.filterMoisture = 15;  // 0 a 100% (umidade acumulada no condensador)
        this.turbineAudioTimer = 0;
        this.powerGridPulseTimer = 0;
        this.gridSparks = [];

        // Sector 3: Complexo de 3 Lagoas & Laboratório ETE (x: 3350 to 5200)
        this.chorumeTreated = 0;   // 0 a 100%
        // 3 Aeradores mecânicos na Lagoa Facultativa
        this.aerators = [
            { x: 3950, y: 410, w: 85, h: 68, active: false, rpm: 0, splashTimer: 0, bobPhase: 0 },
            { x: 4250, y: 410, w: 85, h: 68, active: false, rpm: 0, splashTimer: 0, bobPhase: 1.5 },
            { x: 4550, y: 410, w: 85, h: 68, active: false, rpm: 0, splashTimer: 0, bobPhase: 3.0 }
        ];
        this.labSampleTested = false;
        this.labSampleResult = null;

        // Partículas visuais
        this.phase5Particles = [];

        this.timeLeft = 360; // 6 minutos completos
        this.timerAccumulator = 0;
    }

    initPhase6() {
        this.levelWidth = 1400;
        this.levelHeight = 540;
        this.camera = { x: 0, y: 0 };
        this.timeLeft = 300;
        this.timerAccumulator = 0;

        // Player setup for Phase 6 (Cajulim Platformer Hero)
        this.player.x = 120;
        this.player.y = 384;
        this.player.w = 48;
        this.player.h = 76;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing = 1;
        this.player.animState = 'idle';
        this.player.isDead = false;
        this.player.invulnerableTimer = 0;
        this.player.isGrounded = true;
        this.player.grounded = true;
        this.lives = 5; // Cajulim pode levar 5 golpes no Chefão Final

        // Phase 6 State:
        // 'INTRO' -> 'FIGHT' -> 'BOSS_DEFEATED' -> 'COMMUNITY_SERVICE' -> 'VICTORY'
        this.phase6State = 'FIGHT';
        this.bossIntroTimer = 2.0;

        // Ground & Scaffolding Platforms (Praça Central)
        this.platforms = [
            // Calçada/Asfalto da praça
            { x: 0, y: 460, w: 1400, h: 80, type: 'ground' },

            // Andaime Oeste (2 andares)
            { x: 100, y: 350, w: 180, h: 14, type: 'scaffold' },
            { x: 130, y: 240, w: 140, h: 14, type: 'scaffold' },

            // Andaime Central (Torre da Praça - 2 andares)
            { x: 520, y: 330, w: 200, h: 14, type: 'scaffold' },
            { x: 560, y: 200, w: 140, h: 14, type: 'scaffold' },

            // Andaime Leste (2 andares)
            { x: 940, y: 350, w: 180, h: 14, type: 'scaffold' },
            { x: 970, y: 240, w: 140, h: 14, type: 'scaffold' }
        ];

        // Caçambas-Trampolim de Coleta Seletiva
        this.springDumpsters = [
            { x: 360, y: 424, w: 56, h: 36, color: '#2563eb', label: 'PAPEL', bounce: 0, scaleY: 1.0 },
            { x: 820, y: 424, w: 56, h: 36, color: '#16a34a', label: 'VIDRO', bounce: 0, scaleY: 1.0 }
        ];

        // Mecha-Trator Poluidor 9000 & Barão do Entulho
        this.boss = {
            x: 920,
            y: 350,
            w: 160,
            h: 110,
            vx: -130,
            facing: -1,
            hp: 4,
            maxHp: 4,
            phase: 1, // 1: Pá de Sucata (4-3 HP), 2: Pneus e Óleo (2 HP), 3: Sobrecarga (1 HP), 0: Derrotado
            state: 'DRIVE', // 'DRIVE', 'RAM_PREP', 'RAMMING', 'SHOOT_DEBRIS', 'HURT', 'STUNNED', 'DEFEATED'
            stateTimer: 3.5,
            hurtTimer: 0,
            invulnerableTimer: 0,
            smokeTimer: 0,
            flashTimer: 0,
            ramDuration: 0,
            debrisCooldown: 2.5,
            oilCooldown: 4.0,
            tireCooldown: 3.5,
            exhaustPuffs: [],
            sparks: []
        };

        // Projectiles & Hazards
        this.bossDebris = [];
        this.bossTires = [];
        this.bossOilPuddles = [];
        this.phase6Particles = [];
        this.bossDefeatTimer = 0;
        this.communityServiceTimer = 0;
    }

    getTimingParams() {
        const idx = Math.min(4, Math.max(1, this.currentTruckIndex || 1));
        // Gentle, accessible difficulty: Trucks 3 and 4 are fair and enjoyable!
        const speeds = [0, 85, 105, 125, 140];
        const greenWidths = [0, 22, 20, 18, 17]; // Half-width from 50 (e.g. 18 means 32..68 is green, 36% of the bar!)
        const yellowWidths = [0, 40, 38, 36, 35]; // Covers 70% of the entire bar!
        return {
            speed: speeds[idx],
            green: greenWidths[idx],
            yellow: yellowWidths[idx]
        };
    }

    restartLevel() {
        this.initLevel();
        this.state = 'PLAYING';
        if (window.soundManager) {
            window.soundManager.startMusic(this.currentPhase === 6 ? 'boss' : 'stage');
        }
        this.showTip(`Fase ${this.currentPhase} reiniciada! Boa sorte!`, 2.5);
    }

    pollGamepad() {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
        const gamepads = navigator.getGamepads();
        if (!gamepads) return;
        const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
        if (!gp) return;

        const deadzone = 0.28;
        const stickX = (gp.axes && gp.axes[0] !== undefined) ? gp.axes[0] : 0;
        const stickY = (gp.axes && gp.axes[1] !== undefined) ? gp.axes[1] : 0;

        const gpLeft = (gp.buttons[14] && gp.buttons[14].pressed) || (stickX < -deadzone);
        const gpRight = (gp.buttons[15] && gp.buttons[15].pressed) || (stickX > deadzone);
        const gpUp = (gp.buttons[12] && gp.buttons[12].pressed) || (stickY < -deadzone);
        const gpDown = (gp.buttons[13] && gp.buttons[13].pressed) || (stickY > deadzone);

        // Buttons 0 (A), 1 (B), 2 (X), 3 (Y), 4 (LB), 5 (RB), 6 (LT), 7 (RT)
        const gpJump = [0, 1, 2, 3, 4, 5, 6, 7].some(i => gp.buttons[i] && gp.buttons[i].pressed);

        if (gpLeft) this.keys.left = true;
        if (gpRight) this.keys.right = true;
        if (gpUp) this.keys.up = true;
        if (gpDown) this.keys.down = true;

        if (gpJump) {
            this.gamepadJumpHeld = true;
            if (!this.keys.jumpHeld) {
                this.keys.jump = true;
                this.player.jumpBuffer = 0.15;
            }
            this.keys.jumpHeld = true;
        } else {
            this.gamepadJumpHeld = false;
            if (!this.keyboardJumpHeld) {
                this.keys.jumpHeld = false;
            }
        }
    }

    update(dt) {
        this.pollGamepad();
        if (this.state === 'PLAYING') {
            this.updateTimer(dt);
            if (this.currentPhase === 1) {
                this.updatePlayer(dt);
                this.updateBlocks(dt);
                this.updateItems(dt);
                this.checkSignposts();
                this.checkGoal();
            } else if (this.currentPhase === 2) {
                this.updateTruckPlayer(dt);
                this.updateHazards(dt);
                this.updateTrafficLights(dt);
                this.updateItems(dt);
                this.checkSignposts();
                this.checkGoal();
            } else if (this.currentPhase === 3) {
                this.updatePhase3(dt);
            } else if (this.currentPhase === 4) {
                this.updatePhase4(dt);
            } else if (this.currentPhase === 5) {
                this.updatePhase5(dt);
            } else if (this.currentPhase === 6) {
                this.updatePhase6(dt);
            }
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
        } else if (this.state === 'LEVEL_CLEAR') {
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
            if (this.currentPhase === 1) {
                this.player.animState = 'win';
                this.player.animFrame = 0;
            }
            this.levelClearTimer = (this.levelClearTimer || 0) + dt;
            if (this.levelClearTimer >= 3.2) {
                this.nextPhase();
            }
        } else if (this.state === 'GAME_OVER') {
            this.gameOverTimer = (this.gameOverTimer || 0) + dt;
            if (this.gameOverTimer >= 4.0) {
                this.restartLevel();
            }
        } else if (this.state === 'CUTSCENE') {
            this.updateCutscene(dt);
        }

        if (this.state === 'CUTSCENE' || this.currentPhase === 3) {
            this.camera.x = 0;
            this.camera.y = 0;
        } else {
            this.updateCamera();
        }
        if (this.tipTimer > 0) this.tipTimer -= dt;
    }

    updatePhase3(dt) {
        const p = this.player;
        const targetX = this.dockTargetX;
        const params = this.getTimingParams();

        if (this.phase3State === 'TRUCK_ENTER') {
            // Next truck drives onto the upper deck automatically from the left
            p.vx = 220;
            p.x += p.vx * dt;
            if (p.x >= 60) {
                p.x = 60;
                p.vx = 0;
                this.phase3State = 'DOCKING';
                this.dockAlignedTimer = 0;
                this.showTip(`Caminhão #${this.currentTruckIndex}/4 na plataforma! Dê ré até a calha!`, 3.0);
            }
        } else if (this.phase3State === 'DOCKING') {
            let moveDir = 0;
            if (this.keys.left) moveDir -= 1;
            if (this.keys.right) moveDir += 1;

            // Maneuver truck on the upper deck (x between 20 and 375)
            const dockSpeed = 160;
            if (moveDir !== 0) {
                p.vx += moveDir * 400 * dt;
                if (Math.abs(p.vx) > dockSpeed) p.vx = moveDir * dockSpeed;

                // Exhaust smoke
                if (Math.random() < 0.25) {
                    this.spawnSmoke(p.x + 25, p.y + p.h - 15);
                }
            } else {
                p.vx *= Math.pow(0.7, dt * 60);
                if (Math.abs(p.vx) < 5) p.vx = 0;
            }

            p.x += p.vx * dt;
            if (p.x < 20) { p.x = 20; p.vx = 0; }
            if (p.x > 375) { p.x = 375; p.vx = 0; } // Can't drive off chute edge

            // Dock distance in meters (0 when at targetX)
            const diff = Math.abs(p.x - targetX);
            this.dockDistance = Math.max(0, (targetX - p.x) / 35).toFixed(1);

            // Back-up beep sound when moving towards dock
            if (p.vx > 10) {
                this.dockBeepTimer += dt;
                const beepInterval = Math.max(0.2, (targetX - p.x) / 350);
                if (this.dockBeepTimer >= beepInterval) {
                    this.dockBeepTimer = 0;
                    if (window.soundManager && window.soundManager.playDockBeep) {
                        window.soundManager.playDockBeep();
                    }
                }
            }

            // Aligned check: within 16px of targetX
            if (diff <= 16) {
                this.showTip('🟢 DOCA ALINHADA! Aperte [ESPACO] ou [W] para travar as rodas!', 1.0);
                if (this.keys.jump || Math.abs(p.vx) < 10) {
                    this.dockAlignedTimer += dt;
                    if (this.keys.jump || this.dockAlignedTimer >= 1.0) {
                        this.phase3State = 'ALIGNED';
                        p.vx = 0;
                        p.x = targetX;
                        if (window.soundManager && window.soundManager.playDockSuccess) {
                            window.soundManager.playDockSuccess();
                        }
                        this.score += 200;
                        this.addFloatingText(p.x + p.w / 2, p.y - 20, 'RODAS TRAVADAS! +200 PTS', '#00ff88');
                        this.spawnSparkles(p.x + p.w, p.y + 40, 25);
                        this.alignedTimer = 0;
                        this.keys.jump = false;
                        this.keys.jumpHeld = false;
                    }
                }
            } else {
                this.dockAlignedTimer = 0;
                if (p.x < targetX - 50) {
                    this.showTip(`Atracamento na Doca (${this.currentTruckIndex}/4): Dê ré até a calha (Faltam ${this.dockDistance}m)`, 0.5);
                } else {
                    this.showTip('Reduza a velocidade! Quase alinhado...', 0.5);
                }
            }
        } else if (this.phase3State === 'ALIGNED') {
            p.vx = 0;
            this.alignedTimer = (this.alignedTimer || 0) + dt;
            if (this.alignedTimer >= 0.5) {
                this.phase3State = 'TIMING_GAME';
                this.timingNeedlePos = 15;
                this.timingNeedleDir = 1;
                this.timingResult = null;
                this.timingResultTimer = 0;
                this.keys.jump = false;
                this.keys.jumpHeld = false;
                this.showTip('🎯 MIRA HIDRÁULICA: Aperte [ESPACO] quando a agulha estiver no VERDE!', 4.0);
            }
        } else if (this.phase3State === 'TIMING_GAME') {
            p.vx = 0;
            if (this.timingResult === null) {
                // Needle oscillates back and forth continuously
                this.timingNeedlePos += this.timingNeedleDir * params.speed * dt;
                if (this.timingNeedlePos >= 98) {
                    this.timingNeedlePos = 98;
                    this.timingNeedleDir = -1;
                } else if (this.timingNeedlePos <= 2) {
                    this.timingNeedlePos = 2;
                    this.timingNeedleDir = 1;
                }

                // Player triggers timing hit with Space or W or Up
                if (this.keys.jump || this.keys.up) {
                    this.keys.jump = false;
                    this.keys.jumpHeld = false;
                    const distCenter = Math.abs(this.timingNeedlePos - 50);
                    const remainingInTruck = Math.max(0, this.truckCapacity - this.truckDumped);

                    if (distCenter <= params.green) {
                        // 🟢 VERDE: DESPEJO TOTAL! Força máxima!
                        this.timingResult = 'PERFECT';
                        this.dumpSpeedMultiplier = 2.4;
                        this.score += 500;
                        this.roundDumpTarget = remainingInTruck; // Dumps ALL remaining!
                        this.addFloatingText(480, 95, '🎯 PERFEITO! FORÇA MÁXIMA! (DESPEJO TOTAL) +500 PTS', '#4ade80');
                        this.spawnSparkles(480, 130, 35);
                        if (window.soundManager && window.soundManager.playTimingHitPerfect) {
                            window.soundManager.playTimingHitPerfect();
                        }
                    } else if (distCenter <= params.yellow) {
                        // 🟡 AMARELO: DESPEJO PARCIAL (POUCO LIXO) e tenta novamente!
                        this.timingResult = 'GOOD';
                        this.dumpSpeedMultiplier = 1.3;
                        this.score += 200;
                        this.roundDumpTarget = Math.min(2.5, remainingInTruck); // Dumps partial (pouco lixo!)
                        this.addFloatingText(480, 95, `👍 BOM! PRESSÃO PARCIAL (+${this.roundDumpTarget.toFixed(1)}t) +200 PTS`, '#facc15');
                        if (window.soundManager && window.soundManager.playTimingHitGood) {
                            window.soundManager.playTimingHitGood();
                        }
                    } else {
                        // 🔴 VERMELHO: NÃO JOGA NADA! Tenta novamente!
                        this.timingResult = 'MISS';
                        this.dumpSpeedMultiplier = 0.5;
                        this.score += 10;
                        this.roundDumpTarget = 0; // ZERO dumped!
                        this.addFloatingText(480, 95, '⚠️ PRESSÃO INSUFICIENTE! NADA DESPEJADO', '#ef4444');
                        if (window.soundManager && window.soundManager.playTimingHitMiss) {
                            window.soundManager.playTimingHitMiss();
                        }
                    }
                    this.timingResultTimer = 0;
                }
            } else {
                this.timingResultTimer += dt;
                if (this.timingResultTimer >= 0.75) {
                    if (this.timingResult === 'MISS') {
                        // VERMELHO: Não joga nada de lixo! Volta direto para a mira!
                        this.timingResult = null;
                        this.timingResultTimer = 0;
                        this.timingNeedlePos = 15;
                        this.timingNeedleDir = 1;
                        const remain = (this.truckCapacity - this.truckDumped).toFixed(1);
                        this.showTip(`Pressão insuficiente! Tente no VERDE ou AMARELO! Faltam ${remain}t no caminhão`, 3.0);
                    } else {
                        // AMARELO ou VERDE: Despeja a quantidade planejada!
                        this.phase3State = 'DUMPING';
                        this.roundDumped = 0;
                        this.dumpAngle = 0;
                        const actionDesc = this.timingResult === 'PERFECT' ? 'Despejo Total' : `Despejo Parcial (+${this.roundDumpTarget.toFixed(1)}t)`;
                        this.showTip(`Basculando Caçamba #${this.currentTruckIndex}: ${actionDesc}...`, 2.5);
                    }
                }
            }
        } else if (this.phase3State === 'DUMPING') {
            p.vx = 0;

            if (this.roundDumpTarget - this.roundDumped > 0.05) {
                // Hydraulic lift: front lifts UP towards sky (0° to 42°)
                this.dumpAngle = Math.min(42, this.dumpAngle + (28 * this.dumpSpeedMultiplier) * dt);

                // Hydraulic pump sound
                this.hydraulicSoundTimer += dt;
                if (this.hydraulicSoundTimer >= 0.12) {
                    this.hydraulicSoundTimer = 0;
                    if (window.soundManager && window.soundManager.playHydraulic) {
                        window.soundManager.playHydraulic();
                    }
                }

                // Waste pours out through the chute into the carreta
                if (this.dumpAngle >= 12) {
                    this.dumpParticleTimer += dt;
                    if (this.dumpParticleTimer >= 0.04) {
                        this.dumpParticleTimer = 0;
                        this.spawnDumpTrashParticle(p.x + 105, p.y + 15);
                        if (window.soundManager && window.soundManager.playDumpRumble && Math.random() < 0.35) {
                            window.soundManager.playDumpRumble();
                        }
                    }

                    // Pour rate: rapid and satisfying
                    const dumpRate = (3.6 * this.dumpSpeedMultiplier) * dt;
                    const toDump = Math.min(dumpRate, this.roundDumpTarget - this.roundDumped);
                    this.roundDumped += toDump;
                    this.truckDumped = Math.min(this.truckCapacity, this.truckDumped + toDump);
                    this.trailerLoad = Math.min(this.totalTrailerCapacity, this.trailerLoad + toDump);
                    this.dumpProgress = Math.min(100, Math.floor((this.trailerLoad / this.totalTrailerCapacity) * 100));
                    this.score += Math.floor(toDump * 40);

                    // Real-time HUD guidance
                    const remain = Math.max(0, this.truckCapacity - this.truckDumped).toFixed(1);
                    this.showTip(`Despejando Caminhão #${this.currentTruckIndex}: ${this.truckDumped.toFixed(1)} / ${this.truckCapacity}t (Faltam ${remain}t)`, 0.4);
                }
            } else {
                // Finished dumping for this round!
                this.roundDumped = this.roundDumpTarget;

                // Lower bed back down promptly (speed 55 deg/s)
                this.dumpAngle = Math.max(0, this.dumpAngle - 55 * dt);
                this.showTip(`Caçamba #${this.currentTruckIndex} recolhendo pistão...`, 0.4);

                if (this.dumpAngle <= 0.5) {
                    this.dumpAngle = 0;

                    // Check if truck is completely empty (7.5t dumped)
                    if (this.truckDumped >= this.truckCapacity - 0.05) {
                        // Truck 100% finished!
                        this.truckDumped = this.truckCapacity;
                        this.phase3State = 'TRUCK_EXIT';
                        this.exitTimer = 0;
                        this.addFloatingText(p.x + 60, p.y - 20, `CAMINHÃO #${this.currentTruckIndex} 100% DESCARREGADO!`, '#38bdf8');
                        this.spawnSparkles(p.x + 60, p.y + 20, 25);
                        if (window.soundManager && window.soundManager.playHorn) {
                            window.soundManager.playHorn();
                        }
                    } else {
                        // Truck still has waste left (e.g. after yellow)! Player tries timing again!
                        this.phase3State = 'TIMING_GAME';
                        this.timingResult = null;
                        this.timingResultTimer = 0;
                        this.timingNeedlePos = 20;
                        this.timingNeedleDir = 1;
                        const remain = (this.truckCapacity - this.truckDumped).toFixed(1);
                        this.addFloatingText(480, 95, `👍 RESTAM ${remain}t! TENTE A MIRA NOVAMENTE!`, '#facc15');
                        this.showTip(`Caminhão #${this.currentTruckIndex}: Restam ${remain}t no baú! Tente acertar no VERDE!`, 4.0);
                    }
                }
            }
        } else if (this.phase3State === 'TRUCK_EXIT') {
            // Truck accelerates left to leave the platform
            const exitSpeed = (this.keys.left || this.keys.a) ? 340 : 250;
            p.vx = -exitSpeed;
            p.x += p.vx * dt;

            // Exhaust smoke puffs as it leaves
            if (Math.random() < 0.25) {
                this.spawnSmoke(p.x + 10, p.y + p.h - 15);
            }

            if (p.x < -140) {
                // Exited deck completely
                if (this.currentTruckIndex < this.totalTrucks) {
                    this.currentTruckIndex++;
                    this.phase3State = 'TRUCK_ENTER';
                    p.x = -130;
                    p.vx = 220;
                    this.truckDumped = 0;
                    this.roundDumped = 0;
                    this.roundDumpTarget = 0;
                    this.dumpAngle = 0;
                    this.timingResult = null;
                    this.timingResultTimer = 0;
                    this.dockAlignedTimer = 0;
                    this.dockBeepTimer = 0;
                    this.supervisor.cheer = true;
                    this.showTip(`Caminhão #${this.currentTruckIndex}/4 na doca! Dê ré até a calha!`, 3.0);
                } else {
                    // All 4 trucks finished! 30 tons full!
                    this.phase3State = 'COMPACTING';
                    this.phase3CompleteTimer = 0;
                    this.supervisor.cheer = true;
                    this.addFloatingText(650, 240, 'CARRETA 30t COMPLETA!', '#00ff88');
                    this.spawnSparkles(650, 320, 50);
                    if (window.soundManager && window.soundManager.playHorn) {
                        window.soundManager.playHorn();
                    }
                }
            }
        } else if (this.phase3State === 'COMPACTING') {
            p.vx = 0;
            // Roll green vinyl security tarp over the trailer
            this.tarpCoverProgress = Math.min(100, this.tarpCoverProgress + 50 * dt);

            if (this.tarpCoverProgress >= 100) {
                this.phase3CompleteTimer = (this.phase3CompleteTimer || 0) + dt;
                if (this.phase3CompleteTimer >= 0.8) {
                    this.phase3State = 'COMPLETE';
                    if (window.soundManager && window.soundManager.playHorn) {
                        window.soundManager.playHorn();
                    }
                    this.levelClear();
                }
            }
        }
    }

    spawnDumpTrashParticle(x, y) {
        const types = ['bag', 'can', 'bottle', 'paper'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        const p = {
            x: x + (Math.random() * 8 - 4),
            y: y + (Math.random() * 6 - 3),
            vx: 75 + Math.random() * 55, // Falls right through the chute into the trailer
            vy: 30 + Math.random() * 40,
            gravity: 460,
            type: chosen,
            size: Math.random() * 6 + 6,
            color: chosen === 'bag' ? '#1e293b' : chosen === 'can' ? '#eab308' : chosen === 'bottle' ? '#38bdf8' : '#34d399',
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 8,
            life: 1.2,
            maxLife: 1.2,
            targetY: 380 + Math.random() * 50 // Lands in the carreta hopper
        };
        this.particles.push(p);
    }

    updatePhase4TrafficLights(dt) {
        if (!this.trafficLights) return;
        const p = this.player;
        if (p.isDead) return;

        for (const tl of this.trafficLights) {
            const truckFront = p.x + p.w;
            const dist = tl.x - truckFront;

            // Approaching traffic light zone
            if (dist > -40 && dist < 240) {
                if (tl.state === 'RED') {
                    if (this.speedKmh < 10) {
                        // Truck is stopped or stopping to wait for green!
                        tl.timer -= dt;
                        const remaining = Math.max(0, Math.ceil(tl.timer));
                        this.showTip(`🛑 Sinal Vermelho! Carreta aguardando verde... (${remaining}s)`, 0.3);
                        
                        if (tl.timer <= 0.8 && tl.state === 'RED') {
                            tl.state = 'YELLOW';
                        }
                        if (tl.timer <= 0) {
                            tl.state = 'GREEN';
                            tl.waited = true;
                            if (window.soundManager) window.soundManager.playCollect('star');
                            this.score += 200;
                            this.addFloatingText(tl.x, tl.y - 15, '+200 SINAL VERDE! 🟢', '#22c55e');
                            this.showTip('🟢 Sinal Verde! Carreta pode acelerar com segurança!', 3.0);
                        }
                    } else {
                        this.showTip('🛑 PERIGO! Pare a carreta! Avançar no vermelho é FATAL!', 0.3);
                    }
                } else if (tl.state === 'YELLOW') {
                    tl.timer -= dt;
                    if (tl.timer <= 0) {
                        tl.state = 'GREEN';
                        tl.waited = true;
                        if (window.soundManager) window.soundManager.playCollect('star');
                        this.score += 200;
                        this.addFloatingText(tl.x, tl.y - 15, '+200 SINAL VERDE! 🟢', '#22c55e');
                        this.showTip('🟢 Sinal Verde! Carreta pode acelerar com segurança!', 3.0);
                    }
                }
            }

            // Infraction: driving past while RED -> FATAL ACCIDENT!
            if (p.x + p.w > tl.x - 10 && !tl.passed) {
                if (tl.state === 'RED') {
                    tl.passed = true;
                    if (window.soundManager) window.soundManager.playHurt();
                    this.score = Math.max(0, this.score - 200);
                    this.spawnSparkles(tl.x, tl.y + 20, 40);
                    this.addFloatingText(p.x, p.y - 50, '☠️ PASSOU NO VERMELHO! FATAL! ☠️', '#ef4444');
                    this.killPlayer('🚨 Acidente Fatal! A carreta avançou o sinal vermelho!');
                    tl.state = 'GREEN';
                    tl.timer = 0;
                    tl.waited = true;
                    return;
                } else {
                    tl.passed = true;
                    if (!tl.waited) {
                        this.score += 50;
                        this.addFloatingText(tl.x, tl.y - 15, '+50 Cruzou no Verde! 🟢', '#22c55e');
                    }
                }
            }
        }
    }

    updatePhase4(dt) {
        const p = this.player;
        const trailer = this.trailer;
        if (!trailer) return;

        // 0. Update traffic lights
        this.updatePhase4TrafficLights(dt);

        // 1. Controls & Engine Power
        const cabSlope = this.getDuneAngle(p.x);
        const trailerSlope = this.getDuneAngle(trailer.x);
        trailer.angle = trailerSlope;

        // Tração 6x4 Reduzida
        this.tracaoReduzidaActive = !!(this.keys.up || this.keys.jumpHeld);

        // Freio Motor (Retarder)
        this.freioMotorActive = !!this.keys.down;

        let accelKmh = 0;
        if (this.keys.right && !this.scaleAutoBraking) {
            if (this.tracaoReduzidaActive) {
                // High torque crawling power, tops out around 50 km/h
                accelKmh = this.speedKmh < 50 ? 65 : 8;
            } else {
                // Normal acceleration
                accelKmh = this.speedKmh < 80 ? 38 : 5;
            }
        } else if (this.keys.left) {
            // Service foot brakes
            accelKmh = -65;
        }

        // Freio Motor Retarder deceleration
        if (this.freioMotorActive) {
            accelKmh -= 48;
            this.retarderTimer -= dt;
            if (this.retarderTimer <= 0) {
                if (window.soundManager && window.soundManager.playEngineBrake) {
                    window.soundManager.playEngineBrake();
                }
                this.retarderTimer = 0.4;
            }
            this.spawnAirPuff(p.x + 36, p.y + 10);
        } else {
            this.retarderTimer = 0;
        }

        // Gravity effect along dune slope:
        const slopeForce = -Math.sin(cabSlope) * 32;

        // Sand rolling resistance
        const rollingFriction = 8;

        // Update Speed
        this.speedKmh += (accelKmh + slopeForce - rollingFriction) * dt;
        if (this.speedKmh < 0) this.speedKmh = 0;
        if (this.speedKmh > 95) this.speedKmh = 95;

        // Convert speed to px/sec
        p.vx = (this.speedKmh * 1000 / 3600) * 8.5;
        p.x += p.vx * dt;
        p.y = this.getDuneHeight(p.x) - 52;

        // Trailer follows hitch
        trailer.x = p.x - 185;
        trailer.y = this.getDuneHeight(trailer.x) - 58;

        // 2. Dune Curvature & Cargo Stability Physics (STRICT 60 KM/H LIMIT)
        const curvature = this.getDuneCurvature(trailer.x);
        const isBouncing = trailer.bounceY < -2.5;
        const isExcessSpeed = this.speedKmh > 60; // NÃO PODE PASSAR DE 60 KM/H!

        if (isExcessSpeed || (curvature > 0.0003 && this.speedKmh > 55) || isBouncing) {
            const excess = Math.max(0, this.speedKmh - 60);
            const launchLift = excess * Math.max(0.0002, curvature) * 3500;
            trailer.bounceVy -= launchLift * dt;

            // Stability drain when exceeding 60 km/h
            const drain = (excess * 2.8 + Math.abs(trailer.bounceY) * 3.0) * dt;
            this.cargoStability = Math.max(10, this.cargoStability - drain);
            this.cargoWeight = Math.max(25000, this.cargoWeight - Math.round(drain * 40));

            // Sound & warnings
            this.rattleTimer -= dt;
            if (this.rattleTimer <= 0) {
                if (window.soundManager && window.soundManager.playCargoRattle) {
                    window.soundManager.playCargoRattle();
                }
                this.rattleTimer = 0.3;
            }

            // Spawn lost trash tumbling out
            if (Math.random() < 0.35) {
                this.spawnTrashDrop(trailer.x + 30, trailer.y + 10);
            }

            this.excessSpeedWarnTimer -= dt;
            if (this.excessSpeedWarnTimer <= 0) {
                this.addFloatingText(p.x + 40, p.y - 45, '⚠ LIMITE 60 KM/H! REDUZA!', '#ef4444');
                this.showTip('⚠ Atenção: Não ultrapasse 60 km/h para não danificar a carga pesada!', 2.0);
                this.excessSpeedWarnTimer = 1.3;
            }
        } else {
            this.rattleTimer = 0;
        }

        // Trailer spring-damper bounce simulation
        const springK = 85;
        const dampingK = 11;
        trailer.bounceVy += (-trailer.bounceY * springK - trailer.bounceVy * dampingK) * dt;
        trailer.bounceY += trailer.bounceVy * dt;
        if (trailer.bounceY > 4) {
            trailer.bounceY = 4;
            trailer.bounceVy = 0;
        }

        // Steep climb struggle tip
        if (cabSlope < -0.12 && this.speedKmh < 22 && !this.tracaoReduzidaActive) {
            this.stallTipTimer -= dt;
            if (this.stallTipTimer <= 0) {
                this.showTip('Subida íngreme! Segure [W ou ESPACO] para acionar a Tração 6x4!', 2.5);
                this.stallTipTimer = 3.5;
            }
        }

        // Exhaust smoke puffs when throttling
        if (this.keys.right && Math.random() < 0.25) {
            this.spawnSmoke(p.x + 36, p.y + 12);
        }

        // 3. Collectibles Collision
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const dist = Math.hypot(p.x + 50 - item.x, (p.y + 35) - item.y);
            if (dist < 65) {
                this.score += item.points;
                if (item.type === 'biodiesel') {
                    this.cargoStability = Math.min(100, this.cargoStability + 5);
                    this.addFloatingText(item.x, item.y - 20, '+250 BIODIESEL B20', '#22c55e');
                } else if (item.type === 'star') {
                    this.addFloatingText(item.x, item.y - 20, '+500 BANDEIRA DOURADA!', '#facc15');
                } else if (item.type === 'wrench') {
                    this.cargoStability = Math.min(100, this.cargoStability + 15);
                    this.addFloatingText(item.x, item.y - 20, '+200 CINTA FIXADA (+15%)', '#38bdf8');
                }
                if (window.soundManager) window.soundManager.playCollect();
                this.spawnSparkles(item.x, item.y, 16);
                this.items.splice(i, 1);
            }
        }

        // Check educational signposts
        this.checkSignposts();

        // 4. ANTT Weigh Station: Rampa, Balança com Freio Automático e Peso Real (x: 3970..4350)
        const realTotalWeight = 15000 + this.cargoWeight; // 15t Tara + 30t Carga = ~45.000 kg

        if (p.x >= 3960 && p.x < 4070) {
            this.showTip('↗️ Subindo a Rampa da Balança Rodoviária! Reduza a velocidade!', 0.3);
        }

        if (p.x >= 4070 && p.x <= 4250) {
            // O caminhão freia automaticamente na balança
            this.scaleAutoBraking = true;
            if (this.speedKmh > 0) {
                this.speedKmh = Math.max(0, this.speedKmh - 38 * dt);
                if (this.speedKmh < 1.0) this.speedKmh = 0;
                if (Math.random() < 0.25) this.spawnAirPuff(p.x + 36, p.y + 10);
            }

            if (!this.scaleWeighed) {
                this.scaleTimer += dt;
                // Animação dos dígitos de pesagem subindo até o peso real
                const progress = Math.min(1.0, this.scaleTimer / 1.5);
                this.scaleWeightDisplay = Math.round(progress * realTotalWeight);
                this.scaleReading = `PESANDO EIXOS: ${this.scaleWeightDisplay.toLocaleString('pt-BR')} kg`;
                this.showTip(`🛑 Freio Automático acionado na Balança! Pesando eixos... (${this.scaleWeightDisplay} kg)`, 0.3);

                if (this.scaleTimer >= 1.6) {
                    this.scaleWeighed = true;
                    this.scaleWeightDisplay = realTotalWeight;
                    this.scaleReading = `PESO REAL: ${realTotalWeight.toLocaleString('pt-BR')} kg (OK!)`;
                    if (window.soundManager && window.soundManager.playScaleBeep) {
                        window.soundManager.playScaleBeep();
                    }
                    if (window.soundManager && window.soundManager.playHorn) {
                        window.soundManager.playHorn();
                    }
                    this.addFloatingText(p.x + 50, p.y - 45, `PESO REAL: ${realTotalWeight.toLocaleString('pt-BR')} kg OK! ⚖️`, '#22c55e');
                    this.score += 1000;
                    this.showTip(`🟢 PESO REAL: ${realTotalWeight.toLocaleString('pt-BR')} kg! Carga Aprovada pela ANTT!`, 3.5);
                }
            } else {
                this.scaleReading = `PESO REAL: ${realTotalWeight.toLocaleString('pt-BR')} kg (APROVADO 🟢)`;
            }
        }

        // Portão abre suavemente se pesado
        if (this.scaleWeighed) {
            this.gateAngle = Math.min(78, this.gateAngle + 45 * dt);
            this.scaleFinishedTimer = (this.scaleFinishedTimer || 0) + dt;

            // Após pesar e abrir o portão, passa automaticamente para a próxima fase!
            if (this.scaleFinishedTimer >= 2.4) {
                this.levelClear();
            }
        }

        // Closed barrier stops unweighed vehicle
        if (!this.scaleWeighed && p.x > 4260) {
            p.x = 4260;
            this.speedKmh = 0;
            this.addFloatingText(4260, 260, 'PORTÃO FECHADO! REALIZE A PESAGEM!', '#ef4444');
        }

        // Level Clear condition if advancing through
        if (this.scaleWeighed && p.x >= 4350) {
            this.levelClear();
        }

        // Update lost trash particles & air puffs
        this.updatePhase4Particles(dt);
    }

    spawnAirPuff(x, y) {
        if (!this.airPuffs) this.airPuffs = [];
        this.airPuffs.push({
            x: x,
            y: y,
            vx: -30 + Math.random() * 15,
            vy: -40 - Math.random() * 25,
            size: 6,
            life: 0.35,
            maxLife: 0.35
        });
    }

    spawnTrashDrop(x, y) {
        if (!this.lostTrashParticles) this.lostTrashParticles = [];
        const types = ['bag', 'can', 'paper'];
        this.lostTrashParticles.push({
            x: x,
            y: y,
            vx: -60 - Math.random() * 40,
            vy: -40 - Math.random() * 50,
            gravity: 380,
            rot: 0,
            vRot: (Math.random() - 0.5) * 8,
            type: types[Math.floor(Math.random() * types.length)],
            life: 2.0
        });
    }

    updatePhase4Particles(dt) {
        if (this.airPuffs) {
            for (let i = this.airPuffs.length - 1; i >= 0; i--) {
                const puff = this.airPuffs[i];
                puff.x += puff.vx * dt;
                puff.y += puff.vy * dt;
                puff.size += 18 * dt;
                puff.life -= dt;
                if (puff.life <= 0) this.airPuffs.splice(i, 1);
            }
        }
        if (this.lostTrashParticles) {
            for (let i = this.lostTrashParticles.length - 1; i >= 0; i--) {
                const tp = this.lostTrashParticles[i];
                tp.vy += tp.gravity * dt;
                tp.x += tp.vx * dt;
                tp.y += tp.vy * dt;
                tp.rot += tp.vRot * dt;
                const groundY = this.getDuneHeight(tp.x);
                if (tp.y >= groundY - 6) {
                    tp.y = groundY - 6;
                    tp.vx *= 0.6;
                    tp.vy = 0;
                }
                tp.life -= dt;
                if (tp.life <= 0) this.lostTrashParticles.splice(i, 1);
            }
        }
    }

    getPhase5GroundY(x) {
        if (x >= 160 && x <= 820) {
            // Waste Cell 1 (Célula Norte)
            const zA = (this.compactionZones && this.compactionZones[0]) ? this.compactionZones[0].comp : (this.compactionProgress || 0);
            const zB = (this.compactionZones && this.compactionZones[1]) ? this.compactionZones[1].comp : (this.compactionProgress || 0);
            const comp = (zA + zB) / 200;
            return 418 + comp * 24;
        }
        if (x > 820 && x <= 1420) {
            // Waste Cell 2 (Célula Sul em rampa terraceada)
            const zC = (this.compactionZones && this.compactionZones[2]) ? this.compactionZones[2].comp : (this.compactionProgress || 0);
            const zD = (this.compactionZones && this.compactionZones[3]) ? this.compactionZones[3].comp : (this.compactionProgress || 0);
            const comp2 = (zC + zD) / 200;
            return 424 - ((x - 820) / 600) * 16 + comp2 * 20;
        }
        if (x > 1440 && x <= 1680) {
            // Jazida de Argila (Clay quarry mound)
            return 450 - Math.sin(((x - 1440) / 240) * Math.PI) * 22;
        }
        return 460;
    }

    updatePhase5(dt) {
        if (!this.gameTime) this.gameTime = 0;
        this.gameTime += dt;

        const p = this.player;

        // =========================================================================
        // 1. STAGE: TRACTOR ATERRANDO ('COMPACTING' & 'COMPACTING_WAIT_ADVANCE')
        // =========================================================================
        if (this.phase5State === 'COMPACTING' || this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
            let moveDir = 0;
            if (this.keys.left) moveDir -= 1;
            if (this.keys.right) moveDir += 1;

            const maxSpeed = 160;
            if (moveDir !== 0) {
                p.vx += moveDir * 520 * dt;
                if (Math.abs(p.vx) > maxSpeed) p.vx = moveDir * maxSpeed;
                p.facing = moveDir > 0 ? 1 : -1;
            } else {
                p.vx *= Math.pow(0.7, dt * 60);
                if (Math.abs(p.vx) < 5) p.vx = 0;
            }

            p.x += p.vx * dt;
            if (p.x < 100) { p.x = 100; p.vx = 0; }
            if (p.x > 1460) { p.x = 1460; p.vx = 0; }
            p.y = this.getPhase5GroundY(p.x) - 72;

            const isMoving = Math.abs(p.vx) > 10;
            this.tractorEngineSoundTimer = (this.tractorEngineSoundTimer || 0) - dt;
            if (this.tractorEngineSoundTimer <= 0) {
                if (window.soundManager && window.soundManager.playTractorEngine) {
                    window.soundManager.playTractorEngine(isMoving);
                }
                this.tractorEngineSoundTimer = isMoving ? 0.16 : 0.35;
            }

            if (this.phase5State === 'COMPACTING') {
                if (isMoving) {
                    const turbo = (this.keys.jumpHeld || this.bladeLoweredState) ? 2.4 : 1.0;
                    this.compactionProgress = Math.min(100, (this.compactionProgress || 0) + dt * 16.0 * turbo);

                    if (this.compactionZones) {
                        this.compactionZones.forEach(z => {
                            if (p.x >= z.x1 - 40 && p.x <= z.x2 + 40) {
                                z.comp = Math.min(100, z.comp + dt * 30.0 * turbo);
                            }
                        });
                    }

                    // Spreading soil particles
                    if (Math.random() < 0.5) {
                        this.phase5Particles.push({
                            x: p.x + (p.facing > 0 ? 25 : 115) + (Math.random() - 0.5) * 20,
                            y: p.y + 68,
                            vx: -p.facing * (20 + Math.random() * 30),
                            vy: - (10 + Math.random() * 25),
                            size: 4 + Math.random() * 5,
                            color: Math.random() < 0.6 ? '#78350f' : '#d97706',
                            life: 0.6
                        });
                    }
                }

                if (this.compactionProgress >= 100) {
                    this.compactionProgress = 100;
                    if (this.compactionZones) this.compactionZones.forEach(z => z.comp = 100);
                    this.soilCoverProgress = 100;
                    this.phase5State = 'COMPACTING_WAIT_ADVANCE';
                    this.score += 800;
                    if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('star');
                    this.addFloatingText(p.x, p.y - 30, '✔ ATERRAMENTO COMPLETO! APERTE [PULO]!', '#facc15');
                    this.showTip('✔ Aterramento Concluído! Aperte o botão de pulo [ESPACO / K / JOYSTICK] para avançar ao Biogás!', 6.0);
                }
            } else if (this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
                if (this.keys.jump) {
                    this.keys.jump = false;
                    this.phase5State = 'BIOGAS_GENERATION';
                    this.score += 500;
                    if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('star');
                    this.addFloatingText(2450, 310, 'ENTRANDO NA USINA DE BIOGÁS!', '#38bdf8');
                    this.showTip('Etapa 2: Mantenha a pressão na ZONA VERDE (40-70 kPa) com [← / →] até gerar 10.0 MW!', 6.0);
                    p.x = 2450;
                    p.y = 418;
                    p.vx = 0;
                }
            }
        }

        // Backward compatibility if called with SOIL_COVER
        else if (this.phase5State === 'SOIL_COVER') {
            this.soilCoverProgress = 100;
            this.phase5State = 'BIOGAS_GENERATION';
            p.x = 2450;
            p.y = 418;
            p.vx = 0;
        }

        // =========================================================================
        // 2. STAGE: BIOGAS GENERATION ('BIOGAS_GENERATION' & 'BIOGAS_WAIT_ADVANCE')
        // =========================================================================
        else if (this.phase5State === 'BIOGAS_GENERATION' || this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
            p.x = 2450;
            p.y = 418;
            p.vx = 0;

            if (this.phase5State === 'BIOGAS_GENERATION') {
                // Direct pressure adjustment via Left / Right (A / D)
                if (this.keys.left) {
                    this.biogasPressure = Math.max(10, (this.biogasPressure || 50) - 35 * dt);
                }
                if (this.keys.right) {
                    this.biogasPressure = Math.min(95, (this.biogasPressure || 50) + 35 * dt);
                }

                // Relieve / purge pressure with Jump (Space / K / Gamepad)
                if (this.keys.jump) {
                    this.keys.jump = false;
                    if (this.biogasPressure > 52) this.biogasPressure = Math.max(52, this.biogasPressure - 18);
                    else if (this.biogasPressure < 52) this.biogasPressure = Math.min(52, this.biogasPressure + 18);
                    this.filterMoisture = Math.max(0, (this.filterMoisture || 0) - 40);
                    if (window.soundManager && window.soundManager.playPurgeValve) window.soundManager.playPurgeValve();
                    this.addFloatingText(2450, 310, '💧 PRESSÃO PURGADA & ESTABILIZADA!', '#38bdf8');
                    for (let k = 0; k < 8; k++) {
                        this.phase5Particles.push({
                            x: 2360 + (Math.random() - 0.5) * 20,
                            y: 395,
                            vx: - (20 + Math.random() * 40),
                            vy: - (15 + Math.random() * 30),
                            size: 4 + Math.random() * 5,
                            color: '#e0f2fe',
                            life: 0.65
                        });
                    }
                }

                // Subtle organic drift (gentle, easy to manage)
                const drift = Math.sin(this.gameTime * 1.8) * 4.5 * dt;
                this.biogasPressure = Math.max(15, Math.min(90, (this.biogasPressure || 50) + drift));

                // Optimal zone is 40 to 70 kPa
                const isOptimal = this.biogasPressure >= 40 && this.biogasPressure <= 70;

                if (isOptimal) {
                    this.biogasPowerMW = Math.min(10.0, (this.biogasPowerMW || 0) + dt * 2.4);
                    this.flareLit = true;
                    this.flareFlameScale = 1.0 + Math.sin(this.gameTime * 12) * 0.25;
                    this.turbineSpinAngle = (this.turbineSpinAngle || 0) + dt * 25;

                    this.turbineAudioTimer = (this.turbineAudioTimer || 0) - dt;
                    if (this.turbineAudioTimer <= 0) {
                        if (window.soundManager && window.soundManager.playTurbineWhine) {
                            window.soundManager.playTurbineWhine(0.8 + (this.biogasPowerMW / 10.0) * 0.6);
                        }
                        this.turbineAudioTimer = 0.35;
                    }

                    // Electric transmission sparks
                    this.powerGridPulseTimer = (this.powerGridPulseTimer || 0) - dt;
                    if (this.powerGridPulseTimer <= 0) {
                        this.powerGridPulseTimer = 0.12;
                        if (!this.gridSparks) this.gridSparks = [];
                        this.gridSparks.push({
                            x: 2750,
                            y: 215,
                            vx: 220 + Math.random() * 50,
                            vy: - (Math.random() * 12),
                            size: 3 + Math.random() * 3,
                            color: Math.random() < 0.5 ? '#fde047' : '#38bdf8',
                            life: 1.8
                        });
                    }
                } else {
                    this.flareLit = false;
                    this.flareFlameScale = 0.35;
                    this.turbineSpinAngle = (this.turbineSpinAngle || 0) + dt * 4;
                }

                if (this.gridSparks) {
                    for (let i = this.gridSparks.length - 1; i >= 0; i--) {
                        const sp = this.gridSparks[i];
                        sp.x += sp.vx * dt;
                        sp.y += sp.vy * dt;
                        sp.life -= dt;
                        if (sp.life <= 0 || sp.x > 3400) this.gridSparks.splice(i, 1);
                    }
                }

                if (this.biogasPowerMW >= 10.0) {
                    this.biogasPowerMW = 10.0;
                    this.phase5State = 'BIOGAS_WAIT_ADVANCE';
                    this.score += 1200;
                    if (window.soundManager && window.soundManager.playPowerGridBeep) {
                        window.soundManager.playPowerGridBeep();
                    }
                    this.addFloatingText(2450, 310, '⚡ 10.0 MW GERADOS! APERTE [PULO]!', '#38bdf8');
                    this.showTip('⚡ Usina 100% Carregada! Aperte o botão de pulo [ESPACO / K / JOYSTICK] para assumir o Cajulim!', 6.0);
                }
            } else if (this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
                if (this.keys.jump) {
                    this.keys.jump = false;
                    this.phase5State = 'CHORUME_TREATMENT';
                    this.score += 500;
                    if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('star');
                    this.addFloatingText(3600, 310, 'ASSUMINDO O CAJULIM NAS LAGOAS!', '#22c55e');
                    this.showTip('Etapa 3: Cajulim na Estação! Pule [ESPACO / K / JOYSTICK] nas bóias p/ ligar os aeradores e vá ao laboratório!', 6.0);
                    // Spawn Cajulim as platformer hero
                    p.x = 3450;
                    p.y = 350;
                    p.w = 48;
                    p.h = 76;
                    p.vx = 0;
                    p.vy = 0;
                    p.grounded = true;
                    p.animState = 'idle';
                }
            }
        }

        // =========================================================================
        // 3. STAGE: CAJULIM IN THE LAGOONS & ETE LAB ('CHORUME_TREATMENT', 'LAB_ANALYSIS', 'CAJULIM_WAIT_ADVANCE')
        // =========================================================================
        else if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS' || this.phase5State === 'LAB_ANALYSIS' || this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
            let moveDir = 0;
            if (this.keys.left) moveDir -= 1;
            if (this.keys.right) moveDir += 1;

            const runSpeed = 260;
            if (moveDir !== 0) {
                p.vx += moveDir * 700 * dt;
                if (Math.abs(p.vx) > runSpeed) p.vx = moveDir * runSpeed;
                p.facing = moveDir > 0 ? 1 : -1;
                p.animState = 'walk';
                p.animTimer = (p.animTimer || 0) + dt * (Math.abs(p.vx) / 26);
                p.animFrame = Math.floor(p.animTimer) % 8;
            } else {
                p.vx *= Math.pow(0.65, dt * 60);
                if (Math.abs(p.vx) < 5) p.vx = 0;
                p.animState = 'idle';
                p.animTimer = (p.animTimer || 0) + dt * 3.5;
                p.animFrame = Math.floor(p.animTimer) % 4;
            }

            // Preserve jump input intent for this frame across all checks
            const jumpPressed = Boolean(this.keys.jump);

            // Gravity & Real Platformer Jump
            p.vy += 980 * dt;
            if (p.grounded && jumpPressed && this.phase5State !== 'CAJULIM_WAIT_ADVANCE') {
                p.vy = -540;
                p.grounded = false;
                if (window.soundManager && window.soundManager.playJump) window.soundManager.playJump();
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Catwalk platform floor at y = 420
            const floorY = 420 - p.h;
            if (p.y >= floorY) {
                p.y = floorY;
                p.vy = 0;
                p.grounded = true;
            } else {
                p.grounded = false;
                p.animState = 'jump';
                p.animFrame = p.vy < 0 ? 1 : 2;
            }

            // Lagoon boardwalk bounds (x: 3400 to 5120)
            if (p.x < 3400) { p.x = 3400; p.vx = 0; }
            if (p.x > 5120) { p.x = 5120; p.vx = 0; }

            // Check aerators interaction
            if (this.aerators) {
                this.aerators.forEach(a => {
                    a.bobPhase = (a.bobPhase || 0) + dt * 2.5;
                    const nearAerator = Math.abs(p.x - (a.x + 35)) < 65;
                    if (nearAerator && (jumpPressed || Math.abs(p.y - floorY) > 15)) {
                        if (!a.active) {
                            a.active = true;
                            if (window.soundManager && window.soundManager.playAeratorSplash) {
                                window.soundManager.playAeratorSplash();
                            }
                            this.addFloatingText(a.x + 35, 360, '🌀 AERADOR ATIVADO! (120 RPM)', '#38bdf8');
                        }
                    }

                    if (a.active) {
                        a.rpm = Math.min(120, (a.rpm || 0) + dt * 80);
                        a.splashTimer = (a.splashTimer || 0) - dt;
                        if (a.splashTimer <= 0) {
                            a.splashTimer = 0.09;
                            for (let k = 0; k < 4; k++) {
                                this.phase5Particles.push({
                                    x: a.x + 35 + (Math.random() - 0.5) * 40,
                                    y: a.y + 40,
                                    vx: (Math.random() - 0.5) * 70,
                                    vy: - (35 + Math.random() * 45),
                                    size: 3 + Math.random() * 4,
                                    color: this.chorumeTreated > 60 ? '#38bdf8' : '#67e8f9',
                                    life: 0.55
                                });
                            }
                        }
                    }
                });

                // Oxygenation rate
                const activeCount = this.aerators.filter(a => a.active).length;
                if (activeCount > 0) {
                    this.chorumeTreated = Math.min(100, (this.chorumeTreated || 0) + dt * activeCount * 22.0);
                }

                if (this.chorumeTreated >= 100 && (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS')) {
                    this.chorumeTreated = 100;
                    this.phase5State = 'LAB_ANALYSIS';
                    this.score += 1000;
                    if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('star');
                    this.showTip('✔ Chorume 100% Tratado! Caminhe até o Laboratório ETE à direita para certificar a água!', 6.0);
                    this.addFloatingText(4800, 310, 'CHORUME TRATADO! VÁ AO LABORATÓRIO ETE ➜', '#38bdf8');
                }
            }

            // ETE Lab interaction
            const nearLab = p.x >= 4950;
            if (nearLab && this.phase5State === 'LAB_ANALYSIS') {
                if (jumpPressed || this.labSampleTested) {
                    this.keys.jump = false;
                    this.labSampleTested = true;
                    this.labSampleResult = {
                        ph: '7.0 (Neutro)',
                        turbidez: '0.1 NTU (Cristalina)',
                        dqo: '< 30 mg/L',
                        conformidade: '100% Conforme CONAMA 430'
                    };
                    if (window.soundManager && window.soundManager.playLabBeep) window.soundManager.playLabBeep();
                    if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('star');
                    this.score += 1500;
                    this.phase5State = 'CAJULIM_WAIT_ADVANCE';
                    this.addFloatingText(5080, 280, '🧪 AMOSTRA COLETADA! LAUDO: 100% APROVADA!', '#00ff88');

                    for (let k = 0; k < 35; k++) {
                        this.phase5Particles.push({
                            x: 5080 + (Math.random() - 0.5) * 70,
                            y: 350 + (Math.random() - 0.5) * 50,
                            vx: (Math.random() - 0.5) * 140,
                            vy: - (40 + Math.random() * 90),
                            size: 4 + Math.random() * 5,
                            color: Math.random() < 0.5 ? '#38bdf8' : '#4ade80',
                            life: 1.2
                        });
                    }
                    this.showTip('🎉 Aterro Sanitário e Usina Verde 100% Concluídos! Aperte [ESPACO / K / 🎮 PULO] para ver a história!', 6.0);
                }
            } else if (this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
                if (jumpPressed) {
                    this.keys.jump = false;
                    this.phase5State = 'COMPLETE';
                    this.levelClear();
                }
            } else {
                if (jumpPressed) {
                    this.keys.jump = false;
                }
            }
        }

        this.updatePhase5Particles(dt);
    }

    updatePhase5Particles(dt) {
        if (!this.phase5Particles) return;
        for (let i = this.phase5Particles.length - 1; i >= 0; i--) {
            const pt = this.phase5Particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.life -= dt;
            if (pt.life <= 0) this.phase5Particles.splice(i, 1);
        }
    }

    handlePhase5Click(e) {
        if (this.currentPhase !== 5) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = VIRTUAL_WIDTH / rect.width;
        const scaleY = VIRTUAL_HEIGHT / rect.height;
        const screenX = (e.clientX - rect.left) * scaleX;
        const screenY = (e.clientY - rect.top) * scaleY;

        // 1. Advance Prompts when Waiting
        if (this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
            this.keys.jump = true;
            return;
        }
        if (this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
            this.keys.jump = true;
            return;
        }
        if (this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
            this.keys.jump = true;
            return;
        }

        // 2. Interactive On-Screen Action Buttons at Bottom
        if (screenY >= 485 && screenY <= 535) {
            if (this.phase5State === 'COMPACTING') {
                this.bladeLoweredState = !this.bladeLoweredState;
            } else if (this.phase5State === 'BIOGAS_GENERATION') {
                if (screenX >= 200 && screenX <= 380) {
                    this.biogasPressure = Math.max(10, (this.biogasPressure || 50) - 15);
                    if (window.soundManager && window.soundManager.playTractorBlade) window.soundManager.playTractorBlade();
                } else if (screenX >= 400 && screenX <= 580) {
                    this.biogasPressure = Math.min(95, (this.biogasPressure || 50) + 15);
                    if (window.soundManager && window.soundManager.playTractorBlade) window.soundManager.playTractorBlade();
                } else if (screenX >= 600 && screenX <= 820) {
                    this.keys.jump = true;
                }
            } else if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS') {
                if (this.aerators) {
                    const allOn = this.aerators.every(a => a.active);
                    this.aerators.forEach(a => a.active = !allOn);
                    if (window.soundManager && window.soundManager.playAeratorSplash) window.soundManager.playAeratorSplash();
                }
            } else if (this.phase5State === 'LAB_ANALYSIS') {
                this.labSampleTested = true;
            }
        }
    }
    updatePhase6(dt) {
        if (!this.gameTime) this.gameTime = 0;
        this.gameTime += dt;

        const p = this.player;
        const boss = this.boss;

        // 1. Intro sequence
        if (this.phase6State === 'INTRO') {
            this.bossIntroTimer -= dt;
            if (this.bossIntroTimer <= 0) {
                this.phase6State = 'FIGHT';
                this.showTip('⚔️ O BARÃO ATACOU! Pule nas caçambas ou nos andaimes e atinja o capô!', 4.0);
            }
            return;
        }

        // 2. Defeat sequence
        if (this.phase6State === 'BOSS_DEFEATED') {
            this.bossDefeatTimer += dt;
            if (Math.random() < 0.3) {
                this.spawnSparkles(boss.x + Math.random() * boss.w, boss.y + Math.random() * boss.h, 4);
            }
            if (this.bossDefeatTimer >= 2.8 && this.phase6State !== 'COMMUNITY_SERVICE') {
                this.phase6State = 'COMMUNITY_SERVICE';
                this.communityServiceTimer = 0;
                this.showTip('🧹 SERVIÇO COMUNITÁRIO: O Barão agora varre a praça e aprende a reciclar!', 4.5);
            }
            return;
        }

        // 3. Community Service ending
        if (this.phase6State === 'COMMUNITY_SERVICE') {
            this.communityServiceTimer += dt;
            if (this.communityServiceTimer >= 3.8 && this.state !== 'LEVEL_CLEAR') {
                this.levelClear();
            }
            return;
        }

        // 4. Fighting State: Update Player
        if (!p.isDead) {
            if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;

            // Player Horizontal Movement
            let moveDir = 0;
            if (this.keys.left) moveDir -= 1;
            if (this.keys.right) moveDir += 1;

            if (moveDir !== 0) {
                p.facing = moveDir;
                const accel = p.grounded ? PLAYER_ACCEL : PLAYER_ACCEL * 0.75;
                p.vx += moveDir * accel * dt;
                if (Math.abs(p.vx) > PLAYER_SPEED) p.vx = moveDir * PLAYER_SPEED;
                p.animState = 'walk';
                p.animTimer += dt;
                if (p.animTimer > 0.08) {
                    p.animTimer = 0;
                    p.animFrame = (p.animFrame + 1) % 8;
                }
            } else {
                p.vx *= Math.pow(PLAYER_FRICTION, dt * 60);
                if (Math.abs(p.vx) < 10) p.vx = 0;
                p.animState = 'idle';
                p.animTimer += dt;
                if (p.animTimer > 0.25) {
                    p.animTimer = 0;
                    p.animFrame = (p.animFrame + 1) % 4;
                }
            }

            // Check Oil Puddles (reduces friction)
            for (const puddle of this.bossOilPuddles) {
                if (p.grounded && p.x + p.w > puddle.x && p.x < puddle.x + puddle.w && p.y + p.h >= 450) {
                    if (Math.abs(p.vx) > 20) {
                        p.vx *= 1.012; // Slip and slide
                        if (Math.random() < 0.2) this.spawnSmoke(p.x + p.w / 2, p.y + p.h);
                    }
                }
            }

            // Gravity & Jump
            if (p.grounded) p.coyoteTimer = 0.12;
            else p.coyoteTimer -= dt;

            if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

            const canJump = (p.grounded || p.coyoteTimer > 0);
            if (p.jumpBuffer > 0 && canJump) {
                p.vy = JUMP_FORCE;
                p.grounded = false;
                p.coyoteTimer = 0;
                p.jumpBuffer = 0;
                if (window.soundManager && window.soundManager.playJump) window.soundManager.playJump();
            }

            if (this.keys.jumpHeld && p.vy < 0) {
                p.vy += JUMP_HOLD_BOOST * dt;
            }

            p.vy += GRAVITY * dt;
            if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;

            // Apply displacement
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Screen boundaries
            if (p.x < 30) { p.x = 30; p.vx = 0; }
            if (p.x > 1330) { p.x = 1330; p.vx = 0; }

            // Platform Collision (One-way for scaffolds, solid for ground)
            p.grounded = false;
            for (const plat of this.platforms) {
                if (plat.type === 'ground') {
                    if (p.x + p.w > plat.x && p.x < plat.x + plat.w &&
                        p.y + p.h >= plat.y && p.y + p.h <= plat.y + 35 && p.vy >= 0) {
                        p.y = plat.y - p.h;
                        p.vy = 0;
                        p.grounded = true;
                    }
                } else if (plat.type === 'scaffold') {
                    // One-way landing from above
                    const prevY = p.y - p.vy * dt;
                    if (prevY + p.h <= plat.y + 6 && p.y + p.h >= plat.y &&
                        p.x + p.w > plat.x + 4 && p.x < plat.x + plat.w - 4 && p.vy >= 0) {
                        p.y = plat.y - p.h;
                        p.vy = 0;
                        p.grounded = true;
                    }
                }
            }

            // Spring Dumpster Collision
            for (const d of this.springDumpsters) {
                if (d.bounce > 0) d.bounce -= dt * 6;
                d.scaleY = 1.0 + Math.sin(Math.max(0, d.bounce) * Math.PI) * 0.35;
                if (p.vy > 0 && p.x + p.w > d.x && p.x < d.x + d.w &&
                    p.y + p.h >= d.y && p.y + p.h <= d.y + 24) {
                    p.y = d.y - p.h;
                    p.vy = -720; // Super launch!
                    p.grounded = false;
                    d.bounce = 1.0;
                    this.spawnSparkles(d.x + d.w / 2, d.y, 16);
                    this.addFloatingText(d.x + d.w / 2, d.y - 20, 'SUPER PULO! ⬆', '#38bdf8');
                    if (window.soundManager && window.soundManager.playJump) window.soundManager.playJump();
                }
            }

            if (!p.grounded) {
                p.animState = 'jump';
                p.animFrame = p.vy < 0 ? 1 : 2;
            }
        }

        // 5. Update Projectiles
        this.updatePhase6Projectiles(dt);

        // 6. Update Boss AI & Attacks
        this.updatePhase6Boss(dt);
    }

    updatePhase6Projectiles(dt) {
        const p = this.player;

        // Debris
        for (let i = this.bossDebris.length - 1; i >= 0; i--) {
            const d = this.bossDebris[i];
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 620 * dt;
            d.rot += d.vrot * dt;

            if (d.y >= 460) {
                this.spawnSparkles(d.x, 460, 6);
                this.bossDebris.splice(i, 1);
                continue;
            }
            if (p.invulnerableTimer <= 0 && !p.isDead &&
                p.x + p.w > d.x - 14 && p.x < d.x + 14 &&
                p.y + p.h > d.y - 14 && p.y < d.y + 14) {
                this.hurtPlayer(1, 'O entulho do Barão te atingiu!');
                this.bossDebris.splice(i, 1);
            }
        }

        // Bouncing Tires
        for (let i = this.bossTires.length - 1; i >= 0; i--) {
            const t = this.bossTires[i];
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            t.vy += 700 * dt;
            t.rot += (t.vx > 0 ? 9 : -9) * dt;

            if (t.y >= 450) {
                t.y = 450;
                t.vy = -Math.abs(t.vy) * 0.74;
                t.bounces++;
                if (t.bounces > 4 || Math.abs(t.vy) < 45) {
                    this.spawnSparkles(t.x, 450, 8);
                    this.bossTires.splice(i, 1);
                    continue;
                }
            }
            if (p.invulnerableTimer <= 0 && !p.isDead &&
                p.x + p.w > t.x - 18 && p.x < t.x + 18 &&
                p.y + p.h > t.y - 18 && p.y < t.y + 18) {
                this.hurtPlayer(1, 'Cuidado com os pneus quicando!');
                this.bossTires.splice(i, 1);
            }
        }

        // Oil Puddles timer
        for (let i = this.bossOilPuddles.length - 1; i >= 0; i--) {
            const pud = this.bossOilPuddles[i];
            pud.life -= dt;
            if (pud.life <= 0) this.bossOilPuddles.splice(i, 1);
        }

        // Phase 6 Particles
        for (let i = this.phase6Particles.length - 1; i >= 0; i--) {
            const pt = this.phase6Particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.life -= dt;
            if (pt.life <= 0) this.phase6Particles.splice(i, 1);
        }
    }

    updatePhase6Boss(dt) {
        const boss = this.boss;
        const p = this.player;
        if (!boss || boss.state === 'DEFEATED') return;

        // Invulnerability & Hurt timers
        if (boss.hurtTimer > 0) boss.hurtTimer -= dt;
        if (boss.invulnerableTimer > 0) boss.invulnerableTimer -= dt;
        if (boss.flashTimer > 0) boss.flashTimer -= dt;

        // Exhaust smoke puffs
        boss.smokeTimer += dt;
        if (boss.smokeTimer > 0.12) {
            boss.smokeTimer = 0;
            const sx = boss.facing > 0 ? boss.x + 30 : boss.x + boss.w - 30;
            const sy = boss.y + 10;
            this.spawnSmoke(sx, sy);
            if (boss.phase === 3 && Math.random() < 0.4) {
                this.spawnSparkles(sx, sy, 3);
            }
        }

        // Boss Phase calculation based on remaining HP
        if (boss.hp >= 3) boss.phase = 1;
        else if (boss.hp === 2) boss.phase = 2;
        else if (boss.hp === 1) boss.phase = 3;
        else {
            boss.phase = 0;
            boss.state = 'DEFEATED';
            this.phase6State = 'BOSS_DEFEATED';
            this.bossDefeatTimer = 0;
            this.score += 5000;
            this.showTip('💥 O MECHA-TRATOR FOI DESARMADO! VITÓRIA!', 3.5);
            return;
        }

        // AI States
        if (boss.state === 'HURT') {
            if (boss.hurtTimer <= 0) {
                boss.state = 'DRIVE';
                boss.stateTimer = 2.5;
            }
        } else if (boss.state === 'STUNNED') {
            boss.stateTimer -= dt;
            if (boss.stateTimer <= 0) {
                boss.state = 'DRIVE';
                boss.stateTimer = 2.0;
            }
        } else if (boss.state === 'DRIVE') {
            const spd = boss.phase === 1 ? 130 : (boss.phase === 2 ? 180 : 240);
            boss.vx = boss.facing * spd;
            boss.x += boss.vx * dt;

            // Turn around at borders
            if (boss.x < 80) { boss.x = 80; boss.facing = 1; }
            if (boss.x > 1160) { boss.x = 1160; boss.facing = -1; }

            boss.stateTimer -= dt;
            if (boss.stateTimer <= 0) {
                // Pick attack
                const r = Math.random();
                if (r < 0.5) {
                    boss.state = 'RAM_PREP';
                    boss.stateTimer = 1.0;
                    boss.facing = p.x > boss.x + boss.w / 2 ? 1 : -1;
                } else {
                    boss.state = 'SHOOT_DEBRIS';
                    boss.stateTimer = 0.8;
                }
            }

            // Phase 2 & 3: Periodically drop oil puddle
            boss.oilCooldown -= dt;
            if (boss.phase >= 2 && boss.oilCooldown <= 0) {
                boss.oilCooldown = 4.5;
                this.bossOilPuddles.push({
                    x: boss.x + boss.w / 2 - 25,
                    w: 55,
                    life: 9.0
                });
            }

            // Phase 2 & 3: Periodically launch bouncing tire
            boss.tireCooldown -= dt;
            if (boss.phase >= 2 && boss.tireCooldown <= 0) {
                boss.tireCooldown = boss.phase === 3 ? 3.0 : 4.5;
                const launchDir = p.x > boss.x ? 1 : -1;
                this.bossTires.push({
                    x: boss.x + boss.w / 2,
                    y: boss.y + 20,
                    vx: launchDir * (220 + Math.random() * 60),
                    vy: -320,
                    rot: 0,
                    bounces: 0
                });
            }
        } else if (boss.state === 'RAM_PREP') {
            boss.stateTimer -= dt;
            boss.x += (Math.random() - 0.5) * 5; // Engine rev shake!
            if (boss.stateTimer <= 0) {
                boss.state = 'RAMMING';
                boss.ramDuration = 1.8;
                boss.facing = p.x > boss.x + boss.w / 2 ? 1 : -1;
            }
        } else if (boss.state === 'RAMMING') {
            const ramSpeed = boss.phase === 3 ? 380 : 320;
            boss.vx = boss.facing * ramSpeed;
            boss.x += boss.vx * dt;
            boss.ramDuration -= dt;

            // Sparks under tracks
            if (Math.random() < 0.4) {
                this.spawnSparkles(boss.x + (boss.facing > 0 ? 20 : boss.w - 20), 455, 4);
            }

            if (boss.x < 80) { boss.x = 80; boss.facing = 1; boss.state = 'DRIVE'; boss.stateTimer = 2.0; }
            if (boss.x > 1160) { boss.x = 1160; boss.facing = -1; boss.state = 'DRIVE'; boss.stateTimer = 2.0; }
            if (boss.ramDuration <= 0) {
                boss.state = 'DRIVE';
                boss.stateTimer = 2.5;
            }
        } else if (boss.state === 'SHOOT_DEBRIS') {
            boss.stateTimer -= dt;
            if (boss.stateTimer <= 0) {
                // Launch debris
                const count = boss.phase === 3 ? 4 : 3;
                for (let k = 0; k < count; k++) {
                    const angle = (boss.facing > 0 ? -0.35 : -2.75) + (k - (count - 1) / 2) * 0.28;
                    const spd = 340 + Math.random() * 80;
                    this.bossDebris.push({
                        x: boss.x + (boss.facing > 0 ? boss.w - 10 : 10),
                        y: boss.y + 40,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd,
                        rot: 0,
                        vrot: (Math.random() - 0.5) * 12,
                        type: k % 3 === 0 ? 'trash' : (k % 3 === 1 ? 'brick' : 'pipe')
                    });
                }
                boss.state = 'DRIVE';
                boss.stateTimer = 2.8;
            }
        }

        // --- COLLISION: Cajulim vs Boss ---
        if (!p.isDead && boss.state !== 'DEFEATED') {
            const domeX1 = boss.x + 35;
            const domeX2 = boss.x + 125;
            const domeY1 = boss.y - 15;
            const domeY2 = boss.y + 45;

            // Weak Spot Hit: Player falling from above onto the dome/hood
            if (p.vy > 0 && p.x + p.w > domeX1 && p.x < domeX2 &&
                p.y + p.h >= domeY1 && p.y + p.h <= domeY2) {
                if (boss.invulnerableTimer <= 0 && boss.state !== 'HURT') {
                    // HIT!
                    boss.hp -= 1;
                    if (boss.hp >= 3) boss.phase = 1;
        else if (boss.hp === 2) boss.phase = 2;
        else if (boss.hp === 1) boss.phase = 3;
                    else boss.phase = 0;
                    boss.hurtTimer = 1.2;
                    boss.invulnerableTimer = 1.6;
                    boss.state = 'HURT';

                    p.y = domeY1 - p.h;
                    p.vy = -560; // Big Sonic-style bounce!
                    p.grounded = false;

                    this.score += 800;
                    this.spawnSparkles(boss.x + boss.w / 2, boss.y + 20, 25);
                    this.addFloatingText(boss.x + boss.w / 2, boss.y - 30, `💥 ACERTOU O CAPÔ! (${boss.hp}/4 HP)`, '#facc15');

                    if (window.soundManager && window.soundManager.playHorn) {
                        window.soundManager.playHorn();
                    }

                    if (boss.hp === 1) {
                        boss.state = 'STUNNED';
                        boss.stateTimer = 3.0;
                        this.showTip('⭐ MECHA-TRATOR ATORDOADO! Suba na torre central e dê o salto final!', 3.5);
                    } else if (boss.hp <= 0) {
                        boss.state = 'DEFEATED';
                        this.phase6State = 'BOSS_DEFEATED';
                        this.bossDefeatTimer = 0;
                        this.score += 5000;
                        this.showTip('💥 O MECHA-TRATOR FOI DESARMADO! VITÓRIA!', 3.5);
                    }
                    return;
                }
            }

            // Body collision: Player touches tracks or shovel without dropping on top
            const bodyX1 = boss.x + 10;
            const bodyX2 = boss.x + boss.w - 10;
            const bodyY1 = boss.y + 40;
            const bodyY2 = boss.y + boss.h;

            if (p.invulnerableTimer <= 0 &&
                p.x + p.w > bodyX1 && p.x < bodyX2 &&
                p.y + p.h > bodyY1 && p.y < bodyY2) {
                this.hurtPlayer(1, 'O Mecha-Trator te atingiu! Pule por cima!');
                p.vx = -boss.facing * 300;
                p.vy = -240;
            }
        }
    }

    hurtPlayer(damage = 1, reason = 'Você levou dano!') {
        const p = this.player;
        if (p.invulnerableTimer > 0 || p.isDead) return;
        this.lives -= damage;
        p.invulnerableTimer = 2.0;
        this.showTip(reason, 2.0);
        this.addFloatingText(p.x, p.y - 20, '-1 VIDA!', '#ef4444');
        if (window.soundManager && window.soundManager.playHurt) {
            window.soundManager.playHurt();
        }
        if (this.lives <= 0) {
            this.killPlayer('Você perdeu todas as vidas para o Barão!');
        }
    }

    updateTimer(dt) {
        this.timerAccumulator += dt;
        if (this.timerAccumulator >= 1) {
            this.timerAccumulator -= 1;
            this.timeLeft = Math.max(0, this.timeLeft - 1);
            if (this.timeLeft === 0 && !this.player.isDead) {
                this.killPlayer('O tempo acabou!');
            }
        }
    }

    updatePlayer(dt) {
        const p = this.player;
        if (p.isDead) return;

        if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;

        let moveDir = 0;
        if (this.keys.left) moveDir -= 1;
        if (this.keys.right) moveDir += 1;

        if (p.collectTimer > 0) {
            p.collectTimer -= dt;
            p.vx = 0;
            p.animState = 'collect';
        } else {
            if (moveDir !== 0) {
                p.facing = moveDir;
                const accel = p.grounded ? PLAYER_ACCEL : PLAYER_ACCEL * 0.75;
                p.vx += moveDir * accel * dt;
                if (Math.abs(p.vx) > PLAYER_SPEED) p.vx = moveDir * PLAYER_SPEED;
            } else {
                p.vx *= Math.pow(PLAYER_FRICTION, dt * 60);
                if (Math.abs(p.vx) < 10) p.vx = 0;
            }

            if (p.grounded) p.coyoteTimer = 0.12;
            else p.coyoteTimer -= dt;

            if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

            const canJump = (p.grounded || p.coyoteTimer > 0);
            if (p.jumpBuffer > 0 && canJump) {
                p.vy = JUMP_FORCE;
                p.grounded = false;
                p.coyoteTimer = 0;
                p.jumpBuffer = 0;
                this.spawnDust(p.x + p.w / 2, p.y + p.h, 6);
                if (window.soundManager) window.soundManager.playJump();
            }

            if (this.keys.jumpHeld && p.vy < 0) {
                p.vy += JUMP_HOLD_BOOST * dt;
            }

            p.vy += GRAVITY * dt;
            if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;
        }

        p.x += p.vx * dt;
        this.resolveMapCollisionsX(p);

        const wasGrounded = p.grounded;
        p.y += p.vy * dt;
        p.grounded = false;
        this.resolveMapCollisionsY(p);

        if (!wasGrounded && p.grounded) {
            this.spawnDust(p.x + p.w / 2, p.y + p.h, 4);
        }

        if (p.y > VIRTUAL_HEIGHT + 40) {
            this.killPlayer('Você caiu no buraco! Pule com cuidado!');
            return;
        }

        if (p.x < 0) { p.x = 0; p.vx = 0; }

        if (p.collectTimer <= 0) {
            if (!p.grounded) {
                p.animState = 'jump';
                if (p.vy < -150) p.animFrame = 0;
                else if (p.vy < 150) p.animFrame = 1;
                else p.animFrame = 2;
            } else if (Math.abs(p.vx) > 20) {
                p.animState = 'walk';
                p.animTimer += dt * (Math.abs(p.vx) / 32);
                p.animFrame = Math.floor(p.animTimer) % 8;
                if (p.animFrame === 1 || p.animFrame === 5) {
                    if (Math.random() < 0.2) this.spawnDust(p.x + (p.facing > 0 ? 0 : p.w), p.y + p.h, 1);
                }
            } else {
                p.animState = 'idle';
                p.animTimer += dt * 3.5;
                p.animFrame = Math.floor(p.animTimer) % 4;
            }
        }
    }

    updateTruckPlayer(dt) {
        const p = this.player;
        if (p.isDead) return;

        if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;
        if (this.turboTimer > 0) {
            this.turboTimer -= dt;
            if (this.turboTimer <= 0) this.turboBoost = 1.0;
        }

        let moveDir = 0;
        if (this.keys.left) moveDir -= 1;
        if (this.keys.right) moveDir += 1;

        const maxSpeed = TRUCK_SPEED * this.turboBoost;
        if (moveDir !== 0) {
            p.facing = moveDir;
            p.vx += moveDir * TRUCK_ACCEL * dt;
            if (Math.abs(p.vx) > maxSpeed) p.vx = moveDir * maxSpeed;

            // Exhaust smoke particles when driving
            if (Math.random() < 0.4) {
                this.spawnSmoke(p.x + (p.facing > 0 ? 8 : p.w - 8), p.y + p.h - 18);
            }
        } else {
            const friction = p.skidTimer > 0 ? 0.98 : TRUCK_FRICTION;
            p.vx *= Math.pow(friction, dt * 60);
            if (Math.abs(p.vx) < 10) p.vx = 0;
        }

        if (p.skidTimer > 0) p.skidTimer -= dt;

        if (p.grounded) p.coyoteTimer = 0.12;
        else p.coyoteTimer -= dt;

        if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

        const canJump = (p.grounded || p.coyoteTimer > 0);
        if (p.jumpBuffer > 0 && canJump) {
            p.vy = TRUCK_JUMP;
            p.grounded = false;
            p.coyoteTimer = 0;
            p.jumpBuffer = 0;
            this.spawnDust(p.x + p.w / 2, p.y + p.h, 8);
            if (window.soundManager) window.soundManager.playJump();
        }

        p.vy += GRAVITY * dt;
        if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;

        p.x += p.vx * dt;
        this.resolveMapCollisionsX(p);

        const wasGrounded = p.grounded;
        p.y += p.vy * dt;
        p.grounded = false;
        this.resolveMapCollisionsY(p);

        if (!wasGrounded && p.grounded) {
            this.spawnDust(p.x + 20, p.y + p.h, 5);
            this.spawnDust(p.x + p.w - 20, p.y + p.h, 5);
        }

        if (p.y > VIRTUAL_HEIGHT + 60) {
            this.killPlayer('O caminhão caiu no buraco da rodovia! Pule com ESPACO!');
            return;
        }

        if (p.x < 0) { p.x = 0; p.vx = 0; }
    }

    updateTrafficLights(dt) {
        if (this.currentPhase !== 2 || !this.trafficLights) return;
        const p = this.player;
        if (p.isDead) return;

        for (const tl of this.trafficLights) {
            const truckFront = p.x + p.w;
            const dist = tl.x - truckFront;

            // Approaching traffic light zone
            if (dist > -40 && dist < 220) {
                if (tl.state === 'RED') {
                    if (Math.abs(p.vx) < 90) {
                        // Truck is stopped or stopping to wait for green!
                        tl.timer -= dt;
                        const remaining = Math.max(0, Math.ceil(tl.timer));
                        this.showTip(`🛑 Sinal Vermelho! Aguarde o verde... (${remaining}s)`, 0.3);
                        
                        if (tl.timer <= 0.8 && tl.state === 'RED') {
                            tl.state = 'YELLOW';
                        }
                        if (tl.timer <= 0) {
                            tl.state = 'GREEN';
                            tl.waited = true;
                            if (window.soundManager) window.soundManager.playCollect('star');
                            this.score += 200;
                            this.addFloatingText(tl.x, tl.y - 15, '+200 SINAL VERDE! 🟢', '#22c55e');
                            this.showTip('🟢 Sinal Verde! Pode acelerar com segurança!', 3.0);
                        }
                    } else {
                        this.showTip('🛑 PERIGO! Pare o caminhão! Avançar no vermelho é FATAL!', 0.3);
                    }
                } else if (tl.state === 'YELLOW') {
                    tl.timer -= dt;
                    if (tl.timer <= 0) {
                        tl.state = 'GREEN';
                        tl.waited = true;
                        if (window.soundManager) window.soundManager.playCollect('star');
                        this.score += 200;
                        this.addFloatingText(tl.x, tl.y - 15, '+200 SINAL VERDE! 🟢', '#22c55e');
                        this.showTip('🟢 Sinal Verde! Pode acelerar com segurança!', 3.0);
                    }
                }
            }

            // Infraction: driving past while RED -> FATAL DEATH!
            if (p.x + p.w > tl.x - 10 && !tl.passed) {
                if (tl.state === 'RED') {
                    tl.passed = true;
                    if (window.soundManager) window.soundManager.playHurt();
                    this.score = Math.max(0, this.score - 200);
                    this.spawnSparkles(tl.x, tl.y + 20, 40);
                    this.addFloatingText(p.x, p.y - 50, '☠️ PASSOU NO VERMELHO! FATAL! ☠️', '#ef4444');
                    this.killPlayer('🚨 Acidente Fatal! Você avançou o sinal vermelho!');
                    // Turn to green so upon respawning before the light player can advance safely
                    tl.state = 'GREEN';
                    tl.timer = 0;
                    tl.waited = true;
                    return;
                } else {
                    tl.passed = true;
                    if (!tl.waited) {
                        this.score += 50;
                        this.addFloatingText(tl.x, tl.y - 15, '+50 Cruzou no Verde! 🟢', '#22c55e');
                    }
                }
            }
        }
    }

    updateHazards(dt) {
        const p = this.player;
        if (p.isDead) return;

        for (const h of this.hazards) {
            if (this.checkAABB(p, h)) {
                if (h.type === 'cone' && !h.hit && p.invulnerableTimer <= 0) {
                    h.hit = true;
                    p.vx *= 0.3;
                    this.lives--;
                    p.invulnerableTimer = 1.5;
                    this.spawnSparkles(h.x + h.w / 2, h.y + h.h / 2, 20);
                    if (window.soundManager) window.soundManager.playBump();
                    this.showTip('Cuidado com os cones de obras na pista! Pule por cima!', 2.5);
                    if (this.lives <= 0) {
                        this.killPlayer('O caminhão sofreu danos graves pelos obstáculos!');
                    }
                } else if (h.type === 'oil') {
                    p.skidTimer = 0.8;
                    if (Math.random() < 0.3) {
                        this.spawnDust(p.x + p.w / 2, p.y + p.h, 2);
                    }
                }
            }
        }
    }

    resolveMapCollisionsX(p) {
        for (const b of this.blocks) {
            if (this.checkAABB(p, b)) {
                if (p.vx > 0) { p.x = b.x - p.w; p.vx = 0; }
                else if (p.vx < 0) { p.x = b.x + b.w; p.vx = 0; }
            }
        }
    }

    resolveMapCollisionsY(p) {
        for (const plat of this.platforms) {
            if (p.x + p.w * 0.8 > plat.x && p.x + p.w * 0.2 < plat.x + plat.w) {
                if (p.vy >= 0 && (p.y + p.h) >= plat.y && (p.y + p.h) <= plat.y + 24) {
                    p.y = plat.y - p.h;
                    p.vy = 0;
                    p.grounded = true;
                }
            }
        }

        for (const b of this.blocks) {
            if (this.checkAABB(p, b)) {
                if (p.vy > 0 && (p.y + p.h - p.vy * 0.05) <= b.y) {
                    p.y = b.y - p.h;
                    p.vy = 0;
                    p.grounded = true;
                } else if (p.vy < 0) {
                    p.y = b.y + b.h;
                    p.vy = 20;
                    this.hitBlock(b);
                }
            }
        }
    }

    hitBlock(block) {
        if (block.bumping) return;
        block.bumping = true;
        block.bumpY = -8;
        if (window.soundManager) window.soundManager.playBump();

        if (block.content && !block.hit) {
            block.hit = true;
            if (block.type === 'recycle') block.type = 'brick';
            const item = {
                id: Date.now() + Math.random(),
                x: block.x + block.w / 2 - 18,
                y: block.y - 30,
                type: block.content,
                points: block.content === 'star' ? 300 : 150,
                popping: true,
                popVy: -260
            };
            this.items.push(item);
            this.spawnSparkles(block.x + block.w / 2, block.y, 16);
            if (window.soundManager) window.soundManager.playCollect('star');
        }
    }

    updateBlocks(dt) {
        for (const b of this.blocks) {
            if (b.bumping) {
                b.bumpY += 32 * dt * 2.5;
                if (b.bumpY >= 0) {
                    b.bumpY = 0;
                    b.bumping = false;
                }
            }
        }
    }

    updateItems(dt) {
        const p = this.player;
        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            if (it.popping) {
                it.y += it.popVy * dt;
                it.popVy += 800 * dt;
                if (it.popVy >= 0) it.popping = false;
            }

            const itemBox = { x: it.x, y: it.y, w: 36, h: 36 };
            if (this.checkAABB(p, itemBox)) {
                this.collectItem(it, i);
            }
        }
    }

    collectItem(it, index) {
        this.items.splice(index, 1);
        this.score += it.points;

        if (it.type === 'trash_bag') {
            this.trashCollected++;
            this.player.collectTimer = 0.25;
            this.addFloatingText(it.x, it.y, `+${it.points} LIXO!`, '#00ff88');
            if (window.soundManager) window.soundManager.playCollect('trash');
            this.showTip(`Saco recolhido! (${this.trashCollected}/${this.totalTrash})`, 2.0);
        } else if (it.type === 'biodiesel') {
            this.biodieselCollected++;
            this.turboBoost = 1.35;
            this.turboTimer = 5.0;
            this.addFloatingText(it.x, it.y, `+${it.points} TURBO!`, '#facc15');
            if (window.soundManager) window.soundManager.playTurbo();
            this.showTip(`Biodiesel coletado! Turbo ativado! (${this.biodieselCollected}/${this.totalBiodiesel})`, 2.5);
        } else if (it.type === 'wrench') {
            this.wrenchesCollected++;
            if (this.lives < 3) this.lives++;
            this.addFloatingText(it.x, it.y, `+${it.points} REPARO!`, '#38bdf8');
            if (window.soundManager) window.soundManager.playCollect('star');
            this.showTip('Caminhão reparado! +1 Vida!', 2.0);
        } else if (it.type === 'star') {
            this.addFloatingText(it.x, it.y, `+${it.points} BANDEIRA!`, '#ffdd00');
            if (window.soundManager) window.soundManager.playCollect('star');
        } else {
            this.recyclablesCollected++;
            this.addFloatingText(it.x, it.y, `+${it.points}`, '#38bdf8');
            if (window.soundManager) window.soundManager.playCollect('recycle');
        }

        this.spawnSparkles(it.x + 16, it.y + 16, 12);
    }

    checkSignposts() {
        const p = this.player;
        for (const dec of this.decorations) {
            if (dec.type === 'sign' && Math.abs(p.x - dec.x) < 55) {
                if (this.tipText !== dec.text) {
                    this.showTip(dec.text, 3.5);
                }
            }
        }
    }

    checkGoal() {
        if (this.state !== 'PLAYING') return;
        const p = this.player;

        if (this.currentPhase === 1) {
            if (!this.truck) return;
            const truckBox = { x: this.truck.x, y: this.truck.y + 40, w: this.truck.w - 40, h: this.truck.h - 40 };
            if (this.checkAABB(p, truckBox)) {
                if (this.trashCollected >= this.totalTrash) {
                    this.levelClear();
                } else {
                    const missing = this.totalTrash - this.trashCollected;
                    this.showTip(`Atenção! Faltam ${missing} sacos de lixo para carregar o caminhão!`, 2.5);
                }
            }
        } else {
            if (!this.transbordoFacility) return;
            const dockBox = { x: this.transbordoFacility.x + 40, y: this.transbordoFacility.y + 60, w: 200, h: 180 };
            if (this.checkAABB(p, dockBox)) {
                this.levelClear();
            }
        }
    }

    levelClear() {
        this.state = 'LEVEL_CLEAR';
        this.levelClearTimer = 0;
        if (window.soundManager) {
            window.soundManager.stopMusic();
            window.soundManager.playVictory();
        }

        if (this.currentPhase === 1) {
            if (this.truck) this.spawnSparkles(this.truck.x + 160, this.truck.y + 80, 50);
            this.addFloatingText(this.player.x, this.player.y - 30, 'FASE 1 COMPLETA!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) {
                document.getElementById('victoryTitle').textContent = '🌟 FASE 1 COMPLETA! 🌟';
                document.getElementById('victoryDesc').textContent = 'Parabéns! Cajulim recolheu o lixo espalhado no bairro e entregou tudo com segurança no Caminhão da Coleta Seletiva!';
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('finalStat1Label').textContent = 'Sacos de Lixo';
                document.getElementById('finalTrash').textContent = `${this.trashCollected}/${this.totalTrash}`;
                document.getElementById('finalStat2Label').textContent = 'Recicláveis';
                document.getElementById('finalRecyclables').textContent = `${this.recyclablesCollected}/${this.totalRecyclables}`;
                document.getElementById('finalTime').textContent = `${300 - this.timeLeft}s`;
                document.getElementById('victoryNextTeaser').innerHTML = '<strong>🚚 Próxima Parada: Fase 2</strong><br>O caminhão de lixo vai transportar os resíduos até a estação de transbordo da cidade!';
                const btnNext = document.getElementById('btnNextPhase');
                if (btnNext) {
                    btnNext.style.display = 'inline-block';
                    btnNext.textContent = 'AVANCAR PARA FASE 2: O TRANSBORDO 🚚 ▶';
                }
                modal.classList.remove('hidden');
            }
        } else if (this.currentPhase === 2) {
            if (this.transbordoFacility) this.spawnSparkles(this.transbordoFacility.x + 150, this.transbordoFacility.y + 100, 60);
            this.addFloatingText(this.player.x, this.player.y - 30, 'FASE 2 COMPLETA! TRANSBORDO ALCANÇADO!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) {
                document.getElementById('victoryTitle').textContent = '🚚 FASE 2 COMPLETA! 🚚';
                document.getElementById('victoryDesc').textContent = 'Sensacional! O caminhão da coleta seletiva percorreu a rodovia com sucesso e chegou à Estação de Transbordo!';
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('finalStat1Label').textContent = 'Biodiesel';
                document.getElementById('finalTrash').textContent = `${this.biodieselCollected}/${this.totalBiodiesel}`;
                document.getElementById('finalStat2Label').textContent = 'Reparos';
                document.getElementById('finalRecyclables').textContent = `${this.wrenchesCollected}/${this.totalWrenches}`;
                document.getElementById('finalTime').textContent = `${300 - this.timeLeft}s`;
                document.getElementById('victoryNextTeaser').innerHTML = '<strong>📦 Próxima Etapa: Fase 3</strong><br>Na estação de transbordo, o caminhão coletor joga o lixo na grande carreta de transporte!';
                const btnNext = document.getElementById('btnNextPhase');
                if (btnNext) {
                    btnNext.style.display = 'inline-block';
                    btnNext.textContent = 'AVANCAR PARA FASE 3: JOGA NA CARRETA 🚜 ▶';
                }
                modal.classList.remove('hidden');
            }
        } else if (this.currentPhase === 3) {
            this.spawnSparkles(700, 360, 60);
            this.addFloatingText(480, 220, 'FASE 3 COMPLETA! TRANSBORDO REALIZADO!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) {
                document.getElementById('victoryTitle').textContent = '🚜 FASE 3 COMPLETA! 🚜';
                document.getElementById('victoryDesc').textContent = 'Sensacional! O caminhão da coleta seletiva descarregou todo o lixo na grande Carreta de Transbordo de 30 toneladas com máxima eficiência!';
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('finalStat1Label').textContent = 'Carga Total';
                document.getElementById('finalTrash').textContent = '30 / 30 t';
                document.getElementById('finalStat2Label').textContent = 'Frota Descarregada';
                document.getElementById('finalRecyclables').textContent = '4/4 Caminhões (100%)';
                document.getElementById('finalTime').textContent = `${300 - this.timeLeft}s`;
                document.getElementById('victoryNextTeaser').innerHTML = '<strong>🚛 Próxima Etapa: Fase 4</strong><br>A grande carreta pesada de 30 toneladas pega a rodovia com destino ao Aterro Sanitário!';
                const btnNext = document.getElementById('btnNextPhase');
                if (btnNext) {
                    btnNext.style.display = 'inline-block';
                    btnNext.textContent = 'AVANCAR PARA FASE 4: CARRETA AO ATERRO 🚛 ▶';
                }
                modal.classList.remove('hidden');
            }
        } else if (this.currentPhase === 4) {
            this.spawnSparkles(4200, 320, 70);
            this.addFloatingText(this.player.x, this.player.y - 40, 'FASE 4 COMPLETA! BALANÇA E PORTÃO LIBERADOS!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) {
                document.getElementById('victoryTitle').textContent = '🚛 FASE 4 COMPLETA! 🚛';
                document.getElementById('victoryDesc').textContent = 'Excelente viagem! Você cruzou a rodovia das dunas com maestria, manteve o lixo seguro na carreta pesada e passou com louvor na pesagem da ANTT!';
                document.getElementById('finalScore').textContent = this.score;
                document.getElementById('finalStat1Label').textContent = 'Estabilidade';
                document.getElementById('finalTrash').textContent = `${Math.round(this.cargoStability)}%`;
                document.getElementById('finalStat2Label').textContent = 'Peso Balança';
                document.getElementById('finalRecyclables').textContent = `${(this.cargoWeight / 1000).toFixed(1)}t / 30t`;
                document.getElementById('finalTime').textContent = `${300 - this.timeLeft}s`;
                document.getElementById('victoryNextTeaser').innerHTML = '<strong>🚜 Próxima Etapa: Fase 5</strong><br>Entrada no Aterro Sanitário: Compactação de resíduos, captação de biogás e lagoas de tratamento de chorume!';
                const btnNext = document.getElementById('btnNextPhase');
                if (btnNext) {
                    btnNext.style.display = 'inline-block';
                    btnNext.textContent = 'AVANCAR PARA FASE 5: ATERRO & USINA VERDE 🌱⚡ ▶';
                }
                modal.classList.remove('hidden');
            }
        } else if (this.currentPhase === 5) {
            this.spawnSparkles(this.player.x, this.player.y - 40, 80);
            this.addFloatingText(this.player.x, this.player.y - 50, 'FASE 5 COMPLETA! USINA VERDE CERTIFICADA!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE5_TO_6');
            }, 500);
        } else if (this.currentPhase === 6) {
            this.spawnSparkles(this.player.x, this.player.y - 40, 100);
            this.addFloatingText(this.player.x, this.player.y - 50, '🎉 CIDADE SALVA! O BARÃO FOI DERROTADO! 🎉', '#facc15');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('GRAND_ENDING');
            }, 600);
        }
    }

    killPlayer(reason = 'Você perdeu uma vida!') {
        const p = this.player;
        p.isDead = true;
        p.vy = -400;
        this.lives--;
        if (window.soundManager) window.soundManager.playHurt();
        this.showTip(reason, 2.0);

        setTimeout(() => {
            if (this.lives > 0) {
                p.x = Math.max(80, p.x - 260);
                p.y = 350;
                p.vx = 0;
                p.vy = 0;
                p.isDead = false;
                p.invulnerableTimer = 2.0;
            } else {
                this.gameOver();
            }
        }, 800);
    }

    gameOver() {
        this.state = 'GAME_OVER';
        this.gameOverTimer = 0;
        if (window.soundManager) window.soundManager.stopMusic();
        const gm = document.getElementById('gameOverModal');
        if (gm) gm.classList.remove('hidden');
    }

    showTip(text, duration = 3.0) {
        this.tipText = text;
        this.tipTimer = duration;
    }

    spawnDust(x, y, count = 4) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 16,
                y: y - 2,
                vx: (Math.random() - 0.5) * 60,
                vy: -Math.random() * 40 - 20,
                size: Math.random() * 4 + 2,
                color: 'rgba(210, 180, 140, ',
                life: 0.35,
                maxLife: 0.35
            });
        }
    }

    spawnSmoke(x, y) {
        this.particles.push({
            x: x + (Math.random() - 0.5) * 8,
            y: y + (Math.random() - 0.5) * 4,
            vx: -this.player.facing * (Math.random() * 40 + 20),
            vy: -Math.random() * 25 - 10,
            size: Math.random() * 6 + 4,
            color: 'rgba(180, 190, 200, ',
            life: 0.45,
            maxLife: 0.45
        });
    }

    spawnSparkles(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 120 + 40;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: Math.random() * 4 + 2,
                color: 'rgba(255, 230, 80, ',
                life: 0.5,
                maxLife: 0.5
            });
        }
    }

    addFloatingText(x, y, text, color = '#ffffff') {
        this.floatingTexts.push({ x, y, text, color, life: 0.8, vy: -50 });
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const part = this.particles[i];
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.life -= dt;
            if (part.life <= 0) this.particles.splice(i, 1);
        }
    }

    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    updateCamera() {
        if (this.currentPhase === 4) {
            const targetX = this.player.x - VIRTUAL_WIDTH * 0.32;
            this.camera.x += (targetX - this.camera.x) * 0.15;
            if (this.camera.x < 0) this.camera.x = 0;
            const maxCam = this.levelWidth - VIRTUAL_WIDTH;
            if (this.camera.x > maxCam) this.camera.x = maxCam;

            const targetY = (this.player.y - 310) * 0.45;
            this.camera.y += (targetY - (this.camera.y || 0)) * 0.08;
            return;
        }
        if (this.currentPhase === 5) {
            let targetX = 0;
            if (this.phase5State === 'COMPACTING' || this.phase5State === 'COMPACTING_WAIT_ADVANCE' || this.phase5State === 'SOIL_COVER') {
                targetX = Math.max(0, Math.min(850, this.player.x - VIRTUAL_WIDTH * 0.35));
            } else if (this.phase5State === 'BIOGAS_GENERATION' || this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
                targetX = 2050;
            } else if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS' || this.phase5State === 'CAJULIM_WAIT_ADVANCE' || this.phase5State === 'LAB_ANALYSIS' || this.phase5State === 'COMPLETE') {
                targetX = Math.max(3360, Math.min(4240, this.player.x - VIRTUAL_WIDTH * 0.42));
            }
            this.camera.x += (targetX - this.camera.x) * 0.12;
            if (this.camera.x < 0) this.camera.x = 0;
            const maxCam = this.levelWidth - VIRTUAL_WIDTH;
            if (this.camera.x > maxCam) this.camera.x = maxCam;
            this.camera.y = 0;
            return;
        }
        if (this.currentPhase === 6) {
            const targetX = Math.max(0, Math.min(1400 - VIRTUAL_WIDTH, this.player.x - VIRTUAL_WIDTH * 0.42));
            this.camera.x += (targetX - this.camera.x) * 0.15;
            this.camera.y = 0;
            return;
        }
        const targetX = this.player.x - VIRTUAL_WIDTH * 0.35;
        this.camera.x += (targetX - this.camera.x) * 0.12;
        if (this.camera.x < 0) this.camera.x = 0;
        const maxCam = this.levelWidth - VIRTUAL_WIDTH;
        if (this.camera.x > maxCam) this.camera.x = maxCam;
    }

    checkAABB(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        this.renderBackground(ctx);

        ctx.save();
        ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y || 0));

        if (this.currentPhase === 1) {
            this.renderDecorations(ctx);
            this.renderTruck(ctx);
            this.renderPlatforms(ctx);
            this.renderBlocks(ctx);
            this.renderItems(ctx);
            this.renderPlayer(ctx);
        } else if (this.currentPhase === 2) {
            this.renderPhase2Decorations(ctx);
            this.renderTransbordoFacility(ctx);
            this.renderRoadPlatforms(ctx);
            this.renderHazards(ctx);
            this.renderTrafficLights(ctx);
            this.renderItems(ctx);
            this.renderTruckPlayer(ctx);
        } else if (this.currentPhase === 3) {
            this.renderPhase3(ctx);
        } else if (this.currentPhase === 4) {
            this.renderPhase4(ctx);
        } else if (this.currentPhase === 5) {
            this.renderPhase5(ctx);
        } else if (this.currentPhase === 6) {
            this.renderPhase6(ctx);
        }

        this.renderParticles(ctx);
        this.renderFloatingTexts(ctx);

        ctx.restore();

        if (this.state !== 'CUTSCENE' && this.state !== 'TITLE') {
            this.renderHUD(ctx);
            this.renderTip(ctx);
        }

        if (this.state === 'TITLE') this.renderTitleScreen(ctx);
        if (this.state === 'CUTSCENE') this.renderCutscene(ctx);
        if (this.state === 'LEVEL_CLEAR') this.renderLevelClearBanner(ctx);
        if (this.state === 'GAME_OVER') this.renderGameOverBanner(ctx);
    }

    renderPhase3(ctx) {
        // 1. Draw Estação de Transbordo interior background
        const interior = this.assets['sc_transbordo_interior'];
        if (interior) {
            ctx.drawImage(interior, 0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        }

        // 2. Active Dock Sensor Lights on the wall
        // Position: x = 460, y = 214 (Red), y = 232 (Yellow), y = 250 (Green)
        const isDocking = this.phase3State === 'DOCKING';
        const dist = parseFloat(this.dockDistance || 0);

        // Always draw dark inactive lenses over all 3 lamps to override the background PNG
        ctx.fillStyle = '#1e0808';
        ctx.beginPath();
        ctx.arc(460, 214, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e1605';
        ctx.beginPath();
        ctx.arc(460, 232, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#05180a';
        ctx.beginPath();
        ctx.arc(460, 250, 9, 0, Math.PI * 2);
        ctx.fill();

        if (isDocking && dist > 2.5) {
            // RED ACTIVE: Truck is far from dock
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(460, 214, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.beginPath();
            ctx.arc(460, 214, 15, 0, Math.PI * 2);
            ctx.fill();
        } else if (isDocking && dist <= 2.5 && dist > 0.4) {
            // YELLOW ACTIVE: Truck is close, slow down
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(460, 232, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(250, 204, 21, 0.5)';
            ctx.beginPath();
            ctx.arc(460, 232, 15, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // GREEN ACTIVE: Docked, Aligned, Dumping, or Exiting
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(460, 250, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.beginPath();
            ctx.arc(460, 250, 16, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Cajulim Supervisor on Catwalk
        const sup = this.supervisor;
        const supImg = this.assets['p_supervisor'];
        const bob = Math.sin(Date.now() / 250) * (sup && sup.cheer ? 5 : 2);
        if (supImg && sup) {
            ctx.drawImage(supImg, sup.x, sup.y + bob, sup.w, sup.h);
        }

        // Supervisor Dialogue Bubble
        if (sup) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2;
            const bubbleX = sup.x + 85;
            const bubbleY = sup.y + 16;
            const tNum = this.currentTruckIndex || 1;
            let bubbleText = `Caminhão #${tNum}, ré até a calha!`;
            if (this.phase3State === 'TRUCK_ENTER') {
                bubbleText = `Caminhão #${tNum}! Entre na plataforma!`;
            } else if (this.phase3State === 'DOCKING') {
                bubbleText = this.player.x < 240 ? `Caminhão #${tNum}, ré até a calha!` : 'Devagar... Quase na doca!';
            } else if (this.phase3State === 'ALIGNED') {
                bubbleText = 'Calços travados! Prepare a mira!';
            } else if (this.phase3State === 'TIMING_GAME') {
                bubbleText = 'Aperte no VERDE para pressão máxima!';
            } else if (this.phase3State === 'DUMPING') {
                bubbleText = `Excelente! Despejando carga #${tNum}!`;
            } else if (this.phase3State === 'TRUCK_EXIT') {
                bubbleText = `Caminhão #${tNum} liberado! Próximo!`;
            } else if (this.phase3State === 'COMPACTING' || this.phase3State === 'COMPLETE') {
                bubbleText = 'Sensacional! 30 toneladas prontas!';
            }

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            const txtWidth = (ctx.measureText ? ctx.measureText(bubbleText).width : bubbleText.length * 8) || 160;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bubbleX, bubbleY, txtWidth + 24, 26, 6);
            } else {
                ctx.rect(bubbleX, bubbleY, txtWidth + 24, 26);
            }
            ctx.fill();
            ctx.stroke();

            // Bubble pointer
            ctx.beginPath();
            ctx.moveTo(bubbleX, bubbleY + 12);
            ctx.lineTo(bubbleX - 8, bubbleY + 16);
            ctx.lineTo(bubbleX, bubbleY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'left';
            ctx.fillText(bubbleText, bubbleX + 12, bubbleY + 17);
            ctx.restore();
        }

        // 4. Carreta de Transbordo (In the Lower Dock Pit)
        // Green 30t cargo box is on the LEFT (x = 510..815), Blue cab is on the RIGHT (x = 825..945)
        const car = this.carreta;
        if (car) {
            // Draw garbage heap rising inside the green trailer body (x=512..815, y=345..445)
            const loadFrac = Math.min(1, (this.trailerLoad || 0) / (this.totalTrailerCapacity || 30));
            const fillHeight = Math.floor(loadFrac * 85);
            if (fillHeight > 0) {
                ctx.fillStyle = '#334155';
                ctx.fillRect(512, 445 - fillHeight, 305, fillHeight);
                // Texture pixels inside pile
                ctx.fillStyle = '#eab308';
                for (let ox = 525; ox < 805; ox += 30) {
                    ctx.fillRect(ox, 445 - fillHeight + (ox % 15), 6, 6);
                }
                ctx.fillStyle = '#38bdf8';
                for (let ox = 540; ox < 795; ox += 35) {
                    ctx.fillRect(ox, 445 - fillHeight + (ox % 20), 5, 8);
                }
            }

            // Draw Carreta Sprite (Oriented with green box on left under chute and blue cab on right)
            const carretaImg = this.assets['sc_carreta'];
            if (carretaImg) {
                ctx.drawImage(carretaImg, car.x, car.y, car.w, car.h);
            }

            // Security Tarp over the green trailer body when compacting/complete
            if (this.tarpCoverProgress > 0) {
                const tarpW = Math.min(308, Math.floor((308 * this.tarpCoverProgress) / 100));
                ctx.fillStyle = '#15803d';
                ctx.fillRect(510, 340, tarpW, 14);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2;
                ctx.strokeRect(510, 340, tarpW, 14);
                // Tie-down cords
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 1;
                for (let sx = 525; sx < 510 + tarpW; sx += 35) {
                    ctx.beginPath();
                    ctx.moveTo(sx, 354);
                    ctx.lineTo(sx, 368);
                    ctx.stroke();
                }
            }
        }

        // 5. Collection Truck & Tilting Hydraulic Dump Bed
        const p = this.player;
        if (this.phase3State === 'DOCKING' || this.phase3State === 'TRUCK_ENTER' || this.phase3State === 'TRUCK_EXIT') {
            // Whole truck moving
            const truckImg = this.assets['sc_truck'];
            if (truckImg) {
                ctx.save();
                if (this.phase3State === 'TRUCK_EXIT') {
                    // Truck drives forward to the left (exiting deck)
                    ctx.translate(p.x + p.w, p.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(truckImg, 0, 0, p.w, p.h);
                } else {
                    ctx.drawImage(truckImg, p.x, p.y, p.w, p.h);
                }
                ctx.restore();
            }
        } else {
            // Chassis & Cab with Pai Cajulão
            const chassisImg = this.assets['sc_truck_chassis'] || this.assets['sc_truck'];
            if (chassisImg) {
                ctx.drawImage(chassisImg, p.x, p.y, p.w, p.h);
            }

            // Wheel Chocks (Calços de segurança)
            ctx.fillStyle = '#facc15';
            ctx.fillRect(p.x + 92, p.y + 60, 16, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(p.x + 97, p.y + 60, 6, 8);

            // Hydraulic Cylinder Piston - Front lifts UPWARDS into the sky
            const rad = (this.dumpAngle || 0) * Math.PI / 180;
            const pivotBaseX = p.x + 35;
            const pivotBaseY = p.y + 54;
            const pivotBedX = p.x + 105;
            const pivotBedY = p.y + 54;
            const rodTopX = pivotBedX - Math.cos(rad) * 65;
            const rodTopY = pivotBedY - Math.sin(rad) * 65; // Moves UP in canvas

            // Hydraulic base cylinder (outer tube)
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(pivotBaseX, pivotBaseY);
            ctx.lineTo(pivotBaseX + (rodTopX - pivotBaseX) * 0.45, pivotBaseY + (rodTopY - pivotBaseY) * 0.45);
            ctx.stroke();

            // Shiny chrome rod extending out
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(pivotBaseX + (rodTopX - pivotBaseX) * 0.35, pivotBaseY + (rodTopY - pivotBaseY) * 0.35);
            ctx.lineTo(rodTopX, rodTopY);
            ctx.stroke();

            // Tilting Dump Bed - Front rotates UPWARDS
            ctx.save();
            ctx.translate(pivotBedX, pivotBedY);
            ctx.rotate(rad);
            const bedImg = this.assets['sc_truck_bed'] || this.assets['sc_truck'];
            if (bedImg) {
                ctx.drawImage(bedImg, -85, -52, 85, 54);
            }
            ctx.restore();
        }

        // 6. Timing Minigame UI Overlay (When in TIMING_GAME state)
        if (this.phase3State === 'TIMING_GAME') {
            const gaugeX = 310;
            const gaugeY = 105;
            const gaugeW = 340;
            const gaugeH = 30;

            // Background panel
            ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
            ctx.fillRect(gaugeX - 10, gaugeY - 28, gaugeW + 20, gaugeH + 46);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(gaugeX - 10, gaugeY - 28, gaugeW + 20, gaugeH + 46);

            // Title
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`MIRA HIDRÁULICA - CAMINHÃO #${this.currentTruckIndex}/4`, gaugeX + gaugeW / 2, gaugeY - 12);

            // Frame
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

            const tParams = this.getTimingParams();
            const centerPx = gaugeX + gaugeW / 2;
            const greenHalfPx = (tParams.green / 100) * gaugeW;
            const yellowHalfPx = (tParams.yellow / 100) * gaugeW;

            // Red Zones (outer edges)
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(gaugeX + 2, gaugeY + 2, gaugeW - 4, gaugeH - 4);

            // Yellow Zones (intermediate)
            ctx.fillStyle = '#eab308';
            ctx.fillRect(centerPx - yellowHalfPx, gaugeY + 2, yellowHalfPx * 2, gaugeH - 4);

            // Green Zone (center sweet spot)
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(centerPx - greenHalfPx, gaugeY + 2, greenHalfPx * 2, gaugeH - 4);

            // White center target line
            ctx.beginPath();
            ctx.moveTo(centerPx, gaugeY + 2);
            ctx.lineTo(centerPx, gaugeY + gaugeH - 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Oscillating Needle Indicator
            const needleX = gaugeX + (this.timingNeedlePos / 100) * gaugeW;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(needleX - 2, gaugeY - 4, 4, gaugeH + 8);
            // Arrowhead on top
            ctx.beginPath();
            ctx.moveTo(needleX, gaugeY + gaugeH + 4);
            ctx.lineTo(needleX - 5, gaugeY + gaugeH + 11);
            ctx.lineTo(needleX + 5, gaugeY + gaugeH + 11);
            ctx.fill();

            // Bottom status message
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            const truckLeft = Math.max(0, this.truckCapacity - this.truckDumped).toFixed(1);
            if (this.timingResult === 'PERFECT') {
                ctx.fillStyle = '#4ade80';
                ctx.fillText('🎯 PERFEITO! FORÇA MÁXIMA (DESPEJO TOTAL) +500 PTS', gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            } else if (this.timingResult === 'GOOD') {
                ctx.fillStyle = '#facc15';
                const amt = this.roundDumpTarget ? this.roundDumpTarget.toFixed(1) : '2.5';
                ctx.fillText(`👍 BOM! PRESSÃO MÉDIA (POUCO LIXO: +${amt}t) +200 PTS`, gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            } else if (this.timingResult === 'MISS') {
                ctx.fillStyle = '#ef4444';
                ctx.fillText('⚠️ BAIXA PRESSÃO! NENHUM LIXO DESPEJADO (TENTE DE NOVO)', gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`🔴 FALHA (0t) | 🟡 POUCO (+2.5t) | 🟢 TUDO! [Carga: ${truckLeft}t]`, gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            }
        }

        // 7. Phase 3 Interactive HUD Card in center/right
        ctx.save();
        if (this.phase3State === 'DOCKING' || this.phase3State === 'TRUCK_ENTER') {
            const cardX = 490;
            const cardY = 75;
            const cardW = 340;
            const cardH = 46;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.strokeStyle = dist <= 0.5 ? '#22c55e' : '#eab308';
            ctx.lineWidth = 2;
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4 | DOCA: ${this.dockDistance} m`, cardX + cardW / 2, cardY + 18);

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = dist <= 0.5 ? '#4ade80' : '#facc15';
            const actionText = dist <= 0.5 ? '🟢 ALINHADO! APERTE [ESPACO] PARA TRAVAR' : '◄◄◄ DÊ RÉ DEVAGAR ATÉ A DOCA';
            ctx.fillText(actionText, cardX + cardW / 2, cardY + 36);
        } else if (this.phase3State === 'ALIGNED') {
            const cardX = 490;
            const cardY = 75;
            const cardW = 340;
            const cardH = 46;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#4ade80';
            ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4 TRAVADO NA DOCA!`, cardX + cardW / 2, cardY + 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('INICIANDO MIRA HIDRÁULICA...', cardX + cardW / 2, cardY + 36);
        } else if (this.phase3State === 'DUMPING') {
            const barX = 490;
            const barY = 75;
            const barW = 340;
            const barH = 48;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            // Progress Bar of Carreta
            const innerW = barW - 20;
            const innerH = 14;
            const progressW = Math.floor((innerW * this.dumpProgress) / 100);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(barX + 10, barY + 8, innerW, innerH);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(barX + 10, barY + 8, progressW, innerH);

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`CARRETA: ${this.trailerLoad.toFixed(1)}/30t (${this.dumpProgress}%)`, barX + barW / 2, barY + 19);

            ctx.fillStyle = '#facc15';
            ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4: ${this.truckDumped.toFixed(1)}/7.5t`, barX + barW / 2, barY + 38);
        } else if (this.phase3State === 'TRUCK_EXIT') {
            const barX = 490;
            const barY = 75;
            const barW = 340;
            const barH = 46;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4 DESCARREGADO!`, barX + barW / 2, barY + 18);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`CARRETA: ${this.trailerLoad.toFixed(1)}/30t (${this.dumpProgress}%)`, barX + barW / 2, barY + 36);
        } else if (this.phase3State === 'COMPACTING' || this.phase3State === 'COMPLETE') {
            const barX = 490;
            const barY = 75;
            const barW = 340;
            const barH = 48;
            ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            const innerW = barW - 20;
            const innerH = 14;
            const progressW = Math.floor((innerW * this.tarpCoverProgress) / 100);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(barX + 10, barY + 8, innerW, innerH);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(barX + 10, barY + 8, progressW, innerH);

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`ENLONAMENTO: ${Math.floor(this.tarpCoverProgress)}%`, barX + barW / 2, barY + 19);

            ctx.fillStyle = '#4ade80';
            ctx.fillText('CARRETA 30t PRONTA PARA A RODOVIA!', barX + barW / 2, barY + 38);
        }
        ctx.restore();
    }

    renderPhase4(ctx) {
        const camX = this.camera.x;
        const camY = this.camera.y || 0;

        // 1. Draw Golden Dune Sand Base and Asphalt Highway
        const startX = Math.max(0, Math.floor(camX - 60));
        const endX = Math.min(this.levelWidth, Math.floor(camX + VIRTUAL_WIDTH + 60));
        const step = 16;

        // Golden Sand Dune body below the asphalt
        ctx.beginPath();
        ctx.moveTo(startX, this.getDuneHeight(startX));
        for (let x = startX; x <= endX; x += step) {
            ctx.lineTo(x, this.getDuneHeight(x));
        }
        ctx.lineTo(endX, 600);
        ctx.lineTo(startX, 600);
        ctx.closePath();

        const sandGrad = ctx.createLinearGradient(0, 300, 0, 540);
        sandGrad.addColorStop(0, '#f59e0b');
        sandGrad.addColorStop(0.35, '#d97706');
        sandGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = sandGrad;
        ctx.fill();

        // Asphalt Road Pavement
        const roadThickness = 22;
        ctx.beginPath();
        ctx.moveTo(startX, this.getDuneHeight(startX));
        for (let x = startX; x <= endX; x += step) {
            ctx.lineTo(x, this.getDuneHeight(x));
        }
        ctx.lineTo(endX, this.getDuneHeight(endX) + roadThickness);
        for (let x = endX; x >= startX; x -= step) {
            ctx.lineTo(x, this.getDuneHeight(x) + roadThickness);
        }
        ctx.closePath();
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Top curb edge
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += step) {
            const y = this.getDuneHeight(x);
            if (x === startX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Dashed Yellow Center Road Stripe
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([22, 18]);
        ctx.beginPath();
        for (let x = startX; x <= endX; x += step) {
            const y = this.getDuneHeight(x) + 11;
            if (x === startX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Roadside Signs and Collectibles
        this.renderPhase4TrafficLights(ctx);
        this.renderPhase4Signs(ctx);
        this.renderPhase4Items(ctx);

        // 3. ANTT Weigh Station & Aterro Entrance Gate (x: 3980..4350)
        this.renderWeighStation(ctx);

        // 4. Lost Trash Particles
        this.renderLostTrashParticles(ctx);

        // 5. Articulated Carreta: Semi-Trailer & Tractor Cab
        this.renderArticulatedCarreta(ctx);

        // 6. Air Puffs from Retarder
        this.renderAirPuffs(ctx);

        // 7. In-game Cockpit / Driving Telemetry Overlay
        this.renderPhase4Telemetry(ctx);
    }

    renderPhase4Signs(ctx) {
        const signImg = this.assets['sc_signpost'];
        const camX = this.camera.x;
        for (const dec of this.decorations) {
            if (dec.x + dec.w < camX - 80 || dec.x > camX + VIRTUAL_WIDTH + 80) continue;
            if (signImg) {
                ctx.drawImage(signImg, dec.x, dec.y, dec.w, dec.h);
            } else {
                ctx.fillStyle = '#64748b';
                ctx.fillRect(dec.x, dec.y, dec.w, dec.h);
            }
        }
    }

    renderPhase4Items(ctx) {
        const camX = this.camera.x;
        const now = Date.now();
        for (const item of this.items) {
            if (item.x < camX - 80 || item.x > camX + VIRTUAL_WIDTH + 80) continue;
            const bob = Math.sin(now * 0.005 + item.id) * 4;
            if (item.type === 'biodiesel') {
                const img = this.assets['item_biodiesel'];
                if (img) ctx.drawImage(img, item.x - 14, item.y - 18 + bob, 28, 36);
            } else if (item.type === 'star') {
                const img = this.assets['item_star'];
                if (img) ctx.drawImage(img, item.x - 18, item.y - 18 + bob, 36, 36);
            } else if (item.type === 'wrench') {
                const img = this.assets['item_wrench'];
                if (img) ctx.drawImage(img, item.x - 16, item.y - 16 + bob, 32, 32);
            }
        }
    }

    renderWeighStation(ctx) {
        // 1. Rampa de Subida na Balança (x: 3970 a 4070, sobe de y=390 para y=376)
        ctx.save();
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(3970, 390);
        ctx.lineTo(4070, 376);
        ctx.lineTo(4070, 412);
        ctx.lineTo(3970, 412);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3970, 390);
        ctx.lineTo(4070, 376);
        ctx.stroke();

        // Faixas zebradas amarelas e pretas na borda da rampa
        for (let rx = 3980; rx < 4065; rx += 16) {
            const ry = 390 - ((rx - 3970) / 100) * 14;
            ctx.fillStyle = '#facc15';
            ctx.fillRect(rx, ry, 8, 6);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rx + 8, ry, 8, 6);
        }

        // Setas neon piscantes na rampa indicando subida para a balança
        const chevronBounce = (Math.floor(Date.now() / 180) % 3) * 18;
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fillText('>>> ↗️', 3985 + chevronBounce, 365);
        ctx.shadowBlur = 0;

        // Placa indicativa antes da rampa
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(3930, 290, 70, 36);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(3930, 290, 70, 36);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RAMPA', 3965, 304);
        ctx.fillText('BALANÇA', 3965, 318);
        ctx.fillStyle = '#475569';
        ctx.fillRect(3963, 326, 4, 64);
        ctx.restore();

        // 2. Plataforma Elevada da Balança Rodoviária (x: 4070..4260, y = 376)
        const scaleX = 4070;
        const scaleW = 190;
        const scaleY = 376;
        const scaleH = 34;

        ctx.fillStyle = '#334155';
        ctx.fillRect(scaleX, scaleY, scaleW, scaleH);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(scaleX, scaleY, scaleW, scaleH);

        // Ground Scale Plate Lines & Células de Carga
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        for (let gx = scaleX + 25; gx < scaleX + scaleW; gx += 28) {
            ctx.beginPath();
            ctx.moveTo(gx, scaleY + 2);
            ctx.lineTo(gx, scaleY + scaleH - 2);
            ctx.stroke();
        }

        // Borda Zebrada de Segurança
        const stripeW = 10;
        ctx.save();
        ctx.beginPath();
        ctx.rect(scaleX, scaleY + scaleH - 8, scaleW, 8);
        ctx.clip();
        for (let sx = scaleX - 10; sx < scaleX + scaleW + 20; sx += stripeW * 2) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(sx, scaleY + scaleH - 8, stripeW, 8);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(sx + stripeW, scaleY + scaleH - 8, stripeW, 8);
        }
        ctx.restore();

        // 3. Pórtico e Estrutura do Portão
        const gateImg = this.assets['sc_aterro_gate'];
        if (gateImg) {
            ctx.drawImage(gateImg, 3990, 140, 420, 240);
        } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(4010, 140, 20, 240);
            ctx.fillRect(4370, 140, 20, 240);
            ctx.fillRect(4010, 140, 380, 30);
        }

        // 4. Painel Digital LED Gigante da Balança ANTT (Mostrando o Peso Real!)
        const ledX = 4020;
        const ledY = 150;
        const ledW = 320;
        const ledH = 54;

        ctx.fillStyle = '#020617';
        ctx.fillRect(ledX, ledY, ledW, ledH);
        ctx.strokeStyle = this.scaleWeighed ? '#22c55e' : (this.scaleAutoBraking ? '#facc15' : '#0284c7');
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.strokeRect(ledX, ledY, ledW, ledH);
        ctx.shadowBlur = 0;

        // Cabeçalho do Display LED
        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('BALANÇA RODOVIÁRIA ANTT • PESAGEM OFICIAL', ledX + ledW / 2, ledY + 14);

        // Número Real do Peso em Destaque LED
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.fillStyle = this.scaleWeighed ? '#4ade80' : (this.scaleAutoBraking ? '#fde047' : '#38bdf8');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillText(this.scaleReading || 'AGUARDANDO CARRETA...', ledX + ledW / 2, ledY + 32);

        // Sub-informação de conformidade
        ctx.font = 'bold 7px "Press Start 2P", monospace';
        if (this.scaleWeighed) {
            ctx.fillStyle = '#86efac';
            ctx.fillText('✔ CARGA: 30.000kg | TARA: 15.000kg • CONFORME', ledX + ledW / 2, ledY + 46);
        } else if (this.scaleAutoBraking) {
            ctx.fillStyle = '#fde047';
            ctx.fillText('🛑 FREIO AUTOMÁTICO • PESANDO VEÍCULO...', ledX + ledW / 2, ledY + 46);
        } else {
            ctx.fillStyle = '#64748b';
            ctx.fillText('SUBINDO NA RAMPA • REDUZA A VELOCIDADE', ledX + ledW / 2, ledY + 46);
        }
        ctx.shadowBlur = 0;

        // 5. Portão com Cancela Automática (Pivot em x=4272, y=362)
        const pivotX = 4272;
        const pivotY = 362;

        ctx.fillStyle = '#475569';
        ctx.fillRect(pivotX - 6, pivotY - 14, 12, 40);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pivotX - 6, pivotY - 14, 12, 40);

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(-this.gateAngle * Math.PI / 180);

        const boomLen = 110;
        const boomH = 10;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, -boomH / 2, boomLen, boomH);

        ctx.fillStyle = '#ffffff';
        for (let bx = 12; bx < boomLen; bx += 24) {
            ctx.fillRect(bx, -boomH / 2, 12, boomH);
        }

        ctx.fillStyle = this.scaleWeighed ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(boomLen - 4, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderArticulatedCarreta(ctx) {
        const p = this.player;
        const tr = this.trailer;
        if (!tr) return;

        const cabAngle = this.getDuneAngle(p.x);
        const trailerAngle = tr.angle;

        // 1. Trailer
        ctx.save();
        ctx.translate(tr.x + 115, tr.y + 41 + tr.bounceY);
        ctx.rotate(trailerAngle);

        const trImg = this.assets['sc_carreta_trailer'];
        if (trImg) {
            ctx.drawImage(trImg, -115, -41, 230, 82);
        } else {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-115, -41, 230, 82);
        }

        // 3 Triple Rear Axles (Spinning Wheels)
        const wheelRot = p.x * 0.15;
        const wheelY = 34;
        const wheelRadius = 11;
        [-76, -49, -22].forEach(wx => {
            // Black Rubber Tire
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(wx, wheelY, wheelRadius, 0, Math.PI * 2);
            ctx.fill();
            // Silver Metal Rim
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(wx, wheelY, 6, 0, Math.PI * 2);
            ctx.fill();
            // Spinning Wheel Spoke
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + Math.cos(wheelRot) * 6, wheelY + Math.sin(wheelRot) * 6);
            ctx.lineTo(wx - Math.cos(wheelRot) * 6, wheelY - Math.sin(wheelRot) * 6);
            ctx.stroke();
        });

        // Rear Mudflap with Warning Chevrons
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-115, 24, 6, 18);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-115, 36, 6, 4);

        ctx.restore();

        // 2. Fifth Wheel Hitch & Pneumatic Lines
        ctx.save();
        const hitchCabX = p.x + 18;
        const hitchCabY = p.y + 48;
        const hitchTrX = tr.x + 225;
        const hitchTrY = tr.y + 48 + tr.bounceY;

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(hitchTrX, hitchTrY);
        ctx.lineTo(hitchCabX, hitchCabY);
        ctx.stroke();

        // Red & Blue coiled air hoses
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 28, p.y + 26);
        ctx.quadraticCurveTo((p.x + tr.x + 220) / 2, p.y + 46, tr.x + 218, tr.y + 36 + tr.bounceY);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 28, p.y + 30);
        ctx.quadraticCurveTo((p.x + tr.x + 220) / 2, p.y + 50, tr.x + 218, tr.y + 40 + tr.bounceY);
        ctx.stroke();
        ctx.restore();

        // 3. Tractor Cab
        ctx.save();
        ctx.translate(p.x + 58, p.y + 35);
        ctx.rotate(cabAngle);

        // Headlight Projection Beam
        if (this.speedKmh > 0) {
            const hlGrad = ctx.createRadialGradient(58, 20, 10, 160, 30, 140);
            hlGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
            hlGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
            ctx.fillStyle = hlGrad;
            ctx.beginPath();
            ctx.moveTo(56, 16);
            ctx.lineTo(185, 8);
            ctx.lineTo(185, 42);
            ctx.closePath();
            ctx.fill();
        }

        const cabImg = this.assets['sc_carreta_cab'];
        if (cabImg) {
            ctx.drawImage(cabImg, -58, -35, 116, 70);
        } else {
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(-58, -35, 116, 70);
        }

        // Steer and Drive Wheels
        [-34, 34].forEach(wx => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(wx, 28, wheelRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(wx, 28, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + Math.cos(wheelRot) * 6, 28 + Math.sin(wheelRot) * 6);
            ctx.lineTo(wx - Math.cos(wheelRot) * 6, 28 - Math.sin(wheelRot) * 6);
            ctx.stroke();
        });

        ctx.restore();
    }

    renderLostTrashParticles(ctx) {
        if (!this.lostTrashParticles) return;
        for (const tp of this.lostTrashParticles) {
            ctx.save();
            ctx.translate(tp.x, tp.y);
            ctx.rotate(tp.rot);
            if (tp.type === 'bag') {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(-6, -6, 12, 12);
            } else if (tp.type === 'can') {
                ctx.fillStyle = '#facc15';
                ctx.fillRect(-4, -6, 8, 12);
            } else {
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(-5, -4, 10, 8);
            }
            ctx.restore();
        }
    }

    renderAirPuffs(ctx) {
        if (!this.airPuffs) return;
        for (const puff of this.airPuffs) {
            const alpha = Math.max(0, puff.life / puff.maxLife);
            ctx.fillStyle = `rgba(240, 249, 255, ${alpha * 0.75})`;
            ctx.beginPath();
            ctx.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderPhase4TrafficLights(ctx) {
        if (!this.trafficLights) return;

        for (const tl of this.trafficLights) {
            if (tl.x + tl.w < this.camera.x - 50 || tl.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;

            const groundY = this.getDuneHeight(tl.x);

            // 1. White stop bar 'PARE' on the highway asphalt
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tl.x - 22, groundY - 10, 6, 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PARE', tl.x - 19, groundY + 12);

            // 2. Traffic light pole & housing
            const key = 'tl_' + tl.state.toLowerCase();
            const img = this.assets[key] || this.assets['tl_red'];
            if (img) {
                ctx.drawImage(img, tl.x, tl.y, tl.w, tl.h);
            }

            // 3. Glowing aura in twilight
            ctx.save();
            if (tl.state === 'RED') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
                ctx.beginPath();
                ctx.arc(tl.x + 24, tl.y + 15, 16, 0, Math.PI * 2);
                ctx.fill();
            } else if (tl.state === 'YELLOW') {
                ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
                ctx.beginPath();
                ctx.arc(tl.x + 24, tl.y + 29, 16, 0, Math.PI * 2);
                ctx.fill();
            } else if (tl.state === 'GREEN') {
                ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
                ctx.beginPath();
                ctx.arc(tl.x + 24, tl.y + 43, 16, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // 4. Seta indicadora animada apontando para o semáforo
            ctx.save();
            const arrowX = tl.x + tl.w / 2;
            const bounce = Math.sin(Date.now() / 150) * 8;
            const arrowTipY = tl.y - 12 + bounce;
            const arrowTopY = arrowTipY - 26;

            let arrowColor = '#ef4444';
            let strokeColor = '#ffffff';
            let badgeText = 'PARE';
            let badgeBg = '#dc2626';

            if (tl.state === 'YELLOW') {
                arrowColor = '#facc15';
                strokeColor = '#000000';
                badgeText = 'ATENÇÃO';
                badgeBg = '#ca8a04';
            } else if (tl.state === 'GREEN') {
                arrowColor = '#22c55e';
                strokeColor = '#ffffff';
                badgeText = 'SIGA';
                badgeBg = '#16a34a';
            }

            ctx.shadowColor = arrowColor;
            ctx.shadowBlur = 14;

            ctx.fillStyle = arrowColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(arrowX - 7, arrowTopY);
            ctx.lineTo(arrowX + 7, arrowTopY);
            ctx.lineTo(arrowX + 7, arrowTipY - 14);
            ctx.lineTo(arrowX + 18, arrowTipY - 14);
            ctx.lineTo(arrowX, arrowTipY);
            ctx.lineTo(arrowX - 18, arrowTipY - 14);
            ctx.lineTo(arrowX - 7, arrowTipY - 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.font = 'bold 11px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textWidth = ctx.measureText(badgeText).width + 14;
            const badgeY = arrowTopY - 14;

            ctx.fillStyle = badgeBg;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(arrowX - textWidth / 2, badgeY - 10, textWidth, 20, 5); else ctx.rect(arrowX - textWidth / 2, badgeY - 10, textWidth, 20);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(badgeText, arrowX, badgeY + 1);
            ctx.restore();
        }
    }

    renderPhase4Telemetry(ctx) {
        // Draw in screen space
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const spd = Math.round(this.speedKmh || 0);
        const isOver60 = spd > 60;
        const flashWarn = isOver60 && (Math.floor(Date.now() / 200) % 2 === 0);

        // VELOCÍMETRO NO CENTRO DA TELA
        const boxW = 280;
        const boxH = 72;
        const boxX = Math.round((VIRTUAL_WIDTH - boxW) / 2); // EXATAMENTE NO CENTRO!
        const boxY = 46;

        // Fundo do velocímetro com borda de aviso se passar de 60 km/h
        ctx.fillStyle = flashWarn ? 'rgba(153, 27, 27, 0.92)' : 'rgba(2, 6, 23, 0.88)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 12); else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();

        ctx.strokeStyle = isOver60 ? (flashWarn ? '#ffffff' : '#ef4444') : (spd >= 50 ? '#facc15' : '#22c55e');
        ctx.lineWidth = isOver60 ? 3 : 2;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = isOver60 ? 16 : 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Lado Esquerdo: Placa Circular Oficial de Limite 60
        const signX = boxX + 38;
        const signY = boxY + boxH / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(signX, signY, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('60', signX, signY - 2);
        ctx.font = 'bold 8px "Fredoka", sans-serif';
        ctx.fillText('MÁX', signX, signY + 11);

        // Centro: Dígitos do Velocímetro
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 24px "Press Start 2P", monospace';
        ctx.fillStyle = isOver60 ? '#ffffff' : (spd >= 50 ? '#fef08a' : '#4ade80');
        const spdStr = String(spd).padStart(2, '0');
        ctx.fillText(spdStr, boxX + 78, boxY + 38);

        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('KM/H', boxX + 146, boxY + 38);

        // Barra Gráfica de Velocidade (0 a 80 km/h, marcação vermelha a partir de 60 km/h)
        const barX = boxX + 78;
        const barY = boxY + 46;
        const barW = 186;
        const barH = 8;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // Safe zone fill (0 to 60)
        const speedFillW = Math.min(barW, Math.max(0, (spd / 80) * barW));
        const limit60X = barX + (60 / 80) * barW; // 75% da barra

        const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        barGrad.addColorStop(0, '#22c55e');
        barGrad.addColorStop(0.70, '#facc15');
        barGrad.addColorStop(0.75, '#ef4444');
        barGrad.addColorStop(1.0, '#dc2626');

        ctx.fillStyle = barGrad;
        ctx.fillRect(barX, barY, speedFillW, barH);

        // Linha vermelha no limite 60
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(limit60X, barY - 3);
        ctx.lineTo(limit60X, barY + barH + 3);
        ctx.stroke();

        // Texto Inferior de Orientação
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        if (isOver60) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText('⚠ NÃO PASSAR DE 60 KM/H!', boxX + 78, boxY + 65);
        } else {
            ctx.fillStyle = '#86efac';
            ctx.fillText('LIMITE: MÁX 60 KM/H', boxX + 78, boxY + 65);
        }

        // Telemetria Secundária Compacta (Tração e Freio no topo direito)
        const miniX = VIRTUAL_WIDTH - 190;
        const miniY = 48;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
        ctx.fillRect(miniX, miniY, 178, 38);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(miniX, miniY, 178, 38);

        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.fillStyle = this.tracaoReduzidaActive ? '#facc15' : '#64748b';
        ctx.fillText(this.tracaoReduzidaActive ? '⚡ 6x4 ATIVADA' : '○ 6x4 DIRETA', miniX + 8, miniY + 15);

        ctx.fillStyle = this.freioMotorActive ? '#38bdf8' : '#64748b';
        ctx.fillText(this.freioMotorActive ? '💨 FREIO MOTOR' : '○ FREIO DESL', miniX + 8, miniY + 30);

        ctx.restore();
    }

    renderPhase5(ctx) {
        this.renderPhase5Sector1(ctx);
        this.renderPhase5Sector2(ctx);
        this.renderPhase5Sector3(ctx);
        this.renderPhase5Particles(ctx);

        // Render real animated Cajulim hero during Lagoon & Lab stages!
        if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS' || this.phase5State === 'LAB_ANALYSIS' || this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
            this.renderPlayer(ctx);
        }
    }

    renderPhase5Sector1(ctx) {
        const comp = (this.compactionProgress || 0) / 100;
        const groundY = 460;

        // Ground base
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, groundY, 1750, 80);

        // 1. Célula 1 (x: 120 to 820) - Excavation cutaway with PEAD geomembrane liner
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(120, groundY);
        ctx.lineTo(170, 485);
        ctx.lineTo(770, 485);
        ctx.lineTo(820, groundY);
        ctx.lineTo(820, 540);
        ctx.lineTo(120, 540);
        ctx.closePath();
        ctx.fill();

        // Thick black impermeable PEAD geomembrane liner
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(115, groundY);
        ctx.lineTo(170, 485);
        ctx.lineTo(770, 485);
        ctx.lineTo(820, groundY);
        ctx.stroke();

        // Drainage gravel & perforated pipes at the base
        ctx.fillStyle = '#475569';
        ctx.fillRect(175, 476, 595, 9);
        ctx.fillStyle = '#0f172a';
        for (let x = 185; x < 765; x += 30) {
            ctx.beginPath();
            ctx.arc(x, 480, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Célula 1 Waste Mound - Levels and gets compacted as progress increases
        const moundTopY1 = 418 + comp * 26;
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(170, 475);
        ctx.lineTo(210, moundTopY1);
        ctx.lineTo(750, moundTopY1);
        ctx.lineTo(770, 475);
        ctx.closePath();
        ctx.fill();

        // Solid soil cover capping layer on Célula 1 (appears as tractor compacts)
        if (comp > 0.05) {
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.moveTo(195, moundTopY1);
            ctx.lineTo(765, moundTopY1);
            ctx.lineTo(765, moundTopY1 - Math.min(18, comp * 18));
            ctx.lineTo(195, moundTopY1 - Math.min(18, comp * 18));
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#b45309';
            ctx.fillRect(195, moundTopY1 - Math.min(18, comp * 18), 570, 3);
        }

        // 2. Célula 2 (x: 820 to 1420)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(820, groundY);
        ctx.lineTo(860, 485);
        ctx.lineTo(1380, 485);
        ctx.lineTo(1420, groundY);
        ctx.lineTo(1420, 540);
        ctx.lineTo(820, 540);
        ctx.closePath();
        ctx.fill();

        // PEAD liner Célula 2
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(815, groundY);
        ctx.lineTo(860, 485);
        ctx.lineTo(1380, 485);
        ctx.lineTo(1425, groundY);
        ctx.stroke();

        const moundTopY2 = 422 + comp * 24;
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(860, 475);
        ctx.lineTo(890, moundTopY2);
        ctx.lineTo(1350, moundTopY2);
        ctx.lineTo(1380, 475);
        ctx.closePath();
        ctx.fill();

        // Solid soil cover capping layer on Célula 2
        if (comp > 0.05) {
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.moveTo(880, moundTopY2);
            ctx.lineTo(1360, moundTopY2);
            ctx.lineTo(1360, moundTopY2 - Math.min(18, comp * 18));
            ctx.lineTo(880, moundTopY2 - Math.min(18, comp * 18));
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#b45309';
            ctx.fillRect(880, moundTopY2 - Math.min(18, comp * 18), 480, 3);
        }

        // Clay Quarry hill on the right (x: 1450 to 1720)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(1450, groundY);
        ctx.quadraticCurveTo(1560, 410, 1670, groundY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(1480, groundY);
        ctx.quadraticCurveTo(1560, 425, 1640, groundY);
        ctx.closePath();
        ctx.fill();

        // 3. Compactor Tractor ("Pata de Carneiro")
        if (this.phase5State === 'COMPACTING' || this.phase5State === 'COMPACTING_WAIT_ADVANCE' || this.phase5State === 'SOIL_COVER') {
            const p = this.player;
            const tractorImg = this.assets['sc_trator_compactador'];

            ctx.save();
            ctx.translate(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h / 2));
            if (p.facing < 0) ctx.scale(-1, 1);

            if (tractorImg) {
                ctx.drawImage(tractorImg, -p.w / 2, -p.h / 2, p.w, p.h);
            } else {
                // Procedural compactor tractor
                ctx.fillStyle = '#eab308';
                ctx.fillRect(-p.w / 2 + 20, -p.h / 2 + 15, 85, 38);
                // Cabin
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(-p.w / 2 + 45, -p.h / 2 - 8, 35, 25);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(-p.w / 2 + 50, -p.h / 2 - 4, 25, 18);
                // Wheels
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(-p.w / 2 + 35, p.h / 2 - 12, 18, 0, Math.PI * 2);
                ctx.arc(p.w / 2 - 35, p.h / 2 - 12, 18, 0, Math.PI * 2);
                ctx.fill();
                // Spikes ("Patas de Carneiro")
                ctx.fillStyle = '#94a3b8';
                for (let k = 0; k < 6; k++) {
                    const ang = (k * Math.PI) / 3;
                    ctx.fillRect(-p.w / 2 + 35 + Math.cos(ang) * 16 - 2, p.h / 2 - 12 + Math.sin(ang) * 16 - 2, 4, 4);
                    ctx.fillRect(p.w / 2 - 35 + Math.cos(ang) * 16 - 2, p.h / 2 - 12 + Math.sin(ang) * 16 - 2, 4, 4);
                }
                // Dozer Blade
                ctx.fillStyle = '#ca8a04';
                ctx.fillRect(p.w / 2 - 15, p.h / 2 - 28, 14, 30);
            }
            ctx.restore();
        }

        // Sector 1: Cell ground cutaway and tractor operation (sky kept clean for HUD guide)

        // 5. PROMINENT ARCADE ADVANCE PROMPT WHEN TRACTOR COMPLETES
        if (this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
            const promptW = 620;
            const promptH = 92;
            const promptX = 490;
            const promptY = 220;

            const pulse = 0.85 + Math.sin((this.gameTime || 0) * 8) * 0.15;

            ctx.save();
            ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
            ctx.fillRect(promptX - promptW / 2, promptY - promptH / 2, promptW, promptH);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.strokeRect(promptX - promptW / 2, promptY - promptH / 2, promptW, promptH);

            ctx.textAlign = 'center';
            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#4ade80';
            ctx.fillText('✔ CÉLULA ATERRADA E COMPACTADA COM SUCESSO!', promptX, promptY - 14);

            ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
            ctx.fillText('⭐ APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] PARA AVANCAR ▶', promptX, promptY + 18);
            ctx.restore();
        }
    }

    renderPhase5Sector2(ctx) {
        // Sector 2: Usina de Biogás 10.0 MW (x: 1750 to 3350)
        const groundY = 460;
        ctx.fillStyle = '#15803d';
        ctx.fillRect(1750, groundY, 1600, 80);

        // Underground vertical gas extraction wells
        const wellX = [1850, 1980, 2100, 2220];
        wellX.forEach(wx => {
            ctx.fillStyle = '#334155';
            ctx.fillRect(wx - 4, 380, 8, 100);
            ctx.fillStyle = '#64748b';
            for (let py = 410; py < 475; py += 12) {
                ctx.fillRect(wx - 6, py, 12, 3);
            }
            const bubY = 470 - ((this.gameTime * 40 + wx) % 85);
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(wx, bubY, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Horizontal collection manifold pipe leading to plant
        ctx.fillStyle = '#475569';
        ctx.fillRect(1840, 375, 480, 10);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(2315, 330, 10, 55);

        // Condensation Trap / Moisture Filter (x: 2330, y: 335, w: 45, h: 80)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(2330, 335, 45, 80);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(2330, 335, 45, 80);

        // Water level inside filter
        const moistH = ((this.filterMoisture || 15) / 100) * 65;
        ctx.fillStyle = this.filterMoisture > 70 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(56, 189, 248, 0.65)';
        ctx.fillRect(2332, 413 - moistH, 41, moistH);

        // Purge drain valve
        ctx.fillStyle = '#64748b';
        ctx.fillRect(2348, 415, 9, 15);
        ctx.font = '6px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('FILTRO', 2352, 348);
        ctx.fillText(`${Math.round(this.filterMoisture || 0)}%`, 2352, 360);

        // Biogas Power Station Building & Flare Tower
        const plantImg = this.assets['sc_biogas_plant'];
        if (plantImg) {
            ctx.drawImage(plantImg, 2380, 210, 480, 252);
        } else {
            // Procedural Power Station
            ctx.fillStyle = '#166534';
            ctx.fillRect(2390, 310, 280, 150);
            ctx.fillStyle = '#15803d';
            ctx.fillRect(2380, 290, 300, 22);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
            ctx.fillText('USINA BIOGÁS 10.0 MW ⚡', 2410, 325);
        }

        // Animated Flare Torch (x: 2300, y: 225)
        const flareX = 2300;
        const flareTipY = 225;
        if (this.flareLit) {
            const h = 28 * this.flareFlameScale;
            const flareGrad = ctx.createRadialGradient(flareX, flareTipY - h / 2, 3, flareX, flareTipY - h / 2, 24);
            flareGrad.addColorStop(0, '#60a5fa');
            flareGrad.addColorStop(0.35, '#facc15');
            flareGrad.addColorStop(0.85, '#ef4444');
            flareGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = flareGrad;
            ctx.beginPath();
            ctx.arc(flareX, flareTipY - h / 2, 22 * this.flareFlameScale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dual Turbines (Turbina A & Turbina B)
        const turbX = [2670, 2790];
        turbX.forEach((tx, idx) => {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(tx - 35, 360, 70, 60);
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.strokeRect(tx - 35, 360, 70, 60);

            // Spinning fan rotor
            ctx.save();
            ctx.translate(tx, 390);
            ctx.rotate(this.turbineSpinAngle * (idx === 0 ? 1 : 1.15));
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            for (let b = 0; b < 4; b++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(b * Math.PI / 2) * 22, Math.sin(b * Math.PI / 2) * 22);
                ctx.stroke();
            }
            ctx.restore();

            ctx.font = '6px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#facc15';
            ctx.textAlign = 'center';
            ctx.fillText(`TURBINA ${idx === 0 ? 'A' : 'B'}`, tx, 432);
        });

        // High-voltage transmission lines to the city
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2800, 230);
        ctx.quadraticCurveTo(2950, 250, 3100, 230);
        ctx.quadraticCurveTo(3220, 250, 3350, 230);
        ctx.stroke();

        // Electric power pulses
        if (this.gridSparks) {
            this.gridSparks.forEach(sp => {
                ctx.fillStyle = sp.color;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // =========================================================================
        // PROMINENT RETRO-ARCADE BIOGAS PRESSURE & POWER CONTROL DASHBOARD
        // Centered directly in camera view below HUD banner (y: 112 to 270)
        // =========================================================================
        const dashX = 2240;
        const dashY = 112;
        const dashW = 580;
        const dashH = 154;

        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
        ctx.fillRect(dashX, dashY, dashW, dashH);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(dashX, dashY, dashW, dashH);

        // Header Title
        ctx.font = 'bold 9.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText('⚡ ETAPA 2: REGULAGEM DE PRESSÃO DO BIOGÁS (CH4)', dashX + 16, dashY + 20);

        // 1. Horizontal Pressure Gauge (0 to 100 kPa)
        const barX = dashX + 20;
        const barY = dashY + 28;
        const barW = 540;
        const barH = 24;

        // Background / Low zone (0 to 40 kPa = 40% of bar)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(barX, barY, barW * 0.40, barH);

        // GREEN OPTIMAL ZONE (40 to 70 kPa = 30% of bar)
        ctx.fillStyle = '#15803d';
        ctx.fillRect(barX + barW * 0.40, barY, barW * 0.30, barH);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX + barW * 0.40, barY, barW * 0.30, barH);

        // High zone (70 to 100 kPa = 30% of bar)
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(barX + barW * 0.70, barY, barW * 0.30, barH);

        // Frame
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX, barY, barW, barH);

        // Green Zone Label inside bar
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#86efac';
        ctx.textAlign = 'center';
        ctx.fillText('✔ ZONA IDEAL (40-70 kPa)', barX + barW * 0.55, barY + 16);

        // Current Pressure Needle / Cursor
        const pressVal = Math.max(0, Math.min(100, this.biogasPressure || 50));
        const cursorX = barX + (barW * pressVal) / 100;
        const isOptimal = pressVal >= 40 && pressVal <= 70;

        ctx.fillStyle = isOptimal ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.moveTo(cursorX - 7, barY - 6);
        ctx.lineTo(cursorX + 7, barY - 6);
        ctx.lineTo(cursorX, barY + barH + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Line 2: Digital Readout & Controls
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = isOptimal ? '#4ade80' : '#ef4444';
        ctx.fillText(`PRESSÃO: ${Math.round(pressVal)} kPa [${isOptimal ? 'REGIME IDEAL!' : 'FORA DA ZONA!'}]`, dashX + 20, dashY + 68);

        ctx.font = '7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'right';
        ctx.fillText('CONTROLES: [← A / → D] | [ESPACO/K] PURGAR', dashX + dashW - 16, dashY + 68);

        // 2. Power Generation Bar (0 to 10.0 MW)
        const pwrY = dashY + 78;
        const pwrH = 22;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(barX, pwrY, barW, pwrH);

        const pwrPercent = Math.min(1, (this.biogasPowerMW || 0) / 10.0);
        const pwrGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        pwrGrad.addColorStop(0, '#0284c7');
        pwrGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = pwrGrad;
        ctx.fillRect(barX, pwrY, Math.floor(barW * pwrPercent), pwrH);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(barX, pwrY, barW, pwrH);

        ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`ENERGIA GERADA: ${(this.biogasPowerMW || 0).toFixed(1)} / 10.0 MW (${Math.round(pwrPercent * 100)}%)`, barX + barW / 2, pwrY + 15);

        // Status Bottom Line
        ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        if (this.biogasPowerMW >= 10.0) {
            ctx.fillStyle = '#4ade80';
            ctx.fillText('⚡ 10.0 MW GERADOS! 50.000 CASAS ABASTECIDAS COM SUCESSO!', dashX + dashW / 2, dashY + 120);
            ctx.fillStyle = '#facc15';
            ctx.fillText('APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] PARA AVANCAR ▶', dashX + dashW / 2, dashY + 138);
        } else if (isOptimal) {
            ctx.fillStyle = '#4ade80';
            ctx.fillText('⚡ GERANDO ENERGIA LIMPA (+2.4 MW/s)! MANTENHA A PRESSÃO!', dashX + dashW / 2, dashY + 124);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Filtro de Condensado: ' + Math.round(this.filterMoisture || 0) + '% (Purgar c/ Espaço se subir)', dashX + dashW / 2, dashY + 140);
        } else {
            ctx.fillStyle = '#facc15';
            ctx.fillText('⚠ AJUSTE A PRESSÃO P/ DENTRO DA ZONA VERDE (40-70 kPa)!', dashX + dashW / 2, dashY + 124);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('Use as teclas [A / ←] ou [D / →] para regular a válvula de metano', dashX + dashW / 2, dashY + 140);
        }
        ctx.restore();

        // 3. PROMINENT ARCADE ADVANCE PROMPT WHEN BIOGAS COMPLETES
        if (this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
            const promptW = 640;
            const promptH = 92;
            const promptX = 2530;
            const promptY = 280;

            const pulse = 0.85 + Math.sin((this.gameTime || 0) * 8) * 0.15;

            ctx.save();
            ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
            ctx.fillRect(promptX - promptW / 2, promptY - promptH / 2, promptW, promptH);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.strokeRect(promptX - promptW / 2, promptY - promptH / 2, promptW, promptH);

            ctx.textAlign = 'center';
            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('⚡ USINA 100% CARREGADA (10.0 MW GERADOS)!', promptX, promptY - 14);

            ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
            ctx.fillText('⭐ APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] PARA AVANCAR ▶', promptX, promptY + 18);
            ctx.restore();
        }
    }

    renderPhase5Sector3(ctx) {
        // Sector 3: Complexo de 3 Lagoas & Laboratório ETE (x: 3350 to 5200)
        const groundY = 460;
        ctx.fillStyle = '#15803d';
        ctx.fillRect(3350, groundY, 1850, 80);

        const trt = (this.chorumeTreated || 0) / 100;

        // 1. Lagoa 1: Decantação Anaeróbia de Lodo (x: 3420 to 3840)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(3420, 430);
        ctx.lineTo(3460, 490);
        ctx.lineTo(3800, 490);
        ctx.lineTo(3840, 430);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(3415, 430);
        ctx.lineTo(3460, 490);
        ctx.lineTo(3800, 490);
        ctx.lineTo(3845, 430);
        ctx.stroke();

        // Dark Leachate Water (Chorume Bruto)
        ctx.fillStyle = '#3a2012';
        ctx.fillRect(3445, 442, 370, 44);

        ctx.font = '7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('1. DECANTAÇÃO ANAERÓBIA', 3630, 436);

        // 2. Lagoa 2: Aeração Facultativa com 3 Aeradores Mecânicos (x: 3880 to 4680)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(3880, 430);
        ctx.lineTo(3920, 490);
        ctx.lineTo(4640, 490);
        ctx.lineTo(4680, 430);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(3875, 430);
        ctx.lineTo(3920, 490);
        ctx.lineTo(4640, 490);
        ctx.lineTo(4685, 430);
        ctx.stroke();

        // Dynamic Wastewater color transition
        const r = Math.round(58 + (40 * (1 - trt)));
        const g = Math.round(35 + trt * 150);
        const b = Math.round(20 + trt * 220);
        const waterColor = `rgb(${r}, ${g}, ${b})`;

        ctx.fillStyle = waterColor;
        ctx.beginPath();
        ctx.moveTo(3900, 440);
        for (let wx = 3900; wx <= 4660; wx += 25) {
            const wy = 440 + Math.sin(this.gameTime * 3 + wx * 0.05) * 3;
            ctx.lineTo(wx, wy);
        }
        ctx.lineTo(4635, 485);
        ctx.lineTo(3925, 485);
        ctx.closePath();
        ctx.fill();

        ctx.font = '7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#86efac';
        ctx.textAlign = 'center';
        ctx.fillText('2. AERAÇÃO FACULTATIVA (3 AERADORES)', 4280, 436);

        // 3. Lagoa 3: Polimento e Reúso (x: 4720 to 5000)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(4720, 430);
        ctx.lineTo(4750, 490);
        ctx.lineTo(4970, 490);
        ctx.lineTo(5000, 430);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(4715, 430);
        ctx.lineTo(4750, 490);
        ctx.lineTo(4970, 490);
        ctx.lineTo(5005, 430);
        ctx.stroke();

        // Crystal-clear turquoise water
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(4740, 442, 240, 44);

        ctx.font = '7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('3. POLIMENTO & REÚSO 🌱', 4860, 436);

        // Water lilies on Lagoon 3
        ctx.fillStyle = '#22c55e';
        for (let lx = 4760; lx < 4960; lx += 45) {
            const ly = 444 + Math.sin(this.gameTime * 2 + lx) * 2;
            ctx.beginPath();
            ctx.arc(lx, ly, 7, 0, Math.PI * 1.8);
            ctx.fill();
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(lx, ly - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#22c55e';
        }

        // Boardwalk / Inspection Pier (x: 3380 to 5160, y: 420)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(3380, 420, 1780, 10);
        ctx.fillStyle = '#b45309';
        for (let px = 3390; px < 5160; px += 20) {
            ctx.fillRect(px, 420, 2, 10);
        }

        // 3 Floating Surface Aerators in Lagoa 2
        const aeratorImg = this.assets['sc_lagoa_aerador'];
        this.aerators.forEach((a) => {
            const bobY = Math.sin(a.bobPhase) * 3;

            ctx.save();
            ctx.translate(a.x, a.y + bobY);

            if (aeratorImg) {
                ctx.drawImage(aeratorImg, 0, 0, a.w, a.h);
            } else {
                // Floats
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.roundRect(5, 40, 25, 14, 6);
                ctx.roundRect(35, 40, 25, 14, 6);
                ctx.roundRect(65, 40, 25, 14, 6);
                ctx.fill();

                // Frame
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(15, 40);
                ctx.lineTo(47, 18);
                ctx.lineTo(75, 40);
                ctx.stroke();

                // Motor
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(40, 6, 16, 16);

                // Spinning Paddle Wheel
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const ang = this.gameTime * (a.active ? 15 : 1);
                ctx.arc(47, 46, 12, ang, ang + Math.PI);
                ctx.stroke();
            }

            // Aerator Status Badge
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            if (a.active) {
                ctx.fillStyle = '#4ade80';
                ctx.fillText('✔ 120 RPM', 45, -6);
            } else {
                ctx.fillStyle = '#facc15';
                ctx.fillText('LIGAR [PULO]', 45, -6);
            }
            ctx.restore();
        });

        // 4. Estação Laboratorial ETE (x: 5020 to 5160)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(5020, 310, 130, 110);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(5015, 300, 140, 14);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(5030, 325, 110, 48);

        // Digital screen
        ctx.fillStyle = '#020617';
        ctx.fillRect(5035, 330, 100, 38);
        ctx.font = '6.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = this.labSampleTested ? '#4ade80' : '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText('LAB ETE', 5085, 344);
        ctx.fillText(this.labSampleTested ? 'pH 7.0 ✔' : 'COLETA ⏳', 5085, 358);

        // Test tube rack
        ctx.fillStyle = '#64748b';
        ctx.fillRect(5050, 395, 60, 8);
        for (let t = 0; t < 5; t++) {
            ctx.fillStyle = this.labSampleTested ? '#38bdf8' : '#e0f2fe';
            ctx.fillRect(5055 + t * 10, 380, 6, 18);
        }

        // Action prompt if near LAB in LAB_ANALYSIS
        if (this.phase5State === 'LAB_ANALYSIS' && !this.labSampleTested) {
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#facc15';
            ctx.textAlign = 'center';
            ctx.fillText('🧪 COLETAR LAUDO [ESPACO / K / JOYSTICK]', 5085, 290);
        }

        // Sector 3: 3 Lagoas & Laboratório ETE (sky kept clean for HUD guide)

        // 5. PROMINENT ARCADE ADVANCE PROMPT WHEN CAJULIM COMPLETES LAB
        if (this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
            const promptW = 660;
            const promptH = 92;
            const promptX = 4720;
            const promptY = 230;

            const pulse = 0.85 + Math.sin((this.gameTime || 0) * 8) * 0.15;

            ctx.save();
            ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
            ctx.fillRect(promptX - promptW / 2, promptY - promptH / 2, promptW, promptH);
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 3;
            ctx.strokeRect(promptX - promptW / 2, promptY - promptH / 2, promptW, promptH);

            ctx.textAlign = 'center';
            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#4ade80';
            ctx.fillText('🎉 AGUA 100% PURIFICADA! LAUDO APROVADO!', promptX, promptY - 14);

            ctx.font = 'bold 10.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
            ctx.fillText('⭐ APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] P/ A HISTÓRIA ▶', promptX, promptY + 18);
            ctx.restore();
        }
    }
    renderPhase5Particles(ctx) {
        if (!this.phase5Particles) return;
        this.phase5Particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    renderPhase6(ctx) {
        this.renderPhase6Plaza(ctx);
        this.renderPhase6Platforms(ctx);
        this.renderPhase6SpringDumpsters(ctx);
        this.renderPhase6Hazards(ctx);
        this.renderPhase6Boss(ctx);
        this.renderPlayer(ctx);
    }

    renderPhase6Plaza(ctx) {
        const groundY = 460;

        // Pavement base
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, groundY, 1400, 80);

        // Cobblestone / flagstone pattern
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        for (let x = 0; x < 1400; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x, groundY + 80);
            ctx.stroke();
            for (let y = groundY + 16; y < groundY + 80; y += 16) {
                const shift = ((y / 16) % 2 === 0) ? 0 : 20;
                ctx.beginPath();
                ctx.moveTo(x + shift, y);
                ctx.lineTo(x + shift + 20, y);
                ctx.stroke();
            }
        }

        // Curb with hazard diagonal stripes in work zones
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, groundY - 6, 1400, 6);
        ctx.fillStyle = '#facc15';
        for (let x = 0; x < 1400; x += 32) {
            ctx.fillRect(x, groundY - 6, 16, 6);
        }

        // Vintage Plaza Streetlamps
        const lampX = [80, 460, 780, 1260];
        lampX.forEach(lx => {
            // Pole
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(lx - 3, groundY - 120, 6, 120);
            ctx.fillRect(lx - 12, groundY - 10, 24, 10); // Base

            // Lantern Head
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.moveTo(lx - 10, groundY - 120);
            ctx.lineTo(lx + 10, groundY - 120);
            ctx.lineTo(lx + 7, groundY - 100);
            ctx.lineTo(lx - 7, groundY - 100);
            ctx.closePath();
            ctx.fill();

            // Glowing light
            ctx.fillStyle = '#fde047';
            ctx.fillRect(lx - 6, groundY - 118, 12, 16);
            ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
            ctx.beginPath();
            ctx.arc(lx, groundY - 110, 24, 0, Math.PI * 2);
            ctx.fill();
        });

        // Municipal Plaza Banner
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(40, 395, 260, 42);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 395, 260, 42);
        ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('🏛️ PRAÇA CENTRAL MUNICIPAL', 170, 412);
        ctx.fillStyle = '#86efac';
        ctx.fillText('ZONA DE PRESERVAÇÃO & COLETA', 170, 426);

        // Caution Barricades at boundaries
        [20, 1330].forEach(bx => {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(bx, groundY - 32, 40, 32);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(bx, groundY - 32);
            ctx.lineTo(bx + 14, groundY - 32);
            ctx.lineTo(bx, groundY - 18);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(bx + 20, groundY - 32);
            ctx.lineTo(bx + 34, groundY - 32);
            ctx.lineTo(bx + 6, groundY);
            ctx.lineTo(bx, groundY);
            ctx.closePath();
            ctx.fill();
        });
    }

    renderPhase6Platforms(ctx) {
        // Scaffolding towers
        for (const plat of this.platforms) {
            if (plat.type !== 'scaffold') continue;

            // Wooden Deck Planks
            ctx.fillStyle = '#b45309'; // Rich cedar wood
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(plat.x + 2, plat.y + 2, plat.w - 4, plat.h - 6);

            // Wood plank dividers
            ctx.fillStyle = '#78350f';
            for (let px = plat.x + 24; px < plat.x + plat.w; px += 24) {
                ctx.fillRect(px, plat.y, 2, plat.h);
            }

            // Hazard Warning tape on the platform front edge
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(plat.x, plat.y + plat.h - 3, plat.w, 3);
            ctx.fillStyle = '#facc15';
            for (let hx = plat.x; hx < plat.x + plat.w; hx += 16) {
                ctx.fillRect(hx, plat.y + plat.h - 3, 8, 3);
            }

            // Vertical Steel Tubular Posts extending downward
            ctx.fillStyle = '#94a3b8'; // Galvanized steel
            const postX1 = plat.x + 12;
            const postX2 = plat.x + plat.w - 12;
            const postBottomY = 460;
            const postH = postBottomY - plat.y;

            [postX1, postX2].forEach(px => {
                ctx.fillRect(px - 3, plat.y + plat.h, 6, postH - plat.h);
                // Metal couplers / clamps
                ctx.fillStyle = '#475569';
                for (let cy = plat.y + plat.h + 20; cy < postBottomY; cy += 35) {
                    ctx.fillRect(px - 5, cy, 10, 6);
                }
                ctx.fillStyle = '#94a3b8';
            });

            // Steel Cross-Bracing Struts (X struts) between the two posts
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            for (let sy = plat.y + plat.h; sy < postBottomY - 20; sy += 50) {
                const ey = Math.min(postBottomY, sy + 50);
                ctx.beginPath();
                ctx.moveTo(postX1, sy);
                ctx.lineTo(postX2, ey);
                ctx.moveTo(postX2, sy);
                ctx.lineTo(postX1, ey);
                ctx.stroke();
            }
        }
    }

    renderPhase6SpringDumpsters(ctx) {
        for (const d of this.springDumpsters) {
            ctx.save();
            ctx.translate(d.x + d.w / 2, d.y + d.h);
            ctx.scale(1.0, d.scaleY);

            const dw = d.w;
            const dh = d.h;

            // Heavy-duty compression spring under the dumpster
            const springH = 12;
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-dw * 0.28, 0);
            for (let i = 0; i < 4; i++) {
                const sx = (i % 2 === 0 ? dw * 0.28 : -dw * 0.28);
                const sy = (i / 4) * springH;
                ctx.lineTo(sx, sy);
            }
            ctx.stroke();

            // Dumpster Body
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.moveTo(-dw / 2, -dh);
            ctx.lineTo(dw / 2, -dh);
            ctx.lineTo(dw / 2 - 4, 0);
            ctx.lineTo(-dw / 2 + 4, 0);
            ctx.closePath();
            ctx.fill();

            // Metal Rim / Lip on top
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-dw / 2 - 3, -dh - 4, dw + 6, 5);

            // Reinforcement ribs
            ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
            ctx.fillRect(-dw * 0.25, -dh + 4, 4, dh - 8);
            ctx.fillRect(dw * 0.25 - 4, -dh + 4, 4, dh - 8);

            // Recycling Symbol ♻
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('♻', 0, -dh * 0.45);

            // Label
            ctx.font = 'bold 6.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillText(d.label, 0, -6);

            ctx.restore();

            // Floating "SUPER SALTO" Arrow when player is nearby
            const bounceHover = Math.sin(Date.now() / 200) * 3;
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            ctx.fillText('▲ SUPER SALTO ▲', d.x + d.w / 2, d.y - 14 + bounceHover);
        }
    }

    renderPhase6Hazards(ctx) {
        // Oil Puddles
        for (const pud of this.bossOilPuddles) {
            const alpha = Math.min(1, pud.life / 2.0);
            ctx.fillStyle = `rgba(15, 23, 42, ${0.92 * alpha})`;
            ctx.beginPath();
            ctx.ellipse(pud.x + pud.w / 2, 460, pud.w / 2, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Iridescent sheen
            const sheenWave = (Math.sin(Date.now() / 300) + 1) / 2;
            ctx.strokeStyle = `rgba(${Math.floor(100 + sheenWave * 100)}, 220, 240, ${0.7 * alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(pud.x + pud.w / 2, 459, pud.w * 0.35, 3, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.font = 'bold 6.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = `rgba(234, 179, 8, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.fillText('ÓLEO ⚠', pud.x + pud.w / 2, 448);
        }

        // Bouncing Tires
        for (const t of this.bossTires) {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rot);

            // Tire Outer Rubber
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();

            // Tread Lugs
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 3;
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
                ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
                ctx.stroke();
            }

            // Inner Wheel Rim
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Falling Debris
        for (const d of this.bossDebris) {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rot);

            if (d.type === 'trash') {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(-10, -10, 20, 20);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(-4, -13, 8, 5); // Knot
            } else if (d.type === 'brick') {
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(-12, -7, 24, 14);
                ctx.strokeStyle = '#fca5a5';
                ctx.lineWidth = 1;
                ctx.strokeRect(-12, -7, 24, 14);
            } else {
                // Pipe
                ctx.fillStyle = '#78716c';
                ctx.fillRect(-14, -6, 28, 12);
                ctx.fillStyle = '#b45309'; // Rust spots
                ctx.fillRect(-5, -4, 10, 8);
            }

            ctx.restore();
        }
    }

    renderPhase6Boss(ctx) {
        const boss = this.boss;
        if (!boss) return;

        // 1. COMMUNITY SERVICE SCENE
        if (this.phase6State === 'COMMUNITY_SERVICE') {
            // Disabled, broken Mecha-Trator with smoke
            ctx.save();
            ctx.translate(boss.x + boss.w / 2, 460);

            // Broken Mecha chassis
            ctx.fillStyle = '#475569';
            ctx.fillRect(-70, -80, 140, 55);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-85, -25, 170, 25); // Treads flat
            // Broken glass dome
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -80, 32, Math.PI, 0);
            ctx.stroke();
            // Cracks in glass
            ctx.beginPath();
            ctx.moveTo(-10, -100);
            ctx.lineTo(5, -85);
            ctx.lineTo(15, -95);
            ctx.stroke();

            // Broken Shovel resting on floor
            ctx.fillStyle = '#334155';
            ctx.fillRect(60, -35, 45, 35);

            // Recycling Sign staked on the machine
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-65, -125, 130, 28);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(-65, -125, 130, 28);
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.fillText('♻️ P/ RECICLAGEM', 0, -112);
            ctx.fillText('FERRO VELHO', 0, -101);

            ctx.restore();

            // Animated Barão do Entulho sweeping the ground
            const baraoX = boss.x - 70;
            const baraoY = 460;
            const sweepOffset = Math.sin(Date.now() / 150) * 14;

            // Barão Body
            // Legs / Trousers (Dark suit trousers)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(baraoX - 10, baraoY - 30, 8, 30);
            ctx.fillRect(baraoX + 2, baraoY - 30, 8, 30);
            // Black formal shoes
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(baraoX - 14, baraoY - 6, 12, 6);
            ctx.fillRect(baraoX + 2, baraoY - 6, 12, 6);

            // Gari Reflective Vest over dark suit
            ctx.fillStyle = '#ea580c'; // Neon Orange
            ctx.fillRect(baraoX - 12, baraoY - 55, 24, 25);
            // High-visibility green/yellow stripes
            ctx.fillStyle = '#84cc16';
            ctx.fillRect(baraoX - 12, baraoY - 48, 24, 4);
            ctx.fillRect(baraoX - 12, baraoY - 38, 24, 4);

            // Head / Face
            ctx.fillStyle = '#fcd34d'; // Face skin
            ctx.fillRect(baraoX - 8, baraoY - 72, 16, 17);

            // Curled Villain Mustache
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(baraoX - 12, baraoY - 62);
            ctx.quadraticCurveTo(baraoX, baraoY - 60, baraoX + 12, baraoY - 62);
            ctx.lineTo(baraoX + 8, baraoY - 58);
            ctx.lineTo(baraoX - 8, baraoY - 58);
            ctx.closePath();
            ctx.fill();

            // Golden Monocle
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(baraoX - 4, baraoY - 67, 3.5, 0, Math.PI * 2);
            ctx.stroke();

            // Top Hat (slightly tilted)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(baraoX - 14, baraoY - 75, 28, 4); // Brim
            ctx.fillRect(baraoX - 9, baraoY - 95, 18, 20); // Cylinder
            ctx.fillStyle = '#a855f7'; // Purple ribbon
            ctx.fillRect(baraoX - 9, baraoY - 79, 18, 4);

            // Wooden Broom & Sweeping Motion
            ctx.save();
            ctx.strokeStyle = '#b45309'; // Broom handle
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(baraoX + 4, baraoY - 45);
            ctx.lineTo(baraoX + 24 + sweepOffset, baraoY);
            ctx.stroke();

            // Straw broom bristles
            ctx.fillStyle = '#fde047';
            ctx.fillRect(baraoX + 16 + sweepOffset, baraoY - 8, 18, 8);
            ctx.restore();

            // Dust pile swept up
            ctx.fillStyle = '#78716c';
            ctx.beginPath();
            ctx.arc(baraoX + 40, baraoY - 3, 7, 0, Math.PI * 2);
            ctx.fill();

            // Full Green Trash Bag next to him
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.arc(baraoX - 25, baraoY - 12, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#facc15';
            ctx.fillRect(baraoX - 27, baraoY - 26, 5, 5); // Yellow tie

            // Educational Comic Speech Bubble over Barão
            const bubbleX = baraoX - 110;
            const bubbleY = baraoY - 140;
            const bubbleW = 280;
            const bubbleH = 36;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#ea580c';
            ctx.lineWidth = 2;
            ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
            ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

            // Pointer
            ctx.beginPath();
            ctx.moveTo(baraoX, bubbleY + bubbleH);
            ctx.lineTo(baraoX - 6, bubbleY + bubbleH + 8);
            ctx.lineTo(baraoX + 8, bubbleY + bubbleH);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.fillText('300 HORAS DE SERVIÇO COMUNITÁRIO!', bubbleX + bubbleW / 2, bubbleY + 15);
            ctx.fillStyle = '#16a34a';
            ctx.fillText('AGORA APRENDI: LUGAR DE LIXO É NO LIXO!', bubbleX + bubbleW / 2, bubbleY + 28);

            return;
        }

        // 2. BOSS IN BATTLE (MECHA-TRATOR POLUIDOR 9000)
        // Flashing when damaged / invulnerable
        if (boss.invulnerableTimer > 0 && Math.floor(boss.invulnerableTimer * 12) % 2 === 0) {
            return; // Rapid blink
        }

        ctx.save();
        ctx.translate(boss.x + boss.w / 2, boss.y + boss.h);
        ctx.scale(boss.facing, 1);

        // Shake if RAM_PREP or HURT
        if (boss.state === 'RAM_PREP' || boss.state === 'HURT') {
            ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
        }

        // --- CATERPILLAR TANK TREADS ---
        const treadW = 140;
        const treadH = 28;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-treadW / 2, -treadH, treadW, treadH, 12);
        } else {
            ctx.rect(-treadW / 2, -treadH, treadW, treadH);
        }
        ctx.fill();

        // Cleat ridges on the tracks
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        const trackSpin = (boss.x * 0.2) % 18;
        for (let tx = -treadW / 2 + 10 + trackSpin; tx < treadW / 2 - 5; tx += 18) {
            ctx.beginPath();
            ctx.moveTo(tx, -treadH);
            ctx.lineTo(tx - 4, -treadH + 6);
            ctx.moveTo(tx, 0);
            ctx.lineTo(tx - 4, -6);
            ctx.stroke();
        }

        // 4 Inner Sprocket Wheels
        [-50, -17, 17, 50].forEach(wx => {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(wx, -treadH / 2, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(wx, -treadH / 2, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- MAIN ARMORED BOILER CHASSIS ---
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-65, -82, 130, 56);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(-65, -82, 130, 56);

        // Rust stains & battle scratches
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-45, -70, 16, 8);
        ctx.fillRect(15, -60, 22, 6);
        ctx.fillRect(-10, -45, 14, 12);

        // Heavy steel rivets
        ctx.fillStyle = '#94a3b8';
        [-58, -20, 20, 58].forEach(rx => {
            ctx.fillRect(rx, -80, 3, 3);
            ctx.fillRect(rx, -30, 3, 3);
        });

        // Radiator grille with glowing engine heat
        ctx.fillStyle = boss.phase === 3 ? '#ef4444' : '#f97316';
        ctx.fillRect(38, -68, 22, 26);
        ctx.fillStyle = '#0f172a';
        for (let gy = -66; gy < -44; gy += 6) {
            ctx.fillRect(38, gy, 22, 2.5);
        }

        // --- DUAL EXHAUST SMOKESTACKS (REAR) ---
        [-52, -38].forEach(exX => {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(exX, -112, 10, 32);
            ctx.fillStyle = '#334155';
            ctx.fillRect(exX - 2, -116, 14, 5); // Smokestack lip
            ctx.fillStyle = boss.phase === 3 ? '#ef4444' : '#f59e0b';
            ctx.fillRect(exX + 2, -115, 6, 3);
        });

        // --- MASSIVE BULLDOZER PÁ DE SUCATA (FRONT) ---
        const shovelX = 58;
        const shovelY = -56;
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(shovelX, shovelY - 15);
        ctx.lineTo(shovelX + 32, shovelY);
        ctx.lineTo(shovelX + 32, 0);
        ctx.lineTo(shovelX + 8, 2);
        ctx.lineTo(shovelX - 4, -20);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Sharp scrap teeth on blade edge
        ctx.fillStyle = '#94a3b8';
        for (let ty = shovelY + 4; ty < -4; ty += 8) {
            ctx.beginPath();
            ctx.moveTo(shovelX + 32, ty);
            ctx.lineTo(shovelX + 40, ty + 4);
            ctx.lineTo(shovelX + 32, ty + 8);
            ctx.closePath();
            ctx.fill();
        }

        // Hazard diagonal yellow/black warning stripes on shovel
        ctx.fillStyle = '#facc15';
        ctx.fillRect(shovelX + 6, shovelY + 2, 22, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(shovelX + 12, shovelY + 2, 5, 6);
        ctx.fillRect(shovelX + 22, shovelY + 2, 5, 6);

        // Hydraulic Cylinder arm connected to body
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(25, -55);
        ctx.lineTo(shovelX + 10, shovelY);
        ctx.stroke();

        // --- GLASS COCKPIT DOME (WEAK SPOT) ---
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan translucent glass
        ctx.beginPath();
        ctx.arc(0, -82, 34, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Glass glare highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -82, 28, Math.PI * 1.15, Math.PI * 1.45);
        ctx.stroke();

        // --- BARÃO DO ENTULHO (INSIDE COCKPIT) ---
        // Aristocratic Suit
        ctx.fillStyle = '#581c87'; // Royal villain purple coat
        ctx.fillRect(-14, -80, 28, 18);
        ctx.fillStyle = '#ffffff'; // Shirt front
        ctx.fillRect(-4, -80, 8, 14);
        ctx.fillStyle = '#b91c1c'; // Red cravat
        ctx.fillRect(-5, -78, 10, 5);

        // Hands on hydraulic levers
        ctx.fillStyle = '#fcd34d';
        ctx.fillRect(-18, -72, 6, 6);
        ctx.fillRect(12, -72, 6, 6);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, -68); ctx.lineTo(-15, -60);
        ctx.moveTo(15, -68); ctx.lineTo(15, -60);
        ctx.stroke();

        // Face
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-10, -96, 20, 18);

        // Eyes & Expression
        if (boss.state === 'HURT' || boss.state === 'STUNNED') {
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-7, -92); ctx.lineTo(-3, -88);
            ctx.moveTo(-3, -92); ctx.lineTo(-7, -88);
            ctx.moveTo(3, -92); ctx.lineTo(7, -88);
            ctx.moveTo(7, -92); ctx.lineTo(3, -88);
            ctx.stroke();
            // Sweat droplet
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(12, -100, 3, 5);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-6, -91, 3, 3);
            ctx.fillRect(4, -91, 3, 3);
        }

        // Curled Villain Mustache
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-14, -84);
        ctx.quadraticCurveTo(0, -82, 14, -84);
        ctx.lineTo(9, -80);
        ctx.lineTo(-9, -80);
        ctx.closePath();
        ctx.fill();

        // Golden Monocle
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-5, -90, 4, 0, Math.PI * 2);
        ctx.stroke();

        // Top Hat
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-16, -98, 32, 4); // Brim
        ctx.fillRect(-10, -118, 20, 20); // Cylinder
        ctx.fillStyle = '#ef4444'; // Red ribbon
        ctx.fillRect(-10, -102, 20, 4);

        // Siren on top of Dome
        const sirenColor = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ef4444' : '#facc15';
        ctx.fillStyle = sirenColor;
        ctx.beginPath();
        ctx.arc(0, -118, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Phase 3 Overcharge Electrical Arcs
        if (boss.phase === 3) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            for (let s = 0; s < 3; s++) {
                const sx1 = (Math.random() - 0.5) * 110;
                const sy1 = -70 + (Math.random() - 0.5) * 40;
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                ctx.lineTo(sx1 + (Math.random() - 0.5) * 20, sy1 + (Math.random() - 0.5) * 20);
                ctx.stroke();
            }
        }

        ctx.restore();

        // --- SONIC-STYLE BOUNCE WEAK SPOT GUIDE ARROW ---
        if (boss.invulnerableTimer <= 0 && boss.state !== 'HURT') {
            const arrowY = boss.y - 30 + Math.sin(Date.now() / 180) * 5;
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#f43f5e';
            ctx.textAlign = 'center';
            ctx.fillText('▼ PULE NO CAPÔ! ▼', boss.x + boss.w / 2, arrowY);
        }
    }

    renderBackground(ctx) {
        if (this.currentPhase === 1) {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
            skyGrad.addColorStop(0, '#52a2ff');
            skyGrad.addColorStop(0.65, '#a1e6ff');
            skyGrad.addColorStop(1, '#e3f7ff');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

            // Distant hills
            const hillOffset = - (this.camera.x * 0.15) % 400;
            ctx.fillStyle = '#68b874';
            for (let i = -1; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(i * 380 + hillOffset, 420, 220, Math.PI, 0, false);
                ctx.fill();
            }

            // Fluffy Clouds
            const cloudImg = this.assets['sc_cloud'];
            if (cloudImg) {
                const cloudX1 = (100 - this.camera.x * 0.08) % (VIRTUAL_WIDTH + 200);
                const cloudX2 = (500 - this.camera.x * 0.05) % (VIRTUAL_WIDTH + 200);
                const cloudX3 = (850 - this.camera.x * 0.06) % (VIRTUAL_WIDTH + 200);
                ctx.drawImage(cloudImg, cloudX1 - 100, 40, 140, 70);
                ctx.drawImage(cloudImg, cloudX2 - 100, 90, 170, 85);
                ctx.drawImage(cloudImg, cloudX3 - 100, 50, 130, 65);
            }
        } else if (this.currentPhase === 4) {
            // Phase 4 Coastal Sand Dunes Panoramic Background
            const dunesBg = this.assets['sc_dunes_bg'];
            if (dunesBg) {
                const camX = (this.camera.x || 0) * 0.15;
                const bgW = 960;
                const bgH = 540;
                const offset = - (camX % bgW);
                ctx.drawImage(dunesBg, offset, 0, bgW, bgH);
                ctx.drawImage(dunesBg, offset + bgW, 0, bgW, bgH);
                if (offset > 0) ctx.drawImage(dunesBg, offset - bgW, 0, bgW, bgH);
            } else {
                const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
                skyGrad.addColorStop(0, '#38bdf8');
                skyGrad.addColorStop(0.55, '#fde68a');
                skyGrad.addColorStop(1, '#f59e0b');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
            }
        } else if (this.currentPhase === 5) {
            // Phase 5 Sanitary Landfill & Green Energy Background
            const aterroBg = this.assets['sc_aterro_complex_bg'];
            if (aterroBg) {
                const camX = (this.camera.x || 0) * 0.18;
                const bgW = 1280;
                const bgH = 720;
                const offset = - (camX % bgW);
                ctx.drawImage(aterroBg, offset, 0, bgW, bgH);
                ctx.drawImage(aterroBg, offset + bgW, 0, bgW, bgH);
                if (offset > 0) ctx.drawImage(aterroBg, offset - bgW, 0, bgW, bgH);
            } else {
                const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
                skyGrad.addColorStop(0, '#38bdf8');
                skyGrad.addColorStop(0.5, '#bae6fd');
                skyGrad.addColorStop(1, '#86efac');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
            }
        } else if (this.currentPhase === 6) {
            // Phase 6 Boss Arena: Dramatic Polluted Twilight Sky over Urban Plaza
            const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
            skyGrad.addColorStop(0, '#090514');
            skyGrad.addColorStop(0.35, '#2e0854');
            skyGrad.addColorStop(0.7, '#881337');
            skyGrad.addColorStop(1, '#e11d48');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

            // Dark industrial smog clouds
            ctx.fillStyle = 'rgba(24, 15, 36, 0.45)';
            for (let i = 0; i < 6; i++) {
                const cx = (i * 240 - (this.camera.x * 0.1)) % (VIRTUAL_WIDTH + 260) - 60;
                ctx.beginPath();
                ctx.arc(cx, 110 + (i % 2) * 40, 90 + (i % 3) * 25, 0, Math.PI * 2);
                ctx.fill();
            }

            // Distant City Skyline with illuminated windows
            const cityImg = this.assets['sc_city_bg'];
            if (cityImg) {
                const cityOff = - (this.camera.x * 0.18) % 256;
                for (let x = -256 + cityOff; x < VIRTUAL_WIDTH + 256; x += 256) {
                    ctx.drawImage(cityImg, x, 240, 256, 220);
                }
            } else {
                // Silhouetted buildings
                const bOffset = - (this.camera.x * 0.18);
                ctx.fillStyle = '#0f0920';
                for (let i = -1; i < 14; i++) {
                    const bx = i * 90 + (bOffset % 90);
                    const bh = 140 + ((i * 37) % 110);
                    ctx.fillRect(bx, 460 - bh, 80, bh);
                }
            }
        } else {
            // Phase 2 Urban Twilight Sunset
            const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
            skyGrad.addColorStop(0, '#1e1b4b');
            skyGrad.addColorStop(0.4, '#312e81');
            skyGrad.addColorStop(0.75, '#c2410c');
            skyGrad.addColorStop(1, '#ea580c');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

            // City skyline background
            const cityImg = this.assets['sc_city_bg'];
            if (cityImg) {
                const cityOff = - (this.camera.x * 0.2) % 256;
                for (let x = -256 + cityOff; x < VIRTUAL_WIDTH + 256; x += 256) {
                    ctx.drawImage(cityImg, x, 260, 256, 200);
                }
            }
        }
    }

    renderDecorations(ctx) {
        const treeImg = this.assets['sc_tree'];
        const bushImg = this.assets['sc_bush'];
        const bushFlowersImg = this.assets['sc_bush_flowers'];
        const signImg = this.assets['sc_signpost'];

        for (const dec of this.decorations) {
            if (dec.x + dec.w < this.camera.x - 100 || dec.x > this.camera.x + VIRTUAL_WIDTH + 100) continue;
            if (dec.type === 'tree' && treeImg) ctx.drawImage(treeImg, dec.x, dec.y, dec.w, dec.h);
            else if (dec.type === 'bush' && bushImg) ctx.drawImage(bushImg, dec.x, dec.y, dec.w, dec.h);
            else if (dec.type === 'bush_flowers' && bushFlowersImg) ctx.drawImage(bushFlowersImg, dec.x, dec.y, dec.w, dec.h);
            else if (dec.type === 'sign' && signImg) ctx.drawImage(signImg, dec.x, dec.y, dec.w, dec.h);
        }
    }

    renderPhase2Decorations(ctx) {
        const signImg = this.assets['sc_signpost'];
        for (const dec of this.decorations) {
            if (dec.x + dec.w < this.camera.x - 100 || dec.x > this.camera.x + VIRTUAL_WIDTH + 100) continue;
            if (dec.type === 'sign' && signImg) ctx.drawImage(signImg, dec.x, dec.y, dec.w, dec.h);
        }
    }

    renderTruck(ctx) {
        if (!this.truck) return;
        const truckImg = this.assets['sc_truck'];
        if (truckImg) ctx.drawImage(truckImg, this.truck.x, this.truck.y, this.truck.w, this.truck.h);

        ctx.fillStyle = '#008833';
        ctx.fillRect(this.truck.x + 40, this.truck.y - 45, 280, 36);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.truck.x + 40, this.truck.y - 45, 280, 36);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PONTO DE COLETA', this.truck.x + 180, this.truck.y - 22);
    }

    renderTransbordoFacility(ctx) {
        if (!this.transbordoFacility) return;
        const facImg = this.assets['sc_transbordo'];
        if (facImg) {
            ctx.drawImage(facImg, this.transbordoFacility.x, this.transbordoFacility.y, this.transbordoFacility.w, this.transbordoFacility.h);
        }
        ctx.fillStyle = '#eab308';
        ctx.fillRect(this.transbordoFacility.x + 50, this.transbordoFacility.y - 30, 240, 28);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.transbordoFacility.x + 50, this.transbordoFacility.y - 30, 240, 28);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DOCA DE DESCARGA', this.transbordoFacility.x + 170, this.transbordoFacility.y - 12);
    }

    renderPlatforms(ctx) {
        const grassTile = this.assets['tile_grass'];
        const dirtTile = this.assets['tile_dirt'];
        const TILE_SIZE = 48;

        for (const plat of this.platforms) {
            if (plat.x + plat.w < this.camera.x - 50 || plat.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;

            const count = Math.ceil(plat.w / TILE_SIZE);
            for (let i = 0; i < count; i++) {
                const tx = plat.x + i * TILE_SIZE;
                const tw = Math.min(TILE_SIZE, plat.x + plat.w - tx);
                if (grassTile) {
                    ctx.drawImage(grassTile, tx, plat.y, tw, plat.type === 'ground' ? TILE_SIZE : plat.h);
                } else {
                    ctx.fillStyle = '#55aa22';
                    ctx.fillRect(tx, plat.y, tw, 20);
                }

                if (plat.type === 'ground') {
                    for (let dy = plat.y + TILE_SIZE; dy < VIRTUAL_HEIGHT; dy += TILE_SIZE) {
                        if (dirtTile) {
                            ctx.drawImage(dirtTile, tx, dy, tw, TILE_SIZE);
                        } else {
                            ctx.fillStyle = '#653e1a';
                            ctx.fillRect(tx, dy, tw, TILE_SIZE);
                        }
                    }
                }
            }
        }
    }

    renderRoadPlatforms(ctx) {
        const roadTile = this.assets['tile_road'];
        const roadSubTile = this.assets['tile_road_sub'];
        const TILE_SIZE = 64;

        for (const plat of this.platforms) {
            if (plat.x + plat.w < this.camera.x - 50 || plat.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;

            const count = Math.ceil(plat.w / TILE_SIZE);
            for (let i = 0; i < count; i++) {
                const tx = plat.x + i * TILE_SIZE;
                const tw = Math.min(TILE_SIZE, plat.x + plat.w - tx);
                if (roadTile) {
                    ctx.drawImage(roadTile, tx, plat.y, tw, plat.type === 'road' ? TILE_SIZE : plat.h);
                } else {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(tx, plat.y, tw, 24);
                }

                if (plat.type === 'road') {
                    for (let dy = plat.y + TILE_SIZE; dy < VIRTUAL_HEIGHT; dy += TILE_SIZE) {
                        if (roadSubTile) {
                            ctx.drawImage(roadSubTile, tx, dy, tw, TILE_SIZE);
                        } else {
                            ctx.fillStyle = '#0f172a';
                            ctx.fillRect(tx, dy, tw, TILE_SIZE);
                        }
                    }
                }
            }
        }
    }

    renderTrafficLights(ctx) {
        if (this.currentPhase !== 2 || !this.trafficLights) return;

        for (const tl of this.trafficLights) {
            if (tl.x + tl.w < this.camera.x - 50 || tl.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;

            // 1. White stop bar 'PARE' on the asphalt
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tl.x - 22, 460, 6, 80);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('PARE', tl.x - 19, 478);

            // 2. Traffic light pole & housing
            const key = 'tl_' + tl.state.toLowerCase();
            const img = this.assets[key] || this.assets['tl_red'];
            if (img) {
                ctx.drawImage(img, tl.x, tl.y, tl.w, tl.h);
            }

            // 3. Glowing aura in twilight
            ctx.save();
            if (tl.state === 'RED') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                ctx.beginPath();
                ctx.arc(tl.x + 24, tl.y + 15, 16, 0, Math.PI * 2);
                ctx.fill();
            } else if (tl.state === 'YELLOW') {
                ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
                ctx.beginPath();
                ctx.arc(tl.x + 24, tl.y + 29, 16, 0, Math.PI * 2);
                ctx.fill();
            } else if (tl.state === 'GREEN') {
                ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
                ctx.beginPath();
                ctx.arc(tl.x + 24, tl.y + 43, 16, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // 4. Seta indicadora animada apontando para o semáforo
            ctx.save();
            const arrowX = tl.x + tl.w / 2;
            const bounce = Math.sin(Date.now() / 150) * 8;
            const arrowTipY = tl.y - 12 + bounce;
            const arrowTopY = arrowTipY - 26;

            let arrowColor = '#ef4444';
            let strokeColor = '#ffffff';
            let badgeText = 'PARE';
            let badgeBg = '#dc2626';

            if (tl.state === 'YELLOW') {
                arrowColor = '#facc15';
                strokeColor = '#000000';
                badgeText = 'ATENÇÃO';
                badgeBg = '#ca8a04';
            } else if (tl.state === 'GREEN') {
                arrowColor = '#22c55e';
                strokeColor = '#ffffff';
                badgeText = 'SIGA';
                badgeBg = '#16a34a';
            }

            // Brilho neon da seta
            ctx.shadowColor = arrowColor;
            ctx.shadowBlur = 14;

            // Seta para baixo estilizada
            ctx.fillStyle = arrowColor;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(arrowX - 7, arrowTopY);
            ctx.lineTo(arrowX + 7, arrowTopY);
            ctx.lineTo(arrowX + 7, arrowTipY - 14);
            ctx.lineTo(arrowX + 18, arrowTipY - 14);
            ctx.lineTo(arrowX, arrowTipY);
            ctx.lineTo(arrowX - 18, arrowTipY - 14);
            ctx.lineTo(arrowX - 7, arrowTipY - 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Plaquinha retro com o texto da ação
            ctx.shadowBlur = 0;
            ctx.font = 'bold 11px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textWidth = ctx.measureText(badgeText).width + 14;
            const badgeY = arrowTopY - 14;

            ctx.fillStyle = badgeBg;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(arrowX - textWidth / 2, badgeY - 10, textWidth, 20, 5); else ctx.rect(arrowX - textWidth / 2, badgeY - 10, textWidth, 20);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(badgeText, arrowX, badgeY + 1);
            ctx.restore();
        }
    }

    renderHazards(ctx) {
        const coneImg = this.assets['obs_cone'];
        const oilImg = this.assets['obs_oil'];

        for (const h of this.hazards) {
            if (h.x + h.w < this.camera.x - 50 || h.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;
            if (h.type === 'cone' && coneImg) {
                ctx.drawImage(coneImg, h.x, h.y, h.w, h.h);
            } else if (h.type === 'oil' && oilImg) {
                ctx.drawImage(oilImg, h.x, h.y, h.w, h.h);
            }
        }
    }

    renderBlocks(ctx) {
        const brickImg = this.assets['block_brick'];
        const questionImg = this.assets['block_question'];
        const recycleImg = this.assets['block_recycle'];

        for (const b of this.blocks) {
            if (b.x + b.w < this.camera.x - 50 || b.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;

            const drawY = b.y + (b.bumpY || 0);
            let img = brickImg;
            if (b.type === 'recycle') img = recycleImg;
            else if (b.type === 'question') img = questionImg;

            if (img) {
                ctx.drawImage(img, b.x, drawY, b.w, b.h);
            } else {
                ctx.fillStyle = b.type === 'brick' ? '#b55229' : '#e6a100';
                ctx.fillRect(b.x, drawY, b.w, b.h);
            }
        }
    }

    renderItems(ctx) {
        for (const it of this.items) {
            if (it.x < this.camera.x - 50 || it.x > this.camera.x + VIRTUAL_WIDTH + 50) continue;

            let imgKey = 'item_trash_bag';
            let w = 40, h = 42;
            if (it.type === 'trash_bag') { imgKey = 'item_trash_bag'; w = 42; h = 44; }
            else if (it.type === 'soda_can') { imgKey = 'item_soda_can'; w = 26; h = 38; }
            else if (it.type === 'pet_bottle') { imgKey = 'item_pet_bottle'; w = 22; h = 44; }
            else if (it.type === 'glass_bottle') { imgKey = 'item_glass_bottle'; w = 22; h = 44; }
            else if (it.type === 'paper_box') { imgKey = 'item_paper_box'; w = 44; h = 34; }
            else if (it.type === 'star') { imgKey = 'item_star'; w = 34; h = 34; }
            else if (it.type === 'biodiesel') { imgKey = 'item_biodiesel'; w = 32; h = 40; }
            else if (it.type === 'wrench') { imgKey = 'item_wrench'; w = 34; h = 34; }

            const img = this.assets[imgKey];
            const bob = Math.sin(performance.now() * 0.005 + it.x) * 3;
            if (img) {
                ctx.drawImage(img, it.x, it.y + bob, w, h);
            } else {
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(it.x + w / 2, it.y + h / 2 + bob, 16, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderPlayer(ctx) {
        const p = this.player;
        if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 10) % 2 === 0) return;

        ctx.save();
        // CRITICAL FIX 1: Cajulim planted 2px into grass blades, clean trimmed feet touching ground
        ctx.translate(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h + 2));
        ctx.scale(p.facing, 1);

        let key = 'p_idle_0';
        if (p.animState === 'walk') key = `p_walk_${p.animFrame % 8}`;
        else if (p.animState === 'jump') key = `p_jump_${Math.min(3, p.animFrame)}`;
        else if (p.animState === 'collect') key = p.animFrame === 0 ? 'p_collect_0' : 'p_collect_1';
        else if (p.animState === 'win') key = 'p_win';
        else key = `p_idle_${p.animFrame % 4}`;

        const img = this.assets[key] || this.assets['p_idle_0'] || this.assets['p_walk_0'];
        const drawW = 56;
        const drawH = 80;

        if (img) {
            ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
        } else {
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
        }
        ctx.restore();
    }

    renderTruckPlayer(ctx) {
        const p = this.player;
        if (p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 10) % 2 === 0) return;

        ctx.save();
        ctx.translate(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h));
        ctx.scale(-p.facing, 1);

        const truckImg = this.assets['sc_truck'];
        // Truck dimensions: 110 x 65
        const tw = 120;
        const th = 68;

        if (truckImg) {
            ctx.drawImage(truckImg, -tw / 2, -th + 2, tw, th);
        } else {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-p.w / 2, -p.h, p.w, p.h);
        }

        // Turbo flame if active
        if (this.turboTimer > 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(-tw / 2 - 6, -18, Math.random() * 6 + 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    renderParticles(ctx) {
        for (const part of this.particles) {
            const alpha = Math.max(0, part.life / part.maxLife);
            ctx.fillStyle = part.color + alpha + ')';
            ctx.beginPath();
            ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderFloatingTexts(ctx) {
        for (const ft of this.floatingTexts) {
            const alpha = Math.max(0, ft.life / 0.8);
            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
    }

    renderHUD(ctx) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, 48);

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 48);
        ctx.lineTo(VIRTUAL_WIDTH, 48);
        ctx.stroke();

        // 1. Lives
        const portrait = this.assets['p_portrait'];
        if (portrait) {
            ctx.drawImage(portrait, 14, 6, 26, 36);
        }
        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'left';
        ctx.fillText('♥', 48, 28);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`x ${this.lives}`, 66, 28);

        // 2. Mission Items (font: 10px for crisp, clean fit)
        ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        if (this.currentPhase === 1) {
            const trashIcon = this.assets['item_trash_bag'];
            if (trashIcon) ctx.drawImage(trashIcon, 118, 10, 22, 26);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`LIXO: ${this.trashCollected}/${this.totalTrash}`, 144, 28);

            ctx.fillStyle = '#facc15';
            ctx.fillText(`RECICLÁVEIS: ${this.recyclablesCollected}/${this.totalRecyclables}`, 272, 28);
        } else if (this.currentPhase === 2) {
            const bioIcon = this.assets['item_biodiesel'];
            if (bioIcon) ctx.drawImage(bioIcon, 118, 10, 20, 26);
            ctx.fillStyle = '#22c55e';
            ctx.fillText(`BIODIESEL: ${this.biodieselCollected}/${this.totalBiodiesel}`, 142, 28);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`REPAROS: ${this.wrenchesCollected}/${this.totalWrenches}`, 320, 28);
        } else if (this.currentPhase === 3) {
            const loadPct = Math.round(this.dumpProgress || 0);
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`CARGA: ${Math.floor(this.trailerLoad || 0)}/30t (${loadPct}%)`, 120, 28);

            ctx.fillStyle = '#facc15';
            ctx.fillText(`CAMINHÃO: ${this.currentTruckIndex || 1}/4`, 335, 28);
        } else if (this.currentPhase === 4) {
            // Speedometer
            const spd = Math.round(this.speedKmh || 0);
            if (spd > 78) ctx.fillStyle = '#ef4444';
            else if (spd >= 40 && spd <= 75) ctx.fillStyle = '#22c55e';
            else ctx.fillStyle = '#facc15';
            ctx.fillText(`VEL: ${spd}km/h`, 118, 28);

            // Stability bar
            const stab = Math.round(this.cargoStability || 100);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`ESTAB:`, 235, 28);
            const barX = 295;
            const barY = 16;
            const barW = 85;
            const barH = 14;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = stab > 70 ? '#22c55e' : (stab > 40 ? '#eab308' : '#ef4444');
            ctx.fillRect(barX, barY, Math.floor((barW * stab) / 100), barH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${stab}%`, barX + barW + 6, 27);
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        } else if (this.currentPhase === 5) {
            if (this.phase5State === 'COMPACTING' || this.phase5State === 'COMPACTING_WAIT_ADVANCE' || this.phase5State === 'SOIL_COVER') {
                const comp = Math.min(100, Math.round(this.compactionProgress || 0));
                ctx.fillStyle = '#facc15';
                ctx.fillText(`ATERRAMENTO: ${comp}%`, 115, 28);
                const barX = 310;
                const barY = 16;
                const barW = 85;
                const barH = 14;
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = comp >= 100 ? '#22c55e' : '#facc15';
                ctx.fillRect(barX, barY, Math.floor((barW * comp) / 100), barH);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barW, barH);
                if (this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
                    ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                    ctx.fillStyle = '#4ade80';
                    ctx.fillText('✔ APERTE [PULO]', 310, 42);
                    ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
                }
            } else if (this.phase5State === 'BIOGAS_GENERATION' || this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
                const mw = (this.biogasPowerMW || 0).toFixed(1);
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`BIOGÁS: ${mw}/10.0MW`, 115, 28);
                const press = Math.round(this.biogasPressure || 50);
                const isOptimal = press >= 40 && press <= 70;
                ctx.fillStyle = isOptimal ? '#22c55e' : '#ef4444';
                ctx.fillText(`CH4: ${press}kPa`, 340, 28);
                if (this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
                    ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                    ctx.fillStyle = '#facc15';
                    ctx.fillText('⚡ APERTE [PULO]', 340, 42);
                    ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
                }
            } else if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS') {
                const trt = Math.min(100, Math.round(this.chorumeTreated || 0));
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`AERAÇÃO: ${trt}%`, 115, 28);
                const activeAerators = this.aerators ? this.aerators.filter(a => a.active).length : 0;
                ctx.fillStyle = activeAerators === 3 ? '#22c55e' : '#facc15';
                ctx.fillText(`AERADORES: ${activeAerators}/3`, 295, 28);
            } else if (this.phase5State === 'LAB_ANALYSIS' || this.phase5State === 'CAJULIM_WAIT_ADVANCE' || this.phase5State === 'COMPLETE') {
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`ETE: ${this.labSampleTested ? 'PURIFICADA' : 'COLETA'}`, 115, 28);
                ctx.fillStyle = this.labSampleTested ? '#4ade80' : '#facc15';
                ctx.fillText(this.labSampleTested ? 'LAUDO: pH 7.0 ✔' : 'VÁ AO LAB ➜', 315, 28);
                if (this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
                    ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                    ctx.fillStyle = '#4ade80';
                    ctx.fillText('🎉 APERTE [PULO]', 315, 42);
                    ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
                }
            }
        } else if (this.currentPhase === 6) {
            const hp = this.boss ? Math.max(0, this.boss.hp) : 0;
            ctx.fillStyle = '#ef4444';
            ctx.fillText('BARÃO:', 115, 28);
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = i < hp ? '#ef4444' : '#475569';
                ctx.fillText('♥', 185 + i * 16, 28);
            }
            const pText = hp >= 3 ? '1/3: PÁ DE SUCATA' : (hp === 2 ? '2/3: PNEUS & ÓLEO' : (hp === 1 ? '3/3: SOBRECARGA!' : 'DERROTADO!'));
            ctx.fillStyle = hp === 1 ? '#f43f5e' : '#facc15';
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillText(`FASE ${pText}`, 265, 27);
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        }

        // 3. Parnamirim Official Institutional Logo (Visible in all phases)
        const hudLogo = this.assets['ui_parnamirim_logo'];
        if (hudLogo) {
            ctx.drawImage(hudLogo, 490, 10, 147, 28);
        }

        // 4. Score
        ctx.font = 'bold 10.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SCORE: ${String(this.score).padStart(6, '0')}`, 660, 28);

        // 5. Timer
        ctx.fillStyle = this.timeLeft <= 30 ? '#ef4444' : '#ffffff';
        ctx.fillText(`TIME: ${this.timeLeft}`, 840, 28);

        // Sub-Banner
        ctx.fillStyle = 'rgba(0, 40, 20, 0.75)';
        ctx.fillRect(0, 48, VIRTUAL_WIDTH, 20);
        ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#86efac';
        if (this.currentPhase === 1) {
            ctx.fillText('FASE 1: PEGA O LIXO ★ | 2. TRANSBORDO | 3. JOGA NA CARRETA | 4. LEVA AO ATERRO | 5. ATERRO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 2) {
            ctx.fillText('1. PEGA O LIXO ✓ | FASE 2: CAMINHÃO AO TRANSBORDO 🚚 ★ | 3. JOGA NA CARRETA | 4. ATERRO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 3) {
            ctx.fillText('1. PEGA O LIXO ✓ | 2. TRANSBORDO ✓ | FASE 3: JOGA NA CARRETA 🚜 ★ | 4. CARRETA AO ATERRO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 4) {
            ctx.fillText('1. PEGA O LIXO ✓ | 2. TRANSBORDO ✓ | 3. JOGA NA CARRETA ✓ | FASE 4: CARRETA AO ATERRO 🚛 ★ | 5. ATERRO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 5) {
            ctx.fillText('1. PEGA LIXO ✓ | 2. TRANSBORDO ✓ | 3. CARRETA ✓ | 4. RODOVIA ✓ | FASE 5: ATERRO & USINA VERDE 🌱⚡ ★', VIRTUAL_WIDTH / 2, 62);

            // Persistent Mission & Controls Guide Banner (y: 68 to 104)
            ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
            ctx.fillRect(10, 68, VIRTUAL_WIDTH - 20, 36);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(10, 68, VIRTUAL_WIDTH - 20, 36);

            let missionText = '';
            let controlText = '';
            if (this.phase5State === 'COMPACTING') {
                missionText = '🎯 ETAPA 1/3 (TRATOR): Aterre e compacte os resíduos na célula dirigindo o trator!';
                controlText = '🎮 CONTROLES: [←/→] Mover Trator | [ESPACO / K / JOYSTICK] Acelerar Aterramento';
            } else if (this.phase5State === 'COMPACTING_WAIT_ADVANCE') {
                missionText = '⭐ ETAPA 1 CONCLUIDA: Célula sanitária totalmente aterrada e compactada!';
                controlText = '▶ APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] PARA AVANCAR À USINA DE BIOGÁS!';
            } else if (this.phase5State === 'SOIL_COVER') {
                missionText = '🎯 ETAPA 1/3 (TRATOR): Conclua o aterramento dirigindo o trator!';
                controlText = '🎮 CONTROLES: [←/→] Mover Trator | [ESPACO / K / JOYSTICK] Acelerar Aterramento';
            } else if (this.phase5State === 'BIOGAS_GENERATION') {
                missionText = '🎯 ETAPA 2/3 (USINA DE BIOGÁS): Regule a pressão na ZONA VERDE (40-70 kPa) para gerar 10.0 MW!';
                controlText = '🎮 CONTROLES: [← A / → D] Ajustar Pressão | [ESPACO / K / JOYSTICK] Purgar Filtro de Umidade';
            } else if (this.phase5State === 'BIOGAS_WAIT_ADVANCE') {
                missionText = '⭐ ETAPA 2 CONCLUIDA: 10.0 MW gerados! 50.000 lares abastecidos com energia limpa!';
                controlText = '▶ APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] PARA ASSUMIR O CAJULIM NAS LAGOAS!';
            } else if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS') {
                missionText = '🎯 ETAPA 3/3 (CAJULIM): Pule nas passarelas para acionar os aeradores das lagoas!';
                controlText = '🎮 CONTROLES: [←/→] Correr | [ESPACO / K / JOYSTICK] Pular no Deque / Ligar Aeradores';
            } else if (this.phase5State === 'LAB_ANALYSIS') {
                missionText = '🎯 ETAPA 3/3 (LABORATÓRIO ETE): Chorume tratado! Caminhe até o laboratório à direita coletar o laudo!';
                controlText = '🎮 CONTROLES: [→] Andar até o Lab ETE | [ESPACO / K / JOYSTICK] Coletar Amostra de Água';
            } else if (this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
                missionText = '🎉 ETAPA 3 CONCLUIDA: Água purificada com sucesso (pH 7.0 Neutro)! Conforme CONAMA 430!';
                controlText = '▶ APERTE O BOTÃO DE PULO [ESPACO / K / JOYSTICK] PARA VER A HISTÓRIA E ENFRENTAR O VILÃO!';
            }

            ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#facc15';
            ctx.textAlign = 'left';
            ctx.fillText(missionText, 20, 81);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(controlText, 20, 96);

            // Interactive Bottom Action Buttons (y: 490 to 528)
            const pulse = 0.85 + Math.sin((this.gameTime || 0) * 8) * 0.15;

            if (this.phase5State === 'COMPACTING_WAIT_ADVANCE' || this.phase5State === 'BIOGAS_WAIT_ADVANCE' || this.phase5State === 'CAJULIM_WAIT_ADVANCE') {
                // Prominent Advance Button
                const btnX = 180, btnY = 490, btnW = 600, btnH = 38;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                ctx.fillRect(btnX, btnY, btnW, btnH);
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(btnX, btnY, btnW, btnH);
                ctx.font = 'bold 9.5px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
                ctx.textAlign = 'center';
                ctx.fillText('⭐ APERTE [ESPACO / K / JOYSTICK] OU CLIQUE AQUI PARA AVANCAR ▶', btnX + btnW / 2, btnY + 24);
            } else if (this.phase5State === 'COMPACTING' || this.phase5State === 'SOIL_COVER') {
                const btnX = 300, btnY = 490, btnW = 360, btnH = 38;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(btnX, btnY, btnW, btnH);
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, btnW, btnH);
                ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#fef08a';
                ctx.textAlign = 'center';
                ctx.fillText('🚜 [ESPACO/K] ACELERAR ATERRAMENTO', btnX + btnW / 2, btnY + 23);
            } else if (this.phase5State === 'BIOGAS_GENERATION') {
                // Button 1: Valve -
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(200, 490, 180, 38);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.strokeRect(200, 490, 180, 38);
                ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#bae6fd';
                ctx.textAlign = 'center';
                ctx.fillText('◀ [A] PRESSÃO -', 290, 513);

                // Button 2: Valve +
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(400, 490, 180, 38);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.strokeRect(400, 490, 180, 38);
                ctx.fillStyle = '#bae6fd';
                ctx.fillText('[D] PRESSÃO + ▶', 490, 513);

                // Button 3: Purge
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(600, 490, 220, 38);
                const warnMoist = this.filterMoisture > 70;
                ctx.strokeStyle = warnMoist ? '#ef4444' : '#38bdf8';
                ctx.lineWidth = 2;
                ctx.strokeRect(600, 490, 220, 38);
                ctx.fillStyle = warnMoist ? '#fca5a5' : '#7dd3fc';
                ctx.fillText('💧 [ESPACO/K] PURGAR', 710, 513);
            } else if (this.phase5State === 'CHORUME_TREATMENT' || this.phase5State === 'CAJULIM_LAGOONS') {
                const btnX = 300, btnY = 490, btnW = 360, btnH = 38;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(btnX, btnY, btnW, btnH);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, btnW, btnH);
                ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#bae6fd';
                ctx.textAlign = 'center';
                ctx.fillText('🌀 [ESPACO/K] ATIVAR AERADORES', btnX + btnW / 2, btnY + 23);
            } else if (this.phase5State === 'LAB_ANALYSIS' && !this.labSampleTested) {
                const btnX = 300, btnY = 490, btnW = 360, btnH = 38;
                ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
                ctx.fillRect(btnX, btnY, btnW, btnH);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.strokeRect(btnX, btnY, btnW, btnH);
                ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#86efac';
                ctx.textAlign = 'center';
                ctx.fillText('🧪 [ESPACO/K] COLETAR LAUDO', btnX + btnW / 2, btnY + 23);
            }
        } else if (this.currentPhase === 6) {

            ctx.fillText('1. COLETA ✓ | 2. TRANSBORDO ✓ | 3. CARRETA ✓ | 4. RODOVIA ✓ | 5. ATERRO ✓ | FASE 6: O CHEFÃO FINAL 👾 ★', VIRTUAL_WIDTH / 2, 62);

            // Persistent Mission & Controls Guide Banner
            ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
            ctx.fillRect(10, 68, VIRTUAL_WIDTH - 20, 36);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(10, 68, VIRTUAL_WIDTH - 20, 36);

            const hp = this.boss ? this.boss.hp : 4;
            let mText = '🎯 MISSÃO FINAL: Suba nos andaimes e pule no capô do Mecha-Trator do Barão!';
            if (hp <= 1 && hp > 0) mText = '⚡ ALERTA: O Mecha-Trator está sobrecarregado! Salte do topo da torre central!';
            else if (hp <= 0) mText = '🎉 VITÓRIA TOTAL! O Barão se rendeu e está cumprindo serviço comunitário!';

            ctx.textAlign = 'left';
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#f43f5e';
            ctx.fillText(mText, 20, 82);

            ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#fde047';
            ctx.fillText('🎮 CONTROLES: [←/→] Correr | [ESPACO/W] Pular | Pule nas Caçambas para SUPER PULO!', 20, 96);
            ctx.textAlign = 'center';

            // Interactive Jump Button
            const btnX = 320, btnY = 490, btnW = 320, btnH = 38;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.fillRect(btnX, btnY, btnW, btnH);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2;
            ctx.strokeRect(btnX, btnY, btnW, btnH);
            ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#fecdd3';
            ctx.textAlign = 'center';
            ctx.fillText('🚜 [ESPACO] PULO NO CAPÔ DO CHEFÃO', btnX + btnW / 2, btnY + 23);
        }
    }

    renderTip(ctx) {
        if (this.tipTimer <= 0) return;

        const alpha = Math.min(1, this.tipTimer * 2);
        const boxW = 860;
        const tipY = (this.currentPhase === 5 || this.currentPhase === 6) ? (VIRTUAL_HEIGHT - 98) : (VIRTUAL_HEIGHT - 60);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.82 * alpha})`;
        ctx.fillRect(VIRTUAL_WIDTH / 2 - boxW / 2, tipY, boxW, 42);

        ctx.strokeStyle = `rgba(85, 255, 153, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(VIRTUAL_WIDTH / 2 - boxW / 2, tipY, boxW, 42);

        const len = (this.tipText || '').length;
        const fontSize = len > 65 ? 8.5 : (len > 45 ? 9.5 : 11);
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(this.tipText, VIRTUAL_WIDTH / 2, tipY + 25);
    }

    renderTitleScreen(ctx) {
        ctx.fillStyle = 'rgba(0, 20, 10, 0.82)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const logo = this.assets['ui_parnamirim_logo'];
        if (logo) {
            ctx.drawImage(logo, VIRTUAL_WIDTH / 2 - 130, 14, 260, 49);
        }

        const portrait = this.assets['p_portrait'];
        if (portrait) ctx.drawImage(portrait, VIRTUAL_WIDTH / 2 - 75, 70, 150, 225);

        ctx.font = 'bold 24px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffaa00';
        ctx.fillText('TURMA DO CAJULIM', VIRTUAL_WIDTH / 2, 325);

        ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#00ff88';
        if (this.currentPhase === 1) {
            ctx.fillText('FASE 1: A GRANDE COLETA DE LIXO', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 2) {
            ctx.fillText('FASE 2: CAMINHÃO AO TRANSBORDO', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 3) {
            ctx.fillText('FASE 3: JOGA NA CARRETA', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 4) {
            ctx.fillText('FASE 4: CARRETA AO ATERRO', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 5) {
            ctx.fillText('FASE 5: ATERRO & USINA VERDE 🌱⚡', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 6) {
            ctx.fillText('FASE 6: O GRANDE CHEFÃO FINAL 👾', VIRTUAL_WIDTH / 2, 370);
        }

        ctx.font = '11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Use ← → para Mover | ESPACO para Pular/Turbo | Pule os Buracos!', VIRTUAL_WIDTH / 2, 410);
        ctx.fillText('F: Tela Cheia | M: Som | R: Reiniciar', VIRTUAL_WIDTH / 2, 435);

        const blink = Math.floor(performance.now() / 400) % 2 === 0;
        if (blink) {
            ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#ffff00';
            ctx.fillText('TOQUE NA TELA OU NO BOTAO A PARA JOGAR', VIRTUAL_WIDTH / 2, 480);
        }
    }

    startCutscene(type) {
        this.state = 'CUTSCENE';
        this.cutscene.active = true;
        this.cutscene.type = type; // 'PHASE5_TO_6' or 'GRAND_ENDING'
        this.cutscene.step = 0;
        this.cutscene.timer = 0;
        this.cutscene.textProgress = 0;
        this.cutscene.flashTimer = 0;
        this.cutscene.shakeTimer = 0;
        this.cutscene.animTime = 0;
        this.cutscene.cloudX = 0;

        const modal = typeof document !== 'undefined' ? document.getElementById('victoryModal') : null;
        if (modal) modal.classList.add('hidden');

        if (type === 'GRAND_ENDING' && window.soundManager && window.soundManager.playFanfare) {
            window.soundManager.playFanfare();
        }

        this.triggerCutsceneNarration();
    }

    triggerCutsceneNarration() {
        if (!window.soundManager || !window.soundManager.playNarration) return;
        let audioFile = '';
        let spokenText = '';

        if (this.cutscene.type === 'PHASE5_TO_6') {
            if (this.cutscene.step === 0) {
                audioFile = 'assets/audio/cutscene_phase5_step0.mp3';
                spokenText = 'Cidade limpa, serviço cumprido! O aterro sanitário e a usina verde funcionam com perfeição. O chorume está 100% purificado e a energia limpa ilumina milhares de lares... Tudo parecia em perfeita harmonia, mas...';
            } else {
                audioFile = 'assets/audio/cutscene_phase5_step1.mp3';
                spokenText = 'Barão do Entulho: Mwahahaha! Achavam que a faxina tinha terminado?! Enquanto houver entulho para lucrar, eu, o Barão do Entulho, serei o dono desta cidade! O meu Mecha-Trator Poluidor nove mil vai soterrar a Praça Central! Tente me impedir, Cajulim!';
            }
        } else if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step === 0) {
                audioFile = 'assets/audio/cutscene_ending_step0.mp3';
                spokenText = 'A Redenção do Barão: Derrotado pelo trabalho em equipe, o Barão cumpre 300 horas de serviço comunitário na praça! Com a vassoura na mão e o colete de gari, ele aprendeu o valor de cada trabalhador da limpeza pública: Cuidar da cidade é dever de todos!';
            } else if (this.cutscene.step === 1) {
                audioFile = 'assets/audio/cutscene_ending_step1.mp3';
                spokenText = 'Celebração da Turma do Cajulim: A cidade está totalmente sustentável! Das residências ao caminhão, do transbordo à carreta de 30 toneladas, do aterro ao combate final... Você dominou todas as etapas e protegeu o futuro do planeta!';
            } else if (this.cutscene.step === 2) {
                audioFile = 'assets/audio/cutscene_ending_step2.mp3';
                spokenText = 'Certificado de Mestre da Sustentabilidade: Parabéns por zerar o jogo! 100% de consciência ecológica, 10.0 MW de biogás e água cristalina devolvida à natureza. O meio ambiente agradece!';
            }
        }

        if (window.soundManager && window.soundManager.playNarration) {
            window.soundManager.playNarration(audioFile, spokenText);
        }
    }

    getCutsceneFullText() {
        if (this.cutscene.type === 'PHASE5_TO_6') {
            if (this.cutscene.step === 0) {
                return 'CIDADE LIMPA, SERVICO CUMPRIDO! O ATERRO SANITARIO E A USINA VERDE FUNCIONAM COM PERFEICAO. O CHORUME ESTA 100% PURIFICADO E A ENERGIA LIMPA ILUMINA MILHARES DE LARES... TUDO PARECIA EM PERFEITA HARMONIA, MAS...';
            } else {
                return 'BARAO DO ENTULHO: "MWAHAHAHA! ACHAVAM QUE A FAXINA TINHA TERMINADO?! ENQUANTO HOUVER ENTULHO PARA LUCRAR, EU, O BARAO DO ENTULHO, SEREI O DONO DESTA CIDADE! O MEU MECHA-TRATOR POLUIDOR 9000 VAI SOTERRAR A PRACA CENTRAL! TENTE ME IMPEDIR, CAJULIM!"';
            }
        } else if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step === 0) {
                return 'A REDENCAO DO BARAO: DERROTADO PELO TRABALHO EM EQUIPE, O BARAO CUMPRE 300 HORAS DE SERVICO COMUNITARIO NA PRACA! COM A VASSOURA NA MAO E O COLETE DE GARI, ELE APRENDEU O VALOR DE CADA TRABALHADOR DA LIMPEZA PUBLICA: "CUIDAR DA CIDADE E DEVER DE TODOS!"';
            } else if (this.cutscene.step === 1) {
                return 'CELEBRACAO DA TURMA DO CAJULIM: A CIDADE ESTA TOTALMENTE SUSTENTAVEL! DAS RESIDENCIAS AO CAMINHAO, DO TRANSBORDO A CARRETA DE 30T, DO ATERRO AO COMBATE FINAL... VOCE DOMINOU TODAS AS ETAPAS E PROTEGEU O FUTURO DO PLANETA!';
            } else {
                return 'CERTIFICADO DE MESTRE DA SUSTENTABILIDADE: PARABENS POR ZERAR O JOGO! 100% DE CONSCIENCIA ECOLOGICA, 10.0 MW DE BIOGAS E AGUA CRISTALINA DEVOLVIDA A NATUREZA. O MEIO AMBIENTE AGRADECE!';
            }
        }
        return '';
    }

    updateCutscene(dt) {
        this.cutscene.timer += dt;
        this.cutscene.animTime += dt;
        this.cutscene.cloudX = (this.cutscene.cloudX + dt * 25) % (VIRTUAL_WIDTH + 300);

        if (this.cutscene.flashTimer > 0) this.cutscene.flashTimer -= dt;
        if (this.cutscene.shakeTimer > 0) this.cutscene.shakeTimer -= dt;

        const fullText = this.getCutsceneFullText();
        const prevChars = Math.floor(this.cutscene.textProgress);

        // Synchronize typewriter reveal with spoken narration audio if active
        const narration = (window.soundManager && window.soundManager.currentNarration) ? window.soundManager.currentNarration : null;
        if (narration && !narration.paused && narration.duration > 0 && !isNaN(narration.duration)) {
            const progressRatio = Math.min(1.0, narration.currentTime / (narration.duration * 0.95));
            this.cutscene.textProgress = Math.max(this.cutscene.textProgress, Math.floor(progressRatio * fullText.length));
        } else {
            this.cutscene.textProgress = Math.min(fullText.length, this.cutscene.textProgress + dt * this.cutscene.textSpeed);
        }
        const newChars = Math.floor(this.cutscene.textProgress);

        // Blip sound effect only when speech is not actively narrating
        const isSpeaking = narration && !narration.paused;
        if (!isSpeaking && newChars > prevChars && newChars % 3 === 0 && newChars < fullText.length) {
            if (window.soundManager && window.soundManager.playTextBlip) {
                window.soundManager.playTextBlip();
            }
        }
    }

    advanceCutscene() {
        const fullText = this.getCutsceneFullText();
        if (this.cutscene.textProgress < fullText.length) {
            this.cutscene.textProgress = fullText.length;
            return;
        }

        if (this.cutscene.type === 'PHASE5_TO_6') {
            if (this.cutscene.step === 0) {
                this.cutscene.step = 1;
                this.cutscene.textProgress = 0;
                this.cutscene.flashTimer = 0.45;
                this.cutscene.shakeTimer = 0.70;
                if (window.soundManager) {
                    if (window.soundManager.playDramaticSting) window.soundManager.playDramaticSting();
                    setTimeout(() => {
                        if (window.soundManager && window.soundManager.playVillainChuckle) {
                            window.soundManager.playVillainChuckle();
                        }
                    }, 400);
                }
                this.triggerCutsceneNarration();
            } else {
                if (window.soundManager && window.soundManager.stopNarration) {
                    window.soundManager.stopNarration();
                }
                this.cutscene.active = false;
                this.switchPhase(6);
                this.startGame();
            }
        } else if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step === 0) {
                this.cutscene.step = 1;
                this.cutscene.textProgress = 0;
                if (window.soundManager && window.soundManager.playFanfare) window.soundManager.playFanfare();
                this.triggerCutsceneNarration();
            } else if (this.cutscene.step === 1) {
                this.cutscene.step = 2;
                this.cutscene.textProgress = 0;
                if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('star');
                this.triggerCutsceneNarration();
            } else {
                if (window.soundManager && window.soundManager.stopNarration) {
                    window.soundManager.stopNarration();
                }
                this.cutscene.active = false;
                this.switchPhase(1);
                this.state = 'TITLE';
            }
        }
    }

    skipCutscene() {
        if (window.soundManager && window.soundManager.stopNarration) {
            window.soundManager.stopNarration();
        }
        if (this.cutscene.type === 'PHASE5_TO_6') {
            this.cutscene.active = false;
            this.switchPhase(6);
            this.startGame();
        } else if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step < 2) {
                this.cutscene.step = 2;
                this.cutscene.textProgress = 999;
                this.triggerCutsceneNarration();
            } else {
                this.cutscene.active = false;
                this.switchPhase(1);
                this.state = 'TITLE';
            }
        }
    }

    renderCutscene(ctx) {
        ctx.save();
        if (this.cutscene.shakeTimer > 0) {
            const shake = this.cutscene.shakeTimer * 12;
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        if (this.cutscene.type === 'PHASE5_TO_6') {
            this.renderCutscenePhase5To6(ctx);
        } else {
            this.renderCutsceneEnding(ctx);
        }

        if (this.cutscene.flashTimer > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.cutscene.flashTimer * 2.4)})`;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        }

        // Top Header Skip Button (x: 770 to 945, y: 12 to 44)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(770, 12, 175, 32);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(770, 12, 175, 32);
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('PULAR ⏩ (ESC)', 857, 32);

        ctx.restore();
    }

    renderCutscenePhase5To6(ctx) {
        if (this.cutscene.step === 0) {
            this.renderCutsceneAerialLandfill(ctx);
        } else {
        this.renderCutsceneVillainReveal(ctx);
        }
    }

    renderCutsceneAerialLandfill(ctx) {
        const t = this.cutscene.animTime;
        const img = this.assets['cs_landfill_aerial'];

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            // Cinematic Ken Burns Camera Pan & Gentle Zoom across the massive complex
            const zoom = 1.08 + 0.03 * Math.sin(t * 0.22);
            const panX = Math.sin(t * 0.18) * 32;
            const panY = Math.cos(t * 0.15) * 12;
            ctx.translate(VIRTUAL_WIDTH / 2 + panX, 220 + panY);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, -VIRTUAL_WIDTH / 2, -220, VIRTUAL_WIDTH, 540);
            ctx.restore();

            // 1. Drifting cumulus clouds across the aerial vista
            ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
            const cX1 = (this.cutscene.cloudX) % (VIRTUAL_WIDTH + 300) - 150;
            const cX2 = (this.cutscene.cloudX * 0.65 + 460) % (VIRTUAL_WIDTH + 300) - 150;
            ctx.beginPath(); ctx.arc(cX1, 70, 40, 0, Math.PI * 2); ctx.arc(cX1 + 40, 60, 50, 0, Math.PI * 2); ctx.arc(cX1 + 90, 75, 36, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cX2, 125, 48, 0, Math.PI * 2); ctx.arc(cX2 + 50, 115, 62, 0, Math.PI * 2); ctx.arc(cX2 + 105, 130, 42, 0, Math.PI * 2); ctx.fill();

            // 2. Animated Biogas Flare Stack & Heat Shimmer (at the biogas generation plant)
            const flareX = 550 + Math.sin(t * 0.18) * 15;
            const flareY = 175 + Math.cos(t * 0.15) * 6;
            const flameH = 18 + Math.sin(t * 24) * 6 + Math.cos(t * 33) * 4;
            const flameW = 7 + Math.sin(t * 18) * 2;

            const flareGlow = ctx.createRadialGradient(flareX, flareY - 12, 3, flareX, flareY - 12, 38);
            flareGlow.addColorStop(0, 'rgba(249, 115, 22, 0.55)');
            flareGlow.addColorStop(0.5, 'rgba(234, 179, 8, 0.25)');
            flareGlow.addColorStop(1, 'rgba(234, 179, 8, 0)');
            ctx.fillStyle = flareGlow;
            ctx.beginPath(); ctx.arc(flareX, flareY - 12, 38, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.moveTo(flareX - flameW, flareY);
            ctx.quadraticCurveTo(flareX + Math.sin(t * 16) * 5, flareY - flameH * 0.6, flareX, flareY - flameH);
            ctx.quadraticCurveTo(flareX + flameW, flareY - flameH * 0.4, flareX + flameW, flareY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.moveTo(flareX - flameW * 0.5, flareY);
            ctx.lineTo(flareX, flareY - flameH * 0.7);
            ctx.lineTo(flareX + flameW * 0.5, flareY);
            ctx.closePath();
            ctx.fill();

            for (let e = 0; e < 5; e++) {
                const ep = (t * 1.5 + e * 0.2) % 1.0;
                const ex = flareX + Math.sin(t * 8 + e) * 8;
                const ey = flareY - ep * 40;
                ctx.fillStyle = `rgba(253, 224, 71, ${1 - ep})`;
                ctx.fillRect(ex, ey, 2, 2);
            }

            // 3. Electrical Energy Pulses along transmission lines (biogas -> city)
            for (let p = 0; p < 5; p++) {
                const progress = ((t * 0.55 + p * 0.20) % 1.0);
                const startX = 560;
                const startY = 175;
                const endX = 850;
                const endY = 85;
                const px = startX + (endX - startX) * progress;
                const py = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 22;

                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            // 4. Distant City Skyline Window Sparkles
            const cityGlints = [
                { x: 740, y: 75 }, { x: 790, y: 65 }, { x: 840, y: 80 }, { x: 890, y: 60 }, { x: 710, y: 88 }
            ];
            cityGlints.forEach((cg, idx) => {
                const sparkle = Math.sin(t * 6 + idx * 1.8);
                if (sparkle > 0.35) {
                    ctx.fillStyle = `rgba(254, 240, 138, ${sparkle * 0.9})`;
                    ctx.fillRect(cg.x, cg.y, 3, 3);
                }
            });

            // 5. Aerator lagoon ripples & water dynamics
            const lagoons = [{ x: 720, y: 285 }, { x: 800, y: 310 }];
            lagoons.forEach(lg => {
                const ripRadius = 6 + (t * 18 % 16);
                const ripAlpha = Math.max(0, 1 - ripRadius / 22);
                ctx.strokeStyle = `rgba(255, 255, 255, ${ripAlpha * 0.6})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(lg.x, lg.y, ripRadius, 0, Math.PI * 2); ctx.stroke();
            });

            // 6. Ominous Suspense Vignette when narrative reaches "...mas..."
            const fullText = this.getCutsceneFullText();
            const masIndex = fullText.indexOf('mas...');
            if (masIndex !== -1 && this.cutscene.textProgress >= masIndex - 6) {
                const suspProgress = Math.min(1.0, (this.cutscene.textProgress - (masIndex - 6)) / 14.0);
                const pulse = 0.5 + 0.5 * Math.sin(t * 9);

                const darkVignette = ctx.createRadialGradient(VIRTUAL_WIDTH / 2, 220, 160, VIRTUAL_WIDTH / 2, 220, 540);
                darkVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
                darkVignette.addColorStop(0.65, `rgba(45, 10, 10, ${0.48 * suspProgress})`);
                darkVignette.addColorStop(1, `rgba(20, 0, 0, ${0.88 * suspProgress * (0.8 + 0.2 * pulse)})`);
                ctx.fillStyle = darkVignette;
                ctx.fillRect(0, 0, VIRTUAL_WIDTH, 540);

                if (suspProgress > 0.5) {
                    ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
                    ctx.fillStyle = `rgba(239, 68, 68, ${0.75 + 0.25 * pulse})`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚠️ ALERTA: ANOMALIA DETECTADA NA PRACA CENTRAL ⚠️', VIRTUAL_WIDTH / 2, 38);
                }
            }
        } else {
            this.renderProceduralAerialLandfill(ctx);
        }

        // Dialog Box
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'ATERRO SANITARIO & USINA VERDE', currentText, '[ESPACO / ENTER] AVANCAR ▶', 'green');
    }

    renderProceduralAerialLandfill(ctx) {
        // Sky & Horizon
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
        skyGrad.addColorStop(0, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, 160);

        // Distant Clean City Skyline (y: 80 to 140)
        ctx.fillStyle = '#94a3b8';
        const buildings = [
            { x: 40, w: 35, h: 45 }, { x: 80, w: 50, h: 65 }, { x: 135, w: 40, h: 50 },
            { x: 180, w: 60, h: 80 }, { x: 245, w: 30, h: 40 }, { x: 280, w: 55, h: 70 },
            { x: 620, w: 50, h: 60 }, { x: 675, w: 40, h: 75 }, { x: 720, w: 65, h: 55 },
            { x: 790, w: 45, h: 65 }, { x: 840, w: 70, h: 50 }
        ];
        buildings.forEach(b => {
            ctx.fillRect(b.x, 140 - b.h, b.w, b.h);
            ctx.fillStyle = '#f8fafc';
            for (let wy = 140 - b.h + 8; wy < 135; wy += 12) {
                for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 10) {
                    ctx.fillRect(wx, wy, 4, 6);
                }
            }
            ctx.fillStyle = '#94a3b8';
        });

        // Top-Down Landfill Grounds (y: 140 to 410)
        const groundGrad = ctx.createLinearGradient(0, 140, 0, 410);
        groundGrad.addColorStop(0, '#15803d');
        groundGrad.addColorStop(0.3, '#166534');
        groundGrad.addColorStop(1, '#14532d');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, 140, VIRTUAL_WIDTH, 270);

        // 1. Massive Geometric Landfill Cells (Top-Down Angled)
        // Cell 1 (Left)
        ctx.fillStyle = '#0f172a'; // PEAD dark membrane border
        ctx.fillRect(40, 160, 260, 120);
        ctx.fillStyle = '#d97706'; // Compacted clay soil layer
        ctx.fillRect(48, 168, 244, 104);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 168, 244, 104);
        // Cell contour grid
        ctx.strokeStyle = 'rgba(146, 64, 14, 0.4)';
        for (let gx = 70; gx < 280; gx += 35) {
            ctx.beginPath(); ctx.moveTo(gx, 168); ctx.lineTo(gx, 272); ctx.stroke();
        }

        // Cell 2 (Center-Left)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(40, 290, 260, 105);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(48, 298, 244, 89);

        // Little yellow compactor tractor on cell 1 ramp
        ctx.fillStyle = '#eab308';
        ctx.fillRect(230, 220, 38, 22);
        ctx.fillStyle = '#475569';
        ctx.fillRect(226, 236, 12, 10);
        ctx.fillRect(256, 236, 12, 10);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(240, 212, 16, 12);

        // 2. Yellow Methane Pipe Network (Diagonal conduits to Biogas Plant)
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(170, 220);
        ctx.lineTo(330, 220);
        ctx.lineTo(390, 260);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(170, 340);
        ctx.lineTo(330, 340);
        ctx.lineTo(390, 270);
        ctx.stroke();

        // 3. Usina de Biogás & Power Plant (Center: x = 370 to 570)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(380, 220, 150, 110);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(380, 220, 150, 110);

        // Biogas Dome Digester (Shiny hemisphere)
        const domeGrad = ctx.createRadialGradient(425, 260, 5, 425, 260, 30);
        domeGrad.addColorStop(0, '#e2e8f0');
        domeGrad.addColorStop(0.7, '#64748b');
        domeGrad.addColorStop(1, '#334155');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(425, 265, 28, 0, Math.PI * 2);
        ctx.fill();

        // Flare Stack with animated clean blue/yellow flame
        ctx.fillStyle = '#475569';
        ctx.fillRect(505, 205, 12, 50);
        const flameBob = Math.sin(this.cutscene.animTime * 14) * 4;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(505, 205);
        ctx.lineTo(517, 205);
        ctx.lineTo(511, 185 + flameBob);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(511, 200, 4, 0, Math.PI * 2);
        ctx.fill();

        // Power pylons & transmission cables to city
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(530, 240); ctx.lineTo(600, 160); ctx.lineTo(700, 130);
        ctx.stroke();
        // Moving electric pulse
        const pulseT = (this.cutscene.animTime * 1.5) % 1;
        const px = 530 + pulseT * 170;
        const py = 240 - pulseT * 110;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();

        // Plant Labels
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('USINA BIOGÁS 10 MW', 455, 345);

        // 4. Cascade Lagoons (Right side: x = 600 to 920)
        // Lagoon 1: Anaerobic (Dark)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(610, 165, 130, 65);
        ctx.fillStyle = '#334155';
        ctx.fillRect(615, 170, 120, 55);
        ctx.font = 'bold 6.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('1. ANAERÓBIA', 675, 202);

        // Lagoon 2: Aerated (Emerald green with 4 rotating aerators)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(760, 165, 160, 100);
        ctx.fillStyle = '#059669';
        ctx.fillRect(765, 170, 150, 90);
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText('2. AERADA (4 AERADORES)', 840, 185);
        // 4 aerator splashes
        const aerPos = [{ x: 795, y: 215 }, { x: 840, y: 215 }, { x: 885, y: 215 }, { x: 840, y: 245 }];
        aerPos.forEach(ap => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ap.x, ap.y, 5 + Math.sin(this.cutscene.animTime * 10) * 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.strokeRect(ap.x - 7, ap.y - 7, 14, 14);
        });

        // Lagoon 3: Maturation & Polishing (Crystal Turquoise)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(630, 280, 270, 110);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(635, 285, 260, 100);
        // Water lilies
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.arc(670, 320, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(740, 350, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(830, 315, 6, 0, Math.PI * 2); ctx.fill();
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#cffafe';
        ctx.fillText('3. POLIMENTO (AGUA 100% PURA pH 7.0)', 765, 375);

        // Connecting cascade pipe
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(735, 200); ctx.lineTo(765, 200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(840, 260); ctx.lineTo(840, 285); ctx.stroke();

        // 5. Drifting Clouds Across Aerial View
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        const cX1 = (this.cutscene.cloudX) % (VIRTUAL_WIDTH + 200) - 100;
        const cX2 = (this.cutscene.cloudX * 0.7 + 400) % (VIRTUAL_WIDTH + 200) - 100;
        ctx.beginPath(); ctx.arc(cX1, 100, 35, 0, Math.PI * 2); ctx.arc(cX1 + 35, 95, 45, 0, Math.PI * 2); ctx.arc(cX1 + 75, 105, 30, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cX2, 170, 45, 0, Math.PI * 2); ctx.arc(cX2 + 45, 160, 55, 0, Math.PI * 2); ctx.arc(cX2 + 90, 175, 35, 0, Math.PI * 2); ctx.fill();
    }

    renderCutsceneVillainReveal(ctx) {
        const t = this.cutscene.animTime;
        const imgMecha = this.assets['cs_villain_mecha'];
        const imgLaugh = this.assets['cs_villain_laugh'];

        // Narrative shot progression:
        // Dialogue starts with evil laugh "Mwahaha!" (chars 0-42) -> show dramatic close-up laugh!
        // Then boasts about Mecha-Trator -> show wide challenger Mecha!
        // Alternates rhythmically every 4.0s
        const fullText = this.getCutsceneFullText();
        const currentChars = Math.floor(this.cutscene.textProgress);
        const isTypingInitialLaugh = (currentChars < 42 && this.cutscene.textProgress < fullText.length);
        const cycleTimer = (t % 8.0);
        const showLaugh = (imgLaugh && imgLaugh.complete && imgLaugh.naturalWidth > 0) &&
                          (isTypingInitialLaugh || cycleTimer >= 4.0);

        if ((imgMecha && imgMecha.complete && imgMecha.naturalWidth > 0) ||
            (imgLaugh && imgLaugh.complete && imgLaugh.naturalWidth > 0)) {

            ctx.save();
            if (showLaugh) {
                // SHOT A: CLOSE-UP EVIL LAUGH OF THE BARÃO
                // Sinister laughter breathing vibration
                const laughBobY = Math.abs(Math.sin(t * 10)) * 4;
                const laughZoom = 1.05 + 0.02 * Math.sin(t * 3);
                ctx.translate(VIRTUAL_WIDTH / 2, 220 + laughBobY);
                ctx.scale(laughZoom, laughZoom);
                ctx.drawImage(imgLaugh, -VIRTUAL_WIDTH / 2, -220, VIRTUAL_WIDTH, 540);
                ctx.restore();

                // Pulsing Red Laser Flare on Monocle (approx coordinates: x: 440, y: 195)
                const laserX = 440 + Math.sin(t * 3) * 2;
                const laserY = 195 - laughBobY * 0.5;
                const laserIntensity = 0.65 + 0.35 * Math.sin(t * 14);

                const laserGlow = ctx.createRadialGradient(laserX, laserY, 2, laserX, laserY, 32);
                laserGlow.addColorStop(0, `rgba(239, 68, 68, ${laserIntensity})`);
                laserGlow.addColorStop(0.4, `rgba(220, 38, 38, ${laserIntensity * 0.6})`);
                laserGlow.addColorStop(1, 'rgba(220, 38, 38, 0)');
                ctx.fillStyle = laserGlow;
                ctx.beginPath(); ctx.arc(laserX, laserY, 32, 0, Math.PI * 2); ctx.fill();

                // Crosshair star glint on laser monocle
                ctx.strokeStyle = `rgba(254, 202, 202, ${laserIntensity})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(laserX - 16, laserY); ctx.lineTo(laserX + 16, laserY);
                ctx.moveTo(laserX, laserY - 16); ctx.lineTo(laserX + 16, laserY);
                ctx.stroke();

                // Retro Arcade Challenger Title
                ctx.font = 'bold 13px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#ef4444';
                ctx.textAlign = 'center';
                ctx.fillText('⚡ BARAO DO ENTULHO: A AMBICAO OBSCURA ⚡', VIRTUAL_WIDTH / 2, 40);

            } else {
                // SHOT B: MECHA-TRATOR 9000 & BARÃO (STREET FIGHTER 2 CHALLENGER)
                // Engine rumble vibration
                const rumbleX = Math.sin(t * 36) * 1.5;
                const rumbleY = Math.cos(t * 28) * 1.2;
                const mechaZoom = 1.06 + 0.03 * Math.sin(t * 0.35);

                ctx.translate(VIRTUAL_WIDTH / 2 + rumbleX, 220 + rumbleY);
                ctx.scale(mechaZoom, mechaZoom);
                ctx.drawImage(imgMecha, -VIRTUAL_WIDTH / 2, -220, VIRTUAL_WIDTH, 540);
                ctx.restore();

                // 1. Billowing Twin Exhaust Smokestack Particles
                // Smokestacks located on the Mecha (x ~ 680, 720; y ~ 100-140)
                for (let s = 0; s < 12; s++) {
                    const sp = ((t * 0.8 + s * 0.12) % 1.0);
                    const smkX = 690 + (s % 2 === 0 ? -25 : 20) - sp * 60 + Math.sin(t * 4 + s) * 12;
                    const smkY = 135 - sp * 110;
                    const smkRadius = 14 + sp * 38;
                    const smkAlpha = (1 - sp) * 0.65;

                    ctx.fillStyle = `rgba(28, 25, 23, ${smkAlpha})`;
                    ctx.beginPath();
                    ctx.arc(smkX, smkY, smkRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 2. Piercing Red Evil Searchlights / Headlights Sweeping
                const headX = 640;
                const headY = 270;
                const sweepAngle = Math.sin(t * 2.5) * 0.15;

                ctx.save();
                ctx.translate(headX, headY);
                ctx.rotate(sweepAngle);
                const lightBeam = ctx.createRadialGradient(0, 0, 10, -180, 70, 240);
                lightBeam.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
                lightBeam.addColorStop(0.5, 'rgba(239, 68, 68, 0.25)');
                lightBeam.addColorStop(1, 'rgba(239, 68, 68, 0)');
                ctx.fillStyle = lightBeam;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-240, 20);
                ctx.lineTo(-210, 110);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // 3. Spiked Blade Spark Particles grinding on road
                for (let k = 0; k < 6; k++) {
                    const kp = (t * 2.5 + k * 0.2) % 1.0;
                    const spkX = 490 + Math.sin(k * 7) * 40 - kp * 35;
                    const spkY = 370 - kp * 25 + Math.cos(k * 5) * 6;
                    ctx.fillStyle = (k % 2 === 0) ? '#fef08a' : '#f97316';
                    ctx.fillRect(spkX, spkY, 3, 3);
                }

                // Warning Arcade Banner
                ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#facc15';
                ctx.textAlign = 'center';
                ctx.fillText('⚔️ BOSS CHALLENGER: MECHA-TRATOR 9000 ⚔️', VIRTUAL_WIDTH / 2, 40);
            }

            // Lightning Thunder Flashes
            if (Math.sin(t * 7.5) > 0.94) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
                ctx.fillRect(0, 0, VIRTUAL_WIDTH, 540);
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(700, 0); ctx.lineTo(670, 70); ctx.lineTo(690, 95); ctx.lineTo(640, 180);
                ctx.stroke();
            }

            // Top Industrial Caution Hazard Striping
            ctx.fillStyle = '#eab308';
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, 14);
            ctx.fillStyle = '#000000';
            const stripeOffset = (t * 40) % 40;
            for (let c = -40 + stripeOffset; c < VIRTUAL_WIDTH + 40; c += 40) {
                ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c + 20, 14); ctx.lineTo(c + 10, 14); ctx.lineTo(c - 10, 0); ctx.fill();
            }

        } else {
            this.renderProceduralVillainReveal(ctx);
        }

        // Dialog Box
        const currentText = fullText.slice(0, currentChars);
        this.renderCutsceneDialogBox(ctx, 'BARAO DO ENTULHO & MECHA-TRATOR 9000', currentText, '[ESPACO / ENTER] ENFRENTAR O CHEFAO! ⚔️', 'red');
    }

    renderProceduralVillainReveal(ctx) {
        // Dramatic Stormy Pollution Sky
        const stormGrad = ctx.createLinearGradient(0, 0, 0, 410);
        stormGrad.addColorStop(0, '#1c1917');
        stormGrad.addColorStop(0.5, '#450a0a');
        stormGrad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = stormGrad;
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, 410);

        // Billowing Dark Pollution Smoke Clouds
        ctx.fillStyle = 'rgba(28, 25, 23, 0.85)';
        for (let i = 0; i < 7; i++) {
            const sx = (i * 150 + Math.sin(this.cutscene.animTime * 2 + i) * 20) % VIRTUAL_WIDTH;
            ctx.beginPath();
            ctx.arc(sx, 70 + (i % 3) * 30, 60 + (i % 2) * 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lightning flash effect
        if (Math.sin(this.cutscene.animTime * 8) > 0.92) {
            ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, 410);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(680, 0); ctx.lineTo(650, 70); ctx.lineTo(670, 90); ctx.lineTo(630, 160);
            ctx.stroke();
        }

        // Silhouette & Glow of MECHA-TRATOR POLUIDOR 9000 (Right: x = 500 to 900)
        ctx.save();
        ctx.translate(520, 110);

        // Red glowing evil headlights
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 25;
        ctx.beginPath(); ctx.arc(45, 140, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(85, 130, 14, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Giant Jagged Blade with Spikes
        ctx.fillStyle = '#292524';
        ctx.fillRect(0, 130, 90, 90);
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.moveTo(0, 130); ctx.lineTo(15, 100); ctx.lineTo(30, 130);
        ctx.lineTo(45, 100); ctx.lineTo(60, 130); ctx.lineTo(75, 100); ctx.lineTo(90, 130);
        ctx.fill();

        // Heavy Iron Cabin & Armored Plating
        ctx.fillStyle = '#44403c';
        ctx.fillRect(90, 70, 180, 130);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(115, 90, 130, 50); // Red tinted cockpit glass
        ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.fillRect(115, 90, 130, 50);

        // Dual Exhaust Smokestacks with spewing black smoke
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(230, 10, 22, 70);
        ctx.fillRect(260, 25, 22, 55);
        ctx.fillStyle = '#09090b';
        const puff = Math.sin(this.cutscene.animTime * 12) * 10;
        ctx.beginPath(); ctx.arc(241, -5 + puff, 22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(271, 10 + puff, 18, 0, Math.PI * 2); ctx.fill();

        // Armored Caterpillar Tracks
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(70, 195, 240, 45);
        ctx.fillStyle = '#78716c';
        for (let tx = 80; tx < 300; tx += 30) {
            ctx.beginPath(); ctx.arc(tx, 218, 14, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // Giant Street Fighter 2 Pixel Art Portrait: BARÃO DO ENTULHO (Left: x = 60 to 450)
        ctx.save();
        ctx.translate(110, 60);

        // Villain Glow Aura
        const aura = ctx.createRadialGradient(160, 150, 40, 160, 150, 170);
        aura.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, 320, 320);

        // Purple Coat & High Aristocratic Collar
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.moveTo(80, 290); ctx.lineTo(130, 190); ctx.lineTo(190, 190); ctx.lineTo(240, 290);
        ctx.fill();
        // Golden Epaulets with fringe
        ctx.fillStyle = '#eab308';
        ctx.fillRect(70, 230, 40, 18);
        ctx.fillRect(210, 230, 40, 18);
        for (let f = 0; f < 6; f++) {
            ctx.fillRect(72 + f * 6, 248, 4, 10);
            ctx.fillRect(212 + f * 6, 248, 4, 10);
        }

        // Face & Skin Tone
        ctx.fillStyle = '#fde68a'; // Sallow pale aristocratic tone
        ctx.fillRect(125, 115, 70, 85);
        ctx.beginPath(); ctx.arc(160, 185, 28, 0, Math.PI); ctx.fill(); // Strong chin

        // Eyes & Monocle
        // Left Eye: menacing dark sneer
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(135, 138, 14, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(140, 140, 5, 4);

        // Right Eye: Golden Monocle with glowing lens flare
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(175, 142, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
        ctx.beginPath(); ctx.arc(175, 142, 12, 0, Math.PI * 2); ctx.fill();
        // Monocle gold chain hanging down
        ctx.beginPath(); ctx.moveTo(187, 145); ctx.bezierCurveTo(205, 180, 195, 230, 180, 250); ctx.stroke();
        // Monocle sparkle
        const flareRot = this.cutscene.animTime * 4;
        ctx.fillStyle = '#ffffff';
        ctx.save();
        ctx.translate(175, 142);
        ctx.rotate(flareRot);
        ctx.fillRect(-1.5, -8, 3, 16);
        ctx.fillRect(-8, -1.5, 16, 3);
        ctx.restore();

        // Curled Wax Mustache (signature villain mustache)
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.moveTo(160, 165);
        ctx.bezierCurveTo(140, 162, 115, 150, 100, 135);
        ctx.bezierCurveTo(115, 168, 145, 176, 160, 172);
        ctx.bezierCurveTo(175, 176, 205, 168, 220, 135);
        ctx.bezierCurveTo(205, 150, 180, 162, 160, 165);
        ctx.fill();

        // Wicked grinning mouth with sharp teeth
        ctx.fillStyle = '#450a0a';
        ctx.beginPath();
        ctx.arc(160, 178, 16, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(150, 178, 20, 5); // White teeth

        // Top Hat with Blood-Red Ribbon
        ctx.fillStyle = '#09090b';
        ctx.fillRect(95, 105, 130, 16); // Hat brim
        ctx.fillRect(115, 25, 90, 85);  // Hat crown
        ctx.fillStyle = '#dc2626';     // Red ribbon
        ctx.fillRect(115, 90, 90, 15);
        ctx.fillStyle = '#facc15';     // Ribbon buckle
        ctx.strokeRect(150, 88, 20, 19);

        ctx.restore();

        // Top Caution Bar
        ctx.fillStyle = '#eab308';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, 14);
        ctx.fillStyle = '#000000';
        for (let c = 0; c < VIRTUAL_WIDTH; c += 40) {
            ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c + 20, 14); ctx.lineTo(c + 10, 14); ctx.lineTo(c - 10, 0); ctx.fill();
        }

        // Dialog Box
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'BARAO DO ENTULHO & MECHA-TRATOR 9000', currentText, '[ESPACO / ENTER] ENFRENTAR O CHEFAO! ⚔️', 'red');
    }

    renderCutsceneEnding(ctx) {
        if (this.cutscene.step === 0) {
            this.renderCutsceneEndingRedemption(ctx);
        } else if (this.cutscene.step === 1) {
            this.renderCutsceneEndingCelebration(ctx);
        } else {
            this.renderCutsceneEndingStats(ctx);
        }
    }

    renderCutsceneEndingRedemption(ctx) {
        const t = this.cutscene.animTime;
        const imgService = this.assets['cs_barao_service'];
        const imgSweep = this.assets['cs_barao_sweep'];

        // Narrative shot progression:
        // Wide panorama of reformed Barão & community playground in the sunny plaza
        // Alternates with energetic close-up sweeping shot with thumbs up!
        const cycleTimer = (t % 9.0);
        const showSweep = (imgSweep && imgSweep.complete && imgSweep.naturalWidth > 0) && (cycleTimer >= 4.8);

        if ((imgService && imgService.complete && imgService.naturalWidth > 0) ||
            (imgSweep && imgSweep.complete && imgSweep.naturalWidth > 0)) {

            ctx.save();
            if (showSweep) {
                // SHOT A: CLOSE-UP BARÃO SWEEPING WITH PRIDE & THUMBS UP
                const sweepBounce = Math.sin(t * 6) * 3;
                const sweepZoom = 1.05 + 0.02 * Math.sin(t * 0.4);
                ctx.translate(VIRTUAL_WIDTH / 2, 220 + sweepBounce);
                ctx.scale(sweepZoom, sweepZoom);
                ctx.drawImage(imgSweep, -VIRTUAL_WIDTH / 2, -220, VIRTUAL_WIDTH, 540);
                ctx.restore();

                // Swirling swept leaves entering the bin
                for (let l = 0; l < 8; l++) {
                    const lp = ((t * 0.9 + l * 0.15) % 1.0);
                    const lx = 420 + Math.cos(lp * Math.PI) * 90;
                    const ly = 310 + Math.sin(lp * Math.PI * 1.5) * 45;
                    const leafColors = ['#eab308', '#22c55e', '#f97316', '#84cc16'];
                    ctx.fillStyle = leafColors[l % leafColors.length];
                    ctx.save();
                    ctx.translate(lx, ly);
                    ctx.rotate(lp * Math.PI * 3);
                    ctx.fillRect(-4, -3, 8, 5);
                    ctx.restore();
                }

                // Friendly Badge Header
                ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#38bdf8';
                ctx.textAlign = 'center';
                ctx.fillText('★ A REDENCAO DO BARAO: GARI NOTA 10! ★', VIRTUAL_WIDTH / 2, 38);

            } else {
                // SHOT B: SUNNY PLAZA & RECYCLED PLAYGROUND (WIDE SHOT)
                const panX = Math.sin(t * 0.2) * 25;
                const panY = Math.cos(t * 0.16) * 8;
                const parkZoom = 1.06 + 0.03 * Math.sin(t * 0.3);

                ctx.translate(VIRTUAL_WIDTH / 2 + panX, 220 + panY);
                ctx.scale(parkZoom, parkZoom);
                ctx.drawImage(imgService, -VIRTUAL_WIDTH / 2, -220, VIRTUAL_WIDTH, 540);
                ctx.restore();

                // 1. Sunbeams / God-Rays angling down onto the cobblestones
                ctx.save();
                for (let r = 0; r < 4; r++) {
                    const rayAlpha = 0.12 + 0.06 * Math.sin(t * 1.5 + r);
                    ctx.fillStyle = `rgba(254, 240, 138, ${rayAlpha})`;
                    ctx.beginPath();
                    const rx = 180 + r * 160;
                    ctx.moveTo(rx, 0);
                    ctx.lineTo(rx + 90, 0);
                    ctx.lineTo(rx - 80, 420);
                    ctx.lineTo(rx - 170, 420);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();

                // 2. Twinkles / Sparkles of Cleanliness across the spotless square
                const sparkles = [
                    { x: 230, y: 320 }, { x: 410, y: 345 }, { x: 580, y: 310 }, { x: 740, y: 295 }, { x: 310, y: 360 }
                ];
                sparkles.forEach((sp, i) => {
                    const spPulse = Math.sin(t * 5 + i * 2);
                    if (spPulse > 0.4) {
                        ctx.fillStyle = `rgba(255, 255, 255, ${spPulse * 0.85})`;
                        ctx.fillRect(sp.x - 2, sp.y - 2, 5, 5);
                        ctx.strokeStyle = `rgba(56, 189, 248, ${spPulse * 0.7})`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(sp.x - 6, sp.y); ctx.lineTo(sp.x + 6, sp.y);
                        ctx.moveTo(sp.x, sp.y - 6); ctx.lineTo(sp.x + 6, sp.y);
                        ctx.stroke();
                    }
                });

                // Top Banner
                ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#22c55e';
                ctx.textAlign = 'center';
                ctx.fillText('🌿 PRACA CENTRAL: SUSTENTABILIDADE & TRABALHO EM EQUIPE 🌿', VIRTUAL_WIDTH / 2, 38);
            }

        } else {
            this.renderProceduralEndingRedemption(ctx);
        }

        // Dialog Box
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'PRACA CENTRAL - A LICAO DO BARAO', currentText, '[ESPACO / ENTER] CELEBRACAO ▶', 'blue');
    }

    renderProceduralEndingRedemption(ctx) {
        // Sunny Peaceful Sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, 200);
        skyGrad.addColorStop(0, '#60a5fa');
        skyGrad.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, 200);

        // Sunny rays
        ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
        ctx.beginPath(); ctx.arc(100, 60, 45, 0, Math.PI * 2); ctx.fill();
        for (let r = 0; r < 8; r++) {
            const a = r * Math.PI / 4 + this.cutscene.animTime * 0.5;
            ctx.fillRect(100 + Math.cos(a) * 55, 60 + Math.sin(a) * 55, 8, 8);
        }

        // Clean Town Hall & Shops in Praça Central
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(150, 100, 260, 110);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(250, 60, 60, 40); // Clock tower
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(280, 80, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(279, 72, 2, 9); ctx.fillRect(279, 80, 6, 2);

        // Flowering green trees
        const treePos = [60, 450, 820];
        treePos.forEach(tx => {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(tx + 18, 140, 16, 70);
            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(tx + 26, 120, 36, 0, Math.PI * 2); ctx.fill();
            // Flowers
            ctx.fillStyle = '#f472b6';
            ctx.beginPath(); ctx.arc(tx + 15, 110, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(tx + 38, 125, 4, 0, Math.PI * 2); ctx.fill();
        });

        // Praça Clean Stone Pavement (y: 200 to 410)
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 200, VIRTUAL_WIDTH, 210);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        for (let y = 210; y < 410; y += 28) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIRTUAL_WIDTH, y); ctx.stroke();
        }

        // In Background: Decommissioned Mecha-Trator turned into Community Playground!
        ctx.save();
        ctx.translate(620, 175);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 40, 120, 60);
        // Children's swings hanging from blade
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(25, 40); ctx.lineTo(20, 85); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(35, 40); ctx.lineTo(30, 85); ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(15, 85, 20, 6);
        // Recycled banner
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-15, 15, 150, 22);
        ctx.font = 'bold 6.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('REUTILIZADO P/ PARQUINHO! 🎈', 60, 30);
        ctx.restore();

        // Center Stage: THE BARÃO DO ENTULHO IN GARI VEST SWEEPING!
        ctx.save();
        ctx.translate(340, 180);

        // Smiling Barão Head
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(45, 25, 30, 35);
        // Joyful smiling eyes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(50, 35, 6, 4);
        ctx.fillRect(64, 35, 6, 4);
        // Big happy grin
        ctx.fillStyle = '#15803d';
        ctx.beginPath(); ctx.arc(60, 48, 8, 0, Math.PI); ctx.fill();
        // Friendly curled mustache
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(60, 44, 12, 0, Math.PI); ctx.fill();

        // Green Gari Cap (replacing the evil top hat!)
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(40, 15, 40, 14);
        ctx.fillRect(35, 26, 48, 6); // Cap visor

        // High-Vis Fluorescent Orange & Neon Green Gari Uniform
        ctx.fillStyle = '#f97316'; // Fluorescent orange vest
        ctx.fillRect(35, 60, 50, 65);
        ctx.fillStyle = '#22c55e'; // Neon green reflective stripe
        ctx.fillRect(35, 80, 50, 12);
        ctx.fillStyle = '#ffffff'; // White retroreflective strip
        ctx.fillRect(35, 84, 50, 4);

        // Arms holding the broom
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(25, 75, 14, 25);
        ctx.fillRect(75, 80, 14, 25);

        // Sweeping Broom & Broomstick
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(95, 65); ctx.lineTo(15, 130); ctx.stroke();
        // Bristles sweeping leaves
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(0, 125, 32, 16);
        // Flying swept leaves particles
        ctx.fillStyle = '#15803d';
        ctx.beginPath(); ctx.arc(10, 115, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-5, 125, 5, 0, Math.PI * 2); ctx.fill();

        // Gari Trousers & Boots
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(42, 125, 15, 40);
        ctx.fillRect(63, 125, 15, 40);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(38, 162, 20, 10);
        ctx.fillRect(63, 162, 20, 10);

        // Community Badge: "GARI NOTA 10"
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#15803d';
        ctx.textAlign = 'center';
        ctx.fillText('★ SERVICO COMUNITARIO ★', 60, 10);
        ctx.restore();

        // Dialog Box
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'PRACA CENTRAL - A LICAO DO BARAO', currentText, '[ESPACO / ENTER] CELEBRACAO ▶', 'blue');
    }

    renderCutsceneEndingCelebration(ctx) {
        const t = this.cutscene.animTime;
        const imgCelebration = this.assets['cs_cajulim_celebration'];

        if (imgCelebration && imgCelebration.complete && imgCelebration.naturalWidth > 0) {
            ctx.save();
            // Slow majestic camera float and triumphant bounce
            const zoom = 1.05 + 0.03 * Math.sin(t * 0.35);
            const floatX = Math.sin(t * 0.25) * 16;
            const floatY = Math.cos(t * 0.2) * 8;
            ctx.translate(VIRTUAL_WIDTH / 2 + floatX, 220 + floatY);
            ctx.scale(zoom, zoom);
            ctx.drawImage(imgCelebration, -VIRTUAL_WIDTH / 2, -220, VIRTUAL_WIDTH, 540);
            ctx.restore();

            // 1. Massive Continuous Confetti Shower (70+ pieces fluttering down with 3D tumble)
            const confettiColors = ['#fde047', '#38bdf8', '#f43f5e', '#4ade80', '#c084fc', '#ffffff'];
            for (let c = 0; c < 70; c++) {
                const cSpeed = 65 + (c % 5) * 18;
                const cX = (c * 23 + Math.sin(t * 2.5 + c) * 45) % VIRTUAL_WIDTH;
                const cY = (t * cSpeed + c * 19) % 430;
                const rot = t * (4 + (c % 4)) + c;
                const tumble = Math.sin(rot);

                ctx.save();
                ctx.translate(cX, cY);
                ctx.scale(1, tumble);
                ctx.fillStyle = confettiColors[c % confettiColors.length];
                ctx.fillRect(-4, -3, 8, 6);
                ctx.restore();
            }

            // 2. Golden Trophy Sparkles & Sunburst Flare (Cajulim holds trophy in center, x ~ 480, y ~ 130)
            const trophyX = 480 + floatX;
            const trophyY = 135 + floatY;

            // Rotating golden light rays behind trophy
            const rayCount = 12;
            ctx.save();
            ctx.translate(trophyX, trophyY);
            ctx.rotate(t * 0.8);
            for (let r = 0; r < rayCount; r++) {
                const rAngle = (r * Math.PI * 2) / rayCount;
                ctx.fillStyle = (r % 2 === 0) ? 'rgba(250, 204, 21, 0.25)' : 'rgba(234, 179, 8, 0.08)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, 85, rAngle - 0.12, rAngle + 0.12);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            // Pulsing star glint on the trophy
            const glintPulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 5));
            ctx.strokeStyle = `rgba(254, 240, 138, ${glintPulse})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(trophyX - 18 * glintPulse, trophyY); ctx.lineTo(trophyX + 18 * glintPulse, trophyY);
            ctx.moveTo(trophyX, trophyY - 18 * glintPulse); ctx.lineTo(trophyX, trophyY + 18 * glintPulse);
            ctx.stroke();

            // 3. Cheering Press Camera Flashes (Paparazzi flashbulbs in the crowd)
            for (let f = 0; f < 3; f++) {
                const flashTimer = (t * 3.2 + f * 1.6) % 1.0;
                if (flashTimer < 0.15) {
                    const fx = 180 + (f * 260 + (t * 100) % 120);
                    const fy = 240 + ((f * 40) % 70);
                    const flashGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 45);
                    flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
                    flashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    ctx.fillStyle = flashGrad;
                    ctx.beginPath(); ctx.arc(fx, fy, 45, 0, Math.PI * 2); ctx.fill();
                }
            }

            // 4. Celebratory Fireworks in the Upper Sky
            const fireworkColors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80'];
            for (let fw = 0; fw < 2; fw++) {
                const fwProg = (t * 0.8 + fw * 0.5) % 1.0;
                const fwx = fw === 0 ? 220 : 750;
                const fwy = 75;
                if (fwProg > 0.4) {
                    const burstProg = (fwProg - 0.4) / 0.6;
                    const burstRadius = burstProg * 45;
                    const burstAlpha = 1 - burstProg;
                    ctx.strokeStyle = fireworkColors[fw % fireworkColors.length];
                    ctx.lineWidth = 2;
                    for (let spk = 0; spk < 8; spk++) {
                        const ang = (spk * Math.PI * 2) / 8;
                        const px1 = fwx + Math.cos(ang) * (burstRadius * 0.4);
                        const py1 = fwy + Math.sin(ang) * (burstRadius * 0.4);
                        const px2 = fwx + Math.cos(ang) * burstRadius;
                        const py2 = fwy + Math.sin(ang) * burstRadius;
                        ctx.strokeStyle = `rgba(254, 240, 138, ${burstAlpha})`;
                        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
                    }
                }
            }

            // Top Victory Banner
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(110, 16, VIRTUAL_WIDTH - 220, 36);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(110, 16, VIRTUAL_WIDTH - 220, 36);

            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.fillText('★ TURMA DO CAJULIM: VITORIA ECOLOGICA TOTAL! ★', VIRTUAL_WIDTH / 2, 40);

        } else {
            this.renderProceduralEndingCelebration(ctx);
        }

        // Dialog Box
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'TURMA DO CAJULIM - MISSAO CUMPRIDA', currentText, '[ESPACO / ENTER] VER CERTIFICADO ▶', 'gold');
    }

    renderProceduralEndingCelebration(ctx) {
        // Radiant Rotating Golden Sunburst Victory
        const cx = VIRTUAL_WIDTH / 2;
        const cy = 200;
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, 410);

        const rays = 18;
        const angleOffset = this.cutscene.animTime * 0.4;
        for (let i = 0; i < rays; i++) {
            const a1 = angleOffset + (i * 2 * Math.PI) / rays;
            const a2 = angleOffset + ((i + 0.5) * 2 * Math.PI) / rays;
            ctx.fillStyle = (i % 2 === 0) ? 'rgba(16, 185, 129, 0.45)' : 'rgba(5, 150, 105, 0.2)';
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, 550, a1, a2);
            ctx.closePath();
            ctx.fill();
        }

        // Colorful Confetti Shower
        for (let c = 0; c < 45; c++) {
            const confettiX = (c * 37 + this.cutscene.animTime * 60) % VIRTUAL_WIDTH;
            const confettiY = (c * 23 + this.cutscene.animTime * 95) % 380;
            const colors = ['#fde047', '#38bdf8', '#f43f5e', '#4ade80', '#c084fc'];
            ctx.fillStyle = colors[c % colors.length];
            ctx.fillRect(confettiX, confettiY, 6, 8);
        }

        // Big Retro Victory Banner at the top
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(120, 20, VIRTUAL_WIDTH - 240, 44);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(120, 20, VIRTUAL_WIDTH - 240, 44);
        ctx.font = 'bold 15px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('★ TURMA DO CAJULIM: VITORIA TOTAL! ★', VIRTUAL_WIDTH / 2, 48);

        // ENSEMBLE OF HEROES:
        // 1. CAJULIM in center jumping with Golden Trophy! (x: 430, y: 150)
        const portrait = this.assets['p_portrait'];
        if (portrait) {
            ctx.drawImage(portrait, 435, 160 + Math.sin(this.cutscene.animTime * 6) * 10, 90, 135);
        } else {
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(445, 180, 70, 100);
        }
        // Golden Trophy held high
        ctx.fillStyle = '#facc15';
        ctx.fillRect(465, 110 + Math.sin(this.cutscene.animTime * 6) * 10, 30, 25);
        ctx.fillRect(475, 135 + Math.sin(this.cutscene.animTime * 6) * 10, 10, 18);
        ctx.fillRect(460, 153 + Math.sin(this.cutscene.animTime * 6) * 10, 40, 10);
        ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#15803d';
        ctx.fillText('🏆', 480, 128 + Math.sin(this.cutscene.animTime * 6) * 10);

        // 2. Pai Cajulão & Compactor Truck (Left: x = 110)
        const truckImg = this.assets['sc_truck'];
        if (truckImg) {
            ctx.drawImage(truckImg, 80, 210, 170, 95);
        } else {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(80, 230, 160, 75);
        }
        ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#86efac';
        ctx.fillText('PAI CAJULAO (COLETA)', 160, 320);

        // 3. Operador da Carreta de 30t (Right: x = 700)
        const carretaCab = this.assets['sc_carreta_cab'];
        if (carretaCab) {
            ctx.drawImage(carretaCab, 710, 210, 170, 95);
        } else {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(710, 230, 160, 75);
        }
        ctx.fillStyle = '#93c5fd';
        ctx.fillText('RODOVIA 30 TONELADAS', 790, 320);

        // 4. Química da ETE & Barão Amigo
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(290, 205, 55, 80); // Lab coat
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(318, 195, 14, 0, Math.PI * 2); ctx.fill(); // Lab head
        ctx.fillText('ETE LAB', 318, 305);

        // Reformed Barão smiling with broom
        ctx.fillStyle = '#f97316';
        ctx.fillRect(590, 205, 55, 80); // Orange gari
        ctx.fillStyle = '#fde68a';
        ctx.beginPath(); ctx.arc(618, 195, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillText('BARAO AMIGO', 618, 305);

        // Dialog Box
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'TURMA DO CAJULIM - MISSAO CUMPRIDA', currentText, '[ESPACO / ENTER] VER CERTIFICADO ▶', 'gold');
    }

    renderCutsceneEndingStats(ctx) {
        // Hall of Fame Certificate Backdrop
        const bgGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
        bgGrad.addColorStop(0, '#022c22');
        bgGrad.addColorStop(1, '#064e3b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Certificate Parchment Box (x: 80, y: 30, w: 800, h: 480)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(80, 25, 800, 490);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.strokeRect(80, 25, 800, 490);

        // Inner Gold Border
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(90, 35, 780, 470);

        // Header
        const portrait = this.assets['p_portrait'];
        if (portrait && portrait.complete && portrait.naturalWidth > 0) {
            // Gold Seal Frame on Left
            ctx.fillStyle = '#facc15';
            ctx.fillRect(105, 42, 54, 62);
            ctx.fillStyle = '#14532d';
            ctx.fillRect(108, 45, 48, 56);
            ctx.drawImage(portrait, 110, 46, 44, 54);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(105, 42, 54, 62);
        }

        ctx.font = 'bold 16px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText('CERTIFICADO OFICIAL DE CONCLUSAO', VIRTUAL_WIDTH / 2, 70);

        ctx.font = 'bold 10.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#86efac';
        ctx.fillText('★ MESTRE DA SUSTENTABILIDADE & COLETA SELETIVA ★', VIRTUAL_WIDTH / 2, 95);

        // Separator
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(120, 112); ctx.lineTo(840, 112); ctx.stroke();

        // Stats Grid
        const stats = [
            { label: 'PONTUACAO FINAL TOTAL', val: `${this.score} PTS`, color: '#fde047' },
            { label: 'FASES DOMINADAS', val: '6 / 6 ETAPAS (100%)', color: '#4ade80' },
            { label: 'RESIDUOS DA CIDADE', val: '100% DESTINADOS COM SUCESSO', color: '#38bdf8' },
            { label: 'TRANSPORTE EM MASSA', val: '30 TONELADAS NA RODOVIA', color: '#a78bfa' },
            { label: 'GERACAO LIMPA BIOGAS', val: '10.0 MW (50.000 LARES)', color: '#facc15' },
            { label: 'TRATAMENTO CHORUME ETE', val: '100% PURIFICADO (pH 7.0)', color: '#34d399' },
            { label: 'VILAO REGENERADO', val: 'BARAO APRENDEU A RECICLAR', color: '#f472b6' }
        ];

        ctx.textAlign = 'left';
        stats.forEach((st, idx) => {
            const sy = 145 + idx * 36;
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(st.label, 130, sy);

            ctx.textAlign = 'right';
            ctx.font = 'bold 9.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = st.color;
            ctx.fillText(st.val, 830, sy);
            ctx.textAlign = 'left';

            // Dotted leader line
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(130, sy + 8); ctx.lineTo(830, sy + 8); ctx.stroke();
        });

        // Rank Badge: S+
        ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
        ctx.fillRect(130, 400, 700, 48);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.strokeRect(130, 400, 700, 48);

        ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText('CLASSIFICACAO ECOLOGICA: S+ (HEROI DO MEIO AMBIENTE)', VIRTUAL_WIDTH / 2, 430);

        // Restart Call-to-action
        const blink = Math.floor(this.cutscene.animTime * 3) % 2 === 0;
        if (blink) {
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#00ff88';
            ctx.fillText('▶ PRESSIONE ENTER OU CLIQUE PARA JOGAR NOVAMENTE ↺', VIRTUAL_WIDTH / 2, 485);
        }
    }

    renderCutsceneDialogBox(ctx, speaker, text, promptText, theme = 'green') {
        const boxX = 30;
        const boxY = 405;
        const boxW = VIRTUAL_WIDTH - 60;
        const boxH = 122;

        let borderColor = '#22c55e';
        let badgeBg = '#14532d';
        let badgeColor = '#86efac';

        if (theme === 'red') {
            borderColor = '#ef4444';
            badgeBg = '#7f1d1d';
            badgeColor = '#fca5a5';
        } else if (theme === 'gold') {
            borderColor = '#facc15';
            badgeBg = '#713f12';
            badgeColor = '#fef08a';
        } else if (theme === 'blue') {
            borderColor = '#38bdf8';
            badgeBg = '#0c4a6e';
            badgeColor = '#bae6fd';
        }

        // Semi-transparent dark dialog background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Speaker Name Badge (Top Left of Box)
        ctx.fillStyle = badgeBg;
        ctx.fillRect(boxX + 15, boxY - 14, 460, 26);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boxX + 15, boxY - 14, 460, 26);

        ctx.font = 'bold 9.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = badgeColor;
        ctx.textAlign = 'left';
        ctx.fillText(speaker, boxX + 26, boxY + 3);

        // Word-Wrapped Teletype Dialogue Text
        ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';

        const words = text.split(' ');
        const lines = [];
        let curLine = '';
        const maxLineWidth = boxW - 50;

        for (const w of words) {
            const testLine = curLine ? (curLine + ' ' + w) : w;
            if (ctx.measureText(testLine).width > maxLineWidth && curLine) {
                lines.push(curLine);
                curLine = w;
            } else {
                curLine = testLine;
            }
        }
        if (curLine) lines.push(curLine);

        lines.forEach((l, idx) => {
            if (idx < 4) {
                ctx.fillText(l, boxX + 24, boxY + 32 + idx * 19);
            }
        });

        // Continue Indicator / Prompt (Blinking at bottom-right)
        const blink = Math.floor(this.cutscene.animTime * 3.5) % 2 === 0;
        if (blink) {
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = borderColor;
            ctx.textAlign = 'right';
            ctx.fillText(promptText, boxX + boxW - 20, boxY + boxH - 12);
        }
    }


    loop(currentTime) {
        const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
        this.lastTime = currentTime;
        this.update(dt);
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }


    renderLevelClearBanner(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.84)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const bw = 680;
        const bh = 240;
        const bx = (VIRTUAL_WIDTH - bw) / 2;
        const by = (VIRTUAL_HEIGHT - bh) / 2 - 15;

        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, bw, bh);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 6, by + 6, bw - 12, bh - 12);

        ctx.font = 'bold 20px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.fillText(`🌟 FASE ${this.currentPhase} CONCLUIDA! 🌟`, VIRTUAL_WIDTH / 2, by + 48);

        let phaseTitle = '';
        let phaseDetail = '';
        if (this.currentPhase === 1) {
            phaseTitle = 'A GRANDE COLETA DE LIXO NO BAIRRO';
            phaseDetail = `Sacos Coletados: ${this.trashCollected}/${this.totalTrash} | Recicláveis: ${this.recyclablesCollected}/${this.totalRecyclables}`;
        } else if (this.currentPhase === 2) {
            phaseTitle = 'RODOVIA AO TRANSBORDO URBANO';
            phaseDetail = `Biodiesel: ${this.biodieselCollected}/${this.totalBiodiesel} | Reparos: ${this.wrenchesCollected}/${this.totalWrenches}`;
        } else if (this.currentPhase === 3) {
            phaseTitle = 'TRANSBORDO: 30T NA CARRETA';
            phaseDetail = '4 Caminhões Basculados | Lona 100% Selada';
        } else if (this.currentPhase === 4) {
            phaseTitle = 'TRAVESSIA DAS DUNAS AO ATERRO';
            phaseDetail = 'Carga Estável (30.000 kg) | Balança Rodoviária Ok';
        } else if (this.currentPhase === 5) {
            phaseTitle = 'ATERRO SANITARIO & USINA VERDE';
            phaseDetail = '10.0 MW de Biogás | ETE com Água pH 7.0';
        }

        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(phaseTitle, VIRTUAL_WIDTH / 2, by + 86);

        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(phaseDetail, VIRTUAL_WIDTH / 2, by + 118);

        ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`PONTUACAO: ${this.score}`, VIRTUAL_WIDTH / 2, by + 152);

        const remaining = Math.max(0, 3.2 - (this.levelClearTimer || 0)).toFixed(1);
        const blink = Math.floor(performance.now() / 350) % 2 === 0;
        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = blink ? '#ffffff' : '#fde047';
        ctx.fillText(`AVANCANDO EM ${remaining}s... [ESPACO / A PARA AVANCAR] ▶`, VIRTUAL_WIDTH / 2, by + 205);
        ctx.restore();
    }

    renderGameOverBanner(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const bw = 600;
        const bh = 200;
        const bx = (VIRTUAL_WIDTH - bw) / 2;
        const by = (VIRTUAL_HEIGHT - bh) / 2 - 10;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.font = 'bold 22px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.textAlign = 'center';
        ctx.fillText('💀 FIM DE JOGO! 💀', VIRTUAL_WIDTH / 2, by + 55);

        ctx.font = '11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('Você perdeu todas as vidas!', VIRTUAL_WIDTH / 2, by + 100);

        const remaining = Math.max(0, 4.0 - (this.gameOverTimer || 0)).toFixed(1);
        const blink = Math.floor(performance.now() / 350) % 2 === 0;
        ctx.fillStyle = blink ? '#ffffff' : '#f87171';
        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(`TENTAR DE NOVO EM ${remaining}s... [ESPACO / A]`, VIRTUAL_WIDTH / 2, by + 155);
        ctx.restore();
    }

    initMobileTouchControls() {
        if (typeof document === 'undefined') return;

        const bindBtn = (id, onDown, onUp) => {
            const el = document.getElementById(id);
            if (!el) return;
            const start = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                el.classList.add('active');
                if (window.soundManager) window.soundManager.resume();
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(15); } catch (err) {}
                }
                onDown();
            };
            const end = (e) => {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                el.classList.remove('active');
                onUp();
            };
            el.addEventListener('touchstart', start, { passive: false });
            el.addEventListener('touchend', end, { passive: false });
            el.addEventListener('touchcancel', end, { passive: false });
            el.addEventListener('mousedown', start);
            el.addEventListener('mouseup', end);
            el.addEventListener('mouseleave', end);
        };

        bindBtn('btnTouchLeft', () => { this.keys.left = true; }, () => { this.keys.left = false; });
        bindBtn('btnTouchRight', () => { this.keys.right = true; }, () => { this.keys.right = false; });
        bindBtn('btnTouchUp', () => { this.keys.up = true; }, () => { this.keys.up = false; });
        bindBtn('btnTouchDown', () => { this.keys.down = true; }, () => { this.keys.down = false; });

        bindBtn('btnTouchA', () => {
            this.keys.up = true;
            this.keys.jump = true;
            this.keys.jumpHeld = true;
            this.keyboardJumpHeld = true;
            if (this.player) this.player.jumpBuffer = 0.2;
            if (this.currentPhase === 2 && window.soundManager) window.soundManager.playHorn();

            if (this.state === 'TITLE') {
                this.startGame();
            } else if (this.state === 'CUTSCENE') {
                this.advanceCutscene();
            } else if (this.state === 'LEVEL_CLEAR') {
                this.nextPhase();
            } else if (this.state === 'GAME_OVER') {
                this.restartLevel();
            }
        }, () => {
            this.keys.up = false;
            this.keyboardJumpHeld = false;
            if (!this.gamepadJumpHeld) {
                this.keys.jump = false;
                this.keys.jumpHeld = false;
            }
        });

        bindBtn('btnTouchB', () => {
            this.keys.down = true;
        }, () => {
            this.keys.down = false;
        });

        const soundBtn = document.getElementById('btnMobileSound');
        if (soundBtn) {
            const toggleSound = (e) => {
                if (e.cancelable) e.preventDefault();
                if (window.soundManager) {
                    const muted = window.soundManager.toggleMute();
                    soundBtn.textContent = muted ? '🔇' : '🔊';
                }
            };
            soundBtn.addEventListener('click', toggleSound);
            soundBtn.addEventListener('touchstart', toggleSound, { passive: false });
        }

        const fsBtn = document.getElementById('btnMobileFullscreen');
        if (fsBtn) {
            const toggleFs = (e) => {
                if (e.cancelable) e.preventDefault();
                this.toggleFullscreen();
            };
            fsBtn.addEventListener('click', toggleFs);
            fsBtn.addEventListener('touchstart', toggleFs, { passive: false });
        }
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }
}

if (typeof window !== 'undefined') {
    window.Game = Game;
    window.addEventListener('DOMContentLoaded', () => {
        window.game = new Game();
        window.game.start();
    });
}
if (typeof module !== 'undefined') {
    module.exports = { Game };
}
