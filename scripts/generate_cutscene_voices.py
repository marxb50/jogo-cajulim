import os
import asyncio
import edge_tts
import shutil

VOICE_THALITA = "pt-BR-ThalitaNeural"
VOICE_ANTONIO = "pt-BR-AntonioNeural"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIRS = [
    os.path.join(BASE_DIR, "assets", "audio"),
    os.path.join(BASE_DIR, "PC", "assets", "audio"),
    os.path.join(BASE_DIR, "celular", "assets", "audio")
]

NARRATIONS = [
    {
        "filename": "cutscene_intro_step0.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "A Prefeitura de Parnamirim apresenta: A Turma do Cajulim na Grande Missão da Coleta Seletiva! Ao lado do seu pai no caminhão da coleta municipal, nosso herói Cajulim se prepara para uma grande jornada para manter a nossa cidade sempre limpa, bonita e sustentável!"
    },
    {
        "filename": "cutscene_phase1_clear.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Parabéns! Você completou a coleta residencial em Parnamirim! Todos os sacos de lixo e materiais recicláveis foram recolhidos das ruas com sucesso. A cidade está limpa e o caminhão municipal está pronto para a próxima etapa!"
    },
    {
        "filename": "cutscene_phase2_bairros.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Coleta nos bairros concluída com sucesso! Todos os dez sacos de lixo foram recolhidos pela equipe do Cajulim. Agora o caminhão coletor entra na rodovia a caminho da Estação de Transbordo!"
    },
    {
        "filename": "cutscene_phase2_clear.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Excelente viagem! O caminhão da coleta chegou em segurança à Estação de Transbordo de Parnamirim! Toda a carga de resíduos da cidade foi transportada sem deixar nada pelo caminho. Agora é hora de preparar a grande carreta!"
    },
    {
        "filename": "cutscene_phase3_clear.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Manobra perfeita! A carreta foi totalmente carregada com trinta toneladas de resíduos e coberta com a lona protetora na doca do transbordo! O processo de transferência foi um sucesso total e o transporte rodoviário vai começar!"
    },
    {
        "filename": "cutscene_phase4_clear.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Pesagem concluída com sucesso! A carreta de trinta mil quilos passou pela balança rodoviária oficial e entrou no moderno aterro sanitário de Parnamirim! Carga conferida e aprovada para o tratamento e reciclagem energética!"
    },
    {
        "filename": "cutscene_phase5_step0.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Cidade limpa, serviço cumprido! O aterro sanitário e a usina verde funcionam com perfeição. O chorume está cem por cento purificado e a energia limpa ilumina milhares de lares... Tudo parecia em perfeita harmonia, mas..."
    },
    {
        "filename": "cutscene_phase5_step1.mp3",
        "voice": VOICE_ANTONIO,
        "rate": "+4%",
        "text": "Barão do Entulho: Mwahahaha! Achavam que a faxina tinha terminado?! Enquanto houver entulho para lucrar, eu, o Barão do Entulho, serei o dono desta cidade! O meu Mecha-Trator Poluidor nove mil vai soterrar a Praça Central! Tente me impedir, Cajulim!"
    },
    {
        "filename": "cutscene_ending_step0.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "A Redenção do Barão: Derrotado pelo trabalho em equipe, o Barão cumpre trezentas horas de serviço comunitário na praça! Com a vassoura na mão e o colete de gari, ele aprendeu o valor de cada trabalhador da limpeza pública: Cuidar da cidade é dever de todos!"
    },
    {
        "filename": "cutscene_ending_step1.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Celebração da Turma do Cajulim: A cidade está totalmente sustentável! Das residências ao caminhão, do transbordo à carreta de trinta toneladas, do aterro ao combate final... Você dominou todas as etapas e protegeu o futuro do planeta!"
    },
    {
        "filename": "cutscene_ending_step2.mp3",
        "voice": VOICE_THALITA,
        "rate": "+2%",
        "text": "Certificado de Mestre da Sustentabilidade: Parabéns por zerar o jogo! Cem por cento de consciência ecológica, dez megawatts de biogás e água cristalina devolvida à natureza. O meio ambiente agradece!"
    }
]

async def generate_all():
    for d in OUTPUT_DIRS:
        os.makedirs(d, exist_ok=True)
    
    primary_dir = OUTPUT_DIRS[0]
    for item in NARRATIONS:
        out_path = os.path.join(primary_dir, item["filename"])
        voice = item.get("voice", VOICE_THALITA)
        rate = item.get("rate", "+2%")
        print(f"Gerando {item['filename']} com a voz {voice}...")
        communicate = edge_tts.Communicate(item["text"], voice, rate=rate)
        await communicate.save(out_path)
        size = os.path.getsize(out_path)
        print(f"[OK] Salvo: {item['filename']} ({size} bytes)")
        
        # Copy to PC and celular audio directories
        for other_dir in OUTPUT_DIRS[1:]:
            dest_path = os.path.join(other_dir, item["filename"])
            shutil.copy2(out_path, dest_path)
            print(f"  -> Copiado para {dest_path}")

if __name__ == "__main__":
    asyncio.run(generate_all())
