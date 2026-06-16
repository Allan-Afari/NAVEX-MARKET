import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome',
      login: 'Login',
      signup: 'Sign Up',
      dashboard: 'Dashboard',
      deals: 'Deals',
      messages: 'Messages',
      profile: 'Profile',
      logout: 'Logout',
      search: 'Search',
      submit: 'Submit',
      cancel: 'Cancel',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      // Add more translations as needed
    },
  },
  es: {
    translation: {
      welcome: 'Bienvenido',
      login: 'Iniciar Sesión',
      signup: 'Registrarse',
      dashboard: 'Panel',
      deals: 'Ofertas',
      messages: 'Mensajes',
      profile: 'Perfil',
      logout: 'Cerrar Sesión',
      search: 'Buscar',
      submit: 'Enviar',
      cancel: 'Cancelar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
    },
  },
  fr: {
    translation: {
      welcome: 'Bienvenue',
      login: 'Connexion',
      signup: 'S\'inscrire',
      dashboard: 'Tableau de bord',
      deals: 'Offres',
      messages: 'Messages',
      profile: 'Profil',
      logout: 'Déconnexion',
      search: 'Rechercher',
      submit: 'Soumettre',
      cancel: 'Annuler',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;