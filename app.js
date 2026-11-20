(function () {
  "use strict";

  const app = document.getElementById("app");
  const etape = document.getElementById("etape");
  const etat = { profil: {}, reponses: {} };

  // --- Outils ---------------------------------------------------------

  function el(balise, attributs, enfants) {
    const noeud = document.createElement(balise);
    for (const [cle, valeur] of Object.entries(attributs || {})) {
      if (cle === "class") noeud.className = valeur;
      else if (cle === "text") noeud.textContent = valeur;
      else if (cle.startsWith("on")) noeud.addEventListener(cle.slice(2), valeur);
      else noeud.setAttribute(cle, valeur);
    }
    for (const enfant of [].concat(enfants || [])) {
      if (enfant) noeud.append(enfant);
    }
    return noeud;
  }

  function afficher(libelleEtape, noeuds) {
    etape.textContent = libelleEtape;
    app.replaceChildren(...noeuds);
    const titre = app.querySelector("h1, h2");
    if (titre) {
      titre.setAttribute("tabindex", "-1");
      titre.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
  }

  function signaler(type, donnees) {
    if (!CONFIG.endpoint) return;
    const corps = JSON.stringify(Object.assign({ type: type, date: new Date().toISOString() }, donnees || {}));
    try {
      navigator.sendBeacon(CONFIG.endpoint, new Blob([corps], { type: "text/plain" }));
    } catch (e) {
      /* la mesure ne doit jamais bloquer le parcours */
    }
  }

  function groupeDeChoix(nom, legende, options, valeur, repere) {
    const choix = el("div", { class: "choix" });
    for (const option of options) {
      const input = el("input", { type: "radio", name: nom, value: option.valeur });
      if (valeur === option.valeur) input.checked = true;
      choix.append(el("label", {}, [input, document.createTextNode(option.libelle)]));
    }
    return el("fieldset", { class: "carte", "data-nom": nom }, [
      repere ? el("div", { class: "repere", text: repere }) : null,
      el("legend", { text: legende }),
      choix,
    ]);
  }

  function lireChoix(noms) {
    const valeurs = {};
    let premierManquant = null;
    for (const nom of noms) {
      const coche = app.querySelector('input[name="' + nom + '"]:checked');
      if (coche) valeurs[nom] = coche.value;
      else if (!premierManquant) premierManquant = nom;
    }
    return { valeurs: valeurs, premierManquant: premierManquant };
  }

  function montrerErreur(message, nom) {
    let zone = app.querySelector(".erreur");
    if (!zone) {
      zone = el("p", { class: "erreur", role: "alert" });
      app.querySelector(".actions").before(zone);
    }
    zone.textContent = message;
    const bloc = app.querySelector('[data-nom="' + nom + '"]');
    if (bloc) {
      bloc.scrollIntoView({ block: "center" });
      const input = bloc.querySelector("input");
      if (input) input.focus({ preventScroll: true });
    }
  }

  function controlesApplicables() {
    return CONTROLES.filter(function (c) {
      return c.si === null || etat.profil[c.si] === "oui";
    });
  }

  // --- Écrans ---------------------------------------------------------

  function ecranAccueil() {
    afficher("", [
      el("h1", { text: "Êtes-vous à jour du référentiel Qualiopi modifié en 2026 ?" }),
      el("p", { class: "chapo", text: "Douze indicateurs ont changé et un treizième a été créé. À partir du 1er janvier 2027, tous les audits se font sur la nouvelle version." }),
      el("div", { class: "carte" }, [
        el("h3", { text: "Ce que vous obtenez en 3 minutes" }),
        el("ul", { class: "liste-simple" }, [
          el("li", { text: "La liste de ce qui vous manque, selon votre activité." }),
          el("li", { text: "Pour chaque point, le texte exact de la nouvelle exigence et les preuves attendues à l'audit." }),
          el("li", { text: "Les points où un écart est directement une non-conformité majeure." }),
        ]),
        el("p", { class: "petit", text: "Gratuit, sans inscription. Vos réponses restent dans votre navigateur." }),
      ]),
      el("div", { class: "actions" }, [
        el("button", { type: "button", text: "Commencer le diagnostic", onclick: ecranProfil }),
      ]),
    ]);
  }

  function ecranProfil() {
    const ouiNon = [
      { valeur: "oui", libelle: "Oui" },
      { valeur: "non", libelle: "Non" },
    ];
    const blocs = PROFIL.map(function (p) {
      return groupeDeChoix(p.id, p.question, ouiNon, etat.profil[p.id]);
    });
    afficher("Étape 1 sur 2", [
      el("h2", { text: "Votre activité" }),
      el("p", { text: "Ces six questions servent à ne vous montrer que les exigences qui vous concernent." }),
      ...blocs,
      el("div", { class: "actions" }, [
        el("button", {
          type: "button",
          text: "Continuer",
          onclick: function () {
            const lu = lireChoix(PROFIL.map(function (p) { return p.id; }));
            etat.profil = lu.valeurs;
            if (lu.premierManquant) {
              montrerErreur("Répondez à toutes les questions pour continuer.", lu.premierManquant);
              return;
            }
            ecranControles();
          },
        }),
      ]),
    ]);
  }

  function ecranControles() {
    const liste = controlesApplicables();
    const blocs = liste.map(function (c, i) {
      const options = [
        { valeur: "oui", libelle: "Oui" },
        { valeur: "non", libelle: "Non" },
        { valeur: "nsp", libelle: "Je ne sais pas" },
      ];
      if (c.na) options.push({ valeur: "na", libelle: c.na });
      return groupeDeChoix(c.id, c.question, options, etat.reponses[c.id],
        "Question " + (i + 1) + " sur " + liste.length + " · indicateur " + c.indicateur);
    });
    afficher("Étape 2 sur 2", [
      el("h2", { text: "Vos pratiques aujourd'hui" }),
      el("p", { text: "Répondez comme vous le feriez devant l'auditeur : « oui » seulement si vous pouvez montrer une preuve." }),
      ...blocs,
      el("div", { class: "actions" }, [
        el("button", { type: "button", class: "secondaire", text: "Retour", onclick: function () {
          etat.reponses = lireChoix(liste.map(function (c) { return c.id; })).valeurs;
          ecranProfil();
        } }),
        el("button", {
          type: "button",
          text: "Voir mon résultat",
          onclick: function () {
            const lu = lireChoix(liste.map(function (c) { return c.id; }));
            etat.reponses = lu.valeurs;
            if (lu.premierManquant) {
              montrerErreur("Répondez à toutes les questions pour voir votre résultat.", lu.premierManquant);
              return;
            }
            ecranResultat();
          },
        }),
      ]),
    ]);
  }

  function carteEcart(c, incertain) {
    const source = el("p", { class: "source" }, [
      document.createTextNode("Source : "),
      el("a", { href: SOURCES.decret.url, target: "_blank", rel: "noopener", text: "décret du 1er août 2026" }),
      document.createTextNode(", indicateur " + c.indicateur + " ; "),
      el("a", { href: SOURCES.guide.url, target: "_blank", rel: "noopener", text: "guide de lecture" }),
      document.createTextNode(", page " + c.page + "."),
    ]);
    return el("article", { class: "carte ecart" }, [
      el("span", {
        class: "etiquette " + (c.majeure ? "majeure" : "graduee"),
        text: c.majeure ? "Non-conformité majeure en cas d'écart" : "Non-conformité mineure ou majeure",
      }),
      incertain ? el("span", { class: "etiquette graduee", text: "À vérifier" }) : null,
      el("h3", { text: "Indicateur " + c.indicateur + " : " + c.question }),
      el("dl", {}, [
        el("dt", { text: "Ce que demande le nouveau texte" }),
        el("dd", { text: c.exigence }),
        el("dt", { text: "Preuves attendues à l'audit" }),
        el("dd", { text: c.preuves }),
      ]),
      source,
    ]);
  }

  function ecranResultat() {
    const liste = controlesApplicables().filter(function (c) { return etat.reponses[c.id] !== "na"; });
    const ecarts = liste.filter(function (c) { return etat.reponses[c.id] !== "oui"; });
    const conformes = liste.filter(function (c) { return etat.reponses[c.id] === "oui"; });
    const majeures = ecarts.filter(function (c) { return c.majeure; });
    ecarts.sort(function (a, b) { return Number(b.majeure) - Number(a.majeure) || a.indicateur - b.indicateur; });

    signaler("diagnostic_termine", {
      controles: liste.length, ecarts: ecarts.length, majeures: majeures.length, profil: etat.profil,
    });

    const noeuds = [
      el("h2", { text: ecarts.length === 0
        ? "Vous êtes à jour sur les points vérifiés"
        : ecarts.length + (ecarts.length > 1 ? " points à traiter" : " point à traiter") + " avant votre prochain audit" }),
      el("div", { class: "bilan" }, [
        el("div", {}, [el("strong", { text: String(conformes.length) }), el("span", { text: "à jour" })]),
        el("div", {}, [el("strong", { text: String(ecarts.length) }), el("span", { text: "à traiter" })]),
        el("div", {}, [el("strong", { text: String(majeures.length) }), el("span", { text: "dont majeures" })]),
      ]),
      el("p", { class: "bandeau", text: "Jusqu'au 31 décembre 2026, un organisme déjà certifié peut encore être audité sur l'ancienne version. À partir du 1er janvier 2027, la nouvelle s'applique à tous. Une preuve absente le jour de l'audit est une non-conformité." }),
    ];

    for (const c of ecarts) noeuds.push(carteEcart(c, etat.reponses[c.id] === "nsp"));

    if (conformes.length) {
      noeuds.push(el("div", { class: "carte" }, [
        el("span", { class: "etiquette conforme", text: "À jour" }),
        el("ul", { class: "liste-simple" }, conformes.map(function (c) {
          return el("li", { text: "Indicateur " + c.indicateur + " : " + c.question });
        })),
      ]));
    }

    noeuds.push(blocEnvoi(ecarts));
    if (ecarts.length) noeuds.push(blocOffre(ecarts));

    noeuds.push(el("div", { class: "actions" }, [
      el("button", { type: "button", class: "secondaire", text: "Imprimer ou enregistrer en PDF", onclick: function () { window.print(); } }),
      el("button", { type: "button", class: "secondaire", text: "Modifier mes réponses", onclick: ecranControles }),
    ]));

    afficher("Votre résultat", noeuds);
  }

  function blocEnvoi(ecarts) {
    const input = el("input", { type: "email", name: "email", placeholder: "vous@organisme.fr", autocomplete: "email", "aria-label": "Votre adresse e-mail" });
    const retour = el("p", { class: "petit", role: "status", text: "Votre adresse sert uniquement à vous envoyer ce résultat et à vous prévenir des mises à jour du guide. Aucune autre utilisation." });
    const formulaire = el("form", { class: "champ", novalidate: "" }, [
      input,
      el("button", { type: "submit", text: "Recevoir mon résultat" }),
    ]);
    formulaire.addEventListener("submit", function (evenement) {
      evenement.preventDefault();
      const adresse = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) {
        retour.className = "erreur";
        retour.textContent = "Saisissez une adresse e-mail valide.";
        input.focus();
        return;
      }
      const resume = ecarts.map(function (c) { return "Indicateur " + c.indicateur + " : " + c.question; });
      if (CONFIG.endpoint) {
        signaler("adresse_laissee", { email: adresse, ecarts: ecarts.map(function (c) { return c.id; }), resume: resume, page: location.origin + location.pathname });
        retour.className = "confirmation";
        retour.textContent = "C'est noté. Vous recevrez votre résultat à cette adresse.";
        formulaire.remove();
      } else if (CONFIG.contact) {
        const corps = "Bonjour,\n\nMerci de m'envoyer mon résultat.\n\nPoints à traiter :\n- " + resume.join("\n- ");
        window.location.href = "mailto:" + CONFIG.contact + "?subject=" + encodeURIComponent("Mon diagnostic Qualiopi 2026") + "&body=" + encodeURIComponent(corps);
      } else {
        retour.className = "erreur";
        retour.textContent = "L'envoi par e-mail n'est pas encore activé sur ce site. Utilisez le bouton d'impression pour garder votre résultat.";
      }
    });
    return el("section", { class: "carte envoi" }, [
      el("h3", { text: "Recevoir ce résultat par e-mail" }),
      formulaire,
      retour,
    ]);
  }

  function blocOffre(ecarts) {
    const documents = [];
    for (const c of ecarts) if (c.doc && !documents.includes(c.doc)) documents.push(c.doc);
    const enfants = [
      el("h3", { text: "Le kit de mise à jour, préparé pour vos " + ecarts.length + (ecarts.length > 1 ? " points" : " point") }),
      el("p", { text: "Les documents qui vous manquent, préremplis à partir de vos réponses et prêts à être adaptés puis présentés à l'auditeur :" }),
      el("ul", { class: "liste-simple" }, documents.map(function (d) { return el("li", { text: d }); })),
      el("p", {}, [
        el("strong", { text: CONFIG.prixKit + " € HT, en une fois." }),
        document.createTextNode(" Livraison en janvier 2027. Remboursé sur simple demande si le kit ne vous convient pas."),
      ]),
    ];
    if (CONFIG.lienPaiement) {
      enfants.push(el("a", {
        class: "bouton", href: CONFIG.lienPaiement, target: "_blank", rel: "noopener",
        text: "Précommander le kit",
        onclick: function () { signaler("clic_precommande", { ecarts: ecarts.length }); },
      }));
    } else {
      enfants.push(el("p", { class: "petit", text: "La précommande en ligne ouvre bientôt. Laissez votre adresse ci-dessus pour être prévenu." }));
    }
    return el("section", { class: "carte offre" }, enfants);
  }

  // --- Pied de page et démarrage -------------------------------------

  const zoneSources = document.getElementById("sources");
  Object.values(SOURCES).forEach(function (s, i) {
    if (i) zoneSources.append(", ");
    zoneSources.append(el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.nom }));
  });
  const mentions = [];
  if (CONFIG.editeur) mentions.push("Éditeur : " + CONFIG.editeur + ".");
  if (CONFIG.contact) mentions.push("Contact : " + CONFIG.contact + ".");
  document.getElementById("mentions").textContent = mentions.join(" ");

  ecranAccueil();
})();
