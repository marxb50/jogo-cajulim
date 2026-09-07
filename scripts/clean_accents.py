for path in ['game.js', 'PC/game.js', 'celular/game.js']:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('CONCLUÍDA', 'CONCLUIDA')
    c = c.replace('PONTUAÇÃO', 'PONTUACAO')
    c = c.replace('AVANÇANDO', 'AVANCANDO')
    c = c.replace('ESPAÇO', 'ESPACO')
    c = c.replace('AVANÇAR', 'AVANCAR')
    c = c.replace('REINICIANDO', 'REINICIANDO')
    c = c.replace('REINICIAR', 'REINICIAR')
    c = c.replace('SANITÁRIO', 'SANITARIO')
    c = c.replace('ESTÁVEL', 'ESTAVEL')
    c = c.replace('RODOVIÁRIA', 'RODOVIARIA')
    c = c.replace('ÁGUA', 'AGUA')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"[OK] Cleaned accents in {path}")
