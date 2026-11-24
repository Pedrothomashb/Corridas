# Changelog

Cada versão é uma tag do git (`git checkout v3`, por exemplo). Até a v6 elas eram entregues em pastas separadas (`v1`, `v2`, …).

## v6 — 31/10/2026
- Campo "Equipe" removido; piloto agora tem **Categoria** (criar/renomear/excluir na aba Pilotos › Categorias, ou direto no cadastro do piloto)
- Mesmo número pode repetir em categorias diferentes (bloqueia só dentro da mesma categoria)
- **Pelotões**: antes de iniciar, monta quais categorias largam em cada pelotão (ex.: P1 = 450 + XC 35+, P2 = Nacional) e tira pilotos que não vão correr
- Iniciar larga o Pelotão 1; os outros têm botão **LARGAR** próprio. Números divididos por pelotão, cada um com seu cronômetro
- Tempo de prova de cada piloto conta a partir da largada do pelotão dele
- Classificação por categoria (na corrida, no histórico e no Excel); volta mais rápida/lenta destacada por categoria
- Excel: colunas Categoria e Pelotão, resumo dos pelotões e vencedor de cada categoria
- Montagem dos pelotões fica salva para a próxima bateria
- Dados da v5 são mantidos ao instalar por cima (pilotos ficam "Sem categoria")

## v5 — 23/10/2026
- `GERAR-APK.bat`: compila o APK no próprio PC (JDK 17 + Android SDK + Gradle), sem Expo Go, sem conta Expo e sem EAS
- APK final: `v5\Corridas-v5.apk` (arm64-v8a + armeabi-v7a)
- Removidas dependências nativas não usadas (build mais rápido e menor)
- Mesmas funções da v4 · versão 5.0.0 (versionCode 5)

## v4 — 23/10/2026
- APK Android instalável (funciona sem Expo Go e sem o PC): `gerar-apk.ps1` gera no EAS Build
- Exportar Excel no Android: "Salvar no celular" (escolhe a pasta, ex.: Download) ou "Compartilhar"
- Dados continuam salvos localmente no celular
- Base: v3 (Expo SDK 57) · versão 4.0.0 (versionCode 4)

## v3 — 19/10/2026
- Projeto no Expo SDK 57, mesma versão do Expo Go instalado no iPhone
- Volta a usar a barra de abas nativa do iOS (como na v1)
- Mesmas funcionalidades da v1/v2

## v2 — 19/10/2026
- Projeto refeito sobre o Expo SDK 54 (não compatível com o Expo Go instalado, que é SDK 57 — use a v3)
- Barra de abas com ícones SF Symbols (iOS) / Material (Android)
- Mesmas funcionalidades da v1

## v1 — 19/10/2026
- Cadastro de pilotos (número, nome, equipe), com bloqueio de número repetido
- Tela de corrida no estilo do cronômetro do iPhone: Iniciar / Parar / Retomar / Finalizar
- Todos os pilotos largam juntos; escolha de participantes antes da largada
- Teclado de pilotos: toque no número = volta registrada (vibração); Desfazer; segurar uma volta para excluir
- Lista de voltas (mais rápida em verde, mais lenta em vermelho) e Classificação ao vivo
- Dados salvos no aparelho; corrida em andamento sobrevive ao fechar o app; tela não apaga durante a corrida
- Histórico de corridas com detalhe por piloto
- Exportação Excel (.xlsx): Resumo, Classificação, Voltas, Por piloto
