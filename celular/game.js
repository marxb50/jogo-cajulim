/**
 * TURMA DO CAJULIM - JOGO DE PLATAFORMA 2D RETRÔ
 * Jornada educativa em oito fases:
 * 1. Casa Viva; 2. Pega o Lixo; 3. Rota do Coletor; 4. Rodovia;
 * 5. Transbordo; 6. Carreta ao Aterro; 7. Usina Verde; 8. Chefão.
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

        let initialPhase = 1;
        let hasDirectPhase = false;
        let initialCutscene = null;
        let initialCasaVivaVariant = 'single-room';
        if (typeof window !== 'undefined' && window.location) {
            const searchParams = new URLSearchParams(window.location.search || '');
            const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
            const getParam = (key) => searchParams.get(key) || hashParams.get(key);
            const targetPhase = getParam('fase') || getParam('phase');
            if (targetPhase) {
                if (targetPhase === '0' || targetPhase === 'casa') {
                    initialPhase = 1;
                    hasDirectPhase = true;
                } else {
                    const parsed = parseInt(targetPhase, 10);
                    if (parsed >= 1 && parsed <= 8) {
                        initialPhase = parsed;
                        hasDirectPhase = true;
                    }
                }
            }
            if (getParam('cutscene')) {
                initialCutscene = getParam('cutscene');
            }
            if (getParam('casa') === '3comodos') {
                initialCasaVivaVariant = 'three-rooms';
            }
        }

        this.currentPhase = initialPhase;
        this.hasDirectPhase = hasDirectPhase;
        this.initialCutscene = initialCutscene;
        this.casaVivaVariant = initialCasaVivaVariant;
        this.state = (hasDirectPhase || initialCutscene) ? 'PLAYING' : 'TITLE';
        this.assets = {};
        this.loadedCount = 0;
        this.totalAssets = 0;
        this.assetsReady = false;

        this.keys = { left: false, right: false, jump: false, jumpHeld: false, down: false, up: false, action: false };
        this.actionJustPressed = false;
        this.camera = { x: 0, y: 0 };
        this.particles = [];
        this.floatingTexts = [];
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
        this.credits = null;

        this.player = {
            x: 80, y: 350, vx: 0, vy: 0, w: 48, h: 76,
            grounded: false, facing: 1, animState: 'idle',
            animFrame: 0, animTimer: 0, coyoteTimer: 0,
            jumpBuffer: 0, collectTimer: 0, invulnerableTimer: 0,
            isDead: false, skidTimer: 0
        };

        this.levelWidth = 6450;
        this.levelHeight = 540;
        this.platforms = [];
        this.items = [];
        this.blocks = [];
        this.decorations = [];
        this.hazards = []; // cones, oil slicks
        this.truck = null;
        this.transbordoFacility = null;
        this.lives = this.currentPhase === 8 ? 5 : 3;

        // Initialize the direct-test boss state before the first animation
        // frame. This prevents the update loop from seeing undefined hazard
        // arrays while the image bundle is still loading.
        if (hasDirectPhase && this.currentPhase === 8) {
            this.initLevel();
        }

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

            // Casa Viva (Fase 1)
            'cv_service': 'assets/casa-viva/rooms/area-servico-pixel.png',
            'cv_kitchen': 'assets/casa-viva/rooms/cozinha-pixel.png',
            'cv_living': 'assets/casa-viva/rooms/sala-pixel.png',
            'cv_apple_hold': 'assets/casa-viva/player/holding/apple-hold.png',
            'cv_apple_walk': 'assets/casa-viva/player/holding/apple-walk.png',
            'cv_banana_hold': 'assets/casa-viva/player/holding/banana-hold.png',
            'cv_banana_walk': 'assets/casa-viva/player/holding/banana-walk.png',
            'cv_bottle_hold': 'assets/casa-viva/player/holding/bottle-hold.png',
            'cv_bottle_walk': 'assets/casa-viva/player/holding/bottle-walk.png',
            'cv_box_hold': 'assets/casa-viva/player/holding/box-hold.png',
            'cv_box_walk': 'assets/casa-viva/player/holding/box-walk.png',
            'cv_can_hold': 'assets/casa-viva/player/holding/can-hold.png',
            'cv_can_walk': 'assets/casa-viva/player/holding/can-walk.png',
            'cv_coffee_hold': 'assets/casa-viva/player/holding/coffee-hold.png',
            'cv_coffee_walk': 'assets/casa-viva/player/holding/coffee-walk.png',
            'cv_jar_hold': 'assets/casa-viva/player/holding/jar-hold.png',
            'cv_jar_walk': 'assets/casa-viva/player/holding/jar-walk.png',
            'cv_orange_hold': 'assets/casa-viva/player/holding/orange-hold.png',
            'cv_orange_walk': 'assets/casa-viva/player/holding/orange-walk.png',
            'cv_paper_hold': 'assets/casa-viva/player/holding/paper-hold.png',
            'cv_paper_walk': 'assets/casa-viva/player/holding/paper-walk.png',
            'cv_yogurt_hold': 'assets/casa-viva/player/holding/yogurt-hold.png',
            'cv_yogurt_walk': 'assets/casa-viva/player/holding/yogurt-walk.png',

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
            'sc_parnamirim_centro': 'assets/scenery/parnamirim-igreja-pixel-v3.png',
            'sc_phase3_bairros_bg': 'assets/scenery/rota-bairros-pixel-v2.png',

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
            'sc_phase4_transbordo_bg': 'assets/scenery/rodovia-transbordo-pixel-v2.png',
            'sc_transbordo': 'assets/scenery/transbordo_facility.png',

            // Phase 3 Assets (Transbordo Interior, Carreta & Supervisor)
            'sc_transbordo_interior': 'assets/scenery/transbordo_interior.png',
            'sc_carreta': 'assets/scenery/carreta_transbordo.png',
            'p_supervisor': 'assets/scenery/cajulim_supervisor.png',
            'sc_truck_chassis': 'assets/scenery/truck_chassis.png',
            'sc_truck_bed': 'assets/scenery/truck_bed.png',

            // Phase 4 Assets (Transbordo Interior & Doca)
            'sc_dunes_bg': 'assets/scenery/dunes_bg.png',
            'sc_carreta_cab': 'assets/scenery/carreta_cab.png',
            'sc_carreta_trailer': 'assets/scenery/carreta_trailer.png',
            'sc_aterro_gate': 'assets/scenery/aterro_gate.png',

            // Phase 5 Assets (Rota ao Aterro - Carreta 30t de fase 5 gpt)
            'sc_rota_aterro': 'assets/scenery/rota_aterro_16bit.png',
            'sc_carreta_magenta': 'assets/scenery/carreta_16bit_transparente.png',
            'p_cajulim_idle': 'assets/player/cajulim_idle.png',

            // Phase 6 Assets (Aterro Sanitário & Usina Verde)
            'sc_aterro_complex_bg': 'assets/scenery/aterro_complex_bg.png',
            'sc_trator_compactador': 'assets/scenery/trator_compactador.png',
            'sc_biogas_plant': 'assets/scenery/biogas_plant.png',
            'sc_lagoa_aerador': 'assets/scenery/lagoa_aerador.png',
            // Phase 7 Test Asset (isolated boss sprite; original assets remain untouched)
            'sc_mecha_boss_pixel': 'assets/phase7/mecha-trator-boss-pixel.png',
            'p_portrait': 'assets/player/cajulim_portrait.png',
            'p_sheet': 'assets/player/cajulim_sheet.png',
            'item_trash_bag_raw': 'assets/items/trash_bag.png',
            'item_pet_bottle_raw': 'assets/items/pet_bottle.png',
            'item_paper_box_raw': 'assets/items/paper_box.png',

            // Institutional Visual Identity Assets
            'ui_parnamirim_logo': 'assets/ui/parnamirim_logo.png',

            // Cinematic Cutscene High-Res Arcade Images
            'cs_landfill_aerial': 'assets/cutscenes/cs_landfill_aerial.jpg',
            'cs_villain_mecha': 'assets/cutscenes/cs_villain_mecha.jpg',
            'cs_villain_laugh': 'assets/cutscenes/cs_villain_laugh.jpg',
            'cs_barao_service': 'assets/cutscenes/cs_barao_service.jpg',
            'cs_barao_sweep': 'assets/cutscenes/cs_barao_sweep.jpg',
            'cs_cajulim_celebration': 'assets/cutscenes/cs_cajulim_celebration.jpg',
            'cs_intro_casa': 'assets/cutscenes/cs_intro_casa.jpg',
            'cs_intro_father': 'assets/cutscenes/cs_intro_father.jpg',
            'cs_intro_mission': 'assets/cutscenes/cs_intro_mission.jpg',
            'cs_phase1_clear': 'assets/cutscenes/cs_phase1_clear.jpg',
            'cs_phase2_bairros': 'assets/cutscenes/cs_phase2_bairros.jpg',
            'cs_phase2_clear': 'assets/cutscenes/cs_phase2_clear.jpg',
            'cs_phase3_clear': 'assets/cutscenes/cs_phase3_clear.jpg',
            'cs_phase4_clear': 'assets/cutscenes/cs_phase4_clear.jpg'
        };

        this.imageList = imageList;
        const keys = Object.keys(imageList);

        // Cria os objetos imediatamente, mas baixa primeiro apenas o conjunto
        // necessário para a fase atual. Antes, a tela inicial esperava todas as
        // fotos, cutscenes e fases (mais de 100 arquivos), o que era muito lento
        // em conexões fracas e deixava a Casa Viva sem o personagem.
        keys.forEach(key => {
            this.assets[key] = new Image();
        });

        const common = ['ui_parnamirim_logo', 'p_portrait'];
        const byPhase = {
            1: ['cv_service', 'p_idle_0', 'p_idle_1', 'p_walk_0', 'p_collect_0'],
            2: ['sc_parnamirim_centro', 'p_sheet', 'tile_grass', 'tile_dirt', 'block_brick', 'block_question', 'block_recycle', 'item_trash_bag'],
            3: ['sc_phase3_bairros_bg', 'sc_truck', 'item_trash_bag_raw'],
            4: ['sc_phase4_transbordo_bg', 'sc_truck', 'tile_road', 'tile_road_sub'],
            5: ['sc_transbordo_interior', 'sc_carreta', 'p_supervisor'],
            6: ['sc_rota_aterro', 'sc_carreta_magenta', 'p_cajulim_idle'],
            7: ['sc_aterro_complex_bg', 'sc_trator_compactador', 'sc_biogas_plant', 'sc_lagoa_aerador', 'p_idle_0', 'p_walk_0'],
            8: ['sc_mecha_boss_pixel', 'sc_aterro_complex_bg', 'p_sheet']
        };
        const prioritySet = new Set([...common, ...(byPhase[this.currentPhase] || [])]);
        const priorityKeys = keys.filter(key => prioritySet.has(key));
        const deferredKeys = keys.filter(key => !prioritySet.has(key));

        this.loadedCount = 0;
        this.totalAssets = priorityKeys.length;

        const loadOne = (key, onSettled) => {
            const img = this.assets[key];
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                if (onSettled) onSettled();
            };
            img.onload = finish;
            img.onerror = finish;
            img.src = imageList[key] + '?v=8.4';
        };

        const beginDeferredLoading = () => {
            let cursor = 0;
            const loadBatch = () => {
                deferredKeys.slice(cursor, cursor + 8).forEach(key => loadOne(key));
                cursor += 8;
                if (cursor < deferredKeys.length) setTimeout(loadBatch, 120);
            };
            setTimeout(loadBatch, 80);
        };

        const prioritySettled = () => {
            this.loadedCount++;
            if (this.loadedCount >= this.totalAssets) {
                this.onAllAssetsLoaded();
                beginDeferredLoading();
            }
        };

        if (priorityKeys.length === 0) {
            this.onAllAssetsLoaded();
            beginDeferredLoading();
        } else {
            priorityKeys.forEach(key => loadOne(key, prioritySettled));
        }
    }

    getTruckCutout() {
        return this.assets['sc_carreta_magenta'];
    }

    onAllAssetsLoaded() {
        if (this.assetsReady) return;
        this.assetsReady = true;
        if (typeof window !== 'undefined' && window.location) {
            const searchParams = new URLSearchParams(window.location.search || '');
            const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
            const getParam = (key) => searchParams.get(key) || hashParams.get(key);
            const targetPhase = getParam('fase') || getParam('phase') || (this.hasDirectPhase ? String(this.currentPhase) : null);
            const creditsRequested = getParam('creditos') === '1' || getParam('credits') === '1';

            if (targetPhase) {
                this.cutscene.active = false;
                this.state = 'PLAYING';
            }

            if (targetPhase === '1' || targetPhase === '0' || targetPhase === 'casa') {
                this.switchPhase(1);
                this.startGame();
            } else if (targetPhase === '2') {
                this.switchPhase(2);
                this.startGame();
                if (getParam('pos')) {
                    this.player.x = parseFloat(getParam('pos'));
                    this.camera.x = Math.max(0, this.player.x - 200);
                }
            } else if (targetPhase === '3') {
                this.switchPhase(3);
                this.startGame();
                if (getParam('pos')) {
                    this.player.x = parseFloat(getParam('pos'));
                    this.camera.x = Math.max(0, this.player.x - 200);
                }
            } else if (targetPhase === '4') {
                this.switchPhase(4);
                this.startGame();
                if (getParam('pos')) {
                    this.player.x = parseFloat(getParam('pos'));
                    this.camera.x = Math.max(0, this.player.x - 280);
                    if (this.trafficLights) {
                        this.trafficLights.forEach(tl => {
                            if (tl.x < this.player.x) {
                                tl.passed = true;
                                tl.state = 'GREEN';
                            }
                        });
                    }
                }
                if (getParam('speed')) {
                    this.speedKmh = parseFloat(getParam('speed'));
                }
            } else if (targetPhase === '5') {
                this.switchPhase(5);
                this.startGame();
                if (getParam('truck')) {
                    this.currentTruckIndex = parseInt(getParam('truck'), 10) || 1;
                }
                if (getParam('state')) {
                    this.phase3State = getParam('state');
                    if (this.phase3State === 'TIMING_GAME') {
                        this.player.x = this.dockTargetX;
                        this.timingNeedlePos = 50;
                        this.currentTruckIndex = parseInt(getParam('truck'), 10) || 2;
                    } else if (this.phase3State === 'DUMPING') {
                        this.player.x = this.dockTargetX;
                        this.dumpAngle = 25;
                        this.currentTruckIndex = parseInt(getParam('truck'), 10) || 2;
                        this.truckDumped = 3.8;
                        this.roundDumpTarget = 7.5;
                        this.roundDumped = 3.8;
                        this.trailerLoad = 11.3;
                        this.dumpProgress = 38;
                        for (let k = 0; k < 8; k++) {
                            this.spawnDumpTrashBag(this.player.x + 94, this.player.y + 15);
                        }
                    } else if (this.phase3State === 'TRUCK_EXIT') {
                        this.player.x = 180;
                        this.dumpAngle = 0;
                        this.currentTruckIndex = parseInt(getParam('truck'), 10) || 2;
                    } else if (this.phase3State === 'COMPACTING' || this.phase3State === 'COMPLETE') {
                        this.player.x = this.dockTargetX;
                        this.dumpAngle = 0;
                        this.trailerLoad = 30.0;
                        this.dumpProgress = 100;
                        this.tarpCoverProgress = 85;
                        this.currentTruckIndex = 4;
                    }
                }
            } else if (targetPhase === '6') {
                this.switchPhase(6);
                this.startGame();
                if (getParam('pos')) {
                    this.player.x = parseFloat(getParam('pos'));
                    this.camera.x = Math.max(0, this.player.x - 300);
                }
            } else if (targetPhase === '7') {
                this.switchPhase(7);
                this.startGame();
                const stage = getParam('stage') || getParam('state');
                const mode = getParam('mode');
                const pos = getParam('pos');

                if (stage) {
                    this.phase5Stage = stage;
                    this.phase5State = stage;
                    if (stage === 'COMPACT' || stage === 'GET_SOIL' || stage === 'COVER' || stage === 'PARK') {
                        this.phase5Mode = 'TRACTOR';
                        this.phase5Tractor.x = pos ? parseFloat(pos) : (stage === 'GET_SOIL' ? 340 : 850);
                        if (stage === 'COVER' || stage === 'PARK') {
                            this.phase5Zones.forEach(z => z.comp = 100);
                            this.phase5SoilLoaded = true;
                        }
                    } else if (stage === 'TO_BIOGAS' || stage === 'BIOGAS') {
                        this.phase5Mode = (mode === 'PANEL' || stage === 'BIOGAS') ? 'PANEL' : 'PLAYER';
                        this.phase5Zones.forEach(z => { z.comp = 100; z.cover = 100; });
                        this.player.x = pos ? parseFloat(pos) : 2290;
                        this.camera.x = Math.max(0, this.player.x - 300);
                    } else if (stage === 'TO_LAGOONS') {
                        this.phase5Mode = 'PLAYER';
                        this.phase5Zones.forEach(z => { z.comp = 100; z.cover = 100; });
                        this.phase5PowerComplete = true;
                        this.player.x = pos ? parseFloat(pos) : 3400;
                        this.camera.x = Math.max(0, this.player.x - 300);
                    } else if (stage === 'TO_LAB' || stage === 'ANALYSIS' || stage === 'COMPLETE') {
                        this.phase5Mode = (mode === 'ANALYSIS' || stage === 'ANALYSIS') ? 'ANALYSIS' : 'PLAYER';
                        this.phase5Zones.forEach(z => { z.comp = 100; z.cover = 100; });
                        this.phase5PowerComplete = true;
                        this.phase5Aerators.forEach(a => a.active = true);
                        this.player.x = pos ? parseFloat(pos) : 4800;
                        this.camera.x = Math.max(0, this.player.x - 300);
                    }
                } else if (pos) {
                    this.player.x = parseFloat(pos);
                    this.camera.x = Math.max(0, this.player.x - 300);
                }
                if (mode) {
                    this.phase5Mode = mode;
                }
            } else if (targetPhase === '8') {
                this.switchPhase(8);
                this.startGame();
                if (getParam('state')) {
                    this.phase7State = getParam('state');
                }
                if (getParam('hp') && this.boss) {
                    this.boss.hp = parseInt(getParam('hp'), 10);
                }
            } else if (targetPhase) {
                const parsedPhase = parseInt(targetPhase, 10);
                if (parsedPhase >= 1 && parsedPhase <= 8) {
                    this.switchPhase(parsedPhase);
                    this.startGame();
                }
            }

            if ((getParam('cutscene')) === 'intro') {
                this.startCutscene('INTRO');
                const step = parseInt((getParam('step')) || '0', 10);
                this.cutscene.step = step;
                if ((getParam('instant')) === '1') {
                    this.cutscene.textProgress = 999;
                }
            } else if ((getParam('cutscene')) === 'phase5_to_6' || (getParam('cutscene')) === 'phase6_to_7' || (getParam('cutscene')) === 'phase7_to_8') {
                this.switchPhase(7);
                const step = parseInt((getParam('step')) || '0', 10);
                this.startCutscene('PHASE7_TO_8');
                this.cutscene.step = step;
                if ((getParam('instant')) === '1') {
                    this.cutscene.textProgress = 999;
                }
            } else if ((getParam('cutscene')) === 'ending') {
                this.switchPhase(8);
                const requestedStep = parseInt((getParam('step')) || '0', 10);
                this.startCutscene('GRAND_ENDING');
                // O encerramento agora tem apenas a redenção e a celebração.
                // Links antigos que apontavam para o certificado seguem direto aos créditos.
                if (requestedStep >= 2) {
                    this.startCredits();
                } else {
                    this.cutscene.step = Math.max(0, requestedStep);
                }
                if (this.cutscene.active && (getParam('instant')) === '1') {
                    this.cutscene.textProgress = 999;
                }
            }
            if ((getParam('cutscene')) && (getParam('animTime'))) {
                this.cutscene.animTime = parseFloat((getParam('animTime')));
            }
            if ((getParam('autowin')) === '1') {
                this.startGame();
                if (this.currentPhase === 8) {
                    if (this.boss) {
                        this.boss.hp = 0;
                        this.boss.state = 'DEFEATED';
                    }
                    this.score = 15000;
                    this.levelClear();
                } else if (this.currentPhase === 7) {
                    this.compactionProgress = 100;
                    if (this.compactionZones) this.compactionZones.forEach(z => z.comp = 100);
                    this.soilCoverProgress = 100;
                    this.biogasPowerMW = 10.0;
                    this.chorumeTreated = 100;
                    this.labSampleTested = true;
                    this.score = 8500;
                    this.levelClear();
                } else if (this.currentPhase === 6) {
                    this.phase5Stability = 95;
                    this.cargoStability = 95;
                    this.cargoWeight = 30000;
                    this.score = 4200;
                    if (this.phase5Truck) this.phase5Truck.x = 6300;
                    this.player.x = 6300;
                    this.camera.x = Math.max(0, (6300 - 1280 * 0.43) * 0.75);
                    this.levelClear();
                } else if (this.currentPhase === 5) {
                    this.trailerLoad = 30.0;
                    this.currentTruckIndex = 4;
                    this.dumpProgress = 100;
                    this.levelClear();
                } else if (this.currentPhase === 4) {
                    this.biodieselCollected = this.totalBiodiesel;
                    this.wrenchesCollected = this.totalWrenches;
                    this.player.x = 3900;
                    this.levelClear();
                } else if (this.currentPhase === 3) {
                    if (this.phase2Stops) this.phase2Stops.forEach(s => { s.complete = true; s.collected = s.bags; });
                    this.phase2Collected = this.phase2TotalBags;
                    if (this.phase2Truck) this.phase2Truck.x = this.phase2DestinationX;
                    this.levelClear();
                } else if (this.currentPhase === 2) {
                    this.trashCollected = this.totalTrash;
                    this.recyclablesCollected = 6;
                    this.score = 2600;
                    this.camera.x = 3100;
                    this.player.x = 3680;
                    this.levelClear();
                } else {
                    if (this.casaViva) {
                        this.casaViva.items.forEach(it => { it.state = 'deposited'; it.fallT = 1; });
                        this.casaViva.completed = true;
                    }
                    this.levelClear();
                }
            } else if (getParam('autostart') === '1') {
                this.startGame();
                if (getParam('pos')) {
                    this.player.x = parseFloat(getParam('pos'));
                    this.camera.x = Math.max(0, this.player.x - 200);
                }
                if (getParam('walk') === '1') {
                    this.keys.right = true;
                    this.player.facing = 1;
                    this.player.vx = 80;
                    this.player.animState = 'walk';
                    this.player.animFrame = 1;
                }
                if (getParam('jump') === '1') {
                    this.player.isGrounded = false;
                    this.player.vy = -180;
                    this.player.animState = 'jump';
                    this.player.animFrame = 1;
                    this.player.y = 330;
                }
            }

            if (!targetPhase && !getParam('cutscene') && !creditsRequested) {
                this.currentPhase = 1;
                this.state = 'TITLE';
                this.initLevel();
            }
            if (creditsRequested) this.startCredits();
        }
    }

    autowin() {
        if (this.currentPhase === 6) {
            this.phase5Stability = 95;
            this.cargoStability = 95;
            this.cargoWeight = 30000;
            this.score += 4200;
            if (this.phase5Truck) this.phase5Truck.x = 6300;
            this.player.x = 6300;
            this.camera.x = Math.max(0, (6300 - 1280 * 0.43) * 0.75);
            this.levelClear();
        } else {
            this.levelClear();
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

            if (this.state === 'CREDITS') {
                if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
                    this.finishCredits();
                    return;
                }
                if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                    this.keys.down = true;
                    return;
                }
            }
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
                    if (this.currentPhase > 1) {
                        this.switchPhase(this.currentPhase);
                        this.startGame();
                    } else {
                        this.startCutscene('INTRO');
                    }
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
                case 'KeyE':
                    this.keys.action = true;
                    this.actionJustPressed = true;
                    break;
                case 'ArrowUp': case 'KeyW': case 'KeyK': case 'KeyZ': case 'KeyJ': case 'Space':
                    this.keys.up = true;
                    this.keys.jump = true;
                    this.keys.jumpHeld = true;
                    this.keyboardJumpHeld = true;
                    this.actionJustPressed = true;
                    this.player.jumpBuffer = 0.15;
                    if ((this.currentPhase === 3 || this.currentPhase === 4) && window.soundManager) window.soundManager.playHorn();
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
                    this.actionJustPressed = true;
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
                case 'KeyE': this.keys.action = false; break;
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
            if (!this.assetsReady) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = VIRTUAL_WIDTH / rect.width;
            const scaleY = VIRTUAL_HEIGHT / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            // In-Game Phase Selection via Top Sub-Banner (y between 48 and 72)
            if (this.state === 'PLAYING' && clickY >= 48 && clickY <= 72) {
                const targetClickedPhase = Math.floor(clickX / (VIRTUAL_WIDTH / 8)) + 1;
                if (targetClickedPhase >= 1 && targetClickedPhase <= 8 && targetClickedPhase !== this.currentPhase) {
                    this.switchPhase(targetClickedPhase);
                    this.startGame();
                    return;
                }
            }

            if (this.state === 'TITLE') {
                if (this.currentPhase > 1) {
                    this.switchPhase(this.currentPhase);
                    this.startGame();
                } else {
                    this.startCutscene('INTRO');
                }
                return;
            }
            if (this.state === 'CREDITS') {
                this.finishCredits();
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
            if (this.currentPhase === 7 && this.state === 'PLAYING') {
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
                    if ((this.currentPhase === 3 || this.currentPhase === 4) && window.soundManager) window.soundManager.playHorn();
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
        const p7 = document.getElementById('pillStage7');
        const p8 = document.getElementById('pillStage8');
        if (p1) { if (phaseNum === 1) p1.classList.add('active'); else p1.classList.remove('active'); }
        if (p2) { if (phaseNum === 2) p2.classList.add('active'); else p2.classList.remove('active'); }
        if (p3) { if (phaseNum === 3) p3.classList.add('active'); else p3.classList.remove('active'); }
        if (p4) { if (phaseNum === 4) p4.classList.add('active'); else p4.classList.remove('active'); }
        if (p5) { if (phaseNum === 5) p5.classList.add('active'); else p5.classList.remove('active'); }
        if (p6) { if (phaseNum === 6) p6.classList.add('active'); else p6.classList.remove('active'); }
        if (p7) { if (phaseNum === 7) p7.classList.add('active'); else p7.classList.remove('active'); }
        if (p8) { if (phaseNum === 8) p8.classList.add('active'); else p8.classList.remove('active'); }

        this.initLevel();
        this.state = 'PLAYING';
        if (window.soundManager) {
            window.soundManager.startMusic(phaseNum === 8 ? 'boss' : 'stage');
        }
        if (phaseNum === 8) {
            this.lives = 5;
            this.showTip('Fase 8: O Grande Chefão! Suba nos andaimes e derrote o Mecha-Trator do Barão do Entulho!', 5.5);
        } else if (phaseNum === 7) {
            this.showTip('Fase 7: Aterro Sanitário & Usina Verde! Compacte os resíduos, ligue o biogás e trate o chorume!', 5.0);
        } else if (phaseNum === 6) {
            this.showTip('Fase 6: Carreta ao Aterro! Conduza a carreta de 30t pelas dunas e passe na Balança ANTT!', 5.0);
        } else if (phaseNum === 5) {
            this.showTip('Fase 5: Joga na Carreta! Manobre até a doca e acione o pistão para descarregar!', 4.5);
        } else if (phaseNum === 4) {
            this.showTip('Fase 4: Rodovia ao Transbordo! Dirija com cuidado, respeite os semáforos e colete biodiesel!', 4.5);
        } else if (phaseNum === 3) {
            this.showTip('Fase 3: Rota do Caminhão Coletor! Dirija pelos bairros e apoie o Cajulim na coleta dos sacos!', 4.5);
        } else if (phaseNum === 2) {
            this.showTip('Fase 2: Pega o Lixo! Colete os sacos e recicláveis até o caminhão!', 4.0);
        } else {
            const casaTip = this.casaVivaVariant === 'three-rooms'
                ? 'Fase 1 com 3 cômodos! Explore a cozinha, a sala e a área de serviço para separar os resíduos!'
                : 'Fase 1: Casa Viva do Cajulim! Separe 3 resíduos secos e 3 molhados neste cômodo!';
            this.showTip(casaTip, 4.5);
        }
    }

    nextPhase() {
        if (this.currentPhase >= 1 && this.currentPhase <= 7) {
            this.switchPhase(this.currentPhase + 1);
        } else {
            this.restartLevel();
        }
    }

    startGame() {
        this.state = 'PLAYING';
        if (window.soundManager) {
            window.soundManager.startMusic(this.currentPhase === 8 ? 'boss' : 'stage');
        }
        if (this.currentPhase === 1) {
            const casaTip = this.casaVivaVariant === 'three-rooms'
                ? 'Fase 1 com 3 cômodos! Encontre 5 secos e 5 molhados pela casa!'
                : 'Fase 1: Separe 3 secos no recipiente azul e 3 molhados no marrom!';
            this.showTip(casaTip, 4.5);
        } else if (this.currentPhase === 2) {
            this.showTip('Fase 2: Pega o Lixo! Colete os sacos e recicláveis nas ruas até o caminhão!', 4.0);
        } else if (this.currentPhase === 3) {
            this.showTip('Fase 3: Rota do Caminhão Coletor! Dirija pelos bairros e apoie o Cajulim na coleta dos sacos!', 4.5);
        } else if (this.currentPhase === 4) {
            this.showTip('Fase 4: Rodovia ao Transbordo! Dirija com cuidado até a Estação de Transbordo!', 4.5);
        } else if (this.currentPhase === 5) {
            this.showTip('Fase 5: Joga na Carreta! Manobre até a doca e acione o pistão para descarregar!', 4.5);
        } else if (this.currentPhase === 6) {
            this.showTip('Fase 6: Carreta ao Aterro! Conduza a carreta de 30t pelas dunas e passe na Balança ANTT!', 5.0);
        } else if (this.currentPhase === 7) {
            this.showTip('Fase 7: Aterro Sanitário & Usina Verde! Compacte os resíduos, ligue o biogás e trate o chorume!', 5.0);
        } else if (this.currentPhase === 8) {
            this.showTip('Fase 8: O Confronto Final! Suba nos andaimes e derrote o Mecha-Trator do Barão do Entulho!', 5.5);
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
        this.lives = this.currentPhase === 8 ? 5 : 3;
        this.player.invulnerableTimer = 0;

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
        } else if (this.currentPhase === 7) {
            this.initPhase7();
        } else if (this.currentPhase === 8) {
            this.initPhase8();
        }

        const vm = document.getElementById('victoryModal');
        if (vm) vm.classList.add('hidden');
        const gm = document.getElementById('gameOverModal');
        if (gm) gm.classList.add('hidden');
    }

    initPhase2() {
        const GROUND_Y = 460;
        this.levelWidth = 6450;

        // Ground segments with PITS:
        const groundSegments = [
            { x1: 0, x2: 760 },
            { x1: 920, x2: 1640 },
            { x1: 1920, x2: 2640 },
            { x1: 3000, x2: 4200 },
            { x1: 4450, x2: 5250 },
            { x1: 5450, x2: 6450 }
        ];
        groundSegments.forEach(seg => {
            this.platforms.push({ x: seg.x1, y: GROUND_Y, w: seg.x2 - seg.x1, h: 80, type: 'ground' });
        });

        // Tutorial bridge for the enlarged Cajulim. The first pit starts right
        // after the spawn sign; a short jump used to miss it by a few pixels
        // because the 80x120 hitbox needs more air time. Keep the later pits as
        // the real challenge, while this flush bridge prevents an unexpected
        // death in the opening seconds of the phase.
        this.platforms.push({ x: 760, y: GROUND_Y, w: 160, h: 20, type: 'tutorial_bridge' });

        // Stepping stone platforms across pits
        this.platforms.push({ x: 1710, y: 380, w: 140, h: 32, type: 'floating' });
        this.platforms.push({ x: 2690, y: 380, w: 120, h: 32, type: 'floating' });
        this.platforms.push({ x: 2850, y: 380, w: 120, h: 32, type: 'floating' });
        this.platforms.push({ x: 4280, y: 380, w: 140, h: 32, type: 'floating' });
        this.platforms.push({ x: 5310, y: 380, w: 140, h: 32, type: 'floating' });

        // Elevated Platforms & Hills
        this.platforms.push({ x: 440, y: 350, w: 144, h: 32, type: 'floating' });
        this.platforms.push({ x: 1140, y: 390, w: 192, h: 32, type: 'floating' });
        this.platforms.push({ x: 1220, y: 320, w: 144, h: 32, type: 'floating' });
        this.platforms.push({ x: 1380, y: 260, w: 120, h: 32, type: 'floating' });
        this.platforms.push({ x: 2150, y: 360, w: 160, h: 32, type: 'floating' });
        this.platforms.push({ x: 2360, y: 280, w: 160, h: 32, type: 'floating' });
        this.platforms.push({ x: 4600, y: 360, w: 160, h: 32, type: 'floating' });
        this.platforms.push({ x: 4820, y: 290, w: 160, h: 32, type: 'floating' });
        this.platforms.push({ x: 5040, y: 350, w: 140, h: 32, type: 'floating' });

        // Steps before truck
        this.platforms.push({ x: 5550, y: 410, w: 96, h: 32, type: 'floating' });
        this.platforms.push({ x: 5660, y: 360, w: 96, h: 32, type: 'floating' });
        this.platforms.push({ x: 5770, y: 310, w: 96, h: 32, type: 'floating' });

        // Interactive blocks (centered textures).
        // Cajulim is 80x120 in this test build, so his standing top is
        // GROUND_Y - 120 = 340. Keep 22px of headroom below every ground-row
        // block so the enlarged character can walk underneath without getting
        // caught by the AABB collision. The previous row at y=310 ended at
        // y=358 and overlapped his hitbox by 18px.
        const BLOCK_ROW_Y = GROUND_Y - 190;
        this.blocks = [
            { x: 260, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'recycle', hit: false, content: 'soda_can' },
            { x: 308, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'brick', hit: false },
            { x: 356, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'question', hit: false, content: 'star' },
            { x: 404, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'brick', hit: false },
            { x: 1040, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'recycle', hit: false, content: 'pet_bottle' },
            { x: 1088, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'brick', hit: false },
            { x: 2040, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'recycle', hit: false, content: 'paper_box' },
            { x: 2280, y: 220, w: 48, h: 48, type: 'recycle', hit: false, content: 'glass_bottle' },
            { x: 4520, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'recycle', hit: false, content: 'soda_can' },
            { x: 4568, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'brick', hit: false },
            { x: 4720, y: 220, w: 48, h: 48, type: 'question', hit: false, content: 'star' },
            { x: 5100, y: BLOCK_ROW_Y, w: 48, h: 48, type: 'recycle', hit: false, content: 'pet_bottle' }
        ];

        // Garbage Bags
        this.items.push(
            { id: 1, x: 300, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 2, x: 620, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 3, x: 1100, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 4, x: 1540, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 5, x: 2200, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 6, x: 3150, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 7, x: 1260, y: 320 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' },
            { id: 8, x: 1760, y: 380 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' },
            { id: 9, x: 3590, y: 310 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' },
            { id: 19, x: 4500, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 20, x: 4880, y: 290 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' },
            { id: 21, x: 5180, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 22, x: 5600, y: GROUND_Y - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto' },
            { id: 23, x: 5790, y: 310 - 44, type: 'trash_bag', points: 200, name: 'Saco de Lixo Preto (Bônus)' }
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
            { id: 18, x: 2900, y: 270, type: 'star', points: 300, name: 'Bandeira de Parnamirim' },
            { id: 24, x: 4650, y: 360 - 38, type: 'soda_can', points: 100, name: 'Latinha (Metal/Amarelo)' },
            { id: 25, x: 5040, y: 350 - 42, type: 'pet_bottle', points: 100, name: 'Garrafa PET (Plástico/Vermelho)' },
            { id: 26, x: 5480, y: GROUND_Y - 36, type: 'paper_box', points: 100, name: 'Caixa (Papelão/Azul)' },
            { id: 27, x: 5660, y: 360 - 42, type: 'glass_bottle', points: 100, name: 'Garrafa (Vidro/Verde)' }
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
            { x: 4100, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 4700, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 5200, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 5800, y: GROUND_Y - 240, w: 180, h: 250, type: 'tree' },
            { x: 50, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 230, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 420, y: GROUND_Y - 48, w: 60, h: 48, type: 'bush' },
            { x: 1100, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 1350, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 2250, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 3050, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 4500, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 5000, y: GROUND_Y - 56, w: 72, h: 56, type: 'bush_flowers' },
            { x: 5500, y: GROUND_Y - 48, w: 64, h: 48, type: 'bush' },
            { x: 80, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Bem-vindo ao Bairro! Recolha o lixo e entregue no caminhão!' },
            { x: 700, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'ATENÇÃO: Buraco à frente! Pule com ESPACO!' },
            { x: 1880, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Dica da Cajulina: O plástico descartado corretamente vira novos produtos!' },
            { x: 2950, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Cuidado: Passagem sobre os buracos à frente!' },
            { x: 4150, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'ATENÇÃO: Buraco com plataforma à frente! Pule com precisão!' },
            { x: 4780, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'O tempo fechou! Tempestade com chuva e trovões à frente!' },
            { x: 5400, y: GROUND_Y - 70, w: 56, h: 70, type: 'sign', text: 'Sob a chuva! O caminhão da coleta seletiva está logo adiante!' }
        ];

        // Green truck goal (placed at x: 5900)
        this.truck = { x: 5900, y: GROUND_Y - 170, w: 360, h: 180 };

        // Weather state
        this.isRaining = false;
        this.rainParticles = [];
        this.thunderTimer = 2.0;
        this.lightningFlash = 0;

        // Cajulim keeps the 2:3 portrait proportion used by Faze 0 (80x120).
        // The larger body makes the hero read clearly against the new pixel-art landmark.
        this.player.x = 80;
        this.player.w = 80;
        this.player.h = 120;
        this.player.y = GROUND_Y - this.player.h;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.coyoteTimer = 0.12;
        this.player.isDead = false;
        this.player.animState = 'idle';

        this.trashCollected = 0;
        this.totalTrash = 6;
        this.recyclablesCollected = 0;
        this.totalRecyclables = 13;
        this.timeLeft = 360;
        this.timerAccumulator = 0;
    }

    initPhase3() {
        const FLOOR = 448;
        this.levelWidth = 4900;
        this.phase2Floor = FLOOR;
        this.phase2TotalBags = 10;
        this.phase2Collected = 0;
        this.phase2Mode = 'DRIVE';
        this.phase2CurrentStop = null;
        this.phase2CollectionPhase = '';
        this.phase2PhaseTimer = 0;
        this.phase2Projectile = null;
        this.phase2Particles = [];
        this.phase2Dust = [];
        this.phase2FinishedAt = 0;
        this.phase2DestinationX = 4350;

        this.phase2Message = "Você dirige o coletor! Cajulim corre atrás e realiza a coleta nos bairros!";
        this.phase2MessageTimer = 5.0;

        this.phase2Truck = {
            x: 140,
            y: FLOOR - 128,
            w: 260,
            h: 128,
            speed: 0,
            wheel: 0
        };

        this.phase2Npc = {
            x: 60,
            y: FLOOR - 68,
            w: 46,
            h: 68,
            facing: 1,
            anim: 'walk',
            animTime: 0,
            carrying: false
        };

        // 5 stops across Parnamirim neighborhoods
        this.phase2Stops = [
            { id: 1, truckX: 700, trashX: 580, bags: 2, collected: 0, complete: false, color: "#f3bd4a", district: "CENTRO" },
            { id: 2, truckX: 1450, trashX: 1330, bags: 2, collected: 0, complete: false, color: "#55cfe5", district: "NOVA PARNAMIRIM" },
            { id: 3, truckX: 2200, trashX: 2080, bags: 2, collected: 0, complete: false, color: "#76d37e", district: "COHABINAL" },
            { id: 4, truckX: 2950, trashX: 2830, bags: 2, collected: 0, complete: false, color: "#f09c62", district: "ROSA DOS VENTOS" },
            { id: 5, truckX: 3700, trashX: 3580, bags: 2, collected: 0, complete: false, color: "#b7d85f", district: "SANTOS REIS" }
        ];

        this.phase2Buildings = Array.from({ length: 22 }, (_, index) => ({
            x: 140 + index * 260,
            w: 165 + (index % 3) * 26,
            h: 100 + ((index * 47) % 85),
            color: ["#f0c46a", "#e8866b", "#6fbac1", "#8fba6b", "#d99f75"][index % 5],
            roof: ["#9d4d3e", "#315f71", "#63733b"][index % 3]
        }));

        this.player.x = this.phase2Truck.x;
        this.player.y = this.phase2Truck.y;
        this.player.w = this.phase2Truck.w;
        this.player.h = this.phase2Truck.h;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.isDead = false;
        this.player.animState = 'truck';
    }

    getNextPhase2Stop() {
        return (this.phase2Stops && this.phase2Stops.find(s => !s.complete)) || null;
    }

    getPhase2MissionText() {
        if (this.phase2CurrentStop) {
            const phases = {
                GO_TRASH: "Cajulim está correndo até os resíduos na calçada.",
                PICKUP: "Cajulim está recolhendo o saco de lixo.",
                GO_TRUCK: "Cajulim está trazendo o saco para o caminhão.",
                THROW: "Cajulim vai arremessar o saco no coletor.",
                WAIT_THROW: "O lixo está entrando no compactador!"
            };
            return phases[this.phase2CollectionPhase] || "Coleta em andamento.";
        }
        const stop = this.getNextPhase2Stop();
        if (stop) return "Próximo: Ponto " + stop.id + " em " + stop.district + ". Pare na faixa amarela!";
        return "Coleta nos 5 bairros concluída! Avance para a rampa de acesso à Rodovia.";
    }

    updatePhase2(dt) {
        const t = this.phase2Truck;
        if (!t) return;

        if (this.phase2MessageTimer > 0) this.phase2MessageTimer -= dt;

        if (this.phase2Mode === 'WIN') {
            return;
        }

        if (this.phase2CurrentStop) {
            this.updatePhase2Collection(dt);
        } else {
            this.updatePhase2Truck(dt);
        }

        this.updatePhase2Npc(dt);
        this.updatePhase2Projectile(dt);
        this.updatePhase2Particles(dt);

        const allComplete = this.phase2Stops && this.phase2Stops.every(s => s.complete);
        const brake = this.keys.down || this.keys.jump || this.keys.action;
        if (allComplete && ((t.x >= this.phase2DestinationX - 50 && Math.abs(t.speed) < 22 && brake) || (t.x >= this.phase2DestinationX + 110))) {
            this.phase2Mode = 'WIN';
            this.phase2FinishedAt = this.gameTime || 0;
            this.score += 1500;
            this.burstPhase2(t.x + 130, 360, "#63e49a", 55);
            if (window.soundManager) window.soundManager.playVictory();
            this.showTip("ROTA CONCLUÍDA! O caminhão entrou na Rodovia rumo ao Transbordo!", 5.0);
            setTimeout(() => {
                if (this.currentPhase === 3) this.levelClear();
            }, 900);
        }

        this.player.x = t.x;
        this.player.y = t.y;
        this.player.w = t.w;
        this.player.h = t.h;
    }

    updatePhase2Truck(dt) {
        const t = this.phase2Truck;
        const throttle = this.keys.right;
        const reverse = this.keys.left;
        const brake = this.keys.down || this.keys.jump || this.keys.action;

        if (brake) {
            const braking = 520 * dt;
            if (t.speed > 0) t.speed = Math.max(0, t.speed - braking);
            else if (t.speed < 0) t.speed = Math.min(0, t.speed + braking);
        } else if (throttle && !reverse) {
            t.speed = Math.min(285, t.speed + 150 * dt);
        } else if (reverse && !throttle) {
            if (t.speed > 0) t.speed = Math.max(0, t.speed - 240 * dt);
            else t.speed = Math.max(-115, t.speed - 95 * dt);
        } else {
            t.speed *= Math.pow(0.22, dt);
            if (Math.abs(t.speed) < 1) t.speed = 0;
        }

        // Caminhão reduz velocidade se Cajulim estiver muito para trás
        const npcGap = t.x - (this.phase2Npc.x + this.phase2Npc.w);
        if (npcGap > 300 && t.speed > 90) {
            t.speed = Math.max(90, t.speed - 260 * dt);
            if (this.phase2MessageTimer <= 0) {
                this.phase2Message = "Reduza a velocidade: espere o Cajulim acompanhar o caminhão!";
                this.phase2MessageTimer = 2.4;
            }
        }

        t.x += t.speed * dt;
        t.x = Math.max(60, Math.min(this.levelWidth - t.w - 60, t.x));
        t.wheel += t.speed * dt * 0.035;

        // Poeira atrás das rodas
        if (Math.abs(t.speed) > 40 && Math.random() < dt * 6) {
            this.phase2Dust.push({
                x: t.x + 20,
                y: this.phase2Floor - 8,
                vx: -20 - Math.random() * 30,
                vy: -10 - Math.random() * 15,
                life: 0.65,
                size: 4 + Math.random() * 7
            });
        }

        const stop = this.getNextPhase2Stop();
        if (stop && Math.abs(t.x - stop.truckX) <= 85 && Math.abs(t.speed) < 18 && brake) {
            this.beginPhase2Collection(stop);
        } else if (stop && t.x > stop.truckX + 220 && this.phase2MessageTimer <= 0) {
            this.phase2Message = "O Ponto " + stop.id + " ficou para trás! Dê ré até a faixa amarela.";
            this.phase2MessageTimer = 3.0;
        }
    }

    beginPhase2Collection(stop) {
        this.phase2Truck.speed = 0;
        this.phase2CurrentStop = stop;
        this.phase2CollectionPhase = 'GO_TRASH';
        this.phase2PhaseTimer = 0;
        this.phase2Mode = 'COLLECTING';
        this.phase2Message = "Cajulim iniciou a coleta no Ponto " + stop.id + " (" + stop.district + ")!";
        this.phase2MessageTimer = 2.8;
        if (window.soundManager && window.soundManager.playCollect) {
            window.soundManager.playCollect('trash');
        }
    }

    updatePhase2Collection(dt) {
        this.phase2Truck.speed = 0;
        const stop = this.phase2CurrentStop;
        if (!stop) return;

        if (this.phase2CollectionPhase === 'GO_TRASH') {
            if (this.movePhase2NpcToward(stop.trashX - 12, dt, 310)) {
                this.phase2CollectionPhase = 'PICKUP';
                this.phase2PhaseTimer = 0.45;
                this.phase2Npc.anim = 'collect';
            }
        } else if (this.phase2CollectionPhase === 'PICKUP') {
            this.phase2PhaseTimer -= dt;
            this.phase2Npc.animTime += dt * 7;
            if (this.phase2PhaseTimer <= 0) {
                this.phase2Npc.carrying = true;
                this.phase2CollectionPhase = 'GO_TRUCK';
            }
        } else if (this.phase2CollectionPhase === 'GO_TRUCK') {
            if (this.movePhase2NpcToward(this.phase2Truck.x - 35, dt, 325)) {
                this.phase2CollectionPhase = 'THROW';
                this.phase2PhaseTimer = 0.16;
                this.phase2Npc.anim = 'collect';
            }
        } else if (this.phase2CollectionPhase === 'THROW') {
            this.phase2PhaseTimer -= dt;
            this.phase2Npc.animTime += dt * 8;
            if (this.phase2PhaseTimer <= 0 && !this.phase2Projectile) {
                this.phase2Npc.carrying = false;
                this.phase2Projectile = {
                    x0: this.phase2Npc.x + this.phase2Npc.w * 0.74,
                    y0: this.phase2Npc.y + 20,
                    x1: this.phase2Truck.x + 28,
                    y1: this.phase2Truck.y + 45,
                    t: 0,
                    duration: 0.65,
                    stop: stop
                };
                this.phase2CollectionPhase = 'WAIT_THROW';
            }
        }
    }

    finishPhase2Throw(stop) {
        stop.collected += 1;
        this.phase2Collected += 1;
        this.score += 250;
        this.burstPhase2(this.phase2Truck.x + 32, this.phase2Truck.y + 54, "#ffe266", 16);
        if (window.soundManager && window.soundManager.playCollect) {
            window.soundManager.playCollect('trash');
        }

        if (stop.collected >= stop.bags) {
            stop.complete = true;
            this.phase2CurrentStop = null;
            this.phase2CollectionPhase = '';
            this.phase2Mode = 'DRIVE';
            this.score += 300;
            this.phase2Message = "Ponto " + stop.id + " (" + stop.district + ") concluído! Espere o Cajulim e siga em frente!";
            this.phase2MessageTimer = 3.5;
            this.showTip("Ponto " + stop.id + " concluído! Siga para o próximo bairro.", 3.0);
        } else {
            this.phase2CollectionPhase = 'GO_TRASH';
            this.phase2Message = "Saco " + stop.collected + "/" + stop.bags + " coletado. Falta mais um!";
            this.phase2MessageTimer = 2.0;
        }
    }

    movePhase2NpcToward(targetX, dt, speed) {
        const n = this.phase2Npc;
        const delta = targetX - n.x;
        if (Math.abs(delta) <= 5) {
            n.x = targetX;
            n.anim = 'idle';
            return true;
        }
        n.facing = delta > 0 ? 1 : -1;
        n.x += Math.sign(delta) * Math.min(Math.abs(delta), speed * dt);
        n.anim = 'walk';
        n.animTime += dt * 11;
        return false;
    }

    updatePhase2Npc(dt) {
        const n = this.phase2Npc;
        if (this.phase2CurrentStop) return;

        const target = this.phase2Truck.x - 58;
        const delta = target - n.x;
        if (Math.abs(delta) > 8) {
            const catchUp = Math.abs(delta) > 200 ? 380 : 290;
            n.x += Math.sign(delta) * Math.min(Math.abs(delta), catchUp * dt);
            n.facing = delta > 0 ? 1 : -1;
            n.anim = 'walk';
            n.animTime += dt * (Math.abs(delta) > 200 ? 13 : 9);
        } else {
            n.anim = 'idle';
            n.animTime += dt * 3.5;
        }
    }

    updatePhase2Projectile(dt) {
        if (!this.phase2Projectile) return;
        this.phase2Projectile.t += dt / this.phase2Projectile.duration;
        if (this.phase2Projectile.t >= 1) {
            const stop = this.phase2Projectile.stop;
            this.phase2Projectile = null;
            this.finishPhase2Throw(stop);
        }
    }

    burstPhase2(x, y, color, amount = 14) {
        for (let i = 0; i < amount; i++) {
            this.phase2Particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 160,
                vy: -40 - Math.random() * 140,
                life: 0.7 + Math.random() * 0.4,
                maxLife: 1.1,
                size: 3 + Math.random() * 6,
                color
            });
        }
    }

    updatePhase2Particles(dt) {
        for (let i = this.phase2Particles.length - 1; i >= 0; i--) {
            const p = this.phase2Particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;
            p.life -= dt;
            if (p.life <= 0) this.phase2Particles.splice(i, 1);
        }
        for (let i = this.phase2Dust.length - 1; i >= 0; i--) {
            const d = this.phase2Dust[i];
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.life -= dt;
            d.size += dt * 6;
            if (d.life <= 0) this.phase2Dust.splice(i, 1);
        }
    }

    renderPhase2(ctx) {
        this.drawPhase2Stops(ctx);
        this.drawPhase2HighwayEntrance(ctx);
        this.drawPhase2Dust(ctx);
        this.drawPhase2Truck(ctx);
        this.drawPhase2Npc(ctx);
        this.drawPhase2Projectile(ctx);
        this.drawPhase2Particles(ctx);

        // Prompts in the world
        const stop = this.getNextPhase2Stop();
        if (stop && Math.abs(this.phase2Truck.x - stop.truckX) < 180 && !this.phase2CurrentStop) {
            this.drawPhase2WorldPrompt(ctx, stop.truckX + 130, 310, "PARE NA FAIXA AMARELA PARA COLETAR");
        } else if (!stop && Math.abs(this.phase2Truck.x - this.phase2DestinationX) < 260) {
            this.drawPhase2WorldPrompt(ctx, this.phase2DestinationX + 140, 300, "ACESSO À RODOVIA: PARE NA FAIXA OU SIGA");
        }
    }

    drawPhase2Stops(ctx) {
        const trashImg = this.assets['item_trash_bag_raw'] || this.assets['item_trash_bag'];
        const bottleImg = this.assets['item_pet_bottle_raw'] || this.assets['item_pet_bottle'];

        for (const stop of this.phase2Stops) {
            if (stop.truckX + 300 < this.camera.x - 100 || stop.truckX - 100 > this.camera.x + VIRTUAL_WIDTH + 100) continue;

            // Stop lane markings on asphalt
            ctx.save();
            ctx.globalAlpha = stop.complete ? 0.45 : 0.95;
            ctx.fillStyle = stop.complete ? "#43c977" : "#f3c94e";
            ctx.fillRect(stop.truckX - 50, 430, this.phase2Truck.w + 100, 10);
            for (let x = stop.truckX - 45; x < stop.truckX + this.phase2Truck.w + 40; x += 32) {
                ctx.fillStyle = stop.complete ? "#a9f0bf" : "#17252c";
                ctx.fillRect(x, 432, 16, 6);
            }
            ctx.restore();

            // Street sign on the curb
            ctx.fillStyle = stop.complete ? "#1d7647" : "#12394a";
            this.roundRect(ctx, stop.truckX + 20, 375, 175, 34, 8);
            ctx.fill();
            ctx.strokeStyle = stop.complete ? "#8de6a8" : stop.color;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = "#efffe9";
            ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("PONTO " + stop.id + " · " + (stop.complete ? "COLETADO ✓" : stop.district), stop.truckX + 107, 396);

            // Trash bags waiting at curb
            const bagsLeft = stop.bags - stop.collected;
            for (let i = 0; i < bagsLeft; i++) {
                const bx = stop.trashX + i * 28;
                if (trashImg) {
                    ctx.drawImage(trashImg, bx, 388 - i * 3, 32, 32);
                } else {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(bx, 392 - i * 3, 26, 26);
                }
                if (i === 0 && !stop.complete && bottleImg) {
                    ctx.drawImage(bottleImg, bx + 22, 396, 11, 22);
                }
            }
        }
    }

    drawPhase2HighwayEntrance(ctx) {
        const x = 4250;
        if (x + 600 < this.camera.x - 100 || x - 100 > this.camera.x + VIRTUAL_WIDTH + 100) return;

        // Highway Entrance Gantry Posts
        ctx.fillStyle = '#475569';
        ctx.fillRect(x + 50, 160, 16, 260);
        ctx.fillRect(x + 400, 160, 16, 260);

        // Overhead truss beam
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 40, 150, 380, 24);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 40, 150, 380, 24);

        // Green Highway Directional Sign
        ctx.fillStyle = '#065f46';
        this.roundRect(ctx, x + 70, 178, 320, 68, 8);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ACESSO À RODOVIA MUNICIPAL', x + 230, 202);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillText('A CAMINHO DO TRANSBORDO ➔', x + 230, 222);

        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillText('TRANSIÇÃO: ROTA DOS BAIRROS → RODOVIA', x + 230, 237);

        // Amber flashing beacons on top of gantry
        const blink = Math.sin((this.gameTime || 0) * 8) > 0;
        ctx.fillStyle = blink ? '#facc15' : '#78350f';
        ctx.beginPath();
        ctx.arc(x + 58, 145, 8, 0, Math.PI * 2);
        ctx.arc(x + 408, 145, 8, 0, Math.PI * 2);
        ctx.fill();

        // Asphalt transition markings
        const allComplete = this.phase2Stops && this.phase2Stops.every(s => s.complete);
        ctx.save();
        ctx.strokeStyle = allComplete ? '#facc15' : '#64748b';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([14, 8]);
        ctx.strokeRect(this.phase2DestinationX - 40, 428, 340, 68);
        ctx.setLineDash([]);
        ctx.restore();

        // Streetlamp
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(x + 58, 160, 4, 0, Math.PI * 2);
        ctx.arc(x + 408, 160, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPhase2Truck(ctx) {
        const t = this.phase2Truck;
        const truckImg = this.assets['sc_truck'];
        if (!truckImg) return;

        const sourceCropH = Math.min(220, truckImg.naturalHeight || 240);
        const drawH = t.w * sourceCropH / (truckImg.naturalWidth || 480);
        const drawY = this.phase2Floor - drawH;

        ctx.save();
        ctx.translate(t.x + t.w, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(truckImg, 0, 0, truckImg.naturalWidth, sourceCropH, 0, 0, t.w, drawH);
        ctx.restore();

        // Spinning wheels
        const rearWheelX = t.x + t.w * 0.27;
        const frontWheelX = t.x + t.w * 0.80;
        const wheelY = this.phase2Floor - 15;
        this.drawPhase2SpinningWheel(ctx, rearWheelX, wheelY, 20, t.wheel, "#31a5bd");
        this.drawPhase2SpinningWheel(ctx, frontWheelX, wheelY, 20, t.wheel, "#f3a431");

        // Waste bags inside hopper
        const trashPixelImg = this.assets['item_trash_bag'] || this.assets['item_trash_bag_raw'];
        const fill = this.phase2Collected / this.phase2TotalBags;
        ctx.save();
        this.roundRect(ctx, t.x + 12, drawY + 22, 76, 54, 6);
        ctx.clip();
        for (let i = 0; i < this.phase2Collected; i++) {
            const bx = t.x + 15 + (i % 4) * 17;
            const by = drawY + 62 - Math.floor(i / 4) * 16 - (i % 2) * 3;
            if (trashPixelImg) {
                ctx.drawImage(trashPixelImg, bx, by, 20, 20);
            }
        }
        ctx.fillStyle = "rgba(84, 196, 220, " + (0.10 + fill * 0.08) + ")";
        ctx.fillRect(t.x + 12, drawY + 22, 76, 54);
        ctx.restore();

        // Cargo indicator above truck
        ctx.fillStyle = "rgba(5, 30, 41, .92)";
        this.roundRect(ctx, t.x + 65, drawY - 26, 140, 24, 6);
        ctx.fill();
        ctx.strokeStyle = "#75e5a1";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#efffe5";
        ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("CARGA " + this.phase2Collected + "/" + this.phase2TotalBags, t.x + 135, drawY - 10);
    }

    drawPhase2SpinningWheel(ctx, x, y, radius, angle, hubColor) {
        ctx.save();
        ctx.translate(x, y);

        // Tire outer ring
        ctx.fillStyle = "#071118";
        ctx.beginPath();
        ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#263b47";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Tread pattern
        ctx.rotate(angle);
        ctx.strokeStyle = "#607581";
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo(radius - 4, -2);
            ctx.lineTo(radius + 1, 1);
            ctx.stroke();
            ctx.restore();
        }

        // Rim
        ctx.fillStyle = "#183440";
        ctx.beginPath();
        ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#87aeb9";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Hub
        ctx.fillStyle = hubColor;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawPhase2Npc(ctx) {
        const n = this.phase2Npc;
        const sheet = this.assets['p_sheet'];
        if (!sheet) return;

        const frames = {
            idle: [0, 160, 320, 480].map(x => ({ x, y: 0, w: 160, h: 240 })),
            walk: [0, 160, 320, 480, 640, 800, 960, 1120].map(x => ({ x, y: 240, w: 160, h: 240 })),
            collect: [0, 160].map(x => ({ x, y: 720, w: 160, h: 240 })),
            win: [{ x: 0, y: 960, w: 160, h: 240 }]
        };

        const set = frames[n.anim] || frames.idle;
        const idx = Math.floor(n.animTime) % set.length;
        const frame = set[idx];

        ctx.save();
        ctx.translate(n.x + n.w / 2, n.y);
        ctx.scale(n.facing, 1);
        ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, -n.w / 2, 0, n.w, n.h);

        if (n.carrying) {
            const trashImg = this.assets['item_trash_bag_raw'] || this.assets['item_trash_bag'];
            if (trashImg) ctx.drawImage(trashImg, 6, 28, 28, 28);
        }
        ctx.restore();

        // Distance indicator dot above Cajulim
        if (!this.phase2CurrentStop) {
            const gap = Math.max(0, this.phase2Truck.x - (n.x + n.w));
            ctx.fillStyle = gap > 260 ? "#eec255" : "#62d98f";
            ctx.beginPath();
            ctx.arc(n.x + n.w / 2, n.y - 10, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawPhase2Projectile(ctx) {
        if (!this.phase2Projectile) return;
        const p = this.phase2Projectile;
        const t = Math.max(0, Math.min(1, p.t));
        const x = p.x0 + (p.x1 - p.x0) * t;
        const y = p.y0 + (p.y1 - p.y0) * t - Math.sin(t * Math.PI) * 85;
        const rot = t * Math.PI * 2.2;
        const trashImg = this.assets['item_trash_bag_raw'] || this.assets['item_trash_bag'];

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        if (trashImg) ctx.drawImage(trashImg, -18, -18, 36, 36);
        ctx.restore();
    }

    drawPhase2Dust(ctx) {
        for (const d of this.phase2Dust) {
            ctx.globalAlpha = Math.max(0, Math.min(1, d.life / 0.65)) * 0.35;
            ctx.fillStyle = "#d9cfad";
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawPhase2Particles(ctx) {
        for (const p of this.phase2Particles) {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    drawPhase2WorldPrompt(ctx, x, y, text) {
        const pulse = 0.94 + Math.sin((this.gameTime || 0) * 7) * 0.06;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
        ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
        const width = Math.max(220, ctx.measureText(text).width + 30);
        this.roundRect(ctx, -width / 2, -18, width, 36, 8);
        ctx.fillStyle = "rgba(5, 29, 39, .95)";
        ctx.fill();
        ctx.strokeStyle = "#ffe166";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#fff8ce";
        ctx.textAlign = "center";
        ctx.fillText(text, 0, 5);

        // Arrow pointing down
        ctx.beginPath();
        ctx.moveTo(-7, 18);
        ctx.lineTo(7, 18);
        ctx.lineTo(0, 27);
        ctx.closePath();
        ctx.fillStyle = "#ffe166";
        ctx.fill();
        ctx.restore();
    }

    roundRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    initPhase4() {
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
            { x: 850, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 1.8, waited: false, passed: false },
            { x: 1950, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 2.0, waited: false, passed: false },
            { x: 2850, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 1.8, waited: false, passed: false },
            { x: 3700, y: ROAD_Y - 96, w: 48, h: 96, state: 'RED', timer: 1.6, waited: false, passed: false }
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

    initPhase5() {
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

        // 4 Trucks Fleet System (4 trucks x 7.5t = 30.0t total in carreta)
        this.currentTruckIndex = 1;
        this.totalTrucks = 4;
        this.truckCapacity = 7.5; // tons per truck
        this.truckDumped = 0; // 0 to 7.5t for current truck
        this.roundDumpTarget = 0;
        this.roundDumped = 0;
        this.trailerLoad = 0; // 0 to 30.0t total in carreta
        this.totalTrailerCapacity = 30; // 30 tons

        // Phase 3 State Machine:
        // 'DOCKING' -> 'ALIGNED' -> 'TIMING_GAME' -> 'DUMPING' -> 'TRUCK_EXIT' -> 'TRUCK_ENTER' -> ... -> 'COMPACTING' -> 'COMPLETE'
        this.phase3State = 'DOCKING';
        this.dockTargetX = 345;
        this.dockDistance = 9.5; // meters
        this.dockAlignedTimer = 0;
        this.dockBeepTimer = 0;
        this.alignedTimer = 0;
        this.exitTimer = 0;

        // Timing Minigame ("jogos de flecha / mira hidráulica")
        this.timingNeedlePos = 15;
        this.timingNeedleDir = 1;
        this.timingResult = null;
        this.timingResultTimer = 0;
        this.dumpSpeedMultiplier = 1.0;

        // Dumping & Hydraulic System
        this.dumpAngle = 0; // 0 to 40 degrees
        this.dumpProgress = 0; // 0 to 100%
        this.dumpParticleTimer = 0;
        this.hydraulicSoundTimer = 0;
        this.tarpCoverProgress = 0; // 0 to 100%
        this.phase3CompleteTimer = 0;
        this.phase3TrashParticles = [];

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

    phase5RoadYAt(x) {
        const hill1 = -54 * Math.exp(-Math.pow((x - 1420) / 570, 2));
        const dip = 25 * Math.exp(-Math.pow((x - 2260) / 430, 2));
        const hill2 = -70 * Math.exp(-Math.pow((x - 3100) / 650, 2));
        const finalRise = -24 * Math.exp(-Math.pow((x - 6040) / 500, 2));
        const naturalRoad = 578 + hill1 + dip + hill2 + finalRise;
        const rampStart = this.phase5ScaleX - 220;
        const platformY = 526;
        const platformEnd = this.phase5ScaleX + this.phase5ScaleW;
        const rampEnd = platformEnd + 240;

        if (x < rampStart) return naturalRoad;
        if (x < this.phase5ScaleX) {
            const progress = Math.max(0, Math.min(1, (x - rampStart) / (this.phase5ScaleX - rampStart)));
            const eased = progress * progress * (3 - 2 * progress);
            return 568 + (platformY - 568) * eased;
        }
        if (x <= platformEnd) return platformY;
        if (x < rampEnd) {
            const progress = Math.max(0, Math.min(1, (x - platformEnd) / (rampEnd - platformEnd)));
            const eased = progress * progress * (3 - 2 * progress);
            return platformY + (578 - platformY) * eased;
        }
        return naturalRoad;
    }

    phase5TruckSlope() {
        const t = this.phase5Truck;
        if (!t) return 0;
        const rear = this.phase5RoadYAt(t.x + 80);
        const front = this.phase5RoadYAt(t.x + t.w - 65);
        return Math.atan2(front - rear, t.w - 145);
    }

    initPhase6() {
        this.levelWidth = 7100;
        this.phase5WorldW = 7100;
        this.phase5ScaleX = 4200;
        this.phase5ScaleW = 790;
        this.phase5GateX = 5240;
        this.phase5DestinationX = 6300;

        this.phase5Time = 0;
        this.phase5CameraX = 0;
        this.camera.x = 0;
        this.camera.y = 0;
        this.phase5Mode = "DRIVE";
        this.phase5Message = "Leve a carreta de 30 toneladas em segurança até o aterro!";
        this.phase5MessageTimer = 5;
        this.phase5Truck = { x: 155, w: 560, speed: 0, wheel: 0, sway: 0 };
        this.phase5Stability = 100;
        this.phase5Distance = 0;
        this.phase5ScaleState = "WAIT";
        this.phase5ScaleTimer = 0;
        this.phase5AutoBrake = false;
        this.phase5DepartureLocked = false;
        this.phase5GateOpen = 0;
        this.phase5FinishedAt = 0;
        this.phase5Dust = [];
        this.phase5Sparkles = [];
        this.phase5EnginePulse = 0;

        // Player object state for compatibility with global trackers
        this.player.x = 155;
        this.player.y = this.phase5RoadYAt(155) - 80;
        this.player.w = 560;
        this.player.h = 197;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.facing = 1;
        this.player.isDead = false;

        this.cargoStability = 100;
        this.cargoWeight = 30000;
        this.speedKmh = 0;

        this.timeLeft = 300;
        this.timerAccumulator = 0;
    }

    initPhase7() {
        this.levelWidth = 5200;
        this.levelHeight = 540;
        this.camera = { x: 0, y: 0 };
        const FLOOR = 448;
        this.phase5Floor = FLOOR;

        // Player starts on foot at the entrance of the Sanitary Landfill
        this.player.w = 48;
        this.player.h = 76;
        this.player.x = 170;
        this.player.y = FLOOR - this.player.h;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.facing = 1;
        this.player.grounded = true;
        this.player.animState = 'idle';
        this.player.animFrame = 0;
        this.player.animTimer = 0;
        this.player.isDead = false;
        this.player.invulnerableTimer = 0;

        // Phase 5 State Machine & Modes matching teste gpt:
        // Modes: 'PLAYER', 'TRACTOR', 'PANEL', 'ANALYSIS', 'WIN'
        // Stages: 'APPROACH' -> 'COMPACT' -> 'GET_SOIL' -> 'COVER' -> 'PARK' -> 'TO_BIOGAS' -> 'BIOGAS' -> 'TO_LAGOONS' -> 'TO_LAB' -> 'ANALYSIS' -> 'COMPLETE'
        this.phase5Mode = 'PLAYER';
        this.phase5Stage = 'APPROACH';
        this.phase5State = 'APPROACH';

        // Tractor ready at x = 480
        this.phase5Tractor = {
            x: 480,
            y: FLOOR - 117,
            w: 220,
            h: 117,
            facing: 1,
            vx: 0
        };

        // 4 distinct waste mounds in Sector 1 (x: 600 to 1500)
        this.phase5Zones = [
            { id: 'A', x: 690, w: 175, comp: 0, cover: 0 },
            { id: 'B', x: 895, w: 175, comp: 0, cover: 0 },
            { id: 'C', x: 1100, w: 175, comp: 0, cover: 0 },
            { id: 'D', x: 1305, w: 175, comp: 0, cover: 0 }
        ];
        this.phase5SoilLoaded = false;

        // Sector 2: Biogas Plant (x: 1650 to 3000)
        this.phase5Pressure = 27; // Ideal range: 40 to 70 kPa
        this.phase5StableTime = 0; // Needs 6.0 seconds in optimal range
        this.phase5PowerComplete = false;
        this.phase5TurbineAngle = 0;

        // Sector 3: Lagoons & Aerators (x: 3000 to 5200)
        this.phase5Aerators = [
            { x: 3440, active: false, spin: 0 },
            { x: 3850, active: false, spin: 0 },
            { x: 4260, active: false, spin: 0 }
        ];

        // ETE Lab Analysis
        this.phase5AnalysisTime = 0;
        this.phase5AnalysisDone = false;
        this.phase5CompletedAt = 0;

        // Educational messages & prompts
        this.phase5Message = "Agora vamos cuidar do que chegou ao aterro!";
        this.phase5MessageTimer = 5.0;
        this.phase5TipPulse = 0;
        this.phase5Particles = [];

        this.timeLeft = 360; // 6 minutes
        this.timerAccumulator = 0;
    }

    initPhase8() {
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
            // Start fully inside camera view
            x: 700,
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
            wheel: 0,
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
            window.soundManager.startMusic(this.currentPhase === 8 ? 'boss' : 'stage');
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

        // Direct phase links set state to PLAYING before images finish loading.
        // Hold the simulation until onAllAssetsLoaded() has populated the map;
        // otherwise the default player falls through an empty platform list.
        if (!this.assetsReady) {
            this.actionJustPressed = false;
            return;
        }

        if (this.state === 'PLAYING') {
            this.updateTimer(dt);
            if (this.player && this.player.invulnerableTimer > 0) {
                this.player.invulnerableTimer = Math.max(0, this.player.invulnerableTimer - dt);
            }
            if (this.currentPhase === 1) {
                this.updateCasaViva(dt);
            } else if (this.currentPhase === 2) {
                this.updatePlayer(dt);
                this.updatePhase1Weather(dt);
                this.updateBlocks(dt);
                this.updateItems(dt);
                this.checkSignposts();
                this.checkGoal();
            } else if (this.currentPhase === 3) {
                this.updatePhase2(dt);
            } else if (this.currentPhase === 4) {
                this.updateTruckPlayer(dt);
                this.updateHazards(dt);
                this.updateTrafficLights(dt);
                this.updateItems(dt);
                this.checkSignposts();
                this.checkGoal();
            } else if (this.currentPhase === 5) {
                this.updatePhase4(dt);
            } else if (this.currentPhase === 6) {
                this.updatePhase5(dt);
            } else if (this.currentPhase === 7) {
                this.updatePhase6(dt);
            } else if (this.currentPhase === 8) {
                this.updatePhase7(dt);
            }
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
        } else if (this.state === 'LEVEL_CLEAR') {
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
            if (this.currentPhase === 2) {
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
        } else if (this.state === 'CREDITS') {
            this.updateCredits(dt);
        }

        if (this.state === 'CUTSCENE' || this.state === 'CREDITS' || this.currentPhase === 1 || this.currentPhase === 5) {
            this.camera.x = 0;
            this.camera.y = 0;
        } else {
            this.updateCamera();
        }
        if (this.tipTimer > 0) this.tipTimer -= dt;
        this.actionJustPressed = false;
    }

    updatePhase4(dt) {
        const p = this.player;
        const targetX = this.dockTargetX;
        const params = this.getTimingParams();

        if (this.phase3State === 'TRUCK_ENTER') {
            p.vx = 220;
            p.x += p.vx * dt;
            if (p.x >= 60) {
                p.x = 60;
                p.vx = 0;
                this.phase3State = 'DOCKING';
                this.dockAlignedTimer = 0;
                this.showTip(`Caminhão #${this.currentTruckIndex}/4 na plataforma! Dê ré até a calha de descarga!`, 3.0);
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
                this.showTip('🟢 DOCA CONECTADA! Aperte [ESPAÇO] para travar as rodas!', 1.0);
                if (this.keys.jump || Math.abs(p.vx) < 10) {
                    this.dockAlignedTimer += dt;
                    if (this.keys.jump || this.dockAlignedTimer >= 0.8) {
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
                    this.showTip('Reduza a velocidade! Quase na doca...', 0.5);
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
                this.showTip('🎯 MIRA HIDRÁULICA: Aperte [ESPAÇO] quando a flecha estiver no VERDE!', 4.0);
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
                        this.roundDumpTarget = remainingInTruck;
                        this.addFloatingText(480, 95, `🎯 PERFEITO! FORÇA MÁXIMA (+${this.roundDumpTarget.toFixed(1)}t)! +500 PTS`, '#4ade80');
                        this.spawnSparkles(480, 130, 35);
                        if (window.soundManager && window.soundManager.playTimingHitPerfect) {
                            window.soundManager.playTimingHitPerfect();
                        }
                    } else if (distCenter <= params.yellow) {
                        // 🟡 AMARELO: DESPEJO MÉDIO (+2.5t)
                        this.timingResult = 'GOOD';
                        this.dumpSpeedMultiplier = 1.4;
                        this.score += 200;
                        this.roundDumpTarget = Math.min(2.5, remainingInTruck);
                        this.addFloatingText(480, 95, `👍 BOM! PRESSÃO MÉDIA (+${this.roundDumpTarget.toFixed(1)}t)! +200 PTS`, '#facc15');
                        if (window.soundManager && window.soundManager.playTimingHitGood) {
                            window.soundManager.playTimingHitGood();
                        }
                    } else {
                        // 🔴 VERMELHO: BAIXA PRESSÃO (0t)
                        this.timingResult = 'MISS';
                        this.dumpSpeedMultiplier = 0.5;
                        this.score += 10;
                        this.roundDumpTarget = 0;
                        this.addFloatingText(480, 95, '⚠️ BAIXA PRESSÃO! NADA DESPEJADO', '#ef4444');
                        if (window.soundManager && window.soundManager.playTimingHitMiss) {
                            window.soundManager.playTimingHitMiss();
                        }
                    }
                    this.timingResultTimer = 0;
                }
            } else {
                this.timingResultTimer += dt;
                if (this.timingResultTimer >= 0.65) {
                    if (this.timingResult === 'MISS') {
                        // VERMELHO: Tenta novamente a mira!
                        this.timingResult = null;
                        this.timingResultTimer = 0;
                        this.timingNeedlePos = 15;
                        this.timingNeedleDir = 1;
                        const remain = (this.truckCapacity - this.truckDumped).toFixed(1);
                        this.showTip(`Pressão insuficiente! Tente no VERDE ou AMARELO! Faltam ${remain}t no caminhão`, 3.0);
                    } else {
                        // AMARELO ou VERDE: Despeja!
                        this.phase3State = 'DUMPING';
                        this.roundDumped = 0;
                        this.dumpAngle = 0;
                        const actionDesc = this.timingResult === 'PERFECT' ? 'Despejo Total' : `Despejo Médio (+${this.roundDumpTarget.toFixed(1)}t)`;
                        this.showTip(`Basculando Caçamba #${this.currentTruckIndex}: ${actionDesc}...`, 2.5);
                    }
                }
            }
        } else if (this.phase3State === 'DUMPING') {
            p.vx = 0;

            if (this.roundDumpTarget - this.roundDumped > 0.05) {
                // Hydraulic lift: dump bed rotates up to 40°
                if (this.dumpAngle < 40) {
                    this.dumpAngle = Math.min(40, this.dumpAngle + (26 * this.dumpSpeedMultiplier) * dt);
                }

                // Hydraulic sound
                this.hydraulicSoundTimer += dt;
                if (this.hydraulicSoundTimer >= 0.12) {
                    this.hydraulicSoundTimer = 0;
                    if (window.soundManager && window.soundManager.playHydraulic) {
                        window.soundManager.playHydraulic();
                    }
                }

                // Pour rate
                const dumpRate = (3.8 * this.dumpSpeedMultiplier) * dt;
                const toDump = Math.min(dumpRate, this.roundDumpTarget - this.roundDumped);
                this.roundDumped += toDump;
                this.truckDumped = Math.min(this.truckCapacity, this.truckDumped + toDump);
                this.trailerLoad = Math.min(this.totalTrailerCapacity, this.trailerLoad + toDump);
                this.dumpProgress = Math.min(100, Math.floor((this.trailerLoad / this.totalTrailerCapacity) * 100));
                this.score += Math.floor(toDump * 45);

                // Spawn trash pouring OUT OF THE COLLECTOR TRUCK into the chute
                if (this.dumpAngle >= 8) {
                    this.dumpParticleTimer += dt;
                    if (this.dumpParticleTimer >= 0.032) {
                        this.dumpParticleTimer = 0;
                        const spawnX = p.x + 94 + (Math.random() * 12 - 6);
                        const spawnY = p.y + 24 - (this.dumpAngle * 0.38) + (Math.random() * 8 - 4);
                        this.spawnDumpTrashBag(spawnX, spawnY);
                        if (Math.random() < 0.65) {
                            this.spawnDumpTrashBag(spawnX - 6, spawnY + 4);
                        }
                        if (window.soundManager && window.soundManager.playDumpRumble && Math.random() < 0.35) {
                            window.soundManager.playDumpRumble();
                        }
                    }
                }

                const remain = Math.max(0, this.truckCapacity - this.truckDumped).toFixed(1);
                this.showTip(`Caminhão #${this.currentTruckIndex}: ${this.truckDumped.toFixed(1)} / ${this.truckCapacity}t (Faltam ${remain}t) | Carreta: ${this.trailerLoad.toFixed(1)}/30t`, 0.4);
            } else {
                // Round dump target reached! Lower bed back down
                this.roundDumped = this.roundDumpTarget;
                this.dumpAngle = Math.max(0, this.dumpAngle - 48 * dt);
                this.showTip(`Caçamba #${this.currentTruckIndex} recolhendo pistão...`, 0.4);

                if (this.dumpAngle <= 0.5) {
                    this.dumpAngle = 0;

                    // Check if current truck is empty (dumped all 7.5t)
                    if (this.truckDumped >= this.truckCapacity - 0.05) {
                        this.truckDumped = this.truckCapacity;

                        if (this.currentTruckIndex >= this.totalTrucks || this.trailerLoad >= this.totalTrailerCapacity - 0.05) {
                            // All 4 trucks completed! Carreta is 100% full (30t)!
                            this.trailerLoad = this.totalTrailerCapacity;
                            this.dumpProgress = 100;
                            this.phase3State = 'COMPACTING';
                            this.phase3CompleteTimer = 0;
                            this.tarpCoverProgress = 0;
                            this.supervisor.cheer = true;
                            this.addFloatingText(650, 240, 'CARRETA 30t 100% CHEIA!', '#00ff88');
                            this.spawnSparkles(650, 320, 50);
                            if (window.soundManager && window.soundManager.playHorn) {
                                window.soundManager.playHorn();
                            }
                        } else {
                            // Truck 1, 2, or 3 finished! Proceed to TRUCK_EXIT
                            this.phase3State = 'TRUCK_EXIT';
                            this.exitTimer = 0;
                            this.addFloatingText(p.x + 60, p.y - 20, `CAMINHÃO #${this.currentTruckIndex} DESCARREGADO!`, '#38bdf8');
                            this.spawnSparkles(p.x + 60, p.y + 20, 25);
                            if (window.soundManager && window.soundManager.playHorn) {
                                window.soundManager.playHorn();
                            }
                        }
                    } else {
                        // Truck still has remaining waste (e.g. after good/yellow hit). Player tries timing again!
                        this.phase3State = 'TIMING_GAME';
                        this.timingResult = null;
                        this.timingResultTimer = 0;
                        this.timingNeedlePos = 20;
                        this.timingNeedleDir = 1;
                        const remain = (this.truckCapacity - this.truckDumped).toFixed(1);
                        this.addFloatingText(480, 95, `👍 RESTAM ${remain}t! TENTE A MIRA NOVAMENTE!`, '#facc15');
                        this.showTip(`Caminhão #${this.currentTruckIndex}: Restam ${remain}t no baú! Tente acertar no VERDE!`, 3.5);
                    }
                }
            }
        } else if (this.phase3State === 'TRUCK_EXIT') {
            // Truck drives off to the left
            const exitSpeed = (this.keys.left || this.keys.a) ? 340 : 250;
            p.vx = -exitSpeed;
            p.x += p.vx * dt;

            // Exhaust smoke puffs as it leaves
            if (Math.random() < 0.25) {
                this.spawnSmoke(p.x + 10, p.y + p.h - 15);
            }

            if (p.x < -140) {
                // Next truck enters!
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
                    this.phase3State = 'COMPACTING';
                    this.phase3CompleteTimer = 0;
                    this.tarpCoverProgress = 0;
                }
            }
        } else if (this.phase3State === 'COMPACTING') {
            p.vx = 0;
            // Roll green vinyl security tarp over the trailer
            this.tarpCoverProgress = Math.min(100, this.tarpCoverProgress + 55 * dt);

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

        // Update dedicated Phase 3 cascading trash bags and recyclables
        if (this.phase3TrashParticles) {
            for (let i = this.phase3TrashParticles.length - 1; i >= 0; i--) {
                const tp = this.phase3TrashParticles[i];
                if (!tp.settled) {
                    if (tp.stage === 'chute') {
                        // Sliding down the metal chute ramp (x: 440 to 550)
                        tp.vy += 450 * dt;
                        tp.x += tp.vx * dt;
                        tp.y += tp.vy * dt;
                        tp.rot += tp.vRot * dt;

                        // Chute ramp line: from (445, 275) to (550, 338) -> slope ~0.60
                        if (tp.x >= 445 && tp.x < 550) {
                            const chuteY = 275 + (tp.x - 445) * 0.60;
                            if (tp.y >= chuteY - 8) {
                                tp.y = chuteY - 8;
                                tp.vx = Math.min(260, tp.vx + 260 * dt); // slick acceleration down chute
                                tp.vy = tp.vx * 0.60;
                            }
                        } else if (tp.x >= 550) {
                            // Leaves the chute mouth! Launches into the open carreta container
                            tp.stage = 'air';
                            tp.vx = 160 + Math.random() * 130;
                            tp.vy = -20 + Math.random() * 35;
                            tp.gravity = 420;
                        }
                    } else {
                        // Air flight inside trailer container
                        tp.vy += tp.gravity * dt;
                        tp.x += tp.vx * dt;
                        tp.y += tp.vy * dt;
                        tp.rot += tp.vRot * dt;

                        // Hard clamp inside trailer horizontal cargo bed bounds (x: 535..790)
                        if (tp.x < 535) {
                            tp.x = 535;
                            tp.vx = Math.abs(tp.vx) * 0.35;
                        }
                        if (tp.x > 790) {
                            tp.x = 790;
                            tp.vx = -Math.abs(tp.vx) * 0.35;
                        }

                        // Settle onto the trash heap inside the trailer
                        if (tp.y >= tp.targetY) {
                            tp.y = tp.targetY;
                            tp.vx *= 0.35;
                            tp.vy = -tp.vy * 0.22;
                            tp.vRot *= 0.4;
                            if (Math.abs(tp.vy) < 18) {
                                tp.settled = true;
                                tp.vy = 0;
                                tp.vx = 0;
                                tp.vRot = 0;
                            }
                        }

                        // Floor safety limit: NEVER allow particles below container floor y = 416 (stripe at 426, wheels at 436)
                        if (tp.y > 416) {
                            tp.y = 416;
                            tp.settled = true;
                            tp.vy = 0;
                            tp.vx = 0;
                            tp.vRot = 0;
                        }
                    }
                }
                tp.life -= dt;
                if (tp.life <= 0) {
                    this.phase3TrashParticles.splice(i, 1);
                }
            }
        }
    }

    spawnDumpTrashBag(x, y) {
        if (!this.phase3TrashParticles) this.phase3TrashParticles = [];
        const rand = Math.random();
        let itemType = 'bag';
        if (rand > 0.60 && rand <= 0.78) itemType = 'can';
        else if (rand > 0.78 && rand <= 0.90) itemType = 'bottle';
        else if (rand > 0.90) itemType = 'box';

        // Heap height rises inside the trailer hopper as it fills with 30 tons
        const loadFrac = Math.min(1, (this.trailerLoad || 0) / (this.totalTrailerCapacity || 30));
        // Container bed floor is y = 416, top rim is y = 346
        const heapTop = 416 - Math.floor(loadFrac * 68);
        const targetY = Math.max(348, Math.min(416, heapTop + (Math.random() * 8 - 4)));

        const p = {
            x: x,
            y: y,
            vx: 95 + Math.random() * 55, // slides out backward from the truck onto the chute
            vy: 45 + Math.random() * 35,
            stage: 'chute', // first slides down the chute ramp, then launches into carreta
            gravity: 420,
            type: itemType,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 8,
            w: itemType === 'bag' ? 22 : itemType === 'can' ? 12 : itemType === 'bottle' ? 10 : 16,
            h: itemType === 'bag' ? 26 : itemType === 'can' ? 15 : itemType === 'bottle' ? 20 : 16,
            life: 2.8,
            maxLife: 2.8,
            settled: false,
            targetY: targetY
        };
        this.phase3TrashParticles.push(p);
    }

    spawnDumpTrashParticle(x, y) {
        this.spawnDumpTrashBag(x, y);
    }

    updatePhase5(dt) {
        this.phase5Time = (this.phase5Time || 0) + dt;
        if (this.phase5MessageTimer > 0) this.phase5MessageTimer -= dt;

        if (this.phase5Mode === "WIN") {
            this.updatePhase5Particles(dt);
            return;
        }

        if (this.phase5ScaleState === "WEIGHING") {
            if (this.phase5Truck) this.phase5Truck.speed = 0;
            this.phase5ScaleTimer += dt;
            if (this.phase5ScaleTimer >= 2.6) {
                this.phase5ScaleState = "DONE";
                this.phase5AutoBrake = true;
                this.phase5DepartureLocked = true;
                this.score += 1000;
                this.setPhase5Message("30.000 kg aprovado! Pode ir ao aterro descarregar. Solte e aperte a seta para seguir.", 6);
                this.burstRouteSparkles(this.phase5ScaleX + this.phase5ScaleW / 2, 470, "#65ee93", 42);
                [520, 680, 840].forEach((f, i) => setTimeout(() => this.playPhase5Tone(f, 0.12, "triangle", 0.035), i * 100));
                if (window.soundManager && window.soundManager.playHorn) window.soundManager.playHorn();
            }
        } else {
            this.updatePhase5Truck(dt);
        }

        const gateTarget = this.phase5ScaleState === "DONE" ? 1 : 0;
        this.phase5GateOpen = (this.phase5GateOpen || 0) + (gateTarget - (this.phase5GateOpen || 0)) * (1 - Math.pow(0.0005, dt));
        this.updatePhase5Particles(dt);

        if (this.phase5Truck) {
            const focusX = this.phase5Truck.x + this.phase5Truck.w * 0.63;
            const targetCamera = Math.max(0, Math.min(this.phase5WorldW - 1280, focusX - 1280 * 0.43));
            this.phase5CameraX = (this.phase5CameraX || 0) + (targetCamera - (this.phase5CameraX || 0)) * (1 - Math.pow(0.0005, dt));
            this.camera.x = this.phase5CameraX * 0.75;
            this.camera.y = 0;
            this.player.x = this.phase5Truck.x;
            this.player.y = this.phase5RoadYAt(this.phase5Truck.x + this.phase5Truck.w / 2);

            this.phase5Distance = Math.max(0, Math.min(1, (this.phase5Truck.x - 155) / (this.phase5DestinationX - 155)));
            this.cargoStability = Math.round(this.phase5Stability || 100);
            this.cargoWeight = 30000;
            this.speedKmh = Math.round(Math.abs(this.phase5Truck.speed) * 0.34);
        }
    }

    updatePhase5Truck(dt) {
        const t = this.phase5Truck;
        if (!t) return;
        const throttle = !!this.keys.right;
        const reverse = !!(this.keys.left || this.keys.down);
        const action = !!(this.keys.jumpHeld || this.keys.action || this.keys.up);
        const slope = this.phase5TruckSlope();
        const scaleTargetX = this.phase5ScaleX + (this.phase5ScaleW - t.w) / 2;

        if (this.phase5ScaleState === "WAIT" && t.x >= this.phase5ScaleX - 340) {
            this.phase5ScaleState = "DOCKING";
            this.phase5AutoBrake = true;
            this.setPhase5Message("Controle automático ativado: subindo a rampa, alinhando e freando a carreta.", 5);
            this.playPhase5Tone(410, 0.12, "square", 0.025);
        }

        const autoScaleApproach = this.phase5ScaleState === "DOCKING";
        if (this.phase5ScaleState === "DONE" && this.phase5DepartureLocked) {
            t.speed = 0;
            this.phase5AutoBrake = true;
            if (!throttle) {
                this.phase5DepartureLocked = false;
                this.phase5AutoBrake = false;
                this.setPhase5Message("Pode ir ao aterro descarregar. Aperte D ou a seta direita para seguir.", 5);
            }
        }

        const departureLocked = this.phase5ScaleState === "DONE" && this.phase5DepartureLocked;
        const nearDestination = t.x > this.phase5DestinationX - 300 && this.phase5ScaleState === "DONE";
        const actionBrake = action && nearDestination;
        const traction = action && !actionBrake && !autoScaleApproach && !departureLocked;

        if (departureLocked) {
            t.speed = 0;
        } else if (autoScaleApproach) {
            const distanceToTarget = Math.max(0, scaleTargetX - t.x);
            const targetSpeed = distanceToTarget > 2 ? Math.max(16, Math.min(72, distanceToTarget * 0.48)) : 0;
            if (t.speed > targetSpeed) t.speed = Math.max(targetSpeed, t.speed - 460 * dt);
            else if (t.speed < targetSpeed) t.speed = Math.min(targetSpeed, t.speed + 82 * dt);
        } else if (actionBrake) {
            const braking = 560 * dt;
            if (t.speed > 0) t.speed = Math.max(0, t.speed - braking);
            else if (t.speed < 0) t.speed = Math.min(0, t.speed + braking);
        } else if (throttle && !reverse) {
            const boost = traction ? 62 : 0;
            t.speed = Math.min(265, t.speed + (132 + boost) * dt);
        } else if (reverse && !throttle) {
            if (t.speed > 0) t.speed = Math.max(0, t.speed - 250 * dt);
            else t.speed = Math.max(-82, t.speed - 82 * dt);
        } else {
            t.speed *= Math.pow(0.32, dt);
            if (Math.abs(t.speed) < 0.8) t.speed = 0;
        }

        if (t.speed > 0 && !autoScaleApproach && !departureLocked) t.speed -= Math.sin(slope) * 175 * dt;
        if (nearDestination && t.speed > 80) t.speed = Math.max(80, t.speed - 250 * dt);

        const risky = Math.max(0, Math.abs(t.speed) - 190) / 75 + Math.max(0, Math.abs(slope) - 0.07) * Math.abs(t.speed) / 45;
        if (risky > 0 && !traction) this.phase5Stability = (this.phase5Stability || 100) - risky * 9 * dt;
        else this.phase5Stability = (this.phase5Stability || 100) + (traction ? 8 : 3.5) * dt;
        this.phase5Stability = Math.max(35, Math.min(100, this.phase5Stability));

        if (this.phase5Stability < 55 && this.phase5MessageTimer <= 0) {
            this.setPhase5Message("Reduza a velocidade ou segure ESPAÇO para estabilizar a tração 6x4.", 3.4);
        }

        const previousX = t.x;
        t.x += t.speed * dt;
        const gateLimit = this.phase5GateX - t.w - 28;
        if (this.phase5ScaleState !== "DONE" && t.x > gateLimit) {
            t.x = gateLimit;
            t.speed = 0;
            if (this.phase5MessageTimer <= 0) this.setPhase5Message("A cancela está fechada. Volte e pare a carreta inteira sobre a balança.", 4);
        }
        t.x = Math.max(80, Math.min(this.phase5WorldW - t.w - 60, t.x));

        if (this.phase5ScaleState === "DOCKING" && t.x >= scaleTargetX - 4) {
            t.x = scaleTargetX;
            t.speed = 0;
            this.phase5AutoBrake = true;
            this.phase5ScaleState = "WEIGHING";
            this.phase5ScaleTimer = 0;
            this.score += 300;
            this.setPhase5Message("Carreta alinhada e parada automaticamente. Balança ANTT verificando a carga...", 3.4);
            this.playPhase5Tone(330, 0.14, "square", 0.03);
        }

        const travelled = t.x - previousX;
        t.wheel += travelled * 0.055;
        const targetSway = Math.max(-0.025, Math.min(0.025, Math.sin(this.phase5Time * 3.2) * risky * 0.012));
        t.sway += (targetSway - t.sway) * (1 - Math.pow(0.03, dt));
        this.phase5EnginePulse = (this.phase5EnginePulse || 0) + Math.abs(t.speed) * dt;

        // Victory / Phase Complete Condition:
        if (nearDestination && Math.abs(t.speed) < 7 && action && t.x >= this.phase5DestinationX - 80) {
            this.phase5Mode = "WIN";
            this.phase5FinishedAt = this.phase5Time;
            this.score += 1800 + Math.round(this.phase5Stability * 10);
            this.burstRouteSparkles(t.x + t.w * 0.72, 430, "#ffe066", 70);
            this.playPhase5Fanfare();
            this.setPhase5Message("Chegamos ao Aterro Sanitário! Carga de 30 toneladas entregue com sucesso!", 5);
            setTimeout(() => {
                this.levelClear();
            }, 1200);
        }

        if (Math.abs(t.speed) > 48 && Math.random() < dt * 8) {
            const groundY = this.phase5RoadYAt(t.x + 55);
            if (!this.phase5Dust) this.phase5Dust = [];
            this.phase5Dust.push({
                x: t.x + 45,
                y: groundY - 5,
                vx: -25 - Math.random() * 45,
                vy: -15 - Math.random() * 22,
                life: 0.75,
                maxLife: 0.75,
                size: 4 + Math.random() * 7
            });
        }
    }

    burstRouteSparkles(x, y, color, amount) {
        if (!this.phase5Sparkles) this.phase5Sparkles = [];
        for (let index = 0; index < amount; index += 1) {
            this.phase5Sparkles.push({
                x, y,
                vx: (Math.random() - 0.5) * 220,
                vy: -45 - Math.random() * 190,
                life: 0.8 + Math.random() * 0.7,
                maxLife: 1.5,
                size: 3 + Math.random() * 6,
                color
            });
        }
    }

    updatePhase5Particles(dt) {
        if (this.phase5Dust) {
            for (let index = this.phase5Dust.length - 1; index >= 0; index -= 1) {
                const d = this.phase5Dust[index];
                d.x += d.vx * dt;
                d.y += d.vy * dt;
                d.life -= dt;
                d.size += 7 * dt;
                if (d.life <= 0) this.phase5Dust.splice(index, 1);
            }
        }
        if (this.phase5Sparkles) {
            for (let index = this.phase5Sparkles.length - 1; index >= 0; index -= 1) {
                const p = this.phase5Sparkles[index];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 330 * dt;
                p.life -= dt;
                if (p.life <= 0) this.phase5Sparkles.splice(index, 1);
            }
        }
    }

    playPhase5Fanfare() {
        [392, 523, 659, 784].forEach((frequency, index) => {
            setTimeout(() => this.playPhase5Tone(frequency, 0.2, "triangle", 0.04), index * 120);
        });
    }

    getPhase5RouteMissionText() {
        if (this.phase5ScaleState === "DOCKING") return "Controle automático: a carreta está subindo, alinhando e freando sozinha.";
        if (this.phase5ScaleState === "WEIGHING") return "A carreta foi imobilizada. Aguarde a balança conferir os 30.000 kg.";
        if (this.phase5ScaleState === "WAIT" && this.phase5Truck && this.phase5Truck.x > 3600) return "Suba a rampa: a balança assumirá o controle e parará a carreta.";
        if (this.phase5ScaleState === "DONE" && this.phase5DepartureLocked) return "Peso aprovado! Solte e aperte a seta para ir descarregar no aterro.";
        if (this.phase5ScaleState === "DONE") return "Pode ir ao aterro descarregar. Atravesse a cancela usando a seta direita.";
        return "Dirija pelas dunas. Nas subidas, segure ESPAÇO para ativar a tração 6x4.";
    }

    setPhase5Message(text, seconds = 3.5) {
        this.phase5Message = text;
        this.phase5MessageTimer = seconds;
        this.tipText = text;
        this.tipTimer = seconds;
    }

    countPhase5Complete(key) {
        return (this.phase5Zones || []).filter(zone => zone[key] >= 100).length;
    }

    getPhase5StageInfo() {
        const compacted = this.countPhase5Complete('comp');
        const covered = this.countPhase5Complete('cover');
        const aerators = (this.phase5Aerators || []).filter(a => a.active).length;
        const info = {
            APPROACH: [1, "RESÍDUOS", "Vá até o trator e pressione ESPAÇO ou E.", "TRATOR AGUARDANDO"],
            COMPACT: [1, "RESÍDUOS", "Passe com o trator sobre cada monte de resíduos.", `TRECHOS COMPACTADOS: ${compacted}/4`],
            GET_SOIL: [1, "RESÍDUOS", "Vá até a jazida à esquerda e carregue a terra.", "TERRA PARA COBERTURA"],
            COVER: [1, "RESÍDUOS", "Passe novamente para aplicar a cobertura de terra.", `TRECHOS COBERTOS: ${covered}/4`],
            PARK: [1, "RESÍDUOS", "Estacione no local marcado e pressione ESPAÇO ou E.", "ESTACIONAR E DESCER"],
            TO_BIOGAS: [2, "BIOGÁS", "Caminhe até o painel da usina e pressione ESPAÇO ou E.", "PAINEL DA USINA"],
            BIOGAS: [2, "BIOGÁS", "Mantenha a pressão na faixa IDEAL (40–70 kPa).", `ESTABILIDADE: ${Math.round((this.phase5StableTime || 0) / 6 * 100)}%`],
            TO_LAGOONS: [3, "TRATAMENTO", "Vá pelas passarelas e ligue os três aeradores.", `AERADORES LIGADOS: ${aerators}/3`],
            TO_LAB: [3, "TRATAMENTO", "Entre no laboratório para acompanhar a análise.", "LABORATÓRIO ETE"],
            ANALYSIS: [3, "TRATAMENTO", "Acompanhando a análise da amostra...", `ANÁLISE: ${Math.round((this.phase5AnalysisTime || 0) / 2.8 * 100)}%`],
            COMPLETE: [3, "CONCLUÍDA", "Missão cumprida! O aterro opera com segurança máxima.", "100% CONCLUÍDO"]
        };
        return info[this.phase5Stage] || info.APPROACH;
    }

    isNearPhase5Interactable() {
        const focusX = this.phase5Mode === 'TRACTOR' ? (this.phase5Tractor.x + 110) : (this.player.x + this.player.w / 2);
        if (this.phase5Stage === 'APPROACH' && Math.abs(focusX - 565) <= 135) return true;
        if (this.phase5Stage === 'GET_SOIL' && Math.abs(focusX - 340) <= 140) return true;
        if (this.phase5Stage === 'PARK' && Math.abs(focusX - 1500) <= 150) return true;
        if (this.phase5Stage === 'TO_BIOGAS' && Math.abs(focusX - 2360) <= 130) return true;
        if (this.phase5Stage === 'BIOGAS') return true;
        if (this.phase5Stage === 'TO_LAGOONS' && (this.phase5Aerators || []).some(a => !a.active && Math.abs(focusX - a.x) <= 110)) return true;
        if (this.phase5Stage === 'TO_LAB' && Math.abs(focusX - 4810) <= 135) return true;
        if (this.phase5Stage === 'COMPLETE') return true;
        return false;
    }

    triggerPhase5Action() {
        const focusX = this.phase5Mode === 'TRACTOR' ? (this.phase5Tractor.x + 110) : (this.player.x + this.player.w / 2);

        if (this.phase5Stage === 'APPROACH' && Math.abs(focusX - 565) <= 135) {
            this.phase5Mode = 'TRACTOR';
            this.phase5Stage = 'COMPACT';
            this.phase5State = 'COMPACT';
            this.phase5Tractor.x = 470;
            this.player.vx = 0;
            this.setPhase5Message("Cajulim assumiu o trator. Compacte os quatro trechos!", 4.0);
            this.playPhase5Tone(180, 0.16, 'sawtooth', 0.03);
            if (window.soundManager) window.soundManager.playTractorBlade();
            return;
        }

        if (this.phase5Stage === 'GET_SOIL' && Math.abs(focusX - 340) <= 140) {
            this.phase5SoilLoaded = true;
            this.phase5Stage = 'COVER';
            this.phase5State = 'COVER';
            this.setPhase5Message("Terra carregada! Agora cubra os quatro trechos.", 4.0);
            this.playPhase5SuccessSound();
            if (window.soundManager) window.soundManager.playHydraulic();
            return;
        }

        if (this.phase5Stage === 'PARK' && Math.abs(focusX - 1500) <= 150) {
            this.phase5Mode = 'PLAYER';
            this.phase5Stage = 'TO_BIOGAS';
            this.phase5State = 'TO_BIOGAS';
            this.player.x = 1550;
            this.player.y = this.phase5Floor - this.player.h;
            this.player.vx = 0;
            this.setPhase5Message("Resíduos compactados e cobertos! Siga para a usina.", 4.0);
            this.playPhase5SuccessSound();
            return;
        }

        if (this.phase5Stage === 'TO_BIOGAS' && Math.abs(focusX - 2360) <= 130) {
            this.phase5Mode = 'PANEL';
            this.phase5Stage = 'BIOGAS';
            this.phase5State = 'BIOGAS';
            this.player.vx = 0;
            this.setPhase5Message("Use esquerda e direita para regular a pressão.", 4.0);
            this.playPhase5Tone(420, 0.12, 'square', 0.03);
            return;
        }

        if (this.phase5Stage === 'BIOGAS') {
            if (this.phase5PowerComplete) {
                this.phase5Mode = 'PLAYER';
                this.phase5Stage = 'TO_LAGOONS';
                this.phase5State = 'TO_LAGOONS';
                this.player.x = 2820;
                this.player.y = this.phase5Floor - this.player.h;
                this.setPhase5Message("Usina em funcionamento! Siga para as lagoas.", 4.0);
                this.playPhase5SuccessSound();
            } else {
                this.phase5Mode = 'PLAYER';
                this.phase5Stage = 'TO_BIOGAS';
                this.phase5State = 'TO_BIOGAS';
                this.setPhase5Message("Você saiu do painel. Pressione ESPAÇO ou E para continuar.", 2.5);
            }
            return;
        }

        if (this.phase5Stage === 'TO_LAGOONS') {
            const target = this.phase5Aerators.find(a => !a.active && Math.abs(focusX - a.x) <= 110);
            if (target) {
                target.active = true;
                this.score += 300;
                this.burstPhase5(target.x, this.phase5Floor - 60, '#74dcff', 18);
                const idx = this.phase5Aerators.indexOf(target) + 1;
                this.setPhase5Message(`Aerador ${idx} ligado!`, 2.5);
                this.playPhase5Tone(330 + idx * 80, 0.18, 'triangle', 0.04);
                if (window.soundManager) window.soundManager.playAeratorSplash();
                if (this.phase5Aerators.every(a => a.active)) {
                    this.phase5Stage = 'TO_LAB';
                    this.phase5State = 'TO_LAB';
                    this.setPhase5Message("Os três aeradores estão ligados. Vá ao laboratório!", 4.0);
                    this.playPhase5SuccessSound();
                }
                return;
            }
        }

        if (this.phase5Stage === 'TO_LAB' && Math.abs(focusX - 4810) <= 135) {
            this.phase5Mode = 'ANALYSIS';
            this.phase5Stage = 'ANALYSIS';
            this.phase5State = 'ANALYSIS';
            this.player.vx = 0;
            this.phase5AnalysisTime = 0;
            this.setPhase5Message("Cajulim está acompanhando a análise da amostra.", 3.0);
            this.playPhase5Tone(660, 0.1, 'sine', 0.035);
            if (window.soundManager) window.soundManager.playLabBeep();
            return;
        }

        if (this.phase5Stage === 'COMPLETE') {
            this.levelClear();
        }
    }

    burstPhase5(x, y, color, amount = 12) {
        if (!this.phase5Particles) this.phase5Particles = [];
        for (let i = 0; i < amount; i++) {
            this.phase5Particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 180,
                vy: -40 - Math.random() * 160,
                life: 0.7 + Math.random() * 0.6,
                maxLife: 1.3,
                size: 3 + Math.random() * 6,
                color
            });
        }
    }

    playPhase5Tone(frequency = 440, duration = 0.1, type = "square", volume = 0.035) {
        if (window.soundManager && window.soundManager.muted) return;
        try {
            const ctx = (window.soundManager && window.soundManager.ctx) ? window.soundManager.ctx : new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (_) {}
    }

    playPhase5SuccessSound() {
        this.playPhase5Tone(520, 0.09, "square", 0.035);
        setTimeout(() => this.playPhase5Tone(690, 0.12, "square", 0.035), 90);
        setTimeout(() => this.playPhase5Tone(880, 0.18, "triangle", 0.04), 190);
    }

    updatePhase6(dt) {
        if (!this.gameTime) this.gameTime = 0;
        this.gameTime += dt;
        this.phase5TipPulse += dt;
        if (this.phase5MessageTimer > 0) this.phase5MessageTimer -= dt;

        // Interaction Check: Trigger action on Action key press or Jump near interactable
        const actionPressed = Boolean(
            this.actionJustPressed ||
            (this.keys.action && !this.prevActionHeld) ||
            ((this.keys.jump || this.keys.up) && !this.prevJumpHeld && this.isNearPhase5Interactable())
        );
        this.prevActionHeld = Boolean(this.keys.action);
        this.prevJumpHeld = Boolean(this.keys.jump || this.keys.up);

        if (actionPressed) {
            this.triggerPhase5Action();
        }

        if (this.phase5Mode === 'PLAYER') this.updatePhase5Player(dt);
        else if (this.phase5Mode === 'TRACTOR') this.updatePhase5Tractor(dt);
        else if (this.phase5Mode === 'PANEL') this.updatePhase5Biogas(dt);
        else if (this.phase5Mode === 'ANALYSIS') this.updatePhase5Analysis(dt);

        for (const aerator of (this.phase5Aerators || [])) {
            if (aerator.active) aerator.spin += dt * 8;
        }

        this.updatePhase5Particles(dt);
    }

    updatePhase5Player(dt) {
        const p = this.player;
        let direction = 0;
        if (this.keys.left) direction -= 1;
        if (this.keys.right) direction += 1;

        if (direction !== 0) {
            p.vx += direction * 1100 * dt;
            p.vx = Math.max(-285, Math.min(285, p.vx));
            p.facing = direction;
            p.animState = 'walk';
            p.animTimer = (p.animTimer || 0) + dt * 10;
            p.animFrame = Math.floor(p.animTimer) % 8;
        } else {
            p.vx *= Math.pow(0.001, dt);
            if (Math.abs(p.vx) < 2) p.vx = 0;
            p.animState = 'idle';
            p.animTimer = (p.animTimer || 0) + dt * 3.4;
            p.animFrame = Math.floor(p.animTimer) % 4;
        }

        if ((this.keys.jump || this.keys.up) && p.grounded && !this.isNearPhase5Interactable()) {
            p.vy = -545;
            p.grounded = false;
            this.playPhase5Tone(250, 0.08, "square", 0.025);
            if (window.soundManager) window.soundManager.playJump();
        }

        p.vy += 1450 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // A passarela usa a mesma cota do chão. A cota antiga deixava
        // 26 pixels de ar entre os pés do Cajulim e a plataforma.
        const floorY = this.phase5Floor - p.h;

        if (p.y >= floorY) {
            p.y = floorY;
            p.vy = 0;
            p.grounded = true;
        } else {
            p.grounded = false;
            p.animState = 'jump';
            p.animFrame = p.vy < 0 ? 1 : 2;
        }

        let minX = 50;
        let maxX = this.levelWidth - 100;
        if (this.phase5Stage === 'APPROACH') maxX = 660;
        if (this.phase5Stage === 'TO_BIOGAS') { minX = 1480; maxX = 2520; }
        if (this.phase5Stage === 'TO_LAGOONS') { minX = 2760; maxX = 4520; }
        if (this.phase5Stage === 'TO_LAB') { minX = 2760; maxX = 4940; }
        p.x = Math.max(minX, Math.min(maxX, p.x));
    }

    updatePhase5Tractor(dt) {
        const tractor = this.phase5Tractor;
        let direction = 0;
        if (this.keys.left) direction -= 1;
        if (this.keys.right) direction += 1;
        const limit = 1520;

        if (direction !== 0) {
            tractor.vx += direction * 520 * dt;
            tractor.vx = Math.max(-220, Math.min(220, tractor.vx));
            tractor.facing = direction;
        } else {
            tractor.vx *= Math.pow(0.005, dt);
            if (Math.abs(tractor.vx) < 3) tractor.vx = 0;
        }

        tractor.x += tractor.vx * dt;
        tractor.x = Math.max(230, Math.min(limit, tractor.x));

        // Keep Cajulim synchronized with tractor cabin while driving
        if (this.player) {
            this.player.x = tractor.x + 75;
            this.player.y = tractor.y + 20;
            this.player.vx = tractor.vx;
        }

        const center = tractor.x + 110;
        const isMoving = Math.abs(tractor.vx) > 25;

        this.tractorEngineSoundTimer = (this.tractorEngineSoundTimer || 0) - dt;
        if (this.tractorEngineSoundTimer <= 0) {
            if (window.soundManager) window.soundManager.playTractorEngine(isMoving);
            this.tractorEngineSoundTimer = isMoving ? 0.16 : 0.35;
        }

        if (this.phase5Stage === 'COMPACT' && isMoving) {
            for (const zone of this.phase5Zones) {
                if (center > zone.x - 40 && center < zone.x + zone.w + 40 && zone.comp < 100) {
                    zone.comp = Math.min(100, zone.comp + dt * 62);
                    if (Math.random() < 0.22) this.burstPhase5(center, this.phase5Floor - 20, '#83542b', 2);
                    if (zone.comp === 100) {
                        this.score += 180;
                        this.playPhase5Tone(450, 0.09, 'square', 0.025);
                        if (window.soundManager) window.soundManager.playCollect('trash');
                    }
                }
            }
            if (this.phase5Zones.every(zone => zone.comp >= 100)) {
                this.phase5Stage = 'GET_SOIL';
                this.phase5State = 'GET_SOIL';
                this.setPhase5Message("Compactação concluída! Busque a terra na jazida à esquerda.", 4.5);
                this.playPhase5SuccessSound();
            }
        }

        if (this.phase5Stage === 'COVER' && isMoving && this.phase5SoilLoaded) {
            for (const zone of this.phase5Zones) {
                if (center > zone.x - 40 && center < zone.x + zone.w + 40 && zone.cover < 100) {
                    zone.cover = Math.min(100, zone.cover + dt * 70);
                    if (Math.random() < 0.25) this.burstPhase5(center, this.phase5Floor - 25, '#c58c47', 2);
                    if (zone.cover === 100) {
                        this.score += 220;
                        this.playPhase5Tone(540, 0.1, 'square', 0.025);
                        if (window.soundManager) window.soundManager.playCollect('star');
                    }
                }
            }
            if (this.phase5Zones.every(zone => zone.cover >= 100)) {
                this.phase5Stage = 'PARK';
                this.phase5State = 'PARK';
                this.setPhase5Message("Cobertura concluída! Estacione no ponto amarelo.", 4.5);
                this.playPhase5SuccessSound();
            }
        }
    }

    updatePhase5Biogas(dt) {
        if (this.phase5PowerComplete) return;
        if (this.keys.left) this.phase5Pressure -= 29 * dt;
        if (this.keys.right) this.phase5Pressure += 29 * dt;
        this.phase5Pressure += Math.sin((this.gameTime || 0) * 1.55) * 1.15 * dt;
        this.phase5Pressure = Math.max(10, Math.min(95, this.phase5Pressure));

        const ideal = this.phase5Pressure >= 40 && this.phase5Pressure <= 70;
        if (ideal) this.phase5StableTime = Math.min(6.0, this.phase5StableTime + dt);
        else this.phase5StableTime = Math.max(0, this.phase5StableTime - dt * 0.18);

        if (this.phase5StableTime >= 6.0) {
            this.phase5StableTime = 6.0;
            this.phase5PowerComplete = true;
            this.score += 1000;
            this.setPhase5Message("Pressão estabilizada. Usina pronta: 10,0 MW! Pressione ESPAÇO ou E.", 6.0);
            this.burstPhase5(2360, 310, '#f5dc54', 35);
            this.playPhase5SuccessSound();
            if (window.soundManager) window.soundManager.playPowerGridBeep();
        }
    }

    updatePhase5Analysis(dt) {
        this.phase5AnalysisTime = Math.min(2.8, this.phase5AnalysisTime + dt);
        if (this.phase5AnalysisTime >= 2.8 && !this.phase5AnalysisDone) {
            this.phase5AnalysisDone = true;
            this.phase5Stage = 'COMPLETE';
            this.phase5State = 'COMPLETE';
            this.phase5Mode = 'WIN';
            // A análise esconde o personagem. Ao voltar para o mundo, reposicione
            // os pés no piso do laboratório para impedir que ele reapareça no ar.
            this.player.y = this.phase5Floor - this.player.h;
            this.player.vy = 0;
            this.player.grounded = true;
            this.player.animState = 'idle';
            this.phase5CompletedAt = this.gameTime || 0;
            this.score += 1500;
            this.setPhase5Message("Análise da simulação concluída. Tratamento certificado: pH 7,0!", 7.0);
            this.burstPhase5(4820, 320, '#69e7a2', 55);
            this.playPhase5SuccessSound();
            if (window.soundManager) window.soundManager.playVictory();

            setTimeout(() => {
                if (this.currentPhase === 7) {
                    this.levelClear();
                }
            }, 2400);
        }
    }

    updatePhase5Particles(dt) {
        if (!this.phase5Particles) return;
        for (let i = this.phase5Particles.length - 1; i >= 0; i--) {
            const p = this.phase5Particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 280 * dt;
            p.life -= dt;
            if (p.life <= 0) this.phase5Particles.splice(i, 1);
        }
    }

    handlePhase5Click(e) {
        if (this.currentPhase !== 7) return;

        if (this.phase5Mode === 'PANEL') {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = VIRTUAL_WIDTH / rect.width;
            const scaleY = VIRTUAL_HEIGHT / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            if (this.phase5PowerComplete) {
                this.triggerPhase5Action();
                return;
            }

            // Click at exit footer (y >= 390) or top-right close area (x >= 760 && y <= 130)
            if (clickY >= 390 || (clickX >= 760 && clickY <= 130)) {
                this.triggerPhase5Action();
                return;
            }

            // Tapping left or right side of modal regulates pressure
            if (clickX < VIRTUAL_WIDTH / 2) {
                this.phase5Pressure = Math.max(10, (this.phase5Pressure || 27) - 6);
                this.playPhase5Tone(360, 0.07, 'square', 0.025);
            } else {
                this.phase5Pressure = Math.min(95, (this.phase5Pressure || 27) + 6);
                this.playPhase5Tone(480, 0.07, 'square', 0.025);
            }
            return;
        }

        this.triggerPhase5Action();
    }
    updatePhase7(dt) {
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
            if (p.bossBounceTimer > 0) p.bossBounceTimer = Math.max(0, p.bossBounceTimer - dt);

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
            // Hitbox justa e precisa (compatível com o tamanho do sprite do entulho)
            if (p.invulnerableTimer <= 0 && !p.isDead &&
                p.x + p.w > d.x - 8 && p.x < d.x + 8 &&
                p.y + p.h > d.y - 8 && p.y < d.y + 8) {
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
            const playerBottom = p.y + p.h;
            // Se o jogador pular em cima do pneu, esmaga o pneu e quica para cima sem dano!
            if (p.vy > 0 && p.x + p.w > t.x - 14 && p.x < t.x + 14 &&
                playerBottom >= t.y - 16 && playerBottom <= t.y + 8) {
                p.y = t.y - 16 - p.h;
                p.vy = -480;
                p.grounded = false;
                this.spawnSparkles(t.x, t.y, 12);
                this.addFloatingText(t.x, t.y - 20, '💥 PNEU DESTRUÍDO!', '#22c55e');
                if (window.soundManager && window.soundManager.playJump) window.soundManager.playJump();
                this.bossTires.splice(i, 1);
                continue;
            }

            // Hitbox lateral justa para o pneu
            if (p.invulnerableTimer <= 0 && !p.isDead &&
                p.x + p.w > t.x - 10 && p.x < t.x + 10 &&
                p.y + p.h > t.y - 10 && p.y < t.y + 10) {
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
            const playerBottom = p.y + p.h;
            const playerCenter = p.x + p.w / 2;

            // 1. WEAK SPOT: CAPÔ E TOPO DO MECHA-TRATOR
            // Cobre generosamente a extensão superior visível do trator
            const hoodLeft = boss.x - 15;
            const hoodRight = boss.x + boss.w + 15;
            const hoodTop = boss.y - 40;
            const hoodBottom = boss.y + 45;

            // Jogador caindo ou no topo sobre a área do capô
            const isHorizontallyOverHood = (p.x + p.w > hoodLeft && p.x < hoodRight);
            const isVerticallyHittingHood = (playerBottom >= hoodTop && playerBottom <= hoodBottom && p.y < hoodBottom);
            const isFallingOrApex = p.vy >= -80; // Caindo ou no topo do arco do pulo

            if (isHorizontallyOverHood && isVerticallyHittingHood && isFallingOrApex) {
                if (boss.invulnerableTimer <= 0 && boss.state !== 'HURT') {
                    // HIT VÁLIDO NO CHEFÃO!
                    boss.hp -= 1;
                    if (boss.hp >= 3) boss.phase = 1;
                    else if (boss.hp === 2) boss.phase = 2;
                    else if (boss.hp === 1) boss.phase = 3;
                    else boss.phase = 0;

                    boss.hurtTimer = 1.3;
                    boss.invulnerableTimer = 1.8;
                    boss.state = 'HURT';

                    // Quique espetacular para cima (estilo Sonic / Mario)
                    p.y = hoodTop - p.h + 10;
                    p.vy = -620;
                    p.grounded = false;
                    p.bossBounceTimer = 0.45; // Imunidade generosa durante a saída do quique

                    this.score += 800;
                    this.spawnSparkles(boss.x + boss.w / 2, boss.y + 10, 30);
                    this.addFloatingText(boss.x + boss.w / 2, boss.y - 40, `💥 ACERTOU O CAPÔ! (${boss.hp}/4 HP)`, '#facc15');

                    if (window.soundManager && window.soundManager.playHorn) {
                        window.soundManager.playHorn();
                    }

                    if (boss.hp === 1) {
                        boss.state = 'STUNNED';
                        boss.stateTimer = 3.5;
                        this.showTip('⭐ MECHA-TRATOR ATORDOADO! Suba na torre central e dê o salto final!', 4.0);
                    } else if (boss.hp <= 0) {
                        boss.state = 'DEFEATED';
                        this.phase6State = 'BOSS_DEFEATED';
                        this.bossDefeatTimer = 0;
                        this.score += 5000;
                        this.showTip('💥 O MECHA-TRATOR FOI DESARMADO! VITÓRIA!', 4.0);
                    }
                    return;
                } else {
                    // Se o chefe já estiver piscando de um golpe anterior, o jogador
                    // aterra ou quica suavemente com segurança! NUNCA leva dano por pular no trator!
                    p.y = hoodTop - p.h + 10;
                    p.vy = -380; // Quique suave de recuo
                    p.grounded = false;
                    p.bossBounceTimer = 0.35;
                    return;
                }
            }

            // Se o jogador estiver quicando para cima após acerto, fica imune ao trator
            if (p.bossBounceTimer > 0) return;

            // 2. CORPO DO TRATOR (ATROPELAMENTO NO NÍVEL DO CHÃO)
            // REGRA FUNDAMENTAL: Se o jogador estiver em um andaime elevado (playerBottom <= 365),
            // ele NUNCA toma dano do trator que passa por baixo no chão!
            const isAtGroundLevel = playerBottom > boss.y + 40; // Apenas no nível do chão (y > 390px)

            if (isAtGroundLevel) {
                // Hitbox lateral justo acompanhando a pá frontal e a esteira
                const bodyX1 = boss.facing > 0 ? boss.x : boss.x - 18;
                const bodyX2 = boss.facing > 0 ? boss.x + boss.w + 18 : boss.x + boss.w;
                const bodyY1 = boss.y + 35; // Apenas a parte baixa (pá e esteiras)
                const bodyY2 = boss.y + boss.h;

                if (p.x + p.w > bodyX1 && p.x < bodyX2 && playerBottom > bodyY1 && p.y < bodyY2) {
                    // Empurra lateralmente para não prender o jogador
                    const bossCenter = (bodyX1 + bodyX2) / 2;
                    if (playerCenter < bossCenter) {
                        p.x = bodyX1 - p.w - 2;
                        p.vx = Math.min(p.vx, -200);
                    } else {
                        p.x = bodyX2 + 2;
                        p.vx = Math.max(p.vx, 200);
                    }

                    if (p.invulnerableTimer <= 0) {
                        this.hurtPlayer(1, 'O Mecha-Trator te atingiu! Pule por cima!');
                        p.vy = -240;
                    }
                }
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

    updatePhase1Weather(dt) {
        if (this.currentPhase !== 2) return;
        const GROUND_Y = 460;

        // Triggers rain and thunder when reaching 75% of the level (x >= 4800)
        if (this.player && this.player.x >= 4800) {
            if (!this.isRaining) {
                this.isRaining = true;
                this.showTip('⛈ O tempo fechou! Tempestade com chuva e trovões na reta final!', 4.0);
                if (window.soundManager && window.soundManager.playThunder) {
                    window.soundManager.playThunder();
                }
                this.lightningFlash = 0.55;
            }
        }

        if (this.lightningFlash > 0) {
            this.lightningFlash = Math.max(0, this.lightningFlash - dt);
        }

        if (this.isRaining) {
            this.thunderTimer = (this.thunderTimer || 3.0) - dt;
            if (this.thunderTimer <= 0) {
                this.thunderTimer = 4.0 + Math.random() * 5.0;
                this.lightningFlash = 0.45;
                if (window.soundManager && window.soundManager.playThunder) {
                    window.soundManager.playThunder();
                }
            }

            if (!this.rainParticles) this.rainParticles = [];
            // Spawn rain particles matching camera viewport
            for (let i = 0; i < 8; i++) {
                this.rainParticles.push({
                    x: this.camera.x - 60 + Math.random() * (VIRTUAL_WIDTH + 140),
                    y: -20 + Math.random() * 40,
                    vx: -115 - Math.random() * 40,
                    vy: 750 + Math.random() * 220,
                    len: 16 + Math.random() * 8
                });
            }

            for (let i = this.rainParticles.length - 1; i >= 0; i--) {
                const rp = this.rainParticles[i];
                rp.x += rp.vx * dt;
                rp.y += rp.vy * dt;
                if (rp.y >= GROUND_Y) {
                    if (Math.random() < 0.25) this.spawnDust(rp.x, GROUND_Y - 2, 1);
                    this.rainParticles.splice(i, 1);
                } else if (rp.y > VIRTUAL_HEIGHT + 20) {
                    this.rainParticles.splice(i, 1);
                }
            }
        }
    }

    renderRain(ctx) {
        if (!this.rainParticles || this.rainParticles.length === 0) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < this.rainParticles.length; i++) {
            const rp = this.rainParticles[i];
            const sx = rp.x - this.camera.x;
            const sy = rp.y;
            if (sx >= -20 && sx <= VIRTUAL_WIDTH + 20 && sy >= -20 && sy <= VIRTUAL_HEIGHT + 20) {
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx - 3, sy + rp.len);
            }
        }
        ctx.stroke();
        ctx.restore();
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
        if (this.currentPhase !== 4 || !this.trafficLights) return;
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
                        
                        if (tl.timer <= 0.5 && tl.state === 'RED') {
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

        // Qualquer bloco especial se transforma em tijolo no primeiro impacto.
        // Antes somente o reciclável mudava; os blocos de interrogação ficavam
        // para sempre com a textura antiga, dando a impressão de que o golpe
        // não funcionou.
        if (!block.hit) {
            block.hit = true;
            block.type = 'brick';
            if (block.content) {
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
            }
            this.spawnSparkles(block.x + block.w / 2, block.y, 16);
            if (block.content && window.soundManager) window.soundManager.playCollect('star');
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

        if (this.currentPhase === 2) {
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
            this.spawnSparkles(this.player.x || 480, this.player.y || 300, 50);
            this.addFloatingText(this.player.x || 480, (this.player.y || 300) - 30, 'CASA LIMPA! SEPARAÇÃO NOTA 10!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE1_CLEAR');
            }, 500);
        } else if (this.currentPhase === 2) {
            if (this.truck) this.spawnSparkles(this.truck.x + 160, this.truck.y + 80, 50);
            this.addFloatingText(this.player.x, this.player.y - 30, 'FASE 2 COMPLETA! COLETA CONCLUÍDA!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE2_CLEAR');
            }, 500);
        } else if (this.currentPhase === 3) {
            const sparklesX = this.phase2Truck ? (this.phase2Truck.x + 130) : 4400;
            this.spawnSparkles(sparklesX, 360, 60);
            this.addFloatingText(this.player.x, this.player.y - 30, 'FASE 3 COMPLETA! ACESSO À RODOVIA!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE3_CLEAR');
            }, 500);
        } else if (this.currentPhase === 4) {
            if (this.transbordoFacility) this.spawnSparkles(this.transbordoFacility.x + 150, this.transbordoFacility.y + 100, 60);
            this.addFloatingText(this.player.x, this.player.y - 30, 'FASE 4 COMPLETA! TRANSBORDO ALCANÇADO!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE4_CLEAR');
            }, 500);
        } else if (this.currentPhase === 5) {
            this.spawnSparkles(700, 360, 60);
            this.addFloatingText(480, 220, 'FASE 5 COMPLETA! TRANSBORDO REALIZADO!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE5_CLEAR');
            }, 500);
        } else if (this.currentPhase === 6) {
            this.spawnSparkles(4200, 320, 70);
            this.addFloatingText(this.player.x, this.player.y - 40, 'FASE 6 COMPLETA! PESAGEM APROVADA!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE6_CLEAR');
            }, 500);
        } else if (this.currentPhase === 7) {
            this.spawnSparkles(this.player.x, this.player.y - 40, 80);
            this.addFloatingText(this.player.x, this.player.y - 50, 'FASE 7 COMPLETA! USINA VERDE CERTIFICADA!', '#00ff88');

            const modal = document.getElementById('victoryModal');
            if (modal) modal.classList.add('hidden');

            setTimeout(() => {
                this.startCutscene('PHASE7_TO_8');
            }, 500);
        } else if (this.currentPhase === 8) {
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
                p.y = this.currentPhase === 2 ? 340 : 350;
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
        if (this.currentPhase === 3) {
            if (this.phase2Truck) {
                const focusX = this.phase2Truck.x + this.phase2Truck.w * 0.58;
                const targetCam = Math.max(0, Math.min(this.levelWidth - VIRTUAL_WIDTH, focusX - VIRTUAL_WIDTH * 0.43));
                this.camera.x += (targetCam - this.camera.x) * 0.12;
                this.camera.y = 0;
            }
            return;
        }
        if (this.currentPhase === 6) {
            // Camera position is updated smoothly inside updatePhase5(dt)
            return;
        }
        if (this.currentPhase === 7) {
            let focusX;
            if (this.phase5Mode === 'TRACTOR') {
                focusX = this.phase5Tractor ? (this.phase5Tractor.x + 110) : (this.player.x + this.player.w / 2);
            } else if (this.phase5Mode === 'PANEL') {
                focusX = 2360;
            } else if (this.phase5Mode === 'ANALYSIS') {
                focusX = 4810;
            } else {
                focusX = this.player.x + this.player.w / 2;
            }
            const targetX = Math.max(0, Math.min(this.levelWidth - VIRTUAL_WIDTH, focusX - VIRTUAL_WIDTH * 0.42));
            if (Math.abs(targetX - this.camera.x) > 350) {
                this.camera.x = targetX;
            } else {
                this.camera.x += (targetX - this.camera.x) * 0.12;
            }
            if (this.camera.x < 0) this.camera.x = 0;
            const maxCam = this.levelWidth - VIRTUAL_WIDTH;
            if (this.camera.x > maxCam) this.camera.x = maxCam;
            this.camera.y = 0;
            return;
        }
        if (this.currentPhase === 8) {
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

        if (!this.assetsReady) {
            this.renderLoadingScreen(ctx);
            return;
        }

        if (this.state === 'CREDITS') {
            this.renderCredits(ctx);
            return;
        }

        this.renderBackground(ctx);

        ctx.save();
        ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y || 0));

        if (this.currentPhase === 1) {
            this.renderCasaViva(ctx);
        } else if (this.currentPhase === 2) {
            this.renderDecorations(ctx);
            this.renderTruck(ctx);
            this.renderPlatforms(ctx);
            this.renderBlocks(ctx);
            this.renderItems(ctx);
            this.renderPlayer(ctx);
        } else if (this.currentPhase === 3) {
            this.renderPhase2(ctx);
        } else if (this.currentPhase === 4) {
            this.renderPhase3Decorations(ctx);
            this.renderTransbordoFacility(ctx);
            this.renderRoadPlatforms(ctx);
            this.renderHazards(ctx);
            this.renderTrafficLights(ctx);
            this.renderItems(ctx);
            this.renderTruckPlayer(ctx);
        } else if (this.currentPhase === 5) {
            this.renderPhase4(ctx);
        } else if (this.currentPhase === 6) {
            this.renderPhase5(ctx);
        } else if (this.currentPhase === 7) {
            this.renderPhase6(ctx);
        } else if (this.currentPhase === 8) {
            this.renderPhase7(ctx);
        }

        this.renderParticles(ctx);
        this.renderFloatingTexts(ctx);

        ctx.restore();

        if (this.currentPhase === 2 && this.isRaining) {
            this.renderRain(ctx);
        }

        if (this.lightningFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, this.lightningFlash * 2.0)})`;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
            ctx.restore();
        }

        if (this.state !== 'CUTSCENE' && this.state !== 'TITLE') {
            if (this.currentPhase !== 1) {
                this.renderHUD(ctx);
            }
            this.renderTip(ctx);
            if (this.currentPhase === 7) {
                this.drawPhase5Message(ctx);
            }
        }

        if (this.state === 'TITLE') this.renderTitleScreen(ctx);
        if (this.state === 'CUTSCENE') this.renderCutscene(ctx);
        if (this.state === 'LEVEL_CLEAR') this.renderLevelClearBanner(ctx);
        if (this.state === 'GAME_OVER') this.renderGameOverBanner(ctx);
    }

    renderPhase4(ctx) {
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
            let bubbleText = `Caminhão #${this.currentTruckIndex}, ré à doca!`;
            if (this.phase3State === 'TRUCK_ENTER') {
                bubbleText = `Caminhão #${this.currentTruckIndex}! Entre na doca!`;
            } else if (this.phase3State === 'DOCKING') {
                bubbleText = this.player.x < 240 ? `Caminhão #${this.currentTruckIndex}, ré até a doca!` : 'Quase lá... devagar!';
            } else if (this.phase3State === 'ALIGNED') {
                bubbleText = 'Travado! Prepare a mira!';
            } else if (this.phase3State === 'TIMING_GAME') {
                bubbleText = 'Aperte no VERDE!';
            } else if (this.phase3State === 'DUMPING') {
                bubbleText = `Despejando carga #${this.currentTruckIndex}!`;
            } else if (this.phase3State === 'TRUCK_EXIT') {
                bubbleText = `Caminhão #${this.currentTruckIndex} liberado!`;
            } else if (this.phase3State === 'COMPACTING' || this.phase3State === 'COMPLETE') {
                bubbleText = 'Carreta 30t 100% cheia!';
            }

            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            const txtWidth = (ctx.measureText ? ctx.measureText(bubbleText).width : bubbleText.length * 8) || 140;
            const bWidth = Math.ceil(txtWidth + 24);
            const bHeight = 28;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(bubbleX, bubbleY, bWidth, bHeight, 6);
            } else {
                ctx.rect(bubbleX, bubbleY, bWidth, bHeight);
            }
            ctx.fill();
            ctx.stroke();

            // Bubble pointer
            ctx.beginPath();
            ctx.moveTo(bubbleX, bubbleY + 10);
            ctx.lineTo(bubbleX - 8, bubbleY + 14);
            ctx.lineTo(bubbleX, bubbleY + 18);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(bubbleText, bubbleX + 12, bubbleY + bHeight / 2);
            ctx.restore();
        }

        // 4. Carreta de Transbordo (In the Lower Dock Pit)
        // Green 30t cargo box is on the LEFT (x = 512..810), Blue cab is on the RIGHT (x = 812..942)
        const car = this.carreta;
        const loadFrac = Math.min(1, (this.trailerLoad || 0) / (this.totalTrailerCapacity || 30));
        const fillHeight = Math.floor(loadFrac * 70);

        // LAYER 4A: Trailer Interior Cargo Hold (Behind the trash)
        ctx.save();
        // Interior back wall of the open-top semi-trailer container
        ctx.fillStyle = '#0b1322';
        ctx.fillRect(514, 342, 294, 76);
        // Vertical steel reinforcement ribs on interior back wall
        ctx.fillStyle = '#162238';
        for (let rx = 538; rx < 800; rx += 32) {
            ctx.fillRect(rx, 342, 6, 76);
        }
        // Shadow cast by top rail onto interior
        const interiorShadow = ctx.createLinearGradient(0, 342, 0, 365);
        interiorShadow.addColorStop(0, 'rgba(2, 6, 23, 0.85)');
        interiorShadow.addColorStop(1, 'rgba(2, 6, 23, 0.0)');
        ctx.fillStyle = interiorShadow;
        ctx.fillRect(514, 342, 294, 23);

        // Rising Garbage Heap inside the trailer container
        if (fillHeight > 0) {
            const heapY = 418 - fillHeight;
            // Dark foundation waste mass
            ctx.fillStyle = '#18202c';
            ctx.beginPath();
            ctx.moveTo(516, 418);
            ctx.lineTo(516, heapY + 8);
            // Slight natural crown/mound in the center of the pile
            ctx.quadraticCurveTo(650, heapY - 4, 806, heapY + 4);
            ctx.lineTo(806, 418);
            ctx.closePath();
            ctx.fill();

            // Textured layer of accumulated compact bags, recyclables and organic waste
            ctx.fillStyle = '#243042';
            for (let ox = 522; ox < 800; ox += 18) {
                const bagH = Math.min(fillHeight, 14 + (ox % 9));
                const by = 418 - bagH - (ox % 7);
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(ox, by, 16, bagH + 2, 4);
                else ctx.rect(ox, by, 16, bagH + 2);
                ctx.fill();
            }

            // Embedded tied black bags in pile
            ctx.fillStyle = '#09090b';
            for (let ox = 528; ox < 795; ox += 28) {
                const by = Math.max(heapY + 2, 416 - fillHeight * (0.3 + (ox % 5) * 0.15));
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(ox, by, 14, 12, 3);
                else ctx.rect(ox, by, 14, 12);
                ctx.fill();
                ctx.fillStyle = '#facc15';
                ctx.fillRect(ox + 5, by - 2, 4, 2); // Yellow tie string
                ctx.fillStyle = '#09090b';
            }

            // Colorful recyclables scattered across pile surface (yellow cans, blue bottles, red cans, cartons)
            for (let ox = 532; ox < 790; ox += 24) {
                const py = Math.max(heapY + 1, 418 - (ox % 13) - fillHeight * 0.7);
                if (ox % 4 === 0) {
                    ctx.fillStyle = '#eab308'; // Yellow recyclable
                    ctx.fillRect(ox, py, 7, 5);
                } else if (ox % 4 === 1) {
                    ctx.fillStyle = '#38bdf8'; // Blue PET bottle
                    ctx.fillRect(ox, py, 5, 8);
                } else if (ox % 4 === 2) {
                    ctx.fillStyle = '#ef4444'; // Red soda can
                    ctx.fillRect(ox, py, 6, 7);
                } else {
                    ctx.fillStyle = '#b45309'; // Cardboard carton
                    ctx.fillRect(ox, py, 8, 6);
                }
            }
        }
        ctx.restore();

        // LAYER 4B: Render Cascading Trash Bags & Recyclables into the Carreta
        if (this.phase3TrashParticles && this.phase3TrashParticles.length > 0) {
            const trashBagAsset = this.assets['item_trash_bag'];
            for (const tp of this.phase3TrashParticles) {
                ctx.save();
                ctx.translate(tp.x, tp.y);
                ctx.rotate(tp.rot);

                if (tp.type === 'bag') {
                    if (trashBagAsset) {
                        ctx.drawImage(trashBagAsset, -tp.w / 2, -tp.h / 2, tp.w, tp.h);
                    } else {
                        // High-contrast pixel-art tied black trash bag
                        ctx.fillStyle = '#09090b';
                        ctx.fillRect(-4, -tp.h / 2, 8, 5);
                        ctx.fillStyle = '#27272a';
                        ctx.fillRect(-6, -tp.h / 2 - 2, 4, 4);
                        ctx.fillRect(2, -tp.h / 2 - 2, 4, 4);
                        ctx.fillStyle = '#facc15';
                        ctx.fillRect(-3, -tp.h / 2 + 3, 6, 2);
                        ctx.fillStyle = '#18181b';
                        ctx.beginPath();
                        if (ctx.roundRect) ctx.roundRect(-tp.w / 2, -tp.h / 2 + 5, tp.w, tp.h - 5, 5);
                        else ctx.rect(-tp.w / 2, -tp.h / 2 + 5, tp.w, tp.h - 5);
                        ctx.fill();
                        ctx.fillStyle = '#3f3f46';
                        ctx.fillRect(-tp.w / 4, -tp.h / 2 + 8, tp.w / 2, 3);
                        ctx.fillStyle = '#52525b';
                        ctx.fillRect(-tp.w / 4, -tp.h / 2 + 13, tp.w / 3, 2);
                    }
                } else if (tp.type === 'can') {
                    // Aluminum beverage can
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(-tp.w / 2, -tp.h / 2, tp.w, tp.h);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fillRect(-tp.w / 2, -tp.h / 2, tp.w, 2);
                    ctx.fillRect(-tp.w / 2, tp.h / 2 - 2, tp.w, 2);
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(-tp.w / 2, -1, tp.w, 3);
                } else if (tp.type === 'bottle') {
                    // Translucent PET plastic bottle
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(-tp.w / 2, -tp.h / 2 + 4, tp.w, tp.h - 4);
                    ctx.fillStyle = '#0284c7';
                    ctx.fillRect(-2, -tp.h / 2, 4, 4);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(-tp.w / 2, -2, tp.w, 4);
                } else {
                    // Cardboard packaging carton
                    ctx.fillStyle = '#b45309';
                    ctx.fillRect(-tp.w / 2, -tp.h / 2, tp.w, tp.h);
                    ctx.fillStyle = '#d97706';
                    ctx.fillRect(-1, -tp.h / 2, 2, tp.h);
                }

                ctx.restore();
            }
        }

        // LAYER 4C: Chute Delivery Mouth (Hangs right above the open trailer container)
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(480, 310);
        ctx.lineTo(558, 336);
        ctx.lineTo(550, 350);
        ctx.lineTo(480, 328);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Yellow hazard chevrons on chute lip
        ctx.fillStyle = '#eab308';
        for (let cx = 495; cx < 550; cx += 14) {
            ctx.beginPath();
            ctx.moveTo(cx, 320 + (cx - 480) * 0.33);
            ctx.lineTo(cx + 6, 320 + (cx - 480) * 0.33);
            ctx.lineTo(cx + 2, 332 + (cx - 480) * 0.33);
            ctx.lineTo(cx - 4, 332 + (cx - 480) * 0.33);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // LAYER 4D: Trailer Exterior Frame, Lower Body Panel, Wheels & Cab (IN FRONT of trash)
        ctx.save();
        // 1. Lower side wall panel with Natal flag and official navy blue paint (y = 400..426)
        ctx.fillStyle = '#0f2752';
        ctx.fillRect(514, 400, 294, 26);
        // Gold trim bar above lower panel
        ctx.fillStyle = '#eab308';
        ctx.fillRect(514, 398, 294, 2.5);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(514, 424, 294, 2);

        // Natal Municipal Flag on the lower panel
        const flagX = 640;
        const flagY = 403;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(flagX, flagY, 44, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(flagX, flagY + 6, 44, 6);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(flagX, flagY + 12, 44, 6);
        // White emblem star
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(flagX + 22, flagY + 9, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. Corner Uprights & Upper Yellow Rim
        // Rear corner post (left)
        ctx.fillStyle = '#0c1e3d';
        ctx.fillRect(512, 336, 14, 90);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(514, 338, 6, 88);
        // Front bulkhead (right before cab)
        ctx.fillStyle = '#0c1e3d';
        ctx.fillRect(796, 336, 14, 90);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(798, 338, 6, 88);
        // Heavy-duty top yellow guide rail
        ctx.fillStyle = '#eab308';
        ctx.fillRect(510, 336, 302, 7);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(510, 337, 302, 2);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(510, 342, 302, 1.5);

        // 3. Retroreflective Red/White Safety Stripe (y = 426..435)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(512, 426, 298, 9);
        for (let bx = 514; bx < 806; bx += 16) {
            ctx.fillStyle = '#dc2626'; // Red stripe
            ctx.fillRect(bx, 427, 8, 7);
            ctx.fillStyle = '#f8fafc'; // White stripe
            ctx.fillRect(bx + 8, 427, 8, 7);
        }

        // 4. Trailer Triple Axles and Heavy-Duty Wheels (x = 558, 613, 668, y = 456)
        [558, 613, 668].forEach(wx => {
            const wy = 456;
            // Black Rubber Tire (outer radius 19)
            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.arc(wx, wy, 19, 0, Math.PI * 2);
            ctx.fill();
            // Tire sidewall rim
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(wx, wy, 15, 0, Math.PI * 2);
            ctx.fill();
            // Silver Steel Wheel Rim (radius 11)
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(wx, wy, 11, 0, Math.PI * 2);
            ctx.fill();
            // Inner rim dark groove
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(wx, wy, 8, 0, Math.PI * 2);
            ctx.fill();
            // Orange planetary hub (radius 5)
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(wx, wy, 5, 0, Math.PI * 2);
            ctx.fill();
            // Chrome center nut
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(wx, wy, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // 5. Blue Tractor Cab on the right (x = 810..942, y = 310..476)
        const carretaCabImg = this.assets['sc_carreta_cab'];
        if (carretaCabImg) {
            ctx.drawImage(carretaCabImg, 810, 314, 130, 162);
        } else {
            // Draw cab if image unavailable
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(812, 330, 110, 130);
        }

        // 6. Security Tarp over the trailer body when compacting/complete
        if (this.tarpCoverProgress > 0) {
            const tarpW = Math.min(300, Math.floor((300 * this.tarpCoverProgress) / 100));
            ctx.fillStyle = '#15803d';
            ctx.fillRect(510, 336, tarpW, 14);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(510, 336, tarpW, 14);
            // Tie-down cords
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1;
            for (let sx = 525; sx < 510 + tarpW; sx += 32) {
                ctx.beginPath();
                ctx.moveTo(sx, 350);
                ctx.lineTo(sx, 366);
                ctx.stroke();
            }
        }
        ctx.restore();

        // 5. Collection Truck & Tilting Hydraulic Dump Bed (Clean and natural pixel art - no colored tints or lights)
        const p = this.player;

        if (this.phase3State === 'DOCKING' || this.phase3State === 'TRUCK_ENTER') {
            // Whole truck moving in reverse towards the dock or entering
            const truckImg = this.assets['sc_truck'];
            if (truckImg) {
                ctx.drawImage(truckImg, p.x, p.y, p.w, p.h);
            }
        } else if (this.phase3State === 'TRUCK_EXIT') {
            // Whole truck driving off to the left, flipped horizontally to face left
            const truckImg = this.assets['sc_truck'];
            if (truckImg) {
                ctx.save();
                ctx.translate(p.x + p.w, p.y);
                ctx.scale(-1, 1);
                ctx.drawImage(truckImg, 0, 0, p.w, p.h);
                ctx.restore();
            }
        } else {
            // Chassis & Cab with Pai Caju
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
                ctx.fillText(`🎯 PERFEITO! FORÇA MÁXIMA (+${(this.roundDumpTarget || 7.5).toFixed(1)}t)! +500 PTS`, gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            } else if (this.timingResult === 'GOOD') {
                ctx.fillStyle = '#facc15';
                const amt = (this.roundDumpTarget || 2.5).toFixed(1);
                ctx.fillText(`👍 BOM! PRESSÃO MÉDIA (+${amt}t)! +200 PTS`, gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            } else if (this.timingResult === 'MISS') {
                ctx.fillStyle = '#ef4444';
                ctx.fillText('⚠️ BAIXA PRESSÃO! TENTE DE NOVO!', gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`🔴 0t | 🟡 +2.5t | 🟢 TUDO! [Resta: ${truckLeft}t]`, gaugeX + gaugeW / 2, gaugeY + gaugeH + 12);
            }
        }

        // 7. Phase 3 Interactive HUD Card in center/right (When NOT in TIMING_GAME state)
        if (this.phase3State !== 'TIMING_GAME') {
            ctx.save();
            const cardX = 490;
            const cardY = 75;
            const cardW = 340;
            const cardH = 48;

            if (this.phase3State === 'DOCKING' || this.phase3State === 'TRUCK_ENTER') {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.strokeStyle = dist <= 0.5 ? '#22c55e' : '#eab308';
                ctx.lineWidth = 2;
                ctx.strokeRect(cardX, cardY, cardW, cardH);

                ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4 | DOCA: ${this.dockDistance} m`, cardX + cardW / 2, cardY + 18);

                ctx.fillStyle = dist <= 0.5 ? '#4ade80' : '#facc15';
                const actionText = dist <= 0.5 ? '🟢 ALINHADO! APERTE [ESPAÇO] PARA TRAVAR' : '◄◄◄ DÊ RÉ DEVAGAR ATÉ A DOCA';
                ctx.fillText(actionText, cardX + cardW / 2, cardY + 36);
            } else if (this.phase3State === 'ALIGNED') {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.strokeRect(cardX, cardY, cardW, cardH);

                ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#4ade80';
                ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4 TRAVADO NA DOCA!`, cardX + cardW / 2, cardY + 18);
                ctx.fillStyle = '#ffffff';
                ctx.fillText('PREPARANDO MIRA HIDRÁULICA...', cardX + cardW / 2, cardY + 36);
            } else if (this.phase3State === 'DUMPING') {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.strokeRect(cardX, cardY, cardW, cardH);

                // Progress Bar of Carreta
                const innerW = cardW - 20;
                const innerH = 14;
                const progressW = Math.min(innerW, Math.floor((innerW * (this.dumpProgress || 0)) / 100));
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cardX + 10, cardY + 8, innerW, innerH);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(cardX + 10, cardY + 8, progressW, innerH);

                ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`CARRETA: ${this.trailerLoad.toFixed(1)} / 30.0t (${Math.floor(this.dumpProgress || 0)}%)`, cardX + cardW / 2, cardY + 19);

                ctx.fillStyle = '#facc15';
                ctx.fillText(`DESPEJANDO CARGA #${this.currentTruckIndex}/4 NA CARRETA...`, cardX + cardW / 2, cardY + 38);
            } else if (this.phase3State === 'TRUCK_EXIT') {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.strokeRect(cardX, cardY, cardW, cardH);

                ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`CAMINHÃO #${this.currentTruckIndex}/4 DESCARREGADO!`, cardX + cardW / 2, cardY + 18);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(this.currentTruckIndex < this.totalTrucks ? `AGUARDE O PRÓXIMO COLETOR (${this.currentTruckIndex + 1}/4)...` : 'TODOS OS COLETORES LIBERADOS!', cardX + cardW / 2, cardY + 36);
            } else if (this.phase3State === 'COMPACTING' || this.phase3State === 'COMPLETE') {
                ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
                ctx.fillRect(cardX, cardY, cardW, cardH);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.strokeRect(cardX, cardY, cardW, cardH);

                const innerW = cardW - 20;
                const innerH = 14;
                const progressW = Math.min(innerW, Math.floor((innerW * (this.tarpCoverProgress || 0)) / 100));
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(cardX + 10, cardY + 8, innerW, innerH);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(cardX + 10, cardY + 8, progressW, innerH);

                ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffffff';
                ctx.fillText('CARRETA 100% CHEIA: 30.0t', cardX + cardW / 2, cardY + 19);

                ctx.fillStyle = '#4ade80';
                ctx.fillText('LONA DE SEGURANÇA LACRADA!', cardX + cardW / 2, cardY + 38);
            }
ctx.restore();
        }
    }

    renderPhase5(ctx) {
        ctx.save();
        ctx.scale(0.75, 0.75);
        this.drawPhase5Road(ctx);
        this.drawPhase5Milestones(ctx);
        this.drawPhase5Scale(ctx);
        this.drawPhase5GateAndLandfill(ctx);
        this.drawPhase5Dust(ctx);
        this.drawPhase5Truck(ctx);
        this.drawPhase5Sparkles(ctx);
        ctx.restore();
    }

    renderPhase5Background(ctx) {
        ctx.save();
        ctx.scale(0.75, 0.75);
        ctx.fillStyle = "#50b9e5";
        ctx.fillRect(0, 0, 1280, 720);
        const image = this.assets['sc_rota_aterro'];
        if (image && image.complete && (image.naturalWidth === undefined || image.naturalWidth > 0)) {
            const sourceHeight = Math.min(image.naturalHeight, Math.round(image.naturalWidth * 9 / 16));
            const panoramaWidth = 1280 + 380;
            const panoramaProgress = Math.max(0, Math.min(1, (this.phase5CameraX || 0) / (this.phase5WorldW - 1280)));
            const panoramaX = -Math.round((panoramaWidth - 1280) * panoramaProgress);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, 0, 0, image.naturalWidth, sourceHeight, panoramaX, 0, panoramaWidth, 720);
            const wash = ctx.createLinearGradient(0, 100, 0, 720);
            wash.addColorStop(0, "rgba(36,125,165,.03)");
            wash.addColorStop(1, "rgba(8,35,47,.14)");
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, 1280, 720);
        }
        ctx.restore();
    }

    drawPhase5Road(ctx) {
        const start = Math.max(0, Math.floor(((this.phase5CameraX || 0) - 180) / 32) * 32);
        const end = Math.min(this.phase5WorldW, (this.phase5CameraX || 0) + 1280 + 210);

        ctx.beginPath();
        ctx.moveTo(start, this.phase5RoadYAt(start) - 9);
        for (let x = start; x <= end; x += 32) ctx.lineTo(x, this.phase5RoadYAt(x) - 9);
        ctx.lineTo(end, 720);
        ctx.lineTo(start, 720);
        ctx.closePath();
        ctx.fillStyle = "#b78a4c";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(start, this.phase5RoadYAt(start));
        for (let x = start; x <= end; x += 24) ctx.lineTo(x, this.phase5RoadYAt(x));
        ctx.lineTo(end, 720);
        ctx.lineTo(start, 720);
        ctx.closePath();
        const asphalt = ctx.createLinearGradient(0, 520, 0, 720);
        asphalt.addColorStop(0, "#46515a");
        asphalt.addColorStop(0.55, "#28343e");
        asphalt.addColorStop(1, "#14212a");
        ctx.fillStyle = asphalt;
        ctx.fill();

        ctx.strokeStyle = "#f5eee0";
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let x = start; x <= end; x += 20) {
            const y = this.phase5RoadYAt(x) + 4;
            if (x === start) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        for (let x = start - (start % 180); x < end; x += 180) {
            const y = this.phase5RoadYAt(x + 55) + 72;
            ctx.save();
            const angle = Math.atan2(this.phase5RoadYAt(x + 110) - this.phase5RoadYAt(x), 110);
            ctx.translate(x + 25, y);
            ctx.rotate(angle);
            ctx.fillStyle = "#f4c83f";
            ctx.fillRect(0, 0, 94, 7);
            ctx.fillStyle = "#fff19a";
            ctx.fillRect(0, 0, 94, 2);
            ctx.restore();
        }

        for (let x = start; x < end; x += 53) {
            const y = this.phase5RoadYAt(x) + 25 + (x * 17 % 102);
            ctx.fillStyle = (x / 53) % 2 ? "rgba(135,151,158,.2)" : "rgba(5,16,22,.2)";
            ctx.fillRect(x, y, 3 + (x % 8), 2);
        }
    }

    drawPhase5Milestones(ctx) {
        const posts = [
            { x: 1000, km: "KM 02", note: "DUNAS" },
            { x: 2350, km: "KM 04", note: "SERRA" },
            { x: 3550, km: "KM 06", note: "BALANÇA" }
        ];
        for (const post of posts) {
            const y = this.phase5RoadYAt(post.x);
            ctx.fillStyle = "#d5d6cc";
            ctx.fillRect(post.x, y - 87, 58, 75);
            ctx.fillStyle = "#164f69";
            ctx.fillRect(post.x + 5, y - 82, 48, 46);
            ctx.strokeStyle = "#ffd34f";
            ctx.lineWidth = 3;
            ctx.strokeRect(post.x + 5, y - 82, 48, 46);
            ctx.fillStyle = "#f6fbef";
            ctx.font = '900 11px "Nunito", sans-serif';
            ctx.textAlign = "center";
            ctx.fillText(post.km, post.x + 29, y - 62);
            ctx.fillStyle = "#9de8b3";
            ctx.font = '900 8px "Nunito", sans-serif';
            ctx.fillText(post.note, post.x + 29, y - 47);
            ctx.fillStyle = "#8d7554";
            ctx.fillRect(post.x + 24, y - 12, 10, 12);
        }

        const tractionZones = [1130, 2780];
        for (const x of tractionZones) {
            const y = this.phase5RoadYAt(x);
            this.drawPhase5RoundedRect(ctx, x - 125, y - 154, 250, 42, 6);
            ctx.fillStyle = "rgba(5,29,42,.92)";
            ctx.fill();
            ctx.strokeStyle = "#ffd34f";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = "#fff4be";
            ctx.font = '900 11px "Nunito", sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("SUBIDA · USE ESPAÇO", x, y - 129);
        }
    }

    drawPhase5Scale(ctx) {
        const SCALE_X = this.phase5ScaleX;
        const SCALE_W = this.phase5ScaleW;
        const y = this.phase5RoadYAt(SCALE_X);
        const rampStart = SCALE_X - 220;
        const rampY = this.phase5RoadYAt(rampStart);

        ctx.fillStyle = "#40515b";
        ctx.beginPath();
        ctx.moveTo(rampStart, rampY - 2);
        ctx.lineTo(SCALE_X, y - 7);
        ctx.lineTo(SCALE_X, y + 19);
        ctx.lineTo(rampStart, rampY + 13);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffd34f";
        ctx.lineWidth = 4;
        ctx.stroke();
        for (let step = 1; step <= 5; step += 1) {
            const progress = step / 6;
            const x = rampStart + (SCALE_X - rampStart) * progress;
            const stripeY = rampY + (y - rampY) * progress;
            ctx.fillStyle = step % 2 ? "#f5df77" : "#8fa2aa";
            ctx.save();
            ctx.translate(x, stripeY + 4);
            ctx.rotate(Math.atan2(y - rampY, SCALE_X - rampStart));
            ctx.fillRect(-13, -3, 26, 6);
            ctx.restore();
        }

        ctx.fillStyle = "#15242e";
        ctx.fillRect(SCALE_X - 35, y - 2, SCALE_W + 70, 112);
        ctx.fillStyle = "#758995";
        ctx.fillRect(SCALE_X, y - 7, SCALE_W, 18);
        ctx.fillStyle = "#c5d5d8";
        for (let x = SCALE_X + 12; x < SCALE_X + SCALE_W - 12; x += 34) ctx.fillRect(x, y - 4, 20, 5);
        ctx.strokeStyle = this.phase5ScaleState === "DONE" ? "#61e48d" : "#ffd34f";
        ctx.lineWidth = 4;
        ctx.strokeRect(SCALE_X, y - 7, SCALE_W, 18);

        const left = SCALE_X + 30;
        const right = SCALE_X + SCALE_W - 30;
        ctx.fillStyle = "#293e4b";
        ctx.fillRect(left, y - 178, 18, 171);
        ctx.fillRect(right - 18, y - 178, 18, 171);
        ctx.fillStyle = "#58717e";
        ctx.fillRect(left - 9, y - 184, right - left + 18, 18);
        ctx.fillStyle = "#0a202d";
        this.drawPhase5RoundedRect(ctx, SCALE_X + SCALE_W / 2 - 185, y - 214, 370, 67, 7);
        ctx.fill();
        ctx.strokeStyle = "#41c5da";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#77e8a1";
        ctx.font = '900 18px "Nunito", sans-serif';
        ctx.textAlign = "center";
        const scaleText = this.phase5ScaleState === "DONE"
            ? "30.000 kg · APROVADO ✓"
            : this.phase5ScaleState === "WEIGHING"
                ? `PESANDO ${Math.round(this.phase5ScaleTimer / 2.6 * 100)}%`
                : this.phase5ScaleState === "DOCKING"
                    ? "ALINHAMENTO AUTOMÁTICO"
                    : "BALANÇA ANTT · 30 t";
        ctx.fillText(scaleText, SCALE_X + SCALE_W / 2, y - 185);
        ctx.fillStyle = "#ffd86a";
        ctx.font = '900 11px "Nunito", sans-serif';
        const scaleInstruction = this.phase5ScaleState === "DONE"
            ? "PODE IR AO ATERRO DESCARREGAR · APERTE A SETA"
            : this.phase5ScaleState === "WEIGHING"
                ? "VEÍCULO IMOBILIZADO · AGUARDE A LEITURA"
                : this.phase5ScaleState === "DOCKING"
                    ? "ACELERAÇÃO BLOQUEADA · A CARRETA VAI PARAR SOZINHA"
                    : "SUBA A RAMPA · FRENAGEM AUTOMÁTICA NA PLATAFORMA";
        ctx.fillText(scaleInstruction, SCALE_X + SCALE_W / 2, y - 161);
    }

    drawPhase5GateAndLandfill(ctx) {
        const GATE_X = this.phase5GateX;
        const DESTINATION_X = this.phase5DestinationX;
        const ground = this.phase5RoadYAt(GATE_X);
        const barrierY = ground - 72 - (this.phase5GateOpen || 0) * 95;
        ctx.fillStyle = "#263c49";
        ctx.fillRect(GATE_X, ground - 174, 18, 174);
        ctx.fillRect(GATE_X + 225, ground - 174, 18, 174);
        ctx.fillStyle = "#0f6041";
        ctx.fillRect(GATE_X - 10, ground - 192, 263, 28);
        ctx.strokeStyle = "#68df90";
        ctx.lineWidth = 3;
        ctx.strokeRect(GATE_X - 10, ground - 192, 263, 28);
        ctx.fillStyle = "#f4fff0";
        ctx.font = '900 13px "Nunito", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("ENTRADA DO ATERRO", GATE_X + 121, ground - 173);

        ctx.save();
        ctx.translate(GATE_X + 18, barrierY);
        ctx.fillStyle = "#f0f1e6";
        ctx.fillRect(0, -6, 205, 12);
        for (let x = 8; x < 200; x += 34) {
            ctx.fillStyle = "#e34a42";
            ctx.fillRect(x, -6, 17, 12);
        }
        ctx.restore();

        ctx.fillStyle = this.phase5ScaleState === "DONE" ? "#4ee47f" : "#ef4d47";
        ctx.beginPath();
        ctx.arc(GATE_X + 235, ground - 140, 8, 0, Math.PI * 2);
        ctx.fill();

        const facilityX = 5890;
        const y = this.phase5RoadYAt(facilityX);
        ctx.fillStyle = "#183844";
        ctx.fillRect(facilityX, y - 174, 570, 174);
        ctx.fillStyle = "#246b52";
        ctx.fillRect(facilityX - 14, y - 191, 598, 24);
        for (let x = facilityX + 25; x < facilityX + 540; x += 86) {
            ctx.fillStyle = "#8fd4df";
            ctx.fillRect(x, y - 133, 54, 44);
            ctx.fillStyle = "#356a78";
            ctx.fillRect(x + 4, y - 129, 46, 36);
        }
        ctx.fillStyle = "#0a1f2b";
        this.drawPhase5RoundedRect(ctx, facilityX + 60, y - 226, 450, 61, 8);
        ctx.fill();
        ctx.strokeStyle = "#ffd34f";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = "#f4ffe9";
        ctx.font = '900 20px "Nunito", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("ATERRO SANITÁRIO · PARNAMIRIM", facilityX + 285, y - 196);
        ctx.fillStyle = "#7ceaa1";
        ctx.font = '900 11px "Nunito", sans-serif';
        ctx.fillText("RECEBIMENTO DE RESÍDUOS · 30 TONELADAS", facilityX + 285, y - 178);

        ctx.strokeStyle = "#ffd34f";
        ctx.lineWidth = 5;
        ctx.setLineDash([18, 10]);
                ctx.strokeRect(DESTINATION_X - 80, y - 12, 650, 92);
        ctx.setLineDash([]);
        if (this.phase5Truck && this.phase5Truck.x > DESTINATION_X - 460 && this.phase5ScaleState === "DONE") {
            this.drawPhase5RoutePrompt(ctx, DESTINATION_X + 170, y - 266, "SEGURE ESPAÇO E PARE NA ÁREA DE RECEBIMENTO");
        }
    }

    drawPhase5Truck(ctx) {
        const t = this.phase5Truck;
        if (!t) return;
        const centerX = t.x + t.w / 2;
        const groundY = this.phase5RoadYAt(centerX);
        const slope = this.phase5TruckSlope();
        const motion = Math.min(1, Math.abs(t.speed) / 95);
        const suspension = Math.sin(t.wheel * 1.2) * 1.8 * motion;
        const drawH = 197;
        const drawTop = -167 + suspension;
        const truckImg = this.getTruckCutout();

        ctx.save();
        ctx.translate(centerX, groundY);
        ctx.rotate(slope + t.sway);
        ctx.imageSmoothingEnabled = false;
        const imageReady = truckImg && truckImg.complete !== false && (
            (typeof truckImg.naturalWidth === 'number' && truckImg.naturalWidth > 0) ||
            (typeof truckImg.naturalWidth === 'undefined' && (truckImg.width || 0) > 0)
        );
        if (imageReady) {
            ctx.drawImage(truckImg, -t.w / 2, drawTop, t.w, drawH);
        } else {
            // A carreta não pode desaparecer quando a textura falha
            // ou ainda está baixando. O fallback mantém o veículo jogável e
            // deixa a câmera acompanhar o progresso normalmente.
            this.drawPhase5TruckFallback(ctx, t, drawTop);
        }

        // Centros medidos no sprite: a animação fica contida dentro dos cubos originais.
        const wheels = [-212, -166, -120, 81, 128, 222];
        wheels.forEach((x, index) => this.drawWheelDetail(ctx, x, -16 + suspension, 12, t.wheel, index === 5 ? "#ffd34f" : "#42c4dc"));

        const actionHeld = !!(this.keys.jumpHeld || this.keys.action || this.keys.up);
        if (actionHeld && this.phase5ScaleState !== "WEIGHING" && !this.phase5AutoBrake && t.x <= this.phase5DestinationX - 300) {
            ctx.fillStyle = "rgba(86,225,137,.92)";
            this.drawPhase5RoundedRect(ctx, 68, -158, 152, 28, 5);
            ctx.fill();
            ctx.fillStyle = "#08281b";
            ctx.font = '900 11px "Nunito", sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("TRAÇÃO 6x4", 144, -139);
        }
        ctx.restore();
    }

    drawPhase5TruckFallback(ctx, t, drawTop = -167) {
        const left = -t.w / 2;
        ctx.save();
        // Baú azul da carreta
        ctx.fillStyle = '#123f68';
        ctx.fillRect(left + 18, drawTop + 30, 355, 93);
        ctx.fillStyle = '#1d6f98';
        ctx.fillRect(left + 28, drawTop + 42, 335, 70);
        ctx.strokeStyle = '#09283e';
        ctx.lineWidth = 5;
        ctx.strokeRect(left + 18, drawTop + 30, 355, 93);
        // Faixa refletiva e identificação municipal
        ctx.fillStyle = '#f0d35f';
        ctx.fillRect(left + 20, drawTop + 108, 350, 9);
        ctx.fillStyle = '#e4edf0';
        ctx.fillRect(left + 34, drawTop + 111, 55, 5);
        ctx.fillRect(left + 118, drawTop + 111, 55, 5);
        ctx.fillRect(left + 202, drawTop + 111, 55, 5);
        ctx.fillStyle = '#f7d85c';
        ctx.fillRect(left + 150, drawTop + 55, 112, 37);
        ctx.fillStyle = '#174d6d';
        ctx.font = '900 12px "Nunito", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PARNAMIRIM', left + 206, drawTop + 78);
        // Cabine azul à direita
        ctx.fillStyle = '#1b5d88';
        ctx.fillRect(left + 374, drawTop + 55, 112, 68);
        ctx.fillStyle = '#8bd0df';
        ctx.fillRect(left + 390, drawTop + 67, 43, 28);
        ctx.fillRect(left + 441, drawTop + 67, 31, 28);
        ctx.strokeStyle = '#09283e';
        ctx.lineWidth = 4;
        ctx.strokeRect(left + 374, drawTop + 55, 112, 68);
        ctx.fillStyle = '#f1c84f';
        ctx.fillRect(left + 464, drawTop + 105, 23, 11);
        // Chassi e para-choque
        ctx.fillStyle = '#263b47';
        ctx.fillRect(left + 10, drawTop + 120, 490, 13);
        ctx.fillStyle = '#d9e2df';
        ctx.fillRect(left + 474, drawTop + 122, 28, 8);
        ctx.restore();
    }

    drawWheelDetail(ctx, x, y, radius, angle, accent) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(24,39,46,.7)";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(224,239,239,.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.rotate(angle);
        ctx.strokeStyle = "#d4e7e9";
        ctx.lineWidth = 2;
        for (let index = 0; index < 6; index += 1) {
            ctx.save();
            ctx.rotate(index * Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(radius - 3, 0);
            ctx.stroke();
            ctx.restore();
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff09a";
        ctx.fillRect(radius - 4, -1.5, 4, 3);
        ctx.restore();
    }

    drawPhase5Dust(ctx) {
        if (!this.phase5Dust) return;
        for (const d of this.phase5Dust) {
            ctx.globalAlpha = Math.max(0, Math.min(1, d.life / d.maxLife)) * 0.38;
            ctx.fillStyle = "#d7b878";
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawPhase5Sparkles(ctx) {
        if (!this.phase5Sparkles) return;
        for (const p of this.phase5Sparkles) {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    drawPhase5RoutePrompt(ctx, x, y, text) {
        const pulse = 0.96 + Math.sin((this.phase5Time || 0) * 6) * 0.04;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
        ctx.font = '900 14px "Nunito", sans-serif';
        const width = Math.max(300, ctx.measureText(text).width + 46);
        this.drawPhase5RoundedRect(ctx, -width / 2, -25, width, 44, 7);
        ctx.fillStyle = "rgba(4,25,36,.95)";
        ctx.fill();
        ctx.strokeStyle = "#ffd34f";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#fff5c9";
        ctx.textAlign = "center";
        ctx.fillText(text, 0, 4);
        ctx.restore();
    }

    renderPhase6(ctx) {
        this.drawPhase5World(ctx);
        this.drawPhase5Particles(ctx);

        // Render Cajulim on foot whenever not driving the tractor or inside modal panels
        if (this.phase5Mode !== 'TRACTOR' && this.phase5Mode !== 'PANEL' && this.phase5Mode !== 'ANALYSIS') {
            this.renderPlayer(ctx);
        }

        this.drawPhase5InteractionPrompts(ctx);

        // Screen-space UI modals and overlays (cancel camera transform)
        ctx.save();
        ctx.translate(Math.floor(this.camera.x), Math.floor(this.camera.y || 0));

        if (this.phase5Mode === 'PANEL') {
            this.drawPhase5BiogasPanel(ctx);
        }
        if (this.phase5Mode === 'ANALYSIS') {
            this.drawPhase5AnalysisPanel(ctx);
        }
        if (this.phase5MessageTimer > 0 && this.phase5Stage !== 'COMPLETE' && this.phase5Mode !== 'PANEL' && this.phase5Mode !== 'ANALYSIS') {
            this.drawPhase5Message(ctx);
        }

        ctx.restore();
    }

    drawPhase5World(ctx) {
        const FLOOR = this.phase5Floor || 448;
        const W = this.levelWidth || 5200;

        // Ground base with realistic engineering soil layers
        ctx.fillStyle = "#55793b"; // Natural grass
        ctx.fillRect(0, FLOOR, W, 540 - FLOOR);
        ctx.fillStyle = "#9b693d"; // Sector 1: Earth / clay compaction area
        ctx.fillRect(0, FLOOR + 18, 1650, 540 - FLOOR);
        ctx.fillStyle = "#496d4a"; // Sector 2: Industrial biogas lawn
        ctx.fillRect(1650, FLOOR + 18, 1350, 540 - FLOOR);
        ctx.fillStyle = "#355f63"; // Sector 3: Water treatment bedrock
        ctx.fillRect(3000, FLOOR + 18, 2200, 540 - FLOOR);
        ctx.fillStyle = "#d6b06a"; // Top layer fine gravel / clay path
        ctx.fillRect(0, FLOOR, W, 18);

        // Sector Banners
        this.drawPhase5SectorBanner(ctx, 90, "1", "CÉLULA DE RESÍDUOS", "Compactação e Cobertura", "#e8ad45");
        this.drawPhase5SectorBanner(ctx, 1760, "2", "USINA DE BIOGÁS", "Geração de Energia Limpa", "#53c985");
        this.drawPhase5SectorBanner(ctx, 3060, "3", "TRATAMENTO DE CHORUME", "Aeração & Laboratório ETE", "#55c9eb");

        // Sector Components
        this.drawPhase5Entry(ctx);
        this.drawPhase5WasteSector(ctx);
        this.drawPhase5BiogasSector(ctx);
        this.drawPhase5LagoonSector(ctx);
        this.drawPhase5Lab(ctx);
    }

    drawPhase5SectorBanner(ctx, x, number, title, subtitle, color) {
        ctx.save();
        ctx.translate(x, 114);
        this.drawPhase5RoundedRect(ctx, 0, 0, 360, 68, 10);
        ctx.fillStyle = "rgba(6, 28, 19, 0.92)";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Circle with sector number
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(36, 34, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#102319";
        ctx.font = '900 22px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(number, 36, 43);

        ctx.textAlign = "left";
        ctx.fillStyle = "#fff7d6";
        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(title, 72, 30);
        ctx.fillStyle = "#cfe8d3";
        ctx.font = '11px "Fredoka", sans-serif';
        ctx.fillText(subtitle, 72, 52);
        ctx.restore();
    }

    drawPhase5Entry(ctx) {
        const FLOOR = this.phase5Floor || 448;
        ctx.save();
        // Entrance pillars
        ctx.fillStyle = "#dce7cf";
        ctx.fillRect(25, FLOOR - 170, 16, 170);
        ctx.fillRect(390, FLOOR - 170, 16, 170);

        // Signboard
        ctx.fillStyle = "#17392a";
        this.drawPhase5RoundedRect(ctx, 40, FLOOR - 160, 352, 54, 8);
        ctx.fill();
        ctx.strokeStyle = "#d8ec75";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = "#efffc6";
        ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
        ctx.fillText("ATERRO SANITÁRIO", 216, FLOOR - 134);
        ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = "#7ee3aa";
        ctx.fillText("PARNAMIRIM / SELIM", 216, FLOOR - 116);
        ctx.restore();
    }

    drawPhase5WasteSector(ctx) {
        const FLOOR = this.phase5Floor || 448;

        // Jazida de terra (soil deposit mound)
        ctx.save();
        ctx.fillStyle = "#8f582f";
        ctx.beginPath();
        ctx.moveTo(225, FLOOR);
        ctx.quadraticCurveTo(330, FLOOR - 75, 455, FLOOR);
        ctx.fill();
        ctx.strokeStyle = "#e6bc68";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#fff1bd";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("JAZIDA DE TERRA", 340, FLOOR - 35);
        ctx.restore();

        if (this.phase5Stage === 'GET_SOIL' && Math.abs((this.phase5Tractor.x + 110) - 340) <= 150) {
            this.drawPhase5WorldPrompt(ctx, "ESPAÇO / E: CARREGAR TERRA", "Para cobrir a célula", 340, FLOOR - 85);
        }

        // 4 Waste Mounds (Zones A, B, C, D)
        const zones = this.phase5Zones || [];
        for (let i = 0; i < zones.length; i++) {
            const zone = zones[i];
            const comp = (zone.comp || 0) / 100;
            const cover = (zone.cover || 0) / 100;
            const pileH = 65 - comp * 38; // Starts 65px high, flattens to 27px
            const center = zone.x + zone.w / 2;

            // Base mound
            ctx.save();
            ctx.fillStyle = cover > 0 ? "#a86f3d" : "#2c2924";
            ctx.beginPath();
            ctx.moveTo(zone.x - 14, FLOOR);
            ctx.quadraticCurveTo(center, FLOOR - pileH, zone.x + zone.w + 14, FLOOR);
            ctx.closePath();
            ctx.fill();

            // Scattered waste items inside pile (visible if not fully covered)
            if (cover < 0.98) {
                ctx.globalAlpha = 1 - cover;
                const trashImg = this.assets['item_trash_bag_raw'];
                const bottleImg = this.assets['item_pet_bottle_raw'];
                const boxImg = this.assets['item_paper_box_raw'];

                for (let k = 0; k < 6; k++) {
                    const tx = zone.x + 12 + (k * 27) % (zone.w - 24);
                    const ty = FLOOR - 16 - (k % 3) * 11 * (1 - comp * 0.5);
                    if (k % 3 === 0 && trashImg) {
                        ctx.drawImage(trashImg, tx, ty, 22, 22);
                    } else if (k % 3 === 1 && bottleImg) {
                        ctx.drawImage(bottleImg, tx, ty, 10, 22);
                    } else if (boxImg) {
                        ctx.drawImage(boxImg, tx, ty, 20, 20);
                    }
                }
                ctx.globalAlpha = 1.0;
            }

            // Clay cover layer over mound
            if (cover > 0) {
                ctx.fillStyle = `rgba(205, 145, 70, ${cover})`;
                ctx.beginPath();
                ctx.moveTo(zone.x - 14, FLOOR);
                ctx.quadraticCurveTo(center, FLOOR - pileH - cover * 7, zone.x + zone.w + 14, FLOOR);
                ctx.closePath();
                ctx.fill();
            }

            // Zone Status Badge
            const badgeW = 76;
            const badgeH = 22;
            this.drawPhase5RoundedRect(ctx, center - badgeW / 2, FLOOR - pileH - 32, badgeW, badgeH, 6);
            ctx.fillStyle = "rgba(10, 29, 20, 0.9)";
            ctx.fill();
            ctx.strokeStyle = zone.cover >= 100 || (zone.comp >= 100 && this.phase5Stage !== 'COVER') ? "#8cec78" : "#ffe28a";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = zone.cover >= 100 || (zone.comp >= 100 && this.phase5Stage !== 'COVER') ? "#8cec78" : "#ffe28a";
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = "center";
            const val = this.phase5Stage === 'COVER' || this.phase5Stage === 'PARK' ? Math.round(zone.cover) : Math.round(zone.comp);
            ctx.fillText(`${zone.id} · ${val}%`, center, FLOOR - pileH - 17);
            ctx.restore();
        }

        // Tractor Parking Bay
        ctx.save();
        ctx.strokeStyle = this.phase5Stage === 'PARK' ? "#ffe45c" : "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(1455, FLOOR - 130, 200, 126);
        ctx.setLineDash([]);

        ctx.fillStyle = this.phase5Stage === 'PARK' ? "#ffe45c" : "rgba(255, 255, 255, 0.6)";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("ESTACIONAMENTO", 1555, FLOOR - 140);
        ctx.restore();

        if (this.phase5Stage === 'PARK' && Math.abs((this.phase5Tractor.x + 110) - 1550) <= 145) {
            this.drawPhase5WorldPrompt(ctx, "ESPAÇO / E: DESCER DO TRATOR", "Célula concluída!", 1555, FLOOR - 80);
        }

        this.drawPhase5Tractor(ctx);
    }

    drawPhase5Tractor(ctx) {
        const t = this.phase5Tractor;
        if (!t) return;
        const FLOOR = this.phase5Floor || 448;
        const tratorImg = this.assets['sc_trator_compactador'];

        ctx.save();
        const drawX = t.facing < 0 ? t.x : t.x + t.w;
        ctx.translate(drawX, t.y);
        ctx.scale(-t.facing, 1);

        if (tratorImg && tratorImg.complete && tratorImg.naturalWidth > 0) {
            ctx.drawImage(tratorImg, 0, 0, t.w, t.h);
        } else {
            // Procedural heavy compactor tractor fallback
            ctx.fillStyle = "#eab308";
            ctx.fillRect(20, 25, t.w - 40, t.h - 45);
            // Cab
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(60, 5, 70, 45);
            // Sheepfoot compactor drum
            ctx.fillStyle = "#64748b";
            ctx.beginPath();
            ctx.arc(40, t.h - 22, 22, 0, Math.PI * 2);
            ctx.arc(t.w - 40, t.h - 22, 22, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cajulim sprite inside tractor cabin when driving!
        if (this.phase5Mode === 'TRACTOR') {
            ctx.save();
            this.drawPhase5RoundedRect(ctx, 95, 12, 45, 48, 6);
            ctx.clip();
            const portrait = this.assets['p_portrait'];
            if (portrait && portrait.complete && portrait.naturalWidth > 0) {
                ctx.drawImage(portrait, 95, 12, 45, 48);
            } else {
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(95, 12, 45, 48);
            }
            ctx.fillStyle = "rgba(84, 191, 211, 0.2)";
            ctx.fillRect(95, 12, 45, 48);
            ctx.restore();

            ctx.strokeStyle = "rgba(215, 247, 249, 0.7)";
            ctx.lineWidth = 1.5;
            this.drawPhase5RoundedRect(ctx, 95, 12, 45, 48, 6);
            ctx.stroke();
        }

        // Terra carregada na lâmina dianteira. O trator-base aponta para a
        // esquerda; a transformação acima espelha tudo ao virar para a direita.
        if (this.phase5SoilLoaded) {
            ctx.fillStyle = "#8f582f";
            ctx.strokeStyle = "#4e2f1d";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-24, t.h - 12);
            ctx.quadraticCurveTo(-14, t.h - 48, 8, t.h - 51);
            ctx.quadraticCurveTo(31, t.h - 45, 39, t.h - 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#d2a05a";
            ctx.fillRect(-4, t.h - 41, 12, 4);
            ctx.fillRect(13, t.h - 29, 9, 3);
        }

        ctx.restore();

        // Prompt to enter tractor if player is near
        if (this.phase5Stage === 'APPROACH' && Math.abs(this.player.x - (t.x + 110)) <= 130) {
            this.drawPhase5WorldPrompt(ctx, "ESPAÇO / E: ENTRAR NO TRATOR", "Iniciar compactação", t.x + 110, t.y - 30);
        }
    }

    drawPhase5BiogasSector(ctx) {
        const FLOOR = this.phase5Floor || 448;

        // Underground collection pipeline connecting Sector 1 to Sector 2
        ctx.save();
        ctx.strokeStyle = "#273f3d";
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(1650, FLOOR - 20);
        ctx.lineTo(1940, FLOOR - 20);
        ctx.lineTo(1940, FLOOR - 110);
        ctx.lineTo(2160, FLOOR - 110);
        ctx.stroke();
        ctx.strokeStyle = "#84aaa1";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Biogas Plant Facility
        const plantImg = this.assets['sc_biogas_plant'];
        // Marca técnica leve para separar a usina do panorama repetido ao
        // fundo sem criar outro retângulo escuro cobrindo o cenário.
        ctx.save();
        ctx.fillStyle = '#365b46';
        ctx.fillRect(1920, FLOOR - 13, 620, 13);
        ctx.fillStyle = '#8fc66c';
        ctx.fillRect(1920, FLOOR - 16, 620, 4);
        ctx.strokeStyle = 'rgba(190, 236, 173, .36)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(1935, FLOOR - 238, 585, 232);
        ctx.setLineDash([]);
        ctx.restore();
        ctx.globalAlpha = this.phase5PowerComplete ? 1.0 : 0.88;
        if (plantImg && plantImg.complete && plantImg.naturalWidth > 0) {
            ctx.drawImage(plantImg, 1960, FLOOR - 230, 520, 230);
        } else {
            // Fallback detalhado para conexões lentas. O desenho antigo era um
            // retângulo com um círculo gigante, que parecia um defeito sobre o
            // cenário quando a imagem ainda estava baixando.
            this.drawPhase5BiogasFallback(ctx, FLOOR);
        }
        ctx.globalAlpha = 1.0;

        // Animated clean power energy flow when active
        if (this.phase5PowerComplete) {
            for (let x = 2080; x < 2520; x += 55) {
                const pulse = 0.5 + Math.sin((this.gameTime || 0) * 6 + x) * 0.3;
                ctx.fillStyle = `rgba(255, 235, 100, ${pulse})`;
                ctx.fillRect(x, FLOOR - 165, 18, 10);
            }
        }

        // Accessible control terminal stand
        const panelX = 2290;
        const panelY = FLOOR - 105;
        this.drawPhase5RoundedRect(ctx, panelX, panelY, 115, 105, 8);
        ctx.fillStyle = "#122b28";
        ctx.fill();
        ctx.strokeStyle = this.phase5Stage === 'TO_BIOGAS' ? "#dff360" : "#55c98d";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Screen on terminal
        ctx.fillStyle = "#bcefe0";
        ctx.fillRect(panelX + 15, panelY + 14, 85, 38);
        // Status indicator LED
        ctx.fillStyle = this.phase5PowerComplete ? "#2fc76d" : "#dfb540";
        ctx.beginPath();
        ctx.arc(panelX + 28, panelY + 68, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#efffe7";
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("PAINEL CH₄", panelX + 57, panelY + 92);
        ctx.restore();

        if (this.phase5Stage === 'TO_BIOGAS' && Math.abs((this.player.x + this.player.w / 2) - (panelX + 57)) <= 120) {
            this.drawPhase5WorldPrompt(ctx, "ESPAÇO / E: REGULAR USINA", "Controle de Pressão CH4", panelX + 57, panelY - 30);
        }

        // Security gate between Sector 2 and Sector 3
        ctx.save();
        ctx.fillStyle = this.phase5PowerComplete ? "rgba(42, 172, 99, 0.2)" : "rgba(15, 35, 27, 0.85)";
        ctx.fillRect(2750, FLOOR - 200, 28, 200);
        ctx.fillRect(2920, FLOOR - 200, 28, 200);

        if (!this.phase5PowerComplete) {
            ctx.fillStyle = "rgba(14, 31, 24, 0.85)";
            ctx.fillRect(2778, FLOOR - 180, 142, 180);
            ctx.fillStyle = "#f0d966";
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("USINA EM", 2849, FLOOR - 105);
            ctx.fillText("AJUSTE", 2849, FLOOR - 85);
        }
        ctx.restore();
    }

    drawPhase5LagoonSector(ctx) {
        const FLOOR = this.phase5Floor || 448;

        // Complexo de tratamento: três tanques separados, com paredes de
        // concreto, água em camadas e identificação educativa. O desenho
        // fica acima da água e mantém a passarela livre para o jogador.
        ctx.save();
        const tanks = [
            { x: 3040, w: 350, label: '1  DECANTAÇÃO', water: '#4e7880', rim: '#8a7650' },
            { x: 3440, w: 350, label: '2  AERAÇÃO', water: '#2e8394', rim: '#4d9eb0' },
            { x: 3840, w: 350, label: '3  POLIMENTO', water: '#3c9c91', rim: '#6dc5a7' },
            { x: 4240, w: 350, label: '4  ÁGUA LIMPA', water: '#4cae9e', rim: '#9ad9a0' }
        ];
        ctx.fillStyle = '#18363b';
        ctx.fillRect(3000, FLOOR - 18, 1640, 160);
        ctx.fillStyle = '#254d55';
        ctx.fillRect(3000, FLOOR + 35, 1640, 105);

        tanks.forEach((tank, index) => {
            const top = FLOOR - 4;
            const height = 119;
            ctx.fillStyle = '#5f7475';
            ctx.fillRect(tank.x, top, tank.w, height);
            ctx.fillStyle = '#314c50';
            ctx.fillRect(tank.x + 9, top + 12, tank.w - 18, height - 14);
            ctx.fillStyle = tank.water;
            ctx.fillRect(tank.x + 18, top + 28, tank.w - 36, height - 43);
            // Faixas pixeladas de água e reflexos
            for (let stripe = 0; stripe < 4; stripe++) {
                const sx = tank.x + 28 + ((stripe * 57 + index * 23) % 170);
                ctx.fillStyle = stripe % 2 ? 'rgba(190, 244, 225, .52)' : 'rgba(116, 223, 226, .5)';
                ctx.fillRect(sx, top + 42 + stripe * 13, 48 + (stripe % 2) * 23, 3);
            }
            ctx.fillStyle = '#c7d3c0';
            ctx.fillRect(tank.x - 4, top - 8, tank.w + 8, 10);
            ctx.fillStyle = tank.rim;
            ctx.fillRect(tank.x + 8, top - 5, tank.w - 16, 4);
            ctx.strokeStyle = '#172d31';
            ctx.lineWidth = 3;
            ctx.strokeRect(tank.x, top, tank.w, height);

            // Placa de cada etapa do tratamento
            this.drawPhase5RoundedRect(ctx, tank.x + 74, top - 53, 202, 34, 6);
            ctx.fillStyle = 'rgba(8, 30, 32, .95)';
            ctx.fill();
            ctx.strokeStyle = tank.rim;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#f1ffd0';
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(tank.label, tank.x + 175, top - 32);
        });

        // Tubos de transferência entre os tanques
        ctx.strokeStyle = '#bdd3c3';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(3389, FLOOR + 20); ctx.lineTo(3440, FLOOR + 20);
        ctx.moveTo(3789, FLOOR + 20); ctx.lineTo(3840, FLOOR + 20);
        ctx.moveTo(4189, FLOOR + 20); ctx.lineTo(4240, FLOOR + 20);
        ctx.stroke();
        ctx.strokeStyle = '#31565a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Aeradores flutuantes: recorte da imagem somente na parte da máquina
        // para não trazer a grande área azul embutida no arquivo de referência.
        const aeratorImg = this.assets['sc_lagoa_aerador'];
        const aerators = this.phase5Aerators || [];

        aerators.forEach((a, index) => {
            const bob = a.active ? Math.sin((this.gameTime || 0) * 4 + index) * 3 : 0;
            ctx.globalAlpha = a.active ? 1.0 : 0.75;
            if (aeratorImg && aeratorImg.complete && aeratorImg.naturalWidth > 0) {
                const sourceH = Math.floor((aeratorImg.naturalHeight || 922) * 0.68);
                ctx.drawImage(aeratorImg, 0, 0, aeratorImg.naturalWidth || 1024, sourceH, a.x - 86, FLOOR - 164 + bob, 172, 118);
            } else {
                this.drawPhase5AeratorFallback(ctx, a.x, FLOOR - 164 + bob);
            }
            ctx.globalAlpha = 1.0;

            // Flutuadores estreitos, alinhados com o tanque.
            ctx.fillStyle = '#1595bf';
            ctx.fillRect(a.x - 55, FLOOR + 12 + bob, 42, 14);
            ctx.fillRect(a.x + 13, FLOOR + 12 + bob, 42, 14);
            ctx.fillStyle = '#91e5e4';
            ctx.fillRect(a.x - 48, FLOOR + 15 + bob, 27, 3);
            ctx.fillRect(a.x + 20, FLOOR + 15 + bob, 27, 3);

            // Water spray & oxygen rings if active
            if (a.active) {
                const ringPulse = 0.45 + Math.sin((this.gameTime || 0) * 8 + index) * 0.2;
                ctx.strokeStyle = `rgba(138, 232, 255, ${ringPulse})`;
                ctx.lineWidth = 3;
                for (let ring = 0; ring < 3; ring++) {
                    ctx.beginPath();
                    ctx.ellipse(a.x, FLOOR + 45, 45 + ring * 18, 9 + ring * 4, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            // Painel elevado, fora da máquina e sem círculo azul por trás.
            const panelY = FLOOR - 215;
            this.drawPhase5RoundedRect(ctx, a.x - 72, panelY, 144, 56, 7);
            ctx.fillStyle = a.active ? "#2cc874" : "#142d28";
            ctx.fill();
            ctx.strokeStyle = a.active ? "#bff37a" : "#f1cb58";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.strokeStyle = '#8ba9a1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(a.x, panelY + 56);
            ctx.lineTo(a.x, FLOOR - 166);
            ctx.stroke();

            ctx.fillStyle = "#efffe9";
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = "center";
            ctx.fillText(`AERADOR ${index + 1}`, a.x, panelY + 21);
            ctx.fillStyle = a.active ? "#e3ffc9" : "#ffdf72";
            ctx.fillText(a.active ? "LIGADO ✓" : "LIGAR [ESPAÇO]", a.x, panelY + 42);

            if (this.phase5Stage === 'TO_LAGOONS' && !a.active && Math.abs((this.player.x + this.player.w / 2) - a.x) <= 100) {
                this.drawPhase5WorldPrompt(ctx, "ESPAÇO / E: LIGAR AERADOR", `Ativar oxigenação #${index + 1}`, a.x, panelY - 25);
            }
        });

        // Piso técnico contínuo, sem a antiga ponte marrom e sem corrimão
        // atravessando a foto. A faixa continua sendo o piso jogável acima
        // dos tanques para não alterar a movimentação do Cajulim.
        ctx.fillStyle = '#718486';
        ctx.fillRect(3010, FLOOR, 1570, 24);
        ctx.fillStyle = '#c4d0c4';
        ctx.fillRect(3010, FLOOR, 1570, 6);
        ctx.fillStyle = '#263a40';
        ctx.fillRect(3010, FLOOR + 19, 1570, 5);
        ctx.fillStyle = '#9cb2a7';
        for (let x = 3022; x < 4570; x += 84) ctx.fillRect(x, FLOOR + 8, 42, 4);
        ctx.fillStyle = '#53686c';
        for (let x = 3060; x < 4570; x += 170) ctx.fillRect(x, FLOOR - 3, 10, 3);

        ctx.restore();
    }

    drawPhase5AeratorFallback(ctx, x, y) {
        ctx.save();
        // Estrutura mecânica compacta em pixel art para conexões lentas.
        ctx.fillStyle = '#163b53';
        ctx.fillRect(x - 38, y + 35, 76, 45);
        ctx.fillStyle = '#2b6d8c';
        ctx.fillRect(x - 28, y + 9, 56, 34);
        ctx.fillStyle = '#81cfe0';
        ctx.fillRect(x - 20, y + 16, 40, 7);
        ctx.fillStyle = '#0b2436';
        ctx.fillRect(x - 13, y + 26, 26, 12);
        ctx.fillStyle = '#e0b34d';
        ctx.fillRect(x - 45, y + 49, 90, 6);
        ctx.fillStyle = '#26a9cf';
        ctx.fillRect(x - 61, y + 75, 43, 13);
        ctx.fillRect(x + 18, y + 75, 43, 13);
        ctx.fillStyle = '#9ce9ef';
        ctx.fillRect(x - 55, y + 78, 28, 3);
        ctx.fillRect(x + 24, y + 78, 28, 3);
        if (this.phase5PowerComplete) {
            ctx.fillStyle = 'rgba(180, 246, 255, .75)';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(x - 20 + i * 11, y - 4 - (i % 2) * 7, 4, 4);
            }
        }
        ctx.restore();
    }

    drawPhase5Lab(ctx) {
        const FLOOR = this.phase5Floor || 448;
        ctx.save();

        // ETE Analytical Laboratory Building
        const labX = 4630;
        const labY = FLOOR - 200;
        const labW = 370;
        const labH = 200;

        ctx.fillStyle = "#e9ead6";
        ctx.fillRect(labX, labY, labW, labH);
        ctx.fillStyle = "#376b64";
        ctx.fillRect(labX - 15, labY - 22, labW + 30, 26);

        // Header signboard
        ctx.fillStyle = "#143b33";
        this.drawPhase5RoundedRect(ctx, labX + 60, labY + 12, 250, 36, 6);
        ctx.fill();
        ctx.fillStyle = "#c9f39c";
        ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("LABORATÓRIO ETE", labX + 185, labY + 34);

        // Windows
        ctx.fillStyle = "#5eb9d1";
        ctx.fillRect(labX + 25, labY + 65, 75, 55);
        ctx.fillRect(labX + 225, labY + 65, 75, 55);
        ctx.strokeStyle = "#173d39";
        ctx.lineWidth = 5;
        ctx.strokeRect(labX + 25, labY + 65, 75, 55);
        ctx.strokeRect(labX + 225, labY + 65, 75, 55);

        // Door
        ctx.fillStyle = "#173d39";
        ctx.fillRect(labX + 130, labY + 80, 65, 120);
        ctx.fillStyle = this.phase5AnalysisDone ? "#68e097" : "#f0d36b";
        ctx.beginPath();
        ctx.arc(labX + 182, labY + 135, 7, 0, Math.PI * 2);
        ctx.fill();

        // Sample analysis kiosk on the right
        this.drawPhase5RoundedRect(ctx, 5030, FLOOR - 130, 115, 130, 8);
        ctx.fillStyle = "#20483e";
        ctx.fill();
        ctx.strokeStyle = "#64cde4";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#e9fff2";
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("AMOSTRA", 5087, FLOOR - 100);
        ctx.fillStyle = "#78d7ea";
        ctx.fillRect(5057, FLOOR - 85, 60, 38);

        ctx.fillStyle = this.phase5AnalysisDone ? "#72eb9f" : "#eef8cf";
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(this.phase5AnalysisDone ? "pH 7.0 ✓" : "AGUARDE", 5087, FLOOR - 24);

        ctx.restore();

        if (this.phase5Stage === 'TO_LAB' && Math.abs((this.player.x + this.player.w / 2) - 4810) <= 130) {
            this.drawPhase5WorldPrompt(ctx, "ESPAÇO / E: ANALISAR AMOSTRA", "Laudo Químico & pH", 4810, FLOOR - 235);
        }
    }

    drawPhase5InteractionPrompts(ctx) {
        // Prompts are drawn in their respective sector draw methods above for world-space proximity!
    }

    drawPhase5WorldPrompt(ctx, text, subtext, x, y) {
        const pulse = 0.94 + Math.sin((this.phase5TipPulse || 0) * 7) * 0.06;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);

        const isMobile = (typeof window !== 'undefined' && (
            (window.location && window.location.pathname && window.location.pathname.includes('celular')) ||
            ('ontouchstart' in window) ||
            (navigator && navigator.maxTouchPoints > 0)
        ));
        let displayText = text;
        if (isMobile && text.includes("ESPAÇO")) {
            displayText = text.replace(/ESPAÇO(\s*\/\s*E)?/g, "TOQUE / BOTÃO A");
        }

        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        const w = Math.max(210, ctx.measureText(displayText).width + 36);
        const h = subtext ? 42 : 32;

        this.drawPhase5RoundedRect(ctx, -w / 2, -h / 2, w, h, 8);
        ctx.fillStyle = "rgba(5, 25, 17, 0.94)";
        ctx.fill();
        ctx.strokeStyle = "#dff56a";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = "#f5ffd0";
        ctx.textAlign = "center";
        if (subtext) {
            ctx.fillText(displayText, 0, -3);
            ctx.fillStyle = "#86efac";
            ctx.font = '10px "Fredoka", sans-serif';
            ctx.fillText(subtext, 0, 12);
        } else {
            ctx.fillText(displayText, 0, 3);
        }

        // Pointer triangle
        ctx.beginPath();
        ctx.moveTo(-7, h / 2);
        ctx.lineTo(7, h / 2);
        ctx.lineTo(0, h / 2 + 8);
        ctx.closePath();
        ctx.fillStyle = "#dff56a";
        ctx.fill();

        ctx.restore();
    }

    drawPhase5Particles(ctx) {
        if (!this.phase5Particles || this.phase5Particles.length === 0) return;
        ctx.save();
        this.phase5Particles.forEach(p => {
            const alpha = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color || '#facc15';
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        });
        ctx.restore();
    }

    drawPhase5BiogasPanel(ctx) {
        // Screen-space modal dialog (960x540 canvas)
        ctx.fillStyle = "rgba(1, 13, 9, 0.82)";
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const x = 140;
        const y = 80;
        const w = 680;
        const h = 380;

        this.drawPhase5RoundedRect(ctx, x, y, w, h, 16);
        ctx.fillStyle = "#0d2b22";
        ctx.fill();
        ctx.strokeStyle = this.phase5PowerComplete ? "#8ee685" : "#65d9b1";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Header
        ctx.fillStyle = "#efffdc";
        ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("CENTRAL DE BIOGÁS (CH₄)", x + 32, y + 42);
        ctx.fillStyle = "#8acaaa";
        ctx.font = '13px "Fredoka", sans-serif';
        ctx.fillText("O gás metano captado nas células antigas movimenta os motogeradores de energia limpa.", x + 32, y + 68);

        // Gauge Bar
        const gaugeX = x + 50;
        const gaugeY = y + 110;
        const gaugeW = 580;
        const gaugeH = 64;

        this.drawPhase5RoundedRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 10);
        ctx.fillStyle = "#9d473e"; // Red: low/high dangerous zones
        ctx.fill();

        // Yellow intermediate zones
        ctx.fillStyle = "#e0b84c";
        ctx.fillRect(gaugeX + gaugeW * 0.20, gaugeY, gaugeW * 0.15, gaugeH);
        ctx.fillRect(gaugeX + gaugeW * 0.70, gaugeY, gaugeW * 0.15, gaugeH);

        // Green optimal zone (40 - 70 kPa)
        ctx.fillStyle = "#49c579";
        ctx.fillRect(gaugeX + gaugeW * 0.35, gaugeY, gaugeW * 0.35, gaugeH);

        this.drawPhase5RoundedRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 10);
        ctx.strokeStyle = "#efffdc";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Scale Labels
        ctx.fillStyle = "rgba(5, 23, 17, 0.9)";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("BAIXA", gaugeX + 80, gaugeY + 38);
        ctx.fillText("FAIXA IDEAL: 40-70 kPa", gaugeX + gaugeW / 2, gaugeY + 38);
        ctx.fillText("ALTA", gaugeX + gaugeW - 80, gaugeY + 38);

        // Pressure Needle Indicator
        const pNorm = Math.max(0, Math.min(1, ((this.phase5Pressure || 27) - 10) / 85));
        const needleX = gaugeX + pNorm * gaugeW;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(needleX, gaugeY - 14);
        ctx.lineTo(needleX - 10, gaugeY - 30);
        ctx.lineTo(needleX + 10, gaugeY - 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(needleX - 2, gaugeY - 14, 4, gaugeH + 28);

        // Pressure Readout
        const isIdeal = this.phase5Pressure >= 40 && this.phase5Pressure <= 70;
        ctx.fillStyle = isIdeal ? "#8cf09e" : "#ffd36c";
        ctx.font = 'bold 11px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(this.phase5Pressure)} kPa · ${isIdeal ? "PRESSÃO ESTÁVEL (IDEAL)" : "AJUSTE AS VÁLVULAS"}`, x + w / 2, y + 220);

        // Stability Progress Bar
        const prog = Math.min(1, Math.max(0, (this.phase5StableTime || 0) / 6.0));
        this.drawPhase5RoundedRect(ctx, x + 50, y + 250, 580, 28, 8);
        ctx.fillStyle = "#071b14";
        ctx.fill();
        if (prog > 0) {
            this.drawPhase5RoundedRect(ctx, x + 52, y + 252, 576 * prog, 24, 6);
            ctx.fillStyle = this.phase5PowerComplete ? "#79e37e" : "#56c9a0";
            ctx.fill();
        }

        ctx.fillStyle = "#f0fbdc";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(this.phase5PowerComplete ? "USINA 100% OPERACIONAL · POTÊNCIA 10.0 MW" : `ESTABILIDADE DO FLUXO: ${Math.round(prog * 100)}%`, x + w / 2, y + 268);

        // Interactive tactile buttons (PC click & Mobile touch)
        if (this.phase5PowerComplete) {
            const btnPulse = 0.96 + Math.sin((this.gameTime || 0) * 8) * 0.04;
            ctx.save();
            ctx.translate(x + w / 2, y + 315);
            ctx.scale(btnPulse, btnPulse);
            this.drawPhase5RoundedRect(ctx, -190, -18, 380, 36, 10);
            ctx.fillStyle = "#22c55e";
            ctx.fill();
            ctx.strokeStyle = "#86efac";
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("AVANÇAR MISSÃO ▶", 0, 4);
            ctx.restore();
        } else {
            // Left button: Menos Pressão
            this.drawPhase5RoundedRect(ctx, x + 50, y + 295, 170, 34, 8);
            ctx.fillStyle = "#1e3a2f";
            ctx.fill();
            ctx.strokeStyle = "#4ade80";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = "#86efac";
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = "center";
            ctx.fillText("◄ MENOS (-)", x + 135, y + 316);

            // Center button: Sair
            this.drawPhase5RoundedRect(ctx, x + w / 2 - 60, y + 295, 120, 34, 8);
            ctx.fillStyle = "#1e293b";
            ctx.fill();
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = "#cbd5e1";
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillText("SAIR ✕", x + w / 2, y + 316);

            // Right button: Mais Pressão
            this.drawPhase5RoundedRect(ctx, x + w - 220, y + 295, 170, 34, 8);
            ctx.fillStyle = "#1e3a2f";
            ctx.fill();
            ctx.strokeStyle = "#4ade80";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = "#86efac";
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillText("MAIS (+) ►", x + w - 135, y + 316);
        }

        // Instructions Footer
        ctx.fillStyle = "#94d2bd";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(this.phase5PowerComplete ? "CLIQUE OU PRESSIONE ESPAÇO / E / BOTÃO A" : "TOQUE NOS BOTÕES OU USE TECLAS ◄ ESQ / DIR ►", x + w / 2, y + 352);
    }

    drawPhase5AnalysisPanel(ctx) {
        // Screen-space modal dialog (960x540 canvas)
        ctx.fillStyle = "rgba(1, 13, 9, 0.75)";
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const x = 200;
        const y = 140;
        const w = 560;
        const h = 260;

        this.drawPhase5RoundedRect(ctx, x, y, w, h, 16);
        ctx.fillStyle = "#eff6dc";
        ctx.fill();
        ctx.strokeStyle = "#4aaf87";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Cajulim portrait
        const portrait = this.assets['p_portrait'];
        if (portrait && portrait.complete && portrait.naturalWidth > 0) {
            ctx.drawImage(portrait, x + 35, y + 45, 100, 100);
        } else {
            ctx.fillStyle = "#123a2c";
            ctx.fillRect(x + 35, y + 45, 100, 100);
        }

        // Title and description
        ctx.fillStyle = "#123a2c";
        ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("ANÁLISE LABORATORIAL", x + 160, y + 55);
        ctx.font = '13px "Fredoka", sans-serif';
        ctx.fillText("Cajulim afere o efluente tratado na Estação ETE.", x + 160, y + 82);

        // Progress Bar
        const prog = Math.min(1, Math.max(0, (this.phase5AnalysisTime || 0) / 2.8));
        this.drawPhase5RoundedRect(ctx, x + 160, y + 110, 350, 26, 6);
        ctx.fillStyle = "#c8d8c8";
        ctx.fill();
        if (prog > 0) {
            this.drawPhase5RoundedRect(ctx, x + 162, y + 112, 346 * prog, 22, 5);
            ctx.fillStyle = "#4acb88";
            ctx.fill();
        }

        ctx.fillStyle = "#173d30";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(`PROCESSANDO LAUDO: ${Math.round(prog * 100)}%`, x + 160, y + 160);

        ctx.fillStyle = "#477564";
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.fillText("LEITURA DA AMOSTRA: pH 7.0 (ÁGUA PURIFICADA)", x + 160, y + 185);

        if (this.phase5AnalysisDone) {
            ctx.fillStyle = "#15803d";
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillText("✔ TRATAMENTO CONCLUÍDO COM SUCESSO!", x + 160, y + 215);
        }
    }

    drawPhase5Message(ctx) {
        if (!this.phase5Message) return;
        const alpha = Math.max(0, Math.min(1, this.phase5MessageTimer < 0.5 ? this.phase5MessageTimer * 2 : 1));
        ctx.save();
        ctx.globalAlpha = alpha;

        const msg = this.phase5Message;
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        const msgW = Math.min(840, Math.max(480, ctx.measureText(msg).width + 120));
        const boxX = (VIRTUAL_WIDTH - msgW) / 2;
        const boxY = 114;
        const boxH = 58;

        this.drawPhase5RoundedRect(ctx, boxX, boxY, msgW, boxH, 12);
        ctx.fillStyle = "rgba(5, 26, 18, 0.94)";
        ctx.fill();
        ctx.strokeStyle = "#d8ef6a";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Cajulim mini avatar
        const portrait = this.assets['p_portrait'];
        if (portrait && portrait.complete && portrait.naturalWidth > 0) {
            ctx.drawImage(portrait, boxX + 10, boxY + 6, 46, 46);
        }

        ctx.fillStyle = "#d9f36d";
        ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText("CAJULIM INFORMA:", boxX + 68, boxY + 20);

        ctx.fillStyle = "#fff8da";
        ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
        ctx.fillText(msg, boxX + 68, boxY + 40);

        ctx.restore();
    }

    drawPhase5RoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    renderPhase7(ctx) {
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

    // Isolated Fase 7 boss presentation: the sprite carries the Barão's
    // identity while the canvas overlay makes the tracked wheels visibly turn.
    renderPhase7BossSprite(ctx, boss) {
        const sprite = this.assets['sc_mecha_boss_pixel'];
        if (!sprite || !sprite.complete || !(sprite.naturalWidth || sprite.width)) return false;

        const spriteW = 270;
        const spriteH = 180;
        const bob = boss.state === 'DRIVE' ? Math.sin((this.gameTime || 0) * 5) * 1.2 : 0;
        const shakeX = (boss.state === 'RAM_PREP' || boss.state === 'HURT') ? (Math.random() - 0.5) * 5 : 0;
        const shakeY = (boss.state === 'RAM_PREP' || boss.state === 'HURT') ? (Math.random() - 0.5) * 3 : 0;

        ctx.save();
        ctx.translate(boss.x + boss.w / 2 + shakeX, boss.y + boss.h + shakeY - bob);
        ctx.scale(boss.facing || 1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, -spriteW / 2, -spriteH, spriteW, spriteH);

        // Two large sprocket hubs sit over the sprite's track artwork. Their
        // rotating spokes remain legible at the 960x540 game resolution.
        const wheelAngle = (boss.wheel || 0) * 0.18;
        const wheels = [
            { x: -82, y: -41, r: 10 },
            { x: 2, y: -41, r: 10 }
        ];
        wheels.forEach((wheel, index) => {
            ctx.save();
            ctx.translate(wheel.x, wheel.y);
            ctx.fillStyle = 'rgba(20, 24, 35, 0.94)';
            ctx.beginPath();
            ctx.arc(0, 0, wheel.r + 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = index === 0 ? '#c7831a' : '#dda32a';
            ctx.beginPath();
            ctx.arc(0, 0, wheel.r - 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#f4cf67';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, wheel.r - 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.rotate(wheelAngle + index * 0.35);
            ctx.strokeStyle = '#5b3a1d';
            ctx.lineWidth = 1.5;
            for (let spoke = 0; spoke < 4; spoke++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(wheel.r - 3, 0);
                ctx.stroke();
            }
            ctx.fillStyle = '#d9e1e8';
            ctx.fillRect(-2, -2, 4, 4);
            ctx.restore();
        });

        // Moving tread glints communicate forward/reverse motion between
        // the larger hubs without hiding the generated pixel clusters.
        const treadOffset = ((boss.wheel || 0) % 14 + 14) % 14;
        ctx.fillStyle = 'rgba(245, 194, 61, 0.8)';
        for (let tx = -112 + treadOffset; tx < 27; tx += 28) {
            ctx.fillRect(tx, -8, 7, 2);
        }
        ctx.restore();

        if (boss.invulnerableTimer <= 0 && boss.state !== 'HURT') {
            const arrowY = boss.y - 30 + Math.sin((this.gameTime || 0) * 5.5) * 5;
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#f43f5e';
            ctx.textAlign = 'center';
            ctx.fillText('▼ PULE NO CAPÔ! ▼', boss.x + boss.w / 2, arrowY);
        }
        return true;
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

        // The test copy uses the new transparent pixel-art sprite. Keep the
        // original canvas construction below as a safe fallback if an asset
        // is unavailable while loading.
        if (this.renderPhase7BossSprite(ctx, boss)) return;

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

    drawScrollingPanorama(ctx, image, parallaxStrength = 1) {
        if (!image || image.complete === false) return false;
        const sourceWidth = image.naturalWidth || image.width || 2172;
        const sourceHeight = image.naturalHeight || image.height || 724;
        const panoramaWidth = Math.max(VIRTUAL_WIDTH, VIRTUAL_HEIGHT * (sourceWidth / sourceHeight));
        const imageTravel = Math.max(0, panoramaWidth - VIRTUAL_WIDTH);
        const worldTravel = Math.max(1, (this.levelWidth || VIRTUAL_WIDTH) - VIRTUAL_WIDTH);
        const progress = Math.max(0, Math.min(1, (this.camera.x || 0) / worldTravel));
        const pan = imageTravel * progress * parallaxStrength;
        ctx.drawImage(image, -Math.round(Math.min(imageTravel, pan)), 0, panoramaWidth, VIRTUAL_HEIGHT);
        return true;
    }

    renderBackground(ctx) {
        if (this.currentPhase === 2) {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
            if (this.isRaining) {
                skyGrad.addColorStop(0, '#1e293b');
                skyGrad.addColorStop(0.65, '#334155');
                skyGrad.addColorStop(1, '#475569');
            } else {
                skyGrad.addColorStop(0, '#52a2ff');
                skyGrad.addColorStop(0.65, '#a1e6ff');
                skyGrad.addColorStop(1, '#e3f7ff');
            }
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

            // Panorama urbano de Parnamirim com casas e prédios. A imagem longa
            // percorre o bairro sem repetir placas ou criar cortes verticais.
            const centroImg = this.assets['sc_parnamirim_centro'];
            this.drawScrollingPanorama(ctx, centroImg);
        } else if (this.currentPhase === 3) {
            // Phase 3: Neighborhood Collection Route - Bright Parnamirim Morning Sky
            const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
            skyGrad.addColorStop(0, '#4fc5ed');
            skyGrad.addColorStop(0.55, '#d9f2cc');
            skyGrad.addColorStop(1, '#78ad64');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

            // Radiant morning sun
            ctx.fillStyle = 'rgba(255, 241, 156, .95)';
            ctx.beginPath();
            ctx.arc(820, 95, 38, 0, Math.PI * 2);
            ctx.fill();

            // Procedural clouds
            ctx.fillStyle = 'rgba(255, 255, 255, .78)';
            for (let i = 0; i < 5; i++) {
                const cx = ((i * 260 - (this.camera.x || 0) * 0.08) % 1200) - 60;
                const cy = 90 + (i % 2) * 35;
                ctx.beginPath();
                ctx.arc(cx, cy, 26, 0, Math.PI * 2);
                ctx.arc(cx + 30, cy - 10, 34, 0, Math.PI * 2);
                ctx.arc(cx + 65, cy, 24, 0, Math.PI * 2);
                ctx.fill();
            }

            // Distant green silhouettes
            ctx.fillStyle = '#589a77';
            for (let x = 0; x < this.levelWidth; x += 150) {
                const h = 55 + ((x * 17) % 65);
                const drawX = x - (this.camera.x || 0);
                if (drawX > -160 && drawX < VIRTUAL_WIDTH + 160) {
                    ctx.fillRect(drawX, 350 - h, 120, h);
                }
            }

            // Varied neighborhood facades
            if (this.phase2Buildings) {
                for (const b of this.phase2Buildings) {
                    const drawX = b.x - (this.camera.x || 0);
                    if (drawX + b.w < -100 || drawX > VIRTUAL_WIDTH + 100) continue;
                    const top = 370 - b.h;
                    ctx.fillStyle = b.color;
                    ctx.fillRect(drawX, top, b.w, b.h);
                    ctx.fillStyle = b.roof;
                    ctx.fillRect(drawX - 8, top - 12, b.w + 16, 14);

                    // Windows
                    ctx.fillStyle = '#bce9e5';
                    ctx.strokeStyle = '#174b59';
                    ctx.lineWidth = 3;
                    for (let wx = drawX + 20; wx < drawX + b.w - 18; wx += 48) {
                        ctx.fillRect(wx, top + 26, 26, 30);
                        ctx.strokeRect(wx, top + 26, 26, 30);
                    }
                    // Door
                    ctx.fillStyle = '#4e3a2c';
                    ctx.fillRect(drawX + b.w / 2 - 18, top + b.h - 52, 36, 52);
                }
            }

            // Roadside trees and bushes
            const treeImg = this.assets['sc_tree'];
            const bushImg = this.assets['sc_bush'];
            for (let x = 500; x < 4200; x += 420) {
                const drawX = x - (this.camera.x || 0);
                if (drawX > -150 && drawX < VIRTUAL_WIDTH + 150) {
                    if (treeImg) ctx.drawImage(treeImg, drawX, 255, 100, 125);
                    if (bushImg) ctx.drawImage(bushImg, drawX + 70, 345, 65, 36);
                }
            }

            // Sidewalk and curb
            ctx.fillStyle = '#d9c9a0';
            ctx.fillRect(0, 370, VIRTUAL_WIDTH, 52);
            ctx.fillStyle = '#f2e5c1';
            ctx.fillRect(0, 370, VIRTUAL_WIDTH, 8);
            ctx.strokeStyle = 'rgba(91,75,55,.3)';
            ctx.lineWidth = 1.5;
            const sidewalkOff = - ((this.camera.x || 0) % 70);
            for (let x = sidewalkOff; x < VIRTUAL_WIDTH + 70; x += 70) {
                ctx.beginPath();
                ctx.moveTo(x, 378);
                ctx.lineTo(x + 18, 422);
                ctx.stroke();
            }

            // Asphalt road
            ctx.fillStyle = '#26333c';
            ctx.fillRect(0, 422, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - 422);
            ctx.fillStyle = '#111b24';
            ctx.fillRect(0, this.phase2Floor + 14, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - this.phase2Floor - 14);

            // Center yellow road stripes
            ctx.fillStyle = '#f3c84f';
            const roadDashOff = - ((this.camera.x || 0) % 160);
            for (let x = roadDashOff; x < VIRTUAL_WIDTH + 160; x += 160) {
                ctx.fillRect(x, 505, 85, 5);
            }
            ctx.fillStyle = '#e6edf0';
            ctx.fillRect(0, 422, VIRTUAL_WIDTH, 4);

            // Panorama longo exclusivo: altera apenas a aparência da fase 3,
            // preservando caminhão, paradas, NPC e todas as regras de coleta.
            this.drawScrollingPanorama(ctx, this.assets['sc_phase3_bairros_bg']);

        } else if (this.currentPhase === 4) {
            const highwayImg = this.assets['sc_phase4_transbordo_bg'];
            if (!this.drawScrollingPanorama(ctx, highwayImg)) {
                const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
                skyGrad.addColorStop(0, '#312e81');
                skyGrad.addColorStop(0.55, '#c2410c');
                skyGrad.addColorStop(1, '#fb923c');
                ctx.fillStyle = skyGrad;
                ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
            }
        } else if (this.currentPhase === 6) {
            this.renderPhase5Background(ctx);
        } else if (this.currentPhase === 7) {
            // Phase 7: Sanitary Landfill & Green Energy
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
        } else if (this.currentPhase === 8) {
            // Phase 8: Boss Arena over the polluted urban plaza
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
            // Phase 3 Urban Twilight Sunset (Old Phase 2 Highway to Transbordo)
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

    renderPhase3Decorations(ctx) {
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
        if (this.currentPhase !== 4 || !this.trafficLights) return;

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
            if (!b.hit && b.type === 'recycle') img = recycleImg;
            else if (!b.hit && b.type === 'question') img = questionImg;

            if (img && img.complete && (img.naturalWidth === undefined || img.naturalWidth > 0)) {
                ctx.drawImage(img, b.x, drawY, b.w, b.h);
            } else {
                this.drawPhase2BlockFallback(ctx, b, drawY);
            }
        }
    }

    drawPhase2BlockFallback(ctx, block, drawY) {
        const brick = block.hit || block.type === 'brick';
        ctx.save();
        ctx.fillStyle = brick ? '#b55229' : (block.type === 'recycle' ? '#1f9d67' : '#e6a100');
        ctx.strokeStyle = brick ? '#5d2b1c' : '#5b3510';
        ctx.lineWidth = 3;
        ctx.fillRect(block.x, drawY, block.w, block.h);
        ctx.strokeRect(block.x + 1, drawY + 1, block.w - 2, block.h - 2);
        if (brick) {
            ctx.strokeStyle = '#7b3b24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(block.x + 2, drawY + block.h / 2);
            ctx.lineTo(block.x + block.w - 2, drawY + block.h / 2);
            ctx.moveTo(block.x + block.w / 2, drawY + 2);
            ctx.lineTo(block.x + block.w / 2, drawY + block.h / 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#fff4bd';
            ctx.font = '900 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(block.type === 'question' ? '?' : '↻', block.x + block.w / 2, drawY + block.h / 2 + 1);
        }
        ctx.restore();
    }

    drawPhase5BiogasFallback(ctx, FLOOR) {
        const x = 1980;
        const top = FLOOR - 205;
        const w = 480;
        const h = 205;
        ctx.save();

        // Galpão do gerador
        ctx.fillStyle = '#164b3d';
        ctx.fillRect(x + 138, top + 48, 322, h - 48);
        ctx.fillStyle = '#1f7456';
        ctx.fillRect(x + 128, top + 38, 342, 18);
        ctx.fillStyle = '#0c3029';
        ctx.fillRect(x + 145, top + 55, 294, 7);
        ctx.strokeStyle = '#09241f';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 138, top + 48, 322, h - 48);

        // Telhado de chapas e janelas
        ctx.fillStyle = '#2e9b6e';
        ctx.beginPath();
        ctx.moveTo(x + 122, top + 40);
        ctx.lineTo(x + 160, top + 8);
        ctx.lineTo(x + 438, top + 8);
        ctx.lineTo(x + 474, top + 40);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0a3328';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#bde8d3';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 164 + i * 36, top + 22, 22, 16);
            ctx.strokeStyle = '#123d32';
            ctx.strokeRect(x + 164 + i * 36, top + 22, 22, 16);
        }

        // Porta, turbina e placa
        ctx.fillStyle = '#0a2723';
        ctx.fillRect(x + 160, top + 92, 74, 108);
        ctx.fillStyle = '#e9d56d';
        ctx.fillRect(x + 255, top + 76, 142, 38);
        ctx.fillStyle = '#123c31';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BIOGÁS', x + 326, top + 92);
        ctx.fillStyle = '#55d28c';
        ctx.fillRect(x + 273, top + 132, 115, 67);
        ctx.fillStyle = '#0a2b24';
        ctx.fillRect(x + 288, top + 147, 84, 37);
        ctx.fillStyle = '#f6dd76';
        ctx.fillRect(x + 307, top + 158, 47, 13);

        // Digestor vertical e painel de válvulas
        ctx.fillStyle = '#496d70';
        ctx.fillRect(x + 42, top + 82, 54, 112);
        ctx.fillStyle = '#8ab3af';
        ctx.fillRect(x + 50, top + 91, 38, 94);
        ctx.strokeStyle = '#122e2c';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 42, top + 82, 54, 112);
        ctx.fillStyle = '#172f2d';
        ctx.fillRect(x + 8, top + 75, 25, 119);
        ctx.fillStyle = '#d8e8c7';
        ctx.fillRect(x + 12, top + 88, 17, 20);
        ctx.fillRect(x + 12, top + 116, 17, 20);
        ctx.fillStyle = '#e4c34d';
        ctx.beginPath(); ctx.arc(x + 20, top + 159, 7, 0, Math.PI * 2); ctx.fill();

        // Torre de queima e tubulação
        ctx.fillStyle = '#6c7f84';
        ctx.fillRect(x + 105, top + 18, 16, 177);
        ctx.fillStyle = '#d6a64c';
        ctx.fillRect(x + 98, top + 12, 30, 12);
        ctx.fillStyle = '#ffbc32';
        ctx.beginPath();
        ctx.moveTo(x + 103, top + 12); ctx.lineTo(x + 113, top - 20); ctx.lineTo(x + 123, top + 12); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#436d62';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x + 94, top + 194); ctx.lineTo(x + 94, top + 198); ctx.lineTo(x + 300, top + 198);
        ctx.lineTo(x + 300, top + 188);
        ctx.stroke();
        ctx.restore();
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
        // The landfill simulation has no damage hazards: never hide Cajulim there.
        if (this.currentPhase !== 7 && p.invulnerableTimer > 0 && Math.floor(p.invulnerableTimer * 10) % 2 === 0) return;

        ctx.save();
        const px = isNaN(p.x) ? 3450 : p.x;
        const py = isNaN(p.y) ? 344 : p.y;
        const pw = p.w || 48;
        const ph = p.h || 76;
        const facing = (p.facing === -1) ? -1 : 1;

        // Cajulim planted with feet touching ground / catwalk
        ctx.translate(Math.floor(px + pw / 2), Math.floor(py + ph + 2));
        ctx.scale(facing, 1);

        let key = 'p_idle_0';
        if (p.animState === 'walk') key = `p_walk_${Math.abs(p.animFrame || 0) % 8}`;
        else if (p.animState === 'jump') key = `p_jump_${Math.min(3, Math.max(0, p.animFrame || 0))}`;
        else if (p.animState === 'collect') key = (p.animFrame || 0) === 0 ? 'p_collect_0' : 'p_collect_1';
        else if (p.animState === 'win') key = 'p_win';
        else key = `p_idle_${Math.abs(p.animFrame || 0) % 4}`;

        const img = this.assets[key] || this.assets['p_idle_0'] || this.assets['p_walk_0'];
        const isStreetCollectionHero = this.currentPhase === 2;
        const drawW = isStreetCollectionHero ? 80 : 56;
        const drawH = isStreetCollectionHero ? 120 : 80;

        if (img) {
            ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
        } else {
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
        }

        // In the landfill lagoons: high-visibility indicator above Cajulim.
        if (this.currentPhase === 7) {
            const bounce = Math.sin((this.gameTime || 0) * 8) * 3;
            ctx.save();
            ctx.scale(facing, 1); // Unflip text so it's always readable left-to-right
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fef08a';
            ctx.fillText('▼ CAJULIM', 0, -drawH - 6 + bounce);
            ctx.restore();
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
        if (this.currentPhase === 2) {
            const trashIcon = this.assets['item_trash_bag'];
            if (trashIcon) ctx.drawImage(trashIcon, 118, 10, 22, 26);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`LIXO: ${this.trashCollected}/${this.totalTrash}`, 144, 28);

            ctx.fillStyle = '#facc15';
            ctx.fillText(`RECICLÁVEIS: ${this.recyclablesCollected}/${this.totalRecyclables}`, 272, 28);
        } else if (this.currentPhase === 3) {
            const trashIcon = this.assets['item_trash_bag'];
            if (trashIcon) ctx.drawImage(trashIcon, 116, 10, 20, 26);
            ctx.fillStyle = '#22c55e';
            ctx.fillText(`CARGA: ${this.phase2Collected || 0}/${this.phase2TotalBags || 10}`, 140, 28);

            const kmh = Math.round(Math.abs((this.phase2Truck ? this.phase2Truck.speed : 0) * 0.22));
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`VEL: ${kmh}km/h`, 272, 28);

            const gap = this.phase2Truck && this.phase2Npc ? Math.max(0, this.phase2Truck.x - (this.phase2Npc.x + this.phase2Npc.w)) : 0;
            ctx.fillStyle = gap > 260 ? '#facc15' : '#86efac';
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillText(gap > 260 ? 'ESPERE!' : 'CAJULIM ✓', 382, 28);
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        } else if (this.currentPhase === 4) {
            const bioIcon = this.assets['item_biodiesel'];
            if (bioIcon) ctx.drawImage(bioIcon, 118, 10, 20, 26);
            ctx.fillStyle = '#22c55e';
            ctx.fillText(`BIODIESEL: ${this.biodieselCollected}/${this.totalBiodiesel}`, 142, 28);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`REPAROS: ${this.wrenchesCollected}/${this.totalWrenches}`, 320, 28);
        } else if (this.currentPhase === 5) {
            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            const loadPct = Math.min(100, Math.round(this.dumpProgress || 0));
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`CARRETA: ${(this.trailerLoad || 0).toFixed(1)}/30t (${loadPct}%)`, 115, 28);

            ctx.fillStyle = '#facc15';
            ctx.fillText(`CAMINHÃO: ${this.currentTruckIndex || 1}/4`, 335, 28);
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        } else if (this.currentPhase === 6) {
            // Speedometer
            const spd = Math.round(this.speedKmh || 0);
            if (spd > 78) ctx.fillStyle = '#ef4444';
            else if (spd >= 40 && spd <= 75) ctx.fillStyle = '#22c55e';
            else ctx.fillStyle = '#facc15';
            ctx.fillText(`VEL: ${spd}km/h`, 114, 28);

            // Stability bar
            const stab = Math.round(this.phase5Stability !== undefined ? this.phase5Stability : 100);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`ESTAB:`, 232, 28);
            const barX = 282;
            const barY = 16;
            const barW = 54;
            const barH = 14;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = stab > 70 ? '#22c55e' : (stab > 40 ? '#eab308' : '#ef4444');
            ctx.fillRect(barX, barY, Math.floor((barW * stab) / 100), barH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);
            ctx.font = 'bold 7px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${stab}%`, barX + barW + 4, 27);

            // Rota %
            const distPct = Math.round((this.phase5Distance || 0) * 100);
            ctx.font = 'bold 8px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`ROTA: ${distPct}%`, 382, 28);
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        } else if (this.currentPhase === 7) {
            const info = this.getPhase5StageInfo();
            ctx.fillStyle = '#86efac';
            ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
            ctx.fillText(`SETOR ${info[0]}/3: ${info[1]}`, 115, 28);
            ctx.fillStyle = '#facc15';
            ctx.fillText(info[3], 340, 28);
            ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        } else if (this.currentPhase === 8) {
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
        if (this.currentPhase === 2) {
            ctx.fillText('1. CASA ✓ | FASE 2: PEGA O LIXO ★ | 3. COLETOR | 4. RODOVIA | 5. TRANSBORDO | 6. CARRETA | 7. ATERRO | 8. CHEFÃO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 3) {
            ctx.fillText('1. CASA ✓ | 2. LIXO ✓ | FASE 3: ROTA COLETOR 🚛 ★ | 4. RODOVIA | 5. TRANSBORDO | 6. CARRETA | 7. ATERRO | 8. CHEFÃO', VIRTUAL_WIDTH / 2, 62);

            // Persistent Mission & Controls Guide Banner for Phase 2
            ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
            ctx.fillRect(10, 68, VIRTUAL_WIDTH - 20, 36);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(10, 68, VIRTUAL_WIDTH - 20, 36);

            ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#facc15';
            ctx.textAlign = 'left';
            ctx.fillText(`🎯 OBJETIVO: ${this.getPhase2MissionText()}`, 20, 81);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText('🎮 CONTROLES: [A/D ou ◄/►] Pilotar | [ESPAÇO/▼] Frear e Parar na Faixa Amarela', 20, 96);
            ctx.textAlign = 'center';
        } else if (this.currentPhase === 4) {
            ctx.fillText('1. CASA ✓ | 2. LIXO ✓ | 3. COLETOR ✓ | FASE 4: RODOVIA 🚚 ★ | 5. TRANSBORDO | 6. CARRETA | 7. ATERRO | 8. CHEFÃO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 5) {
            ctx.fillText('1. CASA ✓ | 2. LIXO ✓ | 3. COLETOR ✓ | 4. RODOVIA ✓ | FASE 5: TRANSBORDO 🚜 ★ | 6. CARRETA | 7. ATERRO | 8. CHEFÃO', VIRTUAL_WIDTH / 2, 62);
        } else if (this.currentPhase === 6) {
            ctx.fillText('1. CASA ✓ | 2. LIXO ✓ | 3. COLETOR ✓ | 4. RODOVIA ✓ | 5. TRANSBORDO ✓ | FASE 6: CARRETA 🚛 ★ | 7. ATERRO | 8. CHEFÃO', VIRTUAL_WIDTH / 2, 62);

            // Persistent Mission & Controls Guide Banner for Phase 5
            ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
            ctx.fillRect(10, 68, VIRTUAL_WIDTH - 20, 36);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(10, 68, VIRTUAL_WIDTH - 20, 36);

            ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#facc15';
            ctx.textAlign = 'left';
            ctx.fillText(`🎯 OBJETIVO: ${this.getPhase5RouteMissionText ? this.getPhase5RouteMissionText() : "Conduza a carreta ao aterro e pese na balança."}`, 20, 81);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText('🎮 CONTROLES: [A/D ou ◄/►] Acelerar/Ré | [ESPAÇO/W] Tração 6x4 nas Dunas & Freio no Aterro', 20, 96);
            ctx.textAlign = 'center';
        } else if (this.currentPhase === 7) {
            ctx.fillText('1. CASA ✓ | 2. LIXO ✓ | 3. COLETOR ✓ | 4. RODOVIA ✓ | 5. TRANSBORDO ✓ | 6. CARRETA ✓ | FASE 7: ATERRO 🌱 ★ | 8. CHEFÃO', VIRTUAL_WIDTH / 2, 62);

            if (this.phase5Mode !== 'PANEL' && this.phase5Mode !== 'ANALYSIS') {
                const info = this.getPhase5StageInfo();
                // Persistent Mission & Controls Guide Banner (y: 68 to 104)
                ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
                ctx.fillRect(10, 68, VIRTUAL_WIDTH - 20, 36);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(10, 68, VIRTUAL_WIDTH - 20, 36);

                let ctrlHint = '🎮 CONTROLES: [A/D ou ◄/►] Mover | [W/ESPAÇO] Pular | [E/ESPAÇO] Interagir';
                if (this.phase5Mode === 'TRACTOR') {
                    ctrlHint = '🚜 TRATOR: [A/D ou ◄/►] Pilotar sobre montes A-D | [E/ESPAÇO] Interagir';
                }

                ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
                ctx.fillStyle = '#facc15';
                ctx.textAlign = 'left';
                ctx.fillText(`🎯 OBJETIVO: ${info[2]}`, 20, 81);

                ctx.fillStyle = '#38bdf8';
                ctx.fillText(ctrlHint, 20, 96);

                // Action prompt button if near interactable
                if (this.isNearPhase5Interactable && this.isNearPhase5Interactable()) {
                    const pulse = 0.85 + Math.sin((this.gameTime || 0) * 8) * 0.15;
                    const btnX = 300, btnY = 490, btnW = 360, btnH = 38;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
                    ctx.fillRect(btnX, btnY, btnW, btnH);
                    ctx.strokeStyle = '#facc15';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(btnX, btnY, btnW, btnH);
                    ctx.font = 'bold 9px "Press Start 2P", monospace, sans-serif';
                    ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
                    ctx.textAlign = 'center';
                    ctx.fillText('⚡ [ESPAÇO / E / CLIQUE] EXECUTAR AÇÃO', btnX + btnW / 2, btnY + 23);
                }
            }
        } else if (this.currentPhase === 8) {

            ctx.fillText('1. CASA ✓ | 2. LIXO ✓ | 3. COLETOR ✓ | 4. RODOVIA ✓ | 5. TRANSBORDO ✓ | 6. CARRETA ✓ | 7. ATERRO ✓ | FASE 8: CHEFÃO 👾 ★', VIRTUAL_WIDTH / 2, 62);

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
        const tipY = this.currentPhase === 7
            ? (this.phase5MessageTimer > 0 ? 178 : 114)
            : ((this.currentPhase === 3 || this.currentPhase === 8) ? (VIRTUAL_HEIGHT - 98) : (VIRTUAL_HEIGHT - 60));
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

    renderLoadingScreen(ctx) {
        ctx.fillStyle = '#0a121e';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        const logo = this.assets['ui_parnamirim_logo'];
        if (logo && logo.complete && (logo.naturalWidth === undefined || logo.naturalWidth > 0)) {
            ctx.drawImage(logo, VIRTUAL_WIDTH / 2 - 130, 80, 260, 49);
        }

        ctx.font = 'bold 20px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4ade80';
        ctx.fillText('TURMA DO CAJULIM', VIRTUAL_WIDTH / 2, 175);

        ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText(`CARREGANDO FASE ${this.currentPhase}...`, VIRTUAL_WIDTH / 2, 225);

        const pct = Math.min(100, Math.floor((this.loadedCount / Math.max(1, this.totalAssets)) * 100));
        const barW = 340;
        const barH = 22;
        const barX = (VIRTUAL_WIDTH - barW) / 2;
        const barY = 265;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, barY, Math.floor((barW * pct) / 100), barH);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.font = 'bold 10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${pct}%`, VIRTUAL_WIDTH / 2, barY + 16);

        ctx.font = '9px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Preparando missão ecológica em Parnamirim...', VIRTUAL_WIDTH / 2, 330);
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
            ctx.fillText('FASE 1: CASA VIVA DO CAJULIM 🏠', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 2) {
            ctx.fillText('FASE 2: COLETA SELETIVA NO CENTRO', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 3) {
            ctx.fillText('FASE 3: ROTA DO CAMINHÃO COLETOR', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 4) {
            ctx.fillText('FASE 4: RODOVIA AO TRANSBORDO', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 5) {
            ctx.fillText('FASE 5: JOGA NA CARRETA (TRANSBORDO)', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 6) {
            ctx.fillText('FASE 6: CARRETA AO ATERRO & BALANÇA', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 7) {
            ctx.fillText('FASE 7: ATERRO & USINA VERDE 🌱⚡', VIRTUAL_WIDTH / 2, 370);
        } else if (this.currentPhase === 8) {
            ctx.fillText('FASE 8: O CONFRONTO FINAL (CHEFÃO) 👾', VIRTUAL_WIDTH / 2, 370);
        }

        ctx.font = '11px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Use ← → para Mover | ESPACO para Pular/Turbo | Pule os Buracos!', VIRTUAL_WIDTH / 2, 410);
        ctx.fillText('F: Tela Cheia | M: Som | R: Reiniciar', VIRTUAL_WIDTH / 2, 435);

        const blink = Math.floor(performance.now() / 400) % 2 === 0;
        if (blink) {
            ctx.font = 'bold 14px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#ffff00';
            ctx.fillText('PRESSIONE ENTER OU CLIQUE PARA JOGAR', VIRTUAL_WIDTH / 2, 480);
        }
    }

    startCredits() {
        if (typeof window !== 'undefined' && window.soundManager) {
            if (window.soundManager.stopNarration) window.soundManager.stopNarration();
            if (window.soundManager.stopMusic) window.soundManager.stopMusic();
            if (window.soundManager.playFanfare) window.soundManager.playFanfare();
            if (window.soundManager.startMusic) window.soundManager.startMusic('credits');
        }
        this.cutscene.active = false;
        this.state = 'CREDITS';
        this.camera.x = 0;
        this.camera.y = 0;
        this.credits = {
            elapsed: 0,
            scroll: 0,
            maxScroll: 1886,
            complete: false
        };
    }

    finishCredits() {
        this.credits = null;
        this.switchPhase(1);
        this.state = 'TITLE';
    }

    updateCredits(dt) {
        if (!this.credits) this.startCredits();
        const credits = this.credits;
        credits.elapsed += dt;
        const speed = this.keys.down ? 130 : 38;
        credits.scroll = Math.min(credits.maxScroll, credits.scroll + dt * speed);
        credits.complete = credits.scroll >= credits.maxScroll;
    }

    renderCredits(ctx) {
        const credits = this.credits || { elapsed: 0, scroll: 0, maxScroll: 1886, complete: false };
        const baseY = 42 - credits.scroll;

        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // Pontos de luz lentos dão profundidade sem tirar o aspecto preto e branco.
        for (let index = 0; index < 34; index++) {
            const x = (index * 83 + 29) % VIRTUAL_WIDTH;
            const y = (index * 149 + Math.floor(credits.elapsed * (5 + index % 4))) % VIRTUAL_HEIGHT;
            const alpha = 0.14 + (index % 4) * 0.07;
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillRect(x, y, index % 5 === 0 ? 2 : 1, index % 5 === 0 ? 2 : 1);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.42)';
        ctx.lineWidth = 1;
        ctx.strokeRect(24, 20, VIRTUAL_WIDTH - 48, VIRTUAL_HEIGHT - 40);
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.strokeRect(30, 26, VIRTUAL_WIDTH - 60, VIRTUAL_HEIGHT - 52);

        const visibility = (y) => Math.max(0, Math.min(1, (y + 70) / 90, (VIRTUAL_HEIGHT + 70 - y) / 90));
        const line = (text, offsetY, size = 11, options = {}) => {
            const y = baseY + offsetY;
            if (y < -80 || y > VIRTUAL_HEIGHT + 80) return;
            ctx.save();
            ctx.globalAlpha = visibility(y);
            const weight = options.weight || 'bold';
            const family = options.family || '"Press Start 2P", monospace, sans-serif';
            ctx.font = `${weight} ${size}px ${family}`;
            ctx.fillStyle = options.color || '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(text, VIRTUAL_WIDTH / 2, y);
            ctx.restore();
        };
        const divider = (offsetY, width = 310) => {
            const y = baseY + offsetY;
            if (y < -30 || y > VIRTUAL_HEIGHT + 30) return;
            ctx.save();
            ctx.globalAlpha = visibility(y) * 0.65;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(VIRTUAL_WIDTH / 2 - width / 2, y);
            ctx.lineTo(VIRTUAL_WIDTH / 2 + width / 2, y);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(VIRTUAL_WIDTH / 2 - 2, y - 2, 4, 4);
            ctx.restore();
        };

        const logoY = baseY;
        const logo = this.assets['ui_parnamirim_logo'];
        if (logoY > -90 && logoY < VIRTUAL_HEIGHT + 40) {
            ctx.save();
            ctx.globalAlpha = visibility(logoY + 30);
            if (logo && logo.complete !== false && (logo.naturalWidth === undefined || logo.naturalWidth > 0)) {
                ctx.drawImage(logo, VIRTUAL_WIDTH / 2 - 155, logoY, 310, 59);
            } else {
                line('PREFEITURA DE PARNAMIRIM', 32, 13);
            }
            ctx.restore();
        }

        line('FIM', 115, 40);
        line('VOCÊ CONSEGUIU!', 170, 22);
        line('Obrigado por jogar!', 212, 18, { family: '"Fredoka", sans-serif', weight: '600' });
        line('★  ★  ★', 254, 18);
        divider(302, 360);

        line('REALIZAÇÃO', 350, 14);
        line('PREFEITURA DE PARNAMIRIM', 394, 16);
        line('PREFEITA', 466, 9, { color: '#d1d5db' });
        line('PROFESSORA NILDA', 500, 15);
        line('SECRETARIA MUNICIPAL', 568, 12);
        line('DE LIMPEZA URBANA', 602, 12);
        line('SECRETÁRIA', 670, 9, { color: '#d1d5db' });
        line('ROSEANE PAIVA', 704, 15);
        line('E EQUIPE', 738, 11);
        line('NOMES DA EQUIPE SERÃO ADICIONADOS', 786, 8, { color: '#d1d5db' });
        line('POSTERIORMENTE', 810, 8, { color: '#d1d5db' });
        divider(860, 420);

        line('CRÉDITOS', 910, 22);
        line('GAME', 970, 9, { color: '#d1d5db' });
        line('TURMA DO CAJULIM', 1004, 16);

        line('CRIADO POR', 1072, 9, { color: '#d1d5db' });
        line('MARX BRUNO', 1104, 14);
        line('PROGRAMAÇÃO', 1172, 9, { color: '#d1d5db' });
        line('MARX BRUNO', 1204, 14);
        line('ARTE', 1272, 9, { color: '#d1d5db' });
        line('MARX BRUNO', 1304, 14);
        divider(1380, 360);

        line('SUPORTE COM INTELIGÊNCIA ARTIFICIAL', 1430, 11);
        line('UTILIZADAS APENAS COMO SUPORTE', 1466, 8, { color: '#d1d5db' });
        line('GPT-5.6 LUNA', 1518, 13);
        line('GEMINI 3.8', 1554, 13);
        divider(1604, 360);

        line('AGRADECIMENTOS', 1654, 17);
        line('A TODOS QUE JOGARAM', 1706, 11);
        line('E APOIARAM O PROJETO.', 1738, 11);
        line('UM AGRADECIMENTO ESPECIAL A', 1806, 10, { color: '#d1d5db' });
        line('PREFEITURA DE PARNAMIRIM', 1848, 12);
        line('SECRETARIA MUNICIPAL DE LIMPEZA URBANA', 1886, 9);
        divider(1936, 420);

        line('OBRIGADO POR JOGAR!', 1996, 21);
        line('♥  ♥  ♥', 2048, 19);
        line('ATÉ A PRÓXIMA AVENTURA!', 2098, 12);

        const topFade = ctx.createLinearGradient(0, 0, 0, 78);
        topFade.addColorStop(0, 'rgba(0,0,0,1)');
        topFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(31, 27, VIRTUAL_WIDTH - 62, 60);

        const bottomFade = ctx.createLinearGradient(0, VIRTUAL_HEIGHT - 92, 0, VIRTUAL_HEIGHT);
        bottomFade.addColorStop(0, 'rgba(0,0,0,0)');
        bottomFade.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = bottomFade;
        ctx.fillRect(31, VIRTUAL_HEIGHT - 92, VIRTUAL_WIDTH - 62, 65);

        ctx.fillStyle = 'rgba(0,0,0,0.94)';
        ctx.fillRect(32, VIRTUAL_HEIGHT - 48, VIRTUAL_WIDTH - 64, 20);
        ctx.font = 'bold 7.5px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const hint = credits.complete
            ? 'FIM DOS CRÉDITOS  •  ESPAÇO / A OU TOQUE: MENU'
            : '↓ ACELERAR  •  ESPAÇO / A OU TOQUE: VOLTAR AO MENU';
        ctx.fillText(hint, VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT - 34);

        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(32, VIRTUAL_HEIGHT - 25, VIRTUAL_WIDTH - 64, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(32, VIRTUAL_HEIGHT - 25, (VIRTUAL_WIDTH - 64) * Math.min(1, credits.scroll / credits.maxScroll), 2);
        ctx.restore();
    }

    startCutscene(type) {
        this.state = 'CUTSCENE';
        this.cutscene.active = true;
        this.cutscene.type = type; // 'INTRO', 'PHASE1_CLEAR', 'PHASE2_CLEAR', 'PHASE3_CLEAR', 'PHASE4_CLEAR', 'PHASE5_TO_6' or 'GRAND_ENDING'
        this.cutscene.step = 0;
        this.cutscene.timer = 0;
        this.cutscene.textProgress = 0;
        this.cutscene.autoAdvanceTimer = 0;
        this.cutscene.flashTimer = 0;
        this.cutscene.shakeTimer = 0;
        this.cutscene.animTime = 0;
        this.cutscene.cloudX = 0;
        this.cutscene.waitingForImage = false;

        const modal = typeof document !== 'undefined' ? document.getElementById('victoryModal') : null;
        if (modal) modal.classList.add('hidden');

        if (type === 'GRAND_ENDING' && window.soundManager && window.soundManager.playFanfare) {
            window.soundManager.playFanfare();
        }

        // Check if cutscene image is ready. If not, hold audio so it NEVER starts with audio over a black screen!
        if (this.isCutsceneAssetReady()) {
            this.triggerCutsceneNarration();
        } else {
            this.waitForCutsceneAsset(() => {
                this.triggerCutsceneNarration();
            });
        }
    }

    getCutsceneRequiredAsset() {
        if (this.cutscene.type === 'INTRO') return 'cs_intro_casa';
        if (this.cutscene.type === 'PHASE1_CLEAR') return 'cs_intro_father';
        if (this.cutscene.type === 'PHASE2_CLEAR') return 'cs_phase1_clear';
        if (this.cutscene.type === 'PHASE3_CLEAR') return 'cs_phase2_bairros';
        if (this.cutscene.type === 'PHASE4_CLEAR') return 'cs_phase2_clear';
        if (this.cutscene.type === 'PHASE5_CLEAR') return 'cs_phase3_clear';
        if (this.cutscene.type === 'PHASE6_CLEAR') return 'cs_phase4_clear';
        if (this.cutscene.type === 'PHASE7_TO_8' || this.cutscene.type === 'PHASE6_TO_7' || this.cutscene.type === 'PHASE5_TO_6') {
            return this.cutscene.step === 0 ? 'cs_landfill_aerial' : 'cs_villain_mecha';
        }
        if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step === 0) return 'cs_barao_sweep';
            return 'cs_intro_father';
        }
        return null;
    }

    isCutsceneAssetReady() {
        const key = this.getCutsceneRequiredAsset();
        if (!key) return true;
        const img = this.assets[key];
        if (!img) return false;
        if (img.complete !== undefined) {
            return !!(img.complete && (img.naturalWidth === undefined || img.naturalWidth > 0));
        }
        return true;
    }

    waitForCutsceneAsset(onReadyCallback) {
        this.cutscene.waitingForImage = true;
        const key = this.getCutsceneRequiredAsset();
        if (!key) {
            this.cutscene.waitingForImage = false;
            if (onReadyCallback) onReadyCallback();
            return;
        }

        let img = this.assets[key];
        if (!img) {
            img = new Image();
            img.src = (this.imageList && this.imageList[key]) || `assets/cutscenes/${key}.jpg`;
            this.assets[key] = img;
        }

        let triggered = false;
        const triggerReady = () => {
            if (triggered) return;
            triggered = true;
            if (this.state === 'CUTSCENE') {
                this.cutscene.waitingForImage = false;
                this.cutscene.animTime = 0;
                this.cutscene.textProgress = 0;
                if (onReadyCallback) onReadyCallback();
            }
        };

        if (img.complete && img.naturalWidth > 0) {
            triggerReady();
            return;
        }

        if (img.addEventListener) {
            img.addEventListener('load', triggerReady, { once: true });
            img.addEventListener('error', triggerReady, { once: true });
        } else {
            const prevOnload = img.onload;
            img.onload = () => { if (prevOnload) prevOnload(); triggerReady(); };
            const prevOnerror = img.onerror;
            img.onerror = () => { if (prevOnerror) prevOnerror(); triggerReady(); };
        }
        setTimeout(triggerReady, 1000);
    }

    getCutsceneNarrationData() {
        let type = this.cutscene.type;
        if (type === 'PHASE6_TO_7' || type === 'PHASE5_TO_6') type = 'PHASE7_TO_8';
        const key = `${type}:${this.cutscene.step || 0}`;
        const manifest = (typeof window !== 'undefined' && window.CAJULIM_NARRATIONS)
            ? window.CAJULIM_NARRATIONS
            : ((typeof globalThis !== 'undefined' && globalThis.CAJULIM_NARRATIONS) ? globalThis.CAJULIM_NARRATIONS : null);
        return manifest ? (manifest[key] || null) : null;
    }

    triggerCutsceneNarration() {
        if (!window.soundManager || !window.soundManager.playNarration) return;
        const narration = this.getCutsceneNarrationData();
        if (!narration) {
            console.warn(`Narração não encontrada para ${this.cutscene.type}:${this.cutscene.step || 0}`);
            return;
        }
        const voiceHint = narration.voice && narration.voice.includes('Antonio') ? 'antonio' : 'thalita';
        window.soundManager.playNarration(
            `assets/audio/${narration.filename}?v=8.5`,
            narration.speech_text || narration.text,
            voiceHint
        );
    }

    getCutsceneFullText() {
        const narration = this.getCutsceneNarrationData();
        return narration ? narration.text.toLocaleUpperCase('pt-BR') : '';
    }

    updateCutscene(dt) {
        if (this.cutscene.waitingForImage) {
            this.cutscene.textProgress = 0;
            return;
        }

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

        // Auto advance cutscene step only after spoken narration finishes completely
        if (this.cutscene.textProgress >= fullText.length) {
            if (!narration || narration.ended || narration.paused) {
                this.cutscene.autoAdvanceTimer += dt;
                if (this.cutscene.autoAdvanceTimer > 4.5) {
                    this.advanceCutscene();
                }
            } else {
                this.cutscene.autoAdvanceTimer = 0;
            }
        } else {
            this.cutscene.autoAdvanceTimer = 0;
        }
    }

    advanceCutscene() {
        const fullText = this.getCutsceneFullText();
        if (this.cutscene.textProgress < fullText.length) {
            this.cutscene.textProgress = fullText.length;
            this.cutscene.autoAdvanceTimer = 0;
            return;
        }

        this.cutscene.autoAdvanceTimer = 0;

        if (this.cutscene.type === 'INTRO') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(1);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE1_CLEAR') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(2);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE2_CLEAR') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(3);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE3_CLEAR') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(4);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE4_CLEAR') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(5);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE5_CLEAR') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(6);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE6_CLEAR') {
            if (window.soundManager && window.soundManager.stopNarration) {
                window.soundManager.stopNarration();
            }
            this.cutscene.active = false;
            this.switchPhase(7);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE7_TO_8' || this.cutscene.type === 'PHASE6_TO_7' || this.cutscene.type === 'PHASE5_TO_6') {
            if (this.cutscene.step === 0) {
                if (window.soundManager && window.soundManager.stopNarration) {
                    window.soundManager.stopNarration();
                }
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
                if (this.isCutsceneAssetReady()) {
                    this.triggerCutsceneNarration();
                } else {
                    this.waitForCutsceneAsset(() => {
                        this.triggerCutsceneNarration();
                    });
                }
            } else {
                if (window.soundManager && window.soundManager.stopNarration) {
                    window.soundManager.stopNarration();
                }
                this.cutscene.active = false;
                this.switchPhase(8);
                this.startGame();
            }
        } else if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step === 0) {
                if (window.soundManager && window.soundManager.stopNarration) {
                    window.soundManager.stopNarration();
                }
                this.cutscene.step = 1;
                this.cutscene.textProgress = 0;
                if (window.soundManager && window.soundManager.playFanfare) window.soundManager.playFanfare();
                if (this.isCutsceneAssetReady()) {
                    this.triggerCutsceneNarration();
                } else {
                    this.waitForCutsceneAsset(() => {
                        this.triggerCutsceneNarration();
                    });
                }
            } else if (this.cutscene.step === 1) {
                if (window.soundManager && window.soundManager.stopNarration) {
                    window.soundManager.stopNarration();
                }
                this.startCredits();
            } else {
                this.startCredits();
            }
        }
    }

    skipCutscene() {
        if (window.soundManager && window.soundManager.stopNarration) {
            window.soundManager.stopNarration();
        }
        if (this.cutscene.type === 'INTRO') {
            this.cutscene.active = false;
            this.switchPhase(1);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE1_CLEAR') {
            this.cutscene.active = false;
            this.switchPhase(2);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE2_CLEAR') {
            this.cutscene.active = false;
            this.switchPhase(3);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE3_CLEAR') {
            this.cutscene.active = false;
            this.switchPhase(4);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE4_CLEAR') {
            this.cutscene.active = false;
            this.switchPhase(5);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE5_CLEAR') {
            this.cutscene.active = false;
            this.switchPhase(6);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE6_CLEAR') {
            this.cutscene.active = false;
            this.switchPhase(7);
            this.startGame();
        } else if (this.cutscene.type === 'PHASE7_TO_8' || this.cutscene.type === 'PHASE6_TO_7' || this.cutscene.type === 'PHASE5_TO_6') {
            this.cutscene.active = false;
            this.switchPhase(8);
            this.startGame();
        } else if (this.cutscene.type === 'GRAND_ENDING') {
            if (this.cutscene.step < 1) {
                this.cutscene.step = 1;
                this.cutscene.textProgress = 999;
                this.triggerCutsceneNarration();
            } else {
                this.startCredits();
            }
        }
    }

    renderCutscene(ctx) {
        if (this.cutscene.waitingForImage) {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
            bgGrad.addColorStop(0, '#064e3b');
            bgGrad.addColorStop(0.5, '#022c22');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

            const logo = this.assets['ui_parnamirim_logo'];
            if (logo && logo.complete && logo.naturalWidth > 0) {
                ctx.drawImage(logo, VIRTUAL_WIDTH / 2 - 130, 80, 260, 49);
            }

            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(40, 40, VIRTUAL_WIDTH - 80, VIRTUAL_HEIGHT - 80);

            const dots = '.'.repeat((Math.floor(performance.now() / 300) % 4));
            ctx.font = 'bold 12px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#fef08a';
            ctx.textAlign = 'center';
            ctx.fillText(`PREPARANDO CENA${dots} 🎬`, VIRTUAL_WIDTH / 2, 290);

            ctx.font = 'bold 8.5px "Press Start 2P", monospace, sans-serif';
            ctx.fillStyle = '#86efac';
            ctx.fillText('TURMA DO CAJULIM • PREFEITURA DE PARNAMIRIM', VIRTUAL_WIDTH / 2, 330);
            return;
        }

        ctx.save();
        if (this.cutscene.shakeTimer > 0) {
            const shake = this.cutscene.shakeTimer * 12;
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        if (this.cutscene.type === 'INTRO') {
            this.renderCutsceneIntroCasa(ctx);
        } else if (this.cutscene.type === 'PHASE1_CLEAR') {
            this.renderCutscenePhaseClear(ctx, 'cs_intro_father', 'FASE 1 CONCLUÍDA • O CAMINHÃO DA COLETA CHEGOU');
        } else if (this.cutscene.type === 'PHASE2_CLEAR') {
            this.renderCutscenePhaseClear(ctx, 'cs_phase1_clear', 'FASE 2 CONCLUÍDA • COLETA SELETIVA RESIDENCIAL');
        } else if (this.cutscene.type === 'PHASE3_CLEAR') {
            this.renderCutscenePhaseClear(ctx, 'cs_phase2_bairros', 'FASE 3 CONCLUÍDA • ROTA DO CAMINHÃO NOS BAIRROS');
        } else if (this.cutscene.type === 'PHASE4_CLEAR') {
            this.renderCutscenePhaseClear(ctx, 'cs_phase2_clear', 'FASE 4 CONCLUÍDA • CHEGADA À ESTAÇÃO DE TRANSBORDO');
        } else if (this.cutscene.type === 'PHASE5_CLEAR') {
            this.renderCutscenePhaseClear(ctx, 'cs_phase3_clear', 'FASE 5 CONCLUÍDA • CARGA DA CARRETA DE 30 TONELADAS');
        } else if (this.cutscene.type === 'PHASE6_CLEAR') {
            this.renderCutscenePhaseClear(ctx, 'cs_phase4_clear', 'FASE 6 CONCLUÍDA • BALANÇA RODOVIÁRIA OFICIAL (30.000 KG)');
        } else if (this.cutscene.type === 'PHASE7_TO_8' || this.cutscene.type === 'PHASE6_TO_7' || this.cutscene.type === 'PHASE5_TO_6') {
            this.renderCutscenePhase7To8(ctx);
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

    renderCutsceneIntro(ctx) {
        this.renderCutsceneIntroFather(ctx);
    }

    renderCutscenePhaseClear(ctx, assetKey, title) {
        const t = this.cutscene.animTime;
        const img = this.assets[assetKey];

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            const zoom = 1.03 + 0.015 * Math.sin(t * 0.22);
            const panX = Math.sin(t * 0.18) * 12;
            const panY = Math.cos(t * 0.14) * 6;
            ctx.translate(VIRTUAL_WIDTH / 2 + panX, 210 + panY);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, -VIRTUAL_WIDTH / 2, -210, VIRTUAL_WIDTH, 540);
            ctx.restore();

            // Festive celebratory sparkles & confetti
            for (let i = 0; i < 6; i++) {
                const spX = 120 + (i * 140) + Math.sin(t * 2.5 + i) * 20;
                const spY = 380 - ((t * 30 + i * 45) % 80);
                const spAlpha = Math.max(0, 1 - ((t * 30 + i * 45) % 80) / 80);
                const colors = ['#facc15', '#4ade80', '#38bdf8', '#f43f5e', '#a855f7', '#fbbf24'];
                ctx.fillStyle = colors[i % colors.length];
                ctx.globalAlpha = spAlpha * 0.85;
                ctx.beginPath();
                ctx.arc(spX, spY, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 540);
            bgGrad.addColorStop(0, '#064e3b');
            bgGrad.addColorStop(0.5, '#042f2e');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, 540);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, VIRTUAL_WIDTH - 20, 520);
        }

        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, title, currentText, 'AUTOMÁTICO ⏱ [ESPAÇO P/ AVANÇAR]', 'green');
    }

    
    renderCutsceneIntroCasa(ctx) {
        const t = this.cutscene.animTime;
        const img = this.assets['cs_intro_casa'];

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            const zoom = 1.03 + 0.015 * Math.sin(t * 0.22);
            const panX = Math.sin(t * 0.18) * 12;
            const panY = Math.cos(t * 0.14) * 6;
            ctx.translate(VIRTUAL_WIDTH / 2 + panX, 210 + panY);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, -VIRTUAL_WIDTH / 2, -210, VIRTUAL_WIDTH, 540);
            ctx.restore();
        } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 540);
            bgGrad.addColorStop(0, '#064e3b');
            bgGrad.addColorStop(0.5, '#042f2e');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, 540);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, VIRTUAL_WIDTH - 20, 520);
        }

        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'CASA DO CAJULIM • SEPARAÇÃO DOMÉSTICA: SECO E MOLHADO', currentText, 'COMEÇAR A FASE 1 🏠 [ESPAÇO P/ PULAR]', 'green');
    }

    renderCutscenePhase7To8(ctx) {
        if (this.cutscene.step === 0) {
            this.renderCutsceneAerialLandfill(ctx);
        } else {
            this.renderCutsceneVillainReveal(ctx);
        }
    }

    renderCutsceneIntroFather(ctx) {
        const t = this.cutscene.animTime;
        const img = this.assets['cs_intro_father'];

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            // Gentle cinematic pan & breathe zoom
            const zoom = 1.04 + 0.02 * Math.sin(t * 0.25);
            const panX = Math.sin(t * 0.2) * 16;
            const panY = Math.cos(t * 0.15) * 8;
            ctx.translate(VIRTUAL_WIDTH / 2 + panX, 210 + panY);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, -VIRTUAL_WIDTH / 2, -210, VIRTUAL_WIDTH, 540);
            ctx.restore();

            // Morning sunshine rays effect
            ctx.save();
            ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(VIRTUAL_WIDTH * 0.45, 0);
            ctx.lineTo(VIRTUAL_WIDTH * 0.7, 540);
            ctx.lineTo(VIRTUAL_WIDTH * 0.2, 540);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Floating festive sparkles on the clean sidewalk
            for (let i = 0; i < 4; i++) {
                const spX = 480 + (i * 70) + Math.sin(t * 3 + i) * 15;
                const spY = 410 - ((t * 25 + i * 40) % 70);
                const spAlpha = Math.max(0, 1 - ((t * 25 + i * 40) % 70) / 70);
                ctx.fillStyle = `rgba(255, 255, 255, ${spAlpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(spX, spY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 540);
            bgGrad.addColorStop(0, '#064e3b');
            bgGrad.addColorStop(0.5, '#042f2e');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, 540);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, VIRTUAL_WIDTH - 20, 520);
        }

        // Dialog Box with automated indicator
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'PREFEITURA DE PARNAMIRIM • INÍCIO DA JORNADA', currentText, 'AUTOMÁTICO ⏱ [ESPAÇO P/ PULAR]', 'green');
    }

    renderCutsceneIntroMission(ctx) {
        const t = this.cutscene.animTime;
        const img = this.assets['cs_intro_mission'];

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            // Subtle slow Ken Burns zoom revealing the full map journey
            const zoom = 1.03 + 0.02 * Math.sin(t * 0.22);
            const panX = -Math.sin(t * 0.18) * 18;
            const panY = Math.cos(t * 0.14) * 6;
            ctx.translate(VIRTUAL_WIDTH / 2 + panX, 210 + panY);
            ctx.scale(zoom, zoom);
            ctx.drawImage(img, -VIRTUAL_WIDTH / 2, -210, VIRTUAL_WIDTH, 540);
            ctx.restore();

            // Thunderstorm atmospheric pulse in the top-left villain zone
            const flashCycle = Math.sin(t * 4);
            if (flashCycle > 0.88) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
                ctx.fillRect(0, 0, 360, 180);
            }

            // Clean energy beacon glints on wind turbines and biogas dome
            const beaconCycle = Math.floor(t * 2) % 2 === 0;
            if (beaconCycle) {
                ctx.fillStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(778, 128, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(855, 68, 3, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            }
        } else {
            const bgGrad = ctx.createLinearGradient(0, 0, 0, 540);
            bgGrad.addColorStop(0, '#064e3b');
            bgGrad.addColorStop(0.5, '#042f2e');
            bgGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, VIRTUAL_WIDTH, 540);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, VIRTUAL_WIDTH - 20, 520);
        }

        // Dialog Box with automated indicator
        const fullText = this.getCutsceneFullText();
        const currentText = fullText.slice(0, Math.floor(this.cutscene.textProgress));
        this.renderCutsceneDialogBox(ctx, 'MAPA DA GRANDE MISSÃO SUSTENTÁVEL', currentText, 'INICIAR FASE 1 🚀 [ESPAÇO]', 'blue');
    }

    renderCutscenePhase6To7(ctx) {
        if (this.cutscene.step === 0) {
            this.renderCutsceneAerialLandfill(ctx);
        } else {
            this.renderCutsceneVillainReveal(ctx);
        }
    }

    renderCutscenePhase5To6(ctx) {
        this.renderCutscenePhase6To7(ctx);
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
            // Compatibilidade visual para links antigos: não há mais tela de certificado.
            this.renderCutsceneEndingCelebration(ctx);
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
        this.renderCutsceneDialogBox(ctx, 'PRACA CENTRAL - A LICAO DO BARAO', currentText, '[ESPACO / ENTER] CONTINUAR ▶', 'blue');
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
        this.renderCutsceneDialogBox(ctx, 'PRACA CENTRAL - A LICAO DO BARAO', currentText, '[ESPACO / ENTER] CONTINUAR ▶', 'blue');
    }

    renderCutsceneEndingCelebration(ctx) {
        const t = this.cutscene.animTime;
        // A cena do caminhão apresenta o Pai Cajulão correto, sem o personagem
        // de bigode que aparecia na arte comemorativa antiga.
        const imgCelebration = this.assets['cs_intro_father'];

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
        this.renderCutsceneDialogBox(ctx, 'TURMA DO CAJULIM - MISSAO CUMPRIDA', currentText, '[ESPACO / ENTER] VER CREDITOS ▶', 'gold');
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
        this.renderCutsceneDialogBox(ctx, 'TURMA DO CAJULIM - MISSAO CUMPRIDA', currentText, '[ESPACO / ENTER] VER CREDITOS ▶', 'gold');
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
            const sorted = this.casaViva && this.casaViva.items
                ? this.casaViva.items.filter(item => item.state === 'deposited').length
                : 0;
            const casaItems = this.casaViva?.items || [];
            const dryTotal = casaItems.filter(item => item.category === 'dry').length;
            const wetTotal = casaItems.filter(item => item.category === 'wet').length;
            phaseTitle = 'CASA VIVA: RESIDUOS SEPARADOS';
            phaseDetail = `Objetos separados corretamente: ${sorted}/${casaItems.length} | Secos: ${dryTotal} | Molhados: ${wetTotal}`;
        } else if (this.currentPhase === 2) {
            phaseTitle = 'A GRANDE COLETA DE LIXO NO BAIRRO';
            phaseDetail = `Sacos Coletados: ${this.trashCollected}/${this.totalTrash} | Recicláveis: ${this.recyclablesCollected}/${this.totalRecyclables}`;
        } else if (this.currentPhase === 3) {
            phaseTitle = 'ROTA DO CAMINHÃO COLETOR NOS BAIRROS';
            phaseDetail = `Sacos Coletados: ${this.phase2Collected || 10}/10 | Acesso à Rodovia Alcançado`;
        } else if (this.currentPhase === 4) {
            phaseTitle = 'RODOVIA AO TRANSBORDO URBANO';
            phaseDetail = `Biodiesel: ${this.biodieselCollected}/${this.totalBiodiesel} | Reparos: ${this.wrenchesCollected}/${this.totalWrenches}`;
        } else if (this.currentPhase === 5) {
            phaseTitle = 'TRANSBORDO: 30T NA CARRETA';
            phaseDetail = '4 Caminhões Basculados | Lona 100% Selada';
        } else if (this.currentPhase === 6) {
            const finalCargo = this.cargoWeight || 30000;
            const finalPBT = finalCargo;
            const finalLost = Math.max(0, 30000 - finalCargo);
            phaseTitle = 'BALANÇA ANTT: PESO CONTABILIZADO';
            if (finalLost <= 50) {
                phaseDetail = 'Peso na Balança: 30.000 kg | Carga 100% Preservada (30.000 kg)';
            } else {
                phaseDetail = `Peso na Balança: ${finalPBT.toLocaleString('pt-BR')} kg | Perdeu na Estrada: -${finalLost.toLocaleString('pt-BR')} kg`;
            }
        } else if (this.currentPhase === 7) {
            phaseTitle = 'ATERRO SANITARIO & USINA VERDE';
            phaseDetail = '10.0 MW de Biogás | ETE com Água pH 7.0';
        } else if (this.currentPhase === 8) {
            phaseTitle = 'BATALHA FINAL: O BARÃO FOI DERROTADO';
            phaseDetail = 'Cidade 100% Sustentável | Serviço Comunitário Cumprido';
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

        const joystickDirections = { left: false, right: false, up: false, down: false };
        const syncTouchDirections = () => {
            this.keys.left = joystickDirections.left;
            this.keys.right = joystickDirections.right;
            this.keys.up = joystickDirections.up;
            this.keys.down = joystickDirections.down;
        };

        const joystickBase = document.getElementById('joystickBase');
        const joystickKnob = document.getElementById('joystickKnob');
        if (joystickBase && joystickKnob) {
            let activePointerId = null;
            const deadZone = 0.24;

            const moveJoystick = (clientX, clientY) => {
                const rect = joystickBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const knobRadius = joystickKnob.offsetWidth / 2;
                const maxTravel = Math.max(1, rect.width / 2 - knobRadius - 5);
                const rawX = clientX - centerX;
                const rawY = clientY - centerY;
                const distance = Math.hypot(rawX, rawY);
                const limit = distance > maxTravel ? maxTravel / distance : 1;
                const visualX = rawX * limit;
                const visualY = rawY * limit;
                const axisX = visualX / maxTravel;
                const axisY = visualY / maxTravel;

                joystickKnob.style.transform = `translate(calc(-50% + ${visualX.toFixed(1)}px), calc(-50% + ${visualY.toFixed(1)}px))`;
                joystickDirections.left = axisX < -deadZone;
                joystickDirections.right = axisX > deadZone;
                joystickDirections.up = axisY < -deadZone;
                joystickDirections.down = axisY > deadZone;
                syncTouchDirections();
            };

            const releaseJoystick = (event) => {
                if (activePointerId === null || (event && event.pointerId !== activePointerId)) return;
                activePointerId = null;
                joystickDirections.left = false;
                joystickDirections.right = false;
                joystickDirections.up = false;
                joystickDirections.down = false;
                syncTouchDirections();
                joystickBase.classList.remove('active');
                joystickKnob.style.transform = 'translate(-50%, -50%)';
            };

            joystickBase.addEventListener('pointerdown', (event) => {
                if (activePointerId !== null) return;
                if (event.cancelable) event.preventDefault();
                event.stopPropagation();
                activePointerId = event.pointerId;
                joystickBase.classList.add('active');
                if (joystickBase.setPointerCapture) joystickBase.setPointerCapture(event.pointerId);
                if (window.soundManager) window.soundManager.resume();
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(10); } catch (err) {}
                }
                moveJoystick(event.clientX, event.clientY);
            });
            joystickBase.addEventListener('pointermove', (event) => {
                if (event.pointerId !== activePointerId) return;
                if (event.cancelable) event.preventDefault();
                moveJoystick(event.clientX, event.clientY);
            });
            joystickBase.addEventListener('pointerup', releaseJoystick);
            joystickBase.addEventListener('pointercancel', releaseJoystick);
            joystickBase.addEventListener('lostpointercapture', releaseJoystick);

            this.mobileJoystick = {
                directions: joystickDirections,
                moveTo: moveJoystick,
                release: () => releaseJoystick({ pointerId: activePointerId })
            };
        }

        bindBtn('btnTouchA', () => {
            syncTouchDirections();
            this.keys.jump = true;
            this.keys.jumpHeld = true;
            this.keys.action = true;
            this.actionJustPressed = true;
            this.keyboardJumpHeld = true;
            if (this.player) this.player.jumpBuffer = 0.2;
            if ((this.currentPhase === 3 || this.currentPhase === 4) && window.soundManager) window.soundManager.playHorn();

            if (this.state === 'CREDITS') {
                this.finishCredits();
            } else if (this.state === 'TITLE') {
                if (this.currentPhase > 1) {
                    this.switchPhase(this.currentPhase);
                    this.startGame();
                } else {
                    this.startCutscene('INTRO');
                }
            } else if (this.state === 'CUTSCENE') {
                this.advanceCutscene();
            } else if (this.state === 'LEVEL_CLEAR') {
                this.nextPhase();
            } else if (this.state === 'GAME_OVER') {
                this.restartLevel();
            }
        }, () => {
            syncTouchDirections();
            this.keys.action = false;
            this.keyboardJumpHeld = false;
            if (!this.gamepadJumpHeld) {
                this.keys.jump = false;
                this.keys.jumpHeld = false;
            }
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


    // =========================================================================
    // FASE 1: CASA VIVA DO CAJULIM (SEPARAÇÃO DOMÉSTICA: SECO vs MOLHADO)
    // =========================================================================

    roundedRect(context, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
    }

    initPhase1() {
        this.casaVivaRooms = {
            service: {
                title: "ÁREA DE SERVIÇO",
                subtitle: "Cada coisa no seu lugar",
                image: "cv_service",
                bounds: { left: 92, right: 1188, top: 392, bottom: 654 },
                obstacles: [
                    { x: 92, y: 392, w: 350, h: 84 },
                    { x: 1020, y: 392, w: 168, h: 72 },
                    { x: 425, y: 400, w: 176, h: 150 },
                    { x: 855, y: 400, w: 176, h: 150 }
                ],
                doors: [
                    { side: "left", target: "kitchen", label: "COZINHA", minY: 420, maxY: 640, exitX: 96, spawn: { x: 1110, y: 536, facing: -1 } },
                    { side: "right", target: "living", label: "SALA", minY: 410, maxY: 640, exitX: 1184, spawn: { x: 170, y: 532, facing: 1 } }
                ]
            },
            kitchen: {
                title: "COZINHA",
                subtitle: "O lanche acabou",
                image: "cv_kitchen",
                bounds: { left: 112, right: 1175, top: 372, bottom: 652 },
                obstacles: [
                    { x: 224, y: 432, w: 380, h: 205 },
                    { x: 112, y: 372, w: 720, h: 60 }
                ],
                doors: [
                    { side: "right", target: "service", label: "ÁREA DE SERVIÇO", minY: 400, maxY: 640, exitX: 1168, spawn: { x: 188, y: 530, facing: 1 } }
                ]
            },
            living: {
                title: "SALA",
                subtitle: "Oficina de imaginação",
                image: "cv_living",
                bounds: { left: 104, right: 1180, top: 382, bottom: 650 },
                obstacles: [
                    { x: 272, y: 468, w: 228, h: 103 },
                    { x: 563, y: 390, w: 300, h: 142 },
                    { x: 1002, y: 385, w: 178, h: 90 }
                ],
                doors: [
                    { side: "left", target: "service", label: "ÁREA DE SERVIÇO", minY: 400, maxY: 640, exitX: 110, spawn: { x: 1090, y: 532, facing: -1 } }
                ]
            }
        };

        this.casaVivaBins = [
            { id: "dry", kind: "dry", label: "SECO", color: "#247bd0", dark: "#164c8a", x: 425, y: 400, w: 176, h: 150, interactX: 513, interactY: 574, rimY: 414 },
            { id: "wet", kind: "wet", label: "MOLHADO", color: "#9b5b32", dark: "#57301f", x: 855, y: 400, w: 176, h: 150, interactX: 943, interactY: 574, rimY: 414 }
        ];

        this.casaViva = {
            room: 'service',
            roomVisits: new Set(['service']),
            items: [
                { id: "orange", kind: "orange", name: "casca de laranja", label: "CASCA DE LARANJA", category: "wet", room: "service", x: 400, y: 574, approach: { x: 400, y: 625 }, surface: "floor", labelLift: 0, state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "can", kind: "can", name: "lata vazia", label: "LATA VAZIA", category: "dry", room: "service", x: 690, y: 574, approach: { x: 690, y: 625 }, surface: "floor", labelLift: -26, state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "coffee", kind: "coffee", name: "borra de café", label: "BORRA DE CAFÉ", category: "wet", room: "service", x: 325, y: 586, approach: { x: 325, y: 632 }, surface: "floor", labelLift: -26, state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "jar", kind: "jar", name: "pote de vidro vazio", label: "POTE DE VIDRO", category: "dry", room: "service", x: 770, y: 586, approach: { x: 770, y: 632 }, surface: "floor", labelLift: 0, state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "bottle", kind: "bottle", name: "garrafa PET vazia", label: "GARRAFA PET", category: "dry", room: "kitchen", x: 758, y: 250, approach: { x: 790, y: 472 }, surface: "counter", state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "banana", kind: "banana", name: "casca de banana", label: "CASCA DE BANANA", category: "wet", room: "kitchen", x: 700, y: 552, approach: { x: 700, y: 608 }, surface: "floor", labelLift: 0, state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "yogurt", kind: "yogurt", name: "pote de iogurte usado", label: "POTE DE IOGURTE", category: "wet", room: "kitchen", x: 820, y: 584, approach: { x: 820, y: 632 }, surface: "floor", labelLift: -26, state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "box", kind: "box", name: "caixa de papelão limpa", label: "CAIXA DE PAPELÃO", category: "dry", room: "living", x: 423, y: 445, approach: { x: 565, y: 600 }, surface: "table", state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "apple", kind: "apple", name: "miolo de maçã", label: "MIOLO DE MAÇÃ", category: "wet", room: "living", x: 745, y: 568, approach: { x: 745, y: 620 }, surface: "floor", state: "onSurface", fallT: 0, fallFrom: null, fallTo: null },
                { id: "paper", kind: "paper", name: "papel ou carta limpa", label: "PAPEL / CARTA", category: "dry", room: "living", x: 900, y: 588, approach: { x: 900, y: 632 }, surface: "floor", state: "onSurface", fallT: 0, fallFrom: null, fallTo: null }
            ],
            particles: [],
            transition: null,
            tutorialStep: 0,
            message: '',
            messageTime: 0,
            wrongFlashTime: 0,
            completed: false,
            victoryTime: 0,
            player: {
                x: 955,
                y: 610,
                facing: -1,
                state: 'free',
                moving: false,
                animTime: 0,
                actionTime: 0,
                actionItem: null,
                held: null,
                actionBin: null,
                originX: 0,
                originY: 0
            }
        };

        if (this.casaVivaVariant !== 'three-rooms') {
            // Fase 1 principal: toda a atividade acontece em um único cômodo.
            // A configuração completa acima continua intacta para a variante
            // "Fase 1 com 3 cômodos" disponível no seletor de fases.
            const singleRoomLayout = {
                can:    { x: 275, y: 590, approachY: 632, labelLift: 0 },
                jar:    { x: 365, y: 550, approachY: 615, labelLift: -22 },
                paper:  { x: 400, y: 620, approachY: 642, labelLift: -55 },
                orange: { x: 650, y: 585, approachY: 630, labelLift: 0 },
                coffee: { x: 745, y: 545, approachY: 612, labelLift: -22 },
                apple:  { x: 820, y: 620, approachY: 642, labelLift: -55 }
            };
            const serviceRoom = this.casaVivaRooms.service;
            serviceRoom.doors = [];
            serviceRoom.subtitle = '3 secos • 3 molhados';
            this.casaVivaRooms = { service: serviceRoom };
            this.casaViva.items = this.casaViva.items
                .filter(item => singleRoomLayout[item.id])
                .map(item => {
                    const position = singleRoomLayout[item.id];
                    return {
                        ...item,
                        room: 'service',
                        x: position.x,
                        y: position.y,
                        approach: { x: position.x, y: position.approachY },
                        surface: 'floor',
                        labelLift: position.labelLift
                    };
                });
        }

        this.casaViva.variant = this.casaVivaVariant;
        this.camera.x = 0;
        this.camera.y = 0;
    }

    casaVivaPointBlocked(x, y) {
        const cv = this.casaViva;
        const roomData = this.casaVivaRooms[cv.room];
        const radius = 28;
        return roomData.obstacles.some(rect =>
            x > rect.x - radius && x < rect.x + rect.w + radius && y > rect.y - 18 && y < rect.y + rect.h + 22
        );
    }

    moveCasaVivaPlayer(dx, dy, dt) {
        const cv = this.casaViva;
        const p = cv.player;
        const data = this.casaVivaRooms[cv.room];
        const magnitude = Math.hypot(dx, dy);
        if (!magnitude) {
            p.moving = false;
            return;
        }

        dx /= magnitude;
        dy /= magnitude;
        const speed = p.held ? 245 : 285;
        const nextX = Math.max(data.bounds.left, Math.min(data.bounds.right, p.x + dx * speed * dt));
        const nextY = Math.max(data.bounds.top, Math.min(data.bounds.bottom, p.y + dy * speed * dt));
        const previousX = p.x;
        const previousY = p.y;

        if (!this.casaVivaPointBlocked(nextX, p.y)) p.x = nextX;
        if (!this.casaVivaPointBlocked(p.x, nextY)) p.y = nextY;
        p.moving = Math.hypot(p.x - previousX, p.y - previousY) > 0.05;
        if (Math.abs(dx) > 0.12) p.facing = dx < 0 ? -1 : 1;

        this.checkCasaVivaDoor(dx);
    }

    checkCasaVivaDoor(horizontalDirection) {
        const cv = this.casaViva;
        const p = cv.player;
        if (cv.transition || (p.state !== "free" && p.state !== "carrying")) return;
        for (const door of this.casaVivaRooms[cv.room].doors) {
            const insideY = p.y >= door.minY && p.y <= door.maxY;
            const crosses = door.side === "left"
                ? p.x <= door.exitX && horizontalDirection < 0
                : p.x >= door.exitX && horizontalDirection > 0;
            if (insideY && crosses) {
                cv.transition = { from: cv.room, to: door.target, spawn: door.spawn, time: 0, switched: false };
                p.moving = false;
                return;
            }
        }
    }

    currentCasaVivaItem() {
        const cv = this.casaViva;
        const p = cv.player;
        const selected = cv.items.find(item => item.id === p.held && item.state === "held");
        if (selected) return selected;
        const held = cv.items.find(item => item.state === "held") || null;
        if (held && p.held !== held.id) p.held = held.id;
        if (!held && p.held) p.held = null;
        return held;
    }

    nearestCasaVivaItem() {
        const cv = this.casaViva;
        const p = cv.player;
        return cv.items
            .filter(item => item.room === cv.room && item.state === "onSurface")
            .map(item => ({ item, dist: Math.hypot(p.x - item.approach.x, p.y - item.approach.y) }))
            .filter(entry => entry.dist < 155)
            .sort((a, b) => a.dist - b.dist || a.item.id.localeCompare(b.item.id))[0]?.item || null;
    }

    nearestCasaVivaBin() {
        const cv = this.casaViva;
        const p = cv.player;
        if (cv.room !== "service") return null;
        return this.casaVivaBins
            .map(bin => {
                const left = bin.x - 80;
                const right = bin.x + bin.w + 80;
                const horizontalGap = p.x < left ? left - p.x : p.x > right ? p.x - right : 0;
                const verticalGap = Math.abs(p.y - bin.interactY);
                return {
                    bin,
                    insideX: horizontalGap === 0,
                    centerDistance: Math.abs(p.x - bin.interactX),
                    score: Math.hypot(horizontalGap * 1.4, verticalGap)
                };
            })
            .filter(entry => entry.insideX && entry.score < 125)
            .sort((a, b) => a.centerDistance - b.centerDistance)[0]?.bin || null;
    }

    startCasaVivaPickup(item) {
        const cv = this.casaViva;
        const p = cv.player;
        const held = this.currentCasaVivaItem();
        const reserved = cv.items.find(c => c.state === "reserved");
        if (held || p.held || reserved || item.state !== "onSurface") {
            const carried = held || reserved;
            const target = carried?.category === "dry" ? "SECO" : "MOLHADO";
            cv.message = carried
                ? `Primeiro jogue ${carried.name} no recipiente ${target}.`
                : "Primeiro coloque o objeto que está nas mãos.";
            cv.messageTime = 2.4;
            return false;
        }
        p.state = "reaching";
        p.actionTime = 0;
        p.actionItem = item.id;
        p.originX = p.x;
        p.originY = p.y;
        item.state = "reserved";
        cv.message = "";
        return true;
    }

    startCasaVivaDeposit(bin, item) {
        const cv = this.casaViva;
        const p = cv.player;
        if (bin.kind !== item.category) {
            p.state = "wrong";
            p.actionTime = 0;
            p.actionBin = bin.id;
            const answer = item.category === "dry" ? "seco" : "molhado";
            cv.message = `ERROU! ${item.name.toUpperCase()} vai no recipiente ${answer.toUpperCase()}.`;
            cv.messageTime = 2.8;
            cv.wrongFlashTime = 0.72;
            if (window.soundManager && window.soundManager.playHurt) window.soundManager.playHurt();
            return;
        }
        p.state = "depositing";
        p.actionTime = 0;
        p.actionItem = item.id;
        p.actionBin = bin.id;
        p.originX = p.x;
        p.originY = p.y;
        cv.message = "";
    }

    handleCasaVivaAction() {
        const cv = this.casaViva;
        if (!cv) return;
        const p = cv.player;
        if (cv.completed || cv.transition || (p.state !== "free" && p.state !== "carrying")) return;

        const held = this.currentCasaVivaItem();
        if (held) {
            const bin = this.nearestCasaVivaBin();
            if (bin) this.startCasaVivaDeposit(bin, held);
            else {
                const target = held.category === "dry" ? "SECO" : "MOLHADO";
                cv.message = cv.room === "service"
                    ? `Primeiro jogue ${held.name} no recipiente ${target}.`
                    : `Você já está com ${held.name}. Leve até a área de serviço.`;
                cv.messageTime = 2.5;
            }
            return;
        }

        const stranded = cv.items.find(item => item.state === "held" || item.state === "reserved");
        if (stranded) {
            p.held = stranded.state === "held" ? stranded.id : p.held;
            cv.message = `Primeiro coloque ${stranded.name} no recipiente certo.`;
            cv.messageTime = 2.4;
            return;
        }

        const item = this.nearestCasaVivaItem();
        if (item) this.startCasaVivaPickup(item);
        else {
            cv.message = "Chegue mais perto de um resíduo.";
            cv.messageTime = 1.7;
        }
    }

    updateCasaVivaAction(dt) {
        const cv = this.casaViva;
        const p = cv.player;
        p.actionTime += dt;
        const item = cv.items.find(c => c.id === p.actionItem);

        const easeVal = (t) => t * t * (3 - 2 * t);
        const lerpVal = (a, b, t) => a + (b - a) * t;
        const clampVal = (v, min, max) => Math.max(min, Math.min(max, v));

        if (p.state === "reaching") {
            if (!item) { p.state = "free"; return; }
            const target = item.approach;
            const settle = easeVal(clampVal(p.actionTime / 0.24, 0, 1));
            p.x = lerpVal(p.originX, target.x, settle);
            p.y = lerpVal(p.originY, target.y, settle);
            p.facing = item.x < p.x ? -1 : 1;
            if (p.actionTime >= 0.38 && item.state === "reserved") {
                item.state = "held";
                p.held = item.id;
                if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('coin');
                this.spawnCasaVivaSparkles(item.x, item.y, item.category === "dry" ? "#63c9ff" : "#80db83", 8);
            }
            if (p.actionTime >= 0.72) {
                p.state = "carrying";
                p.actionItem = null;
                p.actionTime = 0;
                if (cv.tutorialStep === 0) cv.tutorialStep = 1;
                cv.message = `${item.name.toUpperCase()} nas mãos.`;
                cv.messageTime = 1.5;
            }
            return;
        }

        if (p.state === "wrong") {
            if (p.actionTime >= 0.74) {
                p.state = "carrying";
                p.actionBin = null;
                p.actionTime = 0;
            }
            return;
        }

        if (p.state === "depositing") {
            const held = this.currentCasaVivaItem() || cv.items.find(c => c.state === "falling" && c.targetBin === p.actionBin);
            const bin = this.casaVivaBins.find(c => c.id === p.actionBin);
            if (!held || !bin) { p.state = p.held ? "carrying" : "free"; return; }

            const standX = bin.interactX + (p.originX < bin.interactX ? -112 : 112);
            const align = easeVal(clampVal(p.actionTime / 0.25, 0, 1));
            p.x = lerpVal(p.originX, standX, align);
            p.y = lerpVal(p.originY, bin.interactY, align);
            p.facing = bin.interactX < p.x ? -1 : 1;

            if (p.actionTime >= 0.42 && held.state === "held") {
                held.state = "falling";
                held.targetBin = bin.id;
                held.fallFrom = { x: bin.x + bin.w / 2, y: bin.rimY - 53 };
                held.fallTo = { x: bin.x + bin.w / 2, y: bin.rimY + 77 };
                held.fallT = 0;
                p.held = null;
            }

            if (held.state === "falling") {
                held.fallT = clampVal((p.actionTime - 0.42) / 0.5, 0, 1);
            }

            if (p.actionTime >= 0.94 && held.state === "falling") {
                held.state = "deposited";
                held.fallT = 1;
                this.score += 250;
                if (window.soundManager && window.soundManager.playCollect) window.soundManager.playCollect('trash');
                this.spawnCasaVivaSparkles(bin.x + bin.w / 2, bin.rimY + 16, bin.color, 17);
                p.state = "free";
                p.actionItem = null;
                p.actionBin = null;
                p.actionTime = 0;
                cv.message = `${held.name.toUpperCase()} NO LUGAR CERTO!`;
                cv.messageTime = 2;
                if (cv.tutorialStep === 1) cv.tutorialStep = 2;

                const depositedCount = cv.items.filter(it => it.state === "deposited").length;
                if (depositedCount === cv.items.length) {
                    cv.completed = true;
                    p.state = "complete";
                    this.score += 900;
                    cv.victoryTime = 0;
                    cv.message = "";
                    if (window.soundManager && window.soundManager.playFanfare) window.soundManager.playFanfare();
                    this.spawnCasaVivaSparkles(p.x, p.y - 110, "#ffd45b", 42);
                    setTimeout(() => {
                        this.levelClear();
                    }, 1200);
                }
            }
        }
    }

    updateCasaVivaTransition(dt) {
        const cv = this.casaViva;
        if (!cv.transition) return;
        cv.transition.time += dt;
        if (cv.transition.time >= 0.24 && !cv.transition.switched) {
            cv.room = cv.transition.to;
            cv.roomVisits.add(cv.room);
            cv.player.x = cv.transition.spawn.x;
            cv.player.y = cv.transition.spawn.y;
            cv.player.facing = cv.transition.spawn.facing;
            cv.transition.switched = true;
        }
        if (cv.transition.time >= 0.5) cv.transition = null;
    }

    spawnCasaVivaSparkles(x, y, color, count) {
        const cv = this.casaViva;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 35 + Math.random() * 95;
            cv.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 42,
                life: 0.5 + Math.random() * 0.65,
                maxLife: 1.15,
                color,
                size: 3 + Math.random() * 5
            });
        }
    }

    updateCasaViva(dt) {
        const cv = this.casaViva;
        if (!cv) return;

        if (cv.messageTime > 0) cv.messageTime = Math.max(0, cv.messageTime - dt);
        if (cv.wrongFlashTime > 0) cv.wrongFlashTime = Math.max(0, cv.wrongFlashTime - dt);

        // Update particles
        for (const p of cv.particles) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 130 * dt;
        }
        cv.particles = cv.particles.filter(p => p.life > 0);

        cv.player.animTime += dt;

        if (cv.transition) {
            this.updateCasaVivaTransition(dt);
            return;
        }

        if (cv.completed) {
            cv.victoryTime += dt;
            return;
        }

        if (this.actionJustPressed || (this.keys.action && !cv.player.heldActionConsumed)) {
            this.handleCasaVivaAction();
            cv.player.heldActionConsumed = true;
        }
        if (!this.keys.action) {
            cv.player.heldActionConsumed = false;
        }

        if (cv.player.state === "reaching" || cv.player.state === "depositing" || cv.player.state === "wrong") {
            this.updateCasaVivaAction(dt);
            return;
        }

        let dx = 0;
        let dy = 0;
        if (this.keys.left) dx -= 1;
        if (this.keys.right) dx += 1;
        if (this.keys.up) dy -= 1;
        if (this.keys.down) dy += 1;
        this.moveCasaVivaPlayer(dx, dy, dt);
    }

    // =========================================================================
    // CASA VIVA RENDERING METHODS (1280x720 scaled to 960x540)
    // =========================================================================

    drawCasaVivaFallbackCajulim(ctx, held = null) {
        // Personagem completo e reconhecível mesmo se a conexão falhar. Este
        // desenho substitui o antigo círculo laranja usado durante o download.
        ctx.save();
        ctx.strokeStyle = "#5a3018";
        ctx.lineWidth = 3;

        // Pernas e tênis
        ctx.fillStyle = "#21795d";
        ctx.fillRect(-34, -51, 23, 42);
        ctx.fillRect(11, -51, 23, 42);
        ctx.fillStyle = "#f4f1e8";
        this.roundedRect(ctx, -48, -19, 40, 18, 7);
        ctx.fill(); ctx.stroke();
        this.roundedRect(ctx, 8, -19, 40, 18, 7);
        ctx.fill(); ctx.stroke();

        // Corpo de caju e camisa verde
        ctx.fillStyle = "#ef9227";
        this.roundedRect(ctx, -52, -184, 104, 139, 43);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#2e8b62";
        this.roundedRect(ctx, -50, -101, 100, 57, 14);
        ctx.fill();
        ctx.fillStyle = "#76b866";
        ctx.fillRect(-48, -85, 96, 8);
        ctx.fillRect(-48, -63, 96, 6);

        // Olhos, sobrancelhas, nariz e sorriso
        ctx.fillStyle = "#fff8e7";
        ctx.beginPath(); ctx.ellipse(-20, -139, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(20, -139, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#332014";
        ctx.beginPath(); ctx.arc(-17, -137, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(17, -137, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#4b2818";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-32, -160); ctx.lineTo(-11, -163); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(11, -163); ctx.lineTo(32, -160); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, -117, 17, 0.15, Math.PI - 0.15); ctx.stroke();

        // Castanha no topo
        ctx.fillStyle = "#8a7252";
        ctx.beginPath();
        ctx.moveTo(-9, -181); ctx.quadraticCurveTo(-5, -215, 12, -218);
        ctx.quadraticCurveTo(27, -210, 15, -181); ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Braços e luvas. Com objeto, a mão direita é completada pelo overlay.
        ctx.strokeStyle = "#e58b28";
        ctx.lineWidth = 13;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-44, -93); ctx.lineTo(-55, -58); ctx.stroke();
        if (!held) {
            ctx.beginPath(); ctx.moveTo(44, -93); ctx.lineTo(55, -58); ctx.stroke();
        }
        ctx.fillStyle = "#f7f2e7";
        ctx.beginPath(); ctx.arc(-56, -52, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (!held) {
            ctx.beginPath(); ctx.arc(56, -52, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }

    renderCasaViva(ctx) {
        const cv = this.casaViva;
        if (!cv) return;

        const W = 1280;
        const H = 720;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(960 / 1280, 540 / 720);

        // 1. Draw room background
        const roomData = this.casaVivaRooms[cv.room];
        const bgImg = this.assets[roomData.image];
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, 0, 0, W, H);
        } else {
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, "#f3d59b");
            grad.addColorStop(0.52, "#d1a065");
            grad.addColorStop(0.53, "#a65f39");
            grad.addColorStop(1, "#6a3928");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
        }

        const vignette = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.2, W / 2, H * 0.48, W * 0.72);
        vignette.addColorStop(0, "rgba(20,12,9,0)");
        vignette.addColorStop(1, "rgba(20,12,9,.24)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);

        // 2. Draw loose items in room
        for (const item of cv.items) {
            if (item.room !== cv.room || (item.state !== "onSurface" && item.state !== "reserved")) continue;
            const nearest = this.nearestCasaVivaItem();
            const selected = nearest && nearest.id === item.id && !cv.player.held;

            if (selected) {
                ctx.save();
                ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 170) * 0.18;
                ctx.fillStyle = item.category === "dry" ? "#60d3ff" : "#8de582";
                ctx.beginPath();
                ctx.ellipse(item.x, item.y + 20, 33, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.fillStyle = "rgba(35,18,10,.32)";
            ctx.beginPath();
            ctx.ellipse(item.x, item.y + 23, 24, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            this.drawCasaVivaItem(ctx, item.kind, item.x, item.y, 0.9, 0);

            // Item Arrow & Label
            const bob = Math.sin(performance.now() / 185 + item.x * 0.01) * 5;
            const arrowY = item.y - 45 + bob;
            const itemLabel = item.label || item.name.toUpperCase();

            ctx.save();
            ctx.translate(Math.round(item.x), Math.round(arrowY));
            const labelY = -72 + (item.labelLift || 0);
            ctx.fillStyle = "rgba(35,18,10,.82)";
            this.roundedRect(ctx, -100, labelY, 200, 26, 8);
            ctx.fill();
            ctx.strokeStyle = item.category === "dry" ? "#69c9ee" : "#83dc8e";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#fff3c3";
            ctx.font = "900 11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(itemLabel, 0, labelY + 13);
            ctx.restore();

            // Downward arrow
            ctx.save();
            ctx.translate(Math.round(item.x), Math.round(arrowY + 7));
            const arrowScale = selected ? 1.28 : 1.18;
            ctx.scale(arrowScale, arrowScale);
            ctx.fillStyle = selected ? "#fff36c" : "#ffd24a";
            ctx.strokeStyle = "#563319";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-8, -19); ctx.lineTo(8, -19); ctx.lineTo(8, 3);
            ctx.lineTo(17, 3); ctx.lineTo(0, 22); ctx.lineTo(-17, 3); ctx.lineTo(-8, 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 3. Draw Bins (service room)
        if (cv.room === "service") {
            this.casaVivaBins.forEach(bin => {
                const x = bin.x;
                const y = bin.y;
                const w = bin.w;
                const h = bin.h;

                ctx.save();
                ctx.fillStyle = "rgba(24,14,10,.28)";
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + h + 8, w * 0.52, 15, 0, 0, Math.PI * 2);
                ctx.fill();

                // Lid
                const lidGrad = ctx.createLinearGradient(x, y - 88, x, y + 4);
                lidGrad.addColorStop(0, bin.color);
                lidGrad.addColorStop(1, bin.dark);
                ctx.fillStyle = lidGrad;
                ctx.strokeStyle = "#17251d";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(x + 14, y + 4);
                ctx.lineTo(x + 28, y - 80);
                ctx.lineTo(x + w - 22, y - 91);
                ctx.lineTo(x + w - 8, y - 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cavity
                ctx.fillStyle = "#13231d";
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + 13, w * 0.48, 24, 0, 0, Math.PI * 2);
                ctx.fill();

                // Deposited items inside
                const deposited = cv.items.filter(it => it.category === bin.kind && it.state === "deposited");
                const spacing = deposited.length > 1 ? Math.min(31, (w - 68) / (deposited.length - 1)) : 0;
                const scale = deposited.length >= 5 ? 0.42 : 0.5;
                deposited.forEach((it, idx) => {
                    this.drawCasaVivaItem(ctx, it.kind, x + 34 + idx * spacing, y + 8 - (idx % 2) * 4, scale, 0);
                });

                // Body
                const body = ctx.createLinearGradient(x, y, x + w, y + h);
                body.addColorStop(0, bin.color);
                body.addColorStop(1, bin.dark);
                ctx.fillStyle = body;
                ctx.strokeStyle = "#183024";
                ctx.lineWidth = 5;
                this.roundedRect(ctx, x + 9, y + 14, w - 18, h - 17, 18);
                ctx.fill();
                ctx.stroke();

                // Label
                const labelW = bin.kind === "dry" ? 94 : 122;
                ctx.fillStyle = "#fff2c4";
                this.roundedRect(ctx, x + (w - labelW) / 2, y + 57, labelW, 41, 7);
                ctx.fill();
                ctx.strokeStyle = "rgba(40,28,18,.45)";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = bin.dark;
                ctx.font = `900 ${bin.kind === "dry" ? 20 : 17}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(bin.label, x + w / 2, y + 78);

                ctx.font = "900 13px sans-serif";
                ctx.fillStyle = "#fff2c4";
                const catCount = deposited.length;
                const catTotal = cv.items.filter(it => it.category === bin.kind).length;
                ctx.fillText(`${catCount}/${catTotal}`, x + w / 2, y + 120);
                ctx.restore();
            });
        }

        // 4. Door hints
        for (const door of roomData.doors) {
            const dest = `IR PARA ${door.label}`;
            const boxW = 220;
            const x = door.side === "left" ? 18 : W - boxW - 18;
            const y = Math.max(210, Math.min(H - 130, (door.minY + door.maxY) / 2 - 36));
            const dir = door.side === "left" ? -1 : 1;
            const held = this.currentCasaVivaItem();
            const isRouteToBins = held && door.target === "service";
            const blinkOn = Math.floor(performance.now() / 280) % 2 === 0;
            const accent = isRouteToBins ? "#8cf074" : "#ffd84d";

            ctx.save();
            ctx.globalAlpha = blinkOn ? 1 : 0.75;
            ctx.fillStyle = "rgba(38,22,14,.94)";
            this.roundedRect(ctx, x, y, boxW, 72, 13);
            ctx.fill();
            ctx.strokeStyle = accent;
            ctx.lineWidth = blinkOn ? 4 : 3;
            ctx.stroke();

            ctx.fillStyle = accent;
            ctx.font = "900 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(isRouteToBins ? "LEVE O RESÍDUO" : "PORTA", x + boxW / 2, y + 24);
            ctx.fillStyle = "#fff3c8";
            ctx.font = "900 15px sans-serif";
            ctx.fillText(dest, x + boxW / 2, y + 49);
            ctx.restore();
        }

        // 5. Draw Player
        const p = cv.player;
        const held = this.currentCasaVivaItem();
        let frame = p.moving
            ? Math.floor(p.animTime * 10) % 8
            : Math.floor(p.animTime * 4) % 4;

        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        if (p.facing < 0) ctx.scale(-1, 1);

        // Check held sprite
        let spriteDrawn = false;
        if (held && p.state !== "complete") {
            const spriteKey = p.moving ? `cv_${held.id}_walk` : `cv_${held.id}_hold`;
            const spriteImg = this.assets[spriteKey];
            if (spriteImg && spriteImg.complete && spriteImg.naturalWidth > 0) {
                const fw = spriteImg.naturalWidth > 128 ? spriteImg.naturalWidth / 8 : spriteImg.naturalWidth;
                const f = p.moving ? frame : 0;
                ctx.drawImage(spriteImg, f * fw, 0, fw, spriteImg.naturalHeight, -64, -192, 128, 192);
                spriteDrawn = true;
            }
        }

        if (!spriteDrawn) {
            let baseKey;
            if (p.state === "complete") baseKey = 'p_win';
            else if (p.state === "reaching" || p.state === "depositing") baseKey = 'p_collect_0';
            else if (p.moving) baseKey = `p_walk_${frame}`;
            else baseKey = `p_idle_${frame}`;

            let baseImg = this.assets[baseKey];
            if (!(baseImg && baseImg.complete && baseImg.naturalWidth > 0)) {
                baseImg = this.assets['p_idle_0'];
            }

            if (held) {
                // O fallback próprio já omite o braço que segura o item, para o
                // overlay completar exatamente duas mãos, nunca três ou quatro.
                this.drawCasaVivaFallbackCajulim(ctx, held);
            } else if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
                ctx.drawImage(baseImg, 0, 0, baseImg.naturalWidth, baseImg.naturalHeight, -64, -192, 128, 192);
            } else {
                this.drawCasaVivaFallbackCajulim(ctx);
            }

            if (held) {
                // Quando a pose específica ainda está carregando, o braço e a
                // mão chegam até o resíduo; ele nunca fica solto no ar.
                ctx.strokeStyle = "#e58b28";
                ctx.lineWidth = 13;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(24, -91);
                ctx.lineTo(31, -58);
                ctx.stroke();
                ctx.fillStyle = "#f7f2e7";
                ctx.beginPath();
                ctx.arc(31, -53, 8, 0, Math.PI * 2);
                ctx.fill();
                this.drawCasaVivaItem(ctx, held.kind, 31, -43, 0.72, 0.04);
            }
        }
        ctx.restore();

        // 6. Draw Falling items
        for (const item of cv.items.filter(c => c.state === "falling")) {
            const bin = this.casaVivaBins.find(c => c.id === item.targetBin);
            if (!bin || cv.room !== "service") continue;
            const t = item.fallT;
            const easeVal = t * t * (3 - 2 * t);
            const fx = item.fallFrom.x + (item.fallTo.x - item.fallFrom.x) * easeVal;
            const arc = Math.sin(easeVal * Math.PI) * 26;
            const fy = item.fallFrom.y + (item.fallTo.y - item.fallFrom.y) * easeVal - arc;

            ctx.save();
            ctx.beginPath();
            ctx.rect(bin.x - 12, 0, bin.w + 24, bin.rimY + 7);
            ctx.clip();
            this.drawCasaVivaItem(ctx, item.kind, fx, fy, 0.72, easeVal * 1.8);
            ctx.restore();
        }

        // 7. Draw Particles
        for (const pt of cv.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
            ctx.translate(pt.x, pt.y);
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = pt.color;
            ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
            ctx.restore();
        }

        // 8. Draw Wrong flash
        if (cv.wrongFlashTime > 0) {
            const pulse = 0.16 + Math.abs(Math.sin((0.72 - cv.wrongFlashTime) * 34)) * 0.2;
            ctx.save();
            ctx.fillStyle = `rgba(205,24,31,${pulse})`;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // 9. Draw HUD
        ctx.save();
        // Top-left: Room title
        ctx.fillStyle = "rgba(38,24,16,.9)";
        this.roundedRect(ctx, 22, 18, 310, 67, 11);
        ctx.fill();
        ctx.strokeStyle = "#d69450";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = "left";
        ctx.fillStyle = "#ffd45b";
        ctx.font = "900 11px sans-serif";
        ctx.fillText(roomData.subtitle.toUpperCase(), 42, 42);
        ctx.fillStyle = "#fff1c5";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(roomData.title, 42, 69);

        // Top-right: Score & Separated count
        ctx.fillStyle = "rgba(38,24,16,.9)";
        this.roundedRect(ctx, W - 326, 18, 304, 67, 11);
        ctx.fill();
        ctx.strokeStyle = "#d69450";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#fff1c5";
        ctx.font = "900 15px sans-serif";
        const depositedTotal = cv.items.filter(it => it.state === "deposited").length;
        ctx.fillText(`SEPARADOS  ${depositedTotal}/${cv.items.length}`, W - 304, 45);
        ctx.fillStyle = "#ffd45b";
        ctx.fillText(`PONTOS  ${this.score.toString().padStart(4, "0")}`, W - 304, 68);

        // Held item info
        if (held) {
            const itemText = `NAS MÃOS: ${held.name.toUpperCase()}`;
            const targetText = `AGORA JOGUE NO ${held.category === "dry" ? "SECO (AZUL)" : "MOLHADO (MARROM)"}`;
            ctx.fillStyle = "rgba(38,24,16,.92)";
            this.roundedRect(ctx, W / 2 - 200, 16, 400, 58, 11);
            ctx.fill();
            ctx.strokeStyle = held.category === "dry" ? "#58bde8" : "#78d07b";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#fff2c7";
            ctx.font = "900 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(itemText, W / 2, 39);
            ctx.fillStyle = held.category === "dry" ? "#6bd3ff" : "#91ed91";
            ctx.font = "900 12px sans-serif";
            ctx.fillText(targetText, W / 2, 60);
        }

        // Bottom prompt
        let promptText = cv.messageTime > 0 ? cv.message : "";
        if (!promptText) {
            if (p.state === "depositing") {
                const actionItem = cv.items.find(item => item.id === p.actionItem);
                const target = actionItem?.category === "dry" ? "SECO" : "MOLHADO";
                promptText = actionItem ? `DESCARTANDO ${actionItem.name.toUpperCase()} NO ${target}` : "DESCARTANDO RESÍDUO";
            } else if (held) {
                const bin = this.nearestCasaVivaBin();
                const target = held.category === "dry" ? "SECO" : "MOLHADO";
                if (bin?.kind === held.category) promptText = `ESPAÇO / BOTÃO A · JOGAR ${held.name.toUpperCase()} NO ${target}`;
                else if (bin) promptText = `${held.name.toUpperCase()} É ${target} · PROCURE O RECIPIENTE ${target}`;
                else promptText = cv.room === "service"
                    ? `LEVE AO RECIPIENTE ${target}`
                    : `LEVE ATÉ A ÁREA DE SERVIÇO`;
            } else {
                const item = this.nearestCasaVivaItem();
                if (item) promptText = `ESPAÇO / BOTÃO A · PEGAR ${item.name.toUpperCase()}`;
                else promptText = this.casaVivaVariant === 'three-rooms'
                    ? "EXPLORE OS CÔMODOS PARA ENCONTRAR RESÍDUOS"
                    : "ENCONTRE OS 6 RESÍDUOS NESTE CÔMODO";
            }
        }

        if (promptText) {
            ctx.fillStyle = "rgba(36,22,14,.91)";
            this.roundedRect(ctx, W / 2 - 280, H - 64, 560, 44, 11);
            ctx.fill();
            ctx.strokeStyle = "#f0c25b";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.fillStyle = "#fff2c7";
            ctx.font = "900 14px sans-serif";
            ctx.fillText(promptText, W / 2, H - 37);
        }

        // Transition fade
        if (cv.transition) {
            const t = cv.transition.time;
            const alpha = t < 0.25 ? t / 0.25 : (0.5 - t) / 0.25;
            ctx.fillStyle = `rgba(28,18,13,${Math.max(0, Math.min(1, alpha))})`;
            ctx.fillRect(0, 0, W, H);
        }

        ctx.restore();
    }

    drawCasaVivaItem(ctx, kind, x, y, scale = 1, rotation = 0) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (kind === "bottle") {
            ctx.fillStyle = "rgba(104,211,245,.84)";
            ctx.strokeStyle = "#164e72";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-8, -28); ctx.lineTo(8, -28); ctx.lineTo(9, -19); ctx.quadraticCurveTo(16, -13, 14, 0); ctx.lineTo(12, 27); ctx.lineTo(-12, 27); ctx.lineTo(-14, 0); ctx.quadraticCurveTo(-16, -13, -9, -19); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#267bc4"; ctx.fillRect(-9, -34, 18, 8);
            ctx.fillStyle = "#f4cf4f"; ctx.fillRect(-13, -4, 26, 10);
            ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.fillRect(-7, -18, 4, 36);
        } else if (kind === "can") {
            ctx.fillStyle = "#e75037"; ctx.strokeStyle = "#6e271f"; ctx.lineWidth = 4;
            this.roundedRect(ctx, -14, -20, 28, 41, 7); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#f2c64b"; ctx.fillRect(-13, -6, 26, 10);
            ctx.strokeStyle = "#d9e2da"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(0, -19, 11, 4, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(-8, -15, 4, 29);
        } else if (kind === "jar") {
            ctx.fillStyle = "rgba(204,237,224,.88)"; ctx.strokeStyle = "#2d6853"; ctx.lineWidth = 4;
            this.roundedRect(ctx, -19, -18, 38, 39, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#d8a94a"; ctx.fillRect(-19, -23, 38, 8);
            ctx.strokeStyle = "#fff1b0"; ctx.lineWidth = 2; ctx.strokeRect(-14, -6, 28, 14);
            ctx.fillStyle = "#6d9d67"; ctx.fillRect(-9, -3, 18, 5);
            ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(-13, -15, 5, 27);
        } else if (kind === "coffee") {
            ctx.fillStyle = "#efe2c3"; ctx.strokeStyle = "#6f492f"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(0, 4, 24, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#6d4527"; ctx.beginPath(); ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#efe2c3"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(22, 5, 10, -1.2, 1.2); ctx.stroke();
            ctx.fillStyle = "#d6a04b"; ctx.fillRect(-16, 9, 32, 4);
        } else if (kind === "yogurt") {
            ctx.fillStyle = "#f6ebcb"; ctx.strokeStyle = "#6e4931"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-19, -15); ctx.lineTo(19, -15); ctx.lineTo(14, 20); ctx.lineTo(-14, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#dc6d57"; ctx.fillRect(-17, -10, 34, 9);
            ctx.fillStyle = "#75b7ce"; ctx.fillRect(-12, 3, 24, 8);
            ctx.strokeStyle = "#f7f2df"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -17); ctx.lineTo(16, -17); ctx.stroke();
        } else if (kind === "paper") {
            ctx.fillStyle = "#f2e7c9"; ctx.strokeStyle = "#51483c"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-28,-17); ctx.lineTo(27,-12); ctx.lineTo(24,19); ctx.lineTo(-29,14); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#4e91b8"; ctx.fillRect(-22, -11, 18, 12);
            ctx.fillStyle = "#d7c798"; ctx.fillRect(1, -9, 20, 4); ctx.fillRect(1, -1, 18, 3); ctx.fillRect(-22, 6, 43, 3);
            ctx.strokeStyle = "#9a8a67"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-1,-15); ctx.lineTo(-3,16); ctx.stroke();
        } else if (kind === "box") {
            ctx.fillStyle = "#c58647"; ctx.strokeStyle = "#633b21"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-30,-13); ctx.lineTo(7,-24); ctx.lineTo(31,-12); ctx.lineTo(30,20); ctx.lineTo(-8,26); ctx.lineTo(-30,13); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "#8d5a2f"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-30,-13); ctx.lineTo(-7,0); ctx.lineTo(31,-12); ctx.moveTo(-7,0); ctx.lineTo(-8,26); ctx.stroke();
            ctx.fillStyle = "#e5ad64"; ctx.fillRect(-4, -20, 8, 18);
            ctx.fillStyle = "#4e8b55"; ctx.beginPath(); ctx.moveTo(8,8); ctx.lineTo(17,4); ctx.lineTo(15,13); ctx.closePath(); ctx.fill();
        } else if (kind === "banana") {
            ctx.strokeStyle = "#6a4a1c"; ctx.lineWidth = 17;
            ctx.beginPath(); ctx.arc(-8, -5, 28, 0.15, 1.9); ctx.stroke();
            ctx.strokeStyle = "#f0cc37"; ctx.lineWidth = 12; ctx.stroke();
            ctx.fillStyle = "#75501c"; ctx.beginPath(); ctx.arc(20,0,5,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle = "#f5df57"; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(-15,10); ctx.lineTo(-29,24); ctx.moveTo(-8,12); ctx.lineTo(-9,29); ctx.stroke();
        } else if (kind === "apple") {
            ctx.fillStyle = "#f2dfac"; ctx.strokeStyle = "#743429"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-13,-17); ctx.quadraticCurveTo(0,-25,13,-17); ctx.quadraticCurveTo(7,-4,9,3); ctx.quadraticCurveTo(12,16,0,22); ctx.quadraticCurveTo(-12,16,-9,3); ctx.quadraticCurveTo(-7,-4,-13,-17); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#d94835"; ctx.beginPath(); ctx.arc(0,-19,13,Math.PI,Math.PI*2); ctx.arc(0,18,11,0,Math.PI); ctx.fill();
            ctx.strokeStyle = "#47351e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0,-23); ctx.lineTo(5,-32); ctx.stroke();
            ctx.fillStyle = "#6b9a3b"; ctx.beginPath(); ctx.ellipse(10,-29,8,4,-.4,0,Math.PI*2); ctx.fill();
        } else {
            ctx.strokeStyle = "#8c3a15"; ctx.lineWidth = 16;
            ctx.beginPath(); ctx.arc(-4, -3, 22, -0.2, 2.1); ctx.stroke();
            ctx.strokeStyle = "#ed7c25"; ctx.lineWidth = 11; ctx.stroke();
            ctx.strokeStyle = "#f5aa42"; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.moveTo(-9,13); ctx.quadraticCurveTo(2,25,18,20); ctx.moveTo(-15,10); ctx.quadraticCurveTo(-25,20,-24,29); ctx.stroke();
        }
        ctx.restore();
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
