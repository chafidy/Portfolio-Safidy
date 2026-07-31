/**
 * FICHIER : chatbot.js
 * RÔLE    : Gère la logique de l'assistant virtuel local (sans API externe)
 *           + Easter Egg : Jeu "Color Match" pour graphistes (tape /play ou color)
 */

/* ══════════════════════════════════════════════════════════════════
   RÉPONSES DU BOT
══════════════════════════════════════════════════════════════════ */
const RESPONSES = [
  {
    keywords: ["bonjour", "salut", "coucou", "hello"],
    answer: "Bonjour ! Je suis l'assistant de Safidy. Comment puis-je vous aider ?",
    options: ["Quels sont vos services ?", "Faire un devis", "Contact"]
  },
  {
    keywords: ["devis", "prix", "tarif", "combien"],
    answer: "Chaque projet est unique ! Safidy propose des devis sur-mesure. Vous pouvez lui envoyer un email détaillé via le formulaire de contact ou directement par WhatsApp.",
    options: ["Aller au formulaire", "WhatsApp"]
  },
  {
    keywords: ["service", "services", "compétence", "competence", "savoir faire"],
    answer: "Safidy est expert en UI/UX Design, Développement Frontend, et Design Graphique. Il maîtrise Figma, React, et la suite Adobe. Que recherchez-vous ?",
    options: ["UI/UX Design", "Développement Web", "Design Graphique"]
  },
  {
    keywords: ["projet", "projets", "portfolio", "realisation", "réalisations"],
    answer: "Vous pouvez retrouver ses dernières réalisations dans la section Projets. Il a travaillé sur des applications web, mobiles et des identités visuelles.",
    options: ["Voir les projets"]
  },
  {
    keywords: ["contact", "contacter", "email", "mail", "téléphone", "numero", "whatsapp"],
    answer: "Vous pouvez le contacter à jraharijesy@gmail.com ou au +261 32 13 916 29. Il est également joignable sur WhatsApp !",
    options: ["Envoyer un email", "WhatsApp"]
  },
  {
    keywords: ["ui/ux design", "ui/ux"],
    answer: "Pour l'UI/UX Design, Safidy conçoit des interfaces intuitives et modernes en utilisant Figma, en appliquant des principes centrés utilisateur et les dernières tendances (comme le Claymorphism ou le Glassmorphism).",
    options: ["Faire un devis"]
  },
  {
    keywords: ["développement web", "frontend"],
    answer: "En tant que Software Engineer, Safidy développe des applications web performantes avec des technologies modernes comme HTML, CSS, JavaScript, React ou Node.js.",
    options: ["Voir les projets"]
  },
  {
    keywords: ["design graphique", "logo", "branding"],
    answer: "Safidy réalise des identités visuelles complètes, des logos et divers supports de communication avec Adobe Illustrator et Photoshop.",
    options: ["Faire un devis"]
  }
];

const DEFAULT_ANSWER = {
  answer: "Je ne suis qu'un assistant programmé et je n'ai pas très bien compris votre demande 😅. N'hésitez pas à contacter Safidy directement pour plus de détails !",
  options: ["Contact"]
};

// Actions spécifiques aux boutons
const ACTIONS = {
  "Aller au formulaire": () => { window.location.hash = "#contact"; document.getElementById('contact-name')?.focus(); },
  "WhatsApp": () => { window.open("https://wa.me/261321391629", "_blank"); },
  "Envoyer un email": () => { window.location.href = "mailto:jraharijesy@gmail.com"; },
  "Voir les projets": () => { window.location.hash = "#projects"; },
  "Contact": () => { window.location.hash = "#contact"; }
};

/* ══════════════════════════════════════════════════════════════════
   EASTER EGG — COLOR MATCH GAME (POUR GRAPHISTES)
══════════════════════════════════════════════════════════════════ */
/**
 * Lance le jeu Color Match dans la fenêtre de chat.
 * Retourne une fonction cleanup() pour détruire le jeu.
 */
function launchColorMatch(messagesContainer) {
  messagesContainer.style.display = 'none';

  const gameWrapper = document.createElement('div');
  gameWrapper.id = 'colormatch-wrapper';
  gameWrapper.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    background: #1a1a2e;
    padding: 16px;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
    color: #fff;
    overflow-y: auto;
  `;

  // Header / Score
  const headerEl = document.createElement('div');
  headerEl.style.cssText = 'width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;';
  headerEl.innerHTML = `
    <div>
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a78bfa; font-weight: 700;">🎨 COLOR MATCH</div>
      <div id="cm-score" style="font-size: 15px; font-weight: 800; margin-top: 2px;">Score : 0 | Niveau : 1</div>
    </div>
    <button id="cm-exit-btn" type="button" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer;">Quitter ✕</button>
  `;

  // Zone cible
  const targetBox = document.createElement('div');
  targetBox.style.cssText = 'width: 100%; text-align: center; margin-bottom: 12px;';
  
  const targetLabel = document.createElement('div');
  targetLabel.style.cssText = 'font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 6px;';
  targetLabel.textContent = 'Trouvez cette couleur exacte :';

  const targetColorCard = document.createElement('div');
  targetColorCard.style.cssText = `
    width: 90px;
    height: 90px;
    margin: 0 auto;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4);
    border: 3px solid rgba(255,255,255,0.2);
    transition: transform 0.3s ease;
  `;

  targetBox.appendChild(targetLabel);
  targetBox.appendChild(targetColorCard);

  // Grille de choix (6 propositions)
  const choicesGrid = document.createElement('div');
  choicesGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    width: 100%;
    margin-bottom: 12px;
  `;

  // Footer / Message
  const statusMsg = document.createElement('div');
  statusMsg.style.cssText = 'font-size: 12px; color: #a78bfa; text-align: center; min-height: 18px; font-weight: 600;';

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.4); text-align: center; margin-top: 4px;';
  hint.textContent = 'Tapez /stop pour revenir au chat';

  gameWrapper.appendChild(headerEl);
  gameWrapper.appendChild(targetBox);
  gameWrapper.appendChild(choicesGrid);
  gameWrapper.appendChild(statusMsg);
  gameWrapper.appendChild(hint);

  messagesContainer.parentNode.insertBefore(gameWrapper, messagesContainer.nextSibling);

  // Bouton de sortie
  const exitBtn = headerEl.querySelector('#cm-exit-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      cleanup();
    });
  }

  // --- LOGIQUE DU JEU ---
  let score = 0;
  let level = 1;
  let targetH = 0, targetS = 0, targetL = 0;

  function hslToCss(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function nextRound() {
    choicesGrid.innerHTML = '';
    statusMsg.textContent = 'Choisissez la couleur correspondante !';
    statusMsg.style.color = '#a78bfa';

    // Générer une couleur cible
    targetH = Math.floor(Math.random() * 360);
    targetS = Math.floor(Math.random() * 45) + 50; // 50-95%
    targetL = Math.floor(Math.random() * 40) + 30; // 30-70%

    targetColorCard.style.backgroundColor = hslToCss(targetH, targetS, targetL);

    // Calcul de la difficulté (l'écart entre les nuances diminue avec le niveau)
    // Niveau 1 : écart ~ 30°, Niveau 10 : écart ~ 4°
    const maxDelta = Math.max(4, 32 - (level * 2.5));

    const correctIndex = Math.floor(Math.random() * 6);

    for (let i = 0; i < 6; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = `
        height: 60px;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        outline: none;
      `;

      let h, s, l;
      if (i === correctIndex) {
        h = targetH;
        s = targetS;
        l = targetL;
      } else {
        // Variation autour de la couleur cible
        const deltaH = (Math.random() - 0.5) * maxDelta * 2;
        const deltaL = (Math.random() - 0.5) * (maxDelta / 2);
        h = (targetH + deltaH + 360) % 360;
        s = targetS;
        l = Math.max(15, Math.min(85, targetL + deltaL));
      }

      btn.style.backgroundColor = hslToCss(h, s, l);

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', () => {
        if (i === correctIndex) {
          score += 100 + level * 20;
          level++;
          document.getElementById('cm-score').textContent = `Score : ${score} | Niveau : ${level}`;
          statusMsg.textContent = '✨ Excellent œil ! Niveau suivant...';
          statusMsg.style.color = '#4ade80';
          setTimeout(nextRound, 700);
        } else {
          statusMsg.textContent = '❌ Oups ! Pas tout à fait... Essayez encore !';
          statusMsg.style.color = '#f87171';
          btn.style.opacity = '0.3';
          btn.style.pointerEvents = 'none';
        }
      });

      choicesGrid.appendChild(btn);
    }
  }

  nextRound();

  return function cleanup() {
    gameWrapper.remove();
    messagesContainer.style.display = '';
  };
}

/* ══════════════════════════════════════════════════════════════════
   INITIALISATION CHATBOT
══════════════════════════════════════════════════════════════════ */
export function init() {
  const chatbot = document.getElementById('chatbot');
  if (!chatbot) return;

  const trigger           = document.getElementById('chatbot-trigger');
  const closeBtn          = document.getElementById('chatbot-close');
  const messagesContainer  = document.getElementById('chatbot-messages');
  const form              = document.getElementById('chatbot-form');
  const input             = document.getElementById('chatbot-input');

  let isFirstOpen = true;
  let isBotTyping = false;
  let gameCleanup = null;

  // --- Masquer le chatbot dans la hero section ---
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          chatbot.classList.add('chatbot--hidden');
          if (chatbot.classList.contains('is-open')) chatbot.classList.remove('is-open');
        } else {
          chatbot.classList.remove('chatbot--hidden');
        }
      },
      { threshold: 0.15 }
    );
    heroObserver.observe(heroSection);
  }

  trigger.addEventListener('click', () => {
    chatbot.classList.add('is-open');
    if (isFirstOpen) {
      isFirstOpen = false;
      setTimeout(() => {
        addBotMessage("Bonjour ! 👋 Je suis l'assistant virtuel de Safidy.", []);
        setTimeout(() => {
          addBotMessage("Que puis-je faire pour vous aujourd'hui ?", ["Quels sont vos services ?", "Faire un devis", "Contact"]);
        }, 1000);
      }, 500);
    }
  });

  closeBtn.addEventListener('click', () => {
    if (gameCleanup) { gameCleanup(); gameCleanup = null; }
    chatbot.classList.remove('is-open');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // ══ EASTER EGG : commandes secrètes ══
    if (['/play', 'jeu', '/jeu', 'color', 'design', 'colormatch'].includes(text.toLowerCase())) {
      addUserMessage(text);
      input.value = '';
      if (!gameCleanup) {
        setTimeout(() => {
          addBotMessage("🎨 Jeu Color Match activé ! Testez votre œil de graphiste. Tapez /stop pour quitter.", []);
          setTimeout(() => {
            gameCleanup = launchColorMatch(messagesContainer);
          }, 800);
        }, 400);
      }
      return;
    }

    if (['/stop', 'stop', '/exit', 'quitter'].includes(text.toLowerCase())) {
      input.value = '';
      if (gameCleanup) {
        gameCleanup();
        gameCleanup = null;
        addBotMessage("Retour au chat 💬 Comment puis-je vous aider ?", ["Quels sont vos services ?", "Faire un devis", "Contact"]);
      }
      return;
    }

    // Message normal
    if (!isBotTyping) {
      handleUserMessage(text);
      input.value = '';
    }
  });

  function handleUserMessage(text) {
    addUserMessage(text);
    isBotTyping = true;
    const delay = 600 + Math.random() * 800;
    const typingIndicator = addTypingIndicator();
    setTimeout(() => {
      typingIndicator.remove();
      const response = findBestResponse(text);
      addBotMessage(response.answer, response.options);
      if (ACTIONS[text]) ACTIONS[text]();
      isBotTyping = false;
    }, delay);
  }

  function findBestResponse(text) {
    const lowerText = text.toLowerCase();
    for (const res of RESPONSES) {
      if (res.keywords.some(kw => lowerText.includes(kw))) return res;
    }
    if (text === "Quels sont vos services ?") return RESPONSES.find(r => r.keywords.includes("service"));
    if (text === "Faire un devis")            return RESPONSES.find(r => r.keywords.includes("devis"));
    return DEFAULT_ANSWER;
  }

  function addBotMessage(text, options = []) {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg--bot';
    msgEl.textContent = text;
    messagesContainer.appendChild(msgEl);

    if (options && options.length > 0) {
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'chat-quick-replies';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chat-quick-reply';
        btn.type = 'button';
        btn.textContent = opt;
        btn.addEventListener('click', () => { if (!isBotTyping) handleUserMessage(opt); });
        optionsContainer.appendChild(btn);
      });
      messagesContainer.appendChild(optionsContainer);
    }
    scrollToBottom();
  }

  function addUserMessage(text) {
    messagesContainer.querySelectorAll('.chat-quick-replies').forEach(el => el.remove());
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg--user';
    msgEl.textContent = text;
    messagesContainer.appendChild(msgEl);
    scrollToBottom();
  }

  function addTypingIndicator() {
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg--bot is-typing';
    msgEl.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(msgEl);
    scrollToBottom();
    return msgEl;
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}
