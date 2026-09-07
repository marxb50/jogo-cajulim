import os

with open('game.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add levelClearTimer and gameOverTimer to Game constructor if not present
if 'this.levelClearTimer = 0;' not in code:
    code = code.replace(
        "this.cutscene = {",
        "this.levelClearTimer = 0;\n        this.gameOverTimer = 0;\n        this.cutscene = {"
    )

# 2. Update update(dt) to increment timers and auto-advance
old_lc_block = '''        } else if (this.state === 'LEVEL_CLEAR') {
            this.updateParticles(dt);
            this.updateFloatingTexts(dt);
            if (this.currentPhase === 1) {
                this.player.animState = 'win';
                this.player.animFrame = 0;
            }
        }'''

new_lc_block = '''        } else if (this.state === 'LEVEL_CLEAR') {
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
        }'''

if old_lc_block in code:
    code = code.replace(old_lc_block, new_lc_block)
    print('[OK] Replaced LEVEL_CLEAR update block')
else:
    print('[WARN] old_lc_block not found')

# 3. Update levelClear() to reset levelClearTimer
old_lc_fn = '''    levelClear() {
        this.state = 'LEVEL_CLEAR';'''

new_lc_fn = '''    levelClear() {
        this.state = 'LEVEL_CLEAR';
        this.levelClearTimer = 0;'''

if old_lc_fn in code:
    code = code.replace(old_lc_fn, new_lc_fn)
    print('[OK] Updated levelClear() reset timer')

# 4. Update gameOver() to reset gameOverTimer
old_go_fn = '''    gameOver() {
        this.state = 'GAME_OVER';'''

new_go_fn = '''    gameOver() {
        this.state = 'GAME_OVER';
        this.gameOverTimer = 0;'''

if old_go_fn in code:
    code = code.replace(old_go_fn, new_go_fn)
    print('[OK] Updated gameOver() reset timer')

# 5. Update keydown Enter and Space in initControls
old_enter_block = '''                case 'Enter':
                    if (this.state === 'TITLE') {
                        this.toggleFullscreen();
                        this.startGame();
                    } else if (this.state === 'LEVEL_CLEAR' || this.state === 'GAME_OVER') {
                        this.restartLevel();
                    }
                    break;'''

new_enter_block = '''                case 'Enter':
                    if (this.state === 'TITLE') {
                        this.toggleFullscreen();
                        this.startGame();
                    } else if (this.state === 'LEVEL_CLEAR') {
                        this.nextPhase();
                    } else if (this.state === 'GAME_OVER') {
                        this.restartLevel();
                    }
                    break;'''

if old_enter_block in code:
    code = code.replace(old_enter_block, new_enter_block)
    print('[OK] Updated Enter key handler')

old_space_check = '''            if (this.state === 'CUTSCENE') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.advanceCutscene();
                    return;
                }
                if (e.code === 'Escape' || e.code === 'KeyS') {
                    this.skipCutscene();
                    return;
                }
            }'''

new_space_check = '''            if (this.state === 'CUTSCENE') {
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
            }'''

if old_space_check in code:
    code = code.replace(old_space_check, new_space_check)
    print('[OK] Updated Space / Enter state checks')

# 6. Update canvas click
old_click = '''            if (this.state === 'TITLE') {
                this.toggleFullscreen();
                this.startGame();
                return;
            }'''

new_click = '''            if (this.state === 'TITLE') {
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
            }'''

if old_click in code:
    code = code.replace(old_click, new_click)
    print('[OK] Updated canvas click handler')

# 7. Update render() to call renderLevelClearBanner and renderGameOverBanner
old_render_tail = '''        if (this.state === 'TITLE') this.renderTitleScreen(ctx);
        if (this.state === 'CUTSCENE') this.renderCutscene(ctx);
    }'''

new_render_tail = '''        if (this.state === 'TITLE') this.renderTitleScreen(ctx);
        if (this.state === 'CUTSCENE') this.renderCutscene(ctx);
        if (this.state === 'LEVEL_CLEAR') this.renderLevelClearBanner(ctx);
        if (this.state === 'GAME_OVER') this.renderGameOverBanner(ctx);
    }'''

if old_render_tail in code:
    code = code.replace(old_render_tail, new_render_tail)
    print('[OK] Updated render() state handlers')

banner_methods = '''
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
        ctx.fillText(`🌟 FASE ${this.currentPhase} CONCLUÍDA! 🌟`, VIRTUAL_WIDTH / 2, by + 48);

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
            phaseTitle = 'ATERRO SANITÁRIO & USINA VERDE';
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
        ctx.fillText(`PONTUAÇÃO: ${this.score}`, VIRTUAL_WIDTH / 2, by + 152);

        const remaining = Math.max(0, 3.2 - (this.levelClearTimer || 0)).toFixed(1);
        const blink = Math.floor(performance.now() / 350) % 2 === 0;
        ctx.font = '10px "Press Start 2P", monospace, sans-serif';
        ctx.fillStyle = blink ? '#ffffff' : '#fde047';
        ctx.fillText(`AVANÇANDO EM ${remaining}s... [ESPAÇO / A PARA AVANÇAR] ▶`, VIRTUAL_WIDTH / 2, by + 205);
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
        ctx.fillText(`TENTAR DE NOVO EM ${remaining}s... [ESPAÇO / A]`, VIRTUAL_WIDTH / 2, by + 155);
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
'''

if 'renderLevelClearBanner(ctx)' not in code:
    last_brace_idx = code.rfind('}')
    code = code[:last_brace_idx] + banner_methods + '\n}\n'
    print('[OK] Injected banner and touch methods')

if 'this.initMobileTouchControls();' not in code:
    code = code.replace(
        "this.canvas.addEventListener('click'",
        "this.initMobileTouchControls();\n        this.canvas.addEventListener('click'"
    )
    print('[OK] Added initMobileTouchControls() call')

# Save updated root game.js
with open('game.js', 'w', encoding='utf-8') as f:
    f.write(code)
print('[OK] Saved root game.js')

# PC game.js
with open('PC/game.js', 'w', encoding='utf-8') as f:
    f.write(code)
print('[OK] Saved PC/game.js')

# celular game.js: customized title prompt
mobile_code = code.replace(
    "ctx.fillText('PRESSIONE ENTER OU CLIQUE PARA JOGAR', VIRTUAL_WIDTH / 2, 480);",
    "ctx.fillText('TOQUE NA TELA OU NO BOTAO A PARA JOGAR', VIRTUAL_WIDTH / 2, 480);"
)
with open('celular/game.js', 'w', encoding='utf-8') as f:
    f.write(mobile_code)
print('[OK] Saved celular/game.js')
