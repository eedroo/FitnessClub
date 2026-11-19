# FitnessClub — Plano das próximas fases

Pedidos da dona do projecto (19/11/2026) ainda por fazer, pela ordem decidida: **A → B → D → C**. Cada fase fecha com um commit, testes e build a passar.
As decisões em aberto estão no fim de cada fase; nada aqui é definitivo até serem respondidas.

## Já feito (19/11)
- Progressão dupla com sugestão de reps e carga na sessão; comparação com a anterior no resumo da sessão e no Dia.
- Notas pessoais de programa, treino e exercício (prontas para a IA as preencher: `notesByAi`/`byAi`).
- Vidro líquido e cor de destaque à escolha.

## Fase A — Perfil de treino e onboarding novo (sem IA) — feita (19/11)
Recolher o que a IA vai precisar, já útil sem ela.
- Modelo `TrainingProfile` (1 por pessoa): objectivos (força, hipertrofia, perder gordura, saúde, desporto…), nível (iniciante / intermédio / avançado), peso (vai para o peso diário, com consentimento), equipamento (academia completa, pesos livres, só peso do corpo, academia ao ar livre, casa com halteres…), grupos musculares em foco (escolhidos no mapa muscular, que já existe), frequência e dias da semana, duração por treino, comentários/pedidos, exercícios a evitar (da biblioteca).
- Onboarding em passos (o `BodyWelcome` cresce) e uma página "O meu perfil de treino" nas definições para mudar depois.
- **Sem IA:** a escolha de modelo de programa passa a filtrar pelo equipamento e frequência.

## Fase B — IA — feita (19/11)
- **Gerar programa:** a partir do perfil, a IA propõe um programa com treinos, exercícios **só da biblioteca** (ids validados), alvos (séries × reps, descanso) e notas no programa, em cada treino e em cada exercício. A pessoa revê antes de guardar.
- **Insights semanais:** no domingo, uma retrospectiva da semana (frequência, volume e carga contra a semana anterior, recordes, exercícios parados) com o que correu bem e o que melhorar, à luz do objectivo. A app calcula os números; a IA só interpreta (validação com Zod contra os factos, como no Guia do MYGLOW).
- Jobs no Inngest (nunca num pedido de página), limite por pessoa, custo no admin.
- **Privacidade:** a Política e os Termos dizem hoje "sem IA"; é preciso actualizá-los (nova versão = re-aceitação) e pedir consentimento próprio para enviar dados de treino à IA. Nunca nome, email nem fotos.
- **Decidido (19/11):** Gemini 2.5 Flash (Google AI Studio; a chave só na Vercel), só para premium; a Política de Privacidade e os Termos são actualizados (re-aceitação) antes de ligar.

## Fase C — Rede social — feita (19/11: C1 perfis, amigos, feed; C2 fotos; C3 grupos; C4 treinos marcados com mapa)
- Perfil público com @, foto/avatar, nível, emblemas; amigos mútuos (pedido/aceitar), bloquear e denunciar.
- Feed (novo separador na tab bar): posts de texto e fotos; um treino terminado pode virar post (resumo + fotos); gosto e comentários; visibilidade pública, só amigos ou privado.
- Grupos com metas (frequência, Glow/XP) e competições internas com ranking.
- Convites de treino: post "sábado de manhã" público, para amigos ou directo a pessoas; pedidos para juntar-se; lista e mapa de treinos próximos nos próximos dias.
- Precisa de: armazenamento de fotos (Vercel Blob), moderação (denúncias + admin), notificações (pedidos, gostos, comentários, convites), localização **aproximada** (bairro/ginásio escolhido, nunca a posição exacta), idade mínima e regras da comunidade nos Termos.
- **Decidido (19/11):** cada post escolhe público ou só amigos; os convites de treino mostram um pino no mapa sobre a academia ou a região escolhida (nunca a posição exacta).
- Tab bar sugerida: Treinos · Feed · Sessão/Dia · Comunidade (grupos e convites) · Perfil.

## Fase D — Gamificação — feita (19/11)
- **Externo (todos vêem):** nível por XP ganho com consistência e esforço — treinos feitos, séries, semanas seguidas, metas de grupo, recordes pessoais — nunca com a carga absoluta (justo para qualquer corpo). Emblemas por feitos (1.º treino, 10/50/100 treinos, 4 semanas seguidas, 1.º recorde, meta de grupo…).
- **Interno (só a pessoa vê):** níveis por exercício (Bronze → Prata → Ouro → Platina → Diamante) pela força **relativa**: 1RM estimado ÷ peso do corpo, com limiares por exercício (e opcionalmente por sexo e idade, se a pessoa os indicar). Assim o "Ouro no supino" de uma pessoa de 55 kg e de uma de 95 kg são comparáveis.
- Pode ser mostrado no perfil se a pessoa quiser ("partilhar os meus níveis de força"), desligado por defeito.

## Outros pendentes
- Traduções dos exercícios (pt-PT, pt-BR): os ficheiros vieram vazios do MYGLOW; os nomes estão em inglês. Ficam para depois (pela IA, na Fase B, e revistas).
- Imagens dos exercícios: apontam para o Blob do MYGLOW; correr `import-images.ts --reupload` antes de o apagar.
- VAPID (gerar em `/admin/push`) e Inngest (aviso de descanso) agora; Resend (emails de confirmação e recuperação), Upstash e Sentry mais tarde.
