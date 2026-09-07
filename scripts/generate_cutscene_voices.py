import os
import asyncio
import edge_tts

VOICE_ANTONIO = "pt-BR-AntonioNeural"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIRS = [
    os.path.join(BASE_DIR, "assets", "audio"),
    os.path.join(BASE_DIR, "PC", "assets", "audio"),
    os.path.join(BASE_DIR, "celular", "assets", "audio")
]

NARRATIONS = [
    {
        "filename": "cutscene_phase5_step0.mp3",
        "voice": VOICE_ANTONIO,
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
        "voice": VOICE_ANTONIO,
        "rate": "+2%",
        "text": "A Redenção do Barão: Derrotado pelo trabalho em equipe, o Barão cumpre trezentas horas de serviço comunitário na praça! Com a vassoura na mão e o colete de gari, ele aprendeu o valor de cada trabalhador da limpeza pública: Cuidar da cidade é dever de todos!"
    },
    {
        "filename": "cutscene_ending_step1.mp3",
        "voice": VOICE_ANTONIO,
        "rate": "+2%",
        "text": "Celebração da Turma do Cajulim: A cidade está totalmente sustentável! Das residências ao caminhão, do transbordo à carreta de trinta toneladas, do aterro ao combate final... Você dominou todas as etapas e protegeu o futuro do planeta!"
    },
    {
        "filename": "cutscene_ending_step2.mp3",
        "voice": VOICE_ANTONIO,
        "rate": "+2%",
        "text": "Certificado de Mestre da Sustentabilidade: Parabéns por zerar o jogo! Cem por cento de consciência ecológica, dez megawatts de biogás e água cristalina devolvida à natureza. O meio ambiente agradece!"
    }
]

async def generate_all():
    import shutil
    for d in OUTPUT_DIRS:
        os.makedirs(d, exist_ok=True)
    
    primary_dir = OUTPUT_DIRS[0]
    for item in NARRATIONS:
        out_path = os.path.join(primary_dir, item["filename"])
        voice = item.get("voice", VOICE_ANTONIO)
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
