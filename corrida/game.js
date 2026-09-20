// ============================================================================
// CAJULIM ENDLESS RUNNER 3D — MOTOR OFICIAL (MINION RUSH STYLE)
// Gráficos 2.5D/3D de Alta Fidelidade com Perspectiva Real sem Erros de CORS
// ============================================================================

class CajulimRunnerGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Configuração de Resolução e Escala
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.setupCanvas();

    // Constantes de Perspectiva e Pista
    this.LANES = [-1, 0, 1]; // -1: Esquerda, 0: Centro, 1: Direita
    this.currentLane = 0; // Começa no Centro
    this.playerX = 0; // Posição X interpolada (-1 a 1)
    this.laneWidth = 180; // Largura aparente de cada faixa na base da tela

    // Estado do Jogador
    this.player = {
      y: 0, // Altura do pulo
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      slideDuration: 0.65,
      rollTilt: 0,
      runCycle: 0,
      stepTimer: 0,
      stepFrame: 'a'
    };

    // Estado Geral do Jogo
    this.state = 'START'; // 'START', 'RUNNING', 'PAUSED', 'GAMEOVER'
    this.distance = 0;
    this.speed = 18.0; // Velocidade base da pista
    this.baseSpeed = 18.0;
    this.maxSpeed = 38.0;
    this.score = 0;
    this.scoreFloat = 0;
    this.recycledCount = 0;
    this.multiplier = 1;
    this.comboStreak = 0;
    this.sceneLength = 180;
    this.currentSceneIndex = 0;
    this.visualDistance = 0;
    this.highScore = parseInt(localStorage.getItem('cajulim_runner_highscore') || '0', 10);

    // Power-ups
    this.activePowerups = {
      magnet: { active: false, timeLeft: 0, maxTime: 10.0 },
      turbo: { active: false, timeLeft: 0, maxTime: 6.0 }
    };

    // Objetos Ativos na Pista
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.speedLines = [];

    // Carregamento de Imagens e Sprites Nativos (Zero CORS!)
    this.sprites = {};
    this.imagesLoaded = 0;
    this.totalImages = 0;
    this.loadAssets();

    // Configuração de Entradas (Teclado, Swipe e Touch)
    this.setupInputs();

    // Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));

    window.addEventListener('resize', () => this.setupCanvas());
  }

  setupCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  // --------------------------------------------------------------------------
  // CARREGAMENTO DE IMAGENS E SPRITES NATIVOS
  // --------------------------------------------------------------------------
  loadAssets() {
    const assetList = {
      // Cenário Panorâmico
      panorama: 'assets/images/runner_panorama.jpg',
      // Mundo modular: texturas rolantes e peças independentes
      texture_sand: 'assets/images/texture_sand_v1.png',
      texture_asphalt: 'assets/images/texture_asphalt_v1.png',
      scenery_palm: 'assets/images/scenery_palm_v2.png',
      scenery_lamp: 'assets/images/scenery_lamp_v2.png',
      scenery_planter: 'assets/images/scenery_planter_bench_v2.png',
      scenery_beach_house: 'assets/images/scenery_beach_house_v1.png',
      scenery_beach_kiosk: 'assets/images/scenery_beach_kiosk_v1.png',
      scenery_city_building: 'assets/images/scenery_city_building_v1.png',
      scenery_city_shop: 'assets/images/scenery_city_shop_v1.png',

      // Poses do Cajulim visto de costas
      cajulim_run_a: 'assets/images/cajulim_run_a_clean.png',
      cajulim_run_b: 'assets/images/cajulim_run_b_arms.png',
      cajulim_jump: 'assets/images/cajulim_jump_clean.png',
      cajulim_slide: 'assets/images/cajulim_slide_clean.png',
      cajulim_dodge: 'assets/images/cajulim_dodge_clean.png',
      cajulim_turbo: 'assets/images/cajulim_turbo_clean.png',
      cajulim_crash: 'assets/images/cajulim_crash_clean.png',

      // Obstáculos 3D Recortados
      obs_cavalete: 'assets/images/sprite_cavalete_clean.png',
      obs_cone: 'assets/images/sprite_cone_clean.png',
      obs_cacamba: 'assets/images/sprite_cacamba_clean.png',
      obs_viga: 'assets/images/sprite_viga_clean.png',

      // Itens Recicláveis 3D Recortados
      item_latinha: 'assets/images/sprite_latinha.png',
      item_garrafa: 'assets/images/sprite_garrafa.png',
      item_caixa: 'assets/images/sprite_caixa.png',
      item_ima: 'assets/images/sprite_ima.png',
      item_moeda: 'assets/images/sprite_moeda.png'
    };

    const keys = Object.keys(assetList);
    this.totalImages = keys.length;

    keys.forEach(key => {
      const img = new Image();
      img.onload = () => {
        this.imagesLoaded++;
      };
      img.onerror = () => {
        console.warn(`Fallback para imagem: ${key}`);
        this.imagesLoaded++;
      };
      img.src = assetList[key];
      this.sprites[key] = img;
    });
  }

  // --------------------------------------------------------------------------
  // CONTROLES E INPUTS
  // --------------------------------------------------------------------------
  setupInputs() {
    // Teclado (PC)
    window.addEventListener('keydown', (e) => {
      const gallery = document.getElementById('modalGallery');
      if (gallery && gallery.classList.contains('active')) {
        if (e.code === 'Escape') gallery.classList.remove('active');
        return;
      }
      if (this.state === 'START') {
        if (e.code === 'Enter' || e.code === 'Space') this.startGame();
        return;
      }
      if (this.state !== 'RUNNING') return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.moveLane(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.moveLane(1);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        this.jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.slide();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
    });

    // Mobile Swipe Gestures
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    window.addEventListener('touchstart', (e) => {
      if (this.state !== 'RUNNING') return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = performance.now();
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (this.state !== 'RUNNING') return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const deltaTime = performance.now() - touchStartTime;

      const minDistance = 24;
      if (deltaTime < 400 && (Math.abs(deltaX) > minDistance || Math.abs(deltaY) > minDistance)) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) this.moveLane(1);
          else this.moveLane(-1);
        } else {
          if (deltaY < 0) this.jump();
          else this.slide();
        }
      }
    }, { passive: true });

    // Botões Virtuais Touch
    const bindBtn = (id, action) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (this.state === 'START') this.startGame();
          else action();
        });
      }
    };

    bindBtn('btnTouchLeft', () => this.moveLane(-1));
    bindBtn('btnTouchRight', () => this.moveLane(1));
    bindBtn('btnTouchJump', () => this.jump());
    bindBtn('btnTouchSlide', () => this.slide());

    // Botões da UI
    const btnPause = document.getElementById('btnPause');
    if (btnPause) btnPause.onclick = () => this.togglePause();

    const btnResume = document.getElementById('btnResume');
    if (btnResume) btnResume.onclick = () => this.togglePause();

    const btnRestart = document.getElementById('btnRestart');
    if (btnRestart) btnRestart.onclick = () => this.restartGame();

    const btnSound = document.getElementById('btnSound');
    if (btnSound) {
      btnSound.onclick = () => {
        const isMuted = window.runnerAudio.toggleMute();
        btnSound.classList.toggle('is-muted', isMuted);
        btnSound.setAttribute('aria-label', isMuted ? 'Ligar som' : 'Desligar som');
        btnSound.title = isMuted ? 'Ligar som' : 'Desligar som';
      };
    }

    const btnGallery = document.getElementById('btnGallery');
    const modalGallery = document.getElementById('modalGallery');
    const btnCloseGallery = document.getElementById('btnCloseGallery');
    if (btnGallery && modalGallery) {
      btnGallery.onclick = () => {
        if (this.state === 'RUNNING') this.togglePause();
        modalGallery.classList.add('active');
      };
    }
    if (btnCloseGallery && modalGallery) {
      btnCloseGallery.onclick = () => modalGallery.classList.remove('active');
    }
  }

  // --------------------------------------------------------------------------
  // AÇÕES DO JOGADOR
  // --------------------------------------------------------------------------
  moveLane(dir) {
    const newLane = this.currentLane + dir;
    if (newLane >= -1 && newLane <= 1) {
      this.currentLane = newLane;
      this.player.rollTilt = dir * 0.18; // Inclinação dinâmica de curva
      if (window.runnerAudio) window.runnerAudio.playLaneSwitch();
    }
  }

  jump() {
    if (this.player.isJumping) return;
    this.player.isJumping = true;
    this.player.isSliding = false;
    this.player.vy = 18.0;
    if (window.runnerAudio) window.runnerAudio.playJump();
  }

  slide() {
    if (this.player.isSliding) return;
    this.player.isSliding = true;
    this.player.slideTimer = this.player.slideDuration;

    // Fast Fall se pressionado no ar
    if (this.player.isJumping) {
      this.player.vy = -24.0;
    }

    // Cria faíscas no chão
    this.spawnSlideSparks();
    if (window.runnerAudio) window.runnerAudio.playSlide();
  }

  spawnSlideSparks() {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: (this.width / 2) + (this.playerX * this.laneWidth) + (Math.random() - 0.5) * 50,
        y: this.height * 0.88 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 120,
        vy: -Math.random() * 80,
        size: Math.random() * 4 + 2,
        color: Math.random() < 0.5 ? '#facc15' : '#f97316',
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  // --------------------------------------------------------------------------
  // LOOP PRINCIPAL
  // --------------------------------------------------------------------------
  loop(timestamp) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.state === 'RUNNING') {
      this.update(dt);
    }

    this.render();
  }

  // --------------------------------------------------------------------------
  // ATUALIZAÇÃO DA LÓGICA E FÍSICA
  // --------------------------------------------------------------------------
  update(dt) {
    // 1. Velocidade progressiva
    if (this.activePowerups.turbo.active) {
      this.speed = this.baseSpeed * 1.5;
    } else {
      this.speed = Math.min(this.maxSpeed, this.baseSpeed + (this.score / 2000));
    }

    const distStep = this.speed * dt;
    this.distance += distStep;
    this.scoreFloat += distStep * 3.2 * this.multiplier;
    this.score = Math.floor(this.scoreFloat);

    const nextSceneIndex = Math.floor(this.distance / this.sceneLength) % 2;
    if (nextSceneIndex !== this.currentSceneIndex) {
      this.currentSceneIndex = nextSceneIndex;
      const sceneTitle = nextSceneIndex === 0 ? 'CHEGAMOS À ORLA!' : 'CHEGAMOS AO CENTRO!';
      this.spawnFloatingScore(sceneTitle, nextSceneIndex === 0 ? '#38bdf8' : '#16a34a');
    }

    // 2. Interpolação suave de faixa (Lerp)
    this.playerX += (this.currentLane - this.playerX) * Math.min(dt * 15, 1);
    this.player.rollTilt += (0 - this.player.rollTilt) * Math.min(dt * 8, 1);

    // 3. Física de Salto
    if (this.player.isJumping) {
      this.player.vy -= 46.0 * dt; // Gravidade
      this.player.y += this.player.vy * dt * 45;

      if (this.player.y <= 0) {
        this.player.y = 0;
        this.player.vy = 0;
        this.player.isJumping = false;
      }
    }

    // 4. Temporizador de Slide
    if (this.player.isSliding) {
      this.player.slideTimer -= dt;
      if (Math.random() < 0.3) this.spawnSlideSparks();
      if (this.player.slideTimer <= 0) {
        this.player.isSliding = false;
      }
    }

    // 5. Ciclo de Passos da Corrida
    if (!this.player.isJumping && !this.player.isSliding) {
      const stridesPerSecond = Math.min(5.2, this.speed * 0.22);
      this.player.runCycle = (this.player.runCycle + dt * stridesPerSecond) % 1;
      this.player.stepTimer = this.player.runCycle;
      this.player.stepFrame = this.player.runCycle < 0.5 ? 'a' : 'b';
    }

    // 6. Spawn Procedural de Obstáculos e Itens
    this.handleSpawns(dt);

    // 7. Atualizar Obstáculos
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= this.speed * dt * 0.085;

      // Colisão quando Z está muito próximo do jogador (Z ~ 0.0 a 0.25)
      if (obs.z > -0.02 && obs.z < 0.16) {
        const laneDiff = Math.abs(obs.lane - this.playerX);
        if (laneDiff < 0.65) {
          this.checkObstacleHit(obs);
        }
      }

      if (obs.z <= -0.08) {
        this.obstacles.splice(i, 1);
      }
    }

    // 8. Atualizar Colecionáveis
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.z -= this.speed * dt * 0.085;

      // Efeito de Atração Magnética (Ímã de Reciclagem)
      if (this.activePowerups.magnet.active && item.z > 0.05 && item.z < 1.15) {
        item.lane += (this.playerX - item.lane) * Math.min(dt * 12, 1);
        item.y += ((this.player.y / 80) - item.y) * Math.min(dt * 12, 1);
      }

      // Detecção de Coleta
      if (item.z > -0.02 && item.z < 0.17) {
        const laneDiff = Math.abs(item.lane - this.playerX);
        const yDiff = Math.abs(item.y * 80 - this.player.y);
        if (laneDiff < 0.75 && yDiff < 90) {
          this.collectItem(item, i);
        }
      } else if (item.z <= -0.08) {
        this.collectibles.splice(i, 1);
      }
    }

    // 9. Atualizar Power-ups
    if (this.activePowerups.magnet.active) {
      this.activePowerups.magnet.timeLeft -= dt;
      if (this.activePowerups.magnet.timeLeft <= 0) this.activePowerups.magnet.active = false;
    }
    if (this.activePowerups.turbo.active) {
      this.activePowerups.turbo.timeLeft -= dt;
      if (this.activePowerups.turbo.timeLeft <= 0) {
        this.activePowerups.turbo.active = false;
        this.multiplier = 1;
      }
    }

    // 10. Atualizar Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 11. Linhas de Velocidade Cinéticas
    if (this.activePowerups.turbo.active || this.speed > 28) {
      if (Math.random() < 0.4) {
        this.speedLines.push({
          x: Math.random() * this.width,
          y: Math.random() * (this.height * 0.7),
          len: Math.random() * 80 + 40,
          speed: Math.random() * 800 + 600,
          alpha: 0.6
        });
      }
    }
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      const sl = this.speedLines[i];
      sl.y += sl.speed * dt;
      sl.alpha -= dt * 1.5;
      if (sl.alpha <= 0 || sl.y > this.height) this.speedLines.splice(i, 1);
    }

    this.updateHUD();
  }

  // --------------------------------------------------------------------------
  // SPAWN PROCEDURAL
  // --------------------------------------------------------------------------
  handleSpawns(dt) {
    this.spawnTimer = (this.spawnTimer === undefined ? -0.8 : this.spawnTimer) + dt;

    if (this.spawnTimer > 1.45) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1

      // 55% chance de obstáculo, 45% de itens
      if (Math.random() < 0.58) {
        const types = ['cavalete', 'cone', 'cacamba', 'viga'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.obstacles.push({
          lane: lane,
          z: 4.2, // Distância Z inicial (fundo da pista)
          type: type
        });
      }

      // Spawn de Recicláveis em outra faixa
      const itemLane = (lane === 0) ? (Math.random() < 0.5 ? -1 : 1) : 0;
      const itemTypeRoll = Math.random();
      let itemType = 'latinha';
      if (itemTypeRoll < 0.35) itemType = 'garrafa';
      else if (itemTypeRoll < 0.65) itemType = 'caixa';
      else if (itemTypeRoll < 0.82) itemType = 'ima';
      else if (itemTypeRoll < 0.95) itemType = 'moeda';

      // Padrão de 3 itens seguidos na faixa
      for (let k = 0; k < 3; k++) {
        this.collectibles.push({
          lane: itemLane,
          z: 4.2 + (k * 0.36),
          y: 0,
          type: itemType,
          points: itemType === 'latinha' ? 50 : (itemType === 'garrafa' ? 75 : 100),
          isPowerup: itemType === 'ima' || itemType === 'moeda'
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // COLISÃO E COLETA
  // --------------------------------------------------------------------------
  checkObstacleHit(obs) {
    if (this.activePowerups.turbo.active) {
      // Destrói o obstáculo no modo turbo
      const idx = this.obstacles.indexOf(obs);
      if (idx !== -1) this.obstacles.splice(idx, 1);
      this.spawnFloatingScore('+500 TURBO!', '#22c55e');
      if (window.runnerAudio) window.runnerAudio.playCollect(5);
      return;
    }

    if (obs.type === 'cavalete' || obs.type === 'cone') {
      // Pular evita o obstáculo
      if (this.player.y < 35) {
        this.gameOver('Bateu no cavalete de obras!');
      }
    } else if (obs.type === 'viga') {
      // Slide evita a viga alta
      if (!this.player.isSliding) {
        this.gameOver('Não se abaixou a tempo na viga!');
      }
    } else if (obs.type === 'cacamba') {
      // Caçamba exige desviar de faixa
      this.gameOver('Colidiu com a caçamba de entulho!');
    }
  }

  collectItem(item, index) {
    this.collectibles.splice(index, 1);

    if (item.isPowerup) {
      if (item.type === 'ima') {
        this.activePowerups.magnet.active = true;
        this.activePowerups.magnet.timeLeft = this.activePowerups.magnet.maxTime;
        this.spawnFloatingScore('ÍMÃ DE RECICLAGEM ATIVADO!', '#38bdf8');
        if (window.runnerAudio) window.runnerAudio.playPowerup();
      } else if (item.type === 'moeda') {
        this.activePowerups.turbo.active = true;
        this.activePowerups.turbo.timeLeft = this.activePowerups.turbo.maxTime;
        this.multiplier = 3;
        this.spawnFloatingScore('TURBO BIODIESEL (3X)!', '#22c55e');
        if (window.runnerAudio) window.runnerAudio.playPowerup();
      }
    } else {
      this.recycledCount++;
      this.comboStreak++;
      const pts = item.points * this.multiplier;
      this.scoreFloat += pts;
      this.score = Math.floor(this.scoreFloat);
      this.spawnFloatingScore(`+${pts}`);
      if (window.runnerAudio) window.runnerAudio.playCollect(this.comboStreak);
    }
  }

  spawnFloatingScore(text, color = '#fbbf24') {
    const container = document.getElementById('floating-text-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'floating-score';
    el.textContent = text;
    el.style.color = color;
    container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 900);
  }

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO DA PISTA 3D E SPRITES
  // --------------------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const isPortrait = h > w;
    const worldDistance = this.state === 'START'
      ? (performance.now() * 0.009) % (this.sceneLength * 0.68)
      : this.distance;
    this.visualDistance = worldDistance;
    const horizonY = h * (isPortrait ? 0.285 : 0.335);
    const roadCenterX = w / 2;
    const roadTopW = Math.max(26, w * (isPortrait ? 0.075 : 0.058));
    const roadBottomW = w * (isPortrait ? 1.08 : 1.03);
    const roadWidthAt = (z) => roadTopW + (roadBottomW - roadTopW) * z;
    const sceneIndex = Math.floor(worldDistance / this.sceneLength) % 2;
    const sceneProgress = (worldDistance % this.sceneLength) / this.sceneLength;
    const transitionStart = 0.72;
    const rawTransition = Math.max(0, Math.min(1, (sceneProgress - transitionStart) / (1 - transitionStart)));
    const transitionBlend = rawTransition * rawTransition * (3 - 2 * rawTransition);
    const nextSceneIndex = (sceneIndex + 1) % 2;

    ctx.clearRect(0, 0, w, h);
    this.laneWidth = w * (isPortrait ? 0.295 : 0.305);
    this.roadBottomW = roadBottomW;

    this.renderLivingBackdrop(sceneIndex, 1, horizonY, isPortrait);
    if (transitionBlend > 0) {
      this.renderLivingBackdrop(nextSceneIndex, transitionBlend, horizonY, isPortrait);
    }

    this.renderMovingGround(sceneIndex, 1, horizonY, isPortrait);
    if (transitionBlend > 0) {
      this.renderMovingGround(nextSceneIndex, transitionBlend, horizonY, isPortrait);
    }

    const beachMix = sceneIndex === 0 ? 1 - transitionBlend : transitionBlend;
    this.renderDynamicRoad(roadCenterX, horizonY, roadTopW, roadBottomW, isPortrait, beachMix);

    this.renderPassingScenery(
      sceneIndex,
      Math.max(0, 1 - transitionBlend),
      roadCenterX,
      horizonY,
      roadTopW,
      roadBottomW,
      isPortrait
    );
    if (transitionBlend > 0.02) {
      this.renderPassingScenery(
        nextSceneIndex,
        transitionBlend,
        roadCenterX,
        horizonY,
        roadTopW,
        roadBottomW,
        isPortrait
      );
    }

    const drawList = [];
    this.obstacles.forEach((obs) => drawList.push({ type: 'obstacle', data: obs, z: obs.z }));
    this.collectibles.forEach((item) => drawList.push({ type: 'collectible', data: item, z: item.z }));
    drawList.sort((a, b) => b.z - a.z);

    drawList.forEach((item) => {
      const depth = 1 / (1 + Math.max(0, item.z) * 1.72);
      const trackZ = Math.pow(depth, isPortrait ? 1.42 : 1.5);
      const projY = horizonY + (h - horizonY) * trackZ;
      const currentRoadW = roadWidthAt(trackZ);
      const projX = roadCenterX + item.data.lane * (currentRoadW / 3);

      if (item.type === 'obstacle') this.renderObstacle(item.data, projX, projY, depth);
      else this.renderCollectible(item.data, projX, projY, depth);
    });

    if (this.state !== 'START') {
      this.renderPlayer(roadCenterX, h);
      this.renderEffects();
    }
  }

  renderLivingBackdrop(sceneIndex, opacity, horizonY, isPortrait) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const travel = this.visualDistance;

    ctx.save();
    ctx.globalAlpha = opacity;

    const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 80);
    if (sceneIndex === 0) {
      sky.addColorStop(0, '#25aef1');
      sky.addColorStop(0.62, '#8ce5ff');
      sky.addColorStop(1, '#eefcff');
    } else {
      sky.addColorStop(0, '#3bbbf3');
      sky.addColorStop(0.65, '#a4e8fb');
      sky.addColorStop(1, '#fff2cf');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizonY + 100);

    // Sol e nuvens são camadas separadas, com paralaxe própria.
    const sunX = w * (sceneIndex === 0 ? 0.78 : 0.2);
    const sunY = h * 0.13;
    const sunRadius = Math.max(28, Math.min(64, w * 0.055));
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 2.4);
    sunGlow.addColorStop(0, 'rgba(255, 248, 190, 0.9)');
    sunGlow.addColorStop(0.35, 'rgba(255, 221, 107, 0.34)');
    sunGlow.addColorStop(1, 'rgba(255, 221, 107, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    for (let cloud = 0; cloud < 7; cloud++) {
      const span = w + 320;
      let cloudX = (cloud * 233 - travel * (0.42 + cloud * 0.025)) % span;
      if (cloudX < -160) cloudX += span;
      const cloudY = h * (0.075 + (cloud % 3) * 0.052);
      const cloudScale = (isPortrait ? 0.55 : 0.8) + (cloud % 4) * 0.11;
      this.drawLivingCloud(cloudX - 100, cloudY, cloudScale);
    }

    if (sceneIndex === 0) {
      const seaTop = horizonY - h * (isPortrait ? 0.105 : 0.13);
      const sea = ctx.createLinearGradient(0, seaTop, 0, horizonY + h * 0.08);
      sea.addColorStop(0, '#167fd0');
      sea.addColorStop(0.48, '#13c7df');
      sea.addColorStop(1, '#8af1e1');
      ctx.fillStyle = sea;
      ctx.fillRect(0, seaTop, w, horizonY - seaTop + h * 0.08);

      // Ondas se deslocam lateralmente em velocidades diferentes.
      for (let wave = 0; wave < 7; wave++) {
        const y = seaTop + 12 + wave * (isPortrait ? 7 : 9);
        const phase = (travel * (0.9 + wave * 0.12)) % 86;
        ctx.strokeStyle = `rgba(255,255,255,${0.42 - wave * 0.035})`;
        ctx.lineWidth = 1.2 + wave * 0.22;
        ctx.beginPath();
        for (let x = -100 - phase; x < w + 100; x += 86) {
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 22, y - 4 - wave * 0.3, x + 44, y);
          ctx.quadraticCurveTo(x + 65, y + 3, x + 86, y);
        }
        ctx.stroke();
      }

      const duneShift = (travel * 0.1) % 260;
      ctx.fillStyle = '#edd59a';
      for (let x = -300 - duneShift; x < w + 300; x += 260) {
        ctx.beginPath();
        ctx.ellipse(x, horizonY + 26, 170, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Silhueta urbana distante também desliza, mais devagar que os prédios próximos.
      ctx.fillStyle = '#5da06d';
      ctx.beginPath();
      ctx.moveTo(0, horizonY + 22);
      for (let x = 0; x <= w; x += 70) {
        ctx.lineTo(x, horizonY - 8 - Math.sin((x + travel * 0.08) * 0.012) * 22);
      }
      ctx.lineTo(w, horizonY + 60);
      ctx.lineTo(0, horizonY + 60);
      ctx.closePath();
      ctx.fill();

      const skylineShift = (travel * 0.14) % 92;
      for (let i = -2; i < Math.ceil(w / 62) + 3; i++) {
        const x = i * 62 - skylineShift;
        const buildingH = 34 + ((i * 37 + 90) % 58);
        ctx.fillStyle = i % 3 === 0 ? '#ffd08b' : (i % 3 === 1 ? '#78b9c9' : '#f4a77c');
        ctx.fillRect(x, horizonY - buildingH + 12, 42 + (i % 2) * 12, buildingH);
        ctx.fillStyle = 'rgba(255,255,220,0.72)';
        for (let wy = horizonY - buildingH + 22; wy < horizonY; wy += 13) {
          ctx.fillRect(x + 8, wy, 6, 6);
          ctx.fillRect(x + 24, wy, 6, 6);
        }
      }
    }

    ctx.restore();
  }

  drawLivingCloud(x, y, scale) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.beginPath();
    ctx.arc(28, 18, 19, 0, Math.PI * 2);
    ctx.arc(52, 9, 28, 0, Math.PI * 2);
    ctx.arc(82, 18, 22, 0, Math.PI * 2);
    ctx.roundRect(17, 18, 82, 28, 16);
    ctx.fill();
    ctx.restore();
  }

  renderMovingGround(sceneIndex, opacity, horizonY, isPortrait) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const groundHeight = h - horizonY;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.rect(0, horizonY, w, groundHeight);
    ctx.clip();

    if (sceneIndex === 0) {
      ctx.fillStyle = '#e7bd72';
      ctx.fillRect(0, horizonY, w, groundHeight);
      const sand = this.sprites.texture_sand;
      if (sand && sand.complete && sand.naturalWidth > 0) {
        const tileHeight = isPortrait ? 470 : 360;
        const offset = (this.visualDistance * 12) % tileHeight;
        ctx.globalAlpha = opacity * 0.72;
        for (let y = horizonY - tileHeight + offset; y < h; y += tileHeight) {
          ctx.drawImage(sand, 0, 0, sand.naturalWidth, sand.naturalHeight, 0, y, w, tileHeight + 1);
        }
        const sandDepth = ctx.createLinearGradient(0, horizonY, 0, h);
        sandDepth.addColorStop(0, 'rgba(255, 244, 200, 0.5)');
        sandDepth.addColorStop(0.55, 'rgba(239, 194, 111, 0.08)');
        sandDepth.addColorStop(1, 'rgba(184, 123, 51, 0.18)');
        ctx.globalAlpha = opacity;
        ctx.fillStyle = sandDepth;
        ctx.fillRect(0, horizonY, w, groundHeight);
      }
    } else {
      const pavement = ctx.createLinearGradient(0, horizonY, 0, h);
      pavement.addColorStop(0, '#d7d9d2');
      pavement.addColorStop(1, '#f0dfbd');
      ctx.fillStyle = pavement;
      ctx.fillRect(0, horizonY, w, groundHeight);

      const tilePhase = (this.visualDistance * 0.02) % 1;
      for (let tile = 0; tile < 18; tile++) {
        const worldZ = (tile / 18 + tilePhase) % 1;
        const z = Math.pow(worldZ, 1.5);
        const y = horizonY + groundHeight * z;
        ctx.strokeStyle = `rgba(92, 105, 101, ${0.1 + z * 0.2})`;
        ctx.lineWidth = 0.7 + z * 1.7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const gridShift = (this.visualDistance * 2.2) % 90;
      ctx.strokeStyle = 'rgba(92, 105, 101, 0.16)';
      ctx.lineWidth = 1;
      for (let x = -w; x < w * 2; x += 90) {
        ctx.beginPath();
        ctx.moveTo(w / 2, horizonY);
        ctx.lineTo(x - gridShift, h);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  renderDynamicRoad(roadCenterX, horizonY, roadTopW, roadBottomW, isPortrait, beachMix) {
    const ctx = this.ctx;
    const h = this.height;
    const roadHeight = h - horizonY;
    const roadWidthAt = (z) => roadTopW + (roadBottomW - roadTopW) * z;
    const asphalt = this.sprites.texture_asphalt;

    // Faixa de passeio separa o asfalto da areia sem virar um fundo estático.
    if (beachMix > 0.01) {
      const walkTop = Math.max(5, roadTopW * 0.26);
      const walkBottom = this.width * (isPortrait ? 0.075 : 0.065);
      ctx.save();
      ctx.globalAlpha = beachMix;
      [-1, 1].forEach((side) => {
        ctx.fillStyle = '#ead8b6';
        ctx.beginPath();
        ctx.moveTo(roadCenterX + side * roadTopW / 2, horizonY);
        ctx.lineTo(roadCenterX + side * (roadTopW / 2 + walkTop), horizonY);
        ctx.lineTo(roadCenterX + side * (roadBottomW / 2 + walkBottom), h);
        ctx.lineTo(roadCenterX + side * roadBottomW / 2, h);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(roadCenterX - roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadBottomW / 2, h);
    ctx.lineTo(roadCenterX - roadBottomW / 2, h);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#34373a';
    ctx.fillRect(0, horizonY, this.width, roadHeight);
    if (asphalt && asphalt.complete && asphalt.naturalWidth > 0) {
      const tileHeight = isPortrait ? 520 : 410;
      const offset = (this.visualDistance * 18) % tileHeight;
      ctx.globalAlpha = 0.72;
      for (let y = horizonY - tileHeight + offset; y < h; y += tileHeight) {
        ctx.drawImage(
          asphalt,
          0,
          0,
          asphalt.naturalWidth,
          asphalt.naturalHeight,
          0,
          y,
          this.width,
          tileHeight + 1
        );
      }
    }

    const shade = ctx.createLinearGradient(0, horizonY, 0, h);
    shade.addColorStop(0, 'rgba(32, 43, 48, 0.36)');
    shade.addColorStop(0.62, 'rgba(20, 24, 28, 0.02)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = shade;
    ctx.fillRect(0, horizonY, this.width, roadHeight);
    ctx.restore();

    const markerPhase = (this.visualDistance * 0.021) % 1;
    [-1, 1].forEach((separator) => {
      for (let marker = 0; marker < 12; marker++) {
        const worldZ = (marker / 12 + markerPhase) % 1;
        const worldEnd = Math.min(1, worldZ + 0.037 + worldZ * 0.028);
        const z1 = Math.pow(worldZ, 1.52);
        const z2 = Math.pow(worldEnd, 1.52);
        const y1 = horizonY + roadHeight * z1;
        const y2 = horizonY + roadHeight * z2;
        const width1 = roadWidthAt(z1);
        const width2 = roadWidthAt(z2);
        const x1 = roadCenterX + separator * width1 / 6;
        const x2 = roadCenterX + separator * width2 / 6;
        const half1 = 0.7 + z1 * (isPortrait ? 2.5 : 3.6);
        const half2 = 0.9 + z2 * (isPortrait ? 4.1 : 5.4);
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath();
        ctx.moveTo(x1 - half1, y1);
        ctx.lineTo(x1 + half1, y1);
        ctx.lineTo(x2 + half2, y2);
        ctx.lineTo(x2 - half2, y2);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Meio-fio segmentado rolando nas duas bordas da pista.
    for (let curb = 0; curb < 22; curb++) {
      const worldZ = (curb / 22 + markerPhase * 1.12) % 1;
      const worldEnd = Math.min(1, worldZ + 0.052);
      const z1 = Math.pow(worldZ, 1.5);
      const z2 = Math.pow(worldEnd, 1.5);
      const y1 = horizonY + roadHeight * z1;
      const y2 = horizonY + roadHeight * z2;
      const w1 = roadWidthAt(z1);
      const w2 = roadWidthAt(z2);
      const curbThickness1 = 1 + z1 * 9;
      const curbThickness2 = 1 + z2 * 11;
      [-1, 1].forEach((side) => {
        const x1 = roadCenterX + side * w1 / 2;
        const x2 = roadCenterX + side * w2 / 2;
        ctx.fillStyle = curb % 2 === 0 ? '#f8f2df' : '#26a78f';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + side * curbThickness1, y1);
        ctx.lineTo(x2 + side * curbThickness2, y2);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fill();
      });
    }
  }

  renderLegacy() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const isPortrait = h > w;

    ctx.clearRect(0, 0, w, h);

    // Rota contínua em dois trechos: começa na praia e chega ao centro.
    // Cada placa avança em profundidade e dissolve na próxima sem corte seco.
    const beachEnvironment = isPortrait ? this.sprites.environment_mobile : this.sprites.environment_wide;
    const cityEnvironment = isPortrait ? this.sprites.environment_city_mobile : this.sprites.environment_city_wide;
    const sceneImages = [beachEnvironment, cityEnvironment];
    const sceneIndex = Math.floor(this.distance / this.sceneLength) % sceneImages.length;
    const sceneProgress = (this.distance % this.sceneLength) / this.sceneLength;
    const environment = sceneImages[sceneIndex];
    const nextEnvironment = sceneImages[(sceneIndex + 1) % sceneImages.length];
    if (environment && environment.complete && environment.naturalWidth > 0) {
      const cameraBob = this.state === 'RUNNING' ? Math.sin(this.distance * 0.12) * 1.7 : 0;
      const horizonY = h * (isPortrait ? 0.292 : 0.355);
      const roadCenterX = w / 2;
      const roadTopW = Math.max(24, w * (isPortrait ? 0.075 : 0.055));
      const roadBottomW = w * (isPortrait ? 1.04 : 1.02);
      const roadWidthAt = (z) => roadTopW + (roadBottomW - roadTopW) * z;

      this.laneWidth = w * (isPortrait ? 0.295 : 0.305);
      this.roadBottomW = roadBottomW;

      this.renderEnvironmentLayer(environment, sceneProgress, 1, cameraBob, horizonY);

      const transitionStart = 0.72;
      const rawTransition = Math.max(0, Math.min(1, (sceneProgress - transitionStart) / (1 - transitionStart)));
      const transitionBlend = rawTransition * rawTransition * (3 - 2 * rawTransition);
      const nextReady = nextEnvironment && nextEnvironment.complete && nextEnvironment.naturalWidth > 0;

      if (transitionBlend > 0 && nextReady) {
        this.renderEnvironmentLayer(nextEnvironment, 0, transitionBlend, cameraBob, horizonY);
        ctx.fillStyle = `rgba(255, 244, 211, ${Math.sin(transitionBlend * Math.PI) * 0.075})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Leve filtro de integração mantém sprites e ambiente na mesma luz.
      const atmosphere = ctx.createLinearGradient(0, 0, 0, h);
      atmosphere.addColorStop(0, 'rgba(71, 194, 242, 0.035)');
      atmosphere.addColorStop(0.62, 'rgba(255, 196, 106, 0)');
      atmosphere.addColorStop(1, 'rgba(255, 159, 78, 0.055)');
      ctx.fillStyle = atmosphere;
      ctx.fillRect(0, 0, w, h);

      // O cenário é uma arte de alta qualidade, mas a pista precisa ter vida.
      // Textura, sombras e faixas são reprojetadas pela distância percorrida,
      // dando fluxo contínuo para a câmera mesmo sem repetir o horizonte.
      const roadEnvironment = transitionBlend > 0.55 && nextReady ? nextEnvironment : environment;
      this.renderRoadMotion(roadEnvironment, roadCenterX, horizonY, roadTopW, roadBottomW, isPortrait);

      // Palmeiras, postes e bancos percorrem a perspectiva das calçadas.
      // O cenário deixa de ser apenas uma placa e ganha objetos que passam
      // fisicamente pela câmera, como em um endless runner 3D.
      this.renderPassingScenery(
        sceneIndex,
        Math.max(0, 1 - transitionBlend),
        roadCenterX,
        horizonY,
        roadTopW,
        roadBottomW,
        isPortrait
      );
      if (transitionBlend > 0.02) {
        this.renderPassingScenery(
          (sceneIndex + 1) % sceneImages.length,
          transitionBlend,
          roadCenterX,
          horizonY,
          roadTopW,
          roadBottomW,
          isPortrait
        );
      }

      const drawList = [];
      this.obstacles.forEach((obs) => drawList.push({ type: 'obstacle', data: obs, z: obs.z }));
      this.collectibles.forEach((item) => drawList.push({ type: 'collectible', data: item, z: item.z }));
      drawList.sort((a, b) => b.z - a.z);

      drawList.forEach((item) => {
        const depth = 1 / (1 + Math.max(0, item.z) * 1.72);
        const trackZ = Math.pow(depth, isPortrait ? 1.42 : 1.5);
        const projY = horizonY + (h - horizonY) * trackZ;
        const currentRoadW = roadWidthAt(trackZ);
        const projX = roadCenterX + item.data.lane * (currentRoadW / 3);

        if (item.type === 'obstacle') this.renderObstacle(item.data, projX, projY, depth);
        else this.renderCollectible(item.data, projX, projY, depth);
      });

      this.renderPlayer(roadCenterX, h);
      this.renderEffects();
      return;
    }

    // O horizonte acompanha o formato da tela sem esmagar a composição.
    const horizonY = h * (isPortrait ? 0.34 : 0.445);
    const backgroundBottom = horizonY + Math.min(56, h * 0.07);
    const roadCenterX = w / 2;
    const roadTopW = Math.max(86, Math.min(w * 0.22, 310));
    const roadBottomW = Math.min(w * 0.92, Math.max(680, h * 1.22));
    const walkTopW = roadTopW * 1.46;
    const walkBottomW = Math.min(w * 1.15, roadBottomW + Math.max(120, w * 0.15));
    const perspectiveY = (z) => horizonY + (h - horizonY) * Math.pow(z, 1.55);
    const roadWidthAt = (z) => roadTopW + (roadBottomW - roadTopW) * z;

    this.laneWidth = (roadBottomW / 3) * 0.86;
    this.roadBottomW = roadBottomW;

    // 1. Panorama com recorte responsivo. Em telas verticais, corta as laterais
    // para preservar as proporções e manter a avenida centralizada.
    const panorama = this.sprites.panorama;
    if (panorama && panorama.complete && panorama.naturalWidth > 0) {
      const imageRatio = panorama.naturalWidth / panorama.naturalHeight;
      const targetRatio = w / backgroundBottom;
      let sx = 0;
      let sy = 0;
      let sw = panorama.naturalWidth;
      let sh = panorama.naturalHeight;

      if (targetRatio < imageRatio) {
        sw = sh * targetRatio;
        sx = (panorama.naturalWidth - sw) / 2 + this.playerX * 7;
        sx = Math.max(0, Math.min(panorama.naturalWidth - sw, sx));
      }

      ctx.drawImage(panorama, sx, sy, sw, sh, 0, 0, w, backgroundBottom);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, backgroundBottom);
      sky.addColorStop(0, '#37b9ea');
      sky.addColorStop(0.7, '#8fe4ef');
      sky.addColorStop(1, '#c4efe4');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, backgroundBottom);
    }

    // Névoa suave une o panorama ao trecho jogável.
    const horizonHaze = ctx.createLinearGradient(0, horizonY - 52, 0, horizonY + 64);
    horizonHaze.addColorStop(0, 'rgba(219, 250, 238, 0)');
    horizonHaze.addColorStop(0.54, 'rgba(219, 250, 238, 0.16)');
    horizonHaze.addColorStop(1, 'rgba(28, 132, 82, 0)');
    ctx.fillStyle = horizonHaze;
    ctx.fillRect(0, horizonY - 52, w, 116);

    // 2. Áreas verdes laterais com iluminação e textura.
    const verge = ctx.createLinearGradient(0, horizonY, 0, h);
    verge.addColorStop(0, '#43a95c');
    verge.addColorStop(0.42, '#178749');
    verge.addColorStop(1, '#07513a');
    ctx.fillStyle = verge;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    const vergeLight = ctx.createRadialGradient(w / 2, horizonY, 10, w / 2, horizonY, w * 0.72);
    vergeLight.addColorStop(0, 'rgba(211, 255, 172, 0.24)');
    vergeLight.addColorStop(1, 'rgba(0, 51, 41, 0)');
    ctx.fillStyle = vergeLight;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // 3. Calçadas e bordas em perspectiva.
    ctx.beginPath();
    ctx.moveTo(roadCenterX - walkTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + walkTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + walkBottomW / 2, h);
    ctx.lineTo(roadCenterX - walkBottomW / 2, h);
    ctx.closePath();
    const walk = ctx.createLinearGradient(0, horizonY, 0, h);
    walk.addColorStop(0, '#e6d7bd');
    walk.addColorStop(0.5, '#c7b394');
    walk.addColorStop(1, '#8f795f');
    ctx.fillStyle = walk;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(roadCenterX - roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadBottomW / 2, h);
    ctx.lineTo(roadCenterX - roadBottomW / 2, h);
    ctx.closePath();
    const asphalt = ctx.createLinearGradient(0, horizonY, 0, h);
    asphalt.addColorStop(0, '#4d5f64');
    asphalt.addColorStop(0.38, '#31454b');
    asphalt.addColorStop(1, '#172b31');
    ctx.fillStyle = asphalt;
    ctx.fill();

    // Luz central, marcas de uso e profundidade no asfalto.
    const roadLight = ctx.createRadialGradient(roadCenterX, horizonY, 0, roadCenterX, h * 0.75, roadBottomW * 0.62);
    roadLight.addColorStop(0, 'rgba(194, 229, 213, 0.13)');
    roadLight.addColorStop(0.58, 'rgba(129, 175, 160, 0.07)');
    roadLight.addColorStop(1, 'rgba(0, 15, 20, 0.18)');
    ctx.fillStyle = roadLight;
    ctx.beginPath();
    ctx.moveTo(roadCenterX - roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadBottomW / 2, h);
    ctx.lineTo(roadCenterX - roadBottomW / 2, h);
    ctx.closePath();
    ctx.fill();

    const motionPhase = (this.distance * 0.032) % 1;
    for (let i = 0; i < 9; i++) {
      const z = (i / 9 + motionPhase) % 1;
      if (z < 0.05) continue;
      const y = perspectiveY(z);
      const rw = roadWidthAt(z);
      const side = i % 2 === 0 ? -1 : 1;
      const x = roadCenterX + side * rw * (0.12 + (i % 3) * 0.08);
      ctx.strokeStyle = `rgba(220, 238, 229, ${0.025 + z * 0.035})`;
      ctx.lineWidth = Math.max(1, z * 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * 18 * z, Math.min(h, y + 70 * z));
      ctx.stroke();
    }

    // 4. Meio-fio solar: a paleta própria substitui o zebrado genérico.
    const curbSegments = 22;
    for (let i = 0; i < curbSegments; i++) {
      const z1 = i / curbSegments;
      const z2 = (i + 1) / curbSegments;
      const y1 = perspectiveY(z1);
      const y2 = perspectiveY(z2);
      const rw1 = roadWidthAt(z1);
      const rw2 = roadWidthAt(z2);
      const cw1 = 3 + z1 * 13;
      const cw2 = 3 + z2 * 13;
      ctx.fillStyle = ((i + Math.floor(this.distance * 0.7)) % 2 === 0) ? '#ffc83d' : '#fff7db';

      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(roadCenterX + side * rw1 / 2, y1);
        ctx.lineTo(roadCenterX + side * (rw1 / 2 + cw1), y1);
        ctx.lineTo(roadCenterX + side * (rw2 / 2 + cw2), y2);
        ctx.lineTo(roadCenterX + side * rw2 / 2, y2);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 5. Marcação das faixas com deslocamento contínuo.
    ctx.fillStyle = 'rgba(245, 252, 246, 0.9)';
    [-1 / 6, 1 / 6].forEach((laneOffset) => {
      for (let i = 0; i < 15; i++) {
        const z1 = (i / 15 + motionPhase) % 1;
        const z2 = Math.min(1, z1 + 0.045 + z1 * 0.022);
        if (z2 <= z1 || z1 < 0.035) continue;
        const y1 = perspectiveY(z1);
        const y2 = perspectiveY(z2);
        const rw1 = roadWidthAt(z1);
        const rw2 = roadWidthAt(z2);
        const x1 = roadCenterX + rw1 * laneOffset;
        const x2 = roadCenterX + rw2 * laneOffset;
        const sw1 = 1.5 + z1 * 4.5;
        const sw2 = 1.5 + z2 * 4.5;
        ctx.beginPath();
        ctx.moveTo(x1 - sw1, y1);
        ctx.lineTo(x1 + sw1, y1);
        ctx.lineTo(x2 + sw2, y2);
        ctx.lineTo(x2 - sw2, y2);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 6. Paisagismo urbano: luminárias e canteiros passam em profundidade.
    const scenery = [];
    for (let i = 0; i < 11; i++) scenery.push({ z: (i / 11 + (this.distance * 0.011)) % 1, kind: i % 3 });
    scenery.sort((a, b) => a.z - b.z);
    scenery.forEach(({ z, kind }) => {
      if (z < 0.055 || z > 0.94) return;
      const y = perspectiveY(z);
      const rw = roadWidthAt(z);
      const scale = 0.16 + z * 0.92;

      [-1, 1].forEach((side) => {
        const x = roadCenterX + side * (rw / 2 + 25 + z * Math.min(90, w * 0.08));
        if (kind === 0) {
          // Poste curvo com luminária quente.
          const postH = 30 + 105 * scale;
          ctx.strokeStyle = '#344f4a';
          ctx.lineWidth = 2 + 3.5 * z;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - postH);
          ctx.quadraticCurveTo(x, y - postH - 9 * scale, x - side * 12 * scale, y - postH - 10 * scale);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 220, 113, 0.85)';
          ctx.beginPath();
          ctx.ellipse(x - side * 14 * scale, y - postH - 9 * scale, 7 * scale, 4 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Canteiro com arbustos em camadas.
          ctx.fillStyle = '#a87949';
          ctx.beginPath();
          ctx.roundRect(x - 22 * scale, y - 8 * scale, 44 * scale, 12 * scale, 4 * scale);
          ctx.fill();
          ['#0c6f46', '#169754', '#35b95f'].forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + (index - 1) * 12 * scale, y - (12 + (index % 2) * 5) * scale, (13 + index * 2) * scale, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
    });

    // 7. Objetos da pista, do fundo para a frente.
    const drawList = [];
    this.obstacles.forEach((obs) => drawList.push({ type: 'obstacle', data: obs, z: obs.z }));
    this.collectibles.forEach((item) => drawList.push({ type: 'collectible', data: item, z: item.z }));
    drawList.sort((a, b) => b.z - a.z);

    drawList.forEach((item) => {
      const depth = 1 / (1 + Math.max(0, item.z) * 1.8);
      const trackZ = Math.pow(depth, 1.55);
      const projY = horizonY + (h - horizonY) * trackZ;
      const currentRoadW = roadWidthAt(trackZ);
      const projX = roadCenterX + item.data.lane * (currentRoadW / 3);

      if (item.type === 'obstacle') this.renderObstacle(item.data, projX, projY, depth);
      else this.renderCollectible(item.data, projX, projY, depth);
    });

    this.renderPlayer(roadCenterX, h);
    this.renderEffects();

    // Acabamento cinematográfico discreto nas bordas do canvas.
    const grade = ctx.createLinearGradient(0, 0, 0, h);
    grade.addColorStop(0, 'rgba(12, 83, 73, 0.04)');
    grade.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    grade.addColorStop(1, 'rgba(0, 18, 18, 0.11)');
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, w, h);
  }

  // Mantido apenas como referência da primeira versão durante a lapidação.
  renderLegacy() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Cenário de Fundo (Panorama de Parnamirim)
    const horizonY = h * 0.44;
    if (this.sprites.panorama && this.sprites.panorama.complete) {
      // Paralaxe suave no horizonte
      const panoX = -((this.playerX + 1) * 28);
      ctx.drawImage(this.sprites.panorama, panoX - 25, 0, w + 70, horizonY + 8);
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizonY);
    }

    // 2. Gramados Tropicais com Degradê
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    groundGrad.addColorStop(0, '#16a34a');
    groundGrad.addColorStop(0.3, '#15803d');
    groundGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // 3. Estrada de 3 Faixas conectando com a imagem de fundo
    const roadTopW = w * 0.125; // Alinhado com a estrada do panorama
    const roadBottomW = Math.min(w * 0.84, 720);
    const roadCenterX = w / 2;

    // Calçadas de Concreto nas Margens
    const walkTopW = roadTopW * 1.6;
    const walkBottomW = roadBottomW * 1.35;
    ctx.beginPath();
    ctx.moveTo(roadCenterX - walkTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + walkTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + walkBottomW / 2, h);
    ctx.lineTo(roadCenterX - walkBottomW / 2, h);
    ctx.closePath();
    const walkGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    walkGrad.addColorStop(0, '#cbd5e1');
    walkGrad.addColorStop(1, '#64748b');
    ctx.fillStyle = walkGrad;
    ctx.fill();

    // Asfalto escuro
    ctx.beginPath();
    ctx.moveTo(roadCenterX - roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadBottomW / 2, h);
    ctx.lineTo(roadCenterX - roadBottomW / 2, h);
    ctx.closePath();

    const roadGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    roadGrad.addColorStop(0, '#334155');
    roadGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = roadGrad;
    ctx.fill();

    // Palmeiras Tropicais Animadas nas Margens da Calçada
    const scenerySegments = 7;
    for (let sc = 0; sc < scenerySegments; sc++) {
      const zOffset = ((this.distance * 0.08 + (sc / scenerySegments)) % 1.0);
      const scale = Math.pow(zOffset, 2.2);
      const scY = horizonY + (h - horizonY) * scale;
      const currentRw = roadTopW + (roadBottomW - roadTopW) * zOffset;

      if (scale > 0.06 && scale < 0.96) {
        [-1, 1].forEach(side => {
          const px = roadCenterX + (side * currentRw * 0.72);
          const trunkH = 95 * scale;
          const trunkW = Math.max(2, 6 * scale);

          // Tronco de palmeira
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px - trunkW / 2, scY - trunkH, trunkW, trunkH);

          // Folhagens de palmeira tropicais (arcos verdes)
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(px, scY - trunkH, 28 * scale, 14 * scale, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(px, scY - trunkH - 4 * scale, 22 * scale, 10 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // Meio-Fio Zebrado Vermelho e Branco (Rumble Strips)
    const segments = 16;
    for (let s = 0; s < segments; s++) {
      const z1 = s / segments;
      const z2 = (s + 1) / segments;

      // Movimento contínuo baseado na distância
      const isRed = ((Math.floor(this.distance * 1.5) + s) % 2 === 0);
      ctx.fillStyle = isRed ? '#ef4444' : '#ffffff';

      const y1 = horizonY + (h - horizonY) * Math.pow(z1, 2.2);
      const y2 = horizonY + (h - horizonY) * Math.pow(z2, 2.2);

      const rw1 = roadTopW + (roadBottomW - roadTopW) * z1;
      const rw2 = roadTopW + (roadBottomW - roadTopW) * z2;
      const curbW1 = Math.max(3, 14 * z1);
      const curbW2 = Math.max(3, 14 * z2);

      // Meio-fio Esquerdo
      ctx.beginPath();
      ctx.moveTo(roadCenterX - rw1 / 2 - curbW1, y1);
      ctx.lineTo(roadCenterX - rw1 / 2, y1);
      ctx.lineTo(roadCenterX - rw2 / 2, y2);
      ctx.lineTo(roadCenterX - rw2 / 2 - curbW2, y2);
      ctx.fill();

      // Meio-fio Direito
      ctx.beginPath();
      ctx.moveTo(roadCenterX + rw1 / 2, y1);
      ctx.lineTo(roadCenterX + rw1 / 2 + curbW1, y1);
      ctx.lineTo(roadCenterX + rw2 / 2 + curbW2, y2);
      ctx.lineTo(roadCenterX + rw2 / 2, y2);
      ctx.fill();
    }

    // Faixas Brancas Tracejadas Divisórias (Entre Faixa 1/2 e 2/3)
    ctx.fillStyle = '#ffffff';
    [-0.33, 0.33].forEach(stripeOffset => {
      for (let s = 0; s < segments; s += 2) {
        const offsetZ = ((this.distance * 0.08) % 1.0);
        const z1 = Math.min(1, Math.max(0, (s / segments) + offsetZ * 0.12));
        const z2 = Math.min(1, z1 + 0.06);

        const y1 = horizonY + (h - horizonY) * Math.pow(z1, 2.2);
        const y2 = horizonY + (h - horizonY) * Math.pow(z2, 2.2);

        const rw1 = roadTopW + (roadBottomW - roadTopW) * z1;
        const rw2 = roadTopW + (roadBottomW - roadTopW) * z2;

        const x1 = roadCenterX + (rw1 * stripeOffset);
        const x2 = roadCenterX + (rw2 * stripeOffset);
        const sw = Math.max(2, 6 * z1);

        ctx.beginPath();
        ctx.moveTo(x1 - sw / 2, y1);
        ctx.lineTo(x1 + sw / 2, y1);
        ctx.lineTo(x2 + sw / 2, y2);
        ctx.lineTo(x2 - sw / 2, y2);
        ctx.fill();
      }
    });

    // 4. Desenhar Obstáculos e Colecionáveis Ordenados por Distância Z (Depth Sorting)
    const drawList = [];

    this.obstacles.forEach(obs => {
      drawList.push({ type: 'obstacle', data: obs, z: obs.z });
    });

    this.collectibles.forEach(col => {
      drawList.push({ type: 'collectible', data: col, z: col.z });
    });

    // Ordena do fundo para a frente (Z maior primeiro)
    drawList.sort((a, b) => b.z - a.z);

    drawList.forEach(item => {
      // Projeção em perspectiva da posição Z
      const depthFactor = 1 / (1 + item.z * 1.8);
      const projY = horizonY + (h - horizonY) * Math.pow(depthFactor, 2.2);
      const currentRoadW = roadTopW + (roadBottomW - roadTopW) * depthFactor;
      const projX = roadCenterX + (item.data.lane * (currentRoadW / 3));

      if (item.type === 'obstacle') {
        this.renderObstacle(item.data, projX, projY, depthFactor);
      } else {
        this.renderCollectible(item.data, projX, projY, depthFactor);
      }
    });

    // 5. Desenhar o Personagem Cajulim de Costas
    this.renderPlayer(roadCenterX, h);

    // 6. Desenhar Partículas e Efeitos de Velocidade
    this.renderEffects();
  }

  renderObstacle(obs, x, y, scale) {
    const ctx = this.ctx;
    const baseW = 158 * scale;
    const baseH = 122 * scale;

    let spriteKey = 'obs_cavalete';
    if (obs.type === 'cone') spriteKey = 'obs_cone';
    else if (obs.type === 'cacamba') spriteKey = 'obs_cacamba';
    else if (obs.type === 'viga') spriteKey = 'obs_viga';

    const sprite = this.sprites[spriteKey];

    // Sombra do obstáculo
    ctx.save();
    ctx.fillStyle = 'rgba(4, 20, 24, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + 5 * scale, baseW * 0.45, baseH * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const renderW = (obs.type === 'cacamba' ? 1.48 : (obs.type === 'viga' ? 1.72 : 1.0)) * baseW;
      const renderH = (obs.type === 'viga' ? 1.28 : 1.0) * baseH;
      const yOffset = obs.type === 'viga' ? -baseH * 0.6 : 0; // Viga fica alta
      ctx.drawImage(sprite, x - renderW / 2, y - renderH + yOffset, renderW, renderH);
    } else {
      // Fallback estilizado se sprite ainda estiver carregando
      ctx.fillStyle = obs.type === 'cacamba' ? '#0284c7' : (obs.type === 'cone' ? '#f97316' : '#ef4444');
      ctx.fillRect(x - baseW / 2, y - baseH, baseW, baseH);
    }
  }

  renderCollectible(item, x, y, scale) {
    const ctx = this.ctx;
    const size = 76 * scale;
    const floatY = y - (item.y * 80 * scale) - (Math.sin(performance.now() * 0.006 + item.z * 5) * 8 * scale);

    let spriteKey = 'item_latinha';
    if (item.type === 'garrafa') spriteKey = 'item_garrafa';
    else if (item.type === 'caixa') spriteKey = 'item_caixa';
    else if (item.type === 'ima') spriteKey = 'item_ima';
    else if (item.type === 'moeda') spriteKey = 'item_moeda';

    const sprite = this.sprites[spriteKey];

    // Brilho dourado ao redor do item
    ctx.save();
    const glowGrad = ctx.createRadialGradient(x, floatY - size / 2, size * 0.1, x, floatY - size / 2, size * 0.8);
    glowGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
    glowGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, floatY - size / 2, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, x - size / 2, floatY - size, size, size);
    } else {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x, floatY - size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderEnvironmentLayer(environment, progress, opacity, cameraBob, horizonY) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const zoom = 1 + progress * 0.18;
    const sideDrift = Math.sin(this.distance * 0.026) * w * 0.007;
    const forwardDrop = progress * h * 0.012;

    ctx.save();
    ctx.globalAlpha = opacity;
    // A escala é ancorada no ponto de fuga: calçadas, árvores e prédios
    // crescem para fora enquanto o horizonte permanece estável.
    ctx.translate(w / 2 + sideDrift, horizonY + cameraBob + forwardDrop);
    ctx.scale(zoom, zoom);
    ctx.drawImage(environment, -w / 2 - 4, -horizonY - 4, w + 8, h + 8);
    ctx.restore();
  }

  renderPassingScenery(sceneIndex, opacity, roadCenterX, horizonY, roadTopW, roadBottomW, isPortrait) {
    if (opacity <= 0.01) return;

    const ctx = this.ctx;
    const h = this.height;
    const roadHeight = h - horizonY;
    const roadWidthAt = (z) => roadTopW + (roadBottomW - roadTopW) * z;
    const routeSpan = 34;
    const spacing = 1.85;
    const travel = this.visualDistance * 0.105;
    const beachPattern = ['house', 'palm', 'kiosk', 'house', 'lamp', 'palm', 'planter', 'house'];
    const cityPattern = ['building', 'lamp', 'shop', 'building', 'planter', 'palm', 'shop', 'building'];
    const pattern = sceneIndex === 0 ? beachPattern : cityPattern;
    const spriteMap = {
      palm: this.sprites.scenery_palm,
      lamp: this.sprites.scenery_lamp,
      planter: this.sprites.scenery_planter,
      house: this.sprites.scenery_beach_house,
      kiosk: this.sprites.scenery_beach_kiosk,
      building: this.sprites.scenery_city_building,
      shop: this.sprites.scenery_city_shop
    };
    const heightMap = {
      palm: 760,
      lamp: 690,
      planter: 285,
      house: 440,
      kiosk: 350,
      building: 830,
      shop: 590
    };
    const props = [];

    for (let index = 0; index < 19; index++) {
      let z = (1.2 + index * spacing - travel) % routeSpan;
      if (z < 0) z += routeSpan;
      props.push({
        z,
        side: ((index * 5 + sceneIndex) % 4 < 2) ? -1 : 1,
        kind: pattern[index % pattern.length],
        index
      });
    }

    // Distantes primeiro; os elementos próximos passam por cima dos menores.
    props.sort((a, b) => b.z - a.z);

    props.forEach((prop) => {
      const sprite = spriteMap[prop.kind];
      if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

      const depth = 1 / (1 + prop.z * 0.42);
      const trackZ = Math.pow(depth, isPortrait ? 1.38 : 1.48);
      const baseY = horizonY + roadHeight * trackZ;
      const currentRoadW = roadWidthAt(trackZ);
      const mobileScale = isPortrait ? 0.88 : 1;
      const scaleVariation = 0.88 + ((prop.index * 17) % 5) * 0.055;
      const propH = heightMap[prop.kind] * depth * mobileScale * scaleVariation;
      const propW = propH * (sprite.naturalWidth / sprite.naturalHeight);
      const isStructure = ['house', 'kiosk', 'building', 'shop'].includes(prop.kind);
      const sidewalkOffset = isStructure
        ? propW * 0.32
        : (prop.kind === 'planter' ? propW * 0.2 : propW * 0.08);
      const sidewalkSpread = isPortrait ? 0.82 : 0.67;
      const baseX = roadCenterX + prop.side * (currentRoadW * sidewalkSpread + sidewalkOffset);
      const motionLean = isStructure
        ? 0
        : Math.sin((this.visualDistance + prop.index * 11) * 0.035) * 0.012 * depth;

      ctx.save();
      ctx.globalAlpha = opacity * Math.min(1, 0.25 + depth * 2.2);

      if (depth > 0.16) {
        ctx.fillStyle = `rgba(2, 24, 27, ${0.2 * depth})`;
        ctx.beginPath();
        ctx.ellipse(baseX, baseY + 2, propW * 0.3, Math.max(1.5, propH * 0.025), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.translate(baseX, baseY);
      ctx.rotate(motionLean * -prop.side);
      if (isStructure && prop.side < 0) ctx.scale(-1, 1);
      ctx.drawImage(sprite, -propW / 2, -propH, propW, propH);
      ctx.restore();
    });
  }

  renderRoadMotion(environment, roadCenterX, horizonY, roadTopW, roadBottomW, isPortrait) {
    const ctx = this.ctx;
    const h = this.height;
    const roadHeight = h - horizonY;
    const roadWidthAt = (z) => roadTopW + (roadBottomW - roadTopW) * z;
    const moving = this.state === 'RUNNING';
    const travel = moving ? this.distance : 0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(roadCenterX - roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadTopW / 2, horizonY);
    ctx.lineTo(roadCenterX + roadBottomW / 2, h);
    ctx.lineTo(roadCenterX - roadBottomW / 2, h);
    ctx.closePath();
    ctx.clip();

    // Reaproveita o próprio asfalto da arte como textura rolante. As faixas
    // próximas recebem trechos maiores, reforçando a aceleração em perspectiva.
    const sourceW = environment.naturalWidth * (isPortrait ? 0.12 : 0.09);
    const sourceX = (environment.naturalWidth - sourceW) / 2;
    const sourceTop = environment.naturalHeight * 0.71;
    const sourceHeight = environment.naturalHeight * 0.255;
    const bandCount = Math.max(46, Math.floor(roadHeight / 9));

    ctx.globalAlpha = moving ? 0.48 : 0.24;
    for (let band = 0; band < bandCount; band++) {
      const z1 = band / bandCount;
      const z2 = (band + 1) / bandCount;
      const y1 = horizonY + roadHeight * z1;
      const y2 = horizonY + roadHeight * z2;
      const midZ = (z1 + z2) / 2;
      const width = roadWidthAt(midZ);
      const sourceOffset = (travel * (5 + midZ * 15) + band * 5.7) % sourceHeight;
      const sourceY = Math.min(environment.naturalHeight - 3, sourceTop + sourceOffset);

      ctx.drawImage(
        environment,
        sourceX,
        sourceY,
        sourceW,
        2,
        roadCenterX - width / 2,
        y1,
        width,
        Math.max(2, y2 - y1 + 1)
      );
    }

    // Marcadores de faixa avançam do horizonte para o jogador em um loop sem
    // emendas. É esta passagem pelo quadro que comunica velocidade de imediato.
    const markerPhase = (travel * 0.018) % 1;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#fff8dc';

    [-1, 1].forEach((separator) => {
      for (let marker = 0; marker < 12; marker++) {
        const worldZ = (marker / 12 + markerPhase) % 1;
        const worldEnd = Math.min(1, worldZ + 0.036 + worldZ * 0.025);
        const z1 = Math.pow(worldZ, 1.55);
        const z2 = Math.pow(worldEnd, 1.55);
        const y1 = horizonY + roadHeight * z1;
        const y2 = horizonY + roadHeight * z2;
        const width1 = roadWidthAt(z1);
        const width2 = roadWidthAt(z2);
        const x1 = roadCenterX + separator * width1 / 6;
        const x2 = roadCenterX + separator * width2 / 6;
        const half1 = 0.7 + z1 * (isPortrait ? 2.5 : 3.5);
        const half2 = 0.9 + z2 * (isPortrait ? 4.2 : 5.2);

        ctx.beginPath();
        ctx.moveTo(x1 - half1, y1);
        ctx.lineTo(x1 + half1, y1);
        ctx.lineTo(x2 + half2, y2);
        ctx.lineTo(x2 - half2, y2);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Pequenos reflexos no chão passam mais depressa nas laterais e evitam a
    // sensação de painel imóvel entre uma faixa e outra.
    ctx.lineCap = 'round';
    for (let streak = 0; streak < 18; streak++) {
      const worldZ = (streak * 0.061 + markerPhase * 1.37) % 1;
      const z = Math.pow(worldZ, 1.45);
      const width = roadWidthAt(z);
      const side = streak % 2 === 0 ? -1 : 1;
      const jitter = ((streak * 37) % 17) / 17;
      const x = roadCenterX + side * width * (0.28 + jitter * 0.14);
      const y = horizonY + roadHeight * z;
      const length = 2 + z * z * 34;
      ctx.globalAlpha = 0.08 + z * 0.14;
      ctx.strokeStyle = streak % 3 === 0 ? '#ffd166' : '#d9f5f0';
      ctx.lineWidth = 0.8 + z * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y - length);
      ctx.lineTo(x + side * length * 0.12, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderPlayer(roadCenterX, h) {
    const ctx = this.ctx;
    const playerBaseY = h * 0.945;
    const px = roadCenterX + (this.playerX * this.laneWidth);
    const turboActive = this.activePowerups.turbo.active;
    const hasRunMotion = this.state === 'RUNNING'
      && !this.player.isJumping
      && !this.player.isSliding;
    const runPhase = this.player.runCycle * Math.PI * 2;
    const footStrike = hasRunMotion ? Math.abs(Math.sin(runPhase)) : 0;
    const motionBoost = turboActive ? 1.3 : 1;
    const runBob = footStrike * Math.max(5, Math.min(8, h * 0.009)) * motionBoost;
    const runSway = hasRunMotion ? Math.sin(runPhase) * Math.max(1.5, h * 0.0025) * motionBoost : 0;
    const runLean = hasRunMotion ? Math.sin(runPhase) * 0.022 * motionBoost : 0;
    const py = playerBaseY - this.player.y - runBob;

    // 1. Sombra Elíptica no Asfalto
    ctx.save();
    const shadowScale = Math.max(0.3, 1.0 - (this.player.y / 300));
    const standingHeight = Math.max(210, Math.min(300, h * 0.36));
    const shadowWidth = this.player.isSliding ? standingHeight * 0.38 : standingHeight * 0.27;
    ctx.fillStyle = 'rgba(3, 19, 23, 0.3)';
    ctx.beginPath();
    ctx.ellipse(px, playerBaseY + 5, shadowWidth * shadowScale, 13 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Aura do Ímã / Turbo
    if (turboActive || this.activePowerups.magnet.active) {
      ctx.save();
      const auraPulse = turboActive ? 1 + Math.sin(runPhase * 2) * 0.045 : 1;
      const auraColor = turboActive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(56, 189, 248, 0.4)';
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = turboActive ? 7 : 6;
      ctx.beginPath();
      ctx.ellipse(
        px,
        py - standingHeight / 2,
        standingHeight * 0.34 * auraPulse,
        standingHeight * 0.58 * auraPulse,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    // 3. Escolha do Sprite da Ação Atual
    let spriteKey = 'cajulim_run_a';
    if (this.state === 'GAMEOVER') {
      spriteKey = 'cajulim_crash';
    } else if (this.player.isJumping) {
      spriteKey = 'cajulim_jump';
    } else if (this.player.isSliding) {
      spriteKey = 'cajulim_slide';
    } else if (Math.abs(this.player.rollTilt) > 0.08) {
      spriteKey = 'cajulim_dodge';
    } else {
      spriteKey = this.player.stepFrame === 'a' ? 'cajulim_run_a' : 'cajulim_run_b';
    }

    const sprite = this.sprites[spriteKey] || this.sprites['cajulim_run_a'];
    let charH = this.player.isSliding ? Math.max(118, Math.min(165, h * 0.2)) : standingHeight;
    let charW = this.player.isSliding ? charH * 1.18 : charH * 0.58;

    if (sprite && sprite.naturalWidth > 0 && sprite.naturalHeight > 0) {
      charW = charH * (sprite.naturalWidth / sprite.naturalHeight) * 1.08;
    }

    ctx.save();
    ctx.translate(px + runSway, py);
    ctx.rotate(this.player.rollTilt + runLean);
    if (hasRunMotion) {
      const squashBoost = turboActive ? 1.35 : 1;
      ctx.scale(1 + footStrike * 0.012 * squashBoost, 1 - footStrike * 0.018 * squashBoost);
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // O Turbo intensifica a corrida, mas nunca substitui a animação de pernas e braços.
      if (turboActive && hasRunMotion) {
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.drawImage(sprite, -charW / 2, -charH - 14, charW, charH);
        ctx.restore();
      }
      ctx.drawImage(sprite, -charW / 2, -charH, charW, charH);
    } else {
      // Fallback nítido se imagem estiver carregando
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-35, -120, 70, 70); // Cabeça caju
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-40, -50, 80, 50); // Colete gari
    }
    ctx.restore();
  }

  renderEffects() {
    const ctx = this.ctx;

    // Partículas de Faísca
    this.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Linhas Cinéticas de Vento
    this.speedLines.forEach(sl => {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + sl.alpha + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sl.x, sl.y);
      ctx.lineTo(sl.x, sl.y + sl.len);
      ctx.stroke();
      ctx.restore();
    });
  }

  // --------------------------------------------------------------------------
  // ESTADOS DO JOGO
  // --------------------------------------------------------------------------
  startGame() {
    this.state = 'RUNNING';
    const startModal = document.getElementById('modalStart');
    if (startModal) startModal.classList.remove('active');
    if (window.runnerAudio) window.runnerAudio.startMusic();
  }

  togglePause() {
    if (this.state === 'RUNNING') {
      this.state = 'PAUSED';
      document.getElementById('modalPause').classList.add('active');
      if (window.runnerAudio) window.runnerAudio.stopMusic();
    } else if (this.state === 'PAUSED') {
      this.state = 'RUNNING';
      document.getElementById('modalPause').classList.remove('active');
      if (window.runnerAudio) window.runnerAudio.startMusic();
    }
  }

  gameOver(reason) {
    this.state = 'GAMEOVER';

    if (window.runnerAudio) {
      window.runnerAudio.playCrash();
      window.runnerAudio.stopMusic();
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('cajulim_runner_highscore', this.highScore.toString());
    }

    document.getElementById('goScore').textContent = this.score.toLocaleString('pt-BR');
    document.getElementById('goRecycled').textContent = this.recycledCount.toLocaleString('pt-BR');
    document.getElementById('goHighScore').textContent = this.highScore.toLocaleString('pt-BR');
    document.getElementById('goReason').textContent = reason;

    document.getElementById('modalGameOver').classList.add('active');
  }

  restartGame() {
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.speedLines = [];

    this.currentLane = 0;
    this.playerX = 0;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.isJumping = false;
    this.player.isSliding = false;
    this.player.rollTilt = 0;
    this.player.runCycle = 0;
    this.player.stepTimer = 0;
    this.player.stepFrame = 'a';

    this.score = 0;
    this.scoreFloat = 0;
    this.distance = 0;
    this.recycledCount = 0;
    this.multiplier = 1;
    this.comboStreak = 0;
    this.speed = this.baseSpeed;
    this.currentSceneIndex = 0;
    this.spawnTimer = -0.8;
    this.activePowerups.magnet.active = false;
    this.activePowerups.turbo.active = false;

    document.getElementById('modalGameOver').classList.remove('active');
    document.getElementById('modalPause').classList.remove('active');

    this.state = 'RUNNING';
    if (window.runnerAudio) window.runnerAudio.startMusic();
  }

  updateHUD() {
    const elScore = document.getElementById('hudScore');
    const elRecycled = document.getElementById('hudRecycled');
    const elMultiplier = document.getElementById('hudMultiplier');
    const elDistance = document.getElementById('hudDistance');
    const elRouteName = document.getElementById('hudRouteName');

    if (elScore) elScore.textContent = this.score.toLocaleString('pt-BR');
    if (elRecycled) elRecycled.textContent = this.recycledCount.toLocaleString('pt-BR');
    if (elMultiplier) elMultiplier.textContent = `x${this.multiplier}`;
    if (elDistance) elDistance.textContent = `${Math.floor(this.distance)} m`;
    if (elRouteName) {
      const sceneIndex = Math.floor(this.distance / this.sceneLength) % 2;
      const sceneProgress = (this.distance % this.sceneLength) / this.sceneLength;
      if (sceneProgress > 0.72) {
        elRouteName.textContent = sceneIndex === 0 ? 'RUMO AO CENTRO' : 'RUMO À ORLA';
      } else {
        elRouteName.textContent = sceneIndex === 0 ? 'ROTA ORLA LIMPA' : 'CENTRO DE PARNAMIRIM';
      }
    }

    const magnetBar = document.getElementById('magnetBarWrapper');
    const turboBar = document.getElementById('turboBarWrapper');

    if (magnetBar) {
      if (this.activePowerups.magnet.active) {
        magnetBar.style.display = 'flex';
        const pct = (this.activePowerups.magnet.timeLeft / this.activePowerups.magnet.maxTime) * 100;
        document.getElementById('magnetProgress').style.width = `${pct}%`;
      } else {
        magnetBar.style.display = 'none';
      }
    }

    if (turboBar) {
      if (this.activePowerups.turbo.active) {
        turboBar.style.display = 'flex';
        const pct = (this.activePowerups.turbo.timeLeft / this.activePowerups.turbo.maxTime) * 100;
        document.getElementById('turboProgress').style.width = `${pct}%`;
      } else {
        turboBar.style.display = 'none';
      }
    }
  }
}

// Iniciar quando a página carregar
window.addEventListener('DOMContentLoaded', () => {
  window.runnerGame = new CajulimRunnerGame();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autostart') === '1') {
    setTimeout(() => window.runnerGame.startGame(), 250);
  }
});
