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

const STORAGE_KEY = "blog4d_fiches_revision";
let questionsRevision = [];

function chargerFiches() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
}

function sauvegarderFiches(fiches) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fiches));
}

function afficherFiches() {
    const liste = document.getElementById("liste-fiches");
    const fiches = chargerFiches();

    if (!fiches.length) {
        liste.innerHTML = '<div class="empty-state revision-empty"><h3>Aucune fiche pour le moment</h3><p>Crée ta première fiche de révision avec le bouton ci-dessus.</p></div>';
        return;
    }

    liste.innerHTML = fiches.map(fiche => {
        const date = new Date(fiche.createdAt).toLocaleDateString("fr-FR");
        return `<article class="revision-fiche-card">
            <span class="article-tag">${escapeHtml(fiche.matiere)}</span>
            <h3>${escapeHtml(fiche.titre)}</h3>
            <p>${fiche.questions.length} question${fiche.questions.length > 1 ? "s" : ""}</p>
            <small>Créée le ${date}</small>
        </article>`;
    }).join("");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
}

function ajouterQuestion() {
    questionsRevision.push({
        id: crypto.randomUUID(),
        type: "definition",
        data: {}
    });
    afficherQuestions();
}

function afficherQuestions() {
    const container = document.getElementById("questions-container");
    document.getElementById("nombre-questions").textContent =
        `${questionsRevision.length} question${questionsRevision.length > 1 ? "s" : ""}`;

    container.innerHTML = questionsRevision.map((question, index) => {
        const type = TYPES_REVISION[question.type];
        return `<article class="revision-question-card" data-question-id="${question.id}">
            <div class="revision-question-top">
                <div><span class="small-label">QUESTION ${index + 1}</span><h3>${type.label}</h3></div>
                <button type="button" class="danger-button revision-delete" data-id="${question.id}">Supprimer</button>
            </div>
            <label>Type de donnée</label>
            <select class="revision-type-select">
                ${Object.entries(TYPES_REVISION).map(([key, item]) =>
                    `<option value="${key}" ${key === question.type ? "selected" : ""}>${item.label}</option>`
                ).join("")}
            </select>
            <div class="revision-fields">
                ${type.fields.map(([name, label, placeholder, inputType]) => `
                    <label for="${question.id}-${name}">${label}</label>
                    ${inputType === "textarea"
                        ? `<textarea id="${question.id}-${name}" data-field="${name}" rows="4" required placeholder="${placeholder}">${escapeHtml(question.data[name] || "")}</textarea>`
                        : `<input id="${question.id}-${name}" data-field="${name}" type="text" required value="${escapeHtml(question.data[name] || "")}" placeholder="${placeholder}">`
                    }
                `).join("")}
            </div>
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

document.addEventListener("DOMContentLoaded", () => {
    afficherFiches();

    const ouvrir = document.getElementById("ouvrir-createur");
    const editor = document.getElementById("revision-editor");
    const accueil = document.getElementById("revision-accueil");
    const annuler = document.getElementById("annuler-fiche");
    const ajouter = document.getElementById("ajouter-question");
    const form = document.getElementById("fiche-form");
    const status = document.getElementById("revision-status");

    ouvrir.addEventListener("click", () => {
        questionsRevision = [];
        form.reset();
        afficherQuestions();
        editor.hidden = false;
        accueil.hidden = true;
        editor.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    annuler.addEventListener("click", () => {
        editor.hidden = true;
        accueil.hidden = false;
    });

    ajouter.addEventListener("click", ajouterQuestion);

    form.addEventListener("submit", event => {
        event.preventDefault();
        lireQuestions();

        if (!questionsRevision.length) {
            status.textContent = "Ajoute au moins une question à la fiche.";
            status.className = "revision-status error";
            ajouter.focus();
            return;
        }

        const fiche = {
            id: crypto.randomUUID(),
            titre: document.getElementById("fiche-titre").value.trim(),
            matiere: document.getElementById("fiche-matiere").value.trim(),
            questions: questionsRevision.map(question => ({
                type: question.type,
                data: { ...question.data }
            })),
            createdAt: new Date().toISOString()
        };

        const fiches = chargerFiches();
        fiches.unshift(fiche);
        sauvegarderFiches(fiches);

        status.textContent = "Fiche créée !";
        status.className = "revision-status success";
        editor.hidden = true;
        accueil.hidden = false;
        afficherFiches();
        accueil.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});
