/**
 * NIERO - Internationalization Module
 * Handles language switching and translations
 */

const LANG_KEY = 'niero-lang';
const DEFAULT_LANG = 'pt-BR';

/**
 * Apply translations to all elements with data-i18n attribute
 */
export function applyTranslations() {
  const lang = getCurrentLanguage();
  const dict = translations[lang] || translations[DEFAULT_LANG];
  
  if (!dict) {
    console.warn('No translations found for:', lang);
    return;
  }
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = dict[key];
    
    if (translation !== undefined) {
      // Check if translation contains HTML
      if (translation.includes('<') && translation.includes('>')) {
        element.innerHTML = translation;
      } else {
        element.textContent = translation;
      }
    } else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      console.warn(`Missing translation for key: ${key} in ${lang}`);
    } else if (typeof process === 'undefined' && window.location.hostname === 'localhost') {
      console.warn(`Missing translation for key: ${key} in ${lang}`);
    }
  });
  
  // Update document title
  const titleKey = 'site.title';
  if (dict[titleKey]) {
    document.title = dict[titleKey].replace(/<[^>]*>/g, '');
  }
  
  // Update html lang attribute
  document.documentElement.lang = lang === 'pt-BR' ? 'pt-BR' : 'en';
}

/**
 * Set current language
 */
export function setLanguage(lang) {
  if (!translations[lang]) {
    console.warn(`Language ${lang} not supported`);
    return false;
  }
  
  localStorage.setItem(LANG_KEY, lang);
  return true;
}

/**
 * Get current language
 */
export function getCurrentLanguage() {
  return localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
}

/**
 * Translation dictionary
 * In production, these could be loaded from separate JSON files
 */
const translations = {
  'pt-BR': {
    'site.title': 'Niero | Posicionamento e Construção de Marcas',
    'nav.home': 'Home',
    'nav.about': 'Sobre',
    'nav.services': 'Serviços',
    'nav.portfolio': 'Portfólio',
    'nav.contact': 'Contato',
    'nav.menu': 'Menu',
    'a11y.skipToContent': 'Pular para o conteúdo principal',
    'hero.badge': 'Especialistas em marcas para saúde mental',
    'hero.title': 'Marcas que <strong>conectam</strong>',
    'hero.subtitle': 'Construímos identidades fortes, estratégicas e memoráveis para profissionais da saúde mental. Unimos identidade visual, gestão de marca, fotografia, ambientação e digital para marcas sólidas, com presença, consistência e valor em cada ponto de contato.',
    'hero.ctaPrimary': 'Iniciar meu projeto',
    'hero.ctaSecondary': 'Ver nossos cases',
    'hero.statYears': 'Anos de experiência',
    'hero.statProjects': 'Projetos entregues',
    'hero.statSatisfaction': '% Satisfação',
    'hero.statSpecialties': 'Especialidades atendidas',
    'valueProp.title': 'Por que a Niero?',
    'valueProp.subtitle': 'Somos especialistas em desenvolver marcas para profissionais da saúde mental. Entendemos as particularidades, a ética e a sensibilidade que esse mercado exige.',
    'valueProp.item1.title': 'Especialização em Saúde Mental',
    'valueProp.item1.desc': 'Atendemos psicólogas, neuropsicólogas, psiquiatras e clínicas com conhecimento profundo do setor.',
    'valueProp.item2.title': 'Abordagem 360°',
    'valueProp.item2.desc': 'Identidade visual, gestão de marca, fotografia, ambientação e digital — tudo integrado.',
    'valueProp.item3.title': 'Consistência em Todo Ponto de Contato',
    'valueProp.item3.desc': 'Da recepção ao Instagram, do site ao material impresso — sua marca fala a mesma língua.',
    'services.title': 'Nossos Serviços',
    'services.subtitle': 'Soluções completas para construir e fortalecer sua marca',
    'services.viewAll': 'Ver todos os serviços →',
    'services.item1.title': 'Identidade Visual',
    'services.item1.desc': 'Logo, paleta, tipografia, iconografia e manual de marca — a base visual da sua identidade.',
    'services.item1.link': 'Saiba mais →',
    'services.item2.title': 'Gestão de Marca',
    'services.item2.desc': 'Posicionamento, tom de voz, estratégia de comunicação e governança da marca ao longo do tempo.',
    'services.item2.link': 'Saiba mais →',
    'services.item3.title': 'Fotografia Profissional',
    'services.item3.desc': 'Retratos, equipe, ambiente e lifestyle — imagens que transmitem acolhimento e autoridade.',
    'services.item3.link': 'Saiba mais →',
    'services.item4.title': 'Decoração de Ambientes',
    'services.item4.desc': 'Projetos de interiores para consultórios e clínicas que acolhem e transmitem profissionalismo.',
    'services.item4.link': 'Saiba mais →',
    'services.item5.title': 'Criação de Sites e Apps',
    'services.item5.desc': 'Presença digital estratégica: sites institucionais, landing pages, agendamento online e aplicativos.',
    'services.item5.link': 'Saiba mais →',
    'services.item6.title': 'Consultoria Estratégica',
    'services.item6.desc': 'Diagnóstico de marca, planejamento estratégico e mentoria para gestão autônoma da sua identidade.',
    'services.item6.link': 'Saiba mais →',
    'portfolio.title': 'Portfólio',
    'portfolio.subtitle': 'Cases reais de transformação de marcas na saúde mental',
    'portfolio.viewAll': 'Ver todos os cases →',
    'portfolio.category.branding': 'Identidade Visual & Branding',
    'portfolio.category.full': 'Projeto 360°',
    'portfolio.category.digital': 'Site & Presença Digital',
    'portfolio.viewCase': 'Ver case completo →',
    'portfolio.case1.title': 'Clínica Vida Plena',
    'portfolio.case1.desc': 'Rebranding completo para clínica multiprofissional em São Paulo',
    'portfolio.case2.title': 'Dra. Marina Silva - Neuropsicologia',
    'portfolio.case2.desc': 'Identidade, site, fotografia e ambientação de consultório',
    'portfolio.case3.title': 'Instituto Mente Aberta',
    'portfolio.case3.desc': 'Site institucional com agendamento online e blog científico',
    'cta.title': 'Pronta para transformar sua marca?',
    'cta.subtitle': 'Vamos conversar sobre seu projeto e entender como a Niero pode ajudar a construir uma marca forte, consistente e memorável.',
    'cta.button': 'Começar meu projeto',
    'footer.tagline': 'Posicionamento e construção de marcas para profissionais da saúde mental.',
    'footer.nav.company': 'Empresa',
    'footer.nav.services': 'Serviços',
    'footer.nav.contact': 'Contato',
    'footer.copyright': '© 2025 Niero. Todos os direitos reservados.',
    'footer.privacy': 'Política de Privacidade',
    'footer.terms': 'Termos de Uso',
  },
  
  'en': {
    'site.title': 'Niero | Brand Positioning & Building',
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.services': 'Services',
    'nav.portfolio': 'Portfolio',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'a11y.skipToContent': 'Skip to main content',
    'hero.badge': 'Specialists in brands for mental health',
    'hero.title': 'Brands that <strong>connect</strong>',
    'hero.subtitle': 'We build strong, strategic and memorable identities for mental health professionals. We combine visual identity, brand management, photography, environment design and digital for solid brands with presence, consistency and value at every touchpoint.',
    'hero.ctaPrimary': 'Start my project',
    'hero.ctaSecondary': 'View our cases',
    'hero.statYears': 'Years of experience',
    'hero.statProjects': 'Projects delivered',
    'hero.statSatisfaction': '% Satisfaction',
    'hero.statSpecialties': 'Specialties served',
    'valueProp.title': 'Why Niero?',
    'valueProp.subtitle': 'We specialize in developing brands for mental health professionals. We understand the particularities, ethics and sensitivity this market demands.',
    'valueProp.item1.title': 'Mental Health Specialization',
    'valueProp.item1.desc': 'We serve psychologists, neuropsychologists, psychiatrists and clinics with deep sector knowledge.',
    'valueProp.item2.title': '360° Approach',
    'valueProp.item2.desc': 'Visual identity, brand management, photography, environment design and digital — all integrated.',
    'valueProp.item3.title': 'Consistency at Every Touchpoint',
    'valueProp.item3.desc': 'From reception to Instagram, from website to print — your brand speaks the same language.',
    'services.title': 'Our Services',
    'services.subtitle': 'Complete solutions to build and strengthen your brand',
    'services.viewAll': 'View all services →',
    'services.item1.title': 'Visual Identity',
    'services.item1.desc': 'Logo, palette, typography, iconography and brand manual — the visual foundation of your identity.',
    'services.item1.link': 'Learn more →',
    'services.item2.title': 'Brand Management',
    'services.item2.desc': 'Positioning, tone of voice, communication strategy and brand governance over time.',
    'services.item2.link': 'Learn more →',
    'services.item3.title': 'Professional Photography',
    'services.item3.desc': 'Portraits, team, environment and lifestyle — images that convey warmth and authority.',
    'services.item3.link': 'Learn more →',
    'services.item4.title': 'Environment Design',
    'services.item4.desc': 'Interior design projects for offices and clinics that welcome and convey professionalism.',
    'services.item4.link': 'Learn more →',
    'services.item5.title': 'Websites & Apps',
    'services.item5.desc': 'Strategic digital presence: institutional websites, landing pages, online scheduling and apps.',
    'services.item5.link': 'Learn more →',
    'services.item6.title': 'Strategic Consulting',
    'services.item6.desc': 'Brand diagnosis, strategic planning and mentoring for autonomous identity management.',
    'services.item6.link': 'Learn more →',
    'portfolio.title': 'Portfolio',
    'portfolio.subtitle': 'Real cases of brand transformation in mental health',
    'portfolio.viewAll': 'View all cases →',
    'portfolio.category.branding': 'Visual Identity & Branding',
    'portfolio.category.full': '360° Project',
    'portfolio.category.digital': 'Website & Digital Presence',
    'portfolio.viewCase': 'View full case →',
    'portfolio.case1.title': 'Clínica Vida Plena',
    'portfolio.case1.desc': 'Complete rebranding for multiprofessional clinic in São Paulo',
    'portfolio.case2.title': 'Dra. Marina Silva - Neuropsychology',
    'portfolio.case2.desc': 'Identity, website, photography and office environment design',
    'portfolio.case3.title': 'Instituto Mente Aberta',
    'portfolio.case3.desc': 'Institutional website with online scheduling and scientific blog',
    'cta.title': 'Ready to transform your brand?',
    'cta.subtitle': 'Let\'s talk about your project and understand how Niero can help build a strong, consistent and memorable brand.',
    'cta.button': 'Start my project',
    'footer.tagline': 'Brand positioning and building for mental health professionals.',
    'footer.nav.company': 'Company',
    'footer.nav.services': 'Services',
    'footer.nav.contact': 'Contact',
    'footer.copyright': '© 2025 Niero. All rights reserved.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Use',
  }
};