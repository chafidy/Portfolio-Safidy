/**
 * FICHIER : chatbot.js
 * RÔLE    : Gère la logique de l'assistant virtuel local (sans API externe)
 */

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

export function init() {
  const chatbot = document.getElementById('chatbot');
  if (!chatbot) return;

  const trigger = document.getElementById('chatbot-trigger');
  const closeBtn = document.getElementById('chatbot-close');
  const messagesContainer = document.getElementById('chatbot-messages');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');

  let isFirstOpen = true;
  let isBotTyping = false;

  // --- Masquer le chatbot dans la hero section ---
  const heroSection = document.getElementById('hero');
  if (heroSection) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // La hero est visible → masquer le chatbot
          chatbot.classList.add('chatbot--hidden');
          // Si la fenêtre est ouverte, la fermer proprement
          if (chatbot.classList.contains('is-open')) {
            chatbot.classList.remove('is-open');
          }
        } else {
          // On a quitté la hero → afficher le chatbot
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
    chatbot.classList.remove('is-open');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text && !isBotTyping) {
      handleUserMessage(text);
      input.value = '';
    }
  });

  function handleUserMessage(text) {
    addUserMessage(text);
    isBotTyping = true;
    
    // Simulate thinking delay
    const delay = 600 + Math.random() * 800;
    
    const typingIndicator = addTypingIndicator();

    setTimeout(() => {
      typingIndicator.remove();
      const response = findBestResponse(text);
      addBotMessage(response.answer, response.options);
      
      // Execute side effect if it matches an action
      if (ACTIONS[text]) {
        ACTIONS[text]();
      }
      
      isBotTyping = false;
    }, delay);
  }

  function findBestResponse(text) {
    const lowerText = text.toLowerCase();
    
    for (const res of RESPONSES) {
      if (res.keywords.some(kw => lowerText.includes(kw))) {
        return res;
      }
    }
    
    // Check if the exact text is one of the options without a specific keyword mapping
    if (["Quels sont vos services ?", "Faire un devis"].includes(text)) {
      if (text === "Quels sont vos services ?") return RESPONSES.find(r => r.keywords.includes("service"));
      if (text === "Faire un devis") return RESPONSES.find(r => r.keywords.includes("devis"));
    }
    
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
        btn.addEventListener('click', () => {
          if (!isBotTyping) {
            handleUserMessage(opt);
          }
        });
        optionsContainer.appendChild(btn);
      });
      
      messagesContainer.appendChild(optionsContainer);
    }
    
    scrollToBottom();
  }

  function addUserMessage(text) {
    // Remove any previous quick replies to clean up UI
    const existingReplies = messagesContainer.querySelectorAll('.chat-quick-replies');
    existingReplies.forEach(el => el.remove());

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
