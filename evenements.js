document.addEventListener("DOMContentLoaded", async () => {
    const liste = document.getElementById("liste-evenements");
    const formulaire = document.getElementById("form-evenement");
    const messageConnexion = document.getElementById("message-connexion-evenement");

    if (!liste) return;

    function echapperHTML(texte) {
        return String(texte ?? "").replace(/[&<>'"]/g, (caractere) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
        }[caractere]));
    }

    function afficherDate(date) {
        return new Date(date).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short"
        });
    }

    async function chargerEvenements() {
        liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Chargement...</h3></div>';

        const { data, error } = await supabaseClient
            .from("evenements")
            .select("id, titre, description, date_evenement, lieu, created_at, auteur_identifiant")
            .order("date_evenement", { ascending: true });

        if (error) {
            console.error(error);
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Impossible de charger les événements</h3><p>Vérifie que les tables Supabase ont bien été créées.</p></div>';
            return;
        }

        if (!data.length) {
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>Aucun événement pour le moment</h3><p>Le premier événement peut être ajouté par un membre connecté.</p></div>';
            return;
        }

        liste.innerHTML = data.map((evenement) => `
            <article class="info-card evenement-card">
                <div class="info-icon">📅</div>
                <div class="article-top">
                    <span class="article-tag">ÉVÉNEMENT</span>
                    <span class="article-date">${afficherDate(evenement.date_evenement)}</span>
                </div>
                <h3>${echapperHTML(evenement.titre)}</h3>
                <p>${echapperHTML(evenement.description).replace(/\n/g, "<br>")}</p>
                ${evenement.lieu ? `<p><strong>Lieu :</strong> ${echapperHTML(evenement.lieu)}</p>` : ""}
                <div class="post-author">Publié par <strong>${echapperHTML(evenement.auteur_identifiant || "Utilisateur")}</strong> le ${afficherDate(evenement.created_at)}</div>
            </article>
        `).join("");
    }

    try {
        const utilisateur = await utilisateurConnecte();

        if (formulaire && messageConnexion) {
            formulaire.hidden = !utilisateur;
            messageConnexion.hidden = !!utilisateur;
        }

        if (formulaire) {
            formulaire.addEventListener("submit", async (event) => {
                event.preventDefault();

                const utilisateurActuel = await utilisateurConnecte();
                if (!utilisateurActuel) {
                    alert("Tu dois être connecté pour ajouter un événement.");
                    return;
                }

                const titre = formulaire.elements.titre.value.trim();
                const description = formulaire.elements.description.value.trim();
                const dateEvenement = formulaire.elements.date_evenement.value;
                const lieu = formulaire.elements.lieu.value.trim();
                const profil = await obtenirProfil();
                const identifiant = profil?.identifiant || utilisateurActuel.email?.split("@")[0] || "Utilisateur";
                const bouton = formulaire.querySelector("button[type='submit']");

                if (!titre || !description || !dateEvenement) {
                    alert("Remplis le titre, la description et la date.");
                    return;
                }

                bouton.disabled = true;
                bouton.textContent = "Ajout...";

                const { error } = await supabaseClient.from("evenements").insert({
                    titre,
                    description,
                    date_evenement: new Date(dateEvenement).toISOString(),
                    lieu: lieu || null,
                    auteur_id: utilisateurActuel.id,
                    auteur_identifiant: identifiant
                });

                bouton.disabled = false;
                bouton.textContent = "Ajouter l’événement";

                if (error) {
                    console.error(error);
                    alert("Impossible d’ajouter l’événement : " + error.message);
                    return;
                }

                formulaire.reset();
                await chargerEvenements();
            });
        }
    } catch (error) {
        console.error(error);
    }

    await chargerEvenements();
});
