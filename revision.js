const TYPES_REVISION = {
    definition: {
        label: "Définition",
        fields: [
            ["terme", "Mot / notion", "Ex. Photosynthèse", "text"],
            ["definition", "Définition", "Explique cette notion...", "textarea"]
        ]
    },
    question: {
        label: "Question / réponse",
        fields: [
            ["question", "Question", "Ex. Quelle est la capitale de l'Allemagne ?", "text"],
            ["reponse", "Réponse", "Ex. Berlin", "textarea"]
        ]
    },
    date: {
        label: "Date / événement",
        fields: [
            ["date", "Date", "Ex. 1789", "text"],
            ["evenement", "Événement associé", "Ex. Révolution française", "textarea"]
        ]
    },
    vocabulaire: {
        label: "Mot-clé / vocabulaire",
        fields: [
            ["mot", "Mot", "Ex. Ecosystème", "text"],
            ["definition", "Signification", "Définis ce mot...", "textarea"]
        ]
    },
    personne: {
        label: "Personne / personnage",
        fields: [
            ["personne", "Personne", "Ex. Napoléon Bonaparte", "text"],
            ["description", "Rôle / informations", "Qui est cette personne ?", "textarea"]
        ]
    },
    lieu: {
        label: "Lieu",
        fields: [
            ["lieu", "Lieu", "Ex. Rome", "text"],
            ["description", "Informations", "Pays, événement ou informations associées...", "textarea"]
        ]
    },
    formule: {
        label: "Formule",
        fields: [
            ["formule", "Formule", "Ex. v = d / t", "text"],
            ["explication", "Explication / utilisation", "Que signifie cette formule et quand l'utiliser ?", "textarea"]
        ]
    },
    regle: {
        label: "Règle / propriété",
        fields: [
            ["regle", "Règle / propriété", "Écris la règle...", "textarea"],
            ["application", "Application", "Dans quel cas l'utiliser ?", "textarea"]
        ]
    },
    methode: {
        label: "Méthode / procédure",
        fields: [
            ["objectif", "Objectif", "Ex. Calculer une moyenne", "text"],
            ["etapes", "Étapes", "Décris les étapes dans l'ordre...", "textarea"]
        ]
    },
    processus: {
        label: "Processus",
        fields: [
            ["processus", "Processus", "Ex. Digestion", "text"],
            ["etapes", "Étapes", "Décris les étapes dans l'ordre...", "textarea"]
        ]
    },
    cause: {
        label: "Cause / conséquence",
        fields: [
            ["cause", "Cause", "Pourquoi cela se produit ?", "textarea"],
            ["consequence", "Conséquence", "Quel est le résultat ?", "textarea"]
        ]
    },
    exemple: {
        label: "Exemple",
        fields: [
            ["notion", "Notion concernée", "Ex. Mélange homogène", "text"],
            ["exemple", "Exemple", "Donne un exemple...", "textarea"]
        ]
    },
    liste: {
        label: "Liste / éléments à retenir",
        fields: [
            ["sujet", "Sujet", "Ex. Les trois états de l'eau", "text"],
            ["elements", "Éléments", "Un élément par ligne...", "textarea"]
        ]
    }
};

async function chargerFiches() {
    verifierSupabase();
    const { data, error } = await supabaseClient
        .from("fiches_revision")
        .select("id, titre, matiere, questions, auteur_id, auteur_identifiant, created_at")
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
}

function afficherFiches(fiches) {
    const liste = document.getElementById("liste-fiches");

    if (!fiches.length) {
        liste.innerHTML = '<div class="empty-state revision-empty"><h3>Aucune fiche pour le moment</h3><p>Crée la première fiche de révision.</p></div>';
        return;
    }

    liste.innerHTML = fiches.map(fiche => {
        const date = new Date(fiche.created_at).toLocaleDateString("fr-FR");
        const questions = Array.isArray(fiche.questions) ? fiche.questions : [];
        return `<article class="revision-fiche-card">
            <span class="article-tag">${escapeHtml(fiche.matiere)}</span>
            <h3>${escapeHtml(fiche.titre)}</h3>
            <p>${questions.length} question${questions.length > 1 ? "s" : ""}</p>
            <small>Créée par <strong>${escapeHtml(fiche.auteur_identifiant || "Utilisateur")}</strong> le ${date}</small>
        </article>`;
    }).join("");

    liste.querySelectorAll(".revision-study-button").forEach(button => {
        button.addEventListener("click", () => {
            const fiche = fiches.find(item => String(item.id) === String(button.dataset.ficheId));
            if (fiche) afficherConfigurationRevision(fiche);
        });
    });
}

async function actualiserFiches() {
    const liste = document.getElementById("liste-fiches");
    try {
        liste.innerHTML = '<div class="empty-state revision-empty"><h3>Chargement des fiches...</h3></div>';
        afficherFiches(await chargerFiches());
    } catch (error) {
        console.error("Erreur chargement fiches :", error);
        liste.innerHTML = '<div class="empty-state revision-empty"><h3>Impossible de charger les fiches</h3><p>Vérifie la configuration Supabase et réessaie.</p></div>';
    }
}


const MODES_REVISION = {
    questions: { label: "Questions / réponses", types: ["question","definition","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple","liste"] },
    flashcards: { label: "Cartes mémoire", types: ["question","definition","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple","liste"] },
    timeline: { label: "Frise chronologique", types: ["date"] },
    oral: { label: "Réponse libre", types: ["question","definition","vocabulaire","personne","lieu","formule","regle","methode","processus","cause","exemple","liste"] }
};

let ficheEtude = null;
let session = null;

function valeurs(q) {
    const d = q.data || {};
    const map = {
        definition:[d.terme,d.definition], question:[d.question,d.reponse],
        date:[d.date,d.evenement], vocabulaire:[d.mot,d.definition],
        personne:[d.personne,d.description], lieu:[d.lieu,d.description],
        formule:[d.formule,d.explication], regle:[d.regle,d.application],
        methode:[d.objectif,d.etapes], processus:[d.processus,d.etapes],
        cause:[d.cause,d.consequence], exemple:[d.notion,d.exemple],
        liste:[d.sujet,d.elements]
    };
    return map[q.type] || ["",""];
}

function modesDisponibles(questions) {
    const types = new Set(questions.map(q => q.type));
    return Object.entries(MODES_REVISION).filter(item => item[1].types.some(t => types.has(t)));
}

function melanger(a) { return [...a].sort(() => Math.random() - 0.5); }

function promptQuestion(q) {
    const v = valeurs(q);
    switch(q.type) {
        case "question": return v[0];
        case "definition": case "vocabulaire": return "Qu'est-ce que " + v[0] + " ?";
        case "date": return "À quelle date ou période correspond cet événement ?";
        case "personne": return "Qui est " + v[0] + " ?";
        case "lieu": return "Que faut-il retenir sur " + v[0] + " ?";
        case "formule": return "Quelle est la formule à retenir ?";
        case "regle": return "Quelle règle faut-il retenir ?";
        case "methode": case "processus": return "Quelles sont les étapes de " + v[0] + " ?";
        case "cause": return "Quelle est la cause et la conséquence ?";
        case "exemple": return "Donne un exemple pour " + v[0] + ".";
        case "liste": return "Quels éléments faut-il retenir pour " + v[0] + " ?";
        default: return "Réponds à la question.";
    }
}

function normaliserTexte(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/['’]/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
}

const MOTS_VIDES = new Set("le la les un une des du de d au aux et ou en dans sur sous pour par avec sans est sont a à que qui quoi quel quelle quels quelles ce cette ces se sa son ses il elle ils elles je tu on nous vous".split(" "));

function motsImportants(t) {
    return normaliserTexte(t).split(" ").filter(m => m.length > 2 && !MOTS_VIDES.has(m));
}

function evaluerReponse(attendue, reponse) {
    const a = normaliserTexte(attendue);
    const r = normaliserTexte(reponse);
    if (!r) return {correct:false, score:0};
    if (a === r || a.includes(r) || r.includes(a)) return {correct:true, score:1};

    const aw = [...new Set(motsImportants(a))];
    const rw = [...new Set(motsImportants(r))];
    if (!aw.length) return {correct:false, score:0};

    const communs = aw.filter(m => rw.some(x => x === m || x.startsWith(m) || m.startsWith(x)));
    const couverture = communs.length / aw.length;
    return {correct: couverture >= (aw.length <= 2 ? 0.5 : 0.6), score: couverture};
}

function afficherConfigurationRevision(fiche) {
    ficheEtude = fiche;
    const config = document.getElementById("revision-config");
    const modes = modesDisponibles(fiche.questions || []);
    const max = fiche.questions.length;
    let modesHtml = "";
    modes.forEach(item => {
        modesHtml += '<label class="revision-mode-option"><input type="checkbox" name="revision-mode" value="' + item[0] + '" checked><span>' + item[1].label + '</span></label>';
    });

    config.innerHTML =
        '<div class="section-heading"><div><span class="section-label">RÉVISER</span><h2>' + escapeHtml(fiche.titre) + '</h2></div><button type="button" class="secondary-button" id="fermer-config">Fermer</button></div>' +
        '<p class="revision-intro">Choisis le nombre de questions et les modes de révision.</p>' +
        '<div class="revision-config-grid"><div class="revision-config-block"><label for="nombre-a-reviser">Nombre de questions</label><input id="nombre-a-reviser" type="number" min="1" max="' + max + '" value="' + Math.min(max,10) + '"><small>Maximum : ' + max + '</small></div>' +
        '<div class="revision-config-block"><span class="revision-config-label">Modes de révision</span><div class="revision-mode-list">' + modesHtml + '</div></div></div>' +
        '<button type="button" class="primary-button" id="lancer-revision">Commencer la révision</button><p id="revision-config-status" class="revision-status"></p>';

    config.hidden = false;
    document.getElementById("revision-accueil").hidden = true;
    document.getElementById("revision-editor").hidden = true;
    config.scrollIntoView({behavior:"smooth",block:"start"});

    document.getElementById("fermer-config").onclick = () => {
        config.hidden = true;
        document.getElementById("revision-accueil").hidden = false;
    };
    document.getElementById("lancer-revision").onclick = lancerRevision;
}

function lancerRevision() {
    const nombre = Number(document.getElementById("nombre-a-reviser").value);
    const modes = [...document.querySelectorAll('input[name="revision-mode"]:checked')].map(x => x.value);
    const status = document.getElementById("revision-config-status");

    if (!nombre || nombre < 1 || nombre > ficheEtude.questions.length) {
        status.textContent = "Choisis un nombre de questions valide.";
        status.className = "revision-status error";
        return;
    }
    if (!modes.length) {
        status.textContent = "Sélectionne au moins un mode de révision.";
        status.className = "revision-status error";
        return;
    }

    session = {questions:melanger(ficheEtude.questions).slice(0,nombre), modes:modes, index:0, score:0};
    afficherQuestionSession();
}

function afficherQuestionSession() {
    const el = document.getElementById("revision-session");
    const q = session.questions[session.index];
    if (!q) return afficherResultatRevision();

    const mode = session.modes[session.index % session.modes.length];
    const v = valeurs(q);
    let html = "";

    if (mode === "flashcards") {
        html = '<div class="revision-flashcard"><span class="small-label">QUESTION ' + (session.index+1) + ' / ' + session.questions.length + '</span><h3>' + escapeHtml(promptQuestion(q)) + '</h3><button type="button" class="primary-button" id="reveler-reponse">Afficher la réponse</button><div id="reponse-cachee" class="revision-hidden-answer" hidden>' + escapeHtml(v[1]).replace(/\n/g,"<br>") + '</div></div>';
    } else {
        const title = mode === "timeline" ? "FRISE CHRONOLOGIQUE" : (mode === "oral" ? "RÉPONSE LIBRE" : "QUESTION / RÉPONSE");
        const prompt = mode === "timeline" ? "Quelle est la date ou période de cet événement ?" : promptQuestion(q);
        html = '<div class="revision-answer-question"><span class="small-label">' + title + ' — ' + (session.index+1) + ' / ' + session.questions.length + '</span><h3>' + escapeHtml(prompt) + '</h3>' + (mode === "timeline" ? '<p>' + escapeHtml(v[1]) + '</p>' : '') + '<textarea id="reponse-revision" rows="5" placeholder="Écris ta réponse..."></textarea><button type="button" class="primary-button" id="valider-reponse">Valider</button></div>';
    }

    el.innerHTML = '<div class="section-heading"><div><span class="section-label">EN COURS</span><h2>' + escapeHtml(ficheEtude.titre) + '</h2></div></div>' + html + '<p id="feedback-revision" class="revision-feedback"></p>';
    document.getElementById("revision-config").hidden = true;
    document.getElementById("revision-accueil").hidden = true;
    el.hidden = false;
    el.scrollIntoView({behavior:"smooth",block:"start"});

    const valider = document.getElementById("valider-reponse");
    if (valider) valider.onclick = validerReponse;
    const champ = document.getElementById("reponse-revision");
    if (champ) champ.focus();

    const reveler = document.getElementById("reveler-reponse");
    if (reveler) reveler.onclick = () => {
        document.getElementById("reponse-cachee").hidden = false;
        reveler.textContent = "Je connaissais la réponse";
        reveler.onclick = () => { session.score++; session.index++; afficherQuestionSession(); };
    };
}

function validerReponse() {
    const q = session.questions[session.index];
    const resultat = evaluerReponse(valeurs(q)[1], document.getElementById("reponse-revision").value);
    const feedback = document.getElementById("feedback-revision");
    feedback.textContent = resultat.correct ? "Bonne réponse. Continue comme ça." : "Réponse attendue : " + valeurs(q)[1];
    feedback.className = "revision-feedback " + (resultat.correct ? "success" : "error");
    if (resultat.correct) session.score++;
    const bouton = document.getElementById("valider-reponse");
    bouton.textContent = "Question suivante";
    bouton.onclick = () => { session.index++; afficherQuestionSession(); };
    document.getElementById("reponse-revision").disabled = true;
}

function afficherResultatRevision() {
    const total = session.questions.length;
    const pct = Math.round(session.score / total * 100);
    let commentaire = "Continue tes révisions : chaque question travaillée te fait progresser.";
    if (pct === 100) commentaire = "Excellent travail : toutes les réponses sont correctes.";
    else if (pct >= 80) commentaire = "Très bon travail : tes connaissances sont bien maîtrisées.";
    else if (pct >= 60) commentaire = "Bon travail : encore quelques révisions et ce sera solide.";
    else if (pct >= 40) commentaire = "Tu as les bases. Reprends les points difficiles et réessaie.";

    const el = document.getElementById("revision-session");
    el.innerHTML = '<div class="revision-result"><span class="section-label">RÉSULTAT</span><h2>' + pct + '%</h2><p class="revision-score">' + session.score + ' / ' + total + '</p><p>' + commentaire + '</p><button type="button" class="primary-button" id="recommencer-revision">Recommencer</button> <button type="button" class="secondary-button" id="retour-fiches">Retour aux fiches</button></div>';
    document.getElementById("recommencer-revision").onclick = () => {
        session = {questions:melanger(ficheEtude.questions).slice(0,total), modes:session.modes, index:0, score:0};
        afficherQuestionSession();
    };
    document.getElementById("retour-fiches").onclick = () => {
        el.hidden = true;
        document.getElementById("revision-accueil").hidden = false;
    };
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
}

function ajouterQuestion() {
    questionsRevision.push({
        id: crypto.randomUUID(),
        type: "",
        data: {},
        editing: true
    });
    afficherQuestions();
}

function afficherQuestions() {
    const container = document.getElementById("questions-container");
    document.getElementById("nombre-questions").textContent =
        `${questionsRevision.length} question${questionsRevision.length > 1 ? "s" : ""}`;

    container.innerHTML = questionsRevision.map((question, index) => {
        const type = question.type ? TYPES_REVISION[question.type] : null;

        if (!question.editing) {
            return `<article class="revision-question-summary" data-question-id="${question.id}">
                <div>
                    <span class="small-label">QUESTION ${index + 1}</span>
                    <strong>${escapeHtml(type?.label || "Type non choisi")}</strong>
                </div>
                <div class="revision-summary-actions">
                    <button type="button" class="secondary-button revision-edit" data-id="${question.id}">Éditer</button>
                    <button type="button" class="danger-button revision-delete" data-id="${question.id}">Supprimer</button>
                </div>
            </article>`;
        }

        return `<article class="revision-question-card" data-question-id="${question.id}">
            <div class="revision-question-top">
                <div><span class="small-label">QUESTION ${index + 1}</span><h3>${escapeHtml(type?.label || "Nouvelle question")}</h3></div>
                <button type="button" class="danger-button revision-delete" data-id="${question.id}">Supprimer</button>
            </div>
            <label for="${question.id}-type">Type de donnée</label>
            <select id="${question.id}-type" class="revision-type-select">
                <option value="">Choisir un type...</option>
                ${Object.entries(TYPES_REVISION).map(([key, item]) =>
                    `<option value="${key}" ${key === question.type ? "selected" : ""}>${item.label}</option>`
                ).join("")}
            </select>
            ${type ? `<div class="revision-fields">
                ${type.fields.map(([name, label, placeholder, inputType]) => `
                    <label for="${question.id}-${name}">${label}</label>
                    ${inputType === "textarea"
                        ? `<textarea id="${question.id}-${name}" data-field="${name}" rows="4" required placeholder="${placeholder}">${escapeHtml(question.data[name] || "")}</textarea>`
                        : `<input id="${question.id}-${name}" data-field="${name}" type="text" required value="${escapeHtml(question.data[name] || "")}" placeholder="${placeholder}">`
                    }
                `).join("")}
                <button type="button" class="secondary-button revision-finish-edit">Terminer</button>
            </div>` : '<p class="revision-type-help">Choisis d’abord un type de donnée.</p>'}
        </article>`;
    }).join("");

    container.querySelectorAll(".revision-type-select").forEach(select => {
        select.addEventListener("change", event => {
            const card = event.target.closest(".revision-question-card");
            const question = questionsRevision.find(item => item.id === card.dataset.questionId);
            question.type = event.target.value;
            question.data = {};
            afficherQuestions();
        });
    });

    container.querySelectorAll("[data-field]").forEach(field => {
        field.addEventListener("input", event => {
            const card = event.target.closest(".revision-question-card");
            const question = questionsRevision.find(item => item.id === card.dataset.questionId);
            question.data[event.target.dataset.field] = event.target.value;
        });
    });

    container.querySelectorAll(".revision-finish-edit").forEach(button => {
        button.addEventListener("click", () => {
            const card = button.closest(".revision-question-card");
            const question = questionsRevision.find(item => item.id === card.dataset.questionId);
            if (!question.type) return;
            question.editing = false;
            afficherQuestions();
        });
    });

    container.querySelectorAll(".revision-edit").forEach(button => {
        button.addEventListener("click", () => {
            const question = questionsRevision.find(item => item.id === button.dataset.id);
            question.editing = true;
            afficherQuestions();
        });
    });

    container.querySelectorAll(".revision-delete").forEach(button => {
        button.addEventListener("click", () => {
            questionsRevision = questionsRevision.filter(item => item.id !== button.dataset.id);
            afficherQuestions();
        });
    });
}

function lireQuestions() {
    document.querySelectorAll(".revision-question-card").forEach(card => {
        const question = questionsRevision.find(item => item.id === card.dataset.questionId);
        if (!question) return;
        card.querySelectorAll("[data-field]").forEach(field => {
            question.data[field.dataset.field] = field.value.trim();
        });
    });
    return questionsRevision;
}

document.addEventListener("DOMContentLoaded", async () => {
    await actualiserFiches();

    const ouvrir = document.getElementById("ouvrir-createur");
    const editor = document.getElementById("revision-editor");
    const accueil = document.getElementById("revision-accueil");
    const annuler = document.getElementById("annuler-fiche");
    const ajouter = document.getElementById("ajouter-question");
    const form = document.getElementById("fiche-form");
    const status = document.getElementById("revision-status");

    ouvrir.addEventListener("click", async () => {
        const user = await utilisateurConnecte();
        if (!user) {
            window.location.href = "connexion.html";
            return;
        }
        questionsRevision = [];
        form.reset();
        afficherQuestions();
        status.textContent = "";
        status.className = "revision-status";
        editor.hidden = false;
        accueil.hidden = true;
        editor.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    annuler.addEventListener("click", () => {
        editor.hidden = true;
        accueil.hidden = false;
    });

    ajouter.addEventListener("click", ajouterQuestion);

    form.addEventListener("submit", async event => {
        event.preventDefault();
        lireQuestions();

        if (!questionsRevision.length) {
            status.textContent = "Ajoute au moins une question à la fiche.";
            status.className = "revision-status error";
            ajouter.focus();
            return;
        }

        if (questionsRevision.some(question => !question.type)) {
            status.textContent = "Choisis un type de donnée pour chaque question.";
            status.className = "revision-status error";
            return;
        }

        const utilisateur = await utilisateurConnecte();
        if (!utilisateur) {
            window.location.href = "connexion.html";
            return;
        }

        const profil = await obtenirProfil();
        const fiche = {
            titre: document.getElementById("fiche-titre").value.trim(),
            matiere: document.getElementById("fiche-matiere").value.trim(),
            questions: questionsRevision.map(question => ({
                type: question.type,
                data: { ...question.data }
            })),
            auteur_id: utilisateur.id,
            auteur_identifiant: profil?.identifiant || "Utilisateur"
        };

        const { error } = await supabaseClient.from("fiches_revision").insert(fiche);
        if (error) {
            console.error("Erreur publication fiche :", error);
            status.textContent = "Impossible de publier la fiche. Vérifie la configuration Supabase.";
            status.className = "revision-status error";
            return;
        }

        status.textContent = "Fiche publiée ! Elle est maintenant visible par tout le monde.";
        status.className = "revision-status success";
        editor.hidden = true;
        accueil.hidden = false;
        questionsRevision = [];
        await actualiserFiches();
        accueil.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
