# 1. Update audio.js
with open('audio.js', 'r', encoding='utf-8') as f:
    audio_code = f.read()

old_fallback = '''    playSpeechFallback(text) {
        if (this.muted || typeof window === 'undefined' || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            const isBarao = /bar[ãa]o\s+do\s+entulho|oulal[áa]|oui,\s*oui/i.test(text);
            const voices = window.speechSynthesis.getVoices();

            if (isBarao) {
                utter.lang = 'fr-FR';
                const frenchVoice = voices.find(v => 
                    v.lang === 'fr-FR' || 
                    v.lang.startsWith('fr') || 
                    v.name.includes('French') || 
                    v.name.includes('Français') ||
                    v.name.includes('Remy') ||
                    v.name.includes('Henri')
                );
                if (frenchVoice) utter.voice = frenchVoice;
                utter.rate = 1.0;
                utter.pitch = 0.9;
            } else {
                utter.lang = 'pt-BR';
                const thalitaVoice = voices.find(v => 
                    v.name.includes('Thalita') || 
                    v.name.includes('Francisca') || 
                    (v.lang === 'pt-BR' && v.name.includes('Natural')) ||
                    v.lang === 'pt-BR' ||
                    v.lang.startsWith('pt')
                );
                if (thalitaVoice) utter.voice = thalitaVoice;
                utter.rate = 1.05;
            }
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('SpeechSynthesis error', e);
        }
    }'''

new_fallback = '''    playSpeechFallback(text) {
        if (this.muted || typeof window === 'undefined' || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'pt-BR';
            const voices = window.speechSynthesis.getVoices();
            const antonioVoice = voices.find(v => 
                v.name.includes('Antonio') || 
                v.name.includes('Antônio') || 
                (v.lang === 'pt-BR' && (v.name.includes('Male') || v.name.includes('Natural'))) ||
                v.lang === 'pt-BR' ||
                v.lang.startsWith('pt')
            );
            if (antonioVoice) utter.voice = antonioVoice;
            utter.rate = 1.0;
            utter.pitch = 0.95;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('SpeechSynthesis error', e);
        }
    }'''

if old_fallback in audio_code:
    audio_code = audio_code.replace(old_fallback, new_fallback)
    print('[OK] Updated playSpeechFallback in audio.js')
else:
    print('[WARN] old_fallback not found in audio.js')

with open('audio.js', 'w', encoding='utf-8') as f:
    f.write(audio_code)
with open('PC/audio.js', 'w', encoding='utf-8') as f:
    f.write(audio_code)
with open('celular/audio.js', 'w', encoding='utf-8') as f:
    f.write(audio_code)
print('[OK] Saved audio.js across root, PC, and celular')

# 2. Update game.js
with open('game.js', 'r', encoding='utf-8') as f:
    game_code = f.read()

# Update spokenText in triggerCutsceneNarration
old_spoken = "spokenText = 'Barão do Entulho: Muahahaha! Oulalá! Achavam que la faxina tinha terminado?! Enquanto houver entulho para lucrar, moi, le Barão, serei o dono desta cidade! Meu Mecha-Trator Poluidor 9000 vai soterrar a Praça Central! Tente me impedir, Cajulim! Oui, oui!';"
new_spoken = "spokenText = 'Barão do Entulho: Mwahahaha! Achavam que a faxina tinha terminado?! Enquanto houver entulho para lucrar, eu, o Barão do Entulho, serei o dono desta cidade! O meu Mecha-Trator Poluidor nove mil vai soterrar a Praça Central! Tente me impedir, Cajulim!';"

if old_spoken in game_code:
    game_code = game_code.replace(old_spoken, new_spoken)
    print('[OK] Replaced spokenText in game.js')
else:
    print('[WARN] old_spoken not found in game.js')

# Update getCutsceneFullText
old_text = "return 'BARAO DO ENTULHO: \"MWAHAHA! OULALA! ACHAVAM QUE LA FAXINA TINHA TERMINADO?! ENQUANTO HOUVER ENTULHO PARA LUCRAR, MOI, LE BARAO, SEREI O DONO DESTA CIDADE! MEU MECHA-TRATOR POLUIDOR 9000 VAI SOTERRAR A PRACA CENTRAL! TENTE ME IMPEDIR, CAJULIM! OUI, OUI!\"';"
new_text = "return 'BARAO DO ENTULHO: \"MWAHAHAHA! ACHAVAM QUE A FAXINA TINHA TERMINADO?! ENQUANTO HOUVER ENTULHO PARA LUCRAR, EU, O BARAO DO ENTULHO, SEREI O DONO DESTA CIDADE! O MEU MECHA-TRATOR POLUIDOR 9000 VAI SOTERRAR A PRACA CENTRAL! TENTE ME IMPEDIR, CAJULIM!\"';"

if old_text in game_code:
    game_code = game_code.replace(old_text, new_text)
    print('[OK] Replaced getCutsceneFullText in game.js')
else:
    print('[WARN] old_text not found in game.js')

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(game_code)
with open('PC/game.js', 'w', encoding='utf-8') as f:
    f.write(game_code)

mobile_code = game_code.replace(
    "ctx.fillText('PRESSIONE ENTER OU CLIQUE PARA JOGAR', VIRTUAL_WIDTH / 2, 480);",
    "ctx.fillText('TOQUE NA TELA OU NO BOTAO A PARA JOGAR', VIRTUAL_WIDTH / 2, 480);"
)
with open('celular/game.js', 'w', encoding='utf-8') as f:
    f.write(mobile_code)
print('[OK] Saved game.js across root, PC, and celular')
