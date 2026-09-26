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
