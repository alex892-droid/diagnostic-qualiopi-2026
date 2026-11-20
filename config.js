// Réglages à remplir avant la mise en ligne. Tant qu'un champ est vide,
// la fonction correspondante est désactivée proprement.
const CONFIG = {
  // Adresse qui reçoit les événements (diagnostic terminé, adresse laissée,
  // clic de précommande) en POST, au format JSON envoyé en text/plain.
  endpoint: "",

  // Lien de paiement de la précommande du kit (page de paiement hébergée).
  lienPaiement: "",

  // Adresse de contact affichée en bas de page, et solution de repli
  // pour recevoir les demandes si `endpoint` est vide.
  contact: "",

  // Prix de la précommande, en euros.
  prixKit: 99,

  // Éditeur du site, pour les mentions en bas de page.
  editeur: "",
};
