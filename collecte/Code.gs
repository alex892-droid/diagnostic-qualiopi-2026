// Réception des événements du diagnostic dans une feuille Google Sheets.
// À coller dans Extensions > Apps Script d'une feuille vide, puis à déployer
// comme application web (Exécuter en tant que : moi ; Accès : tout le monde).
// L'adresse du déploiement (…/exec) va dans `endpoint` de config.js.

// Mettre à true pour envoyer automatiquement le résultat à la personne.
// Le message part alors de l'adresse du compte Google qui déploie ce script.
const ENVOYER_RESULTAT = false;
const NOM_EXPEDITEUR = "Diagnostic Qualiopi 2026";

const TYPES = ["diagnostic_termine", "adresse_laissee", "clic_precommande"];

function doPost(e) {
  try {
    const brut = (e && e.postData && e.postData.contents) || "";
    if (brut.length > 20000) return reponse("trop long");
    const d = JSON.parse(brut);
    if (TYPES.indexOf(d.type) < 0) return reponse("type inconnu");

    const email = texte(d.email, 200);
    if (d.type === "adresse_laissee" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reponse("adresse invalide");
    }
    const resume = Array.isArray(d.resume) ? d.resume.slice(0, 30).map(function (l) { return texte(l, 400); }) : [];

    const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (feuille.getLastRow() === 0) {
      feuille.appendRow(["Reçu le", "Type", "E-mail", "Contrôles", "Écarts", "Majeures", "Profil", "Détail des écarts"]);
    }
    feuille.appendRow([
      new Date(),
      d.type,
      neutre(email),
      nombre(d.controles),
      Array.isArray(d.ecarts) ? d.ecarts.length : nombre(d.ecarts),
      nombre(d.majeures),
      neutre(texte(JSON.stringify(d.profil || ""), 300)),
      neutre(Array.isArray(d.ecarts) ? texte(d.ecarts.join(", "), 600) : ""),
    ]);

    if (ENVOYER_RESULTAT && d.type === "adresse_laissee") {
      const page = /^https:\/\//.test(d.page || "") ? texte(d.page, 200) : "";
      const corps = [
        "Bonjour,",
        "",
        "Voici le résultat de votre diagnostic Qualiopi 2026.",
        "",
        resume.length ? "Points à traiter :\n- " + resume.join("\n- ") : "Aucun point à traiter sur les contrôles vérifiés.",
        "",
        page ? "Le détail de chaque point (texte officiel, preuves attendues) se retrouve en refaisant le diagnostic : " + page : "",
        "",
        "Cet outil est indépendant ; il ne remplace ni un audit ni l'avis de votre certificateur.",
      ].join("\n");
      MailApp.sendEmail({ to: email, subject: "Votre diagnostic Qualiopi 2026", body: corps, name: NOM_EXPEDITEUR });
    }
    return reponse("ok");
  } catch (erreur) {
    return reponse("erreur");
  }
}

function texte(v, max) { return String(v == null ? "" : v).slice(0, max); }
function nombre(v) { const n = Number(v); return isFinite(n) ? n : ""; }
// Empêche qu'une valeur reçue soit interprétée comme une formule par le tableur.
function neutre(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function reponse(m) { return ContentService.createTextOutput(m); }
